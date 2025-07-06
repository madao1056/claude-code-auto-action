#!/bin/bash

# Claude Code Auto Action - グローバル設定スクリプト
# /Users/hashiguchimasaki/project 配下のすべてのプロジェクトで自動権限を有効化

set -e

# カラーコード
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Claude Code Auto Action Global Setup ===${NC}"
echo ""

# 必要なディレクトリを作成
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p ~/.claude/logs
mkdir -p ~/.claude/commands
mkdir -p ~/.claude/cache

# グローバル設定が存在することを確認
if [ ! -f ~/.claude/global-settings.json ]; then
    echo -e "${RED}Error: Global settings file not found${NC}"
    exit 1
fi

# シェル設定を更新
SHELL_RC=""
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.profile"
fi

echo -e "${YELLOW}Updating shell configuration...${NC}"

# 既存の設定をバックアップ
cp "$SHELL_RC" "$SHELL_RC.backup.$(date +%Y%m%d_%H%M%S)"

# Claude Code Auto Action の設定を追加
if ! grep -q "CLAUDE_CODE_AUTO_ACTION_GLOBAL" "$SHELL_RC"; then
    cat >> "$SHELL_RC" << 'EOF'

# ===== CLAUDE_CODE_AUTO_ACTION_GLOBAL =====
# Claude Code Auto Action - Global Configuration

# グローバル設定パス
export CLAUDE_GLOBAL_CONFIG="$HOME/.claude/global-settings.json"
export CLAUDE_AUTO_ACTION_HOME="/Users/hashiguchimasaki/project/claude-code-auto-action"

# デフォルトでYOLO Mode有効化（/Users/hashiguchimasaki/project 配下のみ）
export CLAUDE_PERMISSIONS_MODE=bypassPermissions
export CLAUDE_COST_LIMIT_PER_DAY=8

