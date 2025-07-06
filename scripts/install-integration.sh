#!/bin/bash

# Claude Code Auto-Architect Integration Installer
# This script sets up the auto-architect system to work seamlessly with Claude Code

set -e

echo "🚀 Installing Claude Code Auto-Architect Integration..."

# Check if Claude Code is installed
if ! command -v claude-code &> /dev/null; then
    echo "❌ Claude Code is not installed. Please install Claude Code first."
    exit 1
fi

echo "✅ Claude Code found"

# Get Claude config directory
CLAUDE_DIR="$HOME/.claude"
if [ ! -d "$CLAUDE_DIR" ]; then
    echo "📁 Creating Claude config directory..."
    mkdir -p "$CLAUDE_DIR"
fi

# Get current project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📁 Project directory: $PROJECT_DIR"

# Build the TypeScript project
echo "🔨 Building TypeScript project..."
cd "$PROJECT_DIR"

if [ ! -f "package.json" ]; then
    echo "📦 Initializing npm project..."
    npm init -y
    npm install --save-dev typescript @types/node ts-node
    npm install ws uuid
fi

if [ ! -f "tsconfig.json" ]; then
    echo "📝 Creating tsconfig.json..."
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "examples"
  ]
}
EOF
fi

echo "🔨 Compiling TypeScript..."
npx tsc

# Copy hooks to Claude directory
echo "📋 Installing hooks..."
HOOKS_DIR="$CLAUDE_DIR/hooks"
mkdir -p "$HOOKS_DIR"

cp "$PROJECT_DIR/hooks/auto-architect-hook.js" "$HOOKS_DIR/"
chmod +x "$HOOKS_DIR/auto-architect-hook.js"

# Backup existing settings
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    echo "💾 Backing up existing Claude settings..."
    cp "$CLAUDE_DIR/settings.json" "$CLAUDE_DIR/settings.json.backup.$(date +%s)"
fi

# Update Claude settings
echo "⚙️ Updating Claude settings..."

# Create settings if they don't exist
if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
    echo "{}" > "$CLAUDE_DIR/settings.json"
fi

# Use Node.js to merge settings
node << 'EOF'
const fs = require('fs');
const path = require('path');

const claudeDir = process.env.HOME + '/.claude';
const settingsPath = path.join(claudeDir, 'settings.json');
const projectSettingsPath = process.argv[1] + '/.claude/settings.json';

// Read existing settings
let existingSettings = {};
try {
  existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (error) {
  console.log('No existing settings found, creating new ones...');
}

// Read project settings
let projectSettings = {};
try {
  projectSettings = JSON.parse(fs.readFileSync(projectSettingsPath, 'utf8'));
} catch (error) {
  console.error('Could not read project settings:', error);
  process.exit(1);
}

// Merge settings
const mergedSettings = {
  ...existingSettings,
  automation: {
    ...existingSettings.automation,
    ...projectSettings.automation,
    auto_architect: {
      enabled: true,
      auto_initialize: true,
      complexity_threshold: 3,
      hub_port: 8765,
      min_architects: 1,
      max_architects: 3,
      min_managers: 2,
      max_managers: 5,
      min_workers: 3,
      max_workers: 10,
      ...existingSettings.automation?.auto_architect,
      ...projectSettings.automation?.auto_architect
    }
  },
  hooks: {
    ...existingSettings.hooks,
    pre_run: (existingSettings.hooks?.pre_run || '') + 
             ' && node ~/.claude/hooks/auto-architect-hook.js init',
    pre_task: 'node ~/.claude/hooks/auto-architect-hook.js intercept',
    post_run: (existingSettings.hooks?.post_run || '') + 
              ' && node ~/.claude/hooks/auto-architect-hook.js shutdown'
  },
  agent_hierarchy: projectSettings.agent_hierarchy || existingSettings.agent_hierarchy,
  permissions: {
    ...existingSettings.permissions,
    ...projectSettings.permissions
  }
};

// Write merged settings
fs.writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2));
console.log('✅ Settings updated successfully');
EOF "$PROJECT_DIR"

# Create startup script
echo "📝 Creating startup script..."
cat > "$CLAUDE_DIR/start-auto-architect.sh" << EOF
#!/bin/bash
# Auto-Architect Startup Script

