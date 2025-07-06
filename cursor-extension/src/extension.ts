import * as vscode from 'vscode';
import { ClaudeCodeService } from './services/claudeCodeService';
import { TaskProvider } from './providers/taskProvider';
import { HistoryProvider } from './providers/historyProvider';
import { AutoEditService } from './services/autoEditService';

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Code Integration is now active!');

    const claudeService = new ClaudeCodeService(context);
    const taskProvider = new TaskProvider(claudeService);
    const historyProvider = new HistoryProvider(claudeService);
    const autoEditService = new AutoEditService();

    // Initialize YOLO mode if configured
    const config = vscode.workspace.getConfiguration('claude');
    if (config.get('yoloMode')) {
        claudeService.enableYoloMode();
    }

    // Register views
    vscode.window.registerTreeDataProvider('claude.tasksView', taskProvider);
    vscode.window.registerTreeDataProvider('claude.historyView', historyProvider);

    // Register commands
    const askQuestion = vscode.commands.registerCommand('claude.askQuestion', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        const question = await vscode.window.showInputBox({
            prompt: 'What would you like to ask Claude about this code?',
            placeHolder: 'e.g., Explain this function, optimize this code, find bugs...'
        });

        if (question) {
            const response = await claudeService.askQuestion(question, selection);
            vscode.window.showInformationMessage(`Claude: ${response}`);
        }
    });

    const autoCommit = vscode.commands.registerCommand('claude.autoCommit', async () => {
        try {
            await claudeService.autoCommit();
            vscode.window.showInformationMessage('Changes committed successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Commit failed: ${error}`);
        }
    });

    // YOLO mode toggle command
    const toggleYoloMode = vscode.commands.registerCommand('claude.toggleYoloMode', async () => {
        const currentMode = config.get('yoloMode', false);
        await config.update('yoloMode', !currentMode, vscode.ConfigurationTarget.Workspace);
        claudeService.setYoloMode(!currentMode);
        vscode.window.showInformationMessage(
            `YOLO Mode ${!currentMode ? 'enabled' : 'disabled'}. ${!currentMode ? '⚠️ Auto-permissions active!' : '✅ Safe mode restored.'}`
        );
    });

    // Compact context command
    const compactContext = vscode.commands.registerCommand('claude.compactContext', async () => {
        const strategy = await vscode.window.showQuickPick(['dot_points', 'summary', 'code_only'], {
            placeHolder: 'Select compaction strategy'
        });
        if (strategy) {
            await claudeService.compactContext(strategy);
            vscode.window.showInformationMessage('Context compacted!');
        }
    });

    // Cost monitoring command
    const showCost = vscode.commands.registerCommand('claude.showCost', async () => {
        const cost = await claudeService.getCurrentCost();
        const limit = config.get('costLimit', 8);
        vscode.window.showInformationMessage(
            `Today's usage: $${cost.toFixed(2)} / $${limit} (${((cost / limit) * 100).toFixed(0)}%)`
        );
    });

    const generateTests = vscode.commands.registerCommand('claude.generateTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        const code = editor.document.getText();
        const tests = await claudeService.generateTests(code, editor.document.languageId);
        
        // Create test file
        const testUri = vscode.Uri.file(
            editor.document.uri.fsPath.replace(/\.(\w+)$/, '.test.$1')
        );
        
        await vscode.workspace.fs.writeFile(testUri, Buffer.from(tests));
        vscode.window.showTextDocument(testUri);
    });

    const optimizeCode = vscode.commands.registerCommand('claude.optimizeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        const code = editor.document.getText();
        const optimized = await claudeService.optimizeCode(code, editor.document.languageId);
        
        // In YOLO mode, save directly without edit confirmation
        if (config.get('yoloMode')) {
            const uri = editor.document.uri;
            await vscode.workspace.fs.writeFile(uri, Buffer.from(optimized));
            
            // Reload the document to reflect changes
            await vscode.commands.executeCommand('workbench.action.files.revert');
        } else {
            await editor.edit(editBuilder => {
                const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(code.length)
                );
                editBuilder.replace(fullRange, optimized);
            });
        }
    });

    const explainCode = vscode.commands.registerCommand('claude.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        const explanation = await claudeService.explainCode(selection);
        
        const panel = vscode.window.createWebviewPanel(
            'claudeExplanation',
            'Code Explanation',
            vscode.ViewColumn.Beside,
            {}
        );
        
        panel.webview.html = getWebviewContent(explanation);
    });

    // Auto-apply edits command
    const autoApplyEdits = vscode.commands.registerCommand('claude.autoApplyEdits', async () => {
        await autoEditService.applyPendingEdits();
        vscode.window.showInformationMessage('Pending edits applied!');
    });

    // Direct edit command for bypassing confirmations
    const directEdit = vscode.commands.registerCommand('claude.directEdit', async (filePath: string, content: string) => {
        const success = await autoEditService.applyDirectEdit(filePath, content);
        if (success) {
            vscode.window.showInformationMessage('Edit applied directly!');
        } else {
            vscode.window.showErrorMessage('Failed to apply edit');
        }
    });

    const fixErrors = vscode.commands.registerCommand('claude.fixErrors', async () => {
        const diagnostics = vscode.languages.getDiagnostics();
        const errors: string[] = [];
        
        diagnostics.forEach(([uri, diags]) => {
            diags.forEach(diag => {
                if (diag.severity === vscode.DiagnosticSeverity.Error) {
                    errors.push(`${uri.fsPath}:${diag.range.start.line + 1} - ${diag.message}`);
                }
            });
        });

        if (errors.length === 0) {
            vscode.window.showInformationMessage('No errors found!');
            return;
        }

        const fixes = await claudeService.fixErrors(errors);
        vscode.window.showInformationMessage(`Claude suggests ${fixes.length} fixes`);
    });

    // Register file watchers
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    
    fileWatcher.onDidChange(async (uri) => {
        const config = vscode.workspace.getConfiguration('claude');
        
        if (config.get('autoFormat')) {
            await vscode.commands.executeCommand('editor.action.formatDocument');
        }
        
        // Auto-lint on change if enabled
        if (config.get('autoLint')) {
            await vscode.commands.executeCommand('eslint.executeAutofix');
        }
    });

    // Context monitoring
    const contextMonitor = setInterval(async () => {
        const usage = await claudeService.getContextUsage();
        const threshold = config.get('contextAutoCompactThreshold', 0.9);
        
        if (usage > threshold) {
            vscode.window.showWarningMessage(
                `Context usage at ${(usage * 100).toFixed(0)}%. Auto-compacting...`
            );
            await claudeService.compactContext('dot_points');
        }
    }, 60000); // Check every minute

    // Register event handlers
    vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('claude');
        
        if (config.get('autoCommit')) {
            // In YOLO mode, skip confirmation
            if (config.get('yoloMode')) {
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

    // Register status bar item for YOLO mode
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'claude.toggleYoloMode';
    updateStatusBar(statusBarItem, config.get('yoloMode', false));
    statusBarItem.show();

    context.subscriptions.push(
        askQuestion,
        autoCommit,
        generateTests,
        optimizeCode,
        explainCode,
        fixErrors,
        toggleYoloMode,
        compactContext,
        showCost,
        autoApplyEdits,
        directEdit,
        fileWatcher,
        statusBarItem,
        { dispose: () => clearInterval(contextMonitor) }
    );
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

function updateStatusBar(statusBar: vscode.StatusBarItem, yoloMode: boolean) {
    statusBar.text = yoloMode ? '$(warning) YOLO' : '$(shield) Safe';
    statusBar.tooltip = yoloMode 
        ? 'Claude YOLO Mode: Auto-permissions enabled'
        : 'Claude Safe Mode: Manual permissions required';
    statusBar.backgroundColor = yoloMode 
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : undefined;
}

export function deactivate() {
    console.log('Claude Code Integration deactivated');
}