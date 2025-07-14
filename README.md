# Claude Code Auto Action

**Version 1.1.0** - [バージョン履歴](VERSION_HISTORY.md)

**クリック地獄とトークン爆食いを同時に撲滅** - Claude Codeの権限確認を自動化し、コンテキスト使用を最適化する統合システム

## 主要機能

### 🚀 YOLO Mode (権限自動承認)

- `--dangerously-skip-permissions` フラグで全権限を自動承認
- Allow/Denyリストによる細かい制御
- Git checkpoint自動作成で安全性確保

### 💰 トークン最適化

- コンテキスト90%で自動圧縮
- 日次コスト上限設定（デフォルト$8）
- Sonnet/Opus自動切り替えで費用削減

### 🤖 自動化機能

- **Auto-commit** - AIが適切なコミットメッセージを生成
- **Auto-format** - 保存時に自動整形
- **Auto-test** - コミット前に自動テスト実行
- **Auto-optimize** - importの自動整理
- **Auto-edit** - Cursorの「Do you want to make this edit?」ダイアログを自動確認

### 🧠 思考モードシステム (v1.1.0 NEW!)

- **Default Mode: think_hard (10,000 tokens)** - 全タスクで高品質な思考
- **Auto-escalation** - 2回以上の修正で自動的に ultrathink (31,999 tokens) に昇格
- **Context-aware** - タスクの種類に応じた最適な思考モード選択
- **4段階の思考レベル**: think → think_hard → think_harder → ultrathink

### 🏗️ 階層的エージェントシステム (NEW!)

- **Auto-architect** - 「〇〇するシステムを作りたい」という要求から完全なシステムを自動生成
- **3層構造のエージェント階層**:
  - **Architect (トップ層)** - システム設計とタスク分解
  - **Managers (中間層)** - 各分野の管理と指示 (Frontend/Backend/DB/DevOps/Testing)
  - **Workers (実行層)** - 実際のコード生成とファイル作成
- **最大10並列エージェント** - 高速な開発を実現
- **Deep Thinking自動適用** - step-by-step reasoning、edge cases考慮、trade-off評価を自動実行

### 🎨 IDE統合

- VSCode/Cursor拡張機能
- ステータスバーでYOLOモード表示
- キーボードショートカット対応

## Quick Start

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/claude-code-auto-action.git
cd claude-code-auto-action

# インストールスクリプトを実行
./scripts/install.sh

# APIキーを設定
export ANTHROPIC_API_KEY=YOUR_KEY

# YOLO Modeをテスト
cc-yolo "このディレクトリのファイルを教えて"
```

### 基本的な使い方

#### YOLO Mode (権限自動承認)

```bash
# エイリアスで簡単実行
cc-yolo "package.jsonの依存関係を最新版に更新して"

# 通常のClaudeコマンドでも可能
claude --dangerously-skip-permissions "バグを修正して"

# 安全モードに戻す
cc-safe "重要なファイルを編集する"
```

#### 自動化コマンド

```bash
# ファイル監視と自動コミット
scripts/claude-auto.sh watch

# 手動で自動コミット
scripts/claude-auto.sh commit

# コスト確認
scripts/claude-auto.sh cost

# コンテキスト圧縮
scripts/claude-auto.sh compact

# 現在の状態確認
scripts/claude-auto.sh status

# Cursor自動編集ハンドラを開始
cc-edit-start

# YOLO mode for edits
cc-edit-yolo
```

#### 階層的エージェントシステム (Auto-architect)

```bash
# システムを要件から自動生成
cc-create -r "タスク管理システムを作りたい。リアルタイム更新機能付き"

# より詳細な指定も可能
cc-create -r "ECサイトを作りたい" -t web -s "node,typescript,postgres,redis"