export CLAUDE_AUTO_ARCHITECT_HOME="$PROJECT_DIR"
cd "\$CLAUDE_AUTO_ARCHITECT_HOME"

echo "🚀 Starting Claude Code Auto-Architect System..."
node dist/main/ClaudeCodeAutoSystem.js --mode service --config ~/.claude/settings.json
EOF

chmod +x "$CLAUDE_DIR/start-auto-architect.sh"

# Create logs directory
mkdir -p "$CLAUDE_DIR/logs"

# Create systemd service (optional, for Linux)
if command -v systemctl &> /dev/null; then
    echo "🔧 Creating systemd service..."
    sudo tee /etc/systemd/system/claude-auto-architect.service > /dev/null << EOF
[Unit]
Description=Claude Code Auto-Architect System
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$CLAUDE_DIR/start-auto-architect.sh
Restart=always
RestartSec=10
Environment=NODE_ENV=production
WorkingDirectory=$PROJECT_DIR

[Install]
WantedBy=multi-user.target
EOF

    echo "🔧 Enabling systemd service..."
    sudo systemctl daemon-reload
    sudo systemctl enable claude-auto-architect.service
    echo "ℹ️  You can start the service with: sudo systemctl start claude-auto-architect"
fi

# Test installation
echo "🧪 Testing installation..."

# Check if hooks are executable
if [ -x "$HOOKS_DIR/auto-architect-hook.js" ]; then
    echo "✅ Hooks installed correctly"
else
    echo "❌ Hook installation failed"
    exit 1
fi

# Verify settings
if grep -q "auto_architect" "$CLAUDE_DIR/settings.json"; then
    echo "✅ Settings configured correctly"
else
    echo "❌ Settings configuration failed"
    exit 1
fi

# Create usage instructions
echo "📖 Creating usage instructions..."
cat > "$CLAUDE_DIR/AUTO_ARCHITECT_README.md" << 'EOF'
# Claude Code Auto-Architect Integration

## Overview
The Auto-Architect system automatically detects complex tasks and routes them to a multi-agent system for parallel processing.

## How It Works
1. **Automatic Detection**: When you start Claude Code, complex tasks are automatically detected
2. **Multi-Agent Processing**: Complex tasks are distributed across multiple Claude Code instances
3. **Seamless Integration**: Results are returned to your main Claude Code session

## Configuration
Settings are in `~/.claude/settings.json` under the `automation.auto_architect` section:

```json
{
  "automation": {
    "auto_architect": {
      "enabled": true,
      "complexity_threshold": 3,
      "min_architects": 1,
      "max_architects": 3,
      "min_managers": 2,
      "max_managers": 5,
      "min_workers": 3,
      "max_workers": 10
    }
  }
}
```

## Manual Control
- Enable: Edit settings and set `automation.auto_architect.enabled: true`
- Disable: Set `automation.auto_architect.enabled: false`
- Start service: `~/.claude/start-auto-architect.sh`
- Check logs: `tail -f ~/.claude/logs/auto-architect.log`

## Complexity Detection
Tasks are routed to the multi-agent system when they have:
- Long descriptions (>300 characters)
- Architecture/refactoring keywords
- Multiple file references
- System-wide impact
- Estimated duration >30 minutes

## Troubleshooting
1. Check if the service is running: `ps aux | grep auto-architect`
2. View logs: `cat ~/.claude/logs/auto-architect.log`
3. Test hooks: `node ~/.claude/hooks/auto-architect-hook.js init`
4. Restart service: `sudo systemctl restart claude-auto-architect` (Linux)
EOF

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. The Auto-Architect system will start automatically with Claude Code"
echo "2. Complex tasks will be automatically detected and processed"
echo "3. Check ~/.claude/AUTO_ARCHITECT_README.md for detailed usage instructions"
echo ""
echo "🔧 Configuration:"
echo "- Settings: ~/.claude/settings.json"
echo "- Logs: ~/.claude/logs/"
echo "- Manual start: ~/.claude/start-auto-architect.sh"
echo ""
echo "✨ The system is now ready! Start Claude Code and try a complex task."