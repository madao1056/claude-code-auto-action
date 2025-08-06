import { EventEmitter } from 'events';
import { HighSpeedTaskScheduler } from '../core/HighSpeedTaskScheduler';
import { AdvancedWorkerPool } from '../workers/AdvancedWorkerPool';
import { SmartPriorityManager } from '../priority/SmartPriorityManager';
import { TaskDistributor } from '../core/TaskDistributor';
import { ParallelProcessController } from '../control/ParallelProcessController';
import { MultiAgentOrchestrator, Task, AgentConfig } from '../core/MultiAgentOrchestrator';

export interface ParallelProcessingConfig {
  enabled: boolean;
  maxConcurrentTasks: number;
  adaptiveScaling: {
    enabled: boolean;
    minWorkers: number;
    maxWorkers: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
  taskBatching: {
    enabled: boolean;
    batchSize: number;
    maxBatchWaitTime: number;
    priorityGrouping: boolean;
  };
  workerPools: Record<
    string,
    {
      minWorkers: number;
      maxWorkers: number;
      specialization: string[];
    }
  >;
  loadBalancing: {
    strategy: string;
    healthChecks: {
      enabled: boolean;
      interval: number;
      timeout: number;
    };
    metrics: {
      collectInterval: number;
      retentionPeriod: number;
    };
  };
  priorityManagement: {
    enabled: boolean;
    dynamicPriority: boolean;
    machineLearning: boolean;
    priorityDecayRate: number;
    urgencyThreshold: number;
    rebalanceInterval: number;
  };
  resourceLimits: {
    maxMemoryPerWorker: number;
    maxCpuPercentage: number;
    maxExecutionTime: number;
    timeoutHandling: string;
  };
  failureHandling: {
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: string;
      baseDelay: number;
      maxDelay: number;
    };
    circuitBreaker: {
      enabled: boolean;
      failureThreshold: number;
      recoveryTimeout: number;
    };
  };
  monitoring: {
    realTimeMetrics: boolean;
    alerting: {
      enabled: boolean;
      thresholds: {
        errorRate: number;
        avgResponseTime: number;
        queueDepth: number;
      };
    };
    logging: {
      level: string;
      structured: boolean;
      performance: boolean;
    };
  };
}

export interface SystemMetrics {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgExecutionTime: number;
  throughput: number;
  errorRate: number;
  systemLoad: number;
  memoryUsage: number;
  workerUtilization: number;
}

export class ParallelProcessingIntegration extends EventEmitter {
  private config: ParallelProcessingConfig;
  private taskScheduler: HighSpeedTaskScheduler;
  private workerPool: AdvancedWorkerPool;
  private priorityManager: SmartPriorityManager;
  private taskDistributor: TaskDistributor;
  private processController: ParallelProcessController;
  private orchestrator: MultiAgentOrchestrator;