# プロジェクトディレクトリの自動検出関数
claude_auto_detect() {
    local current_dir=$(pwd)
    # /Users/hashiguchimasaki/project 配下にいる場合
    if [[ "$current_dir" == /Users/hashiguchimasaki/project/* ]]; then
        export CLAUDE_PROJECT_MODE="auto"
        # プロジェクト固有の設定があれば読み込む
        if [ -f ".claude/settings.json" ]; then
            export CLAUDE_PROJECT_CONFIG="$(pwd)/.claude/settings.json"
        else
            export CLAUDE_PROJECT_CONFIG="$CLAUDE_GLOBAL_CONFIG"
        fi
    else
        export CLAUDE_PROJECT_MODE="manual"
        unset CLAUDE_PROJECT_CONFIG
    fi
}

# ディレクトリ移動時に自動検出
if [[ "$SHELL" == *"zsh"* ]]; then
    autoload -U add-zsh-hook
    add-zsh-hook chpwd claude_auto_detect
else
    PROMPT_COMMAND="claude_auto_detect; $PROMPT_COMMAND"
fi

# 初回実行
claude_auto_detect

# グローバルエイリアス
alias claude="claude"
alias cc="claude"
alias cc-yolo="claude --dangerously-skip-permissions"
alias cc-safe="claude --permission-mode ask"
alias cc-status="$CLAUDE_AUTO_ACTION_HOME/scripts/claude-auto.sh status"
alias cc-watch="$CLAUDE_AUTO_ACTION_HOME/scripts/claude-auto.sh watch"
alias cc-commit="$CLAUDE_AUTO_ACTION_HOME/scripts/claude-auto.sh commit"
alias cc-cost="$CLAUDE_AUTO_ACTION_HOME/scripts/claude-auto.sh cost"
alias cc-compact="claude /compact summary=dot_points"
alias cc-clear="claude /clear"

# プロジェクト設定関数
cc-setup() {
    if [[ "$(pwd)" == /Users/hashiguchimasaki/project/* ]]; then
        echo "Setting up Claude Code for $(pwd)..."
        "$CLAUDE_AUTO_ACTION_HOME/scripts/setup-project.sh" "$@"
    else
        echo "Warning: Not in /Users/hashiguchimasaki/project directory"
        echo "Manual setup required. Use: $CLAUDE_AUTO_ACTION_HOME/scripts/setup-project.sh"
    fi
}

# 状態確認関数
cc-info() {
    echo "Claude Code Auto Action - Status"
    echo "================================"
    echo "Current Directory: $(pwd)"
    echo "Project Mode: ${CLAUDE_PROJECT_MODE:-unknown}"
    echo "Config File: ${CLAUDE_PROJECT_CONFIG:-$CLAUDE_GLOBAL_CONFIG}"
    echo "Permissions Mode: ${CLAUDE_PERMISSIONS_MODE:-ask}"
    echo "Daily Limit: \$${CLAUDE_COST_LIMIT_PER_DAY:-8}"
    
    if [[ "$(pwd)" == /Users/hashiguchimasaki/project/* ]]; then
        echo -e "\n✅ Auto-permissions ENABLED for this directory"
    else
        echo -e "\n⚠️  Auto-permissions DISABLED (not in project directory)"
    fi
}

# ===== END CLAUDE_CODE_AUTO_ACTION_GLOBAL =====
EOF
fi

# VSCode/Cursor のユーザー設定を更新
echo -e "${YELLOW}Updating VSCode/Cursor settings...${NC}"

VSCODE_SETTINGS_DIR="$HOME/Library/Application Support/Code/User"
CURSOR_SETTINGS_DIR="$HOME/Library/Application Support/Cursor/User"

for SETTINGS_DIR in "$VSCODE_SETTINGS_DIR" "$CURSOR_SETTINGS_DIR"; do
    if [ -d "$SETTINGS_DIR" ]; then
        SETTINGS_FILE="$SETTINGS_DIR/settings.json"
        
        # settings.json が存在しない場合は作成
        if [ ! -f "$SETTINGS_FILE" ]; then
            echo "{}" > "$SETTINGS_FILE"
        fi
        
        # バックアップを作成
        cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Claude Code の設定を追加（jq を使用）
        if command -v jq &> /dev/null; then
            jq '. + {
                "claude.globalConfigPath": "~/.claude/global-settings.json",
                "claude.autoDetectProject": true,
                "claude.projectBasePath": "/Users/hashiguchimasaki/project",
                "claude.defaultPermissionMode": "bypassPermissions",
                "terminal.integrated.env.osx": {
                    "CLAUDE_PERMISSIONS_MODE": "bypassPermissions",
                    "CLAUDE_GLOBAL_CONFIG": "~/.claude/global-settings.json"
                }
            }' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
            
            echo -e "${GREEN}Updated $(basename $(dirname "$SETTINGS_DIR")) settings${NC}"
        else
            echo -e "${YELLOW}Warning: jq not found. Please manually update $SETTINGS_FILE${NC}"
        fi
    fi
done

# Git のグローバル設定を追加
echo -e "${YELLOW}Configuring Git hooks...${NC}"

# グローバル Git hooks ディレクトリを作成
mkdir -p ~/.git-templates/hooks

# pre-commit フックを作成
cat > ~/.git-templates/hooks/pre-commit << 'EOF'
#!/bin/bash
# Claude Code Auto Action - Global pre-commit hook

# プロジェクトディレクトリ内かチェック
if [[ "$(pwd)" == /Users/hashiguchimasaki/project/* ]]; then
    # Claude Code の自動化スクリプトを実行
    if [ -x "/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/claude-auto.sh" ]; then
        /Users/hashiguchimasaki/project/claude-code-auto-action/scripts/claude-auto.sh auto
    fi
fi

# プロジェクト固有の pre-commit フックがあれば実行
if [ -x ".git/hooks/pre-commit.local" ]; then
    .git/hooks/pre-commit.local
fi
EOF

chmod +x ~/.git-templates/hooks/pre-commit

# Git テンプレートディレクトリを設定
git config --global init.templatedir '~/.git-templates'

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo -e "${BLUE}次のステップ:${NC}"
echo "1. ターミナルを再起動するか、以下を実行:"
echo "   source $SHELL_RC"
echo ""
echo "2. 設定を確認:"
echo "   cc-info"
echo ""
echo "3. プロジェクトディレクトリで作業開始:"
echo "   cd /Users/hashiguchimasaki/project/your-project"
echo "   cc \"このプロジェクトのREADMEを作成して\""
echo ""
echo -e "${GREEN}✨ /Users/hashiguchimasaki/project 配下のすべてのプロジェクトで"
echo -e "   Claude Code の権限が自動的に許可されるようになりました！${NC}"
echo ""
echo -e "${YELLOW}⚠️  注意: この設定は /Users/hashiguchimasaki/project 配下でのみ有効です${NC}"