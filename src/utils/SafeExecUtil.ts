import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
}

export class SafeExecUtil {
  /**
   * Execute a command with error handling and fallback
   */
  static async execWithFallback<T>(
    command: string,
    fallbackValue: T,
    options?: ExecOptions
  ): Promise<T> {
    try {
      const result = await execAsync(command, options);
      return JSON.parse(result.stdout.toString() || '{}') as T;
    } catch (error) {
      console.warn(`Command failed: ${command}`, error);
      return fallbackValue;
    }
  }

  /**
   * Execute a command and return raw result
   */
  static async execSafe(
    command: string,
    options?: ExecOptions
  ): Promise<ExecResult | null> {
    try {
      const result = await execAsync(command, options);
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString()
      };
    } catch (error) {
      console.error(`Command execution failed: ${command}`, error);
      return null;
    }
  }

  /**
   * Execute a command with retry logic
   */
  static async execWithRetry(
    command: string,
    options?: ExecOptions,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<ExecResult> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await execAsync(command, options);
        return {
          stdout: result.stdout.toString(),
          stderr: result.stderr.toString()
        };
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    throw lastError || new Error(`Command failed after ${maxRetries} retries: ${command}`);
  }
}