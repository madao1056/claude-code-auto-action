import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

const execAsync = promisify(exec);

interface PackageInfo {
  name: string;
  version?: string;
  isDev?: boolean;
  isType?: boolean;
}

interface DependencyAnalysis {
  missing: PackageInfo[];
  unused: string[];
  outdated: Array<{
    name: string;
    current: string;
    latest: string;
    wanted: string;
  }>;
  vulnerabilities: Array<{
    name: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    fixAvailable: boolean;
  }>;
}

export class AutoDependencyManager {
  private projectRoot: string;
  private packageJson: any;
  private importCache: Map<string, Set<string>> = new Map();

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async analyze(): Promise<DependencyAnalysis> {
    await this.loadPackageJson();

    const [missing, unused, outdated, vulnerabilities] = await Promise.all([
      this.findMissingDependencies(),
      this.findUnusedDependencies(),
      this.checkOutdatedDependencies(),
      this.checkVulnerabilities(),
    ]);

    return {
      missing,
      unused,
      outdated,
      vulnerabilities,
    };
  }

  async autoInstallMissing(): Promise<void> {
    const analysis = await this.analyze();

    if (analysis.missing.length === 0) {
      console.log('✅ 依存関係はすべて揃っています');
      return;
    }

    console.log(`📦 ${analysis.missing.length}個の不足パッケージをインストール中...`);

    for (const pkg of analysis.missing) {
      await this.installPackage(pkg);
    }

    console.log('✅ 不足パッケージのインストールが完了しました');
  }

  async cleanUnused(): Promise<void> {
    const analysis = await this.analyze();

    if (analysis.unused.length === 0) {
      console.log('✅ 未使用の依存関係はありません');
      return;
    }

    console.log(`🧹 ${analysis.unused.length}個の未使用パッケージを削除中...`);

    const cmd = `npm uninstall ${analysis.unused.join(' ')}`;
    await execAsync(cmd);

    console.log('✅ 未使用パッケージの削除が完了しました');
  }

  async autoFixVulnerabilities(): Promise<void> {
    const analysis = await this.analyze();
    const fixableVulns = analysis.vulnerabilities.filter((v) => v.fixAvailable);

    if (fixableVulns.length === 0) {
      console.log('✅ 修正可能な脆弱性はありません');
      return;
    }

    console.log(`🔒 ${fixableVulns.length}個の脆弱性を修正中...`);

    try {
      await execAsync('npm audit fix');

      // 強制的な修正が必要な場合
      const remainingVulns = await this.checkVulnerabilities();
      if (remainingVulns.some((v) => v.severity === 'critical' || v.severity === 'high')) {
        console.log('⚠️ 重大な脆弱性が残っています。強制修正を試みます...');
        await execAsync('npm audit fix --force');
      }
    } catch (error) {
      console.error('脆弱性の修正中にエラーが発生しました:', error);
    }
  }

  private async loadPackageJson(): Promise<void> {
    const packagePath = join(this.projectRoot, 'package.json');
    const content = await readFile(packagePath, 'utf-8');
    this.packageJson = JSON.parse(content);
  }

  private async findMissingDependencies(): Promise<PackageInfo[]> {
    const allImports = await this.collectAllImports();
    const installedPackages = new Set([
      ...Object.keys(this.packageJson.dependencies || {}),
      ...Object.keys(this.packageJson.devDependencies || {}),
    ]);

    const missing: PackageInfo[] = [];
    const builtinModules = new Set([
      'fs',
      'path',
      'http',
      'https',
      'crypto',
      'stream',
      'util',
      'os',
      'child_process',
    ]);

    for (const importPath of allImports) {
      const packageName = this.extractPackageName(importPath);

      if (builtinModules.has(packageName) || packageName.startsWith('.')) {
        continue;
      }

      if (!installedPackages.has(packageName)) {
        const isTypeDef = packageName.startsWith('@types/');
        const isDev = await this.isDevDependency(importPath);

        missing.push({
          name: packageName,
          isDev,
          isType: isTypeDef,
        });

        // TypeScript型定義も確認
        if (!isTypeDef && !installedPackages.has(`@types/${packageName}`)) {
          const typesExist = await this.checkIfTypesExist(packageName);
          if (typesExist) {
            missing.push({
              name: `@types/${packageName}`,
              isDev: true,
              isType: true,
            });
          }
        }
      }
    }

    return [...new Map(missing.map((item) => [item.name, item])).values()];
  }

