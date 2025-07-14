# Claude Code Auto Architect ガイド

## 概要

Claude Code Auto Architectは、「〇〇するシステムを作りたい」という抽象的な要求から、完全に動作するシステムを自動生成する階層的エージェントシステムです。

## 仕組み

### 階層構造

```
┌─────────────┐
│  Architect  │ ← システム全体の設計・タスク分解
└──────┬──────┘
       │
┌──────┴──────┬──────┬──────┬──────┐
│   Frontend  │Backend│  DB  │DevOps│Testing│ ← 各分野の管理・計画
│   Manager   │Manager│Manager│Manager│Manager│
└──────┬──────┴──────┴──────┴──────┴──────┘
       │
┌──────┴──────────────────────────────────┐
│            Workers (最大10並列)           │ ← 実際の実装
│  Code Gen | Test Writer | Doc Writer    │
└─────────────────────────────────────────┘
```

### 実行フェーズ

1. **分析フェーズ** (5-10分)
   - Architectが要件を分析
   - システムアーキテクチャを設計
   - タスクを分解

2. **計画フェーズ** (10-15分)
   - 5つのManagerが並列で計画策定
   - 各分野の詳細設計
   - 依存関係の整理

3. **実装フェーズ** (30-60分)
   - 最大10のWorkerが並列実行
   - コード生成
   - テスト作成
   - ドキュメント生成

4. **統合フェーズ** (10-15分)
   - 全体の統合
   - 最終ドキュメント作成
   - デプロイ準備

## 使用例

### 基本的な使い方

```bash
# シンプルな要求
cc-create -r "ブログシステムを作りたい"

# 詳細な要求
cc-create -r "マルチテナント対応のSaaSプラットフォームを作りたい。ユーザー管理、課金、API提供機能付き"

# 技術スタック指定
cc-create -r "リアルタイムチャットアプリ" -t web -s "react,node,socket.io,redis"
```

### 実践例

#### 例1: タスク管理システム

```bash
cc-create -r "タスク管理システムを作りたい。カンバンボード、リアルタイム更新、チーム機能付き"
```

生成されるもの:

- Frontend: React + TypeScript + Socket.io
- Backend: Node.js + Express + JWT認証
- Database: PostgreSQL + Redis
- リアルタイム: WebSocket
- テスト: Jest + Cypress
- CI/CD: GitHub Actions
- Docker構成

#### 例2: ECサイト

```bash
cc-create -r "ECサイトを作りたい。商品管理、カート、決済、在庫管理機能付き" -t web -s "next.js,prisma,stripe"
```

生成されるもの:

- Frontend: Next.js + Tailwind CSS
- Backend: Next.js API Routes
- Database: PostgreSQL + Prisma ORM
- 決済: Stripe統合
- 認証: NextAuth.js
- 管理画面: 商品・在庫管理
- SEO最適化

#### 例3: REST API

```bash
cc-create -r "マイクロサービス構成のREST APIを作りたい。認証、ファイルアップロード、レート制限付き"
```

生成されるもの:

- API Gateway: Kong/Express Gateway
- 認証サービス: JWT + OAuth2
- ファイルサービス: S3互換ストレージ
- レート制限: Redis
- API仕様書: OpenAPI 3.0
- Postmanコレクション
- Docker Compose構成

## Deep Thinkingキーワード

システムをより良くするために、以下のキーワードを要求に含めることができます:

- **"step-by-step"** - 段階的な実装
- **"scalable"** - スケーラブルな設計
- **"secure"** - セキュリティ重視
- **"performance"** - パフォーマンス最適化
- **"test-driven"** - TDD実装
- **"clean architecture"** - クリーンアーキテクチャ

例:

```bash
cc-create -r "scalableでsecureなAPIを作りたい。clean architectureで実装して"
```

## トラブルシューティング

### エラーが出る場合

1. Claude CLIがインストールされているか確認

   ```bash
   claude --version
   ```

2. APIキーが設定されているか確認

   ```bash
   echo $ANTHROPIC_API_KEY
   ```

3. 権限設定を確認
   ```bash
   cat ~/.claude/permissions.json
   ```

### 生成が遅い場合

- 並列エージェント数を減らす
  ```bash
  cc-create -r "..." -p 5  # 5並列に制限
  ```

### コスト制限に達した場合

- 日次制限を確認

  ```bash
  claude /cost
  ```

- 制限を変更（~/.claude/settings.json）
  ```json
  {
    "costControl": {
      "dailyLimit": 15 // $15に変更
    }
  }
  ```

## ベストプラクティス

1. **要求は具体的に**
   - ✅ "ユーザー認証付きのタスク管理API"
   - ❌ "何か作って"

2. **機能を明確に**
   - ✅ "リアルタイム更新、チーム機能、通知機能付き"
   - ❌ "いい感じの機能で"

3. **技術的制約を指定**
   - ✅ "-s node,typescript,postgres"
   - ❌ 何も指定しない（自動選択されるが最適でない可能性）

4. **段階的に構築**
   - まず基本機能で生成
   - その後、機能を追加

## 高度な使い方

### カスタムプロンプト

`.claude/prompts/`にカスタムプロンプトを配置:

```markdown
# my-architecture.md

Always use Domain-Driven Design principles.
Implement CQRS pattern for complex domains.
Use event sourcing for audit trails.
```

使用:

```bash
cc-create -r "..." --prompt my-architecture
```

### プロジェクトテンプレート

頻繁に使う構成をテンプレート化:

```bash
# テンプレート作成
cc-architect template save "saas-starter"

# テンプレートから生成
cc-create --template saas-starter -r "新しいSaaSプロダクト"
```

## まとめ

Claude Code Auto Architectを使えば、アイデアから動作するシステムまでを自動で構築できます。要求を明確にし、適切なキーワードを使うことで、プロ品質のシステムが生成されます。
