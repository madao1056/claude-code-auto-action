import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { parse as parseAST } from '@babel/parser';
import traverse from '@babel/traverse';
import * as marked from 'marked';

interface DocumentationConfig {
  outputDir: string;
  includePrivate: boolean;
  includeExamples: boolean;
  generateTOC: boolean;
  format: 'markdown' | 'html' | 'json';
}

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  responses: Array<{
    status: number;
    description: string;
    schema?: any;
  }>;
}

interface FunctionDoc {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    optional: boolean;
    default?: string;
  }>;
  returns: {
    type: string;
    description: string;
  };
  examples?: string[];
  deprecated?: boolean;
  since?: string;
  see?: string[];
}

interface ClassDoc {
  name: string;
  description: string;
  extends?: string;
  implements?: string[];
  constructors: FunctionDoc[];
  properties: Array<{
    name: string;
    type: string;
    description: string;
    access: 'public' | 'private' | 'protected';
    static?: boolean;
    readonly?: boolean;
  }>;
  methods: FunctionDoc[];
}

export class AutoDocumentationGenerator {
  private projectRoot: string;
  private config: DocumentationConfig;
  private apiEndpoints: APIEndpoint[] = [];
  private classes: Map<string, ClassDoc> = new Map();
  private functions: Map<string, FunctionDoc> = new Map();

  constructor(projectRoot: string, config?: Partial<DocumentationConfig>) {
    this.projectRoot = projectRoot;
    this.config = {
      outputDir: path.join(projectRoot, 'docs'),
      includePrivate: false,
      includeExamples: true,
      generateTOC: true,
      format: 'markdown',
      ...config,
    };

    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async generateAll(): Promise<void> {
    console.log('📚 ドキュメント生成を開始します...');

    await Promise.all([
      this.generateAPIDocumentation(),
      this.generateCodeDocumentation(),
      this.updateREADME(),
      this.generateChangelog(),
    ]);

    if (this.config.generateTOC) {
      await this.generateTableOfContents();
    }

    console.log('✅ ドキュメント生成が完了しました');
  }

  async generateAPIDocumentation(): Promise<void> {
    console.log('🌐 API仕様書を生成中...');

    // Express/FastAPIなどのルートファイルを検索
    const apiFiles = await this.findAPIFiles();

    for (const file of apiFiles) {
      await this.extractAPIEndpoints(file);
    }

    const apiDoc = this.formatAPIDocumentation();
    const outputPath = path.join(this.config.outputDir, 'API.md');
    fs.writeFileSync(outputPath, apiDoc);
  }

  private async findAPIFiles(): Promise<string[]> {
    const files: string[] = [];
    const patterns = [
      '**/routes/**/*.{js,ts}',
      '**/api/**/*.{js,ts}',
      '**/controllers/**/*.{js,ts}',
    ];

    const scanDir = async (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !this.shouldIgnoreDirectory(entry.name)) {
          await scanDir(fullPath);
        } else if (entry.isFile() && this.isAPIFile(fullPath)) {
          files.push(fullPath);
        }
      }
    };

