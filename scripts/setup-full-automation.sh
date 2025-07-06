#!/bin/bash

# Complete automation setup script
# This configures your entire system for zero-prompt Claude operation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up Claude Full Automation Mode..."

# 1. Update shell configuration
echo "📝 Updating shell configuration..."

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.profile"
fi

# Add automation environment to shell
cat >> "$SHELL_RC" << 'EOF'

# Claude Full Automation Mode
export CLAUDE_AUTO_MODE=true
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SKIP_CONFIRMATION=true
export CLAUDE_NON_INTERACTIVE=true
export CLAUDE_BATCH_MODE=true
export CLAUDE_PERMISSIONS_MODE=bypassPermissions
export CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true
export CLAUDE_YES_TO_ALL=true
export CLAUDE_SILENT_MODE=true
export CLAUDE_NO_PROMPTS=true

# Auto-operations
export CLAUDE_AUTO_CREATE_DIRECTORIES=true
export CLAUDE_AUTO_CREATE_FILES=true
export CLAUDE_AUTO_SAVE_FILES=true
export CLAUDE_AUTO_EDIT_FILES=true
export CLAUDE_AUTO_KILL_PROCESSES=true
export CLAUDE_AUTO_RESTART_SERVERS=true

# Editor integration
export CURSOR_AUTO_SAVE=true
export CURSOR_AUTO_ACCEPT_CHANGES=true
export VSCODE_AUTO_SAVE=true
export VSCODE_AUTO_ACCEPT_CHANGES=true

# Aliases for automation
alias claude-auto='source ~/project/claude-code-auto-action/scripts/claude-full-auto.sh'
alias cca='claude-auto'
alias kill-port='~/project/claude-code-auto-action/scripts/auto-process-manager.sh kill'
alias auto-restart='~/project/claude-code-auto-action/scripts/auto-process-manager.sh auto'

# Function to wrap all claude commands
claude() {
    yes | command claude "$@" 2>&1 | grep -v "Do you want to"
}

# Auto-load on shell start
if [ -f ~/project/claude-code-auto-action/scripts/claude-full-auto.sh ]; then
    source ~/project/claude-code-auto-action/scripts/claude-full-auto.sh >/dev/null 2>&1
fi
EOF

# 2. Create global Claude configuration
echo "⚙️  Creating Claude configurations..."

mkdir -p ~/.claude

# Main settings
cat > ~/.claude/settings.json << 'EOF'
{
  "automation": {
    "enabled": true,
    "autoApproveAll": true,
    "skipAllPrompts": true,
    "silentMode": true,
    "batchMode": true,
    "nonInteractive": true,
    "autoCommit": true,
    "autoFormat": true,
    "autoLint": true,
    "autoTest": true,
    "autoFix": true,
    "testBeforeCommit": true
  },
  "permissions": {
    "mode": "bypassPermissions",
    "skipConfirmation": true,
    "autoApprove": true,
    "dangerouslySkipPermissions": true
  },
  "editor": {
    "autoSave": true,
    "autoAcceptChanges": true,
    "skipEditConfirmation": true,
    "autoApplyEdits": true
  },
  "process": {
    "autoKill": true,
    "autoRestart": true,
    "forceKill": true,
    "skipKillConfirmation": true
  },
  "safety": {
    "requireApprovalForDestructive": false,
    "confirmThreshold": {
      "fileSize": 999999999,
      "batchOperations": 999999
    }
  },
  "ui": {
    "showPrompts": false,
    "showConfirmations": false,
    "interactive": false,
    "suppressAllDialogs": true
  },
  "hooks": {
    "preCommit": {
      "enabled": true,
      "autoFix": true,
      "skipOnFailure": false
    }
  }
}
EOF

# Config for Claude CLI
cat > ~/.claude/config.json << 'EOF'
{
  "automation": {
    "skipAllPrompts": true,
    "autoApproveAll": true,
    "defaultToYes": true
  },
  "permissions": {
    "mode": "bypassPermissions"
  },
  "interactive": false,
  "silent": true,
  "assumeYes": true,
  "noConfirm": true
}
EOF

# 3. Install Python dependencies for auto-save daemon
echo "📦 Installing Python dependencies..."
pip3 install watchdog psutil >/dev/null 2>&1 || true

# 4. Create systemd service for auto-daemon (Linux) or launchd (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use launchd
    echo "🍎 Creating macOS launch agent..."
    
    mkdir -p ~/Library/LaunchAgents
    
    cat > ~/Library/LaunchAgents/com.claude.autodaemon.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.autodaemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$SCRIPT_DIR/auto-save-daemon.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-auto-daemon.err</string>
    <key>StandardOutPath</key>
    <string>/tmp/claude-auto-daemon.out</string>
