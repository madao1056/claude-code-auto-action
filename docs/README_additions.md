# README.md への追加内容

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

## トラブルシューティング

### よくある問題と解決策

#### 1. Claude Codeが応答しない

```bash
# プロセスを確認
ps aux | grep claude

# キャッシュをクリア
rm -rf ~/.claude/cache/*

# 設定をリセット
cc-setup --reset
```

#### 2. 思考モードが機能しない

```bash
# 現在の設定を確認
cc-info

# 思考モードを手動設定
export CLAUDE_THINKING_MODE=think_hard
```

#### 3. Git自動コミットが失敗する

```bash
# Gitフックの権限を確認
ls -la .git/hooks/

# フックを再インストール
./scripts/install.sh --git-hooks
```
