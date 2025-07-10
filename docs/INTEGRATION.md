# 統合ガイド - 他システムとの連携

## 概要

Claude Code Auto Actionは、様々な開発ツールやサービスと統合できます。このガイドでは、主要なツールとの統合方法を説明します。

## CI/CDパイプラインとの統合

### GitHub Actions

`.github/workflows/claude-auto.yml`:

```yaml
name: Claude Auto Action

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  auto-fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run auto error fix
        run: scripts/auto-fix-errors.sh
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Check for changes
        id: changes
        run: |
          if [[ -n $(git status -s) ]]; then
            echo "changes=true" >> $GITHUB_OUTPUT
          fi
      
      - name: Commit fixes
        if: steps.changes.outputs.changes == 'true'
        run: |
          git config --local user.email "claude-bot@example.com"
          git config --local user.name "Claude Bot"
          git add -A
          git commit -m "fix: Auto-fix errors by Claude Code"
          git push

  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run dependency analysis
        run: scripts/auto-deps.sh analyze
      
      - name: Upload dependency report
        uses: actions/upload-artifact@v3
        with:
          name: dependency-report
          path: .claude/reports/dependencies.json

  monitor:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3
      
      - name: Performance check
        run: |
          npm run build
          node -e "
          const { MonitoringAlertSystem } = require('./src/monitoring/MonitoringAlertSystem');
          const monitor = new MonitoringAlertSystem(process.cwd());
          monitor.checkPerformance().then(() => process.exit(0));
          "
```

### GitLab CI/CD

`.gitlab-ci.yml`:

```yaml
stages:
  - analyze
  - fix
  - test
  - deploy

variables:
  ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY

dependency-analysis:
  stage: analyze
  script:
    - npm ci
    - scripts/auto-deps.sh analyze
  artifacts:
    reports:
      dependency_scanning: .claude/reports/dependencies.json

auto-fix:
  stage: fix
  script:
    - npm ci
    - scripts/auto-fix-errors.sh
    - |
      if [[ -n $(git status -s) ]]; then
        git add -A
        git commit -m "fix: Auto-fix by Claude Code"
        git push https://oauth2:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git HEAD:${CI_COMMIT_REF_NAME}
      fi
  only:
    - merge_requests

coverage-improvement:
  stage: test
  script:
    - npm ci
    - npm test -- --coverage
    - node -e "
      const { AutoTestGenerator } = require('./src/testing/AutoTestGenerator');
      const generator = new AutoTestGenerator(process.cwd());
      generator.generateMissingTests().then(() => process.exit(0));
      "
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
```

## IDEとの統合

### VSCode Tasks

`.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Claude: Fix Errors",
      "type": "shell",
      "command": "scripts/auto-fix-errors.sh",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      },
      "problemMatcher": "$tsc"
    },
    {
      "label": "Claude: Generate Docs",
      "type": "shell",
      "command": "node",
      "args": [
        "-e",
        "const { AutoDocumentationGenerator } = require('./src/documentation/AutoDocumentationGenerator'); new AutoDocumentationGenerator(process.cwd()).generateAll()"
      ],
      "group": "build"
    },
    {
      "label": "Claude: Refactor Code",
      "type": "shell",
      "command": "node",
      "args": [
        "-e",
        "const { AutoRefactoringSystem } = require('./src/refactoring/AutoRefactoringSystem'); new AutoRefactoringSystem(process.cwd()).analyzeAndSuggest()"
      ],
      "group": "build"
    }
  ]
}
```

### JetBrains IDEs (IntelliJ, WebStorm)

`.idea/runConfigurations/Claude_Auto_Fix.xml`:

