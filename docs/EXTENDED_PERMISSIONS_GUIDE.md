# Claude Code 拡張権限ガイド

## 概要

Claude Code Auto Actionの権限設定を大幅に拡張し、より多くの自動化タスクを可能にしました。これにより、システム構築に必要なほぼすべての操作が自動で実行できるようになりました。

## 拡張された権限カテゴリ

### 1. **パッケージマネージャー（全言語対応）**

```json
"allow": [
  "Bash(npm *)",      // Node.js
  "Bash(yarn *)",     // Yarn
  "Bash(pnpm *)",     // pnpm
  "Bash(bun *)",      // Bun
  "Bash(pip *)",      // Python
  "Bash(poetry *)",   // Poetry
  "Bash(gem *)",      // Ruby
  "Bash(cargo *)",    // Rust
  "Bash(go *)",       // Go
  "Bash(mvn *)",      // Maven (Java)
  "Bash(gradle *)",   // Gradle
  "Bash(dotnet *)"    // .NET
]
```

これにより、任意のパッケージのインストール、更新、管理が可能になります。

### 2. **フレームワーク・ツール**

```json
"allow": [
  "Bash(rails *)",          // Ruby on Rails
  "Bash(django-admin *)",   // Django
  "Bash(flask *)",          // Flask
  "Bash(next *)",           // Next.js
  "Bash(nuxt *)",           // Nuxt
  "Bash(gatsby *)",         // Gatsby
  "Bash(create-react-app *)", // React
  "Bash(vue *)",            // Vue CLI
  "Bash(ng *)",             // Angular CLI
]
```

各フレームワークのCLIツールを使用したプロジェクト生成、ビルド、開発サーバー起動が可能です。

### 3. **データベース操作**

```json
"allow": [
  "Bash(psql *)",      // PostgreSQL
  "Bash(mysql *)",     // MySQL
  "Bash(mongosh *)",   // MongoDB
  "Bash(redis-cli *)", // Redis
  "Bash(prisma *)",    // Prisma ORM
  "Bash(sequelize *)", // Sequelize ORM
  "Bash(typeorm *)",   // TypeORM
  "Bash(migrate *)",   // マイグレーション
  "Bash(seed *)"       // シードデータ
]
```

データベースの作成、マイグレーション、シードデータの投入が自動化されます。

### 4. **クラウド・デプロイメント**

```json
"allow": [
  "Bash(docker *)",        // Docker
  "Bash(docker-compose *)", // Docker Compose
  "Bash(kubectl *)",       // Kubernetes
  "Bash(helm *)",          // Helm
  "Bash(terraform *)",     // Terraform
  "Bash(aws *)",           // AWS CLI
  "Bash(gcloud *)",        // Google Cloud
  "Bash(az *)",            // Azure CLI
  "Bash(vercel *)",        // Vercel
  "Bash(netlify *)",       // Netlify
  "Bash(heroku *)"         // Heroku
]
```

コンテナ化、オーケストレーション、クラウドデプロイメントが完全自動化されます。

### 5. **開発ツール**

```json
"allow": [
  "Bash(prettier *)",    // コードフォーマッター
  "Bash(eslint *)",      // JavaScript Linter
  "Bash(ruff *)",        // Python Linter
  "Bash(black *)",       // Python Formatter
  "Bash(jest *)",        // JavaScript Test
  "Bash(pytest *)",      // Python Test
  "Bash(cypress *)",     // E2E Test
  "Bash(playwright *)"   // E2E Test
]
```

コード品質の維持、テストの実行が自動化されます。

### 6. **システムツール（安全な範囲）**

```json
"allow": [
  "Bash(curl -L *)",        // ダウンロード（リダイレクト対応）
  "Bash(wget -O *)",        // ファイル保存指定
  "Bash(brew install *)",   // macOSパッケージ
  "Bash(apt-get install -y *)", // Ubuntuパッケージ
  "Bash(chmod +x *)",       // 実行権限付与
  "Bash(openssl *)",        // 証明書生成
  "Bash(base64 *)",         // エンコード/デコード
]
```

必要なツールのインストール、証明書生成などが可能です。

## セキュリティ設定

### 危険な操作の制限

```json
"deny": [
  "Bash(rm -rf /)",           // システム全体削除
  "Bash(sudo rm -rf *)",      // 管理者権限での削除
  "Bash(chmod -R 777 /)",     // システム全体の権限変更
  "Bash(dd if=/dev/zero of=/dev/*)", // ディスク消去
  "FileEdit(**/.ssh/id_rsa)", // 秘密鍵の編集
  "Write(**/.aws/credentials)" // クラウド認証情報の書き込み
]
```

