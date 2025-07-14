# アーキテクチャドキュメント

## システム全体構成

Claude Code Auto Actionは、モジュラーなアーキテクチャを採用し、各機能が独立して動作しながら相互に連携します。

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code CLI                           │
│                    (コマンドラインインターフェース)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                      Core Systems Layer                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Error Fix      │  Dependency     │  Refactoring              │
│  System         │  Manager        │  System                   │
├─────────────────┼─────────────────┼─────────────────────────────┤
│  Documentation  │  Test           │  PR/Review                │
│  Generator      │  Generator      │  System                   │
├─────────────────┼─────────────────┼─────────────────────────────┤
│  Environment    │  Version        │  Monitoring               │
│  Setup          │  Manager        │  System                   │
└─────────────────┴─────────────────┴─────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                    Learning & Storage Layer                      │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Approval       │  Code Pattern   │  Metrics                  │
│  Learning       │  Learning       │  Storage                  │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## コアコンポーネント

### 1. 自動エラー修正システム (AutoErrorFixSystem)

```typescript
class AutoErrorFixSystem {
  private projectRoot: string;
  private config: ErrorFixConfig;
  private claudeApi: ClaudeAPI;

  async fixAll(): Promise<FixResult[]> {
    // 1. エラーを収集
    const errors = await this.collectErrors();

    // 2. エラーを分類
    const categorized = this.categorizeErrors(errors);

    // 3. 優先順位付け
    const prioritized = this.prioritizeErrors(categorized);

    // 4. 修正を実行
    return await this.applyFixes(prioritized);
  }
}
```

**責任範囲:**

- TypeScriptコンパイルエラーの検出と修正
- ESLint/Prettierエラーの自動修正
- ビルドエラーの解決
- 思考モードの自動エスカレーション

### 2. 依存関係管理システム (DependencyManager)

```typescript
class DependencyManager {
  async analyzeDependencies(): Promise<DependencyAnalysis> {
    // 1. package.jsonを解析
    const declared = await this.parseDeclaredDependencies();

    // 2. 実際の使用を分析
    const used = await this.analyzeActualUsage();

    // 3. 差分を検出
    const diff = this.calculateDifference(declared, used);

    // 4. セキュリティチェック
    const vulnerabilities = await this.checkVulnerabilities();

    return { declared, used, diff, vulnerabilities };
  }
}
```

**責任範囲:**

- 不足パッケージの検出
- 未使用パッケージの特定
- セキュリティ脆弱性のチェック
- 自動インストール/削除

### 3. 学習システム (Learning System)

```typescript
interface LearningSystem {
  // 承認パターン学習
  approvalLearning: ApprovalLearningSystem;

  // コードパターン学習
  codeCompletionLearning: CodeCompletionLearningSystem;

  // メトリクス収集
  metricsCollector: MetricsCollector;
}
```

**データフロー:**

```
User Action → Record → Analyze Pattern → Update Model → Apply Learning
     ↑                                                          ↓
     └──────────────────── Feedback Loop ──────────────────────┘
```

## データ構造

### 学習データ

```typescript
interface ApprovalPattern {
  id: string;
  pattern: string; // MD5ハッシュ
  operation: string;
  usageCount: number;
  lastUsed: Date;
  confidence: number;
  autoApprove: boolean;
  context: {
    fileTypes: string[];
    projectType: string;
    userPreference: boolean;
  };
}

interface CodePattern {
  id: string;
  trigger: string; // トリガーとなるコード
  completion: string; // 補完内容
  frequency: number;
  context: {
    language: string;
    framework?: string;
    fileType: string;
  };
}
```

### 設定構造

```typescript
interface ClaudeAutoActionConfig {
  // 基本設定
  defaultMode: 'bypassPermissions' | 'interactive';

  // 自動化設定
  automation: {
    [feature: string]: {
      enabled: boolean;
      config: FeatureConfig;
    };
  };

  // 学習設定
  learning: {
    approvalLearning: ApprovalLearningConfig;
    codeCompletion: CodeCompletionConfig;
  };

  // 思考モード設定
  thinkingMode: {
    enabled: boolean;
    defaultMode: ThinkingMode;
    autoEscalation: AutoEscalationConfig;
  };
}
```

## 通信フロー

### 1. エラー修正フロー

