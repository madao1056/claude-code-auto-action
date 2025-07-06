import * as vscode from 'vscode';
import { ClaudeCodeService } from '../services/claudeCodeService';

export class TaskProvider implements vscode.TreeDataProvider<TaskItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskItem | undefined | null | void> = new vscode.EventEmitter<TaskItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private claudeService: ClaudeCodeService) {
        // Refresh every 30 seconds
        setInterval(() => this.refresh(), 30000);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TaskItem): Promise<TaskItem[]> {
        if (!element) {
            const tasks = await this.claudeService.getCurrentTasks();
            return tasks.map(task => new TaskItem(
                task.title,
                task.status,
                task.description,
                vscode.TreeItemCollapsibleState.None
            ));
        }
        return [];
    }
}

class TaskItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly status: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} - ${this.status}`;
        this.description = this.status;
        
        // Set icon based on status
        switch (status) {
            case 'completed':
                this.iconPath = new vscode.ThemeIcon('check');
                break;
            case 'in-progress':
                this.iconPath = new vscode.ThemeIcon('sync~spin');
                break;
            case 'pending':
                this.iconPath = new vscode.ThemeIcon('circle-outline');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('question');
        }
    }
}