# Claude CLI Complete Automation Setup

This guide explains how to configure Claude CLI for fully automated operations with zero interactive prompts.

## Overview

The automation system uses multiple layers to ensure complete non-interactive operation:

1. **Environment Variables** - Control CLI behavior
2. **Configuration Files** - Define default settings
3. **Shell Integration** - Provide convenient commands
4. **Auto-response System** - Handle any remaining prompts

## Quick Setup

Run the installation script to set up everything automatically:

```bash
./scripts/install.sh
source ~/.bashrc  # or ~/.zshrc
```

## Environment Variables

The following environment variables control Claude CLI automation:

### Core Automation Variables

```bash
# Skip all interactive prompts
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SKIP_CONFIRMATION=true
export CLAUDE_NON_INTERACTIVE=true
export CLAUDE_BATCH_MODE=true

# Bypass permission checks
export CLAUDE_PERMISSIONS_MODE=bypassPermissions
export CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true

# Auto-approve specific operations
export CLAUDE_AUTO_APPROVE_FILE_OPERATIONS=true
export CLAUDE_AUTO_APPROVE_SHELL_COMMANDS=true
export CLAUDE_AUTO_APPROVE_NETWORK_REQUESTS=true
```

### Project Creation Variables

```bash
# Auto-create project structure
export CLAUDE_AUTO_CREATE_DIRECTORIES=true
export CLAUDE_AUTO_CREATE_FILES=true
export CLAUDE_AUTO_INITIALIZE_GIT=true
export CLAUDE_AUTO_INSTALL_DEPENDENCIES=true

# Skip project prompts
export CLAUDE_SKIP_PROJECT_NAME_PROMPT=true
export CLAUDE_SKIP_TECH_STACK_PROMPT=true
export CLAUDE_SKIP_DIRECTORY_PROMPT=true
```

## Configuration Files

### 1. Claude Configuration (`~/.claude/config.json`)

Controls Claude CLI behavior and default settings:

```json
{
  "automation": {
    "enabled": true,
    "skipAllPrompts": true,
    "autoApproveAll": true,
    "nonInteractive": true
  },
  "permissions": {
    "mode": "bypassPermissions",
    "autoApprove": {
      "fileOperations": true,
      "shellCommands": true,
      "networkRequests": true
    }
  }
}
```

### 2. Claude RC File (`~/.claude/clauderc`)

Runtime configuration for Claude CLI:

```yaml
auto_approve: true
skip_confirmation: true
non_interactive: true
permissions:
  mode: bypass
  skip_all_checks: true
```

### 3. Shell Environment (`~/.claude-auto-env`)

Complete environment setup that can be sourced:

```bash
source ~/.claude-auto-env
```

## Shell Commands

After installation, you'll have access to these commands:

### Basic Commands

- `cca <prompt>` - Run Claude with full automation
- `ccnew <name> <description>` - Create new project with zero prompts
- `claude-auto-on` - Enable automation mode
- `claude-auto-off` - Disable automation mode
- `claude-status` - Check automation status

### Project Creation Shortcuts

- `ccapi <name>` - Create REST API project
- `ccweb <name>` - Create web application
- `ccfull <name>` - Create full-stack application
- `cccli <name>` - Create CLI tool
- `ccmobile <name>` - Create mobile app

### Template Commands

```bash
# Create from template
claude-template saas my-saas-app
claude-template ecommerce my-store
claude-template marketplace my-marketplace
```

### Batch Operations

```bash
# Create entire microservices stack
claude-create-stack my-platform

# Auto-fix and commit
claude-fix

# Auto-document project
claude-document

# Auto-optimize project
claude-optimize
```

## Usage Examples

### 1. Create New Project (Zero Prompts)

```bash
# Using the auto-create script
./scripts/auto-create-project.sh my-app -t web -d "E-commerce platform"

# Using shell command
ccnew my-app "E-commerce platform with React and Node.js"

# Using template
claude-template ecommerce my-store
```

### 2. Create with Custom Stack

```bash
# Specify exact stack
ccnew my-api -t api -s "node,express,postgres,redis" -f "auth,crud,websocket"

# Create microservices
./scripts/auto-create-project.sh my-platform --template microservice
```

### 3. Batch Project Creation

```bash
# Create complete platform
claude-create-stack my-platform
# This creates:
# - API Gateway
# - Auth Service
# - Main API
# - Frontend
# - Admin Panel
# - Docker Compose setup
```

## Advanced Configuration

### Custom Auto-responses

Add to `~/.claude/config.json`:

```json
{
  "responses": {
    "defaultAnswers": {
      "confirmOperation": "yes",
      "overwriteFile": "yes",
      "createDirectory": "yes",
      "installDependency": "yes"
    }
  }
}
```

### Project-specific Automation

Create `.claude-auto` file in any directory to auto-enable automation:

```bash
touch .claude-auto
```

### Disable Specific Prompts

```bash
# Skip only certain prompts
export CLAUDE_SKIP_FILE_PROMPTS=true
export CLAUDE_SKIP_COMMAND_PROMPTS=true
export CLAUDE_SKIP_NETWORK_PROMPTS=true
```

## Troubleshooting

### Still Getting Prompts?

1. Ensure all environment variables are set:
   ```bash
   claude-status
   ```

2. Source the automation environment:
   ```bash
   source ~/.claude-auto-env
   ```

3. Use the wrapper commands instead of `claude` directly:
   ```bash
   cca "your prompt"  # Instead of: claude "your prompt"
   ```

### Permission Denied Errors

Make sure scripts are executable:
```bash
chmod +x scripts/*.sh
```

### Environment Not Loading

Add to your shell RC file:
```bash
echo "source ~/.claude-auto-env" >> ~/.bashrc
```

## Security Considerations

The automation setup bypasses many safety checks. Use with caution:

1. **Review generated code** before running in production
2. **Don't use on shared systems** where others have access
3. **Backup important data** before running destructive operations
4. **Use `claude-auto-off`** to disable automation when needed

## Complete Example Workflow

```bash
# 1. Enable automation
claude-auto-on

# 2. Create new SaaS project
ccnew my-saas "Multi-tenant SaaS with billing"

# 3. Navigate to project
cd my-saas

# 4. Run quick setup
./quickstart.sh

# 5. Start development
npm run dev

# 6. Make changes and auto-commit
claude-fix
claude-commit

# 7. Generate documentation
claude-document

# 8. Prepare for deployment
cca "Prepare this project for production deployment on AWS"
```

## Customization

To add your own automation:

1. Edit `~/.claude-auto-env` to add variables
2. Update `~/.claude/config.json` for new settings
3. Add functions to `~/.claude/shell-integration.sh`
4. Create custom templates in `~/.claude/templates/`

## Updates

To update the automation system:

```bash
cd /path/to/claude-code-auto-action
git pull
./scripts/install.sh
source ~/.bashrc
```