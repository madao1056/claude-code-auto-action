import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { createHash } from 'crypto';

interface CodePattern {
  id: string;
  pattern: string;
  completion: string;
  language: string;
  frequency: number;
  lastUsed: Date;
  context: {
    beforePattern?: string;
    afterPattern?: string;
    fileType: string;
    projectType?: string;
  };
  metadata: {
    author: string;
    teamShared: boolean;
    description?: string;
    tags: string[];
  };
}

interface UserPreferences {
  preferredPatterns: Map<string, CodePattern>;
  codingStyle: {
    indentation: 'spaces' | 'tabs';
    indentSize: number;
    quotes: 'single' | 'double';
    semicolons: boolean;
    trailingComma: boolean;
  };
  shortcuts: Map<string, string>;
  frequentImports: Map<string, string[]>;
}

interface TeamConventions {
  namingConventions: {
    variables: 'camelCase' | 'snake_case' | 'PascalCase';
    functions: 'camelCase' | 'snake_case' | 'PascalCase';
    classes: 'PascalCase' | 'camelCase';
    files: 'kebab-case' | 'camelCase' | 'snake_case';
  };
  codePatterns: CodePattern[];
  requiredComments: {
    functions: boolean;
    classes: boolean;
    complexLogic: boolean;
  };
}

export class CodeCompletionLearningSystem {
  private dataDir: string;
  private patternsFile: string;
  private preferencesFile: string;
  private conventionsFile: string;
  private patterns: Map<string, CodePattern> = new Map();
  private userPreferences: UserPreferences;
  private teamConventions: TeamConventions | null = null;
  
  constructor(private projectRoot: string) {
    this.dataDir = path.join(projectRoot, '.claude', 'learning', 'completion');
    this.patternsFile = path.join(this.dataDir, 'patterns.json');
    this.preferencesFile = path.join(this.dataDir, 'preferences.json');
    this.conventionsFile = path.join(this.dataDir, 'team-conventions.json');
    
    this.ensureDataDirectory();
    this.loadData();
    
    this.userPreferences = this.loadPreferences();
  }
  
  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  private loadData(): void {
    this.patterns = this.loadPatterns();
    this.teamConventions = this.loadTeamConventions();
  }
  
