#!/bin/bash

# Claude Code Auto Action - プロジェクトセットアップスクリプト
# 他のプロジェクトでこの設定を使用するためのツール

set -e

# カラーコード
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# スクリプトのディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# セットアップ関数
setup_project() {
    local target_dir="${1:-$(pwd)}"
    
    echo -e "${GREEN}Setting up Claude Code Auto Action in: $target_dir${NC}"
    
    # .claude ディレクトリを作成
    mkdir -p "$target_dir/.claude"
    
    # 設定ファイルをシンボリックリンクまたはコピー
    if [ "$2" == "--link" ]; then
        echo "Creating symbolic links..."
        ln -sf "$BASE_DIR/.claude/settings.json" "$target_dir/.claude/settings.json"
        ln -sf "$BASE_DIR/.claude/permissions.json" "$target_dir/.claude/permissions.json"
    else
        echo "Copying configuration files..."
        cp "$BASE_DIR/.claude/settings.json" "$target_dir/.claude/"
        cp "$BASE_DIR/.claude/permissions.json" "$target_dir/.claude/"
    fi
    
    # プロジェクト固有のCLAUDE.mdを作成
    if [ ! -f "$target_dir/CLAUDE.md" ]; then
        echo -e "${YELLOW}Creating CLAUDE.md...${NC}"
        cat > "$target_dir/CLAUDE.md" << 'EOF'
# PROJECT INFORMATION

## Project Name
[Your Project Name]

## Project Type
[Describe your project type]

## Technical Stack
- [List your technologies]

## Directory Structure
- `/src/` - Source code
- `/tests/` - Test files
- `/docs/` - Documentation

# DEVELOPMENT GUIDELINES

## Code Style
- Follow existing patterns in this codebase
- Use the linter configuration

## Testing
- Write tests for new features
- Maintain coverage above 80%

# USEFUL COMMANDS

- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run build` - Build project

# CLAUDE CODE SETTINGS

This project uses shared Claude Code settings from:
EOF
        echo "$BASE_DIR" >> "$target_dir/CLAUDE.md"
        echo -e "\n${GREEN}CLAUDE.md created. Please edit it with your project details.${NC}"
    fi
    
    # Git hooksのセットアップ
    if [ -d "$target_dir/.git" ]; then
        echo "Setting up git hooks..."
        mkdir -p "$target_dir/.git/hooks"
        
        # pre-commitフックを作成
        cat > "$target_dir/.git/hooks/pre-commit" << EOF
#!/bin/bash
# Claude Code Auto Action pre-commit hook

# 共有スクリプトを実行
"$BASE_DIR/scripts/claude-auto.sh" auto

# テストを実行（プロジェクトにテストがある場合）
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm test || exit 1
fi
EOF
        chmod +x "$target_dir/.git/hooks/pre-commit"
        
        # post-commitフックを作成
        cat > "$target_dir/.git/hooks/post-commit" << EOF
#!/bin/bash
# Claude Code Auto Action post-commit hook

# ログに記録
echo "[$(date)] Commit completed" >> "$BASE_DIR/logs/commits.log"
EOF
        chmod +x "$target_dir/.git/hooks/post-commit"
    fi
    
    echo -e "${GREEN}Setup completed!${NC}"
}

# エイリアスを追加する関数
add_aliases() {
    local shell_rc=""
    
    if [[ "$SHELL" == *"zsh"* ]]; then
        shell_rc="$HOME/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        shell_rc="$HOME/.bashrc"
    else
        shell_rc="$HOME/.profile"
    fi
    
    echo -e "${YELLOW}Adding project-specific aliases...${NC}"
    
    cat >> "$shell_rc" << EOF

# Claude Code Auto Action - Project Aliases
alias ccaa-setup="$SCRIPT_DIR/setup-project.sh"
alias ccaa-watch="$BASE_DIR/scripts/claude-auto.sh watch"
alias ccaa-commit="$BASE_DIR/scripts/claude-auto.sh commit"
alias ccaa-status="$BASE_DIR/scripts/claude-auto.sh status"

# プロジェクト別の設定を使用
claude-project() {
    local project_dir="\$(pwd)"
    if [ -f "\$project_dir/.claude/settings.json" ]; then
        claude --config "\$project_dir/.claude/settings.json" "\$@"
    else
        echo "No .claude/settings.json found in current directory"
        echo "Run: ccaa-setup"
    fi
}
alias ccp=claude-project
EOF
    
    echo -e "${GREEN}Aliases added. Please run: source $shell_rc${NC}"
}

# 使い方を表示
show_usage() {
    echo "Usage: setup-project.sh [options] [target_directory]"
    echo ""
    echo "Options:"
    echo "  --link      Create symbolic links instead of copying files"
    echo "  --aliases   Add shell aliases for easy access"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  # Setup in current directory"
    echo "  ./setup-project.sh"
    echo ""
    echo "  # Setup in specific directory with symlinks"
    echo "  ./setup-project.sh --link /path/to/project"
    echo ""
    echo "  # Add aliases to shell"
    echo "  ./setup-project.sh --aliases"
}

# メイン処理
case "$1" in
    --help)
        show_usage
        ;;
    --aliases)
        add_aliases
        ;;
    --link)
        setup_project "$2" --link
        ;;
    *)
        setup_project "$1"
        ;;
esac