#!/usr/bin/env node

/**
 * Git Auto Hook
 * ファイル変更を検知して自動的にGit操作を実行
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { settingsLoader } = require('../utils');

class GitAutoHook {
  constructor() {
    this.settings = settingsLoader.loadSettings();
    this.gitConfig = this.settings.git || {};
    this.lastCommitTime = Date.now();
    this.pendingChanges = false;
  }

  /**
   * ファイル変更を検知
   * @param {string} event - イベントタイプ
   * @param {string} filename - ファイル名
   */
  async onFileChange(event, filename) {
    // 除外パターンをチェック
    if (this.shouldIgnore(filename)) {
      return;
    }

    console.log(`📝 ファイル変更検知: ${filename}`);
    this.pendingChanges = true;

    // デバウンス処理
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
    }

    const interval = (this.gitConfig.commitInterval || 300) * 1000; // 秒をミリ秒に変換

    this.commitTimer = setTimeout(
      () => {
        this.autoCommitAndPush();
      },
      Math.min(interval, 30000)
    ); // 最大30秒
  }

  /**
   * ファイルを無視すべきかチェック
   * @param {string} filename - ファイル名
   * @returns {boolean}
   */
  shouldIgnore(filename) {
    const ignorePatterns = [
      /node_modules/,
      /\.git/,
      /\.log$/,
      /\.tmp$/,
      /\.cache/,
      /dist\//,
      /build\//,
      /out\//,
    ];

    return ignorePatterns.some((pattern) => pattern.test(filename));
  }

  /**
   * 自動コミット&プッシュ
   */
  async autoCommitAndPush() {
    if (!this.pendingChanges) {
      return;
    }

    try {
      // Git自動化スクリプトを実行
      const scriptPath = path.join(__dirname, '../scripts/git-auto-manager.sh');

      console.log('🔄 自動Git操作を開始...');

      exec(`${scriptPath} auto`, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Git自動化エラー:', error.message);
          return;
        }

        console.log(stdout);
        if (stderr) {
          console.error(stderr);
        }

        this.pendingChanges = false;
        this.lastCommitTime = Date.now();
      });
    } catch (error) {
      console.error('❌ 自動コミットエラー:', error);
    }
  }

  /**
   * コンフリクト検出と自動解決
   */
  async detectAndResolveConflicts() {
    return new Promise((resolve, reject) => {
      exec('git status --porcelain', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        // コンフリクトマーカーをチェック
        const hasConflicts = stdout.includes('UU ') || stdout.includes('AA ');

        if (hasConflicts) {
          console.log('⚠️ コンフリクト検出 - 自動解決を試みます');

          const resolverPath = path.join(__dirname, 'git-conflict-resolver.js');
          const strategy = this.gitConfig.conflictStrategy || 'local';

          exec(`node ${resolverPath} resolve-${strategy}`, (resolveError, resolveStdout) => {
            if (resolveError) {
              reject(resolveError);
            } else {
              console.log(resolveStdout);
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * プルリクエストの自動作成
   */
  async createAutoPullRequest(branchName) {
    const title = `Auto PR: ${branchName}`;
    const body = `This pull request was automatically created by Git Auto Hook.

## Changes
- Auto-committed changes from ${branchName}
- Timestamp: ${new Date().toISOString()}

## Automated by
🤖 Git Auto Hook`;

    exec(`gh pr create --title "${title}" --body "${body}" --assignee @me`, (error, stdout) => {
      if (error) {
        console.error('❌ PR作成エラー:', error.message);
      } else {
        console.log('✅ プルリクエスト作成完了');
        console.log(stdout);
      }
    });
  }
}

// CLIから実行された場合
if (require.main === module) {
  const hook = new GitAutoHook();
  const command = process.argv[2];

  switch (command) {
    case 'watch':
      // ファイル監視モード
      console.log('👁️ Git自動化監視モードを開始...');
      const chokidar = require('chokidar');
      const watcher = chokidar.watch('.', {
        ignored: /(^|[\/\\])\../,
        persistent: true,
      });

      watcher.on('change', (path) => hook.onFileChange('change', path));
      watcher.on('add', (path) => hook.onFileChange('add', path));
      break;

    case 'commit':
      hook.autoCommitAndPush();
      break;

    case 'resolve':
      hook.detectAndResolveConflicts();
      break;

    default:
      console.log('Usage: git-auto-hook.js [watch|commit|resolve]');
  }
}

module.exports = { GitAutoHook };
