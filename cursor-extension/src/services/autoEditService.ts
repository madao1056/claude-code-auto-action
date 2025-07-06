import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class AutoEditService {
    private autoResponses: any;
    private pendingEdits: Map<string, string> = new Map();

    constructor() {
        this.loadAutoResponses();
        this.setupEditInterceptor();
    }

    private loadAutoResponses() {
        try {
            const autoResponsePath = path.join(
                process.env.HOME || '',
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

    private setupEditInterceptor() {
        // Override the default showInformationMessage for edit confirmations
        const originalShowInfo = vscode.window.showInformationMessage;
        
        (vscode.window as any).showInformationMessage = async (message: string, ...items: any[]) => {
            // Check if this is an edit confirmation dialog
            if (this.shouldAutoConfirm(message)) {
                console.log(`Auto-confirming: ${message}`);
                
                // Return the positive response
                if (items.includes('Yes')) return 'Yes';
                if (items.includes('yes')) return 'yes';
                if (items.includes('Save')) return 'Save';
                if (items.includes('Apply')) return 'Apply';
                if (items.includes('Continue')) return 'Continue';
                
                // Default to first option
                return items[0];
            }
            
            // Otherwise, show the dialog normally
            return originalShowInfo.apply(vscode.window, [message, ...items]);
        };
    }

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

    public async applyDirectEdit(filePath: string, newContent: string): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('claude');
            
            if (config.get('yoloMode')) {
                // Direct file write in YOLO mode
                fs.writeFileSync(filePath, newContent, 'utf8');
                
                // Force VSCode to reload the file
                const uri = vscode.Uri.file(filePath);
                const doc = vscode.workspace.textDocuments.find(d => d.uri.fsPath === filePath);
                
                if (doc) {
                    // Close and reopen to force reload
                    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    await vscode.window.showTextDocument(uri);
                }
                
                return true;
            } else {
                // Use standard VSCode edit API
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
        } catch (error) {
            console.error('Failed to apply direct edit:', error);
            return false;
        }
    }

    public async handleCursorEditPrompt(): Promise<void> {
        // This method can be called when Cursor shows edit prompts
        // It will automatically click "Yes" or equivalent positive responses
        
        const config = vscode.workspace.getConfiguration('claude');
        if (!config.get('yoloMode')) {
            return;
        }

        // Simulate keyboard input to confirm dialogs
        await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
        
        // Alternative: Send Enter key
        await vscode.commands.executeCommand('type', { text: '\n' });
    }

    public setPendingEdit(filePath: string, content: string) {
        this.pendingEdits.set(filePath, content);
    }

    public async applyPendingEdits(): Promise<void> {
        for (const [filePath, content] of this.pendingEdits) {
            await this.applyDirectEdit(filePath, content);
        }
        this.pendingEdits.clear();
    }
}