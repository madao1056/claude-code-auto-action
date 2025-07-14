# Claude Code - 既存プロジェクト改良ガイド

## 概要

Claude Code Auto Architectは、新規プロジェクトの作成だけでなく、**既存プロジェクトの分析・改良・機能追加**にも対応しています。

## 使用可能なコマンド

### 1. プロジェクト分析 (`analyze`)

既存プロジェクトを詳細に分析し、改善点を提案します。

```bash
# 現在のディレクトリのプロジェクトを分析
cc-architect analyze

# または
cd /path/to/your/project
cc-architect analyze
```

#### 分析内容

1. **プロジェクト構造分析**
   - 技術スタックの検出
   - ディレクトリ構造の評価
   - 依存関係の分析

2. **コード品質評価**
   - コードの臭い検出
   - 重複コードの発見
   - 複雑度分析
   - テストカバレッジ確認

3. **パフォーマンス分析**
   - データベースクエリ効率
   - API応答時間
   - バンドルサイズ
   - キャッシュ機会

4. **セキュリティ監査**
   - 脆弱な依存関係
   - セキュリティホール
   - 認証・認可の問題
   - 露出した秘密情報

5. **アーキテクチャレビュー**
   - デザインパターン
   - スケーラビリティ
   - 技術的負債
   - 結合度・凝集度

#### 生成されるレポート

- `project_analysis_report.md` - 総合分析レポート
- `improvement_plan.md` - 優先順位付き改善計画
- `security_audit.md` - セキュリティ監査結果
- `performance_report.md` - パフォーマンス最適化提案
- `refactoring_guide.md` - リファクタリングガイド

### 2. プロジェクトアップグレード (`upgrade`)

既存プロジェクトに新機能追加や改良を行います。

```bash
# 新機能追加
cc-architect upgrade -r "リアルタイム通知機能を追加したい"

# パフォーマンス最適化
cc-architect upgrade -r "データベースクエリを最適化" -t optimize

# セキュリティ強化
cc-architect upgrade -r "セキュリティ脆弱性を修正" -t security

# リファクタリング
cc-architect upgrade -r "マイクロサービスアーキテクチャに移行" -t refactor
```

#### アップグレードタイプ

1. **feature** (デフォルト) - 新機能追加
2. **optimize** - パフォーマンス最適化
3. **security** - セキュリティ強化
4. **refactor** - コード改善・アーキテクチャ変更

## 実践例

### 例1: レガシーアプリのモダナイズ

```bash
# 1. まず現状を分析
cc-architect analyze

# 2. 分析結果を確認して、モダナイズ
cc-architect upgrade -r "React 16から18にアップグレードし、TypeScriptを導入"
```

実行される処理:

- 依存関係の更新
- TypeScript設定の追加
- 既存コードの型定義追加
- 非推奨APIの置き換え
- テストの更新

### 例2: パフォーマンス改善

```bash
cc-architect upgrade -r "ページ読み込み速度を50%改善" -t optimize
```

実行される最適化:

- バンドルサイズの削減
- 画像の遅延読み込み実装
- コード分割の実装
- キャッシュ戦略の改善
- データベースインデックス追加

### 例3: セキュリティ強化

```bash
cc-architect upgrade -r "OWASP Top 10の脆弱性対策" -t security
```

実行される対策:

- 依存関係の脆弱性修正
- SQL Injection対策
- XSS対策の実装
- 認証・認可の強化
- セキュリティヘッダーの追加

### 例4: マイクロサービス化

```bash
cc-architect upgrade -r "モノリスからマイクロサービスへ移行" -t refactor
```

実行される変更:

- サービス境界の定義
- APIゲートウェイの実装
- サービス間通信の設定
- データベースの分離
- Docker/Kubernetes設定

## 高度な使い方

### 段階的アップグレード

大規模な変更は段階的に実行:

```bash
# Phase 1: 準備
cc-architect upgrade -r "TypeScriptの型定義を追加（any許可）"

# Phase 2: 改善
cc-architect upgrade -r "any型を具体的な型に置き換え"

# Phase 3: 厳格化
cc-architect upgrade -r "strict modeを有効化"
```

### カスタム分析

特定の観点で分析:

```bash
# パフォーマンスに特化
cc-architect analyze --focus performance

# セキュリティに特化
cc-architect analyze --focus security
```

### 自動修正モード

```bash
# 分析で見つかった問題を自動修正
cc-architect upgrade -r "分析で見つかったすべての問題を修正" --auto-fix
```

## ベストプラクティス

1. **バックアップを取る**

   ```bash
   git add -A && git commit -m "Backup before upgrade"
   ```

2. **段階的に実行**
   - まず `analyze` で現状把握
   - 小さな変更から始める
   - 各段階でテストを実行

3. **ブランチで作業**

   ```bash
   git checkout -b feature/claude-upgrade
   cc-architect upgrade -r "..."
   ```

4. **レビューを重視**
   - 生成されたコードは必ずレビュー
   - 差分を確認: `git diff`
   - テストを実行: `npm test`

## トラブルシューティング

### プロジェクトが正しく認識されない

```bash
# プロジェクトタイプを明示
cc-architect analyze -t node

# または CLAUDE.md を作成
echo "Project: Node.js Express API" > CLAUDE.md
```

### 変更が大きすぎる

```bash
# 変更範囲を限定
cc-architect upgrade -r "UserControllerのみリファクタリング" --scope src/controllers/UserController.js
```

### テストが失敗する

```bash
# テストも同時に更新
cc-architect upgrade -r "..." --update-tests
```

## 統合ワークフロー

### CI/CDとの統合

```yaml
# .github/workflows/claude-analysis.yml
name: Weekly Code Analysis
on:
  schedule:
    - cron: '0 0 * * 0' # 毎週日曜日
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Claude Analysis
        run: |
          cc-architect analyze
          # レポートをアーティファクトとして保存
```

### pre-commitフック

```bash
# .git/hooks/pre-commit
#!/bin/bash
cc-architect analyze --quick
if [ $? -ne 0 ]; then
  echo "Code quality issues detected. Run 'cc-architect analyze' for details."
  exit 1
fi
```

## まとめ

Claude Code Auto Architectを使えば：

- ✅ 既存プロジェクトの問題点を自動発見
- ✅ 新機能を既存コードと調和させて追加
- ✅ パフォーマンス・セキュリティを自動改善
- ✅ レガシーコードをモダンに変換
- ✅ アーキテクチャの大規模変更も安全に実行

「こう改良したい」と伝えるだけで、プロジェクトが進化します！
