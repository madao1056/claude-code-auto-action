import * as vscode from 'vscode';
import { ClaudeCodeService } from '../services/claudeCodeService';

export class HistoryProvider implements vscode.TreeDataProvider<HistoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HistoryItem | undefined | null | void> = new vscode.EventEmitter<HistoryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HistoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private claudeService: ClaudeCodeService) {
        // Refresh every minute
        setInterval(() => this.refresh(), 60000);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HistoryItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: HistoryItem): Promise<HistoryItem[]> {
        if (!element) {
            const history = await this.claudeService.getTaskHistory();
            return history.map(item => new HistoryItem(
                item.command,
                item.timestamp,
                item.result,
                vscode.TreeItemCollapsibleState.None
            ));
        }
        return [];
    }
}

class HistoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly timestamp: string,
        public readonly result: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        
        const date = new Date(timestamp);
        this.description = date.toLocaleString();
        this.tooltip = `${this.label}\n${this.description}\nResult: ${this.result}`;
        
        // Set icon based on result
        if (result === 'success') {
            this.iconPath = new vscode.ThemeIcon('pass');
        } else if (result === 'error') {
            this.iconPath = new vscode.ThemeIcon('error');
        } else {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }
}