#!/bin/bash

# Claude YOLO Mode - Maximum automation, zero confirmations
# WARNING: This bypasses ALL safety checks. Use with caution!

echo "
🚨 CLAUDE YOLO MODE 🚨
====================
⚡ ALL confirmations disabled
⚡ ALL prompts auto-approved
⚡ NO safety checks
⚡ MAXIMUM SPEED

Press Ctrl+C to abort or wait 3 seconds to continue...
"

sleep 3

# Export ALL automation variables
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
export CLAUDE_YOLO_MODE=true
export CLAUDE_FORCE_YES=true
export CLAUDE_SKIP_ALL_CHECKS=true
export CLAUDE_NO_SAFETY=true
export CLAUDE_ASSUME_YES=true

# File operations
export CLAUDE_AUTO_CREATE_DIRECTORIES=true
export CLAUDE_AUTO_CREATE_FILES=true
export CLAUDE_AUTO_SAVE_FILES=true
export CLAUDE_AUTO_EDIT_FILES=true
export CLAUDE_AUTO_DELETE_FILES=true
export CLAUDE_AUTO_OVERWRITE=true

# Process operations
export CLAUDE_AUTO_KILL_PROCESSES=true
export CLAUDE_AUTO_RESTART_SERVERS=true
export CLAUDE_FORCE_KILL_PROCESSES=true
export CLAUDE_KILL_WITHOUT_PROMPT=true

# Git operations
export CLAUDE_AUTO_COMMIT=true
export CLAUDE_AUTO_PUSH=true
export CLAUDE_AUTO_PULL=true
export CLAUDE_AUTO_MERGE=true
export CLAUDE_AUTO_REBASE=true
export CLAUDE_SKIP_HOOKS=true

# Testing
export CLAUDE_AUTO_TEST=true
export CLAUDE_CONTINUE_ON_TEST_FAILURE=true
export CLAUDE_AUTO_FIX_TESTS=true

# Editor
export CURSOR_AUTO_SAVE=true
export CURSOR_AUTO_ACCEPT_CHANGES=true
export VSCODE_AUTO_SAVE=true
export VSCODE_AUTO_ACCEPT_CHANGES=true
export EDITOR_NO_CONFIRM=true

# System
export CLAUDE_COST_LIMIT_PER_DAY=999
export CLAUDE_NO_LIMITS=true
export CLAUDE_UNLIMITED_OPERATIONS=true

# Create YOLO wrapper function
claude_yolo() {
    # Use expect to handle any interactive prompts
    if command -v expect >/dev/null 2>&1; then
        expect -c "
            set timeout 2
            spawn claude $*
            expect {
                \"Do you want to\" { send \"y\r\"; exp_continue }
                \"Are you sure\" { send \"y\r\"; exp_continue }
                \"Continue?\" { send \"y\r\"; exp_continue }
                \"Proceed?\" { send \"y\r\"; exp_continue }
                \"Save file\" { send \"y\r\"; exp_continue }
                \"Overwrite\" { send \"y\r\"; exp_continue }
                eof
            }
        "
    else
        # Fallback to yes pipe
        yes | claude "$@" 2>&1 | grep -v -E "(Do you want to|Are you sure|Continue\?|Proceed\?)"
    fi
}

# Override claude command
alias claude=claude_yolo

# Create ultra-fast shortcuts
alias yolo='claude_yolo'
alias y='yes | claude'

# Function to auto-handle any operation
auto_do() {
    local operation=$1
    shift
    
    case $operation in
        edit)
            # Auto-save after edit
            claude_yolo "$@" && echo "✓ Auto-saved"
            ;;
        kill)
            # Kill without asking
            lsof -ti:$1 | xargs kill -9 2>/dev/null && echo "✓ Process killed"
            ;;
        restart)
            # Kill and restart
            lsof -ti:$1 | xargs kill -9 2>/dev/null
            sleep 1
            $2 & echo "✓ Service restarted (PID: $!)"
            ;;
        commit)
            # Auto-commit with generated message
            git add -A && git commit -m "YOLO: Auto-commit $(date +%Y%m%d_%H%M%S)" --no-verify
            ;;
        *)
            claude_yolo "$@"
            ;;
    esac
}

# Export the function
export -f auto_do

# Start auto-save daemon if not running
if ! pgrep -f "auto-save-daemon.py" >/dev/null; then
    nohup python3 ~/project/claude-code-auto-action/scripts/auto-save-daemon.py >/dev/null 2>&1 &
    echo "🤖 Auto-save daemon started"
fi

echo "
🚀 YOLO MODE ACTIVATED! 🚀

Commands:
  • claude <any>  - Run any Claude command with auto-approval
  • yolo <cmd>    - Alias for claude in YOLO mode  
  • y <cmd>       - Ultra-short alias
  • auto_do <op>  - Auto-handle common operations

Examples:
  • claude edit file.js        # Auto-saves after edit
  • auto_do kill 3000         # Kills port 3000 instantly
  • auto_do restart 3000 'npm start'  # Kill & restart
  • auto_do commit            # Auto-commit everything

⚠️  YOLO mode is ON. All operations are automatic!
"

# If arguments provided, run immediately
if [ $# -gt 0 ]; then
    claude_yolo "$@"
fi