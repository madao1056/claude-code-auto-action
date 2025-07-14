# メンテナンスガイド

## 定期メンテナンス

### 日次タスク

#### 1. ログの確認

```bash
# エラーログの確認
tail -f .claude/logs/error.log

# 監視ログの確認
tail -f .claude/logs/monitoring.log

# 学習ログの確認
tail -f .claude/logs/learning.log
```

#### 2. システム状態の確認

```bash
# 全体的な状態確認
claude-code system-status

# 監視レポート
claude-code monitor report

# 学習統計
claude-code learning stats
```

### 週次タスク

#### 1. パフォーマンス最適化

```bash
# 学習データの最適化
claude-code optimize-learning

# キャッシュの整理
claude-code cleanup --cache --older-than 7d

# 未使用依存関係の削除
scripts/auto-deps.sh clean
```

#### 2. セキュリティチェック

```bash
# 脆弱性スキャン
npm audit

# 依存関係の更新確認
npm outdated

# 権限設定の確認
cat .claude/permissions.json | jq .
```

### 月次タスク

#### 1. データのバックアップ

```bash
# 学習データのバックアップ
tar -czf backup-learning-$(date +%Y%m%d).tar.gz .claude/learning/

# 設定のバックアップ
tar -czf backup-settings-$(date +%Y%m%d).tar.gz .claude/*.json

# メトリクスのアーカイブ
tar -czf backup-metrics-$(date +%Y%m%d).tar.gz .claude/metrics/
```

#### 2. ストレージの最適化

```bash
# 古いログの削除
find .claude/logs -name "*.log" -mtime +30 -delete

# 学習データの圧縮
claude-code learning compact

# 一時ファイルの削除
rm -rf .claude/tmp/*
```

## トラブルシューティング手順

### 問題: 自動修正が無限ループする

#### 診断

```bash
# 修正履歴を確認
cat .claude/fix-history.json | jq '.[-10:]'

# 現在の設定を確認
cat .claude/settings.json | jq '.automation.errorFix'
```

#### 解決策

```bash
# 修正履歴をクリア
rm -f .claude/fix-history.json

# リトライ数を減らす
claude-code config set autoFix.maxRetries 1

# 一時的に無効化
claude-code config set automation.errorFix.enabled false
```

### 問題: メモリ使用量が高い

#### 診断

```bash
# プロセスの確認
ps aux | grep node | grep claude

# メモリ使用状況
node -e "console.log(process.memoryUsage())"
```

#### 解決策

```bash
# 監視を軽量モードに
claude-code config set monitoring.lightweight true

# 並列実行数を減らす
claude-code config set automation.parallel_agents 3

# サービスを再起動
claude-code restart-services
```

### 問題: API使用料が高い

#### 診断

```bash
# 本日の使用量
claude-code cost --today

# 機能別の使用量
claude-code cost --breakdown
```

#### 解決策

```bash
# モデルをSonnetに変更
claude-code config set preferredModel sonnet

# 自動化機能を選択的に無効化
claude-code config set automation.documentation.enabled false
claude-code config set automation.testing.autoGenerateTests false

# コスト上限を設定
claude-code config set costControl.dailyLimit 5
```

## システムの健全性チェック

### ヘルスチェックスクリプト

`scripts/health-check.sh`:

```bash
#!/bin/bash

echo "🏥 Claude Code Auto Action Health Check"
echo "======================================"

# 1. 設定ファイルの確認
echo -n "設定ファイル: "
if [ -f ".claude/settings.json" ]; then
  echo "✅ OK"
else
  echo "❌ 見つかりません"
fi

# 2. 権限の確認
echo -n "実行権限: "
if [ -x "scripts/auto-fix-errors.sh" ]; then
  echo "✅ OK"
else
  echo "❌ 権限がありません"
fi

# 3. Node.jsバージョン
echo -n "Node.js: "
node_version=$(node -v)
if [[ $node_version == v1[6-9]* ]] || [[ $node_version == v2* ]]; then
  echo "✅ $node_version"
else
  echo "❌ $node_version (v16以上が必要)"
fi

# 4. TypeScriptコンパイル
echo -n "TypeScript: "
if npm run typecheck > /dev/null 2>&1; then
  echo "✅ OK"
else
  echo "❌ コンパイルエラー"
fi

# 5. ディスク容量
echo -n "ディスク容量: "
usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $usage -lt 90 ]; then
  echo "✅ ${usage}%使用"
else
  echo "❌ ${usage}%使用 (空き容量不足)"
fi

# 6. API接続
echo -n "Claude API: "
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "✅ キー設定済み"
else
  echo "❌ キーが設定されていません"
fi

echo "======================================"
```