  private loadPatterns(): Map<string, CodePattern> {
    try {
      if (fs.existsSync(this.patternsFile)) {
        const data = fs.readFileSync(this.patternsFile, 'utf-8');
        const patterns = JSON.parse(data);
        return new Map(Object.entries(patterns));
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    }
    return new Map();
  }
  
  private savePatterns(): void {
    const obj = Object.fromEntries(this.patterns);
    fs.writeFileSync(this.patternsFile, JSON.stringify(obj, null, 2));
  }
  
  private loadPreferences(): UserPreferences {
    try {
      if (fs.existsSync(this.preferencesFile)) {
        const data = fs.readFileSync(this.preferencesFile, 'utf-8');
        const prefs = JSON.parse(data);
        return {
          ...prefs,
          preferredPatterns: new Map(Object.entries(prefs.preferredPatterns || {})),
          shortcuts: new Map(Object.entries(prefs.shortcuts || {})),
          frequentImports: new Map(Object.entries(prefs.frequentImports || {}))
        };
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    
    return {
      preferredPatterns: new Map(),
      codingStyle: {
        indentation: 'spaces',
        indentSize: 2,
        quotes: 'single',
        semicolons: true,
        trailingComma: true
      },
      shortcuts: new Map(),
      frequentImports: new Map()
    };
  }
  
  private savePreferences(): void {
    const prefs = {
      ...this.userPreferences,
      preferredPatterns: Object.fromEntries(this.userPreferences.preferredPatterns),
      shortcuts: Object.fromEntries(this.userPreferences.shortcuts),
      frequentImports: Object.fromEntries(this.userPreferences.frequentImports)
    };
    fs.writeFileSync(this.preferencesFile, JSON.stringify(prefs, null, 2));
  }
  
  private loadTeamConventions(): TeamConventions | null {
    try {
      if (fs.existsSync(this.conventionsFile)) {
        const data = fs.readFileSync(this.conventionsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading team conventions:', error);
    }
    return null;
  }
  
  recordCodePattern(
    code: string, 
    completion: string, 
    context: CodePattern['context'],
    language: string
  ): void {
    const patternId = this.generatePatternId(code, context);
    
    const existing = this.patterns.get(patternId);
    if (existing) {
      existing.frequency++;
      existing.lastUsed = new Date();
    } else {
      const newPattern: CodePattern = {
        id: patternId,
        pattern: code,
        completion,
        language,
        frequency: 1,
        lastUsed: new Date(),
        context,
        metadata: {
          author: this.getCurrentUser(),
          teamShared: false,
          tags: this.extractTags(code, completion)
        }
      };
      this.patterns.set(patternId, newPattern);
    }
    
    this.savePatterns();
  }
  
  private generatePatternId(code: string, context: CodePattern['context']): string {
    const content = `${code}:${context.fileType}:${context.beforePattern || ''}`;
    return createHash('md5').update(content).digest('hex').substring(0, 8);
  }
  
  private getCurrentUser(): string {
    return process.env.USER || process.env.USERNAME || 'unknown';
  }
  
  private extractTags(pattern: string, completion: string): string[] {
    const tags: string[] = [];
    
    // 関数定義
    if (/function|const.*=.*=>|def|func/.test(pattern)) {
      tags.push('function');
    }
    
    // クラス定義
    if (/class|interface|struct/.test(pattern)) {
      tags.push('class');
    }
    
    // インポート文
    if (/import|require|from|include/.test(pattern)) {
      tags.push('import');
    }
    
    // 条件文
    if (/if|switch|case/.test(pattern)) {
      tags.push('conditional');
    }
    
    // ループ
    if (/for|while|foreach|map/.test(pattern)) {
      tags.push('loop');
    }
    
    // エラーハンドリング
    if (/try|catch|except|rescue/.test(pattern)) {
      tags.push('error-handling');
    }
    
    return tags;
  }
  
  getSuggestions(
    currentCode: string,
    cursorPosition: number,
    fileType: string,
    language: string
  ): CodePattern[] {
    const suggestions: CodePattern[] = [];
    
    // コンテキストを抽出
    const beforeCursor = currentCode.substring(Math.max(0, cursorPosition - 100), cursorPosition);
    const afterCursor = currentCode.substring(cursorPosition, Math.min(currentCode.length, cursorPosition + 50));
    
    // パターンマッチング
    for (const [_, pattern] of this.patterns) {
      if (pattern.language !== language) continue;
      if (pattern.context.fileType !== fileType && pattern.context.fileType !== '*') continue;
      
      // パターンが現在のコンテキストに一致するか確認
      if (this.matchesContext(beforeCursor, pattern)) {
        suggestions.push(pattern);
      }
    }
    
    // 頻度とコンテキストの関連性でソート
    suggestions.sort((a, b) => {
      const scoreA = a.frequency * this.getContextScore(beforeCursor, a);
      const scoreB = b.frequency * this.getContextScore(beforeCursor, b);
      return scoreB - scoreA;
    });
    
    return suggestions.slice(0, 10);
  }
  
  private matchesContext(currentContext: string, pattern: CodePattern): boolean {
    // 簡単なパターンマッチング
    const normalizedContext = currentContext.trim().toLowerCase();
    const normalizedPattern = pattern.pattern.toLowerCase();
    
    // 部分一致
    if (normalizedContext.includes(normalizedPattern.substring(0, Math.min(normalizedPattern.length, 20)))) {
      return true;
    }
    
    // キーワードマッチング
    const keywords = this.extractKeywords(normalizedContext);
    const patternKeywords = this.extractKeywords(normalizedPattern);
    
    const matchCount = keywords.filter(k => patternKeywords.includes(k)).length;
    return matchCount >= Math.min(2, patternKeywords.length * 0.5);
  }
  
  private extractKeywords(text: string): string[] {
    // プログラミング言語のキーワードを抽出
    const keywords = text.match(/\b(function|const|let|var|if|for|while|class|import|export|return|async|await)\b/g) || [];
    return [...new Set(keywords)];
  }
  
  private getContextScore(currentContext: string, pattern: CodePattern): number {
    let score = 1.0;
    
    // 最近使用されたパターンは高スコア
    const daysSinceLastUse = (Date.now() - pattern.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUse < 1) score *= 2.0;
    else if (daysSinceLastUse < 7) score *= 1.5;
    else if (daysSinceLastUse > 30) score *= 0.5;
    
    // コンテキストの一致度
    if (pattern.context.beforePattern && currentContext.includes(pattern.context.beforePattern)) {
      score *= 2.0;
    }
    
    return score;
  }
  
  learnFromFile(filePath: string, content: string): void {
    console.log(`📚 ファイルから学習中: ${path.basename(filePath)}`);
    
    const language = this.detectLanguage(filePath);
    const fileType = path.extname(filePath);
    
    // 関数定義を抽出
    const functionPatterns = this.extractFunctionPatterns(content, language);
    for (const { pattern, completion } of functionPatterns) {
      this.recordCodePattern(pattern, completion, { fileType }, language);
    }
    
    // インポート文を抽出
    const imports = this.extractImports(content, language);
    if (imports.length > 0) {
      this.userPreferences.frequentImports.set(filePath, imports);
    }
    
    // コーディングスタイルを学習
    this.learnCodingStyle(content);
    
    this.savePreferences();
  }
  
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.php': 'php',
      '.swift': 'swift',
      '.rs': 'rust'
    };
    
    return languageMap[ext] || 'unknown';
  }
  
  private extractFunctionPatterns(content: string, language: string): Array<{ pattern: string; completion: string }> {
    const patterns: Array<{ pattern: string; completion: string }> = [];
    
    if (language === 'javascript' || language === 'typescript') {
      // Arrow functions
      const arrowFunctions = content.match(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}/g) || [];
      for (const func of arrowFunctions) {
        const match = func.match(/const\s+(\w+)/);
        if (match) {
          patterns.push({
            pattern: `const ${match[1]} = `,
            completion: func
          });
        }
      }
      
      // Regular functions
      const regularFunctions = content.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]+}/g) || [];
      for (const func of regularFunctions) {
        const match = func.match(/function\s+(\w+)/);
        if (match) {
          patterns.push({
            pattern: `function ${match[1]}`,
            completion: func
          });
        }
      }
    }
    
