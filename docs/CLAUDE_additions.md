# CLAUDE.md への追加内容

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
