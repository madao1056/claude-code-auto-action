import { EventEmitter } from 'events';
import { Task } from '../core/MultiAgentOrchestrator';
import { Command } from '../hierarchy/TopDownCommandSystem';
import { AgentEndpoint } from '../communication/AgentCommunicationHub';

export interface ProgressReport {
  id: string;
  timestamp: Date;
  source: ReportSource;
  source_id: string;
  report_type: ReportType;
  level: ReportLevel;
  data: any;
  metrics?: ReportMetrics;
  issues?: Issue[];
  recommendations?: string[];
  next_steps?: string[];
}

export interface ReportMetrics {
  completion_percentage: number;
  time_elapsed: number; // milliseconds
  time_remaining?: number; // milliseconds
  efficiency_score: number; // 0-1
  quality_score: number; // 0-1
  resource_utilization: number; // 0-1
  error_rate: number; // 0-1
  throughput: number; // tasks per hour
}

export interface Issue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'quality' | 'resource' | 'dependency' | 'communication';
  title: string;
  description: string;
  affected_components: string[];
  suggested_actions: string[];
  reported_by: string;
  timestamp: Date;
}

export enum ReportSource {
  AGENT = 'agent',
  TASK = 'task',
  COMMAND = 'command',
  SYSTEM = 'system',
}

export enum ReportType {
  STATUS_UPDATE = 'status_update',
  PROGRESS_REPORT = 'progress_report',
  COMPLETION_REPORT = 'completion_report',
  ERROR_REPORT = 'error_report',
  PERFORMANCE_REPORT = 'performance_report',
  QUALITY_REPORT = 'quality_report',
  RESOURCE_REPORT = 'resource_report',
  SUMMARY_REPORT = 'summary_report',
}

export enum ReportLevel {
  TASK = 'task',
  AGENT = 'agent',
  COMMAND = 'command',
  SESSION = 'session',
}

export interface ReportTemplate {
  type: ReportType;
  level: ReportLevel;
  frequency: 'realtime' | 'periodic' | 'on_event';
  format: 'detailed' | 'summary' | 'metrics_only';
  recipients: string[];
  filters?: {
    min_severity?: string;
    categories?: string[];
    sources?: ReportSource[];
  };
}

export class BottomUpReportingSystem extends EventEmitter {
  private reports: Map<string, ProgressReport> = new Map();
  private reportTemplates: Map<string, ReportTemplate> = new Map();
  private aggregationRules: Map<ReportLevel, AggregationRule> = new Map();
  private dashboardData: DashboardData;
  private metricsHistory: MetricsSnapshot[] = [];
  private reportQueue: string[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.dashboardData = this.initializeDashboard();
    this.initializeReportTemplates();
    this.initializeAggregationRules();
    this.startReportProcessing();
  }

  private initializeDashboard(): DashboardData {
    return {
      session_overview: {
        total_commands: 0,
        active_commands: 0,
        completed_commands: 0,
        failed_commands: 0,
        total_tasks: 0,
        completed_tasks: 0,
        active_agents: 0,
        overall_progress: 0,
        estimated_completion: null,
        current_issues: [],
      },
      agent_performance: new Map(),
      command_progress: new Map(),
      resource_utilization: {
        cpu_usage: 0,
        memory_usage: 0,
        network_usage: 0,
        concurrent_tasks: 0,
        agent_capacity_used: 0,
      },
      quality_metrics: {
        overall_quality_score: 0,
        test_coverage: 0,
        code_quality_score: 0,
        documentation_completeness: 0,
        security_score: 0,
      },
      recent_activities: [],
      alerts: [],
    };
  }

  private initializeReportTemplates(): void {
    // Real-time status updates
    this.reportTemplates.set('realtime_status', {
      type: ReportType.STATUS_UPDATE,
      level: ReportLevel.TASK,
      frequency: 'realtime',
      format: 'summary',
      recipients: ['dashboard'],
      filters: {
        min_severity: 'medium',
      },
    });

    // Periodic progress reports
    this.reportTemplates.set('progress_summary', {
      type: ReportType.PROGRESS_REPORT,
      level: ReportLevel.COMMAND,
      frequency: 'periodic',
      format: 'detailed',
      recipients: ['dashboard', 'user'],
      filters: {
        categories: ['performance', 'quality'],
      },
    });

    // Error and issue reports
    this.reportTemplates.set('error_alerts', {
      type: ReportType.ERROR_REPORT,
      level: ReportLevel.AGENT,
      frequency: 'on_event',
      format: 'detailed',
      recipients: ['dashboard', 'user', 'logs'],
      filters: {
        min_severity: 'high',
      },
    });

    // Performance monitoring
    this.reportTemplates.set('performance_metrics', {
      type: ReportType.PERFORMANCE_REPORT,
      level: ReportLevel.SESSION,
      frequency: 'periodic',
      format: 'metrics_only',
      recipients: ['dashboard', 'analytics'],
    });
  }

