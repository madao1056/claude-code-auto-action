import * as vscode from 'vscode';
import { executeCommand, buildCommandFromSettings, escapeString } from '../utils/commandExecutor';
import { trackCost, loadCostData } from '../utils/costTracker';
import { getSettings } from '../utils/settingsManager';

/**
 * Service for interacting with Claude CLI
 */
export class ClaudeCodeService {
    private context: vscode.ExtensionContext;
    private yoloMode: boolean = false;
    private contextUsage: number = 0;
    private dailyCost: number = 0;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadState();
    }

    /**
     * Load persisted state from workspace storage
     */
    private async loadState(): Promise<void> {
        this.yoloMode = this.context.workspaceState.get('yoloMode', false);
        const costData = await loadCostData(this.context);
        this.dailyCost = costData.dailyCost;
        this.contextUsage = costData.contextUsage;
    }

    /**
     * Enable YOLO mode
     */
    enableYoloMode(): void {
        this.yoloMode = true;
        this.context.workspaceState.update('yoloMode', true);
    }

    /**
     * Set YOLO mode state
     * @param {boolean} enabled - Whether to enable YOLO mode
     */
    setYoloMode(enabled: boolean): void {
        this.yoloMode = enabled;
        this.context.workspaceState.update('yoloMode', enabled);
    }

    /**
     * Compact context using specified strategy
     * @param {string} strategy - Compaction strategy
     */
    async compactContext(strategy: string): Promise<void> {
        const settings = getSettings();
        const cmd = buildCommandFromSettings(`claude /compact summary=${strategy}`, settings);
        await executeCommand(cmd, { yoloMode: this.yoloMode });
    }

    /**
     * Get current daily cost
     * @returns {Promise<number>} Daily cost amount
     */
    async getCurrentCost(): Promise<number> {
        const costData = await loadCostData(this.context);
        return costData.dailyCost;
    }

    /**
     * Get current context usage percentage
     * @returns {Promise<number>} Context usage (0-1)
     */
    async getContextUsage(): Promise<number> {
        try {
            const settings = getSettings();
            const cmd = buildCommandFromSettings('claude /cost --json', settings);
            const { stdout } = await executeCommand(cmd, { yoloMode: this.yoloMode });
            const data = JSON.parse(stdout);
            
            this.contextUsage = data.contextUsage || 0;
            await this.context.workspaceState.update('contextUsage', this.contextUsage);
            
            if (data.dailyCost) {
                await trackCost(this.context, 0, settings.costLimit);
            }
            
            return this.contextUsage;
        } catch (error) {
            console.error('Failed to get context usage:', error);
            return 0;
        }
    }


    /**
     * Ask Claude a question about code
     * @param {string} question - Question to ask
     * @param {string} code - Code context
     * @returns {Promise<string>} Claude's response
     */
    async askQuestion(question: string, code: string): Promise<string> {
        const settings = getSettings();
        const escapedCode = escapeString(code);
        const cmd = buildCommandFromSettings(
            `claude "${question}\n\nCode:\n${escapedCode}"`,
            settings
        );
        
        const { stdout } = await executeCommand(cmd, { yoloMode: this.yoloMode });
        await trackCost(this.context, stdout.length, settings.costLimit);
        return stdout.trim();
    }

    /**
     * Automatically commit changes with Claude-generated message
     */
    async autoCommit(): Promise<void> {
        const settings = getSettings();
        const cmd = buildCommandFromSettings(
            'claude "Create a git commit with appropriate message based on current changes"',
            settings
        );
        
        const { stdout, stderr } = await executeCommand(cmd, { yoloMode: this.yoloMode });
        if (stderr) {
            throw new Error(stderr);
        }
        
        console.log('Commit successful:', stdout);
        await trackCost(this.context, stdout.length, settings.costLimit);
    }

    /**
     * Generate unit tests for code
     * @param {string} code - Code to test
     * @param {string} language - Programming language
     * @returns {Promise<string>} Generated tests
     */
    async generateTests(code: string, language: string): Promise<string> {
        const settings = getSettings();
        const escapedCode = escapeString(code);
        const cmd = buildCommandFromSettings(
            `claude "Generate comprehensive unit tests with 90%+ coverage for this ${language} code:\n${escapedCode}"`,
            settings
        );
        
        const { stdout } = await executeCommand(cmd, { yoloMode: this.yoloMode });
        await trackCost(this.context, stdout.length, settings.costLimit);
        return stdout;
    }

    /**
     * Optimize code for performance and readability
     * @param {string} code - Code to optimize
     * @param {string} language - Programming language
     * @returns {Promise<string>} Optimized code
     */
    async optimizeCode(code: string, language: string): Promise<string> {
        const settings = getSettings();
        const escapedCode = escapeString(code);
        const cmd = buildCommandFromSettings(
            `claude "Optimize this ${language} code for performance and readability:\n${escapedCode}"`,
            settings
        );
        
        const { stdout } = await executeCommand(cmd, { yoloMode: this.yoloMode });
        await trackCost(this.context, stdout.length, settings.costLimit);
        return stdout;
    }

    /**
     * Get detailed explanation of code
     * @param {string} code - Code to explain
     * @returns {Promise<string>} Explanation
     */
    async explainCode(code: string): Promise<string> {
        const settings = getSettings();
        const escapedCode = escapeString(code);
        const cmd = buildCommandFromSettings(
            `claude "Explain this code in detail, including its purpose, how it works, and any potential issues:\n${escapedCode}"`,
            settings
        );
        
        const { stdout } = await executeCommand(cmd, { yoloMode: this.yoloMode });
        await trackCost(this.context, stdout.length, settings.costLimit);
        return stdout;
    }

    /**
     * Get suggested fixes for errors
     * @param {string[]} errors - List of errors
     * @returns {Promise<any[]>} Suggested fixes
     */
    async fixErrors(errors: string[]): Promise<any[]> {
        const settings = getSettings();
        const errorList = errors.join('\\n');
        const cmd = buildCommandFromSettings(
            `claude "Suggest fixes for these errors:\n${errorList}\n\nProvide fixes in JSON format."`,
            settings
        );
        
        const { stdout } = await executeCommand(cmd, { yoloMode: this.yoloMode });
        await trackCost(this.context, stdout.length, settings.costLimit);
        return JSON.parse(stdout);
    }

    /**
     * Get task history from Claude
     * @returns {Promise<any[]>} Task history
     */
    async getTaskHistory(): Promise<any[]> {
        try {
            const settings = getSettings();
            const cmd = buildCommandFromSettings('claude /history --json', settings);
            const { stdout } = await executeCommand(cmd, { yoloMode: this.yoloMode });
            return JSON.parse(stdout);
        } catch (error) {
            console.error('Failed to get task history:', error);
            return [];
        }
    }

    /**
     * Get current tasks from Claude
     * @returns {Promise<any[]>} Current tasks
     */
    async getCurrentTasks(): Promise<any[]> {
        try {
            const settings = getSettings();
            const cmd = buildCommandFromSettings('claude /tasks --json', settings);
            const { stdout } = await executeCommand(cmd, { yoloMode: this.yoloMode });
            return JSON.parse(stdout);
        } catch (error) {
            console.error('Failed to get current tasks:', error);
            return [];
        }
    }

}