/**
 * @module commands
 * @description Command registration for Claude Code Integration
 */

import * as vscode from 'vscode';
import { ClaudeCodeService } from '../services/claudeCodeService';
import { AutoEditService } from '../services/autoEditService';
import { getSettings, updateSetting } from '../utils/settingsManager';
import { formatCostDisplay } from '../utils/costTracker';

export interface Services {
  claudeService: ClaudeCodeService;
  autoEditService: AutoEditService;
  taskProvider: any;
  historyProvider: any;
}

/**
 * Register all extension commands
 * @param {Services} services - Service instances
 * @param {vscode.ExtensionContext} context - Extension context
 * @returns {vscode.Disposable[]} Array of disposables
 */
export function registerCommands(
  services: Services,
  context: vscode.ExtensionContext
): vscode.Disposable[] {
  const commands: vscode.Disposable[] = [];

  // Ask Question Command
  commands.push(
    vscode.commands.registerCommand('claude.askQuestion', async () => {
      await handleAskQuestion(services.claudeService);
    })
  );

  // Auto Commit Command
  commands.push(
    vscode.commands.registerCommand('claude.autoCommit', async () => {
      await handleAutoCommit(services.claudeService);
    })
  );

  // Toggle YOLO Mode Command
  commands.push(
    vscode.commands.registerCommand('claude.toggleYoloMode', async () => {
      await handleToggleYoloMode(services.claudeService);
    })
  );

  // Compact Context Command
  commands.push(
    vscode.commands.registerCommand('claude.compactContext', async () => {
      await handleCompactContext(services.claudeService);
    })
  );

  // Show Cost Command
  commands.push(
    vscode.commands.registerCommand('claude.showCost', async () => {
      await handleShowCost(services.claudeService);
    })
  );

  // Generate Tests Command
  commands.push(
    vscode.commands.registerCommand('claude.generateTests', async () => {
      await handleGenerateTests(services.claudeService);
    })
  );

  // Optimize Code Command
  commands.push(
    vscode.commands.registerCommand('claude.optimizeCode', async () => {
      await handleOptimizeCode(services.claudeService);
    })
  );

  // Explain Code Command
  commands.push(
    vscode.commands.registerCommand('claude.explainCode', async () => {
      await handleExplainCode(services.claudeService);
    })
  );

  // Auto Apply Edits Command
  commands.push(
    vscode.commands.registerCommand('claude.autoApplyEdits', async () => {
      await handleAutoApplyEdits(services.autoEditService);
    })
  );

  // Direct Edit Command
  commands.push(
    vscode.commands.registerCommand(
      'claude.directEdit',
      async (filePath: string, content: string) => {
        await handleDirectEdit(services.autoEditService, filePath, content);
      }
    )
  );

  // Fix Errors Command
  commands.push(
    vscode.commands.registerCommand('claude.fixErrors', async () => {
      await handleFixErrors(services.claudeService);
    })
  );

  return commands;
}

/**
 * Handle ask question command
 */
async function handleAskQuestion(claudeService: ClaudeCodeService): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor');
    return;
  }

  const selection = editor.document.getText(editor.selection);
  const question = await vscode.window.showInputBox({
    prompt: 'What would you like to ask Claude about this code?',
    placeHolder: 'e.g., Explain this function, optimize this code, find bugs...',
  });

  if (question) {
    try {
      const response = await claudeService.askQuestion(question, selection);
      vscode.window.showInformationMessage(`Claude: ${response}`);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to ask Claude: ${error.message}`);
    }
  }
}

/**
 * Handle auto commit command
 */
async function handleAutoCommit(claudeService: ClaudeCodeService): Promise<void> {
  try {
    await claudeService.autoCommit();
    vscode.window.showInformationMessage('Changes committed successfully!');
  } catch (error: any) {
    vscode.window.showErrorMessage(`Commit failed: ${error.message}`);
  }
}

/**
 * Handle toggle YOLO mode command
 */
async function handleToggleYoloMode(claudeService: ClaudeCodeService): Promise<void> {
  const settings = getSettings();
  const newMode = !settings.yoloMode;

  await updateSetting('yoloMode', newMode);
  claudeService.setYoloMode(newMode);

  vscode.window.showInformationMessage(
    `YOLO Mode ${newMode ? 'enabled' : 'disabled'}. ${newMode ? '⚠️ Auto-permissions active!' : '✅ Safe mode restored.'}`
  );
}

/**
 * Handle compact context command
 */
async function handleCompactContext(claudeService: ClaudeCodeService): Promise<void> {
  const strategy = await vscode.window.showQuickPick(['dot_points', 'summary', 'code_only'], {
    placeHolder: 'Select compaction strategy',
  });

  if (strategy) {
    try {
      await claudeService.compactContext(strategy);
      vscode.window.showInformationMessage('Context compacted!');
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to compact context: ${error.message}`);
    }
  }
}