```
User Code Change
     ↓
File Watcher Triggered
     ↓
Error Detection (TypeScript, ESLint)
     ↓
Error Categorization
     ↓
Fix Generation (Claude API)
     ↓
Code Modification
     ↓
Verification
     ↓
Git Commit (if enabled)
```

### 2. 学習フロー

```
User Approval/Rejection
     ↓
Pattern Extraction
     ↓
History Recording
     ↓
Pattern Analysis (定期実行)
     ↓
Confidence Calculation
     ↓
Auto-approval Update
```

## セキュリティアーキテクチャ

### 権限管理

```typescript
interface PermissionSystem {
  // ファイルシステム権限
  fileSystem: {
    allowedPaths: string[];
    blockedPaths: string[];
    readOnly: string[];
  };

  // コマンド実行権限
  execution: {
    allowedCommands: string[];
    blockedCommands: string[];
    requireApproval: string[];
  };

  // API権限
  api: {
    rateLimits: RateLimitConfig;
    costLimits: CostLimitConfig;
  };
}
```

### データ保護

1. **ローカルストレージ** - すべての学習データはローカルに保存
2. **暗号化** - センシティブデータは暗号化して保存
3. **アクセス制御** - ファイルシステムレベルでの権限管理
4. **監査ログ** - すべての操作を記録

## パフォーマンス最適化

### 並列処理

```typescript
class ParallelExecutor {
  async execute<T>(tasks: Task<T>[], maxConcurrency = 10): Promise<T[]> {
    const queue = [...tasks];
    const executing: Promise<T>[] = [];
    const results: T[] = [];

    while (queue.length > 0 || executing.length > 0) {
      while (executing.length < maxConcurrency && queue.length > 0) {
        const task = queue.shift()!;
        const promise = task.execute().then((result) => {
          results.push(result);
          executing.splice(executing.indexOf(promise), 1);
        });
        executing.push(promise);
      }

      if (executing.length > 0) {
        await Promise.race(executing);
      }
    }

    return results;
  }
}
```

### キャッシング戦略

```typescript
interface CacheStrategy {
  // メモリキャッシュ
  memory: {
    maxSize: number;
    ttl: number;
  };

  // ディスクキャッシュ
  disk: {
    location: string;
    maxSize: number;
    cleanupInterval: number;
  };

  // キャッシュキー生成
  keyGenerator: (input: any) => string;
}
```

## 拡張性

### プラグインアーキテクチャ

```typescript
interface Plugin {
  name: string;
  version: string;

  // ライフサイクルフック
  onInit?: () => Promise<void>;
  onDestroy?: () => Promise<void>;

  // イベントハンドラ
  handlers: {
    [event: string]: EventHandler;
  };

  // コマンド拡張
  commands?: Command[];

  // UI拡張
  ui?: UIExtension;
}
```

### イベントシステム

```typescript
class EventBus extends EventEmitter {
  // 型安全なイベント
  emit<T extends keyof EventMap>(event: T, ...args: Parameters<EventMap[T]>): boolean;

  on<T extends keyof EventMap>(event: T, listener: EventMap[T]): this;
}

interface EventMap {
  'error:detected': (errors: Error[]) => void;
  'fix:applied': (fixes: Fix[]) => void;
  'learning:updated': (patterns: Pattern[]) => void;
  'monitor:alert': (alert: Alert) => void;
}
```

## デプロイメントアーキテクチャ

### Docker構成

```yaml
services:
  claude-code:
    build: .
    volumes:
      - ./src:/app/src
      - claude-data:/app/.claude
    environment:
      - NODE_ENV=production

  claude-monitor:
    build: ./monitor
    depends_on:
      - claude-code
    volumes:
      - claude-metrics:/metrics

  claude-api:
    build: ./api
    ports:
      - '3001:3001'
    depends_on:
      - claude-code
```

### スケーラビリティ

1. **水平スケーリング** - 複数のワーカープロセス
2. **負荷分散** - タスクキューによる分散処理
3. **キャッシング** - Redis/Memcachedとの統合
4. **モニタリング** - Prometheus/Grafanaによる監視

## 今後の拡張計画

### フェーズ1: 基盤強化

- TypeScript 5.0対応
- より高度なAST解析
- 機械学習モデルの導入

### フェーズ2: 統合拡大

- より多くのIDEサポート
- クラウドサービス連携
- マルチ言語対応

### フェーズ3: AI強化

- 自然言語によるコード生成
- インテリジェントなコードレビュー
- 予測的な最適化提案
