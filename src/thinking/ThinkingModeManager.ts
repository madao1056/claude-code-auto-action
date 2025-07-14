import { readFileSync } from 'fs';
import { join } from 'path';

interface ThinkingMode {
  maxTokens: number;
  description: string;
}

interface ThinkingModeSettings {
  enabled: boolean;
  defaultMode: string;
  autoEscalation: {
    enabled: boolean;
    revisionThreshold: number;
    maxMode: string;
  };
  modes: Record<string, ThinkingMode>;
  triggers: {
    codeRevision: {
      enabled: boolean;
      mode: string;
    };
    complexTask: {
      enabled: boolean;
      mode: string;
    };
    errorHandling: {
      enabled: boolean;
      mode: string;
    };
  };
}

export class ThinkingModeManager {
  private settings: ThinkingModeSettings;
  private revisionCount: Map<string, number> = new Map();
  private currentMode: string;

  constructor() {
    this.settings = this.loadSettings();
    this.currentMode = this.settings.defaultMode;
  }

  private loadSettings(): ThinkingModeSettings {
    try {
      const settingsPath = join(process.cwd(), '.claude', 'settings.local.json');
      const settingsContent = readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(settingsContent);
      return (
        settings.thinkingMode || {
          enabled: true,
          defaultMode: 'think_hard',
          autoEscalation: {
            enabled: true,
            revisionThreshold: 2,
            maxMode: 'ultrathink',
          },
          modes: {
            think: { maxTokens: 4000, description: '基本的な思考モード' },
            think_hard: { maxTokens: 10000, description: 'より深い思考モード（デフォルト）' },
            think_harder: { maxTokens: 20000, description: 'さらに深い思考モード' },
            ultrathink: {
              maxTokens: 31999,
              description: '最強思考モード（自動エスカレーション時）',
            },
          },
          triggers: {
            codeRevision: { enabled: true, mode: 'ultrathink' },
            complexTask: { enabled: true, mode: 'think_harder' },
            errorHandling: { enabled: true, mode: 'think_hard' },
          },
        }
      );
    } catch (error) {
      console.warn('Failed to load thinking mode settings, using defaults:', error);
      return {
        enabled: true,
        defaultMode: 'think_hard',
        autoEscalation: {
          enabled: true,
          revisionThreshold: 2,
          maxMode: 'ultrathink',
        },
        modes: {
          think: { maxTokens: 4000, description: '基本的な思考モード' },
          think_hard: { maxTokens: 10000, description: 'より深い思考モード（デフォルト）' },
          think_harder: { maxTokens: 20000, description: 'さらに深い思考モード' },
          ultrathink: { maxTokens: 31999, description: '最強思考モード（自動エスカレーション時）' },
        },
        triggers: {
          codeRevision: { enabled: true, mode: 'ultrathink' },
          complexTask: { enabled: true, mode: 'think_harder' },
          errorHandling: { enabled: true, mode: 'think_hard' },
        },
      };
    }
  }

  public getThinkingMode(
    taskId: string,
    context: 'codeRevision' | 'complexTask' | 'errorHandling' | 'default' = 'default'
  ): {
    mode: string;
    maxTokens: number;
    description: string;
  } {
    if (!this.settings.enabled) {
      return {
        mode: 'think',
        maxTokens: 4000,
        description: '基本的な思考モード',
      };
    }

    let selectedMode = this.settings.defaultMode;

    // トリガーに基づいてモードを選択
    if (context !== 'default' && this.settings.triggers[context]?.enabled) {
      selectedMode = this.settings.triggers[context].mode;
    }

    // 自動エスカレーション
    if (this.settings.autoEscalation.enabled) {
      const revisions = this.revisionCount.get(taskId) || 0;
      if (revisions >= this.settings.autoEscalation.revisionThreshold) {
        selectedMode = this.settings.autoEscalation.maxMode;
        console.log(
          `🧠 思考モード自動エスカレーション: ${revisions}回の修正により${selectedMode}に変更`
        );
      }
    }

    const modeConfig = this.settings.modes[selectedMode];
    if (!modeConfig) {
      console.warn(`Unknown thinking mode: ${selectedMode}, falling back to default`);
      selectedMode = this.settings.defaultMode;
    }

    const finalConfig = this.settings.modes[selectedMode];
    this.currentMode = selectedMode;

    return {
      mode: selectedMode,
      maxTokens: finalConfig.maxTokens,
      description: finalConfig.description,
    };
  }

  public trackRevision(taskId: string): void {
    const current = this.revisionCount.get(taskId) || 0;
    this.revisionCount.set(taskId, current + 1);

    console.log(`📊 修正回数追跡: ${taskId} - ${current + 1}回目`);

    if (current + 1 >= this.settings.autoEscalation.revisionThreshold) {
      console.log(
        `⚡ 自動エスカレーション条件達成: ${this.settings.autoEscalation.maxMode}モードに変更`
      );
    }
  }

  public resetRevisionCount(taskId: string): void {
    this.revisionCount.delete(taskId);
    console.log(`🔄 修正回数リセット: ${taskId}`);
  }

  public getCurrentMode(): string {
    return this.currentMode;
  }

  public getAllModes(): Record<string, ThinkingMode> {
    return this.settings.modes;
  }

  public getRevisionCount(taskId: string): number {
    return this.revisionCount.get(taskId) || 0;
  }

  public isEnabled(): boolean {
    return this.settings.enabled;
  }

  public setMode(mode: string): void {
    if (this.settings.modes[mode]) {
      this.currentMode = mode;
      console.log(`🎯 思考モード手動設定: ${mode}`);
    } else {
      console.warn(`Unknown thinking mode: ${mode}`);
    }
  }

  public getThinkingModeStatus(): {
    currentMode: string;
    maxTokens: number;
    description: string;
    revisionCounts: Record<string, number>;
    autoEscalationEnabled: boolean;
  } {
    const config = this.settings.modes[this.currentMode];

    return {
      currentMode: this.currentMode,
      maxTokens: config.maxTokens,
      description: config.description,
      revisionCounts: Object.fromEntries(this.revisionCount),
      autoEscalationEnabled: this.settings.autoEscalation.enabled,
    };
  }
}

export const thinkingModeManager = new ThinkingModeManager();
