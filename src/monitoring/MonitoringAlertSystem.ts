import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import * as os from 'os';

const execAsync = promisify(exec);

interface MonitoringConfig {
  performanceRegression: boolean;
  bundleSizeAlert: boolean;
  securityVulnerability: boolean;
  codeQualityMetrics: boolean;
  thresholds: {
    bundleSizeIncrease: string;
    performanceRegression: string;
    coverageDecrease: string;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  alertChannels: {
    console: boolean;
    file: boolean;
    slack?: string;
    email?: string;
    webhook?: string;
  };
}

interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: number;
  status: 'ok' | 'warning' | 'critical';
}

interface Alert {
  id: string;
  type: 'performance' | 'bundle' | 'security' | 'quality' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
}

interface PerformanceMetrics {
  buildTime: number;
  testExecutionTime: number;
  startupTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface BundleMetrics {
  totalSize: number;
  mainBundleSize: number;
  vendorBundleSize: number;
  cssSize: number;
  imageSize: number;
  chunks: Array<{ name: string; size: number }>;
}

interface CodeQualityMetrics {
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  complexity: {
    cyclomatic: number;
    cognitive: number;
  };
  maintainability: number;
  technicalDebt: number;
  duplications: number;
}

export class MonitoringAlertSystem extends EventEmitter {
  private config: MonitoringConfig;
  private projectRoot: string;
  private metricsHistory: Map<string, Metric[]> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private logFile: string;
  private metricsFile: string;

  constructor(projectRoot: string, config?: Partial<MonitoringConfig>) {
    super();
    this.projectRoot = projectRoot;
    this.config = {
      performanceRegression: true,
      bundleSizeAlert: true,
      securityVulnerability: true,
      codeQualityMetrics: true,
      thresholds: {
        bundleSizeIncrease: '10%',
        performanceRegression: '20%',
        coverageDecrease: '5%',
        responseTime: 3000,
        memoryUsage: 512 * 1024 * 1024, // 512MB
        cpuUsage: 80,
      },
      alertChannels: {
        console: true,
        file: true,
      },
      ...config,
    };

    this.logFile = path.join(projectRoot, '.claude', 'logs', 'monitoring.log');
    this.metricsFile = path.join(projectRoot, '.claude', 'metrics', 'history.json');

    this.ensureDirectories();
    this.loadMetricsHistory();
  }

  private ensureDirectories(): void {
    const logsDir = path.dirname(this.logFile);
    const metricsDir = path.dirname(this.metricsFile);

    [logsDir, metricsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private loadMetricsHistory(): void {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8'));
        this.metricsHistory = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load metrics history:', error);
    }
  }

  private saveMetricsHistory(): void {
    const data = Object.fromEntries(this.metricsHistory);
    fs.writeFileSync(this.metricsFile, JSON.stringify(data, null, 2));
  }

  async startMonitoring(): Promise<void> {
    console.log('🔍 監視システムを起動しています...');

    // 定期的な監視タスク
    setInterval(() => this.runHealthChecks(), 60000); // 1分ごと
    setInterval(() => this.checkPerformance(), 300000); // 5分ごと
    setInterval(() => this.checkBundleSize(), 600000); // 10分ごと
    setInterval(() => this.checkSecurityVulnerabilities(), 3600000); // 1時間ごと

    // 初回実行
    await this.runHealthChecks();

    console.log('✅ 監視システムが起動しました');
  }

  private async runHealthChecks(): Promise<void> {
    const metrics: Metric[] = [];

    // システムメトリクスを収集
    const systemMetrics = await this.collectSystemMetrics();
    metrics.push(...systemMetrics);

    // アプリケーションメトリクスを収集
    if (await this.isApplicationRunning()) {
      const appMetrics = await this.collectApplicationMetrics();
      metrics.push(...appMetrics);
    }

    // メトリクスを評価してアラートを生成
    for (const metric of metrics) {
      this.evaluateMetric(metric);
      this.recordMetric(metric);
    }

    this.saveMetricsHistory();
  }

  private async collectSystemMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];

    // CPU使用率
    const cpuUsage = (os.loadavg()[0] * 100) / os.cpus().length;
    metrics.push({
      name: 'cpu_usage',
      value: Math.round(cpuUsage),
      unit: '%',
      timestamp: new Date(),
      threshold: this.config.thresholds.cpuUsage,
      status: cpuUsage > this.config.thresholds.cpuUsage ? 'warning' : 'ok',
    });

