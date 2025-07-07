#!/bin/bash

# タスク完了通知スクリプト
# macOSの通知音を再生し、通知を表示

# 引数からタスクの状態を取得
TASK_STATUS="${1:-completed}"
TASK_NAME="${2:-タスク}"
TASK_COUNT="${3:-1}"

# 成功音を再生（macOS標準のサウンド）
play_sound() {
    local sound_name="$1"
    osascript -e "beep" 2>/dev/null || afplay "/System/Library/Sounds/${sound_name}.aiff" 2>/dev/null
}

# 通知を表示
show_notification() {
    local title="$1"
    local message="$2"
    local sound="${3:-default}"
    
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"$sound\""
}

# タスクの状態に応じて通知
case "$TASK_STATUS" in
    "completed")
        # 成功音（Hero）
        play_sound "Hero"
        show_notification "✅ Claude Code タスク完了" "${TASK_COUNT}個のタスクが正常に完了しました" "Hero"
        ;;
    "failed")
        # エラー音（Basso）
        play_sound "Basso"
        show_notification "❌ Claude Code タスク失敗" "タスクの実行中にエラーが発生しました" "Basso"
        ;;
    "warning")
        # 警告音（Ping）
        play_sound "Ping"
        show_notification "⚠️ Claude Code 警告" "タスクは完了しましたが、警告があります" "Ping"
        ;;
    *)
        # デフォルト音（Glass）
        play_sound "Glass"
        show_notification "ℹ️ Claude Code 通知" "$TASK_NAME" "Glass"
        ;;
esac

# 音声での読み上げ（オプション）
if [ "${CLAUDE_VOICE_NOTIFICATION}" = "true" ]; then
    case "$TASK_STATUS" in
        "completed")
            say "タスクが完了しました" &
            ;;
        "failed")
            say "エラーが発生しました" &
            ;;
        "warning")
            say "警告があります" &
            ;;
    esac
fi