### 実行

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

## データ管理

### 学習データの管理

```bash
# サイズ確認
du -sh .claude/learning/

# 統計情報
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.claude/learning/approval-patterns.json'));
console.log('パターン数:', Object.keys(data).length);
console.log('自動承認数:', Object.values(data).filter(p => p.autoApprove).length);
"
```

### バックアップとリストア

```bash
# フルバックアップ
./scripts/backup.sh full

# 増分バックアップ
./scripts/backup.sh incremental

# リストア
./scripts/restore.sh backup-20240110.tar.gz
```

## パフォーマンスチューニング

### メトリクスの収集

```javascript
// performance-metrics.js
const { PerformanceObserver, performance } = require('perf_hooks');

const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

obs.observe({ entryTypes: ['measure'] });

// 使用例
performance.mark('error-fix-start');
// ... エラー修正処理 ...
performance.mark('error-fix-end');
performance.measure('error-fix', 'error-fix-start', 'error-fix-end');
```

### 最適化のヒント

1. **並列処理の調整**
   - CPU数に応じて`parallel_agents`を設定
   - I/Oバウンドなタスクは並列数を増やす

2. **キャッシング**
   - 頻繁にアクセスするデータはメモリキャッシュ
   - 大きなデータはディスクキャッシュ

3. **バッチ処理**
   - 小さなタスクはまとめて処理
   - API呼び出しを最小限に

## 監視とアラート

### カスタムアラートの設定

```javascript
// custom-alerts.js
const { MonitoringAlertSystem } = require('./src/monitoring/MonitoringAlertSystem');

const monitor = new MonitoringAlertSystem(process.cwd());

// カスタムアラート条件
monitor.on('metric', (metric) => {
  // ビルド時間が5分を超えたらアラート
  if (metric.name === 'build_time' && metric.value > 300000) {
    console.error('⚠️ ビルド時間が長すぎます:', metric.value / 1000, '秒');
  }

  // メモリ使用量が1GBを超えたらアラート
  if (metric.name === 'memory_usage' && metric.value > 1024 * 1024 * 1024) {
    console.error(
      '⚠️ メモリ使用量が高すぎます:',
      (metric.value / 1024 / 1024 / 1024).toFixed(2),
      'GB'
    );
  }
});
```

## アップグレード手順

### マイナーアップデート

```bash
# バックアップ
./scripts/backup.sh before-update

# アップデート
git pull
npm install

# マイグレーション
npm run migrate

# テスト
npm test

# 確認
./scripts/health-check.sh
```

### メジャーアップデート

1. リリースノートを確認
2. 破壊的変更の影響を評価
3. テスト環境で検証
4. 段階的に移行

## 緊急時の対応

### システム停止

```bash
# すべてのプロセスを停止
pkill -f "claude-code"

# ロックファイルを削除
rm -f .claude/*.lock

# セーフモードで起動
CLAUDE_SAFE_MODE=true claude-code start
```

### データ破損

```bash
# 破損したファイルを特定
find .claude -name "*.json" -exec jsonlint {} \;

# バックアップから復元
./scripts/restore.sh --file .claude/learning/approval-patterns.json

# データ検証
claude-code validate-data
```

### ロールバック

```bash
# 前のバージョンに戻す
git checkout v1.1.0
npm install

# データの互換性チェック
claude-code check-compatibility

# 設定の調整
claude-code migrate-config --downgrade
```
