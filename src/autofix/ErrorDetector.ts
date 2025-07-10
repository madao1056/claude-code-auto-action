import { ErrorInfo } from '../types/common';
import { SafeExecUtil } from '../utils/SafeExecUtil';
import { ERROR_MESSAGES } from '../config/constants';

export class ErrorDetector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async detectAllErrors(): Promise<ErrorInfo[]> {
    const errors: ErrorInfo[] = [];
    
    // Run all error detection in parallel
    const [typeErrors, lintErrors, testErrors] = await Promise.all([
      this.detectTypeScriptErrors(),
      this.detectLintErrors(),
      this.detectTestErrors()
    ]);
    
    return [...typeErrors, ...lintErrors, ...testErrors];
  }

  async detectTypeScriptErrors(): Promise<ErrorInfo[]> {
    const result = await SafeExecUtil.execSafe('npx tsc --noEmit --pretty false', {
      cwd: this.projectRoot
    });
    
    if (!result || !result.stdout) return [];
    
    return this.parseTypeScriptErrors(result.stdout);
  }

  async detectLintErrors(): Promise<ErrorInfo[]> {
    const result = await SafeExecUtil.execSafe('npx eslint . --format json', {
      cwd: this.projectRoot
    });
    
    if (!result || !result.stdout) return [];
    
    try {
      const lintResults = JSON.parse(result.stdout);
      return this.parseLintResults(lintResults);
    } catch {
      return [];
    }
  }

  async detectTestErrors(): Promise<ErrorInfo[]> {
    const result = await SafeExecUtil.execSafe('npm test -- --json', {
      cwd: this.projectRoot
    });
    
    if (!result || !result.stdout) return [];
    
    return this.parseTestErrors(result.stdout);
  }

  private parseTypeScriptErrors(output: string): ErrorInfo[] {
    const errors: ErrorInfo[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
      if (match) {
        const [, file, lineStr, columnStr, code, message] = match;
        errors.push({
          type: 'typescript',
          file,
          line: parseInt(lineStr),
          column: parseInt(columnStr),
          message,
          code: `TS${code}`,
          severity: 'error'
        });
      }
    }
    
    return errors;
  }

  private parseLintResults(results: any[]): ErrorInfo[] {
    const errors: ErrorInfo[] = [];
    
    for (const fileResult of results) {
      for (const message of fileResult.messages || []) {
        errors.push({
          type: 'eslint',
          file: fileResult.filePath,
          line: message.line,
          column: message.column,
          message: message.message,
          code: message.ruleId,
          severity: message.severity === 2 ? 'error' : 'warning'
        });
      }
    }
    
    return errors;
  }

  private parseTestErrors(output: string): ErrorInfo[] {
    const errors: ErrorInfo[] = [];
    
    try {
      const testResult = JSON.parse(output);
      if (testResult.testResults) {
        for (const suite of testResult.testResults) {
          if (suite.status === 'failed') {
            errors.push({
              type: 'test',
              file: suite.name,
              message: suite.message || 'Test failed',
              severity: 'error'
            });
          }
        }
      }
    } catch {
      // If JSON parsing fails, try to extract errors from plain text
      if (output.includes('FAIL')) {
        errors.push({
          type: 'test',
          file: 'unknown',
          message: 'Test suite failed',
          severity: 'error'
        });
      }
    }
    
    return errors;
  }
}