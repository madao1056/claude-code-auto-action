# よくある質問 (FAQ)

## 一般的な質問

### Q: Claude Code Auto Actionとは何ですか？

A: Claude AIを活用した開発自動化ツールです。コードエラーの自動修正、依存関係管理、ドキュメント生成など、10種類以上の自動化機能を提供します。

### Q: どのプログラミング言語に対応していますか？

A: 現在はTypeScript/JavaScriptを中心に対応していますが、Python、Ruby、Go、Javaなどの言語でも一部機能が利用可能です。

### Q: Claude APIキーはどこで取得できますか？

A: [Anthropic Console](https://console.anthropic.com/)でアカウントを作成し、APIキーを発行してください。

## インストールと設定

### Q: インストールがうまくいきません

A: 以下を確認してください：

1. Node.js v16以上がインストールされているか
2. `ANTHROPIC_API_KEY`環境変数が設定されているか
3. 必要な権限があるか（`chmod +x scripts/*.sh`）

### Q: 設定ファイルはどこにありますか？

A: 主な設定ファイル：

- `.claude/settings.json` - グローバル設定
- `.claude/settings.local.json` - ローカル設定（gitignore対象）
- `.claude/permissions.json` - 権限設定

### Q: デフォルト設定を変更したい

A: `.claude/settings.json`を編集してください。主要な設定項目：

```json
{
  "defaultMode": "bypassPermissions", // or "interactive"
  "costControl": {
    "dailyLimit": 8 // 日次コスト上限（ドル）
  }
}
```

## 機能に関する質問

### Q: 自動エラー修正が動作しません

A: 以下を確認してください：

1. `automation.errorFix.enabled`が`true`になっているか
2. TypeScriptがプロジェクトにインストールされているか
3. `tsconfig.json`が正しく設定されているか

### Q: 学習データはどこに保存されますか？

A: すべての学習データはローカルの`.claude/learning/`ディレクトリに保存されます。外部サーバーには送信されません。

### Q: 危険な操作を防ぐには？

A: `.claude/permissions.json`で危険パターンを定義できます：

```json
{
  "rules": {
    "deny": ["Bash(rm -rf /*)", "Edit(.env*)", "Write(**/*secret*)"]
  }
}
```

### Q: 自動承認される条件は？

A: デフォルトでは以下の条件で自動承認されます：

1. 同じ操作が3回以上承認されている
2. 危険パターンに該当しない
3. 信頼度が0.8以上

## パフォーマンスとコスト

### Q: API使用料金を抑えたい

A: 以下の方法で費用を削減できます：

1. `preferredModel: "sonnet"`に設定（Opusより安価）
2. `costControl.dailyLimit`で日次上限を設定
3. 不要な機能を無効化
4. コンテキスト自動圧縮を有効化

### Q: 処理が遅い

A: パフォーマンス改善方法：

1. 並列実行数を調整: `parallel_agents: 5`
2. 監視間隔を延長: `monitoring.interval: 300000`
3. 不要な機能を無効化
4. キャッシュを活用

### Q: メモリ使用量が多い

A: 以下を試してください：

```bash
# 古い学習データを削除
./scripts/auto-learning-update.sh --cleanup --older-than 30

# キャッシュをクリア
rm -rf .claude/cache/*
```

## トラブルシューティング

### Q: "Permission denied"エラーが出る

A: 以下のいずれかを試してください：

1. `export CLAUDE_PERMISSIONS_MODE=bypassPermissions`
2. `.claude/permissions.json`で該当操作を許可
3. スクリプトに実行権限を付与: `chmod +x scripts/*.sh`

### Q: TypeScriptのコンパイルエラーが続く

A: 以下の手順で解決：

```bash
# キャッシュクリア
rm -rf node_modules package-lock.json
npm install

# TypeScript再インストール
npm install --save-dev typescript@latest

# 型チェック
npm run typecheck
```

### Q: 学習が反映されない

A: 学習システムをリセット：

```bash
# 特定のパターンを削除
node src/autofix/approval-interceptor.js --remove-pattern "pattern"

# 全データリセット
node src/autofix/approval-interceptor.js --reset --confirm
```

## セキュリティ

### Q: APIキーは安全に管理されていますか？

A: はい。APIキーは環境変数で管理され、コードには含まれません。`.env`ファイルは`.gitignore`に含まれています。

### Q: 学習データに機密情報が含まれる心配は？

A: 学習システムは操作パターンのみを記録し、実際のコード内容は保存しません。また、すべてのデータはローカルに保存されます。

### Q: チームで学習データを共有できますか？

A: はい、安全に共有できます：

```bash
# 個人情報を除外してエクスポート
claude-code learning export --exclude-personal > team-patterns.json

# インポート
claude-code learning import team-patterns.json
```

## アップデートと移行

### Q: 新バージョンへの移行方法は？

A: [移行ガイド](./MIGRATION_GUIDE.md)を参照してください。必ずバックアップを取ってから移行してください。

### Q: 古いバージョンに戻したい

A: ロールバック手順：

```bash
# バックアップから復元
cp .claude/settings.json.backup .claude/settings.json

# 依存関係を元に戻す
git checkout package.json package-lock.json
npm install
```

## その他

### Q: コントリビュートしたい

A: 大歓迎です！[GitHub](https://github.com/yourusername/claude-code-auto-action)でPull Requestを送ってください。

### Q: バグを見つけた

A: [Issue](https://github.com/yourusername/claude-code-auto-action/issues)で報告してください。

### Q: 機能リクエストがある

A: [Discussions](https://github.com/yourusername/claude-code-auto-action/discussions)で提案してください。

## お問い合わせ

上記で解決しない場合は、以下のチャンネルでサポートを受けられます：

- GitHub Issues: バグ報告
- GitHub Discussions: 質問や議論
- Discord: リアルタイムサポート（リンクはREADMEに記載）