# 実行例
cc-create -r "REST APIを作りたい。ユーザー認証とファイルアップロード機能付き"
# → 以下が自動生成されます:
#   - システムアーキテクチャ設計書
#   - ソースコード (Frontend/Backend/DB)
#   - テストコード (単体/統合/E2E)
#   - ドキュメント (README, API仕様書)
#   - CI/CD設定 (GitHub Actions)
#   - Docker構成
#   - 環境変数テンプレート
```

階層的エージェントシステムは以下のフェーズで動作します:

1. **分析フェーズ** (5-10分) - Architectが要件を分析し、システム設計を作成
2. **計画フェーズ** (10-15分) - 5つのManagerが並列で実装計画を策定
3. **実装フェーズ** (30-60分) - 最大10のWorkerが並列でコード生成
4. **統合フェーズ** (10-15分) - 最終的な統合とドキュメント生成

#### 既存プロジェクトの改良 (NEW!)

```bash
# プロジェクトを分析して改善点を発見
cc-architect analyze

# 分析結果:
# - コード品質スコア: B+
# - セキュリティ脆弱性: 3件
# - パフォーマンス改善余地: 5箇所
# - 技術的負債: 中程度

# 新機能を既存プロジェクトに追加
cc-architect upgrade -r "WebSocket通知機能を追加"

# パフォーマンス最適化
cc-architect upgrade -r "ページ速度を50%改善" -t optimize

# セキュリティ強化
cc-architect upgrade -r "OWASP Top 10対策" -t security

# アーキテクチャ改善
cc-architect upgrade -r "マイクロサービス化" -t refactor
```

**既存プロジェクト改良の特徴:**

- 🔍 **自動分析** - コード品質、セキュリティ、パフォーマンスを総合評価
- 🔧 **スマート改良** - 既存コードを壊さずに機能追加・最適化
- 📊 **詳細レポート** - 改善提案を優先順位付きで提示
- ⚡ **段階的実行** - 大規模変更も安全に実施

## Cursor自動編集機能 🆕

### 概要

Cursorの編集確認ダイアログ（「Do you want to make this edit to line.ts?」など）を自動的に処理し、開発フローを中断させません。

### 使い方

```bash
# 自動編集ハンドラを開始
cursor-auto-edit start
# または
cc-edit-start

# YOLOモードで全ての確認を自動化
cursor-auto-edit yolo
# または
cc-edit-yolo

# ステータス確認
cursor-auto-edit status

