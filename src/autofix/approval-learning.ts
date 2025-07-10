import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

interface ApprovalRecord {
  id: string;
  timestamp: number;
  operation: string;
  command?: string;
  filePath?: string;
  approved: boolean;
  context: {
    fileType?: string;
    projectPath?: string;
    isDangerous: boolean;
    userDecision: 'approve' | 'deny' | 'skip';
  };
}

interface ApprovalPattern {
  pattern: string;
  type: 'command' | 'file' | 'operation';
  autoApprove: boolean;
  confidence: number;
  usageCount: number;
  lastUsed: number;
  createdAt: number;
}

interface LearningConfig {
  updateInterval: number; // in seconds
  minConfidenceThreshold: 0.8;
  minUsageCountForAutoApproval: 3;
  dangerousPatterns: string[];
  lastUpdateCheck: number;
}

export class ApprovalLearningSystem {
  private dataDir: string;
  private historyFile: string;
  private patternsFile: string;
  private configFile: string;
  private updateCheckInterval = 3600; // 1 hour in seconds

  constructor(projectRoot: string) {
    this.dataDir = path.join(projectRoot, '.claude', 'learning');
    this.historyFile = path.join(this.dataDir, 'approval-history.json');
    this.patternsFile = path.join(this.dataDir, 'approval-patterns.json');
    this.configFile = path.join(this.dataDir, 'learning-config.json');
    
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadHistory(): ApprovalRecord[] {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading approval history:', error);
    }
    return [];
  }

  private saveHistory(history: ApprovalRecord[]): void {
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  private loadPatterns(): Map<string, ApprovalPattern> {
    try {
      if (fs.existsSync(this.patternsFile)) {
        const data = fs.readFileSync(this.patternsFile, 'utf-8');
        const patterns = JSON.parse(data);
        return new Map(Object.entries(patterns));
      }
    } catch (error) {
      console.error('Error loading approval patterns:', error);
    }
    return new Map();
  }

  private savePatterns(patterns: Map<string, ApprovalPattern>): void {
    const obj = Object.fromEntries(patterns);
    fs.writeFileSync(this.patternsFile, JSON.stringify(obj, null, 2));
  }

  private loadConfig(): LearningConfig {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading learning config:', error);
    }
    
    return {
      updateInterval: 3600,
      minConfidenceThreshold: 0.8,
      minUsageCountForAutoApproval: 3,
      dangerousPatterns: [
        'rm -rf',
        'sudo',
        'ssh',
        'chmod 777',
        'eval',
        'exec',
        '.env',
        'credentials',
        'password',
        'secret',
        'key',
        'token'
      ],
      lastUpdateCheck: Date.now()
    };
  }

  private saveConfig(config: LearningConfig): void {
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
  }

  recordApproval(record: Omit<ApprovalRecord, 'id' | 'timestamp'>): void {
    const history = this.loadHistory();
    const newRecord: ApprovalRecord = {
      ...record,
      id: this.generateId(record),
      timestamp: Date.now()
    };
    
    history.push(newRecord);
    this.saveHistory(history);
    
    // Update patterns if approved and not dangerous
    if (record.approved && !record.context.isDangerous) {
      this.updatePatterns(newRecord);
    }
  }

