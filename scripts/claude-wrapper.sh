#!/bin/bash

# Claude Code Auto Action Wrapper
# 自動承認機能を有効にしてClaude CLIを実行

# 環境変数を設定
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SKIP_CONFIRMATION=true
export CLAUDE_NON_INTERACTIVE=true
export CLAUDE_BATCH_MODE=true
export CLAUDE_AUTO_MODE=true
export CLAUDE_DEFAULT_RESPONSE=yes

# パーミッションバイパスモードを有効化
export CLAUDE_PERMISSIONS_MODE=bypassPermissions
export CLAUDE_DANGER_BYPASS_PERMISSIONS=true

# プロジェクトホームディレクトリを設定
export CLAUDE_AUTO_ACTION_HOME="$(dirname "$(dirname "$(realpath "$0")")")"

# 設定ファイルパス
export CLAUDE_PROJECT_CONFIG="$CLAUDE_AUTO_ACTION_HOME/.claude/settings.json"
export CLAUDE_LOCAL_CONFIG="$CLAUDE_AUTO_ACTION_HOME/.claude/settings.local.json"

# オートアーキテクトフックを有効化
export CLAUDE_ENABLE_HOOKS=true
export CLAUDE_HOOK_DIR="$CLAUDE_AUTO_ACTION_HOME/hooks"

# デバッグモード（必要に応じて有効化）
# export CLAUDE_DEBUG=true

# Git自動化フックを有効化
export CLAUDE_GIT_AUTO_ENABLED=true

# 実際のClaude CLIコマンドを実行
CLAUDE_CLI="/Users/hashiguchimasaki/.nvm/versions/node/v20.19.2/bin/claude"

# 確認プロンプトの検出と通知音の再生
# Claude CLIの出力を監視して確認プロンプトを検出
if [[ " $* " =~ " --yes " ]] || [[ "$CLAUDE_AUTO_APPROVE" == "true" ]]; then
    # 自動承認モード
    exec "$CLAUDE_CLI" "$@"
else
    # インタラクティブモード：確認プロンプト時に音を鳴らす
    "$CLAUDE_CLI" "$@" 2>&1 | while IFS= read -r line; do
        echo "$line"
        # 確認プロンプトのパターンを検出
        if [[ "$line" =~ "Do you want to proceed?" ]] || \
           [[ "$line" =~ "Are you sure?" ]] || \
           [[ "$line" =~ "Confirm" ]] || \
           [[ "$line" =~ "Y/N" ]] || \
           [[ "$line" =~ "[y/n]" ]]; then
            # 通知音を再生
            node "$CLAUDE_AUTO_ACTION_HOME/hooks/confirmation-prompt-hook.js" --prompt &
        fi
    done
fi