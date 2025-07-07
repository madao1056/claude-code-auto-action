/**
 * @module settingsManager
 * @description Utility module for managing VSCode extension settings
 */

import * as vscode from 'vscode';

export interface ClaudeSettings {
  yoloMode?: boolean;
  autoCommit?: boolean;
  autoFormat?: boolean;
  autoLint?: boolean;
  preferredModel?: string;
  costLimit?: number;
  contextAutoCompactThreshold?: number;
  notifications?: {
    enabled?: boolean;
    desktop?: boolean;
    sounds?: {
      success?: string;
      error?: string;
      warning?: string;
      info?: string;
    };
    types?: string[];
  };
}

/**
 * Get Claude extension settings
 * @returns {ClaudeSettings} Current settings
 */
export function getSettings(): ClaudeSettings {
  const config = vscode.workspace.getConfiguration('claude');
  return {
    yoloMode: config.get('yoloMode', false),
    autoCommit: config.get('autoCommit', false),
    autoFormat: config.get('autoFormat', false),
    autoLint: config.get('autoLint', false),
    preferredModel: config.get('preferredModel', 'sonnet'),
    costLimit: config.get('costLimit', 8),
    contextAutoCompactThreshold: config.get('contextAutoCompactThreshold', 0.9),
    notifications: config.get('notifications', {
      enabled: true,
      desktop: true,
      sounds: {
        success: 'Glass',
        error: 'Basso',
        warning: 'Pop',
        info: 'Pop'
      },
      types: ['all']
    })
  };
}

/**
 * Update a setting value
 * @param {string} key - Setting key
 * @param {any} value - New value
 * @param {vscode.ConfigurationTarget} target - Configuration target
 * @returns {Promise<void>}
 */
export async function updateSetting(
  key: string,
  value: any,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
): Promise<void> {
  const config = vscode.workspace.getConfiguration('claude');
  await config.update(key, value, target);
}

/**
 * Monitor setting changes
 * @param {Function} callback - Callback function for setting changes
 * @returns {vscode.Disposable} Disposable for cleanup
 */
export function onSettingsChanged(
  callback: (settings: ClaudeSettings) => void
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('claude')) {
      callback(getSettings());
    }
  });
}