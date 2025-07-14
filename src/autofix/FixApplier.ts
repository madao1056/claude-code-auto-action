import * as fs from 'fs';
import { ErrorInfo, FixResult } from '../types/common';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants';

export class FixApplier {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async applyFix(error: ErrorInfo, fixContent: string): Promise<FixResult> {
    try {
      const originalContent = await fs.promises.readFile(error.file, 'utf-8');

      // Apply the fix
      await fs.promises.writeFile(error.file, fixContent, 'utf-8');

      // Count changes
      const changes = this.countChanges(originalContent, fixContent);

      return {
        file: error.file,
        original: originalContent,
        fixed: fixContent,
        changes,
        success: true,
      };
    } catch (err) {
      return {
        file: error.file,
        original: '',
        fixed: '',
        changes: 0,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async applyMultipleFixes(fixes: Array<{ file: string; content: string }>): Promise<FixResult[]> {
    const results: FixResult[] = [];

    // Group fixes by file to avoid conflicts
    const fixesByFile = new Map<string, string>();
    for (const fix of fixes) {
      fixesByFile.set(fix.file, fix.content);
    }

    // Apply fixes
    for (const [file, content] of fixesByFile) {
      try {
        const originalContent = await fs.promises.readFile(file, 'utf-8');
        await fs.promises.writeFile(file, content, 'utf-8');

        results.push({
          file,
          original: originalContent,
          fixed: content,
          changes: this.countChanges(originalContent, content),
          success: true,
        });
      } catch (error) {
        results.push({
          file,
          original: '',
          fixed: '',
          changes: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private countChanges(original: string, fixed: string): number {
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');

    let changes = 0;
    const maxLines = Math.max(originalLines.length, fixedLines.length);

    for (let i = 0; i < maxLines; i++) {
      if (originalLines[i] !== fixedLines[i]) {
        changes++;
      }
    }

    return changes;
  }

  async validateFix(file: string): Promise<boolean> {
    try {
      // Check if file exists and is readable
      await fs.promises.access(file, fs.constants.R_OK);

      // Could add more validation here (e.g., syntax checking)
      return true;
    } catch {
      return false;
    }
  }
}