  private async findUnusedDependencies(): Promise<string[]> {
    const allImports = await this.collectAllImports();
    const usedPackages = new Set(Array.from(allImports).map((imp) => this.extractPackageName(imp)));

    const allDependencies = [
      ...Object.keys(this.packageJson.dependencies || {}),
      ...Object.keys(this.packageJson.devDependencies || {}),
    ];

    const unused = allDependencies.filter((dep) => {
      // 一部の特殊なパッケージは除外
      if (
        dep.startsWith('@types/') ||
        dep === 'typescript' ||
        dep === 'eslint' ||
        dep === 'prettier'
      ) {
        return false;
      }

      return !usedPackages.has(dep) && !this.isIndirectlyUsed(dep);
    });

    return unused;
  }

  private async collectAllImports(): Promise<Set<string>> {
    if (this.importCache.size > 0) {
      return new Set(Array.from(this.importCache.values()).flatMap((s) => Array.from(s)));
    }

    const files = await this.getAllSourceFiles();
    const allImports = new Set<string>();

    for (const file of files) {
      const imports = await this.extractImportsFromFile(file);
      this.importCache.set(file, imports);
      imports.forEach((imp) => allImports.add(imp));
    }

    return allImports;
  }

  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

    async function walkDir(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
            await walkDir(fullPath);
          }
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }

    await walkDir(this.projectRoot);
    return files;
  }

  private async extractImportsFromFile(filePath: string): Promise<Set<string>> {
    const imports = new Set<string>();

    try {
      const content = await readFile(filePath, 'utf-8');

      // Babel parserを使用してAST解析
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
      });

      traverse(ast, {
        ImportDeclaration(path) {
          imports.add(path.node.source.value);
        },
        CallExpression(path) {
          if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'require') {
            const arg = path.node.arguments[0];
            if (arg && arg.type === 'StringLiteral') {
              imports.add(arg.value);
            }
          }
        },
      });
    } catch (error) {
      // パースエラーは無視
    }

    return imports;
  }

  private extractPackageName(importPath: string): string {
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return `${parts[0]}/${parts[1]}`;
    }
    return importPath.split('/')[0];
  }

  private async installPackage(pkg: PackageInfo): Promise<void> {
    const saveFlag = pkg.isDev ? '--save-dev' : '--save';
    const packageName = pkg.version ? `${pkg.name}@${pkg.version}` : pkg.name;

    console.log(`📦 インストール中: ${packageName} ${saveFlag}`);

    try {
      await execAsync(`npm install ${saveFlag} ${packageName}`);
    } catch (error) {
      console.error(`❌ ${packageName} のインストールに失敗しました:`, error);
    }
  }

  private async checkOutdatedDependencies(): Promise<any[]> {
    try {
      const { stdout } = await execAsync('npm outdated --json');
      const outdated = JSON.parse(stdout || '{}');

      return Object.entries(outdated).map(([name, info]: [string, any]) => ({
        name,
        current: info.current,
        wanted: info.wanted,
        latest: info.latest,
      }));
    } catch {
      return [];
    }
  }

  private async checkVulnerabilities(): Promise<any[]> {
    try {
      const { stdout } = await execAsync('npm audit --json');
      const audit = JSON.parse(stdout);

      if (!audit.vulnerabilities) return [];

      return Object.entries(audit.vulnerabilities).map(([name, vuln]: [string, any]) => ({
        name,
        severity: vuln.severity,
        fixAvailable: vuln.fixAvailable,
      }));
    } catch {
      return [];
    }
  }

  private async checkIfTypesExist(packageName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`npm view @types/${packageName}`);
      return !!stdout;
    } catch {
      return false;
    }
  }

  private async isDevDependency(importPath: string): Promise<boolean> {
    // テストファイルやビルドツールからのインポートはdevDependency
    const devPatterns = [
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /webpack/,
      /rollup/,
      /vite/,
      /jest/,
      /eslint/,
      /prettier/,
    ];

    const importingFiles = Array.from(this.importCache.entries())
      .filter(([_, imports]) => imports.has(importPath))
      .map(([file]) => file);

    return importingFiles.some((file) => devPatterns.some((pattern) => pattern.test(file)));
  }

  private isIndirectlyUsed(packageName: string): boolean {
    // 一部のパッケージは直接インポートされなくても使用される
    const indirectPackages = [
      'babel-preset-',
      'eslint-plugin-',
      'prettier-plugin-',
      '@babel/',
      'postcss-',
      'tailwindcss',
    ];

    return indirectPackages.some((prefix) => packageName.startsWith(prefix));
  }
}
