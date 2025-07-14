#!/usr/bin/env node

/**
 * Git Conflict Resolver Hook
 * コンフリクト解決の対話型プロンプトを検出して自動化
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

class GitConflictResolver {
  constructor() {
    this.settings = this.loadSettings();
    this.conflictStrategy = this.settings.git?.conflictStrategy || 'local';
  }

  loadSettings() {
    try {
      const settingsPath = path.join(__dirname, '../.claude/settings.json');
      const localSettingsPath = path.join(__dirname, '../.claude/settings.local.json');

      let settings = {};
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
      if (fs.existsSync(localSettingsPath)) {
        const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
        settings = { ...settings, ...localSettings };
      }

      return settings;
    } catch (error) {
      console.error('Failed to load settings:', error.message);
      return {};
    }
  }

  /**
   * コンフリクト戦略の質問に自動応答
   * @param {string} question - 質問内容
   * @returns {string|null} 自動応答
   */
  getAutoResponse(question) {
    const lowerQuestion = question.toLowerCase();

    // ローカル vs リモートの選択
    if (lowerQuestion.includes('local') && lowerQuestion.includes('remote')) {
      return this.conflictStrategy === 'local' ? 'local' : 'remote';
    }

    // マージ戦略の選択
    if (lowerQuestion.includes('merge') || lowerQuestion.includes('rebase')) {
      return this.settings.git?.mergeStrategy || 'merge';
    }

    // その他の一般的な確認
    if (lowerQuestion.includes('continue') || lowerQuestion.includes('proceed')) {
      return 'yes';
    }

    return null;
  }

  /**
   * インタラクティブなGitプロセスを実行
   * @param {string} command - Gitコマンド
   * @returns {Promise<void>}
   */
  async runInteractiveGit(command) {
    return new Promise((resolve, reject) => {
      const gitProcess = spawn('git', command.split(' ').slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const rl = readline.createInterface({
        input: gitProcess.stdout,
        output: process.stdout,
      });

      let buffer = '';

      gitProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');

        // 最後の行が不完全な可能性があるので保持
        buffer = lines.pop() || '';

        lines.forEach((line) => {
          console.log(line);

          // 質問パターンを検出
          if (this.isQuestion(line)) {
            const response = this.getAutoResponse(line);
            if (response) {
              console.log(`🤖 自動応答: ${response}`);
              gitProcess.stdin.write(`${response}\n`);
            }
          }
        });
      });

      gitProcess.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      gitProcess.on('close', (code) => {
        rl.close();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * 行が質問かどうかを判定
   * @param {string} line - 出力行
   * @returns {boolean}
   */
  isQuestion(line) {
    const questionPatterns = [
      /\?$/,
      /\[y\/n\]/i,
      /\(y\/n\)/i,
      /choose/i,
      /select/i,
      /which/i,
      /local.*remote/i,
      /remote.*local/i,
    ];

    return questionPatterns.some((pattern) => pattern.test(line));
  }

  /**
   * ローカルを優先してコンフリクトを解決
   */
  async resolveWithLocal() {
    console.log('📌 ローカルの変更を優先してコンフリクトを解決します...');

    try {
      // コンフリクトファイルを取得
      const { stdout } = await this.execPromise('git diff --name-only --diff-filter=U');
      const conflictFiles = stdout.trim().split('\n').filter(Boolean);

      for (const file of conflictFiles) {
        // ローカルバージョンを選択
        await this.execPromise(`git checkout --ours -- "${file}"`);
        await this.execPromise(`git add "${file}"`);
      }

      console.log('✅ コンフリクト解決完了（ローカル優先）');
    } catch (error) {
      console.error('❌ コンフリクト解決失敗:', error.message);
      throw error;
    }
  }

  /**
   * リモートを優先してコンフリクトを解決
   */
  async resolveWithRemote() {
    console.log('📌 リモートの変更を優先してコンフリクトを解決します...');

    try {
      // コンフリクトファイルを取得
      const { stdout } = await this.execPromise('git diff --name-only --diff-filter=U');
      const conflictFiles = stdout.trim().split('\n').filter(Boolean);

      for (const file of conflictFiles) {
        // リモートバージョンを選択
        await this.execPromise(`git checkout --theirs -- "${file}"`);
        await this.execPromise(`git add "${file}"`);
      }

      console.log('✅ コンフリクト解決完了（リモート優先）');
    } catch (error) {
      console.error('❌ コンフリクト解決失敗:', error.message);
      throw error;
    }
  }

  /**
   * execをPromiseでラップ
   * @param {string} command - コマンド
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  execPromise(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}

// メイン処理
async function main() {
  const resolver = new GitConflictResolver();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'resolve-local':
        await resolver.resolveWithLocal();
        break;

      case 'resolve-remote':
        await resolver.resolveWithRemote();
        break;

      case 'interactive':
        const gitCommand = args.slice(1).join(' ');
        await resolver.runInteractiveGit(gitCommand);
        break;

      default:
        console.log(
          'Usage: git-conflict-resolver.js [resolve-local|resolve-remote|interactive <git-command>]'
        );
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { GitConflictResolver };
