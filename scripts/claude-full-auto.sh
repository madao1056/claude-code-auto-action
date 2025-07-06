#!/bin/bash

# Claude Full Auto Mode - No Prompts, No Confirmations
# This script ensures complete automation for all Claude operations

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Set all automation environment variables
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

# VSCode/Cursor specific
export CURSOR_AUTO_SAVE=true
export CURSOR_AUTO_ACCEPT_CHANGES=true
export VSCODE_AUTO_SAVE=true
export VSCODE_AUTO_ACCEPT_CHANGES=true

# Auto-approve all file operations
export CLAUDE_AUTO_CREATE_DIRECTORIES=true
export CLAUDE_AUTO_CREATE_FILES=true
export CLAUDE_AUTO_SAVE_FILES=true
export CLAUDE_AUTO_EDIT_FILES=true
export CLAUDE_AUTO_DELETE_FILES=true

# Process management
export CLAUDE_AUTO_KILL_PROCESSES=true
export CLAUDE_AUTO_RESTART_SERVERS=true
export CLAUDE_FORCE_KILL_PROCESSES=true

# Git operations
export CLAUDE_AUTO_COMMIT=true
export CLAUDE_AUTO_PUSH=false  # Keep push manual for safety
export CLAUDE_AUTO_PULL=true
export CLAUDE_AUTO_MERGE=true

# Testing and quality
export CLAUDE_AUTO_TEST=true
export CLAUDE_AUTO_FORMAT=true
export CLAUDE_AUTO_LINT=true
export CLAUDE_AUTO_FIX=true

# Cost control
export CLAUDE_COST_LIMIT_PER_DAY=${CLAUDE_COST_LIMIT_PER_DAY:-10}

# Create Claude config directory if it doesn't exist
mkdir -p ~/.claude

# Create auto-approve configuration
cat > ~/.claude/auto-approve.json << 'EOF'
{
  "autoApprove": {
    "enabled": true,
    "patterns": [
      "*",
      ".*"
    ],
    "operations": [
      "create",
      "edit",
      "delete",
      "save",
      "execute",
      "kill",
      "restart"
    ]
  },
  "skipPrompts": {
    "fileOperations": true,
    "processOperations": true,
    "gitOperations": true,
    "testOperations": true
  }
}
EOF

# Create or update main settings
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
    "autoApprove": true
  },
  "editor": {
    "autoSave": true,
    "autoAcceptChanges": true,
    "skipEditConfirmation": true
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
    "interactive": false
  }
}
EOF

# Create config.json for additional settings
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
  "silent": true
}
EOF

# Function to wrap Claude commands with auto-approval
claude_auto() {
    # Use yes command to auto-approve any remaining prompts
    yes | claude "$@" 2>&1 | grep -v "Do you want to"
}

# Alias for the wrapped command
alias claude=claude_auto

echo -e "${GREEN}✓ Claude Full Auto Mode Activated${NC}"
echo -e "${YELLOW}All confirmations will be automatically approved${NC}"
echo -e "${YELLOW}To disable: unset CLAUDE_AUTO_MODE${NC}"

# If running with arguments, execute Claude with those arguments
if [ $# -gt 0 ]; then
    claude_auto "$@"
fi