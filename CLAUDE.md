# Claude Code Auto Action

## Project Overview
This is an automation system that integrates Claude AI with development workflows to provide intelligent code assistance, automated commits, testing, and continuous integration.

## Architecture

### Core Components
1. **Claude CLI Integration** - Extends the Claude CLI with automation features
2. **VSCode/Cursor Extension** - IDE integration for real-time assistance
3. **Git Hooks** - Automated pre/post commit actions
4. **CI/CD Workflows** - GitHub Actions for automated quality checks

### Directory Structure
```
.claude/                    # Claude configuration and settings
├── settings.json          # Main configuration file
├── permissions.json       # Security and permission rules
└── commands/             # Custom command definitions

cursor-extension/          # VSCode/Cursor extension
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── services/         # Claude API integration
│   └── providers/        # UI providers for tasks/history
└── package.json

scripts/                   # Automation scripts
├── install.sh            # Installation script
└── claude-auto.sh        # Main automation script

hooks/                     # Git hooks
├── pre-commit           # Pre-commit automation
└── post-commit          # Post-commit tasks

.github/workflows/         # GitHub Actions
├── claude-ci.yml        # CI/CD pipeline
└── claude-schedule.yml  # Scheduled tasks
```

## Features

### Automated Operations
- **Auto-commit**: Intelligent commit message generation
- **Auto-format**: Code formatting on save
- **Auto-lint**: Automatic linting and fixes
- **Auto-test**: Run tests before commits
- **Import optimization**: Organize and clean imports

### Thinking Mode System
- **Adaptive Intelligence**: AI思考レベルを自動調整
- **Default Mode**: think_hard (10,000 tokens) - 高品質な思考
- **Auto-escalation**: 2回以上の修正で ultrathink (31,999 tokens) に自動昇格
- **Context-aware**: タスクの種類に応じた思考モード選択
- **Revision Tracking**: 修正回数の自動追跡とエスカレーション

#### 思考モード一覧
- `think`: 4,000 tokens - 基本的な思考
- `think_hard`: 10,000 tokens - より深い思考（デフォルト）
- `think_harder`: 20,000 tokens - さらに深い思考
- `ultrathink`: 31,999 tokens - 最強思考モード

### Safety Features
- File system permission controls
- Command execution restrictions
- Sensitive data protection
- Confirmation for destructive operations
- Automatic backups before major changes

### IDE Integration
- Real-time code suggestions
- Error fixing assistance
- Test generation
- Code explanation
- Performance optimization

## Installation

1. Clone this repository
2. Run the installation script:
   ```bash
   chmod +x scripts/install.sh
   ./scripts/install.sh
   ```
3. Install the VSCode/Cursor extension
4. Configure your Claude API key:
   ```bash
   claude-code config set api_key YOUR_API_KEY
   ```

## Configuration

### Settings (.claude/settings.json)
- `automation.enabled`: Enable/disable all automation
- `automation.auto_commit`: Auto-commit changes
- `automation.test_before_commit`: Run tests before committing
- `performance.parallel_execution`: Enable parallel operations
- `safety.require_approval_for_destructive`: Require confirmation

### Thinking Mode Settings (.claude/settings.local.json)
- `thinkingMode.enabled`: Enable/disable thinking mode system
- `thinkingMode.defaultMode`: Default thinking mode (think_hard)
- `thinkingMode.autoEscalation.enabled`: Enable auto-escalation
- `thinkingMode.autoEscalation.revisionThreshold`: Revision count threshold (2)
- `thinkingMode.autoEscalation.maxMode`: Maximum escalation mode (ultrathink)
- `thinkingMode.triggers.codeRevision.mode`: Mode for code revisions
- `thinkingMode.triggers.complexTask.mode`: Mode for complex tasks
- `thinkingMode.triggers.errorHandling.mode`: Mode for error handling

### Permissions (.claude/permissions.json)
- `file_system.allowed_paths`: Allowed file paths
- `file_system.blocked_paths`: Blocked file paths
- `execution.allowed_commands`: Allowed shell commands
- `execution.blocked_commands`: Blocked shell commands

## Usage

### Command Line
```bash
# Auto-commit with generated message
claude-code commit --auto

# Generate tests for current file
claude-code generate-tests file.js

# Start file watcher
claude-code watch

# Set thinking mode manually
claude-code set-thinking-mode ultrathink

# Get thinking mode status
claude-code thinking-status
```

### VSCode/Cursor
- `Cmd+Shift+A`: Ask Claude a question
- `Cmd+Shift+C`: Auto-commit changes
- Right-click menu: Access Claude features
- Status bar: Show current thinking mode

### Thinking Mode Usage
The system automatically manages thinking modes based on:
- **Default**: All tasks start with `think_hard` mode (10,000 tokens)
- **Auto-escalation**: 2+ revisions trigger `ultrathink` mode (31,999 tokens)
- **Context-aware**: Code revisions automatically use higher thinking modes
- **Manual override**: Set specific modes for complex tasks

## Custom Commands

Create custom commands in `.claude/commands/`:

```json
{
  "name": "my-command",
  "description": "Description of what it does",
  "trigger": {
    "on_save": true,
    "manual": true
  },
  "actions": [
    {
      "type": "claude",
      "prompt": "Your prompt here"
    }
  ]
}
```

## Security

The system includes multiple security layers:
1. Path-based access control
2. Command whitelisting/blacklisting
3. File size limits
4. Sensitive data masking
5. Audit logging

## Development

### Building the Extension
```bash
cd cursor-extension
npm install
npm run compile
```

### Running Tests
```bash
npm test
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Troubleshooting

### Common Issues
1. **Permission denied**: Check `.claude/permissions.json`
2. **API errors**: Verify your API key is set correctly
3. **Extension not working**: Rebuild and reinstall the extension

### Logs
Check logs in `~/.claude/logs/` for debugging information.

## License
MIT License - see LICENSE file for details