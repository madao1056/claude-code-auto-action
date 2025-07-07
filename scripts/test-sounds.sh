#!/bin/bash

# 通知音のテストスクリプト

echo "🔊 Claude Code 通知音テスト"
echo "=========================="
echo ""

# 各音を順番に再生
test_sound() {
    local sound_name="$1"
    local description="$2"
    echo "▶️  $description: $sound_name"
    afplay "/System/Library/Sounds/${sound_name}.aiff" 2>/dev/null || echo "  ⚠️ 音声ファイルが見つかりません"
    sleep 1
}

echo "タスク完了時の通知音："
echo ""

test_sound "Hero" "✅ 成功音（タスク完了）"
test_sound "Basso" "❌ エラー音（タスク失敗）"
test_sound "Ping" "⚠️  警告音（警告あり）"
test_sound "Glass" "ℹ️  情報音（デフォルト）"

echo ""
echo "その他の利用可能なシステムサウンド："
echo ""

# その他のmacOSシステムサウンド
test_sound "Funk" "🎵 Funk"
test_sound "Blow" "💨 Blow"
test_sound "Bottle" "🍾 Bottle"
test_sound "Frog" "🐸 Frog"
test_sound "Morse" "📡 Morse"
test_sound "Pop" "🎈 Pop"
test_sound "Purr" "😺 Purr"
test_sound "Sosumi" "🎌 Sosumi"
test_sound "Submarine" "🚢 Submarine"
test_sound "Tink" "🔔 Tink"

echo ""
echo "音声テスト完了！"
echo ""
echo "設定ファイル（.claude/settings.json）で好きな音に変更できます："
echo '  "sounds": {'
echo '    "success": "Hero",  // または "Blow", "Glass" など'
echo '    "error": "Basso",   // または "Funk", "Sosumi" など'
echo '    "warning": "Ping",  // または "Tink", "Pop" など'
echo '    "info": "Glass"     // または "Purr", "Bottle" など'
echo '  }'