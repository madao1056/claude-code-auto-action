import * as vscode from 'vscode';
import { ClaudeCodeService } from './services/claudeCodeService';
import { TaskProvider } from './providers/taskProvider';
import { HistoryProvider } from './providers/historyProvider';
import { AutoEditService } from './services/autoEditService';
import { getSettings, updateSetting, onSettingsChanged } from './utils/settingsManager';
import { registerCommands } from './commands';
import { registerFileWatchers } from './fileWatchers';
import { createStatusBar } from './statusBar';

/**
 * Activate the Claude Code Integration extension
 * @param {vscode.ExtensionContext} context - Extension context
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Code Integration is now active!');

    // Initialize services
    const services = initializeServices(context);
    
    // Register providers
    registerProviders(services);
    
    // Register all commands
    const commandDisposables = registerCommands(services, context);
    
    // Register file watchers
    const watcherDisposables = registerFileWatchers(services);
    
    // Create status bar
    const statusBar = createStatusBar(context);
    
    // Start context monitoring
    const contextMonitor = startContextMonitoring(services.claudeService);
    
    // Handle save events
    const saveHandler = registerSaveHandler(services.claudeService);
    
    // Add all disposables
    context.subscriptions.push(
        ...commandDisposables,
        ...watcherDisposables,
        statusBar,
        contextMonitor,
        saveHandler
    );
}

/**
 * Initialize all services
 * @param {vscode.ExtensionContext} context - Extension context
 * @returns {Object} Services object
 */
function initializeServices(context: vscode.ExtensionContext) {
    const claudeService = new ClaudeCodeService(context);
    const taskProvider = new TaskProvider(claudeService);
    const historyProvider = new HistoryProvider(claudeService);
    const autoEditService = new AutoEditService();

    // Initialize YOLO mode if configured
    const settings = getSettings();
    if (settings.yoloMode) {
        claudeService.enableYoloMode();
    }

    return {
        claudeService,
        taskProvider,
        historyProvider,
        autoEditService
    };
}

/**
 * Register tree data providers
 * @param {Object} services - Services object
 */
function registerProviders(services: any) {
    vscode.window.registerTreeDataProvider('claude.tasksView', services.taskProvider);
    vscode.window.registerTreeDataProvider('claude.historyView', services.historyProvider);



}

function getWebviewContent(explanation: string): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Explanation</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                padding: 20px;
                line-height: 1.6;
            }
            pre {
                background-color: #f4f4f4;
                padding: 10px;
                border-radius: 5px;
                overflow-x: auto;
            }
            code {
                font-family: 'Courier New', Courier, monospace;
            }
        </style>
    </head>
    <body>
        <h1>Code Explanation</h1>
        <div>${explanation}</div>
    </body>
    </html>`;
}

/**
 * Start context usage monitoring
 * @param {ClaudeCodeService} claudeService - Claude service instance
 * @returns {vscode.Disposable} Disposable for cleanup
 */
function startContextMonitoring(claudeService: ClaudeCodeService): vscode.Disposable {
    const interval = setInterval(async () => {
        const usage = await claudeService.getContextUsage();
        const settings = getSettings();
        const threshold = settings.contextAutoCompactThreshold || 0.9;
        
        if (usage > threshold) {
            vscode.window.showWarningMessage(
                `Context usage at ${(usage * 100).toFixed(0)}%. Auto-compacting...`
            );
            await claudeService.compactContext('dot_points');
        }
    }, 60000); // Check every minute
    
    return { dispose: () => clearInterval(interval) };
}

/**
 * Register save document handler
 * @param {ClaudeCodeService} claudeService - Claude service instance
 * @returns {vscode.Disposable} Disposable for cleanup
 */
function registerSaveHandler(claudeService: ClaudeCodeService): vscode.Disposable {
    return vscode.workspace.onDidSaveTextDocument(async (document) => {
        const settings = getSettings();
        
        if (settings.autoCommit) {
            // In YOLO mode, skip confirmation
            if (settings.yoloMode) {
                await vscode.commands.executeCommand('claude.autoCommit');
            } else {
                const shouldCommit = await vscode.window.showInformationMessage(
                    'Would you like to commit these changes?',
                    'Yes', 'No'
                );
                
                if (shouldCommit === 'Yes') {
                    await vscode.commands.executeCommand('claude.autoCommit');
                }
            }
        }
    });
}

export function deactivate() {
    console.log('Claude Code Integration deactivated');
}