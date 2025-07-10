import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { ESLint } from 'eslint';
import { parse as parseAST } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

interface RefactoringPattern {
  name: string;
  description: string;
  detect: (code: string, ast: any) => RefactoringOpportunity[];
  apply: (code: string, opportunity: RefactoringOpportunity) => string;
  priority: 'high' | 'medium' | 'low';
}

interface RefactoringOpportunity {
  type: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  description: string;
  impact: 'high' | 'medium' | 'low';
  code?: string;
  suggestion?: string;
}

interface DuplicateCode {
  hash: string;
  locations: Array<{
    file: string;
    start: number;
    end: number;
    code: string;
  }>;
  extractable: boolean;
}

export class AutoRefactoringSystem {
  private patterns: RefactoringPattern[] = [];
  private projectRoot: string;
  private duplicateThreshold = 30; // 最小重複行数
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.registerDefaultPatterns();
  }
  
  private registerDefaultPatterns() {
    // 重複コードの検出
    this.patterns.push({
      name: 'duplicate-code',
      description: '重複コードを共通関数に抽出',
      priority: 'high',
      detect: this.detectDuplicateCode.bind(this),
      apply: this.extractDuplicateCode.bind(this)
    });
    
    // 長いメソッドの分割
    this.patterns.push({
      name: 'long-method',
      description: '長いメソッドを小さな関数に分割',
      priority: 'medium',
      detect: this.detectLongMethods.bind(this),
      apply: this.splitLongMethod.bind(this)
    });
    
    // 複雑な条件式の簡略化
    this.patterns.push({
      name: 'complex-condition',
      description: '複雑な条件式を読みやすく改善',
      priority: 'medium',
      detect: this.detectComplexConditions.bind(this),
      apply: this.simplifyCondition.bind(this)
    });
    
    // 未使用コードの削除
    this.patterns.push({
      name: 'dead-code',
      description: '未使用の変数や関数を削除',
      priority: 'low',
      detect: this.detectDeadCode.bind(this),
      apply: this.removeDeadCode.bind(this)
    });
    
    // インポートの最適化
    this.patterns.push({
      name: 'optimize-imports',
      description: 'インポート文を整理・最適化',
      priority: 'low',
      detect: this.detectUnoptimizedImports.bind(this),
      apply: this.optimizeImports.bind(this)
    });
  }
  
  async analyzeProject(): Promise<RefactoringOpportunity[]> {
    const opportunities: RefactoringOpportunity[] = [];
    const files = await this.getSourceFiles();
    
    console.log(`🔍 ${files.length}個のファイルを分析中...`);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileOpportunities = await this.analyzeFile(file, content);
      opportunities.push(...fileOpportunities);
    }
    
    // 重複コードの検出（プロジェクト全体）
    const duplicates = await this.findDuplicateCodeAcrossFiles(files);
    opportunities.push(...this.convertDuplicatesToOpportunities(duplicates));
    
    return opportunities;
  }
  
  private async analyzeFile(filePath: string, content: string): Promise<RefactoringOpportunity[]> {
    const opportunities: RefactoringOpportunity[] = [];
    
    try {
      const ast = parseAST(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy']
      });
      
      for (const pattern of this.patterns) {
        const detected = pattern.detect(content, ast);
        opportunities.push(...detected);
      }
    } catch (error) {
      console.warn(`Failed to analyze ${filePath}:`, error);
    }
    
    return opportunities;
  }
  
  private detectDuplicateCode(code: string, ast: any): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const functionBodies: Map<string, any[]> = new Map();
    
    traverse(ast, {
      FunctionDeclaration(path) {
        const bodyCode = generate(path.node.body).code;
        const hash = this.hashCode(bodyCode);
        
        if (!functionBodies.has(hash)) {
          functionBodies.set(hash, []);
        }
        functionBodies.get(hash)!.push(path.node);
      },
      ArrowFunctionExpression(path) {
        if (path.node.body.type === 'BlockStatement') {
          const bodyCode = generate(path.node.body).code;
          const hash = this.hashCode(bodyCode);
          
          if (!functionBodies.has(hash)) {
            functionBodies.set(hash, []);
          }
          functionBodies.get(hash)!.push(path.node);
        }
      }
    });
    
    // 重複を検出
    for (const [hash, nodes] of functionBodies) {
      if (nodes.length > 1) {
        opportunities.push({
          type: 'duplicate-code',
          location: {
            start: { line: nodes[0].loc.start.line, column: nodes[0].loc.start.column },
            end: { line: nodes[0].loc.end.line, column: nodes[0].loc.end.column }
          },
          description: `${nodes.length}箇所で同じコードが重複しています`,
          impact: 'high'
        });
      }
    }
    
    return opportunities;
  }
  
  private detectLongMethods(code: string, ast: any): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const MAX_LINES = 50;
    
    traverse(ast, {
      FunctionDeclaration(path) {
        const startLine = path.node.loc.start.line;
        const endLine = path.node.loc.end.line;
        const lineCount = endLine - startLine;
        
        if (lineCount > MAX_LINES) {
          opportunities.push({
            type: 'long-method',
            location: {
              start: { line: startLine, column: path.node.loc.start.column },
              end: { line: endLine, column: path.node.loc.end.column }
            },
            description: `メソッドが${lineCount}行と長すぎます（推奨: ${MAX_LINES}行以下）`,
            impact: 'medium'
          });
        }
      }
    });
    
    return opportunities;
  }
  
  private detectComplexConditions(code: string, ast: any): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    
    traverse(ast, {
      IfStatement(path) {
        const complexity = this.calculateConditionComplexity(path.node.test);
        
        if (complexity > 3) {
          opportunities.push({
            type: 'complex-condition',
            location: {
              start: { line: path.node.loc.start.line, column: path.node.loc.start.column },
              end: { line: path.node.test.loc.end.line, column: path.node.test.loc.end.column }
            },
            description: `条件式が複雑です（複雑度: ${complexity}）`,
            impact: 'medium'
          });
        }
      }
    });
    
    return opportunities;
  }
  
  private detectDeadCode(code: string, ast: any): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const declaredVars = new Set<string>();
    const usedVars = new Set<string>();
    
    traverse(ast, {
      VariableDeclarator(path) {
        if (path.node.id.type === 'Identifier') {
          declaredVars.add(path.node.id.name);
        }
      },
      Identifier(path) {
        if (path.isReferencedIdentifier()) {
          usedVars.add(path.node.name);
        }
      }
    });
    
    // 未使用の変数を検出
    for (const varName of declaredVars) {
      if (!usedVars.has(varName) && !varName.startsWith('_')) {
        opportunities.push({
          type: 'dead-code',
          location: {
            start: { line: 0, column: 0 }, // 実際の位置は後で特定
            end: { line: 0, column: 0 }
          },
          description: `未使用の変数: ${varName}`,
          impact: 'low'
        });
      }
    }
    
    return opportunities;
  }
  
  private detectUnoptimizedImports(code: string, ast: any): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const imports: Map<string, string[]> = new Map();
    
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (!imports.has(source)) {
          imports.set(source, []);
        }
        
        path.node.specifiers.forEach(spec => {
          if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
            imports.get(source)!.push(spec.imported.name);
          }
        });
      }
    });
    
    // 同じモジュールから複数回インポートしているケースを検出
    let hasUnoptimizedImports = false;
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        const allImports = imports.get(source) || [];
        if (allImports.length > 1 && path.node.specifiers.length < allImports.length) {
          hasUnoptimizedImports = true;
        }
      }
    });
    
    if (hasUnoptimizedImports) {
      opportunities.push({
        type: 'optimize-imports',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 10, column: 0 } // インポート部分の推定範囲
        },
        description: 'インポート文を統合・整理できます',
        impact: 'low'
      });
    }
    
    return opportunities;
  }
  
  private calculateConditionComplexity(node: any): number {
    let complexity = 0;
    
    const countComplexity = (n: any) => {
      if (!n) return;
      
      if (n.type === 'LogicalExpression') {
        complexity++;
        countComplexity(n.left);
        countComplexity(n.right);
      } else if (n.type === 'BinaryExpression') {
        complexity++;
      } else if (n.type === 'UnaryExpression' && n.operator === '!') {
        complexity++;
      }
    };
    
    countComplexity(node);
    return complexity;
  }
  
  async applyRefactoring(opportunity: RefactoringOpportunity, filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const pattern = this.patterns.find(p => p.name === opportunity.type);
    
    if (!pattern) {
      console.error(`Unknown refactoring type: ${opportunity.type}`);
      return;
    }
    
    const refactoredCode = pattern.apply(content, opportunity);
    fs.writeFileSync(filePath, refactoredCode);
    
    console.log(`✅ ${pattern.description} を適用しました`);
  }
  
  private extractDuplicateCode(code: string, opportunity: RefactoringOpportunity): string {
    // 実際の実装では、重複コードを関数として抽出
    // ここでは簡略化
    return code;
  }
  
  private splitLongMethod(code: string, opportunity: RefactoringOpportunity): string {
    // 長いメソッドを分割する実装
    return code;
  }
  
  private simplifyCondition(code: string, opportunity: RefactoringOpportunity): string {
    // 複雑な条件式を簡略化
    return code;
  }
  
  private removeDeadCode(code: string, opportunity: RefactoringOpportunity): string {
    // 未使用コードを削除
    return code;
  }
  
  private optimizeImports(code: string, opportunity: RefactoringOpportunity): string {
    // インポートを最適化
    const lines = code.split('\n');
    const imports: Map<string, Set<string>> = new Map();
    const importLines: number[] = [];
    
    lines.forEach((line, index) => {
      const importMatch = line.match(/^import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const items = importMatch[1].split(',').map(s => s.trim());
        const source = importMatch[2];
        
        if (!imports.has(source)) {
          imports.set(source, new Set());
        }
        items.forEach(item => imports.get(source)!.add(item));
        importLines.push(index);
      }
    });
    
    // インポートを統合
    const optimizedImports: string[] = [];
    for (const [source, items] of imports) {
      const itemsStr = Array.from(items).sort().join(', ');
      optimizedImports.push(`import { ${itemsStr} } from '${source}';`);
    }
    
    // 元のインポート行を削除して新しいインポートに置き換え
    const newLines = lines.filter((_, index) => !importLines.includes(index));
    newLines.unshift(...optimizedImports);
    
    return newLines.join('\n');
  }
  
  private async findDuplicateCodeAcrossFiles(files: string[]): Promise<DuplicateCode[]> {
    const codeBlocks: Map<string, Array<{ file: string; start: number; end: number; code: string }>> = new Map();
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      // スライディングウィンドウで重複を検出
      for (let i = 0; i < lines.length - this.duplicateThreshold; i++) {
        const block = lines.slice(i, i + this.duplicateThreshold).join('\n');
        const hash = this.hashCode(block);
        
        if (!codeBlocks.has(hash)) {
          codeBlocks.set(hash, []);
        }
        
        codeBlocks.get(hash)!.push({
          file,
          start: i + 1,
          end: i + this.duplicateThreshold,
          code: block
        });
      }
    }
    
    // 重複を抽出
    const duplicates: DuplicateCode[] = [];
    for (const [hash, locations] of codeBlocks) {
      if (locations.length > 1) {
        duplicates.push({
          hash,
          locations,
          extractable: true
        });
      }
    }
    
    return duplicates;
  }
  
  private convertDuplicatesToOpportunities(duplicates: DuplicateCode[]): RefactoringOpportunity[] {
    return duplicates.map(dup => ({
      type: 'duplicate-code',
      location: {
        start: { line: dup.locations[0].start, column: 0 },
        end: { line: dup.locations[0].end, column: 0 }
      },
      description: `${dup.locations.length}箇所で${dup.locations[0].end - dup.locations[0].start}行の重複コード`,
      impact: 'high',
      code: dup.locations[0].code
    }));
  }
  
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
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
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDir(this.projectRoot);
    return files;
  }
  
  private shouldIgnoreDirectory(name: string): boolean {
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next'];
    return ignoreDirs.includes(name);
  }
  
  async generateReport(opportunities: RefactoringOpportunity[]): Promise<string> {
    let report = '# リファクタリング分析レポート\n\n';
    report += `生成日時: ${new Date().toLocaleString()}\n\n`;
    
    report += '## サマリー\n';
    report += `- 検出された改善機会: ${opportunities.length}件\n`;
    report += `- 高優先度: ${opportunities.filter(o => o.impact === 'high').length}件\n`;
    report += `- 中優先度: ${opportunities.filter(o => o.impact === 'medium').length}件\n`;
    report += `- 低優先度: ${opportunities.filter(o => o.impact === 'low').length}件\n\n`;
    
    const byType = new Map<string, RefactoringOpportunity[]>();
    opportunities.forEach(o => {
      if (!byType.has(o.type)) {
        byType.set(o.type, []);
      }
      byType.get(o.type)!.push(o);
    });
    
    report += '## 詳細\n';
    for (const [type, opps] of byType) {
      report += `\n### ${type}\n`;
      opps.forEach((o, index) => {
        report += `${index + 1}. ${o.description}\n`;
        report += `   位置: ${o.location.start.line}行目\n`;
        report += `   影響度: ${o.impact}\n`;
      });
    }
    
    return report;
  }
}