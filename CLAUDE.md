# Claude Code Auto Action

## Project Overview

This is an automation system that integrates Claude AI with development workflows to provide intelligent code assistance, automated commits, testing, and continuous integration.

## Architecture

### Core Components

1. **Claude CLI Integration** - Extends the Claude CLI with automation features
2. **VSCode/Cursor Extension** - IDE integration for real-time assistance
3. **Git Hooks** - Automated pre/post commit actions
4. **CI/CD Workflows** - GitHub Actions for automated quality checks

### Directory Structure

```
.claude/                    # Claude configuration and settings
├── settings.json          # Main configuration file
├── permissions.json       # Security and permission rules
└── commands/             # Custom command definitions

cursor-extension/          # VSCode/Cursor extension
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── services/         # Claude API integration
│   └── providers/        # UI providers for tasks/history
└── package.json

scripts/                   # Automation scripts
├── install.sh            # Installation script
└── claude-auto.sh        # Main automation script

hooks/                     # Git hooks
├── pre-commit           # Pre-commit automation
└── post-commit          # Post-commit tasks

.github/workflows/         # GitHub Actions
├── claude-ci.yml        # CI/CD pipeline
└── claude-schedule.yml  # Scheduled tasks
```

## Features

### Automated Operations

- **Auto-commit**: Intelligent commit message generation
- **Auto-format**: Code formatting on save
- **Auto-lint**: Automatic linting and fixes
- **Auto-test**: Run tests before commits
- **Import optimization**: Organize and clean imports

### Thinking Mode System

- **Adaptive Intelligence**: AI思考レベルを自動調整
- **Default Mode**: think_hard (10,000 tokens) - 高品質な思考
- **Auto-escalation**: 2回以上の修正で ultrathink (31,999 tokens) に自動昇格
- **Context-aware**: タスクの種類に応じた思考モード選択
- **Revision Tracking**: 修正回数の自動追跡とエスカレーション

#### 思考モード一覧

- `think`: 4,000 tokens - 基本的な思考
- `think_hard`: 10,000 tokens - より深い思考（デフォルト）
- `think_harder`: 20,000 tokens - さらに深い思考
- `ultrathink`: 31,999 tokens - 最強思考モード

### Safety Features

- File system permission controls
- Command execution restrictions
- Sensitive data protection
- Confirmation for destructive operations
- Automatic backups before major changes

### IDE Integration

- Real-time code suggestions
- Error fixing assistance
- Test generation
- Code explanation
- Performance optimization

## Installation

1. Clone this repository
2. Run the installation script:
   ```bash
   chmod +x scripts/install.sh
   ./scripts/install.sh
   ```
3. Install the VSCode/Cursor extension
4. Configure your Claude API key:
   ```bash
   claude-code config set api_key YOUR_API_KEY
   ```

## Configuration

### Settings (.claude/settings.json)

- `automation.enabled`: Enable/disable all automation
- `automation.auto_commit`: Auto-commit changes
- `automation.test_before_commit`: Run tests before committing
- `performance.parallel_execution`: Enable parallel operations
- `safety.require_approval_for_destructive`: Require confirmation

### Thinking Mode Settings (.claude/settings.local.json)

- `thinkingMode.enabled`: Enable/disable thinking mode system
- `thinkingMode.defaultMode`: Default thinking mode (think_hard)
- `thinkingMode.autoEscalation.enabled`: Enable auto-escalation
- `thinkingMode.autoEscalation.revisionThreshold`: Revision count threshold (2)
- `thinkingMode.autoEscalation.maxMode`: Maximum escalation mode (ultrathink)
- `thinkingMode.triggers.codeRevision.mode`: Mode for code revisions
- `thinkingMode.triggers.complexTask.mode`: Mode for complex tasks
- `thinkingMode.triggers.errorHandling.mode`: Mode for error handling

### Permissions (.claude/permissions.json)

- `file_system.allowed_paths`: Allowed file paths
- `file_system.blocked_paths`: Blocked file paths
- `execution.allowed_commands`: Allowed shell commands
- `execution.blocked_commands`: Blocked shell commands

## Usage

### Command Line

```bash
# Auto-commit with generated message
claude-code commit --auto

# Generate tests for current file
claude-code generate-tests file.js

# Start file watcher
claude-code watch

# Set thinking mode manually
claude-code set-thinking-mode ultrathink

# Get thinking mode status
claude-code thinking-status
```

### VSCode/Cursor

- `Cmd+Shift+A`: Ask Claude a question
- `Cmd+Shift+C`: Auto-commit changes
- Right-click menu: Access Claude features
- Status bar: Show current thinking mode

### Thinking Mode Usage

The system automatically manages thinking modes based on:

- **Default**: All tasks start with `think_hard` mode (10,000 tokens)
- **Auto-escalation**: 2+ revisions trigger `ultrathink` mode (31,999 tokens)
- **Context-aware**: Code revisions automatically use higher thinking modes
- **Manual override**: Set specific modes for complex tasks

## Custom Commands

Create custom commands in `.claude/commands/`:

```json
{
  "name": "my-command",
  "description": "Description of what it does",
  "trigger": {
    "on_save": true,
    "manual": true
  },
  "actions": [
    {
      "type": "claude",
      "prompt": "Your prompt here"
    }
  ]
}
```

