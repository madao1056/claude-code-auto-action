#!/bin/bash

# Claude Code自動化セットアップスクリプト

echo "🚀 Claude Code自動化設定を開始します..."

# Claude設定ディレクトリを作成
mkdir -p ~/.claude

# グローバル自動化設定を作成
cat > ~/.claude/auto-config.json << 'EOF'
{
  "autoApprove": true,
  "skipConfirmation": true,
  "interactive": false,
  "batchMode": true,
  "autoSave": true,
  "skipEditorPrompts": true,
  "autoAcceptFileChanges": true,
  "defaultResponse": "yes",
  "prompts": {
    "fileEdit": "yes",
    "bashCommand": "yes",
    "createFile": "yes",
    "saveFile": "yes",
    "proceed": "yes"
  }
}
EOF

# シェルエイリアスを設定
cat >> ~/.zshrc << 'EOF'

# Claude Code自動化エイリアス
alias claude-auto='claude-code --auto-approve --skip-confirmation --non-interactive'
alias cca='claude-code --auto-approve --skip-confirmation --non-interactive'
alias ccnew='claude-code --auto-approve --skip-confirmation --non-interactive --new-project'

# 環境変数
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SKIP_CONFIRMATION=true
export CLAUDE_NON_INTERACTIVE=true
export CLAUDE_BATCH_MODE=true
export CLAUDE_AUTO_SAVE=true
export CLAUDE_DEFAULT_RESPONSE=yes

# 自動化モード切り替え
claude-auto-on() {
  export CLAUDE_AUTO_MODE=true
  echo "✅ Claude自動化モードが有効になりました (v1.1.0)"
  echo "🧠 思考モード: think_hard (10,000 tokens) → 自動エスカレーション対応"
}

claude-auto-off() {
  unset CLAUDE_AUTO_MODE
  echo "❌ Claude自動化モードが無効になりました"
}

# デフォルトで自動化モードを有効化
claude-auto-on
EOF

# Claude CLIラッパースクリプトを作成
cat > ~/.claude/claude-wrapper.sh << 'EOF'
#!/bin/bash

# 全ての引数をClaude CLIに渡し、自動承認オプションを追加
exec claude-code \
  --auto-approve \
  --skip-confirmation \
  --non-interactive \
  --batch-mode \
  "$@"
EOF

chmod +x ~/.claude/claude-wrapper.sh

# プロジェクト作成自動化スクリプト
cat > ~/bin/claude-new-project << 'EOF'
#!/bin/bash

PROJECT_NAME=$1
DESCRIPTION=$2

if [ -z "$PROJECT_NAME" ]; then
  echo "使用方法: claude-new-project <project-name> [description]"
  exit 1
fi

echo "🎯 プロジェクト '$PROJECT_NAME' を作成中..."

# プロジェクトディレクトリを作成
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Claude設定を作成
mkdir -p .claude
cat > .claude/settings.json << SETTINGS
{
  "defaultMode": "bypassPermissions",
  "autoApprove": true,
  "skipConfirmation": true,
  "interactive": false,
  "batchMode": true
}
SETTINGS

# Claudeを起動してプロジェクトを作成
claude-code --auto-approve --skip-confirmation --non-interactive << PROMPT
Create a new ${DESCRIPTION:-project} with the following requirements:
- Modern best practices
- Comprehensive testing setup
- CI/CD configuration
- Complete documentation
- All necessary dependencies

Set up everything automatically without any prompts.
PROMPT

echo "✅ プロジェクト '$PROJECT_NAME' が作成されました！"
EOF

chmod +x ~/bin/claude-new-project

echo "✅ セットアップが完了しました！"
echo ""
echo "以下のコマンドで設定を反映してください："
echo "  source ~/.zshrc"
echo ""
echo "使用方法："
echo "  cca \"タスクの説明\"           - 自動承認モードでClaude実行"
echo "  claude-new-project myapp      - 新規プロジェクト作成（確認なし）"
echo "  claude-auto-on/off           - 自動化モードの切り替え"