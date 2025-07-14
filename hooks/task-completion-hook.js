#!/usr/bin/env node

/**
 * Task Completion Hook
 * Claude Codeのタスク完了時に通知を行うフック
 */

const { loadSettings } = require('../utils/settingsLoader');
const { notifyTaskCompletion } = require('../utils/notification');

class TaskCompletionHook {
  constructor() {
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
   * Send notification for task completion
   * @param {Object} taskInfo - Task information
   * @returns {Promise<void>}
   */
  async notify(taskInfo) {
    await notifyTaskCompletion(taskInfo, this.settings);
  }

  /**
   * Handle events from Claude Code
   * @param {Object} event - Event object
   * @returns {Promise<void>}
   */
  async handleEvent(event) {
    switch (event.type) {
      case 'task_completed':
        await this.notify({
          status: 'completed',
          name: event.taskName || 'タスク',
          count: event.taskCount || 1,
          type: event.taskType || 'general',
        });
        break;

      case 'task_failed':
        await this.notify({
          status: 'failed',
          name: event.taskName || 'タスク',
          type: event.taskType || 'general',
        });
        break;

      case 'task_warning':
        await this.notify({
          status: 'warning',
          name: event.message || '警告',
          type: event.taskType || 'general',
        });
        break;

      case 'batch_completed':
        // 複数タスクの完了
        await this.notify({
          status: 'completed',
          name: 'バッチ処理',
          count: event.completedCount || event.tasks?.length || 1,
          type: 'batch',
        });
        break;
    }
  }
}

// メイン処理
async function main() {
  const hook = new TaskCompletionHook();

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
      console.error('Failed to process event:', error.message);
      process.exit(1);
    }
  });

  // タイムアウト設定（5秒）
  setTimeout(() => {
    console.error('Timeout waiting for input');
    process.exit(1);
  }, 5000);
}

// 直接実行された場合
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TaskCompletionHook };
