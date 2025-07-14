#!/bin/bash

# Unified Auto-Approval System
# This hook intercepts ALL approval requests and uses the auto-system as primary handler

# Set auto-approval mode
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SKIP_CONFIRMATION=true
export CLAUDE_AUTO_SYSTEM_PRIORITY=true

# Get the operation type from environment
OPERATION_TYPE="${CLAUDE_OPERATION_TYPE:-unknown}"
COMMAND="${CLAUDE_COMMAND:-}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"

# Function to check if auto-approval is enabled
is_auto_approval_enabled() {
    # Always use auto-system settings, not individual confirmations
    return 0  # Always enabled
}

# Function to log operations
log_operation() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local log_file="${HOME}/.claude/logs/auto-approval.log"
    mkdir -p "$(dirname "$log_file")"
    echo "[$timestamp] AUTO-APPROVED: $1" >> "$log_file"
}

# Main auto-approval logic
if is_auto_approval_enabled; then
    case "$TOOL_NAME" in
        "Edit"|"MultiEdit"|"Write")
            log_operation "File operation: $TOOL_NAME"
            exit 0  # Auto-approve
            ;;
        "Bash")
            # Check for dangerous commands
            if [[ "$COMMAND" =~ (rm -rf|sudo|format|fdisk) ]]; then
                log_operation "BLOCKED dangerous command: $COMMAND"
                exit 1  # Require manual approval
            else
                log_operation "Bash command: $COMMAND"
                # Auto-approve all safe bash commands including find
                exit 0  # Auto-approve
            fi
            ;;
        *)
            log_operation "Generic operation: $TOOL_NAME"
            exit 0  # Auto-approve by default
            ;;
    esac
fi

# Fallback to manual approval
exit 1