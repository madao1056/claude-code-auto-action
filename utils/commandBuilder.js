/**
 * @module commandBuilder
 * @description Utility module for building Claude command line arguments
 */

/**
 * Build Claude command with appropriate flags based on settings
 * @param {string} baseCommand - Base command to execute
 * @param {Object} options - Command options
 * @param {boolean} [options.yoloMode=false] - Enable YOLO mode with auto-permissions
 * @param {string} [options.model='sonnet'] - Claude model to use
 * @param {boolean} [options.nonInteractive=false] - Run in non-interactive mode
 * @param {boolean} [options.autoApprove=false] - Auto-approve all prompts
 * @returns {string} Complete command with flags
 */
function buildCommand(baseCommand, options = {}) {
  const flags = [];
  
  if (options.yoloMode || options.autoApprove) {
    flags.push('--dangerously-skip-permissions');
    flags.push('--auto-approve');
    flags.push('--non-interactive');
  }
  
  if (options.nonInteractive) {
    flags.push('--non-interactive');
  }
  
  if (options.model) {
    flags.push(`--model ${options.model}`);
  }
  
  return flags.length > 0 ? `${baseCommand} ${flags.join(' ')}` : baseCommand;
}

/**
 * Escape string for shell command
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeShellArg(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/'/g, "\\'")
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

/**
 * Build environment variables for Claude execution
 * @param {Object} options - Environment options
 * @returns {Object} Environment variables object
 */
function buildEnvironment(options = {}) {
  const env = { ...process.env };
  
  if (options.yoloMode || options.autoApprove) {
    env.CLAUDE_AUTO_APPROVE = 'true';
    env.CLAUDE_SKIP_CONFIRMATION = 'true';
    env.CLAUDE_NON_INTERACTIVE = 'true';
    env.CLAUDE_PERMISSIONS_MODE = 'bypassPermissions';
  }
  
  if (options.autoArchitect) {
    env.CLAUDE_AUTO_ARCHITECT = 'true';
  }
  
  return env;
}

module.exports = {
  buildCommand,
  escapeShellArg,
  buildEnvironment
};