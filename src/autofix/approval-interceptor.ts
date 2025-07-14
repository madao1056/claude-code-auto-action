#!/usr/bin/env node

import { getApprovalLearningSystem } from './approval-learning';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';

interface ApprovalRequest {
  type: 'command' | 'file' | 'operation';
  operation?: string;
  command?: string;
  filePath?: string;
  description?: string;
  isDangerous?: boolean;
}

class ApprovalInterceptor {
  private learningSystem: any;
  private projectRoot: string;
  private rl: readline.Interface;

  constructor() {
    this.projectRoot = this.findProjectRoot();
    this.learningSystem = getApprovalLearningSystem(this.projectRoot);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private findProjectRoot(): string {
    let dir = process.cwd();
    while (dir !== '/') {
      if (fs.existsSync(path.join(dir, '.claude'))) {
        return dir;
      }
      dir = path.dirname(dir);
    }
    return process.cwd();
  }

  async processApproval(request: ApprovalRequest): Promise<boolean> {
    // Check if we should auto-approve
    const shouldAutoApprove = this.learningSystem.shouldAutoApprove(
      request.operation || '',
      request.command,
      request.filePath
    );

    if (shouldAutoApprove) {
      console.log('✅ 自動承認: 学習されたパターンに基づいて承認しました');
      this.recordDecision(request, true, 'auto');
      return true;
    }

    // Check if it's dangerous
    const isDangerous = this.checkIfDangerous(request);
    if (isDangerous) {
      console.log('⚠️  警告: この操作は危険な可能性があります');
    }

    // Ask user for approval
    const approved = await this.askUser(request);
    this.recordDecision(request, approved, approved ? 'approve' : 'deny');

    return approved;
  }

  private checkIfDangerous(request: ApprovalRequest): boolean {
    if (request.isDangerous) return true;

    const dangerousPatterns = [
      /rm\s+-rf/,
      /sudo/,
      /chmod\s+777/,
      /\.env/,
      /password/i,
      /secret/i,
      /credentials/i,
    ];

    const checkString = `${request.operation || ''} ${request.command || ''} ${request.filePath || ''}`;
    return dangerousPatterns.some((pattern) => pattern.test(checkString));
  }

  private async askUser(request: ApprovalRequest): Promise<boolean> {
    const question = this.formatQuestion(request);

    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        const normalized = answer.toLowerCase().trim();
        resolve(normalized === 'y' || normalized === 'yes');
      });
    });
  }

  private formatQuestion(request: ApprovalRequest): string {
    let question = '\n';

    if (request.description) {
      question += `📝 ${request.description}\n`;
    }

    if (request.command) {
      question += `💻 コマンド: ${request.command}\n`;
    } else if (request.filePath) {
      question += `📄 ファイル: ${request.filePath}\n`;
    } else if (request.operation) {
      question += `⚙️  操作: ${request.operation}\n`;
    }

    question += '\nこの操作を実行しますか? (y/n): ';
    return question;
  }

  private recordDecision(
    request: ApprovalRequest,
    approved: boolean,
    decision: 'approve' | 'deny' | 'auto'
  ): void {
    this.learningSystem.recordApproval({
      operation: request.operation || request.type,
      command: request.command,
      filePath: request.filePath,
      approved,
      context: {
        fileType: request.filePath ? path.extname(request.filePath) : undefined,
        projectPath: this.projectRoot,
        isDangerous: this.checkIfDangerous(request),
        userDecision: decision === 'auto' ? 'approve' : decision,
      },
    });
  }

  async checkForLearningUpdates(): Promise<void> {
    const updated = await this.learningSystem.checkForUpdates();
    if (updated) {
      console.log('✅ 学習システムが更新されました');

      const stats = this.learningSystem.getStatistics();
      console.log(`📊 統計情報:`);
      console.log(`  - 自動承認パターン: ${stats.autoApprovePatterns}個`);
      console.log(`  - 24時間以内の承認: ${stats.recentApprovals}件`);
      console.log(`  - 総記録数: ${stats.totalRecords}件`);
    }
  }

  cleanup(): void {
    this.rl.close();
  }
}

// CLI usage
if (require.main === module) {
  const interceptor = new ApprovalInterceptor();

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args[0] === '--check-updates') {
    interceptor
      .checkForLearningUpdates()
      .then(() => interceptor.cleanup())
      .catch(console.error);
  } else if (args[0] === '--stats') {
    const learningSystem = getApprovalLearningSystem(process.cwd());
    const stats = learningSystem.getStatistics();
    console.log('📊 承認学習システム統計:');
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  } else if (args[0] === '--export') {
    const learningSystem = getApprovalLearningSystem(process.cwd());
    const data = learningSystem.exportLearningData();
    const exportPath = path.join(process.cwd(), 'approval-learning-export.json');
    fs.writeFileSync(exportPath, data);
    console.log(`✅ 学習データを ${exportPath} にエクスポートしました`);
    process.exit(0);
  } else {
    // Process approval request from environment or stdin
    const request: ApprovalRequest = {
      type: (process.env.APPROVAL_TYPE as any) || 'operation',
      operation: process.env.APPROVAL_OPERATION,
      command: process.env.APPROVAL_COMMAND,
      filePath: process.env.APPROVAL_FILE,
      description: process.env.APPROVAL_DESCRIPTION,
    };

    interceptor
      .processApproval(request)
      .then((approved) => {
        process.exit(approved ? 0 : 1);
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      })
      .finally(() => interceptor.cleanup());
  }
}

export { ApprovalInterceptor, ApprovalRequest };
