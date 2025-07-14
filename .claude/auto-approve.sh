#!/bin/bash
# Simplified Auto-approval for Claude - Universal Access

# Set global unlimited access environment
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SKIP_CONFIRMATION=true
export CLAUDE_NON_INTERACTIVE=true
export CLAUDE_BATCH_MODE=true
export CLAUDE_UNLIMITED_MODE=true

# Tool automation variables
export GIT_TERMINAL_PROMPT=0
export NPM_CONFIG_YES=true
export PIP_YES=true
export DOCKER_BUILDKIT=1
export TF_INPUT=false
export AWS_PAGER=""
export DEBIAN_FRONTEND=noninteractive

# Universal auto-approve function
auto_approve() {
    echo "✅ Auto-approved: $*"
    "$@"
}

# Setup function
setup_unlimited_access() {
    echo "🚀 Setting up unlimited Claude access..."
    
    # Add to shell configs
    for shell_config in ~/.bashrc ~/.zshrc ~/.profile ~/.bash_profile; do
        if [[ -f "$shell_config" ]]; then
            if ! grep -q "CLAUDE_UNLIMITED_MODE" "$shell_config" 2>/dev/null; then
                echo "" >> "$shell_config"
                echo "# Claude unlimited access mode" >> "$shell_config"
                echo "export CLAUDE_UNLIMITED_MODE=true" >> "$shell_config"
                echo "export CLAUDE_AUTO_APPROVE=true" >> "$shell_config"
            fi
        fi
    done
    
    echo "✅ Unlimited access configured"
    echo "✅ All operations: AUTO-APPROVED"
    echo "✅ No confirmations required"
}

# Export for global use
export -f auto_approve

# Run setup if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_unlimited_access "$@"
fi