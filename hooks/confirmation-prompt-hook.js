#!/usr/bin/env node

/**
 * Confirmation Prompt Hook
 * 確認プロンプトが表示される前に通知音を鳴らすフック
 */

const { loadSettings } = require('../utils/settingsLoader');
const { notifyConfirmationPrompt } = require('../utils/notification');

class ConfirmationPromptHook {
  constructor() {
    this.notificationScript = path.join(__dirname, '../scripts/notify-completion.sh');
    this.settings = this.loadSettings();
  }

  /**
   * Load hook settings
   * @returns {Object} Settings object
   */
  loadSettings() {
    return loadSettings();
  }

  /**
   * Play notification sound for confirmation prompts
   * @returns {Promise<void>}
   */
  async playPromptSound() {
    await notifyConfirmationPrompt(this.settings);
  }

  /**
   * Handle events from Claude Code
   * @param {Object} event - Event object
   * @returns {Promise<void>}
   */
  async handleEvent(event) {
    switch (event.type) {
      case 'pre_confirmation':
      case 'confirmation_prompt':
      case 'user_approval_required':
        await this.playPromptSound();
        break;
    }
  }
}

// CLIから直接呼び出される場合
if (require.main === module) {
  const hook = new ConfirmationPromptHook();
  
  // コマンドライン引数から判断
  const args = process.argv.slice(2);
  
  if (args.includes('--prompt') || args.includes('confirmation')) {
    hook.playPromptSound();
  } else {
    // 標準入力からイベントを受け取る
    let inputData = '';
    
    process.stdin.on('data', (chunk) => {
      inputData += chunk;
    });
    
    process.stdin.on('end', async () => {
      try {
        const event = JSON.parse(inputData);
        await hook.handleEvent(event);
      } catch (error) {
        // JSONでない場合は単純に音を鳴らす
        hook.playPromptSound();
      }
    });
    
    // タイムアウト設定（1秒）
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

module.exports = { ConfirmationPromptHook };