/**
 * Handle show cost command
 */
async function handleShowCost(claudeService: ClaudeCodeService): Promise<void> {
  const cost = await claudeService.getCurrentCost();
  const settings = getSettings();
  const limit = settings.costLimit || 8;

  vscode.window.showInformationMessage(formatCostDisplay(cost, limit));
}

/**
 * Handle generate tests command
 */
async function handleGenerateTests(claudeService: ClaudeCodeService): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor');
    return;
  }

  try {
    const code = editor.document.getText();
    const tests = await claudeService.generateTests(code, editor.document.languageId);

    // Create test file
    const testUri = vscode.Uri.file(editor.document.uri.fsPath.replace(/\.(\w+)$/, '.test.$1'));

    await vscode.workspace.fs.writeFile(testUri, Buffer.from(tests));
    await vscode.window.showTextDocument(testUri);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to generate tests: ${error.message}`);
  }
}

/**
 * Handle optimize code command
 */
async function handleOptimizeCode(claudeService: ClaudeCodeService): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor');
    return;
  }

  try {
    const code = editor.document.getText();
    const optimized = await claudeService.optimizeCode(code, editor.document.languageId);
    const settings = getSettings();

    // In YOLO mode, save directly without edit confirmation
    if (settings.yoloMode) {
      const uri = editor.document.uri;
      await vscode.workspace.fs.writeFile(uri, Buffer.from(optimized));

      // Reload the document to reflect changes
      await vscode.commands.executeCommand('workbench.action.files.revert');
    } else {
      await editor.edit((editBuilder) => {
        const fullRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(code.length)
        );
        editBuilder.replace(fullRange, optimized);
      });
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to optimize code: ${error.message}`);
  }
}

/**
 * Handle explain code command
 */
async function handleExplainCode(claudeService: ClaudeCodeService): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor');
    return;
  }

  try {
    const selection = editor.document.getText(editor.selection);
    const explanation = await claudeService.explainCode(selection);

    const panel = vscode.window.createWebviewPanel(
      'claudeExplanation',
      'Code Explanation',
      vscode.ViewColumn.Beside,
      {}
    );

    panel.webview.html = getWebviewContent(explanation);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to explain code: ${error.message}`);
  }
}

/**
 * Handle auto apply edits command
 */
async function handleAutoApplyEdits(autoEditService: AutoEditService): Promise<void> {
  await autoEditService.applyPendingEdits();
  vscode.window.showInformationMessage('Pending edits applied!');
}

/**
 * Handle direct edit command
 */
async function handleDirectEdit(
  autoEditService: AutoEditService,
  filePath: string,
  content: string
): Promise<void> {
  const success = await autoEditService.applyDirectEdit(filePath, content);
  if (success) {
    vscode.window.showInformationMessage('Edit applied directly!');
  } else {
    vscode.window.showErrorMessage('Failed to apply edit');
  }
}

/**
 * Handle fix errors command
 */
async function handleFixErrors(claudeService: ClaudeCodeService): Promise<void> {
  const diagnostics = vscode.languages.getDiagnostics();
  const errors: string[] = [];

  diagnostics.forEach(([uri, diags]) => {
    diags.forEach((diag) => {
      if (diag.severity === vscode.DiagnosticSeverity.Error) {
        errors.push(`${uri.fsPath}:${diag.range.start.line + 1} - ${diag.message}`);
      }
    });
  });

  if (errors.length === 0) {
    vscode.window.showInformationMessage('No errors found!');
    return;
  }

  try {
    const fixes = await claudeService.fixErrors(errors);
    vscode.window.showInformationMessage(`Claude suggests ${fixes.length} fixes`);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to get error fixes: ${error.message}`);
  }
}

/**
 * Get webview content for explanations
 */
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