# 停止
cursor-auto-edit stop
```

### 実装方式

1. **Direct Edit Mode** - ファイルを直接書き換えて確認ダイアログを回避
2. **AppleScript Handler** - macOSでダイアログボタンを自動クリック
3. **Python Auto-Save Daemon** - ファイル変更を監視して自動保存
4. **Auto-Response Patterns** - ダイアログテキストをパターンマッチして自動応答

## VSCode/Cursor統合

### 拡張機能のインストール

1. VSCode/Cursorを開く
2. コマンドパレット（`Cmd+Shift+P`）を開く
3. "Extensions: Install from VSIX..." を実行
4. `cursor-extension/` でビルドしたVSIXファイルを選択

### 主な機能

- **ステータスバー** - YOLO/Safeモードの切り替え表示
- **コマンドパレット** - すべてのClaude機能にアクセス
- **自動実行** - 保存時のformat/lint/test
- **コスト監視** - リアルタイムで使用量を表示

### キーボードショートカット

- `Cmd+Shift+A` - Claudeに質問
- `Cmd+Shift+C` - 自動コミット
- `Cmd+Shift+Y` - YOLOモード切替
- 右クリックメニューからも利用可能

## 設定

### .claude/settings.json

```json
{
  "defaultMode": "bypassPermissions", // YOLO Modeをデフォルトに
  "contextAutoCompactThreshold": 0.9, // 90%で自動圧縮
  "preferredModel": "sonnet", // 実装はSonnet
  "planningModel": "opus", // 設計はOpus
  "costControl": {
    "dailyLimit": 8, // 日次上限$8
    "warningThreshold": 6, // $6で警告
    "autoLogoutOnLimit": true // 上限で自動ログアウト
  },
  "hooks": {
    "post_task": "/clear", // タスク後に履歴クリア
    "post_run": "git add -A && git commit -m 'Claude checkpoint' || true"
  },
  "automation": {
    "auto_architect": {
      "enabled": true, // 階層的エージェントシステム有効化
      "parallel_agents": 10, // 最大並列エージェント数
      "hierarchical_execution": true // 階層的実行モード
    },
    "auto_edit": {
      "enabled": true, // 自動編集確認有効化
      "yolo_mode": false, // YOLOモード（全自動確認）
      "save_delay": 1.0 // 自動保存の遅延（秒）
    }
  },
  "agent_hierarchy": {
    "architect": {
      "model": "opus", // アーキテクトはOpusを使用
      "system_prompts": ["deep-thinking", "architecture-first"]
    },
    "managers": {
      "model": "opus", // マネージャーもOpusを使用
      "system_prompts": ["step-by-step", "context-aware"]
    },
    "workers": {
      "model": "sonnet", // ワーカーはSonnetで高速化
      "system_prompts": ["implementation-focused", "clean-code"]
    }
  },
  "deep_thinking": {
    "enabled": true, // Deep Thinking自動適用
    "keywords": ["step-by-step reasoning", "consider edge cases", "evaluate trade-offs"]
  }
}
```

### 環境変数

```bash
# .zshrc/.bashrcに追加
export CLAUDE_PERMISSIONS_MODE=bypassPermissions  # YOLO Mode有効化
export CLAUDE_COST_LIMIT_PER_DAY=8              # 日次コスト上限
export ANTHROPIC_API_KEY=your_key_here           # APIキー
```

## セキュリティ

### .claude/permissions.json

```json
{
  "mode": "bypassPermissions",
  "rules": {
    "allow": ["npm*", "git*", "Edit(**)", "Write(**)"],
    "deny": ["Bash(rm -rf /*)", "Edit(.env*)", "Write(**/*secret*)"]
  }
}
```

### 安全対策

1. **Denyリスト** - 危険なコマンドは自動でブロック
2. **Git checkpoint** - 自動でコミット作成
3. **監査ログ** - すべての操作を記録
4. **Docker隔離** - 本番環境では必須

## トラブルシューティング

### よくある問題

1. **権限エラーが出る**

   ```bash
   export CLAUDE_PERMISSIONS_MODE=bypassPermissions
   ```

2. **コスト上限に達した**

   ```bash
   claude /clear  # 履歴をクリア
   claude /compact summary=dot_points  # コンテキスト圧縮
   ```

3. **拡張機能が動かない**
   - VSCode再起動
   - `npm run compile` でリビルド

## 🆕 高度な自動化機能 (v1.2.0)

### 自動エラー修正システム

- **TypeScript型エラー**の自動解決
- **ESLint/Prettier**エラーの自動修正
- **ビルドエラー**の検知と修正
- 思考モードの自動エスカレーション（2回失敗でultrathink）

### 依存関係の自動管理

```bash
claude-code auto-deps analyze   # 依存関係を分析
claude-code auto-deps install   # 不足パッケージを自動インストール
claude-code auto-deps clean     # 未使用パッケージを削除
claude-code auto-deps fix       # 脆弱性を修正
```

### 自動リファクタリング

- 重複コードの検出と共通化
- 長いメソッドの分割提案
- 複雑な条件式の簡略化
- デッドコードの削除
- インポートの最適化

### 自動ドキュメント生成

```bash
claude-code generate-docs       # すべてのドキュメントを生成
# 生成されるドキュメント:
# - API仕様書 (OpenAPI形式)
# - JSDocコメント
# - README.md更新
# - CHANGELOG.md
```

### テストカバレッジ自動改善

- カバレッジ不足箇所の検出
- テストケースの自動生成
- 失敗テストの自動修正
- E2Eテストの生成

### PR/コードレビュー自動化

```bash
claude-code create-pr --auto-review    # PR作成とレビュー
claude-code handle-review-comments     # レビューコメントへの自動対応
```

### 環境構築の完全自動化

```bash
claude-code setup-env --auto-detect
# 自動検出・生成:
# - プロジェクトタイプ（Node.js, Python, Ruby, Go等）
# - Dockerfile
# - docker-compose.yml
# - CI/CDパイプライン
# - 環境変数設定
# - データベース構成
```

### 学習型コード補完

- 個人のコーディングパターンを学習
- チーム規約の自動適用
- よく使うコードスニペットの提案
- コーディングスタイルの自動検出

### 自動バージョン管理

```bash
claude-code version --auto      # Conventional Commitsに基づく自動バージョニング
claude-code release            # リリースノートとタグの自動生成
```

### 監視・アラート統合

- パフォーマンス回帰の自動検知
- バンドルサイズ増加の警告
- セキュリティ脆弱性の即時通知
- システムリソース監視（CPU、メモリ、ディスク）

## 📋 重要な設定ポイント

### 学習システムの設定

```json
{
  "approvalLearning": {
    "enabled": true,
    "autoUpdate": true,
    "updateInterval": 3600, // 1時間ごとに学習更新
    "minUsageCountForAutoApproval": 3 // 3回使用で自動承認
  }
}
```

### 自動化の優先順位設定

```json
{
  "automation": {
    "priorities": {
      "errorFix": "high", // エラー修正を最優先
      "security": "high", // セキュリティも高優先度
      "performance": "medium", // パフォーマンスは中優先度
      "style": "low" // スタイル修正は低優先度
    }
  }
}
```

## 📚 ドキュメント

- **[できることカタログ](./docs/FEATURES.md)** - Claude Code Auto Actionでできることの完全ガイド 🌟
- [アーキテクチャ](./docs/ARCHITECTURE.md) - システム構成と設計思想
- [自動化機能詳細](./docs/AUTOMATION.md) - 各自動化機能の詳細説明
- [学習システム仕様](./docs/LEARNING_SYSTEM.md) - 学習システムの技術仕様
- [移行ガイド](./docs/MIGRATION_GUIDE.md) - v1.2.0への移行手順
- [統合ガイド](./docs/INTEGRATION.md) - 他システムとの連携方法
- [FAQ](./docs/FAQ.md) - よくある質問
- [変更履歴](./CHANGELOG.md) - バージョンごとの変更内容

## 🔧 メンテナンスコマンド

```bash
# 学習データのエクスポート/インポート
./scripts/auto-learning-update.sh --export
./scripts/auto-learning-update.sh --import backup.json

