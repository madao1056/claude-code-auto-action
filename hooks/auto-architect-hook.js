#!/usr/bin/env node

/**
 * Claude Code Auto-Architect Hook
 * 
 * このフックはClaude Code起動時に自動実行され、
 * 複雑なタスクを検出してマルチエージェントシステムに転送します。
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoArchitectHook {
  constructor() {
    this.multiAgentSystem = null;
    this.isEnabled = false;
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      const claudeSettingsPath = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'settings.json');
      if (fs.existsSync(claudeSettingsPath)) {
        const settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
        return settings.automation?.auto_architect || {};
      }
    } catch (error) {
      console.warn('Could not load Claude settings:', error.message);
    }
    return {};
  }

  async initialize() {
    if (!this.settings.enabled) {
      console.log('📋 Auto-Architect disabled in settings');
      return;
    }

    console.log('🚀 Initializing Auto-Architect Hook...');

    try {
      // マルチエージェントシステムを別プロセスで起動
      this.multiAgentSystem = spawn('node', [
        path.join(__dirname, '../dist/main/ClaudeCodeAutoSystem.js'),
        '--mode', 'service',
        '--config', JSON.stringify(this.settings)
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_AUTO_ARCHITECT: 'true'
        }
      });

      this.multiAgentSystem.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('ready')) {
          this.isEnabled = true;
          console.log('✅ Auto-Architect System ready');
        }
        console.log(`[Auto-Architect] ${message}`);
      });

      this.multiAgentSystem.stderr.on('data', (data) => {
        console.error(`[Auto-Architect Error] ${data}`);
      });

      this.multiAgentSystem.on('exit', (code) => {
        console.log(`Auto-Architect System exited with code ${code}`);
        this.isEnabled = false;
      });

      // 起動完了を待つ
      await this.waitForStartup();

    } catch (error) {
      console.error('Failed to initialize Auto-Architect:', error);
    }
  }

  async waitForStartup(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (this.isEnabled) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Auto-Architect startup timeout'));
        } else {
          setTimeout(checkReady, 500);
        }
      };
      
      checkReady();
    });
  }

  // Claude Code からのタスクをインターセプト
  async interceptTask(taskData) {
    if (!this.isEnabled || !this.shouldUseAutoArchitect(taskData)) {
      return null; // 通常のClaude Code処理に任せる
    }

    console.log('🎯 Routing complex task to Auto-Architect System...');

    try {
      // マルチエージェントシステムに送信
      const request = {
        type: 'project_request',
        data: {
          project_path: taskData.workingDirectory || process.cwd(),
          requirements: taskData.prompt || taskData.description,
          command_type: this.determineCommandType(taskData),
          priority: taskData.priority || 'medium',
          constraints: taskData.constraints || {},
          quality_requirements: taskData.qualityRequirements || {}
        }
      };

      this.multiAgentSystem.stdin.write(JSON.stringify(request) + '\n');

      // 結果を待機
      return await this.waitForResult(request.data);

    } catch (error) {
      console.error('Auto-Architect processing failed:', error);
      return null; // フォールバック
    }
  }

  shouldUseAutoArchitect(taskData) {
    const prompt = taskData.prompt || taskData.description || '';
    const fileCount = taskData.fileCount || 0;
    
    // 複雑さの判定
    const complexityFactors = [
      prompt.length > 300,                          // 長い説明
      /\b(architecture|refactor|redesign)\b/i.test(prompt), // アーキテクチャ関連
      /\b(multiple|several|many)\b/i.test(prompt),  // 複数要素
      /\b(system|framework|platform)\b/i.test(prompt), // システム全体
      fileCount > 20,                               // 大きなプロジェクト
      taskData.estimatedDuration > 1800,           // 30分以上の予想時間
      /\b(analyze|review|audit)\b/i.test(prompt),   // 分析タスク
      prompt.split(/[.!?]/).length > 5              // 複数の文
    ];

    const complexityScore = complexityFactors.filter(Boolean).length;
    const threshold = this.settings.complexity_threshold || 3;

    console.log(`Task complexity score: ${complexityScore}/${complexityFactors.length} (threshold: ${threshold})`);
    
    return complexityScore >= threshold;
  }

  determineCommandType(taskData) {
    const prompt = (taskData.prompt || taskData.description || '').toLowerCase();
    
    if (/\b(analyze|review|audit|assess)\b/.test(prompt)) {
      return 'ANALYZE_PROJECT';
    }
    if (/\b(implement|add|create|build)\b/.test(prompt)) {
      return 'IMPLEMENT_FEATURE';
    }
    if (/\b(fix|bug|error|issue|problem)\b/.test(prompt)) {
      return 'FIX_ISSUES';
    }
    if (/\b(optimize|performance|speed|memory)\b/.test(prompt)) {
      return 'OPTIMIZE_PERFORMANCE';
    }
    if (/\b(refactor|restructure|reorganize)\b/.test(prompt)) {
      return 'REFACTOR_CODE';
    }
    if (/\b(test|testing|coverage)\b/.test(prompt)) {
      return 'ADD_TESTING';
    }
    if (/\b(security|secure|vulnerability)\b/.test(prompt)) {
      return 'IMPROVE_SECURITY';
    }
    if (/\b(document|documentation|readme)\b/.test(prompt)) {
      return 'CREATE_DOCUMENTATION';
    }
    
    return 'IMPLEMENT_FEATURE'; // デフォルト
  }

  async waitForResult(requestData, timeout = 300000) { // 5分タイムアウト
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Auto-Architect processing timeout'));
      }, timeout);

      const resultHandler = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.type === 'project_completed' || response.type === 'project_failed') {
            clearTimeout(timeoutId);
            this.multiAgentSystem.stdout.off('data', resultHandler);
            
            if (response.type === 'project_completed') {
              resolve(response.result);
            } else {
              reject(new Error(response.error));
            }
          }
        } catch (error) {
          // JSONパース失敗は無視（他のメッセージかもしれない）
        }
      };

      this.multiAgentSystem.stdout.on('data', resultHandler);
    });
  }

  async shutdown() {
    console.log('🛑 Shutting down Auto-Architect Hook...');
    
    if (this.multiAgentSystem) {
      // グレースフルシャットダウンを試行
      this.multiAgentSystem.stdin.write(JSON.stringify({ type: 'shutdown' }) + '\n');
      
      // 5秒後に強制終了
      setTimeout(() => {
        if (this.multiAgentSystem) {
          this.multiAgentSystem.kill('SIGTERM');
        }
      }, 5000);
    }
  }
}

// Claude Code のフックシステムから呼び出される関数
const autoArchitect = new AutoArchitectHook();

// 起動時の初期化
process.on('SIGINT', () => autoArchitect.shutdown());
process.on('SIGTERM', () => autoArchitect.shutdown());

// Claude Code から呼び出されるメイン関数
async function main(args) {
  const command = args[0];
  
  switch (command) {
    case 'init':
      await autoArchitect.initialize();
      break;
      
    case 'intercept':
      const taskData = JSON.parse(args[1] || '{}');
      const result = await autoArchitect.interceptTask(taskData);
      if (result) {
        console.log(JSON.stringify({ type: 'auto_architect_result', result }));
      }
      break;
      
    case 'shutdown':
      await autoArchitect.shutdown();
      break;
      
    default:
      console.log('Auto-Architect Hook - Usage: init|intercept|shutdown');
  }
}

// 直接実行された場合
if (require.main === module) {
  main(process.argv.slice(2)).catch(console.error);
}

module.exports = { AutoArchitectHook, main };