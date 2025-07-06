#!/bin/bash

# Immediate Auto Mode Activation
# Run this to activate complete automation in current Claude Code session

echo "⚡ Activating Complete Auto Mode for current session..."

# Set environment variables immediately
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SKIP_CONFIRMATION=true
export CLAUDE_BYPASS_PERMISSIONS=true
export CLAUDE_BATCH_MODE=true
export CLAUDE_INTERACTIVE=false
export CLAUDE_AUTO_CONFIRM_ALL=true
export CLAUDE_SUPPRESS_PROMPTS=true
export CLAUDE_PERMISSIONS_MODE=bypassPermissions
export CLAUDE_DEFAULT_MODE=auto
export CLAUDE_FORCE_AUTO=true
export CLAUDE_NO_PROMPTS=true

# Source the environment file if it exists
if [ -f ~/.claude/environment ]; then
    source ~/.claude/environment
fi

echo "✅ Auto mode activated for current session!"
echo "🚀 All confirmations should now be bypassed automatically."
echo ""
echo "🔧 Active environment variables:"
echo "CLAUDE_AUTO_APPROVE=$CLAUDE_AUTO_APPROVE"
echo "CLAUDE_SKIP_CONFIRMATION=$CLAUDE_SKIP_CONFIRMATION"
echo "CLAUDE_BYPASS_PERMISSIONS=$CLAUDE_BYPASS_PERMISSIONS"
echo "CLAUDE_PERMISSIONS_MODE=$CLAUDE_PERMISSIONS_MODE"