# 移行ガイド - Claude Code Auto Action v1.2.0

## 概要

このガイドでは、既存のClaude Codeプロジェクトをv1.2.0の新機能に移行する方法を説明します。

## 新機能の概要

v1.2.0では以下の10個の高度な自動化機能が追加されました：

1. **自動エラー修正システム** - ビルドエラー、型エラー、リントエラーの自動修正
2. **依存関係の自動管理** - パッケージの自動インストール、脆弱性修正
3. **自動リファクタリング** - コード品質の自動改善
4. **自動ドキュメント生成** - API仕様書、JSDocコメントの自動生成
5. **テストカバレッジ自動改善** - テストケースの自動生成
6. **PR/コードレビュー自動化** - PR作成とレビューの自動化
7. **環境構築の完全自動化** - Dockerfile、CI/CD設定の自動生成
8. **学習型コード補完** - 個人のコーディングパターンを学習
9. **自動バージョン管理** - セマンティックバージョニングの自動化
10. **監視・アラート統合** - パフォーマンス、セキュリティの監視

## 移行手順

### ステップ1: バックアップ

```bash
# プロジェクトのバックアップ
cp -r ~/project/claude-code-auto-action ~/project/claude-code-auto-action.backup

# 設定ファイルのバックアップ
cp .claude/settings.json .claude/settings.json.backup
cp .claude/settings.local.json .claude/settings.local.json.backup
```

### ステップ2: 新しいファイルの追加

```bash
# 必要なディレクトリを作成
mkdir -p .claude/learning/completion
mkdir -p .claude/metrics
mkdir -p .claude/commands

# スクリプトに実行権限を付与
chmod +x scripts/auto-deps.sh
chmod +x scripts/auto-fix-errors.sh
chmod +x scripts/auto-learning-update.sh
```

### ステップ3: 依存関係のインストール

```bash
# package.jsonの依存関係を更新
npm install

# TypeScriptの型定義を確認
npm run typecheck
```

### ステップ4: 設定の更新

#### 基本設定 (.claude/settings.json)

既存の設定に以下を追加：

```json
{
  // 既存の設定...

  "automation": {
    "errorFix": {
      "enabled": true,
      "autoFix": true,
      "maxRetries": 3,
      "escalateToUltrathink": true
    },
    "dependencies": {
      "enabled": true,
      "autoInstall": true,
      "autoClean": true,
      "securityFix": true
    },
    "refactoring": {
      "enabled": true,
      "autoSuggest": true,
      "codeSmells": true,
      "duplicateThreshold": 30
    },
    "documentation": {
      "enabled": true,
      "autoGenerate": true,
      "updateOnChange": true,
      "formats": ["jsdoc", "markdown", "openapi"]
    },
    "testing": {
      "enabled": true,
      "autoGenerateTests": true,
      "coverageThreshold": 80,
      "mockGeneration": true
    },
    "pr": {
      "enabled": true,
      "autoCreatePR": false,
      "autoReview": true,
      "conventionalCommits": true
    },
    "environment": {
      "enabled": true,
      "autoDetect": true,
      "generateDocker": true,
      "generateCI": true
    },
    "monitoring": {
      "enabled": true,
      "performanceRegression": true,
      "bundleSizeAlert": true,
      "securityVulnerability": true,
      "thresholds": {
        "bundleSizeIncrease": "10%",
        "performanceRegression": "20%",
        "cpuUsage": 80,
        "memoryUsage": 512
      }
    }
  },

  "approvalLearning": {
    "enabled": true,
    "autoUpdate": true,
    "updateInterval": 3600,
    "minUsageCountForAutoApproval": 3,
    "dangerousPatterns": ["rm -rf", "sudo", "ssh", "chmod 777"]
  },

  "versioning": {
    "semantic": true,
    "autoTag": true,
    "generateChangelog": true,
    "conventionalCommits": true
  }
}
```

#### ローカル設定 (.claude/settings.local.json)

```json
{
  "learning": {
    "codeCompletion": {
      "enabled": true,
      "personalPatterns": true,
      "teamConventions": true
    }
  }
}
```

### ステップ5: 学習システムの初期化

