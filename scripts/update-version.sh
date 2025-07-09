#!/bin/bash

# Claude Code Auto Action - Version Update Script
# This script updates the startup message to include version information

echo "🔄 Claude Code Auto Action - Version Update"
echo "=========================================="

# バージョン情報
VERSION="1.1.0"
THINKING_MODE_INFO="think_hard (10,000 tokens) → 自動エスカレーション対応"

# ~/.zshrc の Claude 設定を更新
if grep -q "claude-auto-on()" ~/.zshrc; then
    echo "📝 ~/.zshrc の起動メッセージを更新中..."
    
    # 一時ファイルを作成
    temp_file=$(mktemp)
    
    # claude-auto-on 関数を更新
    awk -v version="$VERSION" -v thinking="$THINKING_MODE_INFO" '
    /^claude-auto-on\(\)/ {
        print "claude-auto-on() {"
        print "  export CLAUDE_AUTO_MODE=true"
        print "  echo \"✅ Claude自動化モードが有効になりました (v" version ")\""
        print "  echo \"🧠 思考モード: " thinking "\""
        print "}"
        # Skip the original function body
        while (getline && $0 !~ /^}/) {}
        next
    }
    { print }
    ' ~/.zshrc > "$temp_file"
    
    # バックアップを作成
    cp ~/.zshrc ~/.zshrc.backup.$(date +%Y%m%d_%H%M%S)
    
    # 更新を適用
    mv "$temp_file" ~/.zshrc
    
    echo "✅ 起動メッセージを更新しました！"
    echo ""
    echo "📌 新しい起動メッセージ:"
    echo "   ✅ Claude自動化モードが有効になりました (v$VERSION)"
    echo "   🧠 思考モード: $THINKING_MODE_INFO"
    echo ""
    echo "🔄 変更を反映するには、新しいターミナルを開くか以下を実行してください:"
    echo "   source ~/.zshrc"
else
    echo "⚠️  Claude自動化設定が見つかりません"
    echo "   まず ./scripts/setup-auto.sh を実行してください"
fi

echo ""
echo "📋 v$VERSION の新機能:"
echo "   - デフォルト思考モード: think_hard (10,000 tokens)"
echo "   - 2回以上の修正で自動的に ultrathink モードに昇格"
echo "   - コンテキスト認識による最適な思考モード選択"