```xml
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Claude Auto Fix" type="ShConfigurationType">
    <option name="SCRIPT_TEXT" value="" />
    <option name="INDEPENDENT_SCRIPT_PATH" value="true" />
    <option name="SCRIPT_PATH" value="$PROJECT_DIR$/scripts/auto-fix-errors.sh" />
    <option name="SCRIPT_OPTIONS" value="" />
    <option name="INDEPENDENT_SCRIPT_WORKING_DIRECTORY" value="true" />
    <option name="SCRIPT_WORKING_DIRECTORY" value="$PROJECT_DIR$" />
    <method v="2" />
  </configuration>
</component>
```

## Dockerとの統合

### Dockerfile

```dockerfile
FROM node:18-alpine

# 作業ディレクトリ
WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションファイルをコピー
COPY . .

# Claude Code Auto Actionの設定
RUN mkdir -p .claude/learning .claude/metrics .claude/logs

# 環境変数
ENV NODE_ENV=production
ENV CLAUDE_MONITORING_ENABLED=true

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('./src/monitoring/MonitoringAlertSystem').healthCheck()"

# アプリケーション起動
CMD ["node", "src/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NODE_ENV=production
    volumes:
      - claude-learning:/app/.claude/learning
      - claude-metrics:/app/.claude/metrics
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('./src/monitoring/MonitoringAlertSystem').healthCheck()"]
      interval: 30s
      timeout: 3s
      retries: 3

  claude-monitor:
    build: .
    command: node src/monitoring/monitor-daemon.js
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - claude-metrics:/app/.claude/metrics
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

volumes:
  claude-learning:
  claude-metrics:
```

## Git Hooksとの統合

### Husky設定

`package.json`:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run claude:pre-commit",
      "commit-msg": "npm run claude:commit-msg",
      "pre-push": "npm run claude:pre-push"
    }
  },
  "scripts": {
    "claude:pre-commit": "scripts/auto-fix-errors.sh && git add -A",
    "claude:commit-msg": "node src/versioning/commit-msg-validator.js",
    "claude:pre-push": "npm test && npm run build"
  }
}
```

### 直接Git Hooks

`.git/hooks/pre-commit`:

```bash
#!/bin/bash

# 自動エラー修正
scripts/auto-fix-errors.sh

# 変更があれば追加
if [[ -n $(git diff --cached --name-only) ]]; then
  git add -A
fi

# リファクタリング提案
node -e "
const { AutoRefactoringSystem } = require('./src/refactoring/AutoRefactoringSystem');
const refactor = new AutoRefactoringSystem(process.cwd());
refactor.analyzeAndSuggest().then(suggestions => {
  if (suggestions.length > 0) {
    console.log('🔧 リファクタリング提案があります:');
    suggestions.forEach(s => console.log('  - ' + s.description));
  }
});
"
```

## 監視システムとの統合

### Prometheus

`prometheus-exporter.js`:

```javascript
const express = require('express');
const { register, Gauge } = require('prom-client');
const { MonitoringAlertSystem } = require('./src/monitoring/MonitoringAlertSystem');

const app = express();
const monitor = new MonitoringAlertSystem(process.cwd());

// メトリクスの定義
const cpuUsage = new Gauge({
  name: 'claude_cpu_usage',
  help: 'CPU usage percentage'
});

const memoryUsage = new Gauge({
  name: 'claude_memory_usage',
  help: 'Memory usage in bytes'
});

const bundleSize = new Gauge({
  name: 'claude_bundle_size',
  help: 'Bundle size in bytes'
});

// メトリクスを更新
setInterval(async () => {
  const metrics = monitor.getMetricsHistory('cpu_usage', 1);
  if (metrics.length > 0) {
    cpuUsage.set(metrics[0].value);
  }
  
  const memMetrics = monitor.getMetricsHistory('memory_usage', 1);
  if (memMetrics.length > 0) {
    memoryUsage.set(memMetrics[0].value);
  }
  
  const bundleMetrics = monitor.getMetricsHistory('bundle_size', 1);
  if (bundleMetrics.length > 0) {
    bundleSize.set(bundleMetrics[0].value);
  }
}, 30000);

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});