# システム状態の確認
claude-code system-status       # 全システムの状態確認
claude-code monitor report      # 監視レポート生成

# キャッシュとログのクリーンアップ
claude-code cleanup --all       # 全データクリーンアップ
claude-code cleanup --logs      # ログのみクリーンアップ
```

## 📊 パフォーマンス最適化のヒント

1. **並列処理の活用**
   - `parallel_agents: 10` で最大10エージェント並列実行
   - 大規模プロジェクトでは並列数を調整

2. **モデル選択の最適化**
   - 設計・計画: Opus（高品質）
   - 実装・コーディング: Sonnet（高速）
   - 簡単なタスク: Haiku（最速）

3. **コンテキスト管理**
   - 90%で自動圧縮が発動
   - 定期的な `/clear` でメモリ解放
   - 不要なファイルは `.claudeignore` に追加

## 🚨 トラブルシューティング（追加）

### 自動化が動作しない

```bash
# 権限を確認
cat .claude/permissions.json

# ログを確認
tail -f .claude/logs/automation.log

# プロセスを再起動
claude-code restart-services
```

### 学習データが反映されない

```bash
# 学習データを手動更新
./scripts/auto-learning-update.sh --force

# 統計情報を確認
node src/autofix/approval-interceptor.js --stats
```

### ビルドエラーが続く

```bash
# TypeScriptの型チェック
npm run typecheck

# 依存関係の整合性確認
npm ls

