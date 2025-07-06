#!/bin/bash

# Claude Code Auto Action Installation Script

set -e

echo "Installing Claude Code Auto Action..."

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    echo "Unsupported operating system: $OSTYPE"
    exit 1
fi

# Create directories
echo "Creating directories..."
mkdir -p ~/.claude/commands
mkdir -p ~/.claude/cache
mkdir -p ~/.claude/logs
mkdir -p ~/.claude/prompts
mkdir -p ~/.claude/templates
mkdir -p ~/.claude/workspace/{architect,managers,workers,outputs}

# Copy configuration files
echo "Copying configuration files..."
cp -r .claude/* ~/.claude/ 2>/dev/null || true

# Set up environment variables
echo "Setting up environment variables..."
export CLAUDE_PERMISSIONS_MODE=bypassPermissions
export CLAUDE_COST_LIMIT_PER_DAY=8

# Copy automation environment file
echo "Installing automation environment..."
cp .claude-auto-env ~/.claude-auto-env
chmod +x ~/.claude-auto-env

# Copy Claude configuration files
echo "Installing Claude configurations..."
cp -r .claude/* ~/.claude/
chmod 644 ~/.claude/config.json
chmod 644 ~/.claude/clauderc

# Install shell integration
echo "Installing shell integration..."
cp shell-integration.sh ~/.claude/shell-integration.sh
chmod +x ~/.claude/shell-integration.sh

# Install Claude CLI if not already installed
if ! command -v claude &> /dev/null; then
    echo "Claude CLI not found. Installing..."
    if [[ "$OS" == "macos" ]]; then
        brew install claude
    else
        curl -fsSL https://claude-cli.anthropic.com/install.sh | sh
    fi
fi

# Verify Claude installation
if ! command -v claude &> /dev/null; then
    echo "Failed to install Claude CLI"
    exit 1
fi

# Install global hooks
echo "Installing Git hooks..."
if [ -d .git ]; then
    cp hooks/pre-commit .git/hooks/pre-commit
    cp hooks/post-commit .git/hooks/post-commit
    chmod +x .git/hooks/pre-commit
    chmod +x .git/hooks/post-commit
fi

# Install the VSCode/Cursor extension
echo "Building VSCode/Cursor extension..."
cd cursor-extension
npm install
npm run compile
echo "Extension built. Please install it manually in VSCode/Cursor."

# Add claude-code alias
echo "Adding claude-code alias..."
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.profile"
fi

if ! grep -q "claude-code" "$SHELL_RC"; then
    echo "" >> "$SHELL_RC"
    echo "# Claude Code Auto Action" >> "$SHELL_RC"
    echo "alias claude-code='claude --config ~/.claude/settings.json'" >> "$SHELL_RC"
    echo "alias cc-yolo='claude --dangerously-skip-permissions'" >> "$SHELL_RC"
    echo "alias cc-safe='claude --permission-mode ask'" >> "$SHELL_RC"
    echo "alias cc-architect='$(pwd)/scripts/auto-architect.sh'" >> "$SHELL_RC"
    echo "alias cc-create='$(pwd)/scripts/auto-architect.sh create'" >> "$SHELL_RC"
    echo "alias cc-new='$(pwd)/scripts/auto-create-project.sh'" >> "$SHELL_RC"
    echo "alias cc-status='$(pwd)/scripts/claude-auto.sh status'" >> "$SHELL_RC"
    echo "alias cc-watch='$(pwd)/scripts/claude-auto.sh watch'" >> "$SHELL_RC"
    echo "alias cc-commit='$(pwd)/scripts/claude-auto.sh commit'" >> "$SHELL_RC"
    echo "" >> "$SHELL_RC"
    echo "# Claude Automation Environment Variables" >> "$SHELL_RC"
    echo "export CLAUDE_AUTO_ACTION=1" >> "$SHELL_RC"
    echo "export CLAUDE_PERMISSIONS_MODE=bypassPermissions" >> "$SHELL_RC"
    echo "export CLAUDE_COST_LIMIT_PER_DAY=8" >> "$SHELL_RC"
    echo "export CLAUDE_AUTO_ARCHITECT_HOME=$(pwd)" >> "$SHELL_RC"
    echo "export CLAUDE_CONFIG_FILE=~/.claude/config.json" >> "$SHELL_RC"
    echo "export CLAUDE_RC_FILE=~/.claude/clauderc" >> "$SHELL_RC"
    echo "" >> "$SHELL_RC"
    echo "# Auto-load Claude automation environment" >> "$SHELL_RC"
    echo "[ -f ~/.claude-auto-env ] && source ~/.claude-auto-env" >> "$SHELL_RC"
    echo "" >> "$SHELL_RC"
    echo "# Load Claude shell integration" >> "$SHELL_RC"
    echo "[ -f ~/.claude/shell-integration.sh ] && source ~/.claude/shell-integration.sh" >> "$SHELL_RC"
fi

# Create CLAUDE.md if it doesn't exist
if [ ! -f "CLAUDE.md" ]; then
    echo "Creating CLAUDE.md..."
    cat > CLAUDE.md << 'EOF'
# PROJECT INFORMATION

## Project Name
Claude Code Auto Action

## Technical Stack
- TypeScript/JavaScript
- VSCode Extension API
- Shell scripting
- GitHub Actions

## Key Features
- YOLO Mode (automatic permission bypass)
- Token/context optimization
- Cost monitoring
- Auto-commit with AI messages
- Test generation

# DEVELOPMENT GUIDELINES

## Code Style
- Use TypeScript for all extension code
- Follow ESLint rules
- Prettier formatting on save

## Testing
- Minimum 90% coverage
- Unit tests for all services
- Integration tests for commands

# USEFUL COMMANDS

- `cc-yolo` - Run Claude in YOLO mode
- `claude /compact` - Compact context
- `claude /cost` - Check daily usage
- `npm test` - Run tests
- `npm run lint` - Run linter
EOF
fi

echo ""
echo "Installation complete!"
echo ""
# Run initial setup
echo "Running initial setup..."
mkdir -p logs
touch logs/cc.log
touch logs/permissions.log

# Set executable permissions
chmod +x scripts/*.sh
chmod +x hooks/*

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Restart your terminal or run: source $SHELL_RC"
echo "2. Install the VSCode/Cursor extension:"
echo "   - Open VSCode/Cursor"
echo "   - Press Cmd+Shift+P"
echo "   - Run 'Extensions: Install from VSIX'"
echo "   - Select cursor-extension/claude-code-integration-1.0.0.vsix"
echo "3. Configure your API key: export ANTHROPIC_API_KEY=YOUR_KEY"
echo "4. Test YOLO mode: cc-yolo 'What files are in this directory?'"
echo "5. Check the cost: claude /cost"
echo ""
echo "NEW! Hierarchical Agent System:"
echo "- Create complete systems: cc-create -r \"Your system requirement\""
echo "- Example: cc-create -r \"E-commerce platform with real-time inventory\""
echo "- Uses parallel sub-agents for architect, managers, and workers"
echo "- Automatic deep thinking prompts for better results"
echo ""
echo "Available commands:"
echo "- cc-architect    : Launch the hierarchical agent system"
echo "- cc-create      : Create a new system from requirements"
echo "- cc-yolo        : Run Claude in YOLO mode"
echo "- cc-safe        : Run Claude in safe mode"
echo "- cc-status      : Check current status"
echo "- cc-watch       : Watch files for changes"
echo "- cc-commit      : Auto-commit with AI message"
echo ""
echo "Security notes:"
echo "- YOLO mode is enabled by default (auto-permissions)"
echo "- Daily cost limit: $8"
echo "- Sensitive files (.env, secrets) are protected"
echo ""
echo "Happy coding with Claude! 🚀"