// Claude Code プラグインとして統合するためのモジュール
import { ClaudeCodeAutoSystem } from '../main/ClaudeCodeAutoSystem';
import { CommandType } from '../hierarchy/TopDownCommandSystem';

export class ClaudeCodePlugin {
  private autoSystem: ClaudeCodeAutoSystem | null = null;
  private isEnabled: boolean = false;

  // Claude Code 起動時に自動実行される初期化関数
  async initialize(claudeSettings: any): Promise<void> {
    if (claudeSettings.automation?.auto_architect?.enabled) {
      console.log('🚀 Auto-starting Multi-Agent System...');

      this.autoSystem = await ClaudeCodeAutoSystem.create({
        communication: {
          hub_port: claudeSettings.automation.auto_architect.hub_port || 8765,
          heartbeat_interval: 30000,
          message_timeout: 10000,
        },
        auto_scaling: {
          enabled: true,
          min_agents_per_type: {
            architect: claudeSettings.automation.auto_architect.min_architects || 1,
            manager: claudeSettings.automation.auto_architect.min_managers || 2,
            worker: claudeSettings.automation.auto_architect.min_workers || 3,
          },
          max_agents_per_type: {
            architect: claudeSettings.automation.auto_architect.max_architects || 3,
            manager: claudeSettings.automation.auto_architect.max_managers || 5,
            worker: claudeSettings.automation.auto_architect.max_workers || 10,
          },
        },
      });

      this.isEnabled = true;
      console.log('✅ Multi-Agent System ready!');
    }
  }

  // Claude Code からタスクを受信して処理
  async processTask(task: any, context: any): Promise<any> {
    if (!this.autoSystem || !this.isEnabled) {
      return null; // 通常のClaude Code処理に戻す
    }

    // 複雑なタスクかどうかを判定
    if (this.shouldUseMultiAgent(task, context)) {
      console.log('🎯 Routing to Multi-Agent System...');

      return await this.autoSystem.processProject({
        project_path: context.workingDirectory,
        requirements: task.description,
        command_type: this.mapTaskToCommandType(task) as CommandType,
        priority: task.priority || 'medium',
      });
    }

    return null; // 通常処理
  }

  private shouldUseMultiAgent(task: any, context: any): boolean {
    // 複雑さの判定ロジック
    const complexityIndicators = [
      task.description.length > 200,
      task.description.includes('architecture'),
      task.description.includes('refactor'),
      task.description.includes('multiple'),
      task.estimated_duration > 30, // 30分以上
      context.fileCount > 50,
    ];

    return complexityIndicators.filter(Boolean).length >= 2;
  }

  private mapTaskToCommandType(task: any): string {
    // タスクの内容からコマンドタイプを判定
    const desc = task.description.toLowerCase();

    if (desc.includes('analyze') || desc.includes('review')) {
      return 'ANALYZE_PROJECT';
    }
    if (desc.includes('implement') || desc.includes('add') || desc.includes('create')) {
      return 'IMPLEMENT_FEATURE';
    }
    if (desc.includes('fix') || desc.includes('bug') || desc.includes('error')) {
      return 'FIX_ISSUES';
    }
    if (desc.includes('optimize') || desc.includes('performance')) {
      return 'OPTIMIZE_PERFORMANCE';
    }
    if (desc.includes('refactor') || desc.includes('restructure')) {
      return 'REFACTOR_CODE';
    }

    return 'IMPLEMENT_FEATURE'; // デフォルト
  }

  async shutdown(): Promise<void> {
    if (this.autoSystem) {
      await this.autoSystem.shutdown();
      this.isEnabled = false;
    }
  }
}

// Claude Code のプラグインシステムに登録
export const claudeCodePlugin = new ClaudeCodePlugin();