  private isInitialized: boolean = false;
  private metrics: SystemMetrics;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config: ParallelProcessingConfig, orchestrator: MultiAgentOrchestrator) {
    super();
    this.config = config;
    this.orchestrator = orchestrator;

    this.metrics = {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      avgExecutionTime: 0,
      throughput: 0,
      errorRate: 0,
      systemLoad: 0,
      memoryUsage: 0,
      workerUtilization: 0,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Parallel Processing Integration...');

      // Initialize core components
      this.initializeComponents();

      // Set up event handlers
      this.setupEventHandlers();

      // Start monitoring
      this.startMonitoring();

      this.isInitialized = true;

      this.emit('initialized', {
        maxConcurrentTasks: this.config.maxConcurrentTasks,
        workerPools: Object.keys(this.config.workerPools).length,
        adaptiveScaling: this.config.adaptiveScaling.enabled,
      });

      console.log('Parallel Processing Integration initialized successfully');
    } catch (error) {
      this.emit('initialization_failed', error);
      throw new Error(`Failed to initialize parallel processing: ${error}`);
    }
  }

  private initializeComponents(): void {
    // Initialize Task Distributor
    this.taskDistributor = new TaskDistributor({
      name: 'intelligent',
      algorithm: 'capability_based',
      parameters: {
        load_weight: 0.3,
        capability_weight: 0.4,
        performance_weight: 0.3,
      },
    });

    // Initialize Process Controller
    this.processController = new ParallelProcessController(
      this.orchestrator,
      null as any, // Communication hub would be injected here
      null as any, // Reporting system would be injected here
      {
        max_concurrent_tasks: this.config.maxConcurrentTasks,
        max_memory_per_process: this.config.resourceLimits.maxMemoryPerWorker,
        max_cpu_percentage: this.config.resourceLimits.maxCpuPercentage,
        max_execution_time: this.config.resourceLimits.maxExecutionTime / 1000,
        max_processes_per_pool: this.config.adaptiveScaling.maxWorkers,
      }
    );

    // Initialize Task Scheduler
    this.taskScheduler = new HighSpeedTaskScheduler(this.taskDistributor, this.processController, {
      maxConcurrency: this.config.maxConcurrentTasks,
      batchSize: this.config.taskBatching.batchSize,
    });

    // Initialize Worker Pool
    this.workerPool = new AdvancedWorkerPool({
      minWorkers: this.config.adaptiveScaling.minWorkers,
      maxWorkers: this.config.adaptiveScaling.maxWorkers,
      idleTimeout: this.config.adaptiveScaling.scaleDownCooldown,
      taskTimeout: this.config.resourceLimits.maxExecutionTime,
      maxTasksPerWorker: 100,
      enableWorkerRecycling: true,
    });

    // Initialize Priority Manager
    this.priorityManager = new SmartPriorityManager({
      enable_dynamic_priority: this.config.priorityManagement.dynamicPriority,
      enable_machine_learning: this.config.priorityManagement.machineLearning,
      priority_decay_rate: this.config.priorityManagement.priorityDecayRate,
      urgency_threshold: this.config.priorityManagement.urgencyThreshold,
      rebalance_interval_ms: this.config.priorityManagement.rebalanceInterval,
    });
  }

  private setupEventHandlers(): void {
    // Task Scheduler events
    this.taskScheduler.on('batch_started', (batch) => {
      this.emit('batch_started', batch);
    });

    this.taskScheduler.on('batch_completed', (batch) => {
      this.emit('batch_completed', batch);
      this.updateMetrics();
    });

    this.taskScheduler.on('task_completed', (task) => {
      this.metrics.completedTasks++;
      this.emit('task_completed', task);
    });

    this.taskScheduler.on('task_failed', ({ task, error }) => {
      this.metrics.failedTasks++;
      this.emit('task_failed', { task, error });
    });

    // Worker Pool events
    this.workerPool.on('worker_created', ({ workerId, totalWorkers }) => {
      this.emit('worker_created', { workerId, totalWorkers });
    });

    this.workerPool.on('worker_terminated', (workerId) => {
      this.emit('worker_terminated', workerId);
    });

    this.workerPool.on('task_completed', ({ taskId, result, workerId }) => {
      this.updateTaskHistory(taskId, result, true);
    });

    this.workerPool.on('task_failed', ({ taskId, error, workerId }) => {
      this.updateTaskHistory(taskId, error, false);
    });

    // Priority Manager events
    this.priorityManager.on('priorities_rebalanced', ({ adjustments }) => {
      this.emit('priorities_rebalanced', { adjustments });
    });

    // Process Controller events
    this.processController.on('task_assigned', ({ taskId, processId, poolId }) => {
      this.metrics.activeTasks++;
      this.emit('task_assigned', { taskId, processId, poolId });
    });

    this.processController.on('process_created', ({ poolId, processId }) => {
      this.emit('process_created', { poolId, processId });
    });
  }

  private startMonitoring(): void {
    if (!this.config.monitoring.realTimeMetrics) return;

    const interval = this.config.loadBalancing.metrics.collectInterval;

    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.checkAlerts();
      this.emit('metrics_updated', this.metrics);
    }, interval);
  }

  private updateMetrics(): void {
    const workerStats = this.workerPool.getStatistics();
    const schedulerStatus = this.taskScheduler.getStatus();
    const systemStatus = this.processController.getSystemStatus();

    // Update basic metrics
    this.metrics.totalTasks =
      this.metrics.completedTasks + this.metrics.failedTasks + this.metrics.activeTasks;
    this.metrics.errorRate =
      this.metrics.totalTasks > 0 ? this.metrics.failedTasks / this.metrics.totalTasks : 0;
    this.metrics.throughput = workerStats.throughput;
    this.metrics.avgExecutionTime = workerStats.averageTaskTime;
    this.metrics.workerUtilization = workerStats.utilization;

    // System metrics
    this.metrics.systemLoad = this.getSystemLoad();
    this.metrics.memoryUsage = this.getMemoryUsage();
  }

  private getSystemLoad(): number {
    // In a real implementation, this would get actual system load
    return Math.random() * 100; // Mock system load
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return (usage.heapUsed / usage.heapTotal) * 100;
  }

  private updateTaskHistory(taskId: string, result: any, success: boolean): void {
    // Update priority manager with task completion data
    this.priorityManager.updateTaskHistory({
      taskId,
      type: 'implementation', // This would be determined from the actual task
      priority: 'medium', // This would come from the actual task
      duration: Date.now() - (result?.startTime || Date.now()), // Mock duration
      success,
      timestamp: new Date(),
      resourceUsage: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
      },
    });
  }

  private checkAlerts(): void {
    if (!this.config.monitoring.alerting.enabled) return;

    const thresholds = this.config.monitoring.alerting.thresholds;

    // Check error rate
    if (this.metrics.errorRate > thresholds.errorRate) {
      this.emit('alert', {
        type: 'error_rate_high',
        value: this.metrics.errorRate,
        threshold: thresholds.errorRate,
        severity: 'high',
      });
    }

    // Check average response time
    if (this.metrics.avgExecutionTime > thresholds.avgResponseTime) {
      this.emit('alert', {
        type: 'response_time_high',
        value: this.metrics.avgExecutionTime,
        threshold: thresholds.avgResponseTime,
        severity: 'medium',
      });
    }

    // Check queue depth
    const queueStatus = this.workerPool.getQueueStatus();
    if (queueStatus.queued > thresholds.queueDepth) {
      this.emit('alert', {
        type: 'queue_depth_high',
        value: queueStatus.queued,
        threshold: thresholds.queueDepth,
        severity: 'medium',
      });
    }
  }

  // Public API methods
  async submitTask(task: Task, options: { priority?: number } = {}): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Parallel processing not initialized');
    }

    // Calculate priority if priority management is enabled
    if (this.config.priorityManagement.enabled) {
      const priorityScore = this.priorityManager.calculatePriority(task);
      console.log(`Task ${task.id} priority score: ${priorityScore.final_score}`);
    }

    // Submit to appropriate worker pool based on task type
    const poolType = this.getPoolTypeForTask(task);
    const taskId = await this.workerPool.submitTask(
      this.mapTaskTypeToWorkerType(task.type),
      {
        task,
        claudeConfig: this.getClaudeConfigForTask(task),
      },
      {
        priority: options.priority,
        timeout: this.config.resourceLimits.maxExecutionTime,
        retries: this.config.failureHandling.retryPolicy.maxRetries,
      }
    );

    this.metrics.totalTasks++;
    this.emit('task_submitted', { taskId, task });

    return taskId;
  }

  async submitTaskBatch(tasks: Task[]): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Parallel processing not initialized');
    }

    // Prioritize tasks if enabled
    let orderedTasks = tasks;
    if (this.config.priorityManagement.enabled) {
      orderedTasks = this.priorityManager.prioritizeTasks(tasks);
    }

    // Group by batch size if batching is enabled
    if (this.config.taskBatching.enabled) {
      return await this.submitBatchedTasks(orderedTasks);
    } else {
      // Submit all tasks in parallel
      const taskIds = await Promise.all(orderedTasks.map((task) => this.submitTask(task)));
      return taskIds;
    }
  }

  private async submitBatchedTasks(tasks: Task[]): Promise<string[]> {
    const batchSize = this.config.taskBatching.batchSize;
    const taskIds: string[] = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      // Submit batch to worker pool
      const batchTaskIds = await this.workerPool.submitBatch(
        batch.map((task) => ({
          type: this.mapTaskTypeToWorkerType(task.type),
          payload: {
            task,
            claudeConfig: this.getClaudeConfigForTask(task),
          },
          priority: 0, // Priority would be calculated here
          timeout: this.config.resourceLimits.maxExecutionTime,
          retries: this.config.failureHandling.retryPolicy.maxRetries,
        }))
      );

      taskIds.push(...batchTaskIds);

      // Wait between batches if configured
      if (i + batchSize < tasks.length && this.config.taskBatching.maxBatchWaitTime > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.taskBatching.maxBatchWaitTime)
        );
      }
    }

    return taskIds;
  }

  private getPoolTypeForTask(task: Task): string {
    // Map task types to worker pools
    switch (task.type) {
      case 'analysis':
        return 'analysis';
      case 'implementation':
        return 'implementation';
      case 'testing':
        return 'testing';
      case 'documentation':
        return 'documentation';
      default:
        return 'implementation';
    }
  }

  private mapTaskTypeToWorkerType(
    taskType: string
  ): 'file_processing' | 'code_analysis' | 'compilation' | 'testing' | 'custom' {
    switch (taskType) {
      case 'analysis':
        return 'code_analysis';
      case 'implementation':
        return 'compilation';
      case 'testing':
        return 'testing';
      case 'documentation':
        return 'file_processing';
      default:
        return 'custom';
    }
  }

  private getClaudeConfigForTask(task: Task): any {
    // Return appropriate Claude configuration based on task complexity
    const complexityLevel = this.assessTaskComplexity(task);

    return {
      model: complexityLevel === 'high' ? 'claude-3-opus' : 'claude-3-sonnet',
      temperature: complexityLevel === 'high' ? 0.7 : 0.5,
      max_tokens: complexityLevel === 'high' ? 4000 : 2000,
      thinking_mode: complexityLevel === 'high' ? 'think_harder' : 'think_hard',
    };
  }

  private assessTaskComplexity(task: Task): 'low' | 'medium' | 'high' {
    // Simple heuristic for task complexity
    let complexity = 0;

    if (task.dependencies && task.dependencies.length > 0)
      complexity += task.dependencies.length * 2;
    if (task.type === 'analysis') complexity += 3;
    if (task.type === 'implementation') complexity += 2;
    if (task.priority === 'high') complexity += 2;

    const complexityKeywords = ['refactor', 'architecture', 'security', 'performance'];
    const hasComplexKeyword = complexityKeywords.some(
      (keyword) =>
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword)
    );

    if (hasComplexKeyword) complexity += 5;

    if (complexity >= 8) return 'high';
    if (complexity >= 4) return 'medium';
    return 'low';
  }

  async waitForTask(taskId: string, timeout?: number): Promise<any> {
    const actualTimeout = timeout || this.config.resourceLimits.maxExecutionTime;
    return await this.workerPool.waitForTask(taskId, actualTimeout);
  }

  async waitForBatch(taskIds: string[], timeout?: number): Promise<any[]> {
    const actualTimeout = timeout || this.config.resourceLimits.maxExecutionTime * 2;
    return await this.workerPool.waitForBatch(taskIds, actualTimeout);
  }

  getSystemMetrics(): SystemMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  getDetailedStatus(): any {
    return {
      system: this.getSystemMetrics(),
      workerPool: this.workerPool.getStatistics(),
      taskScheduler: this.taskScheduler.getStatus(),
      processController: this.processController.getSystemStatus(),
      priorityManager: this.priorityManager.getStatistics(),
      configuration: this.config,
    };
  }

  async scaleWorkers(target?: number): Promise<void> {
    if (target) {
      if (target > this.workerPool.getStatistics().totalWorkers) {
        await this.workerPool.scaleUp(target);
      } else {
        await this.workerPool.scaleDown(target);
      }
    } else {
      // Auto-scale based on queue depth and system load
      const queueStatus = this.workerPool.getQueueStatus();
      const currentWorkers = this.workerPool.getStatistics().totalWorkers;

      if (queueStatus.queued > this.config.adaptiveScaling.scaleUpThreshold) {
        const targetWorkers = Math.min(currentWorkers + 2, this.config.adaptiveScaling.maxWorkers);
        await this.workerPool.scaleUp(targetWorkers);
      } else if (queueStatus.queued < this.config.adaptiveScaling.scaleDownThreshold) {
        const targetWorkers = Math.max(currentWorkers - 1, this.config.adaptiveScaling.minWorkers);
        await this.workerPool.scaleDown(targetWorkers);
      }
    }
  }

  updateConfiguration(updates: Partial<ParallelProcessingConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update component configurations
    if (updates.priorityManagement) {
      this.priorityManager.updateConfiguration({
        enable_dynamic_priority: updates.priorityManagement.dynamicPriority,
        enable_machine_learning: updates.priorityManagement.machineLearning,
        priority_decay_rate: updates.priorityManagement.priorityDecayRate,
        urgency_threshold: updates.priorityManagement.urgencyThreshold,
        rebalance_interval_ms: updates.priorityManagement.rebalanceInterval,
      });
    }

    if (updates.maxConcurrentTasks) {
      this.taskScheduler.setMaxConcurrency(updates.maxConcurrentTasks);
    }

    this.emit('configuration_updated', this.config);
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Parallel Processing Integration...');

    // Clear monitoring interval
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Shutdown components in reverse order
    if (this.priorityManager) {
      this.priorityManager.shutdown();
    }

    if (this.workerPool) {
      await this.workerPool.shutdown();
    }

    if (this.taskScheduler) {
      await this.taskScheduler.cancelAllTasks();
    }

    if (this.processController) {
      await this.processController.shutdown();
    }

    this.isInitialized = false;
    this.emit('shutdown_complete');

    console.log('Parallel Processing Integration shutdown complete');
  }
}

export default ParallelProcessingIntegration;
