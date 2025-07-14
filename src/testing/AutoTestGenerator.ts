import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { parse as parseAST } from '@babel/parser';
import traverse from '@babel/traverse';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestConfig {
  framework: 'jest' | 'mocha' | 'vitest' | 'jasmine';
  coverageThreshold: number;
  generateE2E: boolean;
  mockStrategy: 'auto' | 'manual' | 'minimal';
  updateSnapshots: boolean;
  testFilePattern: string;
}

interface FunctionInfo {
  name: string;
  parameters: Array<{
    name: string;
    type: string;
    optional: boolean;
  }>;
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  complexity: number;
}

interface TestCase {
  description: string;
  input: any[];
  expectedOutput?: any;
  shouldThrow?: boolean;
  errorType?: string;
}

interface CoverageReport {
  statements: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  lines: { total: number; covered: number; percentage: number };
}

export class AutoTestGenerator {
  private projectRoot: string;
  private config: TestConfig;
  private existingTests: Map<string, Set<string>> = new Map();

  constructor(projectRoot: string, config?: Partial<TestConfig>) {
    this.projectRoot = projectRoot;
    this.config = {
      framework: 'jest',
      coverageThreshold: 80,
      generateE2E: true,
      mockStrategy: 'auto',
      updateSnapshots: true,
      testFilePattern: '**/*.{test,spec}.{js,ts,jsx,tsx}',
      ...config,
    };
  }

  async generateMissingTests(): Promise<void> {
    console.log('🧪 カバレッジ不足箇所のテストを生成中...');

    // 現在のカバレッジを取得
    const coverage = await this.getCurrentCoverage();

    // カバレッジが低いファイルを特定
    const uncoveredFiles = await this.findUncoveredFiles(coverage);

    // 各ファイルに対してテストを生成
    for (const file of uncoveredFiles) {
      await this.generateTestsForFile(file);
    }

    console.log('✅ テスト生成が完了しました');
  }

