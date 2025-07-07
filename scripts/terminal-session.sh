#!/bin/bash

# Claude Code Terminal Session Script
# このスクリプトは新しいターミナルセッションでClaude Codeを実行し、
# 別のプロセスから操作可能な状態にします

echo "🚀 Claude Code 自動操作用ターミナルセッション"
echo "================================================"
echo ""
echo "このターミナルはClaude Codeから自動操作されます。"
echo "自動承認モードが有効になっています。"
echo ""
echo "環境変数:"
echo "  CLAUDE_AUTO_APPROVE=$CLAUDE_AUTO_APPROVE"
echo "  CLAUDE_NON_INTERACTIVE=$CLAUDE_NON_INTERACTIVE"
echo "  CLAUDE_SKIP_CONFIRMATION=$CLAUDE_SKIP_CONFIRMATION"
echo ""
echo "待機中..."
echo ""

# 名前付きパイプを作成して、外部からコマンドを受け取れるようにする
PIPE_DIR="/tmp/claude-terminal-$$"
mkdir -p "$PIPE_DIR"
COMMAND_PIPE="$PIPE_DIR/commands"
mkfifo "$COMMAND_PIPE"

echo "Command pipe created at: $COMMAND_PIPE"
echo "PID: $$"
echo ""

# クリーンアップ関数
cleanup() {
    echo "Cleaning up..."
    rm -rf "$PIPE_DIR"
    exit 0
}

trap cleanup EXIT INT TERM

# コマンドを受信して実行するループ
while true; do
    if read -r cmd < "$COMMAND_PIPE"; then
        if [ "$cmd" = "exit" ]; then
            echo "Exit command received. Shutting down..."
            break
        fi
        echo "Executing: $cmd"
        eval "$cmd"
        echo "Command completed."
        echo ""
    fi
done