  private generateId(record: Partial<ApprovalRecord>): string {
    const content = `${record.operation}:${record.command || ''}:${record.filePath || ''}`;
    return createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  private updatePatterns(record: ApprovalRecord): void {
    const patterns = this.loadPatterns();
    const patternKey = this.extractPatternKey(record);
    
    if (!patternKey) return;
    
    const existing = patterns.get(patternKey);
    if (existing) {
      existing.usageCount++;
      existing.lastUsed = Date.now();
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      
      // Auto-approve if usage count meets threshold
      const config = this.loadConfig();
      if (existing.usageCount >= config.minUsageCountForAutoApproval &&
          existing.confidence >= config.minConfidenceThreshold) {
        existing.autoApprove = true;
      }
    } else {
      patterns.set(patternKey, {
        pattern: patternKey,
        type: record.command ? 'command' : record.filePath ? 'file' : 'operation',
        autoApprove: false,
        confidence: 0.5,
        usageCount: 1,
        lastUsed: Date.now(),
        createdAt: Date.now()
      });
    }
    
    this.savePatterns(patterns);
  }

  private extractPatternKey(record: ApprovalRecord): string | null {
    if (record.command) {
      // Extract command pattern (e.g., "npm install" -> "npm install")
      const parts = record.command.split(' ');
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[1]}`;
      }
      return parts[0];
    } else if (record.filePath) {
      // Extract file pattern (e.g., "*.test.js" for test files)
      const ext = path.extname(record.filePath);
      if (record.filePath.includes('.test') || record.filePath.includes('.spec')) {
        return `*test${ext}`;
      }
      return `*${ext}`;
    } else if (record.operation) {
      return record.operation;
    }
    return null;
  }

  shouldAutoApprove(operation: string, command?: string, filePath?: string): boolean {
    const config = this.loadConfig();
    
    // Check if it contains dangerous patterns
    const checkString = `${operation} ${command || ''} ${filePath || ''}`.toLowerCase();
    for (const dangerous of config.dangerousPatterns) {
      if (checkString.includes(dangerous.toLowerCase())) {
        return false;
      }
    }
    
    // Check learned patterns
    const patterns = this.loadPatterns();
    const testRecord = { operation, command, filePath, context: {} } as ApprovalRecord;
    const patternKey = this.extractPatternKey(testRecord);
    
    if (patternKey) {
      const pattern = patterns.get(patternKey);
      if (pattern && pattern.autoApprove) {
        return true;
      }
    }
    
    return false;
  }

  async checkForUpdates(): Promise<boolean> {
    const config = this.loadConfig();
    const now = Date.now();
    
    if (now - config.lastUpdateCheck < this.updateCheckInterval * 1000) {
      return false;
    }
    
    console.log('\n🔄 学習システムの更新をチェックしています...');
    
    // Analyze recent history and update patterns
    const history = this.loadHistory();
    const recentHistory = history.filter(r => 
      now - r.timestamp < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
    
    const patterns = this.loadPatterns();
    let updated = false;
    
    // Count pattern usage in recent history
    const usageCounts = new Map<string, number>();
    for (const record of recentHistory) {
      if (record.approved && !record.context.isDangerous) {
        const key = this.extractPatternKey(record);
        if (key) {
          usageCounts.set(key, (usageCounts.get(key) || 0) + 1);
        }
      }
    }
    
    // Update patterns based on recent usage
    for (const [key, count] of usageCounts.entries()) {
      const pattern = patterns.get(key);
      if (pattern && count >= config.minUsageCountForAutoApproval) {
        if (!pattern.autoApprove) {
          pattern.autoApprove = true;
          pattern.confidence = Math.max(pattern.confidence, config.minConfidenceThreshold);
          updated = true;
          console.log(`✅ パターン "${key}" を自動承認リストに追加しました`);
        }
      }
    }
    
    if (updated) {
      this.savePatterns(patterns);
    }
    
    config.lastUpdateCheck = now;
    this.saveConfig(config);
    
    return updated;
  }

  getStatistics(): {
    totalRecords: number;
    autoApprovePatterns: number;
    recentApprovals: number;
    mostUsedPatterns: Array<{ pattern: string; count: number }>;
  } {
    const history = this.loadHistory();
    const patterns = this.loadPatterns();
    const now = Date.now();
    
    const recentApprovals = history.filter(r => 
      now - r.timestamp < 24 * 60 * 60 * 1000 && r.approved
    ).length;
    
    const autoApprovePatterns = Array.from(patterns.values())
      .filter(p => p.autoApprove).length;
    
    const mostUsedPatterns = Array.from(patterns.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(p => ({ pattern: p.pattern, count: p.usageCount }));
    
    return {
      totalRecords: history.length,
      autoApprovePatterns,
      recentApprovals,
      mostUsedPatterns
    };
  }

  exportLearningData(): string {
    const history = this.loadHistory();
    const patterns = this.loadPatterns();
    const config = this.loadConfig();
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      history: history.slice(-1000), // Last 1000 records
      patterns: Object.fromEntries(patterns),
      config,
      statistics: this.getStatistics()
    }, null, 2);
  }

  importLearningData(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      
      if (imported.patterns) {
        const patterns = new Map<string, ApprovalPattern>();
        Object.entries(imported.patterns).forEach(([key, value]) => {
          patterns.set(key, value as ApprovalPattern);
        });
        this.savePatterns(patterns);
      }
      
      if (imported.config) {
        this.saveConfig(imported.config);
      }
      
      console.log('✅ 学習データのインポートが完了しました');
      return true;
    } catch (error) {
      console.error('❌ 学習データのインポートに失敗しました:', error);
      return false;
    }
  }
}

// Singleton instance
let instance: ApprovalLearningSystem | null = null;

export function getApprovalLearningSystem(projectRoot: string): ApprovalLearningSystem {
  if (!instance) {
    instance = new ApprovalLearningSystem(projectRoot);
  }
  return instance;
}