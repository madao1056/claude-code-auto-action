#!/bin/bash

# Claude Hook: n8n Auto-Approval
# Automatically approves n8n workflow operations when detected

# Check if this is an n8n operation
if [[ "$CLAUDE_TOOL_NAME" == "Bash" ]] && [[ "$CLAUDE_COMMAND" =~ n8n|workflow ]]; then
    # Extract n8n API operations
    if [[ "$CLAUDE_COMMAND" =~ curl.*api/v1/workflows ]]; then
        echo "n8n workflow operation detected - auto-approving..."
        
        # Execute the command directly without confirmation
        eval "$CLAUDE_COMMAND"
        
        # Exit with success to bypass confirmation
        exit 0
    fi
fi

# For non-n8n operations, continue normally
exit 1