/**
 * @module statusBar
 * @description Status bar management for Claude Code Integration
 */

import * as vscode from 'vscode';
import { getSettings, onSettingsChanged } from './utils/settingsManager';

/**
 * Create and manage the YOLO mode status bar item
 * @param {vscode.ExtensionContext} context - Extension context
 * @returns {vscode.StatusBarItem} Status bar item
 */
export function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  
  statusBarItem.command = 'claude.toggleYoloMode';
  
  // Initial update
  const settings = getSettings();
  updateStatusBar(statusBarItem, settings.yoloMode || false);
  
  // Update on settings change
  const settingsListener = onSettingsChanged((newSettings) => {
    updateStatusBar(statusBarItem, newSettings.yoloMode || false);
  });
  
  // Add listener to disposables
  context.subscriptions.push(settingsListener);
  
  statusBarItem.show();
  
  return statusBarItem;
}

/**
 * Update status bar appearance based on YOLO mode
 * @param {vscode.StatusBarItem} statusBar - Status bar item to update
 * @param {boolean} yoloMode - Whether YOLO mode is enabled
 */
function updateStatusBar(statusBar: vscode.StatusBarItem, yoloMode: boolean): void {
  statusBar.text = yoloMode ? '$(warning) YOLO' : '$(shield) Safe';
  statusBar.tooltip = yoloMode 
    ? 'Claude YOLO Mode: Auto-permissions enabled'
    : 'Claude Safe Mode: Manual permissions required';
  statusBar.backgroundColor = yoloMode 
    ? new vscode.ThemeColor('statusBarItem.warningBackground')
    : undefined;
}