  private initializeAggregationRules(): void {
    this.aggregationRules.set(ReportLevel.TASK, {
      metrics_calculation: 'weighted_average',
      issue_escalation: {
        threshold: 3,
        severity_upgrade: true,
      },
      rollup_frequency: 60000, // 1 minute
    });

    this.aggregationRules.set(ReportLevel.AGENT, {
      metrics_calculation: 'weighted_average',
      issue_escalation: {
        threshold: 2,
        severity_upgrade: true,
      },
      rollup_frequency: 300000, // 5 minutes
    });

    this.aggregationRules.set(ReportLevel.COMMAND, {
      metrics_calculation: 'weighted_average',
      issue_escalation: {
        threshold: 1,
        severity_upgrade: false,
      },
      rollup_frequency: 600000, // 10 minutes
    });

    this.aggregationRules.set(ReportLevel.SESSION, {
      metrics_calculation: 'overall_average',
      issue_escalation: {
        threshold: 1,
        severity_upgrade: false,
      },
      rollup_frequency: 1800000, // 30 minutes
    });
  }

  reportTaskProgress(
    task: Task,
    agentId: string,
    progress: number,
    metrics?: Partial<ReportMetrics>
  ): void {
    const report: ProgressReport = {
      id: `task_${task.id}_${Date.now()}`,
      timestamp: new Date(),
      source: ReportSource.TASK,
      source_id: task.id,
      report_type: ReportType.PROGRESS_REPORT,
      level: ReportLevel.TASK,
      data: {
        task: {
          id: task.id,
          title: task.title,
          type: task.type,
          priority: task.priority,
          status: task.status,
          progress: progress,
        },
        agent_id: agentId,
        progress: progress,
      },
      metrics: this.calculateTaskMetrics(task, progress, metrics),
    };

    this.addReport(report);
    this.updateDashboardFromTaskReport(report);
  }

  reportTaskCompletion(task: Task, agentId: string, result: any, metrics?: ReportMetrics): void {
    const report: ProgressReport = {
      id: `task_completion_${task.id}_${Date.now()}`,
      timestamp: new Date(),
      source: ReportSource.TASK,
      source_id: task.id,
      report_type: ReportType.COMPLETION_REPORT,
      level: ReportLevel.TASK,
      data: {
        task: {
          id: task.id,
          title: task.title,
          type: task.type,
          priority: task.priority,
          status: 'completed',
        },
        agent_id: agentId,
        result: result,
        duration:
          task.completed_at && task.started_at
            ? task.completed_at.getTime() - task.started_at.getTime()
            : null,
      },
      metrics: metrics || this.calculateTaskMetrics(task, 100),
      recommendations: this.generateTaskRecommendations(task, result, metrics),
    };

    this.addReport(report);
    this.updateDashboardFromTaskCompletion(report);
  }