app.listen(9090, () => {
  console.log('Prometheus exporter listening on port 9090');
});
```

### Grafanaダッシュボード

```json
{
  "dashboard": {
    "title": "Claude Code Auto Action",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "claude_cpu_usage"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "claude_memory_usage"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Bundle Size",
        "targets": [
          {
            "expr": "claude_bundle_size"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

## Slackとの統合

`slack-integration.js`:

```javascript
const { WebClient } = require('@slack/web-api');
const { MonitoringAlertSystem } = require('./src/monitoring/MonitoringAlertSystem');

const slack = new WebClient(process.env.SLACK_TOKEN);
const monitor = new MonitoringAlertSystem(process.cwd());

// アラートをSlackに送信
monitor.on('alert', async (alert) => {
  const emoji = {
    info: ':information_source:',
    warning: ':warning:',
    error: ':x:',
    critical: ':rotating_light:'
  };
  
  await slack.chat.postMessage({
    channel: '#claude-alerts',
    text: `${emoji[alert.severity]} *${alert.type.toUpperCase()}*: ${alert.message}`,
    attachments: [{
      color: alert.severity === 'critical' ? 'danger' : 'warning',
      fields: [{
        title: 'Details',
        value: JSON.stringify(alert.details, null, 2),
        short: false
      }],
      timestamp: Math.floor(alert.timestamp.getTime() / 1000)
    }]
  });
});

// 日次レポート
setInterval(async () => {
  const report = monitor.generateReport();
  await slack.chat.postMessage({
    channel: '#claude-reports',
    text: '📊 Daily Monitoring Report',
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: report
      }
    }]
  });
}, 24 * 60 * 60 * 1000);
```

## APIとの統合

### RESTful API

`api-server.js`:

```javascript
const express = require('express');
const { AutoErrorFixSystem } = require('./src/autofix/AutoErrorFixSystem');
const { DependencyManager } = require('./src/dependencies/DependencyManager');
const { AutoVersionManager } = require('./src/versioning/AutoVersionManager');

const app = express();
app.use(express.json());

// エラー修正API
app.post('/api/fix-errors', async (req, res) => {
  const fixer = new AutoErrorFixSystem(process.cwd());
  const results = await fixer.fixAll();
  res.json({ success: true, results });
});

// 依存関係分析API
app.get('/api/dependencies/analyze', async (req, res) => {
  const manager = new DependencyManager(process.cwd());
  const analysis = await manager.analyzeDependencies();
  res.json(analysis);
});

// バージョン管理API
app.post('/api/version/bump', async (req, res) => {
  const { type } = req.body;
  const manager = new AutoVersionManager(process.cwd());
  const result = await manager.bumpVersion(type);
  res.json(result);
});

app.listen(3001, () => {
  console.log('Claude Code API listening on port 3001');
});
```

## 継続的な改善

### 学習データの共有

```bash
# チーム間で学習データを共有
claude-code learning export --team > team-patterns.json

# 他のプロジェクトにインポート
claude-code learning import team-patterns.json
```

### メトリクスの集約

```javascript
// 複数プロジェクトのメトリクスを集約
const projects = ['project1', 'project2', 'project3'];
const aggregatedMetrics = {};

for (const project of projects) {
  const monitor = new MonitoringAlertSystem(`/path/to/${project}`);
  const metrics = monitor.getMetricsHistory('performance', 100);
  aggregatedMetrics[project] = metrics;
}

// レポート生成
generateAggregatedReport(aggregatedMetrics);
```

## ベストプラクティス

1. **段階的な統合** - すべてを一度に統合せず、段階的に導入する
2. **監視の重要性** - 統合後は必ず監視を設定する
3. **バックアップ** - 統合前に必ずバックアップを取る
4. **ドキュメント** - カスタム統合は必ずドキュメント化する
5. **セキュリティ** - APIキーや認証情報は環境変数で管理する

## サポート

統合に関する質問は、[GitHub Issues](https://github.com/yourusername/claude-code-auto-action/issues)で受け付けています。