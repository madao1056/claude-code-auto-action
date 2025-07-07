#!/bin/bash

echo "🎵 Claude Code 選択した通知音"
echo "============================="
echo ""

play_sound() {
    local sound="$1"
    local label="$2"
    echo "▶️  $label"
    afplay "/System/Library/Sounds/${sound}.aiff"
    sleep 1.5
}

echo "設定した通知音："
echo ""

play_sound "Blow" "✅ タスク完了音 (Blow) - 軽快で爽やかな完了音"
play_sound "Basso" "❌ エラー音 (Basso) - 低音の警告音"
play_sound "Tink" "⚠️  警告音 (Tink) - 軽い注意喚起音"
play_sound "Pop" "ℹ️  情報音 (Pop) - ポップで親しみやすい通知音"

echo ""
echo "✨ 設定完了！これらの音で通知されます。"