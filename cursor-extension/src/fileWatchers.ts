/**
 * @module fileWatchers
 * @description File system watchers for Claude Code Integration
 */

import * as vscode from 'vscode';
import { getSettings } from './utils/settingsManager';

export interface Services {
  claudeService: any;
  autoEditService: any;
  taskProvider: any;
  historyProvider: any;
}

/**
 * Register file system watchers
 * @param {Services} services - Service instances
 * @returns {vscode.Disposable[]} Array of disposables
 */
export function registerFileWatchers(services: Services): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Create file watcher for all files
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');

  // Handle file changes
  fileWatcher.onDidChange(async (uri) => {
    await handleFileChange(uri);
  });

  // Handle file creation
  fileWatcher.onDidCreate(async (uri) => {
    await handleFileCreate(uri);
  });

  // Handle file deletion
  fileWatcher.onDidDelete(async (uri) => {
    await handleFileDelete(uri);
  });

  disposables.push(fileWatcher);

  return disposables;
}

/**
 * Handle file change events
 * @param {vscode.Uri} uri - File URI that changed
 */
async function handleFileChange(uri: vscode.Uri): Promise<void> {
  const settings = getSettings();

  // Auto-format on change if enabled
  if (settings.autoFormat) {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document, { preview: false });

    await vscode.commands.executeCommand('editor.action.formatDocument');
    await document.save();
  }

  // Auto-lint on change if enabled
  if (settings.autoLint) {
    // Check if file is JavaScript/TypeScript
    if (uri.fsPath.match(/\.(js|jsx|ts|tsx)$/)) {
      await vscode.commands.executeCommand('eslint.executeAutofix');
    }
  }
}

/**
 * Handle file creation events
 * @param {vscode.Uri} uri - File URI that was created
 */
async function handleFileCreate(uri: vscode.Uri): Promise<void> {
  // Log file creation for debugging
  console.log(`File created: ${uri.fsPath}`);

  // Refresh task and history providers
  vscode.commands.executeCommand('claude.tasksView.refresh');
  vscode.commands.executeCommand('claude.historyView.refresh');
}

/**
 * Handle file deletion events
 * @param {vscode.Uri} uri - File URI that was deleted
 */
async function handleFileDelete(uri: vscode.Uri): Promise<void> {
  // Log file deletion for debugging
  console.log(`File deleted: ${uri.fsPath}`);

  // Refresh task and history providers
  vscode.commands.executeCommand('claude.tasksView.refresh');
  vscode.commands.executeCommand('claude.historyView.refresh');
}