    await scanDir(this.projectRoot);
    return files;
  }

  private isAPIFile(filePath: string): boolean {
    const apiPatterns = ['/routes/', '/api/', '/controllers/', 'router', 'controller'];
    return apiPatterns.some((pattern) => filePath.includes(pattern));
  }

  private async extractAPIEndpoints(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');

    try {
      const ast = parseAST(content, {
        sourceType: 'module',
        plugins: ['typescript', 'decorators-legacy'],
      });

      traverse(ast, {
        CallExpression: (path) => {
          // Express風のルート定義を検出
          if (this.isRouteDefinition(path)) {
            const endpoint = this.extractEndpointInfo(path);
            if (endpoint) {
              this.apiEndpoints.push(endpoint);
            }
          }
        },
        Decorator: (path) => {
          // デコレータベースのAPIを検出（NestJS, FastAPI風）
          if (this.isAPIDecorator(path)) {
            const endpoint = this.extractDecoratorEndpoint(path);
            if (endpoint) {
              this.apiEndpoints.push(endpoint);
            }
          }
        },
      });
    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error);
    }
  }

  private isRouteDefinition(path: any): boolean {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    const callee = path.node.callee;

    return callee.type === 'MemberExpression' && methods.includes(callee.property.name);
  }

  private extractEndpointInfo(path: any): APIEndpoint | null {
    const method = path.node.callee.property.name.toUpperCase();
    const args = path.node.arguments;

    if (args.length < 2) return null;

    const routePath = args[0].value;

    // コメントから説明を抽出
    const description = this.extractCommentDescription(path);

    return {
      method,
      path: routePath,
      description: description || `${method} ${routePath}`,
      parameters: [],
      responses: [
        {
          status: 200,
          description: 'Success',
        },
      ],
    };
  }

  private isAPIDecorator(path: any): boolean {
    const apiDecorators = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Controller', 'Route'];
    return apiDecorators.includes(path.node.expression.callee?.name);
  }

  private extractDecoratorEndpoint(path: any): APIEndpoint | null {
    // デコレータからエンドポイント情報を抽出
    return null; // 実装は省略
  }

  private extractCommentDescription(path: any): string | null {
    // 直前のコメントから説明を抽出
    const comments = path.node.leadingComments;
    if (comments && comments.length > 0) {
      const comment = comments[comments.length - 1].value;
      return comment.trim().replace(/^\*\s*/gm, '');
    }
    return null;
  }

  private formatAPIDocumentation(): string {
    let doc = '# API Documentation\n\n';
    doc += `Generated on: ${new Date().toISOString()}\n\n`;

    if (this.config.generateTOC) {
      doc += '## Table of Contents\n\n';
      const grouped = this.groupEndpointsByPath();
      for (const [base, endpoints] of grouped) {
        doc += `- [${base}](#${base.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()})\n`;
      }
      doc += '\n';
    }

    const grouped = this.groupEndpointsByPath();

    for (const [base, endpoints] of grouped) {
      doc += `## ${base}\n\n`;

      for (const endpoint of endpoints) {
        doc += `### ${endpoint.method} ${endpoint.path}\n\n`;
        doc += `${endpoint.description}\n\n`;

        if (endpoint.parameters.length > 0) {
          doc += '**Parameters:**\n\n';
          doc += '| Name | Type | Required | Description |\n';
          doc += '|------|------|----------|-------------|\n';

          for (const param of endpoint.parameters) {
            doc += `| ${param.name} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description} |\n`;
          }
          doc += '\n';
        }

        doc += '**Responses:**\n\n';
        for (const response of endpoint.responses) {
          doc += `- \`${response.status}\`: ${response.description}\n`;
        }
        doc += '\n---\n\n';
      }
    }

    return doc;
  }

  private groupEndpointsByPath(): Map<string, APIEndpoint[]> {
    const grouped = new Map<string, APIEndpoint[]>();

    for (const endpoint of this.apiEndpoints) {
      const base = endpoint.path.split('/')[1] || 'root';
      if (!grouped.has(base)) {
        grouped.set(base, []);
      }
      grouped.get(base)!.push(endpoint);
    }

    return grouped;
  }

  async generateCodeDocumentation(): Promise<void> {
    console.log('📝 コードドキュメントを生成中...');

    const sourceFiles = await this.getSourceFiles();

    for (const file of sourceFiles) {
      await this.documentSourceFile(file);
    }

    // クラスドキュメントを出力
    const classDoc = this.formatClassDocumentation();
    fs.writeFileSync(path.join(this.config.outputDir, 'classes.md'), classDoc);

    // 関数ドキュメントを出力
    const functionDoc = this.formatFunctionDocumentation();
    fs.writeFileSync(path.join(this.config.outputDir, 'functions.md'), functionDoc);
  }

  private async documentSourceFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');

    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      await this.documentTypeScriptFile(filePath, content);
    } else {
      await this.documentJavaScriptFile(filePath, content);
    }
  }

  private async documentTypeScriptFile(filePath: string, content: string): Promise<void> {
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const classDoc = this.extractClassDocumentation(node, sourceFile);
        if (classDoc) {
          this.classes.set(classDoc.name, classDoc);
        }
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        const funcDoc = this.extractFunctionDocumentation(node, sourceFile);
        if (funcDoc) {
          this.functions.set(funcDoc.name, funcDoc);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private extractClassDocumentation(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile
  ): ClassDoc | null {
    if (!node.name) return null;

    const jsDoc = this.getJSDocComment(node, sourceFile);

    const classDoc: ClassDoc = {
      name: node.name.text,
      description: jsDoc?.description || '',
      constructors: [],
      properties: [],
      methods: [],
    };

    // メンバーを抽出
    node.members.forEach((member) => {
      if (ts.isConstructorDeclaration(member)) {
        const ctorDoc = this.extractConstructorDocumentation(member, sourceFile);
        if (ctorDoc) {
          classDoc.constructors.push(ctorDoc);
        }
      } else if (ts.isPropertyDeclaration(member)) {
        const propDoc = this.extractPropertyDocumentation(member, sourceFile);
        if (propDoc && (this.config.includePrivate || propDoc.access === 'public')) {
          classDoc.properties.push(propDoc);
        }
      } else if (ts.isMethodDeclaration(member)) {
        const methodDoc = this.extractMethodDocumentation(member, sourceFile);
        if (methodDoc && (this.config.includePrivate || !methodDoc.name.startsWith('_'))) {
          classDoc.methods.push(methodDoc);
        }
      }
    });

    return classDoc;
  }

  private extractFunctionDocumentation(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile
  ): FunctionDoc | null {
    if (!node.name) return null;

    const jsDoc = this.getJSDocComment(node, sourceFile);

    const funcDoc: FunctionDoc = {
      name: node.name.text,
      description: jsDoc?.description || '',
      parameters: [],
      returns: {
        type: 'any',
        description: jsDoc?.returns || '',
      },
    };

    // パラメータを抽出
    node.parameters.forEach((param) => {
      if (ts.isIdentifier(param.name)) {
        funcDoc.parameters.push({
          name: param.name.text,
          type: param.type ? this.getTypeString(param.type) : 'any',
          description: jsDoc?.params?.[param.name.text] || '',
          optional: !!param.questionToken,
          default: param.initializer ? param.initializer.getText(sourceFile) : undefined,
        });
      }
    });

    // 戻り値の型を抽出
    if (node.type) {
      funcDoc.returns.type = this.getTypeString(node.type);
    }

    return funcDoc;
  }

  private extractConstructorDocumentation(
    node: ts.ConstructorDeclaration,
    sourceFile: ts.SourceFile
  ): FunctionDoc {
    const jsDoc = this.getJSDocComment(node, sourceFile);

    return {
      name: 'constructor',
      description: jsDoc?.description || '',
      parameters: node.parameters.map((param) => ({
        name: ts.isIdentifier(param.name) ? param.name.text : '',
        type: param.type ? this.getTypeString(param.type) : 'any',
        description: '',
        optional: !!param.questionToken,
      })),
      returns: {
        type: 'void',
        description: '',
      },
    };
  }

  private extractPropertyDocumentation(
    node: ts.PropertyDeclaration,
    sourceFile: ts.SourceFile
  ): any {
    const jsDoc = this.getJSDocComment(node, sourceFile);

    return {
      name: ts.isIdentifier(node.name) ? node.name.text : '',
      type: node.type ? this.getTypeString(node.type) : 'any',
      description: jsDoc?.description || '',
      access: this.getAccessModifier(node),
      static: !!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword),
      readonly: !!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword),
    };
  }

  private extractMethodDocumentation(
    node: ts.MethodDeclaration,
    sourceFile: ts.SourceFile
  ): FunctionDoc | null {
    if (!ts.isIdentifier(node.name)) return null;

    const jsDoc = this.getJSDocComment(node, sourceFile);

    return {
      name: node.name.text,
      description: jsDoc?.description || '',
      parameters: node.parameters.map((param) => ({
        name: ts.isIdentifier(param.name) ? param.name.text : '',
        type: param.type ? this.getTypeString(param.type) : 'any',
        description: '',
        optional: !!param.questionToken,
      })),
      returns: {
        type: node.type ? this.getTypeString(node.type) : 'any',
        description: jsDoc?.returns || '',
      },
    };
  }

  private getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): any {
    const fullText = sourceFile.getFullText();
    const nodeStart = node.getFullStart();
    const nodeText = fullText.substring(nodeStart, node.getStart());

    const jsDocMatch = nodeText.match(/\/\*\*([\s\S]*?)\*\//);
    if (!jsDocMatch) return null;

    const jsDocText = jsDocMatch[1];
    const lines = jsDocText.split('\n').map((line) => line.trim().replace(/^\*\s?/, ''));

    const result: any = {
      description: '',
      params: {},
      returns: '',
    };

    const currentTag = 'description';

    for (const line of lines) {
      if (line.startsWith('@param')) {
        const paramMatch = line.match(/@param\s+(?:\{([^}]+)\}\s+)?(\w+)\s*(.*)/);
        if (paramMatch) {
          const [, type, name, desc] = paramMatch;
          result.params[name] = desc;
        }
      } else if (line.startsWith('@returns') || line.startsWith('@return')) {
        result.returns = line.replace(/@returns?\s*/, '');
      } else if (currentTag === 'description') {
        result.description += line + ' ';
      }
    }

    result.description = result.description.trim();
    return result;
  }

  private getTypeString(type: ts.TypeNode): string {
    // 簡略化された型文字列を返す
    return type.getText();
  }

  private getAccessModifier(node: ts.Node): 'public' | 'private' | 'protected' {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return 'public';

    if (modifiers.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)) return 'private';
    if (modifiers.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private async documentJavaScriptFile(filePath: string, content: string): Promise<void> {
    // JavaScript用の実装（簡略化）
  }

  private formatClassDocumentation(): string {
    let doc = '# Class Documentation\n\n';

    for (const [name, classDoc] of this.classes) {
      doc += `## ${name}\n\n`;
      doc += `${classDoc.description}\n\n`;

      if (classDoc.constructors.length > 0) {
        doc += '### Constructor\n\n';
        for (const ctor of classDoc.constructors) {
          doc += this.formatFunctionSignature(ctor);
        }
      }

      if (classDoc.properties.length > 0) {
        doc += '### Properties\n\n';
        for (const prop of classDoc.properties) {
          doc += `- **${prop.name}**: \`${prop.type}\` - ${prop.description}\n`;
        }
        doc += '\n';
      }

      if (classDoc.methods.length > 0) {
        doc += '### Methods\n\n';
        for (const method of classDoc.methods) {
          doc += this.formatFunctionSignature(method);
        }
      }

      doc += '---\n\n';
    }

    return doc;
  }

  private formatFunctionDocumentation(): string {
    let doc = '# Function Documentation\n\n';

    for (const [name, funcDoc] of this.functions) {
      doc += this.formatFunctionSignature(funcDoc);
      doc += '---\n\n';
    }

    return doc;
  }

  private formatFunctionSignature(func: FunctionDoc): string {
    let doc = `#### ${func.name}\n\n`;
    doc += `${func.description}\n\n`;

    // シグネチャ
    const params = func.parameters
      .map(
        (p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}${p.default ? ` = ${p.default}` : ''}`
      )
      .join(', ');
    doc += `\`\`\`typescript\n${func.name}(${params}): ${func.returns.type}\n\`\`\`\n\n`;

    if (func.parameters.length > 0) {
      doc += '**Parameters:**\n\n';
      for (const param of func.parameters) {
        doc += `- \`${param.name}\`: ${param.type} - ${param.description}\n`;
      }
      doc += '\n';
    }

    if (func.returns.description) {
      doc += `**Returns:** ${func.returns.description}\n\n`;
    }

    if (func.examples && func.examples.length > 0) {
      doc += '**Examples:**\n\n';
      for (const example of func.examples) {
        doc += `\`\`\`javascript\n${example}\n\`\`\`\n\n`;
      }
    }

    return doc;
  }

  async updateREADME(): Promise<void> {
    console.log('📄 README.mdを更新中...');

    const readmePath = path.join(this.projectRoot, 'README.md');
    let readme = '';

    if (fs.existsSync(readmePath)) {
      readme = fs.readFileSync(readmePath, 'utf-8');
    } else {
      readme = this.generateDefaultREADME();
    }

    // ドキュメントセクションを更新
    readme = this.updateDocumentationSection(readme);

    fs.writeFileSync(readmePath, readme);
  }

  private generateDefaultREADME(): string {
    const packageJson = this.loadPackageJson();

    return `# ${packageJson.name || 'Project Name'}

${packageJson.description || 'Project description'}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Documentation

See the [documentation](./docs) for more information.

## License

${packageJson.license || 'MIT'}
`;
  }

  private updateDocumentationSection(readme: string): string {
    const docSection = `
## Documentation

- [API Documentation](./docs/API.md)
- [Class Documentation](./docs/classes.md)
- [Function Documentation](./docs/functions.md)
`;

    if (readme.includes('## Documentation')) {
      return readme.replace(/## Documentation[\s\S]*?(?=##|$)/, docSection + '\n');
    } else {
      const licenseIndex = readme.indexOf('## License');
      if (licenseIndex > -1) {
        return readme.slice(0, licenseIndex) + docSection + '\n' + readme.slice(licenseIndex);
      } else {
        return readme + '\n' + docSection;
      }
    }
  }

  async generateChangelog(): Promise<void> {
    console.log('📋 CHANGELOG.mdを生成中...');

    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
    let changelog = '';

    if (fs.existsSync(changelogPath)) {
      changelog = fs.readFileSync(changelogPath, 'utf-8');
    } else {
      changelog =
        '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }

    // Git履歴から最新の変更を追加
    const latestChanges = await this.getLatestChanges();
    if (latestChanges) {
      changelog = this.prependChanges(changelog, latestChanges);
    }

    fs.writeFileSync(changelogPath, changelog);
  }

  private async getLatestChanges(): Promise<string | null> {
    // Git履歴から変更を取得（簡略化）
    return null;
  }

  private prependChanges(changelog: string, changes: string): string {
    const headerEnd = changelog.indexOf('\n## ');
    if (headerEnd > -1) {
      return changelog.slice(0, headerEnd) + '\n' + changes + '\n' + changelog.slice(headerEnd);
    }
    return changelog + '\n' + changes;
  }

  private async generateTableOfContents(): Promise<void> {
    const tocPath = path.join(this.config.outputDir, 'README.md');

    let toc = '# Documentation\n\n';
    toc += `Generated on: ${new Date().toISOString()}\n\n`;
    toc += '## Table of Contents\n\n';

    const docFiles = fs
      .readdirSync(this.config.outputDir)
      .filter((file) => file.endsWith('.md') && file !== 'README.md');

    for (const file of docFiles) {
      const name = file.replace('.md', '');
      const title = name.charAt(0).toUpperCase() + name.slice(1);
      toc += `- [${title}](./${file})\n`;
    }

    fs.writeFileSync(tocPath, toc);
  }

  private shouldIgnoreDirectory(name: string): boolean {
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next'];
    return ignoreDirs.includes(name);
  }

  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];

    const scanDir = async (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !this.shouldIgnoreDirectory(entry.name)) {
          await scanDir(fullPath);
        } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    const srcPath = path.join(this.projectRoot, 'src');
    if (fs.existsSync(srcPath)) {
      await scanDir(srcPath);
    }

    return files;
  }

  private loadPackageJson(): any {
    const packagePath = path.join(this.projectRoot, 'package.json');
    try {
      return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    } catch {
      return {};
    }
  }
}
