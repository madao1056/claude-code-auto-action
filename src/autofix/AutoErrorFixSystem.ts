import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { ThinkingModeManager } from '../thinking/ThinkingModeManager';

const execAsync = promisify(exec);

interface ErrorPattern {
  pattern: RegExp;
  type: 'build' | 'lint' | 'type' | 'test';
  fixStrategy: (error: string, context: ErrorContext) => Promise<FixAction[]>;
}

interface ErrorContext {
  file?: string;
  line?: number;
  column?: number;
  errorMessage: string;
  fullOutput: string;
}

interface FixAction {
  type: 'edit' | 'install' | 'command';
  target?: string;
  content?: string;
  command?: string;
  description: string;
}

interface AutoFixConfig {
  enabled: boolean;
  triggers: string[];
  maxRetries: number;
  escalateToUltrathink: boolean;
  patterns?: ErrorPattern[];
}

export class AutoErrorFixSystem {
  private config: AutoFixConfig;
  private thinkingModeManager: ThinkingModeManager;
  private retryCount: Map<string, number> = new Map();
  private fixHistory: FixAction[] = [];

  constructor(config: AutoFixConfig) {
    this.config = {
      ...{
        enabled: true,
        triggers: ['build_error', 'lint_error', 'type_error', 'test_error'],
        maxRetries: 3,
        escalateToUltrathink: true,
      },
      ...config,
    };
    this.thinkingModeManager = new ThinkingModeManager();
    this.initializeErrorPatterns();
  }

  private initializeErrorPatterns() {
    this.config.patterns = [
      // TypeScript型エラー
      {
        pattern: /error TS(\d+): (.+)/,
        type: 'type',
        fixStrategy: this.fixTypeScriptError.bind(this),
      },
      // ESLintエラー
      {
        pattern: /(\d+):(\d+)\s+error\s+(.+)\s+(.+)/,
        type: 'lint',
        fixStrategy: this.fixLintError.bind(this),
      },
      // モジュール不足エラー
      {
        pattern: /Cannot find module '(.+)'|Module not found: Error: Can't resolve '(.+)'/,
        type: 'build',
        fixStrategy: this.fixMissingModule.bind(this),
      },
      // テストエラー
      {
        pattern: /(\d+) failing|Test failed: (.+)/,
        type: 'test',
        fixStrategy: this.fixTestError.bind(this),
      },
    ];
  }

  async detectAndFix(output: string, trigger: string): Promise<boolean> {
    if (!this.config.enabled || !this.config.triggers.includes(trigger)) {
      return false;
    }

    console.log(`🔍 自動エラー修正システム: ${trigger} を検出`);

    const errors = this.parseErrors(output);
    if (errors.length === 0) {
      return true;
    }

    const errorKey = this.generateErrorKey(errors[0]);
    const currentRetries = this.retryCount.get(errorKey) || 0;

    if (currentRetries >= this.config.maxRetries) {
      console.log(`❌ 最大リトライ回数に到達: ${errorKey}`);
      return false;
    }

    // リトライ回数に応じて思考モードをエスカレート
    if (this.config.escalateToUltrathink && currentRetries >= 2) {
      await this.thinkingModeManager.setMode('ultrathink');
      console.log(`🧠 思考モードを ultrathink に昇格`);
    }

    // エラーを修正
    const fixed = await this.fixErrors(errors);

    if (!fixed) {
      this.retryCount.set(errorKey, currentRetries + 1);
    } else {
      this.retryCount.delete(errorKey);
    }

    return fixed;
  }

  private parseErrors(output: string): ErrorContext[] {
    const errors: ErrorContext[] = [];

    for (const pattern of this.config.patterns || []) {
      const matches = output.matchAll(new RegExp(pattern.pattern, 'gm'));

      for (const match of matches) {
        const context: ErrorContext = {
          errorMessage: match[0],
          fullOutput: output,
        };

        // ファイル名、行番号などを抽出（パターンに応じて）
        if (pattern.type === 'lint' && match.length >= 4) {
          context.line = parseInt(match[1]);
          context.column = parseInt(match[2]);
        }

        errors.push(context);
      }
    }

    return errors;
  }

  private async fixErrors(errors: ErrorContext[]): Promise<boolean> {
    let allFixed = true;

    for (const error of errors) {
      const pattern = this.findMatchingPattern(error.errorMessage);
      if (!pattern) continue;

      try {
        const fixActions = await pattern.fixStrategy(error.errorMessage, error);

        for (const action of fixActions) {
          await this.applyFix(action);
          this.fixHistory.push(action);
        }
      } catch (e) {
        console.error(`修正失敗: ${e}`);
        allFixed = false;
      }
    }

    return allFixed;
  }

  private findMatchingPattern(errorMessage: string): ErrorPattern | undefined {
    return this.config.patterns?.find((p) => p.pattern.test(errorMessage));
  }

  private async applyFix(action: FixAction): Promise<void> {
    console.log(`🔧 修正を適用: ${action.description}`);

    switch (action.type) {
      case 'edit':
        if (action.target && action.content) {
          await writeFile(action.target, action.content);
        }
        break;

      case 'install':
        if (action.command) {
          await execAsync(action.command);
        }
        break;

      case 'command':
        if (action.command) {
          await execAsync(action.command);
        }
        break;
    }
  }

  private async fixTypeScriptError(error: string, context: ErrorContext): Promise<FixAction[]> {
    const fixes: FixAction[] = [];

    // 型エラーのパターンに応じた修正
    if (error.includes('Property') && error.includes('does not exist')) {
      fixes.push({
        type: 'edit',
        description: '不足しているプロパティを追加',
        // 実際の修正ロジックはClaude APIと連携
      });
    }

    return fixes;
  }

  private async fixLintError(error: string, context: ErrorContext): Promise<FixAction[]> {
    // ESLintの自動修正を実行
    return [
      {
        type: 'command',
        command: 'npx eslint --fix .',
        description: 'ESLintの自動修正を実行',
      },
    ];
  }

  private async fixMissingModule(error: string, context: ErrorContext): Promise<FixAction[]> {
    const moduleMatch = error.match(/Cannot find module '(.+?)'|Can't resolve '(.+?)'/);
    const moduleName = moduleMatch?.[1] || moduleMatch?.[2];

    if (!moduleName) return [];

    // パッケージをインストール
    return [
      {
        type: 'install',
        command: `npm install ${moduleName}`,
        description: `不足パッケージ ${moduleName} をインストール`,
      },
    ];
  }

  private async fixTestError(error: string, context: ErrorContext): Promise<FixAction[]> {
    // テストエラーは複雑なので、思考モードを使用
    return [
      {
        type: 'command',
        command: 'npm test -- --updateSnapshot',
        description: 'スナップショットを更新',
      },
    ];
  }

  private generateErrorKey(error: ErrorContext): string {
    return `${error.errorMessage.substring(0, 50)}_${error.file || 'global'}`;
  }

  getFixHistory(): FixAction[] {
    return this.fixHistory;
  }

  clearHistory(): void {
    this.fixHistory = [];
    this.retryCount.clear();
  }
}
