#!/bin/bash

# Claude Code Complete Auto Mode Setup
# This script sets up environment variables and configurations for complete automation

echo "🚀 Setting up Claude Code Complete Auto Mode..."

# Set environment variables for complete automation
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SKIP_CONFIRMATION=true
export CLAUDE_BYPASS_PERMISSIONS=true
export CLAUDE_BATCH_MODE=true
export CLAUDE_INTERACTIVE=false
export CLAUDE_AUTO_CONFIRM_ALL=true
export CLAUDE_SUPPRESS_PROMPTS=true
export CLAUDE_PERMISSIONS_MODE=bypassPermissions

# Create environment file for persistent settings
CLAUDE_ENV_FILE="$HOME/.claude/environment"
mkdir -p "$(dirname "$CLAUDE_ENV_FILE")"

cat > "$CLAUDE_ENV_FILE" << 'EOF'
# Claude Code Complete Automation Environment Variables
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
export CLAUDE_SILENT_EXECUTION=true
export CLAUDE_AUTO_ARCHITECT_ENABLED=true
EOF

# Add to shell profile for permanent effect
SHELL_PROFILE=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_PROFILE="$HOME/.bash_profile"
fi

if [ -n "$SHELL_PROFILE" ]; then
    echo "📝 Adding to shell profile: $SHELL_PROFILE"
    
    # Check if already added
    if ! grep -q "CLAUDE_AUTO_APPROVE" "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Claude Code Auto Mode" >> "$SHELL_PROFILE"
        echo "source ~/.claude/environment" >> "$SHELL_PROFILE"
        echo "✅ Added to shell profile"
    else
        echo "ℹ️  Already added to shell profile"
    fi
fi

# Create wrapper script for Claude Code that ensures auto mode
CLAUDE_WRAPPER="$HOME/.claude/claude-auto"
cat > "$CLAUDE_WRAPPER" << 'EOF'
#!/bin/bash

# Claude Code Auto Mode Wrapper
# This script ensures Claude Code always runs in complete auto mode

# Source environment variables
if [ -f ~/.claude/environment ]; then
    source ~/.claude/environment
fi

# Force auto mode arguments
CLAUDE_ARGS=(
    --auto-approve
    --skip-confirmation
    --bypass-permissions
    --batch-mode
    --non-interactive
    --suppress-prompts
    --permissions-mode=bypassPermissions
)

# Add any user arguments
CLAUDE_ARGS+=("$@")

# Start Claude Code with forced auto mode
echo "🚀 Starting Claude Code in Complete Auto Mode..."
claude-code "${CLAUDE_ARGS[@]}"
EOF

chmod +x "$CLAUDE_WRAPPER"

# Create global configuration override
CLAUDE_GLOBAL_CONFIG="$HOME/.claude/global-override.json"
cat > "$CLAUDE_GLOBAL_CONFIG" << 'EOF'
{
  "forceAutoMode": true,
  "bypassAllPrompts": true,
  "suppressUserConfirmation": true,
  "autoApproveEverything": true,
  "defaultMode": "bypassPermissions",
  "interactive": false,
  "batchMode": true,
  "silentExecution": false,
  "autoConfirmAll": true,
  "skipAllConfirmation": true,
  "permissionsMode": "bypassPermissions",
  "hooks": {
    "bypassConfirmation": true,
    "autoExecute": true
  },
  "overrideSettings": {
    "autoApprove": true,
    "skipConfirmation": true,
    "bypassPermissions": true,
    "suppressPrompts": true
  }
}
EOF

# Update main settings to include global override
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
if [ -f "$CLAUDE_SETTINGS" ]; then
    # Backup current settings
    cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.backup.$(date +%s)"
    
    # Merge with global override using Node.js
    node << 'MERGE_SCRIPT'
const fs = require('fs');

const settingsPath = process.env.HOME + '/.claude/settings.json';
const overridePath = process.env.HOME + '/.claude/global-override.json';

try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const override = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
    
    // Deep merge override into settings
    const merged = {
        ...settings,
        ...override,
        automation: {
            ...settings.automation,
            ...override.automation,
            enabled: true,
            autoApproveAll: true,
            skipAllPrompts: true,
            bypassAllConfirmation: true
        },
        permissions: {
            ...settings.permissions,
            defaultMode: "allow_all",
            bypassMode: true
        }
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2));
    console.log('✅ Settings merged with global override');
} catch (error) {
    console.error('❌ Failed to merge settings:', error);
}
MERGE_SCRIPT
fi

# Create startup script that forces auto mode
STARTUP_SCRIPT="$HOME/.claude/auto-startup.sh"
cat > "$STARTUP_SCRIPT" << 'EOF'
#!/bin/bash

# Auto-startup script for Claude Code
echo "🔧 Configuring Claude Code for complete automation..."

# Set all environment variables
source ~/.claude/environment

# Override any existing configuration
export CLAUDE_CONFIG_OVERRIDE=~/.claude/global-override.json

# Force permissions mode
export CLAUDE_PERMISSIONS_MODE=bypassPermissions

echo "✅ Claude Code configured for complete automation"
EOF

chmod +x "$STARTUP_SCRIPT"

# Update hooks to include auto-startup
if [ -f "$CLAUDE_SETTINGS" ]; then
    # Update pre_run hook to include auto-startup
    node << 'UPDATE_HOOKS'
const fs = require('fs');
const settingsPath = process.env.HOME + '/.claude/settings.json';

try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    if (!settings.hooks) settings.hooks = {};
    
    // Prepend auto-startup to existing pre_run hook
    const existingPreRun = settings.hooks.pre_run || '';
    settings.hooks.pre_run = `source ~/.claude/auto-startup.sh && ${existingPreRun}`;
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log('✅ Updated hooks with auto-startup');
} catch (error) {
    console.error('❌ Failed to update hooks:', error);
}
UPDATE_HOOKS
fi

echo ""
echo "🎉 Complete Auto Mode Setup Finished!"
echo ""
echo "📋 What was configured:"
echo "✅ Environment variables for complete automation"
echo "✅ Shell profile integration"
echo "✅ Claude Code wrapper script"
echo "✅ Global configuration override"
echo "✅ Auto-startup hooks"
echo ""
echo "🚀 To use:"
echo "1. Restart your terminal (or run: source ~/.claude/environment)"
echo "2. Use: ~/.claude/claude-auto instead of claude-code"
echo "3. Or restart Claude Code to pick up new settings"
echo ""
echo "🔧 Files created/modified:"
echo "- ~/.claude/environment"
echo "- ~/.claude/claude-auto (wrapper script)"
echo "- ~/.claude/global-override.json"
echo "- ~/.claude/auto-startup.sh"
echo "- ~/.claude/settings.json (updated)"
echo ""
echo "⚡ No more confirmation prompts should appear!"