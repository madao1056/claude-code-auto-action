import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ClaudeCodeService {
    private context: vscode.ExtensionContext;
    private yoloMode: boolean = false;
    private contextUsage: number = 0;
    private dailyCost: number = 0;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadState();
    }

    private async loadState() {
        this.yoloMode = this.context.workspaceState.get('yoloMode', false);
        this.dailyCost = this.context.workspaceState.get('dailyCost', 0);
        const today = new Date().toDateString();
        const lastReset = this.context.workspaceState.get('lastCostReset', '');
        if (today !== lastReset) {
            this.dailyCost = 0;
            await this.context.workspaceState.update('dailyCost', 0);
            await this.context.workspaceState.update('lastCostReset', today);
        }
    }

    enableYoloMode() {
        this.yoloMode = true;
        this.context.workspaceState.update('yoloMode', true);
    }

    setYoloMode(enabled: boolean) {
        this.yoloMode = enabled;
        this.context.workspaceState.update('yoloMode', enabled);
    }

    async compactContext(strategy: string): Promise<void> {
        try {
            const cmd = this.buildCommand(`claude /compact summary=${strategy}`);
            await execAsync(cmd);
        } catch (error) {
            throw new Error(`Failed to compact context: ${error}`);
        }
    }

    async getCurrentCost(): Promise<number> {
        return this.dailyCost;
    }

    async getContextUsage(): Promise<number> {
        try {
            const { stdout } = await execAsync(this.buildCommand('claude /cost --json'));
            const data = JSON.parse(stdout);
            this.contextUsage = data.contextUsage || 0;
            this.dailyCost = data.dailyCost || 0;
            await this.context.workspaceState.update('dailyCost', this.dailyCost);
            return this.contextUsage;
        } catch (error) {
            console.error('Failed to get context usage:', error);
            return 0;
        }
    }

    private buildCommand(baseCmd: string): string {
        const flags = [];
        if (this.yoloMode) {
            flags.push('--dangerously-skip-permissions');
        }
        const config = vscode.workspace.getConfiguration('claude');
        const model = config.get('preferredModel', 'sonnet');
        flags.push(`--model ${model}`);
        
        return `${baseCmd} ${flags.join(' ')}`;
    }

    async askQuestion(question: string, code: string): Promise<string> {
        try {
            const escapedCode = code.replace(/"/g, '\\"').replace(/\n/g, '\\n');
            const cmd = this.buildCommand(`claude "${question}\n\nCode:\n${escapedCode}"`);
            const { stdout } = await execAsync(cmd);
            await this.trackCost(stdout.length);
            return stdout.trim();
        } catch (error) {
            throw new Error(`Failed to ask Claude: ${error}`);
        }
    }

    async autoCommit(): Promise<void> {
        try {
            const cmd = this.buildCommand('claude "Create a git commit with appropriate message based on current changes"');
            const { stdout, stderr } = await execAsync(cmd);
            if (stderr) {
                throw new Error(stderr);
            }
            console.log('Commit successful:', stdout);
            await this.trackCost(stdout.length);
        } catch (error) {
            throw new Error(`Auto commit failed: ${error}`);
        }
    }

    async generateTests(code: string, language: string): Promise<string> {
        try {
            const escapedCode = code.replace(/"/g, '\\"').replace(/\n/g, '\\n');
            const cmd = this.buildCommand(
                `claude "Generate comprehensive unit tests with 90%+ coverage for this ${language} code:\n${escapedCode}"`
            );
            const { stdout } = await execAsync(cmd);
            await this.trackCost(stdout.length);
            return stdout;
        } catch (error) {
            throw new Error(`Failed to generate tests: ${error}`);
        }
    }

    async optimizeCode(code: string, language: string): Promise<string> {
        try {
            const escapedCode = code.replace(/"/g, '\\"').replace(/\n/g, '\\n');
            const cmd = this.buildCommand(
                `claude "Optimize this ${language} code for performance and readability:\n${escapedCode}"`
            );
            const { stdout } = await execAsync(cmd);
            await this.trackCost(stdout.length);
            return stdout;
        } catch (error) {
            throw new Error(`Failed to optimize code: ${error}`);
        }
    }

    async explainCode(code: string): Promise<string> {
        try {
            const escapedCode = code.replace(/"/g, '\\"').replace(/\n/g, '\\n');
            const cmd = this.buildCommand(
                `claude "Explain this code in detail, including its purpose, how it works, and any potential issues:\n${escapedCode}"`
            );
            const { stdout } = await execAsync(cmd);
            await this.trackCost(stdout.length);
            return stdout;
        } catch (error) {
            throw new Error(`Failed to explain code: ${error}`);
        }
    }

    async fixErrors(errors: string[]): Promise<any[]> {
        try {
            const errorList = errors.join('\\n');
            const cmd = this.buildCommand(
                `claude "Suggest fixes for these errors:\n${errorList}\n\nProvide fixes in JSON format."`
            );
            const { stdout } = await execAsync(cmd);
            await this.trackCost(stdout.length);
            return JSON.parse(stdout);
        } catch (error) {
            throw new Error(`Failed to fix errors: ${error}`);
        }
    }

    async getTaskHistory(): Promise<any[]> {
        try {
            const cmd = this.buildCommand('claude /history --json');
            const { stdout } = await execAsync(cmd);
            return JSON.parse(stdout);
        } catch (error) {
            console.error('Failed to get task history:', error);
            return [];
        }
    }

    async getCurrentTasks(): Promise<any[]> {
        try {
            const cmd = this.buildCommand('claude /tasks --json');
            const { stdout } = await execAsync(cmd);
            return JSON.parse(stdout);
        } catch (error) {
            console.error('Failed to get current tasks:', error);
            return [];
        }
    }

    private async trackCost(outputLength: number) {
        // Rough estimation: ~$0.000003 per token (assuming ~4 chars per token)
        const estimatedTokens = outputLength / 4;
        const estimatedCost = estimatedTokens * 0.000003;
        this.dailyCost += estimatedCost;
        await this.context.workspaceState.update('dailyCost', this.dailyCost);
        
        // Check daily limit
        const config = vscode.workspace.getConfiguration('claude');
        const limit = config.get('costLimit', 8);
        if (this.dailyCost > limit) {
            vscode.window.showErrorMessage(
                `Daily cost limit ($${limit}) exceeded! Current: $${this.dailyCost.toFixed(2)}`
            );
        }
    }
}