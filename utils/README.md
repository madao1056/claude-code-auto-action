# Claude Code Auto Action - Utilities

This directory contains shared utility modules used across the Claude Code Auto Action project.

## Modules

### settingsLoader
- `loadSettings(basePath)` - Load and merge default and local settings
- `loadUserSettings()` - Load settings from user's home directory
- `deepMerge(target, source)` - Deep merge two objects

### notification
- `playSound(soundName)` - Play system sounds
- `showNotification(options)` - Show desktop notifications
- `notifyTaskCompletion(taskInfo, settings)` - Notify when tasks complete
- `notifyConfirmationPrompt(settings)` - Notify for confirmation prompts

### commandBuilder
- `buildCommand(baseCommand, options)` - Build Claude CLI commands with flags
- `escapeShellArg(str)` - Escape strings for shell commands
- `buildEnvironment(options)` - Build environment variables for Claude execution

### processManager
- `spawnProcess(command, args, options)` - Spawn child processes with error handling
- `waitForProcessReady(process, pattern, timeout)` - Wait for process initialization
- `gracefulShutdown(process, options)` - Gracefully shutdown processes
- `createProcessMonitor(startProcess, options)` - Create auto-restarting process monitors

## Usage

### CommonJS
```javascript
const { loadSettings, playSound, buildCommand } = require('../utils');
```

### Individual modules
```javascript
const { loadSettings } = require('../utils/settingsLoader');
const { notifyTaskCompletion } = require('../utils/notification');
```

## Adding New Utilities

1. Create a new module file in this directory
2. Add proper JSDoc comments
3. Export the module in `index.js`
4. Update this README with the new functions

## Code Standards

- Use JSDoc comments for all exported functions
- Handle errors gracefully
- Return promises for async operations
- Use descriptive parameter and function names
- Keep functions focused on a single responsibility