# キャッシュクリア
rm -rf node_modules package-lock.json
npm install
```

## 🔗 関連リンク

### 外部リソース

- [公式仕様書](https://docs.anthropic.com/claude-code)
- [YOLO Mode詳細](https://spiess.dev/blog/how-i-use-claude-code)
- [ベストプラクティス](https://www.anthropic.com/engineering/claude-code-best-practices)

### プロジェクトリソース

- [GitHub リポジトリ](https://github.com/yourusername/claude-code-auto-action)
- [Issue トラッカー](https://github.com/yourusername/claude-code-auto-action/issues)
- [ディスカッション](https://github.com/yourusername/claude-code-auto-action/discussions)

## Shell設定 (.zshrc)

プロジェクトを最大限活用するために、以下の設定を`.zshrc`に追加することを推奨します：

### 基本設定

```bash
# Claude Code Auto Action基本パス
export CLAUDE_AUTO_ACTION_HOME="/Users/hashiguchimasaki/project/claude-code-auto-action"

# グローバル設定
export CLAUDE_GLOBAL_CONFIG="$HOME/.claude/global-settings.json"
export CLAUDE_PERMISSIONS_MODE=bypassPermissions
export CLAUDE_COST_LIMIT_PER_DAY=8

# プロジェクトディレクトリの自動検出
claude_auto_detect() {
    local current_dir=$(pwd)
    if [[ "$current_dir" == /Users/hashiguchimasaki/project/* ]]; then
        export CLAUDE_PROJECT_MODE="auto"
        if [ -f ".claude/settings.json" ]; then
            export CLAUDE_PROJECT_CONFIG="$(pwd)/.claude/settings.json"
        fi
    fi
}
```

### 便利なエイリアス

```bash
# 基本コマンド
alias cc='claude --config ${CLAUDE_PROJECT_CONFIG:-~/.claude/global-settings.json}'
alias cc-yolo='claude --dangerously-skip-permissions'

# 思考モード別
alias cc-think='claude --thinking-mode think'
alias cc-hard='claude --thinking-mode think_hard'
alias cc-harder='claude --thinking-mode think_harder'
alias cc-ultra='claude --thinking-mode ultrathink'

# プロジェクト管理
alias cc-status="$CLAUDE_AUTO_ACTION_HOME/scripts/claude-auto.sh status"
alias cc-watch="$CLAUDE_AUTO_ACTION_HOME/scripts/claude-auto.sh watch"
alias cc-commit="$CLAUDE_AUTO_ACTION_HOME/scripts/claude-auto.sh commit"

# ウェブ制作特化
alias cc-web='cc "ウェブ制作プロジェクトの自動化タスクを実行"'
alias cc-report='cc "クライアントレポートを生成"'
alias cc-monitor='cc "ウェブサイト監視状況をチェック"'
```

## セキュリティベストプラクティス

### APIキー管理

```bash
# ❌ 悪い例: .zshrcに直接記載
export OPENAI_API_KEY=sk-proj-xxxxx

# ✅ 良い例: 環境変数ファイルを使用
source ~/.env_private  # APIキーは別ファイルで管理
```

### 権限設定

1. `/Users/hashiguchimasaki/project`配下のみ自動権限を有効化
2. それ以外のディレクトリでは確認モード
3. 破壊的操作には必ず確認を要求

## よくある問題と解決策

### 1. Claude Codeが応答しない

```bash
# プロセスを確認
ps aux | grep claude

# キャッシュをクリア
rm -rf ~/.claude/cache/*

# 設定をリセット
cc-setup --reset
```

### 2. 思考モードが機能しない

```bash
# 現在の設定を確認
cc-info

# 思考モードを手動設定
export CLAUDE_THINKING_MODE=think_hard
```

### 3. Git自動コミットが失敗する

```bash
# Gitフックの権限を確認
ls -la .git/hooks/

# フックを再インストール
./scripts/install.sh --git-hooks
```

## ライセンス

MIT License

---

効率的なコーディングライフを！ 🚀
