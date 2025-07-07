import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for handling automatic edits and confirmations
 */
export class AutoEditService {
    private autoResponses: any;
    private pendingEdits: Map<string, string> = new Map();

    constructor() {
        this.loadAutoResponses();
        this.setupEditInterceptor();
    }

    /**
     * Load auto-response patterns from configuration
     */
    private loadAutoResponses(): void {
        try {
            const autoResponsePath = path.join(
                process.env.HOME || process.env.USERPROFILE || '',
                '.claude',
                'auto-responses.json'
            );
            
            if (fs.existsSync(autoResponsePath)) {
                const content = fs.readFileSync(autoResponsePath, 'utf8');
                this.autoResponses = JSON.parse(content);
            }
        } catch (error) {
            console.error('Failed to load auto-responses:', error);
        }
    }

    /**
     * Setup interceptor for edit confirmation dialogs
     */
    private setupEditInterceptor(): void {
        // Override the default showInformationMessage for edit confirmations
        const originalShowInfo = vscode.window.showInformationMessage;
        
        (vscode.window as any).showInformationMessage = async (message: string, ...args: any[]) => {
            // Check if this is an edit confirmation dialog
            if (this.shouldAutoConfirm(message)) {
                console.log(`Auto-confirming: ${message}`);
                
                // Extract items from args
                const items = args.filter(arg => typeof arg === 'string');
                
                // Return the positive response
                const positiveResponses = ['Yes', 'yes', 'Save', 'Apply', 'Continue'];
                for (const response of positiveResponses) {
                    if (items.includes(response)) {
                        return response;
                    }
                }
                
                // Default to first option
                return items[0];
            }
            
            // Otherwise, show the dialog normally
            return (originalShowInfo as any).call(vscode.window, message, ...args);
        };
    }

    /**
     * Check if a message should be auto-confirmed
     * @param {string} message - Dialog message
     * @returns {boolean} Whether to auto-confirm
     */
    private shouldAutoConfirm(message: string): boolean {
        const config = vscode.workspace.getConfiguration('claude');
        
        // Only auto-confirm in YOLO mode
        if (!config.get('yoloMode')) {
            return false;
        }

        // Check auto-response patterns
        if (this.autoResponses?.responses?.pattern_matches) {
            for (const pattern of this.autoResponses.responses.pattern_matches) {
                if (message.includes(pattern.pattern) && pattern.auto) {
                    return true;
                }
            }
        }

        // Cursor-specific patterns
        const cursorPatterns = [
            'Do you want to make this edit',
            'Save file to continue',
            'Opened changes in Cursor',
            'Apply these changes',
            'Would you like to apply',
            'Confirm edit'
        ];

        return cursorPatterns.some(pattern => 
            message.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    /**
     * Apply an edit directly to a file
     * @param {string} filePath - Path to file
     * @param {string} newContent - New file content
     * @returns {Promise<boolean>} Success status
     */
    public async applyDirectEdit(filePath: string, newContent: string): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('claude');
            
            if (config.get('yoloMode')) {
                // Direct file write in YOLO mode
                await this.writeFileDirectly(filePath, newContent);
                await this.reloadDocument(filePath);
                return true;
            } else {
                // Use standard VSCode edit API
                return await this.applyVSCodeEdit(filePath, newContent);
            }
        } catch (error) {
            console.error('Failed to apply direct edit:', error);
            return false;
        }
    }

    /**
     * Write file directly to filesystem
     * @param {string} filePath - File path
     * @param {string} content - File content
     */
    private async writeFileDirectly(filePath: string, content: string): Promise<void> {
        fs.writeFileSync(filePath, content, 'utf8');
    }

    /**
     * Reload document in VSCode
     * @param {string} filePath - File path
     */
    private async reloadDocument(filePath: string): Promise<void> {
        const uri = vscode.Uri.file(filePath);
        const doc = vscode.workspace.textDocuments.find(d => d.uri.fsPath === filePath);
        
        if (doc) {
            // Close and reopen to force reload
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            await vscode.window.showTextDocument(uri);
        }
    }

    /**
     * Apply edit using VSCode API
     * @param {string} filePath - File path
     * @param {string} newContent - New content
     * @returns {Promise<boolean>} Success status
     */
    private async applyVSCodeEdit(filePath: string, newContent: string): Promise<boolean> {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        
        return await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            editBuilder.replace(fullRange, newContent);
        });
    }

    /**
     * Handle Cursor edit prompts automatically
     */
    public async handleCursorEditPrompt(): Promise<void> {
        const config = vscode.workspace.getConfiguration('claude');
        if (!config.get('yoloMode')) {
            return;
        }

        // Simulate keyboard input to confirm dialogs
        await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
        
        // Alternative: Send Enter key
        await vscode.commands.executeCommand('type', { text: '\n' });
    }

    /**
     * Add an edit to pending queue
     * @param {string} filePath - File path
     * @param {string} content - File content
     */
    public setPendingEdit(filePath: string, content: string): void {
        this.pendingEdits.set(filePath, content);
    }

    /**
     * Apply all pending edits
     */
    public async applyPendingEdits(): Promise<void> {
        for (const [filePath, content] of this.pendingEdits) {
            await this.applyDirectEdit(filePath, content);
        }
        this.pendingEdits.clear();
    }
}