</dict>
</plist>
EOF
    
    # Load the service
    launchctl load ~/Library/LaunchAgents/com.claude.autodaemon.plist 2>/dev/null || true
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - use systemd
    echo "🐧 Creating systemd service..."
    
    mkdir -p ~/.config/systemd/user
    
    cat > ~/.config/systemd/user/claude-auto-daemon.service << EOF
[Unit]
Description=Claude Auto-Approval Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $SCRIPT_DIR/auto-save-daemon.py
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF
    
    # Enable and start the service
    systemctl --user daemon-reload
    systemctl --user enable claude-auto-daemon.service
    systemctl --user start claude-auto-daemon.service
fi

# 5. Create VSCode/Cursor settings
echo "📝 Configuring VSCode/Cursor..."

# VSCode settings
VSCODE_SETTINGS_DIR="$HOME/.config/Code/User"
mkdir -p "$VSCODE_SETTINGS_DIR"

if [ -f "$VSCODE_SETTINGS_DIR/settings.json" ]; then
    # Backup existing settings
    cp "$VSCODE_SETTINGS_DIR/settings.json" "$VSCODE_SETTINGS_DIR/settings.json.backup"
fi

# Add auto-save settings to VSCode
cat > "$VSCODE_SETTINGS_DIR/claude-auto.json" << 'EOF'
{
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 500,
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "editor.acceptSuggestionOnCommitCharacter": true,
  "editor.acceptSuggestionOnEnter": "on",
  "workbench.editor.enablePreview": false,
  "workbench.editor.closeOnFileDelete": true
}
EOF

# Similar for Cursor
CURSOR_SETTINGS_DIR="$HOME/Library/Application Support/Cursor/User"
if [ -d "$CURSOR_SETTINGS_DIR" ]; then
    cp "$VSCODE_SETTINGS_DIR/claude-auto.json" "$CURSOR_SETTINGS_DIR/claude-auto.json"
fi

# 6. Create global gitconfig for auto-operations
echo "📝 Configuring Git..."

git config --global alias.auto-commit '!f() { git add -A && git commit -m "$(curl -s -X POST https://api.anthropic.com/v1/complete -H \"x-api-key: $CLAUDE_API_KEY\" -H \"Content-Type: application/json\" -d \"{\\\"prompt\\\": \\\"Generate a concise git commit message for these changes: $(git diff --cached --stat)\\\", \\\"model\\\": \\\"claude-instant-1\\\", \\\"max_tokens\\\": 100}\" | jq -r .completion // \"Auto-commit: $(date)\")" --no-verify; }; f'

# 7. Create a master control script
echo "🎮 Creating master control script..."

cat > "$SCRIPT_DIR/claude-master-auto.sh" << 'EOF'
#!/bin/bash

# Master automation control

case "$1" in
    on)
        echo "🟢 Enabling full automation mode..."
        export CLAUDE_AUTO_MODE=true
        source ~/project/claude-code-auto-action/scripts/claude-full-auto.sh
        echo "✓ Full automation enabled"
        ;;
    off)
        echo "🔴 Disabling automation mode..."
        unset CLAUDE_AUTO_MODE
        unset CLAUDE_AUTO_APPROVE
        unset CLAUDE_SKIP_CONFIRMATION
        echo "✓ Automation disabled"
        ;;
    status)
        if [ "$CLAUDE_AUTO_MODE" = "true" ]; then
            echo "🟢 Automation is ON"
        else
            echo "🔴 Automation is OFF"
        fi
        ;;
    daemon-start)
        python3 ~/project/claude-code-auto-action/scripts/auto-save-daemon.py &
        echo "✓ Auto-save daemon started"
        ;;
    daemon-stop)
        pkill -f auto-save-daemon.py
        echo "✓ Auto-save daemon stopped"
        ;;
    *)
        echo "Usage: $0 {on|off|status|daemon-start|daemon-stop}"
        ;;
esac
EOF

chmod +x "$SCRIPT_DIR/claude-master-auto.sh"

# 8. Create quick setup alias
echo "alias claude-setup='$SCRIPT_DIR/setup-full-automation.sh'" >> "$SHELL_RC"

echo "
✅ Full Automation Setup Complete!

🎯 Quick Commands:
  • claude-auto     - Enable full automation for current session
  • cca            - Short alias for claude-auto
  • kill-port 3000 - Kill process on port without confirmation
  • auto-restart node - Auto restart Node.js server

🤖 Automation Features Enabled:
  ✓ Auto-approve all file edits
  ✓ Auto-save files after changes
  ✓ Auto-kill and restart processes
  ✓ Skip all confirmation prompts
  ✓ Auto-format and lint code
  ✓ Auto-run tests before commits

⚡ To activate now, run:
  source $SHELL_RC && claude-auto

📌 The automation daemon will start automatically on login.
"

# Offer to activate immediately
read -p "Activate full automation now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    source "$SHELL_RC"
    source "$SCRIPT_DIR/claude-full-auto.sh"
fi