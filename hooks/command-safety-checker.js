#!/usr/bin/env node

/**
 * Command Safety Checker
 * コマンドの安全性をチェックし、危険なコマンドや料金発生コマンドを検出
 */

const fs = require('fs');
const path = require('path');

class CommandSafetyChecker {
  constructor() {
    this.dangerousCommands = this.loadDangerousCommands();
  }

  /**
   * 危険なコマンドリストを読み込む
   * @returns {Object} 危険なコマンドの設定
   */
  loadDangerousCommands() {
    try {
      const configPath = path.join(__dirname, '../.claude/dangerous-commands.json');
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load dangerous commands config:', error);
      return { categories: {}, whitelist: { patterns: [] } };
    }
  }

  /**
   * コマンドが安全かチェック
   * @param {string} command - チェックするコマンド
   * @returns {Object} チェック結果
   */
  checkCommand(command) {
    const result = {
      safe: true,
      category: null,
      reason: null,
      requiresConfirmation: false,
      severity: 'low',
    };

    // まずホワイトリストをチェック
    if (this.isWhitelisted(command)) {
      return result;
    }

    // 各カテゴリーをチェック
    for (const [category, config] of Object.entries(this.dangerousCommands.categories)) {
      for (const pattern of config.patterns) {
        if (this.matchesPattern(command, pattern)) {
          result.safe = false;
          result.category = category;
          result.reason = config.description;
          result.requiresConfirmation = true;
          result.severity = this.getSeverity(category);

          // 料金発生の可能性があるか
          if (
            ['billing_services', 'subscription_upgrades', 'api_calls_with_cost'].includes(category)
          ) {
            result.mayIncurCost = true;
            result.costWarning = '⚠️ このコマンドは料金が発生する可能性があります';
          }

          return result;
        }
      }
    }

    return result;
  }

  /**
   * コマンドがホワイトリストに含まれるかチェック
   * @param {string} command - チェックするコマンド
   * @returns {boolean}
   */
  isWhitelisted(command) {
    const whitelist = this.dangerousCommands.whitelist?.patterns || [];
    return whitelist.some((pattern) => this.matchesPattern(command, pattern));
  }

  /**
   * パターンマッチング
   * @param {string} command - コマンド
   * @param {string} pattern - パターン
   * @returns {boolean}
   */
  matchesPattern(command, pattern) {
    // 正規表現として処理
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      return regex.test(command);
    } catch {
      // 正規表現でない場合は単純な文字列マッチ
      return command.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  /**
   * カテゴリーに基づいて重要度を決定
   * @param {string} category - カテゴリー
   * @returns {string} 重要度
   */
  getSeverity(category) {
    const severityMap = {
      deletion: 'critical',
      system_modification: 'critical',
      database_deletion: 'critical',
      cloud_deletion: 'high',
      package_removal: 'medium',
      billing_services: 'high',
      subscription_upgrades: 'medium',
      api_calls_with_cost: 'medium',
    };

    return severityMap[category] || 'medium';
  }

  /**
   * コマンドの詳細な分析
   * @param {string} command - コマンド
   * @returns {Object} 詳細な分析結果
   */
  analyzeCommand(command) {
    const basicCheck = this.checkCommand(command);

    // 追加の分析
    const analysis = {
      ...basicCheck,
      suggestions: [],
      alternatives: [],
    };

    if (!basicCheck.safe) {
      // カテゴリーに基づいて提案を追加
      switch (basicCheck.category) {
        case 'deletion':
          analysis.suggestions.push('削除前にバックアップを作成することを推奨します');
          analysis.suggestions.push('--dry-run オプションで実行内容を確認してください');
          break;

        case 'billing_services':
          analysis.suggestions.push('料金プランを確認してください');
          analysis.suggestions.push('無料枠や試用版を利用できないか検討してください');
          break;

        case 'cloud_deletion':
          analysis.suggestions.push('リソースが本当に不要か確認してください');
          analysis.suggestions.push('スナップショットやバックアップを作成してください');
          break;

        case 'system_modification':
          analysis.suggestions.push('変更前の設定をバックアップしてください');
          analysis.suggestions.push('変更の影響を十分に理解してください');
          break;
      }
    }

    return analysis;
  }

  /**
   * バッチコマンドのチェック
   * @param {string[]} commands - コマンドの配列
   * @returns {Object} バッチチェック結果
   */
  checkBatch(commands) {
    const results = commands.map((cmd) => ({
      command: cmd,
      ...this.checkCommand(cmd),
    }));

    const summary = {
      totalCommands: commands.length,
      safeCommands: results.filter((r) => r.safe).length,
      dangerousCommands: results.filter((r) => !r.safe).length,
      requiresConfirmation: results.some((r) => r.requiresConfirmation),
      mayIncurCost: results.some((r) => r.mayIncurCost),
      details: results,
    };

    return summary;
  }
}

// CLIとして実行
if (require.main === module) {
  const checker = new CommandSafetyChecker();
  const command = process.argv.slice(2).join(' ');

  if (!command) {
    console.log('Usage: command-safety-checker.js <command>');
    process.exit(1);
  }

  const result = checker.analyzeCommand(command);

  if (result.safe) {
    console.log('✅ コマンドは安全です');
  } else {
    console.log(`❌ 危険なコマンドを検出: ${result.category}`);
    console.log(`理由: ${result.reason}`);
    console.log(`重要度: ${result.severity}`);

    if (result.mayIncurCost) {
      console.log(result.costWarning);
    }

    if (result.suggestions.length > 0) {
      console.log('\n提案:');
      result.suggestions.forEach((s) => console.log(`  - ${s}`));
    }
  }

  process.exit(result.safe ? 0 : 1);
}

module.exports = { CommandSafetyChecker };
