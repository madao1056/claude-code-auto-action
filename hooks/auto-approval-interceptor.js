#!/usr/bin/env node

/**
 * Auto-Approval Interceptor
 * Intercepts all Claude Code approval prompts and uses auto-system settings
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class AutoApprovalInterceptor {
  constructor() {
    this.autoSystemEnabled = true;
    this.settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
    this.loadSettings();
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        // Auto-system always takes priority
        this.autoSystemEnabled = true;
        this.settings = settings;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  shouldAutoApprove(operation) {
    // Always prioritize auto-system over individual settings
    if (!this.autoSystemEnabled) return false;

    // Check operation type
    const { tool, command, filePath } = operation;

    // File operations - always auto-approve unless dangerous
    if (['Edit', 'MultiEdit', 'Write'].includes(tool)) {
      if (this.isDangerousFile(filePath)) {
        return false;
      }
      return true;
    }

    // Bash commands - check for dangerous patterns
    if (tool === 'Bash') {
      if (this.isDangerousCommand(command)) {
        return false;
      }
      return true;
    }

    // n8n operations - check n8n config
    if (this.isN8nOperation(command)) {
      const n8nConfig = this.settings?.n8n || {};
      return n8nConfig.auto_approve !== false;
    }

    // Default to auto-approve
    return true;
  }

  isDangerousFile(filePath) {
    if (!filePath) return false;
    const dangerous = [/\.env/i, /secret/i, /private.*key/i, /\.ssh\//i, /passwd$/i, /shadow$/i];
    return dangerous.some((pattern) => pattern.test(filePath));
  }

  isDangerousCommand(command) {
    if (!command) return false;

    // Check if it's a safe command first
    const safePatterns = [
      /^find\s+/,
      /stdio-config\.json/,
      /^grep\s+/,
      /^ls\s+/,
      /^cat\s+/,
      /^echo\s+/,
      /^head\s+/,
      /^tail\s+/,
      /^which\s+/,
      /^whereis\s+/,
    ];

    if (safePatterns.some((pattern) => pattern.test(command))) {
      return false; // Explicitly safe
    }

    const dangerous = [
      /rm\s+-rf\s+\//,
      /sudo\s+rm/,
      /format/i,
      /fdisk/i,
      /dd\s+if=/,
      /:(){ :|:& };:/, // Fork bomb
    ];
    return dangerous.some((pattern) => pattern.test(command));
  }

  isN8nOperation(command) {
    if (!command) return false;
    return /n8n|workflow|api\/v1\/workflows/.test(command);
  }

  intercept() {
    // Override process.stdin to auto-respond
    const originalStdin = process.stdin;
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Monitor for prompts and auto-respond
    process.stdin.on('data', (data) => {
      const text = data.toString();

      // Detect approval prompts
      if (this.isApprovalPrompt(text)) {
        const operation = this.extractOperation(text);
        if (this.shouldAutoApprove(operation)) {
          // Auto-approve
          console.log('\n🤖 Auto-approving operation...');
          process.stdout.write('yes\n');
          return;
        }
      }
    });
  }

  isApprovalPrompt(text) {
    const patterns = [
      /Do you want to proceed\?/i,
      /Are you sure/i,
      /Confirm/i,
      /Continue\?/i,
      /\(y\/n\)/i,
      /yes\/no/i,
    ];
    return patterns.some((pattern) => pattern.test(text));
  }

  extractOperation(text) {
    // Extract operation details from prompt text
    const operation = {
      tool: 'unknown',
      command: '',
      filePath: '',
    };

    if (/Edit|Write|MultiEdit/.test(text)) {
      operation.tool = 'Edit';
      const fileMatch = text.match(/file[:\s]+([^\s]+)/i);
      if (fileMatch) operation.filePath = fileMatch[1];
    } else if (/Bash|command/i.test(text)) {
      operation.tool = 'Bash';
      operation.command = text;
    }

    return operation;
  }
}

// Main execution
if (require.main === module) {
  const interceptor = new AutoApprovalInterceptor();

  // Export for use by Claude
  if (process.env.CLAUDE_HOOK_MODE === 'check') {
    // Check mode - return approval decision
    const operation = JSON.parse(process.env.CLAUDE_OPERATION || '{}');
    const shouldApprove = interceptor.shouldAutoApprove(operation);
    process.exit(shouldApprove ? 0 : 1);
  } else {
    // Intercept mode
    interceptor.intercept();
  }
}

module.exports = AutoApprovalInterceptor;
