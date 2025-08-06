const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { performance } = require('perf_hooks');

class WorkerExecutor {
  constructor(workerId, poolConfig) {
    this.workerId = workerId;
    this.poolConfig = poolConfig;
    this.tasksExecuted = 0;
    this.startTime = Date.now();

    // Set up message handling
    parentPort.on('message', this.handleMessage.bind(this));

    // Send ready signal
    this.sendMessage({ type: 'worker_ready' });

    console.log(`Worker ${workerId} initialized`);
  }

  handleMessage(message) {
    switch (message.type) {
      case 'execute_task':
        this.executeTask(message.task);
        break;
      case 'terminate':
        this.terminate();
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  async executeTask(task) {
    const startTime = performance.now();

    try {
      console.log(`Worker ${this.workerId}: Starting task ${task.id} (${task.type})`);

      let result;

      switch (task.type) {
        case 'file_processing':
          result = await this.processFile(task.payload);
          break;
        case 'code_analysis':
          result = await this.analyzeCode(task.payload);
          break;
        case 'compilation':
          result = await this.compileCode(task.payload);
          break;
        case 'testing':
          result = await this.runTests(task.payload);
          break;
        case 'custom':
          result = await this.executeCustomTask(task.payload);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      this.tasksExecuted++;

      this.sendMessage({
        type: 'task_completed',
        taskId: task.id,
        result: {
          ...result,
          duration,
          workerId: this.workerId,
          completedAt: new Date().toISOString(),
        },
      });

      console.log(`Worker ${this.workerId}: Completed task ${task.id} in ${duration.toFixed(2)}ms`);
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.error(`Worker ${this.workerId}: Task ${task.id} failed:`, error.message);

      this.sendMessage({
        type: 'task_failed',
        taskId: task.id,
        error: {
          message: error.message,
          stack: error.stack,
          duration,
          workerId: this.workerId,
          failedAt: new Date().toISOString(),
        },
      });
    }
  }

  async processFile(payload) {
    const { filePath, operation, options = {} } = payload;

    switch (operation) {
      case 'read':
        return this.readFile(filePath, options);
      case 'write':
        return this.writeFile(filePath, options.content, options);
      case 'analyze':
        return this.analyzeFile(filePath, options);
      case 'transform':
        return this.transformFile(filePath, options);
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  async readFile(filePath, options) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, options.encoding || 'utf8');

      return {
        filePath,
        size: stats.size,
        content: options.includeContent !== false ? content : undefined,
        lineCount: content.split('\n').length,
        encoding: options.encoding || 'utf8',
        lastModified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async writeFile(filePath, content, options) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, options.encoding || 'utf8');
      const stats = fs.statSync(filePath);

      return {
        filePath,
        size: stats.size,
        written: true,
        lastModified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  async analyzeFile(filePath, options) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();

      const analysis = {
        filePath,
        extension: ext,
        size: stats.size,
        lineCount: content.split('\n').length,
        charCount: content.length,
        lastModified: stats.mtime,
      };

      // Language-specific analysis
      if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        analysis.language = 'javascript';
        analysis.functions = this.extractJSFunctions(content);
        analysis.imports = this.extractJSImports(content);
        analysis.exports = this.extractJSExports(content);
      } else if (['.py'].includes(ext)) {
        analysis.language = 'python';
        analysis.functions = this.extractPythonFunctions(content);
        analysis.imports = this.extractPythonImports(content);
      } else if (['.json'].includes(ext)) {
        analysis.language = 'json';
        try {
          analysis.jsonValid = true;
          analysis.jsonData = JSON.parse(content);
        } catch {
          analysis.jsonValid = false;
        }
      }

      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze file ${filePath}: ${error.message}`);
    }
  }

  async transformFile(filePath, options) {
    const { transformation, outputPath } = options;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let transformedContent = content;

      switch (transformation) {
        case 'minify':
          transformedContent = this.minifyContent(content);
          break;
        case 'format':
          transformedContent = this.formatContent(content, path.extname(filePath));
          break;
        case 'lint':
          return this.lintContent(content, filePath);
        default:
          throw new Error(`Unknown transformation: ${transformation}`);
      }

      if (outputPath) {
        fs.writeFileSync(outputPath, transformedContent, 'utf8');
      }

      return {
        originalPath: filePath,
        outputPath,
        transformation,
        originalSize: content.length,
        transformedSize: transformedContent.length,
        content: transformedContent,
      };
    } catch (error) {
      throw new Error(`Failed to transform file ${filePath}: ${error.message}`);
    }
  }

  async analyzeCode(payload) {
    const { code, language, options = {} } = payload;

    const analysis = {
      language,
      lineCount: code.split('\n').length,
      charCount: code.length,
      complexity: this.calculateComplexity(code, language),
      dependencies: this.extractDependencies(code, language),
      functions: this.extractFunctions(code, language),
      issues: options.checkIssues ? this.findCodeIssues(code, language) : [],
    };

    return analysis;
  }

  async compileCode(payload) {
    const { sourcePath, outputPath, language, options = {} } = payload;

    try {
      let compileCommand;

      switch (language) {
        case 'typescript':
          compileCommand = `npx tsc ${sourcePath} ${outputPath ? `--outFile ${outputPath}` : ''}`;
          break;
        case 'javascript':
          // Use babel or webpack for JS compilation
          compileCommand = `npx babel ${sourcePath} ${outputPath ? `--out-file ${outputPath}` : ''}`;
          break;
        case 'scss':
        case 'sass':
          compileCommand = `npx sass ${sourcePath} ${outputPath || sourcePath.replace(/\.(scss|sass)$/, '.css')}`;
          break;
        default:
          throw new Error(`Compilation not supported for language: ${language}`);
      }

      const output = execSync(compileCommand, {
        encoding: 'utf8',
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory || process.cwd(),
      });

      return {
        success: true,
        sourcePath,
        outputPath,
        language,
        output: output.trim(),
        compiledAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        sourcePath,
        language,
        error: error.message,
        stderr: error.stderr?.toString(),
        compiledAt: new Date().toISOString(),
      };
    }
  }

  async runTests(payload) {
    const { testPath, framework, options = {} } = payload;

    try {
      let testCommand;

      switch (framework) {
        case 'jest':
          testCommand = `npx jest ${testPath} --json`;
          break;
        case 'mocha':
          testCommand = `npx mocha ${testPath} --reporter json`;
          break;
        case 'vitest':
          testCommand = `npx vitest run ${testPath} --reporter=json`;
          break;
        default:
          throw new Error(`Testing framework not supported: ${framework}`);
      }

      const output = execSync(testCommand, {
        encoding: 'utf8',
        timeout: options.timeout || 60000,
        cwd: options.workingDirectory || process.cwd(),
      });

      let testResults;
      try {
        testResults = JSON.parse(output);
      } catch {
        testResults = { rawOutput: output };
      }

      return {
        success: true,
        testPath,
        framework,
        results: testResults,
        testedAt: new Date().toISOString(),
      };
    } catch (error) {
      let testResults = { error: error.message };

      // Try to parse JSON error output
      if (error.stdout) {
        try {
          testResults = JSON.parse(error.stdout);
        } catch {
          testResults.rawOutput = error.stdout;
        }
      }

      return {
        success: false,
        testPath,
        framework,
        results: testResults,
        error: error.message,
        testedAt: new Date().toISOString(),
      };
    }
  }

  async executeCustomTask(payload) {
    const { taskFunction, args = [] } = payload;

    try {
      // Execute custom function
      if (typeof taskFunction === 'string') {
        // If it's a string, evaluate it as a function
        const func = new Function('args', taskFunction);
        return await func(args);
      } else if (typeof taskFunction === 'function') {
        return await taskFunction(...args);
      } else {
        throw new Error('Invalid task function');
      }
    } catch (error) {
      throw new Error(`Custom task execution failed: ${error.message}`);
    }
  }

  // Utility methods for code analysis
  extractJSFunctions(code) {
    const functions = [];

    // Extract function declarations
    const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/g;
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push({ name: match[1], type: 'declaration' });
    }

    // Extract arrow functions
    const arrowRegex = /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/g;
    while ((match = arrowRegex.exec(code)) !== null) {
      functions.push({ name: match[1], type: 'arrow' });
    }

    return functions;
  }

  extractJSImports(code) {
    const imports = [];

    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  extractJSExports(code) {
    const exports = [];

    // Export declarations
    const exportRegex = /export\s+(class|function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;
    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[2]);
    }

    // Default exports
    if (code.includes('export default')) {
      exports.push('default');
    }

    return exports;
  }

  extractPythonFunctions(code) {
    const functions = [];

    const funcRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;
    while ((match = funcRegex.exec(code)) !== null) {
      functions.push({ name: match[1], type: 'function' });
    }

    return functions;
  }

  extractPythonImports(code) {
    const imports = [];

    const importRegex =
      /(?:from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+)?import\s+([a-zA-Z_][a-zA-Z0-9_.,\s]*)/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      if (match[1]) {
        imports.push(match[1]);
      }
      imports.push(...match[2].split(',').map((s) => s.trim()));
    }

    return [...new Set(imports)];
  }

  calculateComplexity(code, language) {
    // Simplified cyclomatic complexity calculation
    const keywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try'];
    let complexity = 1; // Base complexity

    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  extractDependencies(code, language) {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.extractJSImports(code);
      case 'python':
        return this.extractPythonImports(code);
      default:
        return [];
    }
  }

  extractFunctions(code, language) {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.extractJSFunctions(code);
      case 'python':
        return this.extractPythonFunctions(code);
      default:
        return [];
    }
  }

  findCodeIssues(code, language) {
    const issues = [];

    // Basic static analysis issues
    if (code.includes('console.log')) {
      issues.push({ type: 'warning', message: 'Console.log statements found' });
    }

    if (code.includes('TODO') || code.includes('FIXME')) {
      issues.push({ type: 'info', message: 'TODO/FIXME comments found' });
    }

    // Check for long lines
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      if (line.length > 120) {
        issues.push({
          type: 'style',
          message: `Line ${index + 1} exceeds 120 characters`,
          line: index + 1,
        });
      }
    });

    return issues;
  }

  minifyContent(content) {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  formatContent(content, extension) {
    // Basic formatting - in production, you'd use prettier or similar
    switch (extension) {
      case '.json':
        try {
          return JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          return content;
        }
      default:
        // Basic indentation fix
        return content
          .split('\n')
          .map((line) => line.trim())
          .join('\n');
    }
  }

  lintContent(content, filePath) {
    const issues = this.findCodeIssues(content, path.extname(filePath));

    return {
      filePath,
      issues,
      issueCount: issues.length,
      lintedAt: new Date().toISOString(),
    };
  }

  sendMessage(message) {
    if (parentPort) {
      parentPort.postMessage(message);
    }
  }

  terminate() {
    console.log(`Worker ${this.workerId} terminating...`);
    process.exit(0);
  }

  getStats() {
    return {
      workerId: this.workerId,
      tasksExecuted: this.tasksExecuted,
      uptime: Date.now() - this.startTime,
      memory: process.memoryUsage(),
    };
  }
}

// Initialize worker
if (workerData) {
  const executor = new WorkerExecutor(workerData.workerId, workerData.poolConfig);

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error(`Worker ${workerData.workerId} uncaught exception:`, error);
    if (parentPort) {
      parentPort.postMessage({
        type: 'worker_error',
        error: error.message,
        stack: error.stack,
      });
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(`Worker ${workerData.workerId} unhandled rejection:`, reason);
    if (parentPort) {
      parentPort.postMessage({
        type: 'worker_error',
        error: reason.toString(),
      });
    }
  });
} else {
  console.error('Worker started without proper worker data');
  process.exit(1);
}
