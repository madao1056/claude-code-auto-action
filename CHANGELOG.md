# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-01-10

### ⚠ BREAKING CHANGES

- 学習システムのデータ構造が変更されました。既存の学習データは移行が必要です。

### Features

- **autofix:** TypeScript型エラー、ESLint、ビルドエラーの自動修正システムを実装
- **dependencies:** 依存関係の自動管理機能を追加（不足パッケージの検出、脆弱性修正）
- **refactoring:** 重複コード、長いメソッド、複雑な条件式の自動リファクタリング
- **documentation:** API仕様書、JSDocコメント、READMEの自動生成
- **testing:** テストカバレッジ不足箇所の検出とテストケース自動生成
- **pr:** PR作成とコードレビューの自動化（Conventional Commits対応）
- **environment:** プロジェクトタイプ自動検出とDocker/CI設定の自動生成
- **learning:** 個人のコーディングパターンを学習する補完システム
- **versioning:** Conventional Commitsに基づく自動バージョン管理
- **monitoring:** パフォーマンス回帰、バンドルサイズ、セキュリティの監視

### Performance Improvements

- **parallel:** 最大10エージェントの並列実行による高速化
- **cache:** 学習データのキャッシュ最適化
- **monitoring:** 軽量モードの追加によるCPU使用率の削減

### Bug Fixes

- **typescript:** 型エラーの修正（Map型の不整合）
- **learning:** 学習データのインポート/エクスポート機能の修正

## [1.1.0] - 2025-01-09

### Features

- **thinking-mode:** 適応型思考モードシステムの実装
- **auto-escalation:** 2回以上の修正で自動的にultrathinkモードへ昇格
- **hierarchical-agents:** 階層的エージェントシステム（Architect/Manager/Worker）
- **auto-architect:** 要件から完全なシステムを自動生成

### Performance Improvements

- **context:** コンテキスト使用量90%で自動圧縮
- **model-switching:** タスクに応じたSonnet/Opus自動切り替え

## [1.0.0] - 2025-01-08

### Features

- **yolo-mode:** 権限確認の自動承認機能
- **auto-commit:** AIによる適切なコミットメッセージ生成
- **auto-format:** 保存時の自動フォーマット
- **cost-control:** 日次コスト上限設定（デフォルト$8）
- **vscode-extension:** VSCode/Cursor統合

### Security

- **permissions:** Allow/Denyリストによる細かい権限制御
- **git-checkpoint:** 自動でGitチェックポイント作成
- **audit-log:** すべての操作の監査ログ

## [0.9.0] - 2024-12-15

### Features

- 初期リリース
- 基本的な自動化機能
- Claude API統合