## Security

The system includes multiple security layers:

1. Path-based access control
2. Command whitelisting/blacklisting
3. File size limits
4. Sensitive data masking
5. Audit logging

## Development

### Building the Extension

```bash
cd cursor-extension
npm install
npm run compile
```

### Running Tests

```bash
npm test
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **Permission denied**: Check `.claude/permissions.json`
2. **API errors**: Verify your API key is set correctly
3. **Extension not working**: Rebuild and reinstall the extension

### Logs

Check logs in `~/.claude/logs/` for debugging information.

## 高度な思考モード活用法

### 思考モードエイリアス詳細

#### 基本モード (cc-think)

```bash
alias cc-think='claude --thinking-mode think'
```

- トークン数: 4,000
- 用途: 簡単なタスク、コード補完、単純な質問
- 例: `cc-think "この関数の型定義を修正"`

#### 標準モード (cc-hard) - デフォルト

```bash
alias cc-hard='claude --thinking-mode think_hard'
```

- トークン数: 10,000
- 用途: 一般的な開発タスク、バグ修正、リファクタリング
- 例: `cc-hard "認証システムのエラーを修正"`

#### 高度モード (cc-harder)

```bash
alias cc-harder='claude --thinking-mode think_harder'
```

- トークン数: 20,000
- 用途: 複雑なアーキテクチャ設計、パフォーマンス最適化
- 例: `cc-harder "マイクロサービス間の通信を最適化"`

#### 最強モード (cc-ultra)

```bash
alias cc-ultra='claude --thinking-mode ultrathink'
```

- トークン数: 31,999
- 用途: 大規模リファクタリング、セキュリティ監査、システム設計
- 例: `cc-ultra "プロジェクト全体のセキュリティ脆弱性を分析"`

### 自動エスカレーション機能

システムは修正回数に基づいて自動的に思考モードをエスカレートします：

```json
{
  "thinkingMode": {
    "autoEscalation": {
      "enabled": true,
      "revisionThreshold": 2,
      "escalationPath": {
        "1": "think_hard",
        "2": "think_harder",
        "3+": "ultrathink"
      }
    }
  }
}
```

## ウェブ制作ディレクター向け専用コマンド

### cc-web: ウェブ制作タスク自動化

```bash
cc-web "新規プロジェクトの環境構築"
cc-web "クライアントサイトの表示速度を改善"
cc-web "レスポンシブデザインのテスト自動化"
```

### cc-report: レポート生成

```bash
cc-report "月次パフォーマンスレポート生成"
cc-report "SEO改善提案書の作成"
cc-report "競合分析レポートを生成"
```

### cc-monitor: 監視・チェック

```bash
cc-monitor "全クライアントサイトの死活監視"
cc-monitor "SSL証明書の有効期限チェック"
cc-monitor "Core Web Vitalsの測定"
```

## プロジェクト別カスタマイズ

### .claude/settings.local.json の活用

各プロジェクトで以下のような設定が可能：

```json
{
  "projectType": "web-production",
  "client": "クライアント名",
  "automation": {
    "dailyChecks": {
      "enabled": true,
      "tasks": ["uptime-monitoring", "performance-check", "security-scan"]
    },
    "reporting": {
      "frequency": "weekly",
      "recipients": ["client@example.com"],
      "format": "pdf"
    }
  },
  "customCommands": {
    "deploy": "npm run build && rsync -avz dist/ server:/var/www/",
    "backup": "mysqldump -u user -p database > backup_$(date +%Y%m%d).sql"
  }
}
```

## ベストプラクティス

### 1. タスクに応じた思考モード選択

- 単純な修正: `cc` or `cc-think`
- 機能追加: `cc-hard` (デフォルト)
- アーキテクチャ変更: `cc-harder`
- 大規模リファクタリング: `cc-ultra`

### 2. プロジェクト初期化時の推奨設定

```bash
# プロジェクトディレクトリで実行
cc-setup --type web-production --client "クライアント名"
cc "このプロジェクト用の.claude/settings.local.jsonを作成"
cc "Git hooksを設定して自動フォーマットとテストを有効化"
```

### 3. 効率的なワークフロー

```bash
# 朝の定期チェック
cc-monitor && cc-report "昨日のパフォーマンスサマリー"

# 開発作業
cc-watch  # ファイル監視モード開始
cc "新機能の実装"  # 自動的にテスト生成

# コミット時
cc-commit  # 自動的にメッセージ生成、フォーマット、テスト実行
```

## 高度な自動化シナリオ

### 1. バッチ処理

```bash
# 複数サイトの一括更新
cc "clients.csvからサイトリストを読み込んで全サイトのjQueryを最新版に更新"
```

### 2. スケジュール実行

```bash
# crontabに追加
0 9 * * * /path/to/claude-auto.sh daily-report
0 0 * * 0 /path/to/claude-auto.sh weekly-backup
```

### 3. CI/CD統合

```yaml
# .github/workflows/claude-check.yml
- name: Claude Code Review
  run: |
    claude --thinking-mode think_hard "PRの変更をレビューして改善提案"
```

## License

MIT License - see LICENSE file for details
