const { spawn } = require('child_process');
const { TIMING, PROCESS } = require('./constants');

class ProcessManager {
  constructor() {
    this.processes = new Map();
  }

  /**
   * Spawn a new process with error handling
   * @param {string} command - Command to execute
   * @param {string[]} args - Command arguments
   * @param {Object} options - Spawn options
   * @returns {ChildProcess}
   */
  spawn(command, args = [], options = {}) {
    try {
      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options,
      });

      const processId = Date.now().toString();
      this.processes.set(processId, process);

      // Clean up on exit
      process.on('exit', () => {
        this.processes.delete(processId);
      });

      // Error handling
      process.on('error', (error) => {
        console.error(`Process error for ${command}:`, error.message);
        this.processes.delete(processId);
      });

      return process;
    } catch (error) {
      console.error(`Failed to spawn process ${command}:`, error.message);
      throw error;
    }
  }

  /**
   * Wait for a process to be ready
   * @param {ChildProcess} process - Process to wait for
   * @param {RegExp} readyPattern - Pattern to match for ready state
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>}
   */
  async waitForProcessReady(process, readyPattern, timeout = TIMING.PROCESS_READY_TIMEOUT) {
    return new Promise((resolve) => {
      let isReady = false;
      const timer = setTimeout(() => {
        if (!isReady) {
          console.error('Process startup timeout');
          resolve(false);
        }
      }, timeout);

      const checkOutput = (data) => {
        const output = data.toString();
        if (readyPattern.test(output)) {
          isReady = true;
          clearTimeout(timer);
          resolve(true);
        }
      };

      process.stdout.on('data', checkOutput);
      process.stderr.on('data', checkOutput);
    });
  }

  /**
   * Terminate a process gracefully
   * @param {ChildProcess} process - Process to terminate
   * @param {number} timeout - Grace period before force kill
   * @returns {Promise<void>}
   */
  async terminate(process, timeout = TIMING.CLEANUP_TIMEOUT) {
    if (!process || process.exitCode !== null) {
      return;
    }

    return new Promise((resolve) => {
      let killed = false;

      const forceKill = setTimeout(() => {
        if (!killed && process.exitCode === null) {
          process.kill('SIGKILL');
        }
      }, timeout);

      process.once('exit', () => {
        killed = true;
        clearTimeout(forceKill);
        resolve();
      });

      // Try graceful shutdown first
      process.kill('SIGTERM');
    });
  }

  /**
   * Terminate all managed processes
   * @returns {Promise<void>}
   */
  async terminateAll() {
    const promises = [];
    for (const [, process] of this.processes) {
      promises.push(this.terminate(process));
    }
    await Promise.all(promises);
    this.processes.clear();
  }

  /**
   * Execute a command and return output
   * @param {string} command - Command to execute
   * @param {string[]} args - Command arguments
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
   */
  async execute(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = this.spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('error', reject);

      process.on('exit', (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });
    });
  }
}

module.exports = new ProcessManager();