### 環境変数の安全な管理

```json
"security": {
  "allow_env_file_creation": true,
  "env_file_template_only": true,    // .env.exampleのみ作成
  "mask_sensitive_data": true,       // 機密データのマスク
  "auto_generate_secure_passwords": true
}
```

## 拡張機能の設定

### 自動初期化

```json
"system_initialization": {
  "auto_detect_requirements": true,     // 要件の自動検出
  "auto_install_dependencies": true,    // 依存関係の自動インストール
  "auto_setup_database": true,          // データベースの自動セットアップ
  "auto_configure_environment": true,   // 環境の自動設定
  "auto_create_docker_compose": true,   // Docker Composeの自動作成
  "auto_setup_ci_cd": true,            // CI/CDの自動設定
  "auto_generate_tests": true,          // テストの自動生成
  "auto_create_documentation": true     // ドキュメントの自動作成
}
```

### サポート技術

```json
"technology_support": {
  "frontend": ["react", "vue", "angular", "svelte"],
  "backend": ["node", "python", "ruby", "go", "rust"],
  "database": ["postgres", "mysql", "mongodb", "redis"],
  "deployment": ["docker", "kubernetes", "vercel", "aws"],
  "testing": ["jest", "pytest", "cypress", "playwright"],
  "payment": ["stripe", "paypal", "square"],
  "authentication": ["jwt", "oauth2", "auth0"]
}
```

## 使用例

### 1. フルスタックアプリケーション

```bash
cc-create -r "ECサイトを作りたい。Next.js、Stripe決済、PostgreSQL使用"
```

自動実行される操作:
- `npx create-next-app` でプロジェクト作成
- `npm install stripe @stripe/stripe-js` で決済ライブラリインストール
- `docker-compose up -d postgres` でデータベース起動
- `prisma init` でORM設定
- `prisma migrate dev` でマイグレーション実行

### 2. マイクロサービス

```bash
cc-create -r "マイクロサービスAPIを作りたい。Go言語、gRPC、Kubernetes対応"
```

自動実行される操作:
- `go mod init` でGoプロジェクト初期化
- `go get google.golang.org/grpc` でgRPCインストール
- `protoc` でProtobufコンパイル
- `docker build` でコンテナ作成
- `kubectl apply` でKubernetesデプロイ

### 3. AI/MLシステム

```bash
cc-create -r "機械学習APIを作りたい。Python、FastAPI、TensorFlow"
```

自動実行される操作:
- `python -m venv venv` で仮想環境作成
- `pip install fastapi tensorflow uvicorn` で依存関係インストール
- `docker-compose` でJupyter環境セットアップ
- モデルサービングエンドポイント作成

## ベストプラクティス

1. **段階的な権限拡張**
   - 最初は基本的な権限から始める
   - プロジェクトの要件に応じて追加

2. **監査ログの確認**
   ```bash
   tail -f ~/.claude/logs/permissions.log
   ```

3. **定期的なセキュリティレビュー**
   - 許可リストの見直し
   - 不要な権限の削除

4. **環境別の設定**
   - 開発環境：より広い権限
   - 本番環境：最小限の権限

## トラブルシューティング

### 権限エラーが出る場合

1. 権限設定を確認
   ```bash
   cat ~/.claude/permissions.json | jq '.permissions.allow'
   ```

2. 特定のコマンドを追加
   ```json
   {
     "permissions": {
       "allow": [
         "Bash(your-command *)"
       ]
     }
   }
   ```

### パフォーマンスの問題

- バッチ操作の上限を調整
  ```json
  {
    "confirmThreshold": {
      "batchOperations": 100  // 増やす
    }
  }
  ```

## まとめ

拡張された権限設定により、Claude Code Auto Architectは以下が可能になりました:

- ✅ 任意の言語/フレームワークでのシステム構築
- ✅ 依存関係の自動管理
- ✅ データベースの自動セットアップ
- ✅ テスト環境の自動構築
- ✅ CI/CDパイプラインの自動設定
- ✅ クラウドへの自動デプロイ準備
- ✅ セキュリティ設定の自動化
- ✅ ドキュメントの自動生成

これらの機能により、「〇〇を作りたい」という要求から、プロダクションレディなシステムまでを完全自動で構築できるようになりました。