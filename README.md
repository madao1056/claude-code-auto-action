# Claude Code Auto Action

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
  "defaultMode": "bypassPermissions",     // YOLO Modeをデフォルトに
  "contextAutoCompactThreshold": 0.9,      // 90%で自動圧縮
  "preferredModel": "sonnet",              // 実装はSonnet
  "planningModel": "opus",                 // 設計はOpus
  "costControl": {
    "dailyLimit": 8,                       // 日次上限$8
    "warningThreshold": 6,                 // $6で警告
    "autoLogoutOnLimit": true              // 上限で自動ログアウト
  },
  "hooks": {
    "post_task": "/clear",                 // タスク後に履歴クリア
    "post_run": "git add -A && git commit -m 'Claude checkpoint' || true"
  },
  "automation": {
    "auto_architect": {
      "enabled": true,                     // 階層的エージェントシステム有効化
      "parallel_agents": 10,               // 最大並列エージェント数
      "hierarchical_execution": true       // 階層的実行モード
    }
  },
  "agent_hierarchy": {
    "architect": {
      "model": "opus",                     // アーキテクトはOpusを使用
      "system_prompts": ["deep-thinking", "architecture-first"]
    },
    "managers": {
      "model": "opus",                     // マネージャーもOpusを使用
      "system_prompts": ["step-by-step", "context-aware"]
    },
    "workers": {
      "model": "sonnet",                   // ワーカーはSonnetで高速化
      "system_prompts": ["implementation-focused", "clean-code"]
    }
  },
  "deep_thinking": {
    "enabled": true,                       // Deep Thinking自動適用
    "keywords": [
      "step-by-step reasoning",
      "consider edge cases",
      "evaluate trade-offs"
    ]
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
    "deny": [
      "Bash(rm -rf /*)",
      "Edit(.env*)",
      "Write(**/*secret*)"
    ]
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

## 参考資料

- [公式仕様書](https://docs.anthropic.com/claude-code)
- [YOLO Mode詳細](https://spiess.dev/blog/how-i-use-claude-code)
- [ベストプラクティス](https://www.anthropic.com/engineering/claude-code-best-practices)

## ライセンス

MIT License

---

効率的なコーディングライフを！ 🚀