    // メモリ使用量
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    metrics.push({
      name: 'memory_usage',
      value: usedMemory,
      unit: 'bytes',
      timestamp: new Date(),
      threshold: this.config.thresholds.memoryUsage,
      status: usedMemory > this.config.thresholds.memoryUsage ? 'warning' : 'ok',
    });

    metrics.push({
      name: 'memory_usage_percent',
      value: Math.round(memoryUsagePercent),
      unit: '%',
      timestamp: new Date(),
      threshold: 80,
      status: memoryUsagePercent > 80 ? 'warning' : 'ok',
    });

    // ディスク使用量
    try {
      const { stdout } = await execAsync('df -k /', { cwd: this.projectRoot });
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        const usagePercent = parseInt(parts[4]);

        metrics.push({
          name: 'disk_usage',
          value: usagePercent,
          unit: '%',
          timestamp: new Date(),
          threshold: 90,
          status: usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'ok',
        });
      }
    } catch {
      // ディスク使用量の取得に失敗
    }

    return metrics;
  }

  private async collectApplicationMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];

    // プロセスメトリクスを収集（Node.jsアプリケーションの場合）
    try {
      const { stdout } = await execAsync('ps aux | grep node | grep -v grep', {
        cwd: this.projectRoot,
      });
      const processes = stdout.trim().split('\n').filter(Boolean);

      for (const proc of processes) {
        const parts = proc.split(/\s+/);
        const cpu = parseFloat(parts[2]);
        const mem = parseFloat(parts[3]);

        if (!isNaN(cpu) && !isNaN(mem)) {
          metrics.push({
            name: 'app_cpu_usage',
            value: cpu,
            unit: '%',
            timestamp: new Date(),
            threshold: 50,
            status: cpu > 50 ? 'warning' : 'ok',
          });

          metrics.push({
            name: 'app_memory_usage',
            value: mem,
            unit: '%',
            timestamp: new Date(),
            threshold: 30,
            status: mem > 30 ? 'warning' : 'ok',
          });
        }
      }
    } catch {
      // プロセス情報の取得に失敗
    }

    return metrics;
  }

  private async isApplicationRunning(): Promise<boolean> {
    // アプリケーションが実行中かチェック
    try {
      const { stdout } = await execAsync('lsof -i :3000', { cwd: this.projectRoot });
      return stdout.includes('LISTEN');
    } catch {
      return false;
    }
  }

  private async checkPerformance(): Promise<void> {
    if (!this.config.performanceRegression) return;

    console.log('⚡ パフォーマンスをチェック中...');

    const metrics: PerformanceMetrics = {
      buildTime: await this.measureBuildTime(),
      testExecutionTime: await this.measureTestTime(),
      startupTime: await this.measureStartupTime(),
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user / 1000000,
    };

    // 前回の測定と比較
    const history = this.metricsHistory.get('performance') || [];
    if (history.length > 0) {
      const lastMetric = history[history.length - 1];
      const regression = this.detectRegression(lastMetric.value, metrics.buildTime);

      if (regression > parseFloat(this.config.thresholds.performanceRegression)) {
        this.createAlert({
          type: 'performance',
          severity: 'warning',
          message: `Performance regression detected: ${regression.toFixed(1)}% slower`,
          details: metrics,
        });
      }
    }

    // メトリクスを記録
    this.recordMetric({
      name: 'performance',
      value: metrics.buildTime,
      unit: 'ms',
      timestamp: new Date(),
      status: 'ok',
    });
  }

  private async measureBuildTime(): Promise<number> {
    try {
      const start = Date.now();
      await execAsync('npm run build', { cwd: this.projectRoot });
      return Date.now() - start;
    } catch {
      return 0;
    }
  }

  private async measureTestTime(): Promise<number> {
    try {
      const start = Date.now();
      await execAsync('npm test', { cwd: this.projectRoot });
      return Date.now() - start;
    } catch {
      return 0;
    }
  }

  private async measureStartupTime(): Promise<number> {
    // アプリケーションの起動時間を測定（簡略化）
    return 0;
  }

  private detectRegression(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private async checkBundleSize(): Promise<void> {
    if (!this.config.bundleSizeAlert) return;

    console.log('📦 バンドルサイズをチェック中...');

    const bundleMetrics = await this.analyzeBundleSize();

    // 前回の測定と比較
    const history = this.metricsHistory.get('bundle_size') || [];
    if (history.length > 0) {
      const lastMetric = history[history.length - 1];
      const increase = this.detectRegression(lastMetric.value, bundleMetrics.totalSize);

      if (increase > parseFloat(this.config.thresholds.bundleSizeIncrease)) {
        this.createAlert({
          type: 'bundle',
          severity: 'warning',
          message: `Bundle size increased by ${increase.toFixed(1)}%`,
          details: bundleMetrics,
        });
      }
    }

    // メトリクスを記録
    this.recordMetric({
      name: 'bundle_size',
      value: bundleMetrics.totalSize,
      unit: 'bytes',
      timestamp: new Date(),
      status: 'ok',
    });
  }

  private async analyzeBundleSize(): Promise<BundleMetrics> {
    const metrics: BundleMetrics = {
      totalSize: 0,
      mainBundleSize: 0,
      vendorBundleSize: 0,
      cssSize: 0,
      imageSize: 0,
      chunks: [],
    };

    // distディレクトリのサイズを分析
    const distPath = path.join(this.projectRoot, 'dist');
    if (fs.existsSync(distPath)) {
      metrics.totalSize = await this.getDirectorySize(distPath);

      // ファイルタイプ別のサイズを計算
      const files = await this.getAllFiles(distPath);
      for (const file of files) {
        const stats = fs.statSync(file);
        const ext = path.extname(file);

        if (ext === '.js') {
          if (file.includes('vendor')) {
            metrics.vendorBundleSize += stats.size;
          } else {
            metrics.mainBundleSize += stats.size;
          }

          metrics.chunks.push({
            name: path.basename(file),
            size: stats.size,
          });
        } else if (ext === '.css') {
          metrics.cssSize += stats.size;
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) {
          metrics.imageSize += stats.size;
        }
      }
    }

    return metrics;
  }

  private async getDirectorySize(dir: string): Promise<number> {
    let size = 0;
    const files = await this.getAllFiles(dir);

    for (const file of files) {
      const stats = fs.statSync(file);
      size += stats.size;
    }

    return size;
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    const scanDir = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };

    scanDir(dir);
    return files;
  }

  private async checkSecurityVulnerabilities(): Promise<void> {
    if (!this.config.securityVulnerability) return;

    console.log('🔒 セキュリティ脆弱性をチェック中...');

    try {
      const { stdout } = await execAsync('npm audit --json', { cwd: this.projectRoot });
      const audit = JSON.parse(stdout);

      if (audit.metadata.vulnerabilities.total > 0) {
        const details = {
          critical: audit.metadata.vulnerabilities.critical || 0,
          high: audit.metadata.vulnerabilities.high || 0,
          moderate: audit.metadata.vulnerabilities.moderate || 0,
          low: audit.metadata.vulnerabilities.low || 0,
        };

        const severity =
          details.critical > 0
            ? 'critical'
            : details.high > 0
              ? 'error'
              : details.moderate > 0
                ? 'warning'
                : 'info';

        this.createAlert({
          type: 'security',
          severity,
          message: `${audit.metadata.vulnerabilities.total} security vulnerabilities found`,
          details,
        });
      }
    } catch (error) {
      // npm auditが失敗した場合
      console.error('Security check failed:', error);
    }
  }

  private async checkCodeQuality(): Promise<void> {
    if (!this.config.codeQualityMetrics) return;

    console.log('📊 コード品質をチェック中...');

    const metrics: CodeQualityMetrics = {
      coverage: await this.getTestCoverage(),
      complexity: await this.getCodeComplexity(),
      maintainability: await this.getMaintainabilityIndex(),
      technicalDebt: await this.getTechnicalDebt(),
      duplications: await this.getCodeDuplications(),
    };

    // カバレッジの低下をチェック
    const history = this.metricsHistory.get('coverage') || [];
    if (history.length > 0) {
      const lastMetric = history[history.length - 1];
      const decrease = lastMetric.value - metrics.coverage.lines;

      if (decrease > parseFloat(this.config.thresholds.coverageDecrease)) {
        this.createAlert({
          type: 'quality',
          severity: 'warning',
          message: `Test coverage decreased by ${decrease.toFixed(1)}%`,
          details: metrics.coverage,
        });
      }
    }

    // メトリクスを記録
    this.recordMetric({
      name: 'coverage',
      value: metrics.coverage.lines,
      unit: '%',
      timestamp: new Date(),
      status: metrics.coverage.lines < 80 ? 'warning' : 'ok',
    });
  }

  private async getTestCoverage(): Promise<CodeQualityMetrics['coverage']> {
    // カバレッジレポートから取得（簡略化）
    return {
      statements: 85,
      branches: 78,
      functions: 90,
      lines: 85,
    };
  }

  private async getCodeComplexity(): Promise<CodeQualityMetrics['complexity']> {
    // コード複雑度を計算（簡略化）
    return {
      cyclomatic: 15,
      cognitive: 20,
    };
  }

  private async getMaintainabilityIndex(): Promise<number> {
    // 保守性指標を計算（簡略化）
    return 75;
  }

  private async getTechnicalDebt(): Promise<number> {
    // 技術的負債を計算（簡略化）
    return 120; // 分単位
  }

  private async getCodeDuplications(): Promise<number> {
    // コード重複率を計算（簡略化）
    return 5; // パーセント
  }

  private evaluateMetric(metric: Metric): void {
    if (metric.threshold && metric.value > metric.threshold) {
      const severity =
        metric.status === 'critical'
          ? 'critical'
          : metric.status === 'warning'
            ? 'warning'
            : 'info';

      this.createAlert({
        type: 'system',
        severity,
        message: `${metric.name} exceeded threshold: ${metric.value}${metric.unit} (threshold: ${metric.threshold}${metric.unit})`,
        details: metric,
      });
    }
  }

  private recordMetric(metric: Metric): void {
    const history = this.metricsHistory.get(metric.name) || [];
    history.push(metric);

    // 最新の100件のみ保持
    if (history.length > 100) {
      history.shift();
    }

    this.metricsHistory.set(metric.name, history);
  }

  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: Alert = {
      ...alertData,
      id: `alert_${Date.now()}`,
      timestamp: new Date(),
      resolved: false,
    };

    this.activeAlerts.set(alert.id, alert);
    this.sendAlert(alert);
    this.emit('alert', alert);
  }

  private sendAlert(alert: Alert): void {
    // コンソールに出力
    if (this.config.alertChannels.console) {
      const emoji = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        critical: '🚨',
      };

      console.log(`${emoji[alert.severity]} [${alert.type.toUpperCase()}] ${alert.message}`);
      if (alert.details) {
        console.log('Details:', JSON.stringify(alert.details, null, 2));
      }
    }

    // ファイルに記録
    if (this.config.alertChannels.file) {
      const logEntry = `${alert.timestamp.toISOString()} [${alert.severity}] [${alert.type}] ${alert.message}\n`;
      fs.appendFileSync(this.logFile, logEntry);
    }

    // Webhook送信
    if (this.config.alertChannels.webhook) {
      this.sendWebhookAlert(alert);
    }
  }

  private async sendWebhookAlert(alert: Alert): Promise<void> {
    // Webhookにアラートを送信（実装は省略）
  }

  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.activeAlerts.delete(alertId);
      this.emit('alert:resolved', alert);
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getMetricsHistory(metricName: string, limit?: number): Metric[] {
    const history = this.metricsHistory.get(metricName) || [];
    return limit ? history.slice(-limit) : history;
  }

  generateReport(): string {
    let report = '# Monitoring Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // アクティブアラート
    const activeAlerts = this.getActiveAlerts();
    report += `## Active Alerts (${activeAlerts.length})\n\n`;

    if (activeAlerts.length > 0) {
      for (const alert of activeAlerts) {
        report += `- **${alert.severity.toUpperCase()}** [${alert.type}]: ${alert.message}\n`;
        report += `  - Time: ${alert.timestamp.toISOString()}\n`;
      }
    } else {
      report += 'No active alerts.\n';
    }

    report += '\n## Recent Metrics\n\n';

    // 各メトリクスの最新値
    for (const [name, history] of this.metricsHistory) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        report += `- **${name}**: ${latest.value}${latest.unit} (${latest.status})\n`;
      }
    }

    return report;
  }
}