    return patterns;
  }
  
  private extractImports(content: string, language: string): string[] {
    const imports: string[] = [];
    
    if (language === 'javascript' || language === 'typescript') {
      const importMatches = content.match(/import\s+.*\s+from\s+['"][^'"]+['"]/g) || [];
      imports.push(...importMatches);
    } else if (language === 'python') {
      const importMatches = content.match(/(import\s+\w+|from\s+\w+\s+import\s+\w+)/g) || [];
      imports.push(...importMatches);
    }
    
    return imports;
  }
  
  private learnCodingStyle(content: string): void {
    // インデントスタイルを検出
    const hasTab = content.includes('\t');
    const hasDoubleSpace = content.includes('  ');
    const hasFourSpace = content.includes('    ');
    
    if (hasTab) {
      this.userPreferences.codingStyle.indentation = 'tabs';
    } else if (hasFourSpace) {
      this.userPreferences.codingStyle.indentation = 'spaces';
      this.userPreferences.codingStyle.indentSize = 4;
    } else if (hasDoubleSpace) {
      this.userPreferences.codingStyle.indentation = 'spaces';
      this.userPreferences.codingStyle.indentSize = 2;
    }
    
    // クォートスタイルを検出
    const singleQuotes = (content.match(/'/g) || []).length;
    const doubleQuotes = (content.match(/"/g) || []).length;
    
    if (singleQuotes > doubleQuotes * 1.5) {
      this.userPreferences.codingStyle.quotes = 'single';
    } else if (doubleQuotes > singleQuotes * 1.5) {
      this.userPreferences.codingStyle.quotes = 'double';
    }
    
    // セミコロンの使用を検出
    const semicolons = (content.match(/;\s*$/gm) || []).length;
    const lines = content.split('\n').length;
    
    this.userPreferences.codingStyle.semicolons = semicolons > lines * 0.3;
  }
  
  generateSnippet(pattern: CodePattern): string {
    let snippet = pattern.completion;
    
    // コーディングスタイルを適用
    if (this.userPreferences.codingStyle.indentation === 'tabs') {
      snippet = snippet.replace(/  /g, '\t');
    } else {
      const spaces = ' '.repeat(this.userPreferences.codingStyle.indentSize);
      snippet = snippet.replace(/\t/g, spaces);
    }
    
    // クォートスタイルを適用
    if (this.userPreferences.codingStyle.quotes === 'single') {
      snippet = snippet.replace(/"/g, "'");
    } else {
      snippet = snippet.replace(/'/g, '"');
    }
    
    // プレースホルダーを追加
    snippet = this.addPlaceholders(snippet);
    
    return snippet;
  }
  
  private addPlaceholders(snippet: string): string {
    // VSCode風のプレースホルダーを追加
    let placeholderIndex = 1;
    
    // パラメータ
    snippet = snippet.replace(/\b(param\d*|arg\d*)\b/g, (match) => {
      return `\${${placeholderIndex++}:${match}}`;
    });
    
    // TODO コメント
    snippet = snippet.replace(/\/\/\s*TODO/g, `// \${${placeholderIndex++}:TODO}`);
    
    // 関数本体
    snippet = snippet.replace(/{(\s*)}/g, `{$1\${${placeholderIndex++}:// implementation}}$1}`);
    
    return snippet;
  }
  
  sharePattern(patternId: string): void {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.metadata.teamShared = true;
      this.savePatterns();
      console.log(`✅ パターン "${pattern.pattern}" をチームと共有しました`);
    }
  }
  
  importTeamPatterns(teamPatternsPath: string): void {
    try {
      const teamPatterns = JSON.parse(fs.readFileSync(teamPatternsPath, 'utf-8'));
      
      for (const pattern of teamPatterns) {
        if (!this.patterns.has(pattern.id)) {
          this.patterns.set(pattern.id, pattern);
        }
      }
      
      this.savePatterns();
      console.log(`✅ ${teamPatterns.length}個のチームパターンをインポートしました`);
    } catch (error) {
      console.error('チームパターンのインポートに失敗しました:', error);
    }
  }
  
  exportStatistics(): any {
    const stats = {
      totalPatterns: this.patterns.size,
      languageDistribution: new Map<string, number>(),
      tagDistribution: new Map<string, number>(),
      mostUsedPatterns: [],
      codingStyle: this.userPreferences.codingStyle,
      lastUpdated: new Date().toISOString()
    };
    
    // 言語別の統計
    for (const [_, pattern] of this.patterns) {
      const count = stats.languageDistribution.get(pattern.language) || 0;
      stats.languageDistribution.set(pattern.language, count + 1);
      
      // タグ別の統計
      for (const tag of pattern.metadata.tags) {
        const tagCount = stats.tagDistribution.get(tag) || 0;
        stats.tagDistribution.set(tag, tagCount + 1);
      }
    }
    
    // 最も使用されているパターン
    const sortedPatterns = Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    
    stats.mostUsedPatterns = sortedPatterns.map(p => ({
      pattern: p.pattern,
      frequency: p.frequency,
      language: p.language
    }));
    
    return {
      ...stats,
      languageDistribution: Object.fromEntries(stats.languageDistribution),
      tagDistribution: Object.fromEntries(stats.tagDistribution)
    };
  }
  
  cleanup(): void {
    // 古いパターンを削除
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    for (const [id, pattern] of this.patterns) {
      if (pattern.lastUsed.getTime() < thirtyDaysAgo && pattern.frequency < 3) {
        this.patterns.delete(id);
      }
    }
    
    this.savePatterns();
  }
}