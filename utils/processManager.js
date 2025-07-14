/**
 * @module processManager
 * @description Utility module for managing child processes
 */

const { spawn } = require('child_process');

/**
 * Spawn a child process with proper error handling
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {ChildProcess} Child process instance
 */
function spawnProcess(command, args, options = {}) {
  const defaultOptions = {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const childProcess = spawn(command, args, mergedOptions);

  // Add error handling
  childProcess.on('error', (error) => {
    console.error(`Failed to start process ${command}:`, error);
  });

  return childProcess;
}

/**
 * Wait for a process to be ready based on output pattern
 * @param {ChildProcess} process - Child process to monitor
 * @param {RegExp|string} readyPattern - Pattern to match for ready state
 * @param {number} [timeout=30000] - Timeout in milliseconds
 * @returns {Promise<void>}
 */
async function waitForProcessReady(process, readyPattern, timeout = 30000) {
  return new Promise((resolve, reject) => {
    let isReady = false;
    const timeoutId = setTimeout(() => {
      if (!isReady) {
        reject(new Error('Process startup timeout'));
      }
    }, timeout);

    const checkOutput = (data) => {
      const output = data.toString();
      const pattern =
        typeof readyPattern === 'string' ? new RegExp(readyPattern, 'i') : readyPattern;

      if (pattern.test(output)) {
        isReady = true;
        clearTimeout(timeoutId);
        process.stdout.off('data', checkOutput);
        resolve();
      }
    };

    process.stdout.on('data', checkOutput);
  });
}

/**
 * Gracefully shutdown a process
 * @param {ChildProcess} process - Process to shutdown
 * @param {Object} options - Shutdown options
 * @param {string} [options.signal='SIGTERM'] - Signal to send
 * @param {number} [options.timeout=5000] - Grace period before force kill
 * @param {Object} [options.shutdownMessage] - Message to send before shutdown
 * @returns {Promise<void>}
 */
async function gracefulShutdown(process, options = {}) {
  const { signal = 'SIGTERM', timeout = 5000, shutdownMessage = null } = options;

  if (!process || process.killed) {
    return;
  }

  // Send shutdown message if provided
  if (shutdownMessage && process.stdin && !process.stdin.destroyed) {
    try {
      process.stdin.write(JSON.stringify(shutdownMessage) + '\n');
    } catch (error) {
      console.debug('Failed to send shutdown message:', error);
    }
  }

  // Send signal
  process.kill(signal);

  // Set timeout for force kill
  return new Promise((resolve) => {
    const forceKillTimeout = setTimeout(() => {
      if (!process.killed) {
        process.kill('SIGKILL');
      }
      resolve();
    }, timeout);

    process.once('exit', () => {
      clearTimeout(forceKillTimeout);
      resolve();
    });
  });
}

/**
 * Create a process monitor that restarts on failure
 * @param {Function} startProcess - Function that starts the process
 * @param {Object} options - Monitor options
 * @param {number} [options.maxRestarts=3] - Maximum restart attempts
 * @param {number} [options.restartDelay=1000] - Delay between restarts
 * @returns {Object} Monitor control object
 */
function createProcessMonitor(startProcess, options = {}) {
  const { maxRestarts = 3, restartDelay = 1000 } = options;

  let process = null;
  let restartCount = 0;
  let isRunning = false;
  let shouldRestart = true;

  const start = async () => {
    if (isRunning) return;

    isRunning = true;
    process = await startProcess();

    process.on('exit', async (code) => {
      isRunning = false;

      if (shouldRestart && code !== 0 && restartCount < maxRestarts) {
        restartCount++;
        console.log(
          `Process exited with code ${code}. Restarting (${restartCount}/${maxRestarts})...`
        );

        await new Promise((resolve) => setTimeout(resolve, restartDelay));
        start();
      }
    });
  };

  const stop = async () => {
    shouldRestart = false;
    if (process) {
      await gracefulShutdown(process);
    }
  };

  return { start, stop };
}

module.exports = {
  spawnProcess,
  waitForProcessReady,
  gracefulShutdown,
  createProcessMonitor,
};