  reportAgentStatus(agent: AgentEndpoint, metrics: ReportMetrics, issues?: Issue[]): void {
    const report: ProgressReport = {
      id: `agent_${agent.id}_${Date.now()}`,
      timestamp: new Date(),
      source: ReportSource.AGENT,
      source_id: agent.id,
      report_type: ReportType.STATUS_UPDATE,
      level: ReportLevel.AGENT,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          load: agent.load,
          current_tasks: agent.current_tasks,
        },
      },
      metrics: metrics,
      issues: issues || [],
      next_steps: this.generateAgentNextSteps(agent, metrics),
    };

    this.addReport(report);
    this.updateDashboardFromAgentReport(report);
  }

  reportCommandProgress(command: Command, aggregatedMetrics: ReportMetrics): void {
    const report: ProgressReport = {
      id: `command_${command.id}_${Date.now()}`,
      timestamp: new Date(),
      source: ReportSource.COMMAND,
      source_id: command.id,
      report_type: ReportType.PROGRESS_REPORT,
      level: ReportLevel.COMMAND,
      data: {
        command: {
          id: command.id,
          title: command.title,
          type: command.type,
          status: command.status,
          progress: command.progress,
        },
        total_tasks: command.generated_tasks.length,
        assigned_agents: command.assigned_agents,
      },
      metrics: aggregatedMetrics,
      recommendations: this.generateCommandRecommendations(command, aggregatedMetrics),
    };

    this.addReport(report);
    this.updateDashboardFromCommandReport(report);
  }

  reportError(source: ReportSource, sourceId: string, error: Error, context?: any): void {
    const issue: Issue = {
      id: `error_${sourceId}_${Date.now()}`,
      severity: this.assessErrorSeverity(error, context),
      category: this.categorizeError(error, context),
      title: error.name || 'Unknown Error',
      description: error.message,
      affected_components: [sourceId],
      suggested_actions: this.generateErrorActions(error, context),
      reported_by: sourceId,
      timestamp: new Date(),
    };

    const report: ProgressReport = {
      id: `error_report_${sourceId}_${Date.now()}`,
      timestamp: new Date(),
      source: source,
      source_id: sourceId,
      report_type: ReportType.ERROR_REPORT,
      level: this.mapSourceToLevel(source),
      data: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context: context,
      },
      issues: [issue],
    };

    this.addReport(report);
    this.handleCriticalError(report);
  }

  private addReport(report: ProgressReport): void {
    this.reports.set(report.id, report);
    this.reportQueue.push(report.id);

    // Emit event for real-time listeners
    this.emit('report_generated', report);

    // Process high-priority reports immediately
    if (this.isHighPriority(report)) {
      this.processReport(report);
    }
  }

  private isHighPriority(report: ProgressReport): boolean {
    return (
      report.report_type === ReportType.ERROR_REPORT ||
      (report.issues && report.issues.some((issue) => issue.severity === 'critical'))
    );
  }

  private startReportProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processReportQueue();
      this.performAggregation();
      this.updateMetricsHistory();
    }, 10000); // Process every 10 seconds
  }

  private processReportQueue(): void {
    while (this.reportQueue.length > 0) {
      const reportId = this.reportQueue.shift()!;
      const report = this.reports.get(reportId);
      if (report) {
        this.processReport(report);
      }
    }
  }

  private processReport(report: ProgressReport): void {
    // Apply report templates
    for (const template of this.reportTemplates.values()) {
      if (this.matchesTemplate(report, template)) {
        this.distributeReport(report, template);
      }
    }

    // Update aggregations
    this.updateAggregations(report);
  }

  private matchesTemplate(report: ProgressReport, template: ReportTemplate): boolean {
    if (template.type !== report.report_type && template.type !== ReportType.SUMMARY_REPORT) {
      return false;
    }

    if (template.level !== report.level) {
      return false;
    }

    if (template.filters) {
      if (template.filters.sources && !template.filters.sources.includes(report.source)) {
        return false;
      }

      if (template.filters.min_severity && report.issues) {
        const maxSeverity = this.getMaxSeverity(report.issues);
        if (!this.severityMeetsThreshold(maxSeverity, template.filters.min_severity)) {
          return false;
        }
      }
    }

    return true;
  }

  private distributeReport(report: ProgressReport, template: ReportTemplate): void {
    const formattedReport = this.formatReport(report, template);

    for (const recipient of template.recipients) {
      switch (recipient) {
        case 'dashboard':
          this.updateDashboard(formattedReport);
          break;
        case 'user':
          this.emit('user_notification', formattedReport);
          break;
        case 'logs':
          this.logReport(formattedReport);
          break;
        case 'analytics':
          this.sendToAnalytics(formattedReport);
          break;
      }
    }
  }

  private formatReport(report: ProgressReport, template: ReportTemplate): any {
    switch (template.format) {
      case 'summary':
        return this.createSummaryFormat(report);
      case 'metrics_only':
        return this.createMetricsFormat(report);
      case 'detailed':
      default:
        return this.createDetailedFormat(report);
    }
  }

  private createSummaryFormat(report: ProgressReport): any {
    return {
      id: report.id,
      timestamp: report.timestamp,
      source: `${report.source}:${report.source_id}`,
      type: report.report_type,
      summary: this.generateSummary(report),
      key_metrics: report.metrics
        ? {
            completion: report.metrics.completion_percentage,
            quality: report.metrics.quality_score,
            efficiency: report.metrics.efficiency_score,
          }
        : null,
      issues_count: report.issues?.length || 0,
    };
  }

  private createMetricsFormat(report: ProgressReport): any {
    return {
      timestamp: report.timestamp,
      source: report.source_id,
      metrics: report.metrics,
    };
  }

  private createDetailedFormat(report: ProgressReport): any {
    return report; // Full report
  }

  private calculateTaskMetrics(
    task: Task,
    progress: number,
    provided?: Partial<ReportMetrics>
  ): ReportMetrics {
    const now = new Date().getTime();
    const startTime = task.started_at?.getTime() || now;
    const timeElapsed = now - startTime;

    return {
      completion_percentage: progress,
      time_elapsed: timeElapsed,
      time_remaining: progress > 0 ? (timeElapsed / progress) * (100 - progress) : undefined,
      efficiency_score: this.calculateEfficiency(task, progress, timeElapsed),
      quality_score: provided?.quality_score || 0.8, // Default quality score
      resource_utilization: 0.7, // Mock resource utilization
      error_rate: 0.05, // Mock error rate
      throughput: progress > 0 ? progress / (timeElapsed / 3600000) : 0, // tasks per hour
      ...provided,
    };
  }

  private calculateEfficiency(task: Task, progress: number, timeElapsed: number): number {
    // Mock efficiency calculation based on progress vs time
    const expectedProgress = Math.min(100, (timeElapsed / 1800000) * 50); // Expected 50% in 30 minutes
    return Math.max(0, Math.min(1, progress / Math.max(expectedProgress, 1)));
  }

  private updateDashboard(formattedReport: any): void {
    this.dashboardData.recent_activities.unshift({
      timestamp: formattedReport.timestamp,
      activity: formattedReport.summary || formattedReport.type,
      source: formattedReport.source,
    });

    // Keep only recent activities (last 50)
    if (this.dashboardData.recent_activities.length > 50) {
      this.dashboardData.recent_activities = this.dashboardData.recent_activities.slice(0, 50);
    }

    this.emit('dashboard_updated', this.dashboardData);
  }

  getDashboardData(): DashboardData {
    return this.dashboardData;
  }

  getReportHistory(level?: ReportLevel, limit: number = 100): ProgressReport[] {
    let reports = Array.from(this.reports.values());

    if (level) {
      reports = reports.filter((r) => r.level === level);
    }

    return reports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  getMetricsHistory(duration: number = 3600000): MetricsSnapshot[] {
    const cutoff = new Date(Date.now() - duration);
    return this.metricsHistory.filter((snapshot) => snapshot.timestamp >= cutoff);
  }

  generateSessionSummary(): any {
    const recentReports = this.getReportHistory(undefined, 1000);
    const metrics = this.calculateSessionMetrics(recentReports);

    return {
      session_id: 'current',
      generated_at: new Date(),
      duration: process.uptime() * 1000,
      summary: {
        total_reports: recentReports.length,
        commands_processed: this.dashboardData.session_overview.total_commands,
        tasks_completed: this.dashboardData.session_overview.completed_tasks,
        overall_efficiency: metrics.efficiency_score,
        quality_score: metrics.quality_score,
        issues_resolved: recentReports.filter((r) => r.report_type === ReportType.COMPLETION_REPORT)
          .length,
      },
      performance_highlights: this.extractPerformanceHighlights(recentReports),
      recommendations: this.generateSessionRecommendations(metrics),
      next_session_improvements: this.suggestImprovements(recentReports),
    };
  }

  private updateDashboardFromTaskReport(report: ProgressReport): void {
    // Update task-level dashboard data
    this.dashboardData.session_overview.total_tasks++;
    // Additional dashboard updates...
  }

  private updateDashboardFromTaskCompletion(report: ProgressReport): void {
    this.dashboardData.session_overview.completed_tasks++;
    // Additional dashboard updates...
  }

  private updateDashboardFromAgentReport(report: ProgressReport): void {
    // Update agent performance tracking
    // Additional dashboard updates...
  }

  private updateDashboardFromCommandReport(report: ProgressReport): void {
    // Update command progress tracking
    // Additional dashboard updates...
  }

  // Additional helper methods...
  private generateSummary(report: ProgressReport): string {
    return `${report.source} ${report.source_id}: ${report.report_type}`;
  }

  private assessErrorSeverity(error: Error, context?: any): Issue['severity'] {
    // Mock severity assessment
    return 'medium';
  }

  private categorizeError(error: Error, context?: any): Issue['category'] {
    // Mock error categorization
    return 'performance';
  }

  private generateErrorActions(error: Error, context?: any): string[] {
    return ['Investigate root cause', 'Apply fix', 'Monitor for recurrence'];
  }

  private mapSourceToLevel(source: ReportSource): ReportLevel {
    switch (source) {
      case ReportSource.TASK:
        return ReportLevel.TASK;
      case ReportSource.AGENT:
        return ReportLevel.AGENT;
      case ReportSource.COMMAND:
        return ReportLevel.COMMAND;
      default:
        return ReportLevel.SESSION;
    }
  }

  private handleCriticalError(report: ProgressReport): void {
    this.emit('critical_error', report);
  }

  private performAggregation(): void {
    // Implement aggregation logic
  }

  private updateAggregations(report: ProgressReport): void {
    // Update aggregated metrics
  }

  private updateMetricsHistory(): void {
    // Update metrics history
  }

  private getMaxSeverity(issues: Issue[]): string {
    // Get highest severity level
    return 'medium';
  }

  private severityMeetsThreshold(severity: string, threshold: string): boolean {
    // Check if severity meets threshold
    return true;
  }

  private logReport(report: any): void {
    console.log('Report:', report);
  }

  private sendToAnalytics(report: any): void {
    // Send to analytics system
  }

  private generateTaskRecommendations(task: Task, result: any, metrics?: ReportMetrics): string[] {
    return ['Continue monitoring', 'Document lessons learned'];
  }

  private generateAgentNextSteps(agent: AgentEndpoint, metrics: ReportMetrics): string[] {
    return ['Optimize performance', 'Balance workload'];
  }

  private generateCommandRecommendations(command: Command, metrics: ReportMetrics): string[] {
    return ['Monitor progress', 'Adjust resources if needed'];
  }

  private calculateSessionMetrics(reports: ProgressReport[]): ReportMetrics {
    // Calculate overall session metrics
    return {
      completion_percentage: 75,
      time_elapsed: process.uptime() * 1000,
      efficiency_score: 0.8,
      quality_score: 0.85,
      resource_utilization: 0.7,
      error_rate: 0.05,
      throughput: 10,
    };
  }

  private extractPerformanceHighlights(reports: ProgressReport[]): string[] {
    return ['High task completion rate', 'Efficient resource usage'];
  }

  private generateSessionRecommendations(metrics: ReportMetrics): string[] {
    return ['Continue current approach', 'Monitor for potential issues'];
  }

  private suggestImprovements(reports: ProgressReport[]): string[] {
    return ['Implement better error handling', 'Optimize task distribution'];
  }
}

interface AggregationRule {
  metrics_calculation: 'weighted_average' | 'overall_average' | 'max' | 'min';
  issue_escalation: {
    threshold: number;
    severity_upgrade: boolean;
  };
  rollup_frequency: number;
}

interface DashboardData {
  session_overview: {
    total_commands: number;
    active_commands: number;
    completed_commands: number;
    failed_commands: number;
    total_tasks: number;
    completed_tasks: number;
    active_agents: number;
    overall_progress: number;
    estimated_completion: Date | null;
    current_issues: Issue[];
  };
  agent_performance: Map<string, any>;
  command_progress: Map<string, any>;
  resource_utilization: {
    cpu_usage: number;
    memory_usage: number;
    network_usage: number;
    concurrent_tasks: number;
    agent_capacity_used: number;
  };
  quality_metrics: {
    overall_quality_score: number;
    test_coverage: number;
    code_quality_score: number;
    documentation_completeness: number;
    security_score: number;
  };
  recent_activities: Array<{
    timestamp: Date;
    activity: string;
    source: string;
  }>;
  alerts: any[];
}

interface MetricsSnapshot {
  timestamp: Date;
  metrics: ReportMetrics;
}
