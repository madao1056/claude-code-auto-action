# Claude Full Automation Guide

## 🚀 Quick Start

Run this command to enable full automation immediately:
```bash
cd ~/project/claude-code-auto-action
./scripts/setup-full-automation.sh
```

## 🎯 What This Does

This automation system completely eliminates ALL confirmation prompts:
- ✅ Auto-approves all file edits in Cursor/VSCode
- ✅ Auto-saves files after changes
- ✅ Auto-kills processes without asking
- ✅ Auto-restarts servers
- ✅ Bypasses all Claude permission checks
- ✅ Auto-commits with generated messages
- ✅ Runs tests automatically

## 🛠️ Scripts Created

### 1. **claude-full-auto.sh**
Main automation script that sets all environment variables and configurations.

### 2. **auto-save-daemon.py**
Python daemon that watches for file changes and auto-saves them in your editor.

### 3. **auto-process-manager.sh**
Handles killing and restarting processes without confirmation:
```bash
# Kill process on port
kill-port 3000

# Auto-restart Node.js
auto-restart node
```

### 4. **claude-yolo-mode.sh**
MAXIMUM automation mode - bypasses EVERYTHING:
```bash
source scripts/claude-yolo-mode.sh
```

### 5. **setup-full-automation.sh**
Complete setup script that configures your entire environment.

## ⚙️ Configuration Files

### ~/.claude/settings.json
```json
{
  "automation": {
    "enabled": true,
    "autoApproveAll": true,
    "skipAllPrompts": true
  },
  "permissions": {
    "mode": "bypassPermissions"
  }
}
```

### Environment Variables
All these are automatically set:
- `CLAUDE_AUTO_MODE=true`
- `CLAUDE_AUTO_APPROVE=true`
- `CLAUDE_SKIP_CONFIRMATION=true`
- `CLAUDE_PERMISSIONS_MODE=bypassPermissions`

## 🎮 Usage

### Enable Full Automation
```bash
# Option 1: Source the auto script
source scripts/claude-full-auto.sh

# Option 2: Use the alias
claude-auto

# Option 3: Short alias
cca
```

### YOLO Mode (Maximum Speed)
```bash
# Enable YOLO mode
source scripts/claude-yolo-mode.sh

# Now all commands auto-approve
claude edit myfile.js  # Auto-saves
claude kill 3000      # Kills instantly
```

### Common Operations
```bash
# Kill process on port (no confirmation)
kill-port 3000

# Restart Node.js server (auto-detects port)
auto-restart node

# Restart Python server
auto-restart python

# Manual restart with specific command
scripts/auto-process-manager.sh restart 3000 "npm run dev"
```

## 🔧 How It Works

1. **Environment Variables**: Sets all Claude automation flags
2. **Config Files**: Creates settings that disable all prompts
3. **Shell Wrapper**: Wraps `claude` command to pipe `yes` to any prompts
4. **Auto-Save Daemon**: Monitors file changes and triggers saves
5. **Process Manager**: Kills processes with SIGKILL, no questions asked

## ⚡ Advanced Features

### Auto-Commit with AI Messages
```bash
git auto-commit  # Generates commit message with Claude
```

### Batch Operations
```bash
# Edit multiple files - all auto-saved
claude edit file1.js file2.js file3.js
```

### Server Management
```bash
# Kill all Node processes
pkill -f node

# Restart on specific port with command
auto_do restart 3000 "node server.js"
```

## 🚨 Safety Notes

While this system bypasses all confirmations, it still maintains:
- Daily cost limit ($8 default, configurable)
- Deny list for extremely dangerous commands
- Audit logging to `~/.claude/logs/`

To disable automation temporarily:
```bash
unset CLAUDE_AUTO_MODE
```

To disable permanently:
```bash
scripts/claude-master-auto.sh off
```

## 🐛 Troubleshooting

### Prompts Still Appearing?
1. Make sure you've sourced the script: `source scripts/claude-full-auto.sh`
2. Check if all environment variables are set: `env | grep CLAUDE`
3. Restart your terminal and try again

### Auto-Save Not Working?
1. Check if daemon is running: `pgrep -f auto-save-daemon`
2. Start manually: `python3 scripts/auto-save-daemon.py &`
3. Check logs: `tail -f /tmp/claude-auto-daemon.out`

### Process Won't Die?
```bash
# Force kill with multiple signals
lsof -ti:3000 | xargs kill -9
fuser -k 3000/tcp
```

## 📝 Customization

Edit `~/.claude/settings.json` to customize behavior:
```json
{
  "automation": {
    "autoCommit": true,  // Auto-commit changes
    "autoTest": true,    // Run tests automatically
    "autoFormat": true   // Format code on save
  }
}
```

## 🎯 Best Practices

1. **Use YOLO mode** for maximum speed during active development
2. **Keep auto-push disabled** to review changes before pushing
3. **Set cost limits** to prevent runaway operations
4. **Use aliases** for common operations
5. **Monitor the daemon** to ensure auto-save is working

## 🔗 Quick Reference

```bash
# Enable automation
cca

# YOLO mode
yolo

# Kill port
kill-port 3000

# Restart server
auto-restart node

# Check status
env | grep CLAUDE_AUTO_MODE

# Disable
unset CLAUDE_AUTO_MODE
```

Now you can work without ANY confirmation prompts! 🚀