```bash
# 学習システムを初期化
node src/autofix/approval-interceptor.js --init

# 初回の学習データ収集
./scripts/auto-learning-update.sh --initial
```

### ステップ6: 監視システムの起動

```bash
# 監視システムをテスト
node -e "
const { MonitoringAlertSystem } = require('./src/monitoring/MonitoringAlertSystem');
const monitor = new MonitoringAlertSystem(process.cwd());
monitor.startMonitoring().then(() => {
  console.log('監視システムが正常に起動しました');
  process.exit(0);
});
"
```

### ステップ7: カスタムコマンドの作成

`.claude/commands/auto-fix-errors.json`:

```json
{
  "name": "auto-fix-errors",
  "description": "自動的にエラーを修正",
  "pattern": "scripts/auto-fix-errors.sh",
  "trigger": {
    "onError": true,
    "manual": true
  }
}
```

`.claude/commands/auto-deps.json`:

```json
{
  "name": "auto-deps",
  "description": "依存関係を自動管理",
  "pattern": "scripts/auto-deps.sh",
  "trigger": {
    "onSave": false,
    "manual": true
  }
}
```

## 段階的な導入

すべての機能を一度に有効化する必要はありません。以下の順序での導入を推奨します：

### フェーズ1: 基本的な自動化（1週間）

1. **自動エラー修正** - 開発効率の即座の改善
2. **依存関係の自動管理** - セキュリティとメンテナンスの改善

```json
{
  "automation": {
    "errorFix": { "enabled": true },
    "dependencies": { "enabled": true }
    // その他はfalseに設定
  }
}
```

### フェーズ2: ドキュメントとテスト（2週間目）

3. **自動ドキュメント生成**
4. **テストカバレッジ自動改善**

```json
{
  "automation": {
    "documentation": { "enabled": true },
    "testing": { "enabled": true }
  }
}
```

### フェーズ3: 高度な機能（3週間目以降）

5. **自動リファクタリング**
6. **PR/コードレビュー自動化**
7. **環境構築の完全自動化**
8. **学習型コード補完**
9. **自動バージョン管理**
10. **監視・アラート統合**

## トラブルシューティング

### TypeScriptのコンパイルエラー

```bash
# 型定義を再生成
npm run build

# キャッシュをクリア
rm -rf node_modules/.cache
npm run typecheck
```

### 学習データが大きくなりすぎる

```bash
# 古いデータを削除
node src/autofix/approval-interceptor.js --cleanup --older-than 90

# データを最適化
./scripts/auto-learning-update.sh --compact
```

### 監視システムがCPUを消費しすぎる

```json
{
  "monitoring": {
    "interval": 300000, // 5分に延長
    "lightweight": true // 軽量モード
  }
}
```

## ロールバック手順

問題が発生した場合：

```bash
# 設定を元に戻す
cp .claude/settings.json.backup .claude/settings.json
cp .claude/settings.local.json.backup .claude/settings.local.json

# 新しいファイルを削除
rm -rf src/autofix
rm -rf src/dependencies
rm -rf src/refactoring
rm -rf src/documentation
rm -rf src/testing
rm -rf src/pr
rm -rf src/environment
rm -rf src/learning
rm -rf src/versioning
rm -rf src/monitoring

# package.jsonを元に戻す
git checkout package.json
npm install
```

## 移行完了チェックリスト

- [ ] バックアップを作成した
- [ ] 新しいファイルをすべて追加した
- [ ] 設定ファイルを更新した
- [ ] TypeScriptのコンパイルが成功した
- [ ] 学習システムが初期化された
- [ ] 監視システムが起動した
- [ ] 基本的な自動化機能をテストした
- [ ] チームメンバーに変更を通知した
- [ ] ドキュメントを確認した

## サポート

問題が発生した場合は、以下を確認してください：

1. エラーログ: `.claude/logs/`
2. 学習データ: `.claude/learning/`
3. メトリクス: `.claude/metrics/`

詳細なサポートについては、[AUTOMATION.md](./AUTOMATION.md)および[LEARNING_SYSTEM.md](./LEARNING_SYSTEM.md)を参照してください。
