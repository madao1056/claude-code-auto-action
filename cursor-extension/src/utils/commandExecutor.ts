/**
 * @module commandExecutor
 * @description Utility module for executing Claude commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ClaudeSettings } from './settingsManager';

const execAsync = promisify(exec);

export interface CommandOptions {
  yoloMode?: boolean;
  model?: string;
  nonInteractive?: boolean;
  autoApprove?: boolean;
  timeout?: number;
}

/**
 * Build Claude command with appropriate flags
 * @param {string} baseCommand - Base command to execute
 * @param {CommandOptions} options - Command options
 * @returns {string} Complete command with flags
 */
export function buildCommand(baseCommand: string, options: CommandOptions = {}): string {
  const flags: string[] = [];
  
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
 * Execute a Claude command
 * @param {string} command - Command to execute
 * @param {CommandOptions} options - Command options
 * @returns {Promise<{stdout: string, stderr: string}>} Command output
 */
export async function executeCommand(
  command: string,
  options: CommandOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const fullCommand = buildCommand(command, options);
  const timeout = options.timeout || 120000; // 2 minutes default
  
  // Ensure auto-system environment variables are set for VSCode execution
  const env = {
    ...process.env,
    CLAUDE_AUTO_SYSTEM_PRIORITY: 'true',
    CLAUDE_USE_AUTO_SYSTEM: 'true',
    CLAUDE_AUTO_APPROVE: 'true',
    CLAUDE_SKIP_CONFIRMATION: 'true',
    CLAUDE_NON_INTERACTIVE: 'true'
  };
  
  try {
    const result = await execAsync(fullCommand, { timeout, env });
    return result;
  } catch (error: any) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

/**
 * Escape string for use in command
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Build Claude command from settings
 * @param {string} baseCommand - Base command
 * @param {ClaudeSettings} settings - Extension settings
 * @returns {string} Command with flags from settings
 */
export function buildCommandFromSettings(
  baseCommand: string,
  settings: ClaudeSettings
): string {
  return buildCommand(baseCommand, {
    yoloMode: settings.yoloMode,
    model: settings.preferredModel,
    autoApprove: settings.yoloMode
  });
}