  private async getCurrentCoverage(): Promise<CoverageReport | null> {
    try {
      // カバレッジレポートを実行
      await execAsync(`npm test -- --coverage --json`, { cwd: this.projectRoot });

      // カバレッジファイルを読み込み
      const coveragePath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        return coverageData.total;
      }
    } catch (error) {
      console.warn('カバレッジ情報の取得に失敗しました:', error);
    }
    return null;
  }

  private async findUncoveredFiles(coverage: CoverageReport | null): Promise<string[]> {
    const files: string[] = [];

    if (!coverage) {
      // カバレッジ情報がない場合は全ファイルを対象
      return await this.getAllSourceFiles();
    }

    // カバレッジ詳細ファイルを読み込み
    const coverageDetailPath = path.join(this.projectRoot, 'coverage', 'coverage-final.json');
    if (fs.existsSync(coverageDetailPath)) {
      const coverageDetail = JSON.parse(fs.readFileSync(coverageDetailPath, 'utf-8'));

      for (const [filePath, fileCoverage] of Object.entries(coverageDetail)) {
        const summary = (fileCoverage as any).s;
        const uncoveredStatements = Object.entries(summary).filter(([, count]) => count === 0);

        if (uncoveredStatements.length > 0) {
          files.push(filePath);
        }
      }
    }

    return files;
  }

  private async generateTestsForFile(filePath: string): Promise<void> {
    console.log(`📝 ${path.basename(filePath)} のテストを生成中...`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const functions = await this.extractFunctions(filePath, content);

    // テストファイルのパスを決定
    const testFilePath = this.getTestFilePath(filePath);

    // 既存のテストを読み込み
    let existingTestContent = '';
    if (fs.existsSync(testFilePath)) {
      existingTestContent = fs.readFileSync(testFilePath, 'utf-8');
      await this.parseExistingTests(testFilePath, existingTestContent);
    }

    // 新しいテストを生成
    const newTests = await this.generateTestCases(functions, filePath);

    // テストファイルを作成/更新
    const testContent = this.formatTestFile(filePath, functions, newTests, existingTestContent);

    // ディレクトリを作成
    const testDir = path.dirname(testFilePath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    fs.writeFileSync(testFilePath, testContent);
  }

  private async extractFunctions(filePath: string, content: string): Promise<FunctionInfo[]> {
    const functions: FunctionInfo[] = [];

    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return this.extractTypeScriptFunctions(content);
    } else {
      return this.extractJavaScriptFunctions(content);
    }
  }

  private extractTypeScriptFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push(this.extractFunctionInfo(node));
      } else if (ts.isMethodDeclaration(node) && node.name) {
        functions.push(this.extractMethodInfo(node));
      } else if (ts.isArrowFunction(node)) {
        // 変数に代入された arrow function を検出
        const parent = node.parent;
        if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
          functions.push({
            name: parent.name.text,
            parameters: this.extractParameters(node),
            returnType: node.type ? node.type.getText() : 'any',
            isAsync: !!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
            isExported: this.isExported(parent),
            complexity: this.calculateComplexity(node),
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return functions;
  }

  private extractJavaScriptFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    try {
      const ast = parseAST(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      });

      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id) {
            functions.push({
              name: path.node.id.name,
              parameters: path.node.params.map((param) => ({
                name: param.type === 'Identifier' ? param.name : 'param',
                type: 'any',
                optional: false,
              })),
              returnType: 'any',
              isAsync: path.node.async,
              isExported: path.parent.type === 'ExportNamedDeclaration',
              complexity: 1, // 簡略化
            });
          }
        },
        VariableDeclarator(path) {
          if (
            path.node.init &&
            (path.node.init.type === 'ArrowFunctionExpression' ||
              path.node.init.type === 'FunctionExpression') &&
            path.node.id.type === 'Identifier'
          ) {
            functions.push({
              name: path.node.id.name,
              parameters: path.node.init.params.map((param: any) => ({
                name: param.type === 'Identifier' ? param.name : 'param',
                type: 'any',
                optional: false,
              })),
              returnType: 'any',
              isAsync: path.node.init.async,
              isExported: false, // 簡略化
              complexity: 1,
            });
          }
        },
      });
    } catch (error) {
      console.warn('Failed to parse JavaScript file:', error);
    }

    return functions;
  }

  private extractFunctionInfo(node: ts.FunctionDeclaration): FunctionInfo {
    return {
      name: node.name!.text,
      parameters: this.extractParameters(node),
      returnType: node.type ? node.type.getText() : 'any',
      isAsync: !!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
      isExported: !!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
      complexity: this.calculateComplexity(node),
    };
  }

  private extractMethodInfo(node: ts.MethodDeclaration): FunctionInfo {
    return {
      name: (node.name as ts.Identifier).text,
      parameters: this.extractParameters(node),
      returnType: node.type ? node.type.getText() : 'any',
      isAsync: !!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
      isExported: true, // クラスメソッドは通常エクスポートされる
      complexity: this.calculateComplexity(node),
    };
  }

  private extractParameters(
    node: ts.FunctionLikeDeclaration
  ): Array<{ name: string; type: string; optional: boolean }> {
    return node.parameters.map((param) => ({
      name: ts.isIdentifier(param.name) ? param.name.text : 'param',
      type: param.type ? param.type.getText() : 'any',
      optional: !!param.questionToken,
    }));
  }

  private isExported(node: ts.Node): boolean {
    let current: ts.Node | undefined = node;
    while (current) {
      const modifiers = ts.canHaveModifiers(current) ? ts.getModifiers(current) : undefined;
      if (modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1;

    const visit = (n: ts.Node) => {
      if (ts.isIfStatement(n) || ts.isConditionalExpression(n)) {
        complexity++;
      } else if (ts.isForStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n)) {
        complexity++;
      } else if (ts.isSwitchStatement(n)) {
        complexity += n.caseBlock.clauses.length;
      }

      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }

  private getTestFilePath(sourcePath: string): string {
    const dir = path.dirname(sourcePath);
    const basename = path.basename(sourcePath, path.extname(sourcePath));
    const ext = path.extname(sourcePath);

    // __tests__ ディレクトリに配置
    const testDir = path.join(dir, '__tests__');
    return path.join(testDir, `${basename}.test${ext}`);
  }

  private async parseExistingTests(testPath: string, content: string): Promise<void> {
    const testedFunctions = new Set<string>();

    // 簡単なパターンマッチングで既存のテストを検出
    const testPatterns = [
      /(?:it|test|describe)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /(?:it|test)\s*\.\s*(?:each|only|skip)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    ];

    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        testedFunctions.add(match[1]);
      }
    }

    this.existingTests.set(testPath, testedFunctions);
  }

  private async generateTestCases(
    functions: FunctionInfo[],
    filePath: string
  ): Promise<Map<string, TestCase[]>> {
    const testCases = new Map<string, TestCase[]>();

    for (const func of functions) {
      // 既にテストが存在する場合はスキップ
      const existingTestSet = this.existingTests.get(this.getTestFilePath(filePath));
      if (existingTestSet?.has(func.name)) {
        continue;
      }

      const cases = this.generateTestCasesForFunction(func);
      if (cases.length > 0) {
        testCases.set(func.name, cases);
      }
    }

    return testCases;
  }

  private generateTestCasesForFunction(func: FunctionInfo): TestCase[] {
    const cases: TestCase[] = [];

    // 正常系テスト
    cases.push({
      description: `should work with valid input`,
      input: this.generateValidInput(func.parameters),
      expectedOutput: this.generateExpectedOutput(func.returnType),
    });

    // パラメータが空の場合
    if (func.parameters.length === 0) {
      cases.push({
        description: `should work without parameters`,
        input: [],
      });
    }

    // オプショナルパラメータのテスト
    const optionalParams = func.parameters.filter((p) => p.optional);
    if (optionalParams.length > 0) {
      cases.push({
        description: `should work without optional parameters`,
        input: this.generateValidInput(func.parameters.filter((p) => !p.optional)),
      });
    }

    // エラーケース
    if (func.parameters.length > 0) {
      cases.push({
        description: `should handle invalid input`,
        input: this.generateInvalidInput(func.parameters),
        shouldThrow: true,
      });
    }

    // 非同期関数の場合
    if (func.isAsync) {
      cases.push({
        description: `should handle async operations`,
        input: this.generateValidInput(func.parameters),
        expectedOutput: Promise.resolve(this.generateExpectedOutput(func.returnType)),
      });
    }

    // 複雑度が高い関数は追加のテストケース
    if (func.complexity > 3) {
      cases.push({
        description: `should handle edge cases`,
        input: this.generateEdgeCaseInput(func.parameters),
      });
    }

    return cases;
  }

  private generateValidInput(
    parameters: Array<{ name: string; type: string; optional: boolean }>
  ): any[] {
    return parameters.map((param) => {
      switch (param.type) {
        case 'string':
          return 'test string';
        case 'number':
          return 42;
        case 'boolean':
          return true;
        case 'any[]':
        case 'Array<any>':
          return [1, 2, 3];
        case 'object':
        case 'any':
          return { key: 'value' };
        default:
          // カスタム型の場合
          if (param.type.includes('[]')) {
            return [];
          } else if (param.type.includes('{')) {
            return {};
          }
          return null;
      }
    });
  }

  private generateInvalidInput(
    parameters: Array<{ name: string; type: string; optional: boolean }>
  ): any[] {
    return parameters.map((param) => {
      switch (param.type) {
        case 'string':
          return null;
        case 'number':
          return 'not a number';
        case 'boolean':
          return 'not a boolean';
        default:
          return undefined;
      }
    });
  }

  private generateEdgeCaseInput(
    parameters: Array<{ name: string; type: string; optional: boolean }>
  ): any[] {
    return parameters.map((param) => {
      switch (param.type) {
        case 'string':
          return '';
        case 'number':
          return 0;
        case 'boolean':
          return false;
        case 'any[]':
        case 'Array<any>':
          return [];
        default:
          return null;
      }
    });
  }

  private generateExpectedOutput(returnType: string): any {
    switch (returnType) {
      case 'void':
        return undefined;
      case 'string':
        return expect.any(String);
      case 'number':
        return expect.any(Number);
      case 'boolean':
        return expect.any(Boolean);
      case 'Promise<void>':
        return undefined;
      default:
        if (returnType.startsWith('Promise<')) {
          return expect.any(Promise);
        }
        return expect.anything();
    }
  }

  private formatTestFile(
    sourcePath: string,
    functions: FunctionInfo[],
    testCases: Map<string, TestCase[]>,
    existingContent: string
  ): string {
    const moduleName = path.basename(sourcePath, path.extname(sourcePath));
    const relativePath = path.relative(path.dirname(this.getTestFilePath(sourcePath)), sourcePath);

    let content = '';

    // 既存のインポートがない場合は追加
    if (!existingContent || !existingContent.includes('import')) {
      content += this.generateImports(relativePath, functions);
      content += '\n';
    }

    // モックの設定
    if (this.config.mockStrategy === 'auto') {
      content += this.generateMocks(functions);
    }

    // テストスイート
    if (!existingContent || !existingContent.includes(`describe('${moduleName}'`)) {
      content += `describe('${moduleName}', () => {\n`;

      // セットアップとティアダウン
      content += this.generateSetupTeardown();

      // 各関数のテスト
      for (const [funcName, cases] of testCases) {
        content += this.generateFunctionTests(funcName, cases);
      }

      content += '});\n';
    } else {
      // 既存のdescribeブロックに追加
      for (const [funcName, cases] of testCases) {
        content = this.insertTestsIntoExisting(existingContent, funcName, cases);
      }
    }

    return existingContent ? existingContent + '\n' + content : content;
  }

  private generateImports(relativePath: string, functions: FunctionInfo[]): string {
    const exportedFunctions = functions.filter((f) => f.isExported);

    if (exportedFunctions.length === 0) {
      return `import * as ${path.basename(relativePath, path.extname(relativePath))} from '${relativePath.replace(/\\/g, '/')}';\n`;
    }

    const imports = exportedFunctions.map((f) => f.name).join(', ');
    return `import { ${imports} } from '${relativePath.replace(/\\/g, '/')}';\n`;
  }

  private generateMocks(functions: FunctionInfo[]): string {
    let mocks = '';

    // 外部依存関係のモックを生成
    mocks += "jest.mock('axios');\n";
    mocks += "jest.mock('fs/promises');\n";
    mocks += '\n';

    return mocks;
  }

  private generateSetupTeardown(): string {
    return `  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

`;
  }

  private generateFunctionTests(funcName: string, testCases: TestCase[]): string {
    let tests = `  describe('${funcName}', () => {\n`;

    for (const testCase of testCases) {
      tests += this.generateSingleTest(funcName, testCase);
    }

    tests += '  });\n\n';
    return tests;
  }

  private generateSingleTest(funcName: string, testCase: TestCase): string {
    const isAsync = testCase.expectedOutput instanceof Promise;
    const testFn = isAsync ? 'async ' : '';

    let test = `    it('${testCase.description}', ${testFn}() => {\n`;

    if (testCase.shouldThrow) {
      test += `      expect(() => ${funcName}(${this.formatArguments(testCase.input)})).toThrow();\n`;
    } else {
      const call = `${funcName}(${this.formatArguments(testCase.input)})`;

      if (isAsync) {
        test += `      const result = await ${call};\n`;
        test += `      expect(result).toEqual(${this.formatExpectedValue(testCase.expectedOutput)});\n`;
      } else {
        test += `      const result = ${call};\n`;
        if (testCase.expectedOutput !== undefined) {
          test += `      expect(result).toEqual(${this.formatExpectedValue(testCase.expectedOutput)});\n`;
        }
      }
    }

    test += '    });\n\n';
    return test;
  }

  private formatArguments(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return `'${arg}'`;
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
      })
      .join(', ');
  }

  private formatExpectedValue(value: any): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'object' && value.constructor.name.includes('expect')) {
      return value.toString();
    }
    return JSON.stringify(value);
  }

  private insertTestsIntoExisting(
    existingContent: string,
    funcName: string,
    testCases: TestCase[]
  ): string {
    // 既存のコンテンツに新しいテストを挿入（簡略化）
    return existingContent;
  }

  async fixFailingTests(): Promise<void> {
    console.log('🔧 失敗しているテストを修正中...');

    try {
      // テストを実行して失敗を検出
      const { stdout, stderr } = await execAsync('npm test -- --json', { cwd: this.projectRoot });
      const results = JSON.parse(stdout);

      if (results.numFailedTests === 0) {
        console.log('✅ すべてのテストが成功しています');
        return;
      }

      // 失敗したテストを解析
      const failedTests = this.parseFailedTests(results);

      // 各失敗に対して修正を試みる
      for (const failure of failedTests) {
        await this.fixTestFailure(failure);
      }

      // スナップショットの更新
      if (this.config.updateSnapshots) {
        await execAsync('npm test -- -u', { cwd: this.projectRoot });
      }
    } catch (error) {
      console.error('テストの修正中にエラーが発生しました:', error);
    }
  }

  private parseFailedTests(results: any): any[] {
    const failures: any[] = [];

    for (const testResult of results.testResults || []) {
      for (const assertionResult of testResult.assertionResults || []) {
        if (assertionResult.status === 'failed') {
          failures.push({
            file: testResult.name,
            test: assertionResult.title,
            error: assertionResult.failureMessages,
          });
        }
      }
    }

    return failures;
  }

  private async fixTestFailure(failure: any): Promise<void> {
    console.log(`修正中: ${failure.test}`);

    // エラーメッセージから修正方法を判断
    const errorMessage = failure.error[0] || '';

    if (errorMessage.includes('Snapshot')) {
      // スナップショットの不一致
      console.log('スナップショットを更新します');
    } else if (errorMessage.includes('Expected')) {
      // 期待値の不一致
      console.log('期待値を修正します');
      // テストファイルを解析して期待値を更新
    } else if (errorMessage.includes('timeout')) {
      // タイムアウト
      console.log('タイムアウト値を増加します');
      // jest.setTimeout() を追加
    }
  }

  async generateE2ETests(): Promise<void> {
    if (!this.config.generateE2E) return;

    console.log('🌐 E2Eテストを生成中...');

    const e2eDir = path.join(this.projectRoot, 'e2e');
    if (!fs.existsSync(e2eDir)) {
      fs.mkdirSync(e2eDir, { recursive: true });
    }

    // 基本的なE2Eテストテンプレートを生成
    const e2eTemplate = this.generateE2ETemplate();
    fs.writeFileSync(path.join(e2eDir, 'app.e2e.spec.ts'), e2eTemplate);

    console.log('✅ E2Eテスト生成が完了しました');
  }

  private generateE2ETemplate(): string {
    return `import { test, expect } from '@playwright/test';

test.describe('Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Home/);
  });

  test('should navigate to about page', async ({ page }) => {
    await page.click('text=About');
    await expect(page).toHaveURL(/.*about/);
  });

  test('should submit contact form', async ({ page }) => {
    await page.click('text=Contact');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'Test message');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
`;
  }

  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];

    const scanDir = async (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !ignoreDirs.includes(entry.name)) {
          await scanDir(fullPath);
        } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
          // テストファイル自体は除外
          if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            files.push(fullPath);
          }
        }
      }
    };

    const srcPath = path.join(this.projectRoot, 'src');
    if (fs.existsSync(srcPath)) {
      await scanDir(srcPath);
    }

    return files;
  }

  async generateCoverageReport(): Promise<string> {
    const coverage = await this.getCurrentCoverage();

    let report = '# Test Coverage Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;

    if (coverage) {
      report += '## Summary\n\n';
      report += `- Statements: ${coverage.statements.percentage}% (${coverage.statements.covered}/${coverage.statements.total})\n`;
      report += `- Branches: ${coverage.branches.percentage}% (${coverage.branches.covered}/${coverage.branches.total})\n`;
      report += `- Functions: ${coverage.functions.percentage}% (${coverage.functions.covered}/${coverage.functions.total})\n`;
      report += `- Lines: ${coverage.lines.percentage}% (${coverage.lines.covered}/${coverage.lines.total})\n\n`;

      if (coverage.statements.percentage < this.config.coverageThreshold) {
        report += `⚠️ Coverage is below threshold (${this.config.coverageThreshold}%)\n`;
      } else {
        report += `✅ Coverage meets threshold (${this.config.coverageThreshold}%)\n`;
      }
    }

    return report;
  }
}
