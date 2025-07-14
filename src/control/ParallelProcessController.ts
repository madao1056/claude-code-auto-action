import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { spawn, ChildProcess } from 'child_process';
import { MultiAgentOrchestrator, Task } from '../core/MultiAgentOrchestrator';
import { AgentCommunicationHub, AgentEndpoint } from '../communication/AgentCommunicationHub';
import { BottomUpReportingSystem } from '../reporting/BottomUpReportingSystem';

export interface ProcessPool {
  id: string;
  type: 'claude_instance' | 'worker_thread' | 'child_process';
  capacity: number;
  active_processes: Map<string, ProcessInfo>;
  queue: string[];
  load_balancer: LoadBalancer;
}

export interface ProcessInfo {
  id: string;
  pid?: number;
  worker?: Worker;
  child_process?: ChildProcess;
  status: 'idle' | 'busy' | 'error' | 'terminated';
  current_task?: string;
  start_time: Date;
  last_activity: Date;
  performance_metrics: {
    tasks_completed: number;
    average_duration: number;
    error_rate: number;
    cpu_usage: number;
    memory_usage: number;
  };
}

export interface LoadBalancer {
  strategy: 'round_robin' | 'least_loaded' | 'performance_based' | 'affinity_based';
  metrics: {
    total_requests: number;
    successful_assignments: number;
    failed_assignments: number;
    average_response_time: number;
  };
}

export interface ResourceLimits {
  max_concurrent_tasks: number;
  max_memory_per_process: number; // MB
  max_cpu_percentage: number;
  max_execution_time: number; // seconds
  max_processes_per_pool: number;
}

export interface ScalingPolicy {
  min_processes: number;
  max_processes: number;
  scale_up_threshold: number; // load percentage
  scale_down_threshold: number; // load percentage
  scale_up_cooldown: number; // milliseconds
  scale_down_cooldown: number; // milliseconds
  auto_scaling_enabled: boolean;
}

export class ParallelProcessController extends EventEmitter {
  private processPools: Map<string, ProcessPool> = new Map();
  private resourceLimits: ResourceLimits;
  private scalingPolicies: Map<string, ScalingPolicy> = new Map();
  private taskAssignments: Map<string, string> = new Map(); // taskId -> processId
  private orchestrator: MultiAgentOrchestrator;
  private communicationHub: AgentCommunicationHub;
  private reportingSystem: BottomUpReportingSystem;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private resourceMonitor: ResourceMonitor;

  constructor(
    orchestrator: MultiAgentOrchestrator,
    communicationHub: AgentCommunicationHub,
    reportingSystem: BottomUpReportingSystem,
    limits: Partial<ResourceLimits> = {}
  ) {
    super();
    this.orchestrator = orchestrator;
    this.communicationHub = communicationHub;
    this.reportingSystem = reportingSystem;

    this.resourceLimits = {
      max_concurrent_tasks: 50,
      max_memory_per_process: 2048,
      max_cpu_percentage: 80,
      max_execution_time: 3600,
      max_processes_per_pool: 10,
      ...limits,
    };

    this.resourceMonitor = new ResourceMonitor(this.resourceLimits);
    this.initializeProcessPools();
    this.startMonitoring();
  }

  private initializeProcessPools(): void {
    // Claude Code Instance Pool - for complex reasoning and architecture tasks
    this.createProcessPool('claude_architects', {
      type: 'claude_instance',
      capacity: 3,
      scaling_policy: {
        min_processes: 1,
        max_processes: 3,
        scale_up_threshold: 80,
        scale_down_threshold: 30,
        scale_up_cooldown: 300000, // 5 minutes
        scale_down_cooldown: 600000, // 10 minutes
        auto_scaling_enabled: true,
      },
    });

    // Manager Pool - for coordination and oversight tasks
    this.createProcessPool('claude_managers', {
      type: 'claude_instance',
      capacity: 5,
      scaling_policy: {
        min_processes: 2,
        max_processes: 5,
        scale_up_threshold: 70,
        scale_down_threshold: 25,
        scale_up_cooldown: 180000, // 3 minutes
        scale_down_cooldown: 300000, // 5 minutes
        auto_scaling_enabled: true,
      },
    });

    // Worker Pool - for implementation and execution tasks
    this.createProcessPool('claude_workers', {
      type: 'claude_instance',
      capacity: 10,
      scaling_policy: {
        min_processes: 3,
        max_processes: 10,
        scale_up_threshold: 75,
        scale_down_threshold: 20,
        scale_up_cooldown: 120000, // 2 minutes
        scale_down_cooldown: 240000, // 4 minutes
        auto_scaling_enabled: true,
      },
    });

    // Utility Pool - for background tasks and monitoring
    this.createProcessPool('utilities', {
      type: 'worker_thread',
      capacity: 5,
      scaling_policy: {
        min_processes: 1,
        max_processes: 5,
        scale_up_threshold: 85,
        scale_down_threshold: 15,
        scale_up_cooldown: 60000, // 1 minute
        scale_down_cooldown: 180000, // 3 minutes
        auto_scaling_enabled: true,
      },
    });
  }

  private createProcessPool(
    poolId: string,
    config: {
      type: ProcessPool['type'];
      capacity: number;
      scaling_policy: ScalingPolicy;
    }
  ): void {
    const pool: ProcessPool = {
      id: poolId,
      type: config.type,
      capacity: config.capacity,
      active_processes: new Map(),
      queue: [],
      load_balancer: {
        strategy: 'performance_based',
        metrics: {
          total_requests: 0,
          successful_assignments: 0,
          failed_assignments: 0,
          average_response_time: 0,
        },
      },
    };

    this.processPools.set(poolId, pool);
    this.scalingPolicies.set(poolId, config.scaling_policy);

    // Initialize minimum processes
    for (let i = 0; i < config.scaling_policy.min_processes; i++) {
      this.createProcess(poolId);
    }

    console.log(
      `Created process pool: ${poolId} with ${config.scaling_policy.min_processes} initial processes`
    );
  }

  private async createProcess(poolId: string): Promise<string | null> {
    const pool = this.processPools.get(poolId);
    if (!pool) return null;

    const processId = `${poolId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let processInfo: ProcessInfo;

      switch (pool.type) {
        case 'claude_instance':
          processInfo = await this.createClaudeInstance(processId, poolId);
          break;
        case 'worker_thread':
          processInfo = await this.createWorkerThread(processId, poolId);
          break;
        case 'child_process':
          processInfo = await this.createChildProcess(processId, poolId);
          break;
        default:
          throw new Error(`Unknown process type: ${pool.type}`);
      }

      pool.active_processes.set(processId, processInfo);
      this.emit('process_created', { poolId, processId, processInfo });

      console.log(`Created process: ${processId} in pool: ${poolId}`);
      return processId;
    } catch (error) {
      console.error(`Failed to create process in pool ${poolId}:`, error);
      return null;
    }
  }

  private async createClaudeInstance(processId: string, poolId: string): Promise<ProcessInfo> {
    // Create a new Claude Code process instance
    const claudeProcess = spawn(
      'claude-code',
      [
        '--agent-mode',
        '--agent-id',
        processId,
        '--pool-id',
        poolId,
        '--communication-hub',
        `ws://localhost:8765`,
        '--config',
        JSON.stringify(this.getClaudeConfig(poolId)),
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_AGENT_ID: processId,
          CLAUDE_POOL_ID: poolId,
        },
      }
    );

    const processInfo: ProcessInfo = {
      id: processId,
      pid: claudeProcess.pid,
      child_process: claudeProcess,
      status: 'idle',
      start_time: new Date(),
      last_activity: new Date(),
      performance_metrics: {
        tasks_completed: 0,
        average_duration: 0,
        error_rate: 0,
        cpu_usage: 0,
        memory_usage: 0,
      },
    };

    // Set up process event handlers
    claudeProcess.stdout?.on('data', (data) => {
      console.log(`Claude ${processId}: ${data}`);
      this.updateProcessActivity(processId);
    });

    claudeProcess.stderr?.on('data', (data) => {
      console.error(`Claude ${processId} Error: ${data}`);
      this.handleProcessError(processId, new Error(data.toString()));
    });

    claudeProcess.on('exit', (code) => {
      console.log(`Claude process ${processId} exited with code ${code}`);
      this.handleProcessExit(processId, code || 0);
    });

    return processInfo;
  }

  private async createWorkerThread(processId: string, poolId: string): Promise<ProcessInfo> {
    const worker = new Worker('./src/workers/utility-worker.js', {
      workerData: {
        processId,
        poolId,
        config: this.getWorkerConfig(poolId),
      },
    });

    const processInfo: ProcessInfo = {
      id: processId,
      worker: worker,
      status: 'idle',
      start_time: new Date(),
      last_activity: new Date(),
      performance_metrics: {
        tasks_completed: 0,
        average_duration: 0,
        error_rate: 0,
        cpu_usage: 0,
        memory_usage: 0,
      },
    };

    worker.on('message', (message) => {
      this.handleWorkerMessage(processId, message);
    });

    worker.on('error', (error) => {
      this.handleProcessError(processId, error);
    });

    worker.on('exit', (code) => {
      this.handleProcessExit(processId, code);
    });

    return processInfo;
  }

  private async createChildProcess(processId: string, poolId: string): Promise<ProcessInfo> {
    const child = spawn('node', ['./src/processes/task-executor.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PROCESS_ID: processId,
        POOL_ID: poolId,
      },
    });

    const processInfo: ProcessInfo = {
      id: processId,
      pid: child.pid,
      child_process: child,
      status: 'idle',
      start_time: new Date(),
      last_activity: new Date(),
      performance_metrics: {
        tasks_completed: 0,
        average_duration: 0,
        error_rate: 0,
        cpu_usage: 0,
        memory_usage: 0,
      },
    };

    child.stdout?.on('data', (data) => {
      this.handleChildProcessMessage(processId, data.toString());
    });

    child.stderr?.on('data', (data) => {
      console.error(`Child process ${processId} Error: ${data}`);
      this.handleProcessError(processId, new Error(data.toString()));
    });

    child.on('exit', (code) => {
      this.handleProcessExit(processId, code || 0);
    });

    return processInfo;
  }

  async assignTaskToProcess(
    task: Task,
    requiredCapabilities: string[] = []
  ): Promise<string | null> {
    // Determine the appropriate pool based on task type and requirements
    const poolId = this.selectAppropriatePool(task, requiredCapabilities);
    const pool = this.processPools.get(poolId);

    if (!pool) {
      console.error(`Pool not found: ${poolId}`);
      return null;
    }

    // Find the best available process using load balancing
    const processId = await this.selectBestProcess(pool, task);

    if (!processId) {
      // Add to queue if no process available
      pool.queue.push(task.id);
      this.emit('task_queued', { taskId: task.id, poolId });

      // Try to scale up if auto-scaling is enabled
      await this.tryScaleUp(poolId);
      return null;
    }

    // Assign task to process
    this.taskAssignments.set(task.id, processId);
    const processInfo = pool.active_processes.get(processId)!;
    processInfo.status = 'busy';
    processInfo.current_task = task.id;

    // Send task to process
    await this.sendTaskToProcess(processId, task);

    // Update metrics
    pool.load_balancer.metrics.total_requests++;
    pool.load_balancer.metrics.successful_assignments++;

    this.emit('task_assigned', { taskId: task.id, processId, poolId });
    return processId;
  }

  private selectAppropriatePool(task: Task, requiredCapabilities: string[]): string {
    // Determine pool based on task complexity and type
    if (task.type === 'analysis' || requiredCapabilities.includes('architecture_design')) {
      return 'claude_architects';
    }

    if (task.priority === 'high' || requiredCapabilities.includes('task_coordination')) {
      return 'claude_managers';
    }

    return 'claude_workers';
  }

  private async selectBestProcess(pool: ProcessPool, task: Task): Promise<string | null> {
    const availableProcesses = Array.from(pool.active_processes.values()).filter(
      (p) => p.status === 'idle'
    );

    if (availableProcesses.length === 0) {
      return null;
    }

    switch (pool.load_balancer.strategy) {
      case 'round_robin':
        return this.selectRoundRobin(availableProcesses);
      case 'least_loaded':
        return this.selectLeastLoaded(availableProcesses);
      case 'performance_based':
        return this.selectPerformanceBased(availableProcesses, task);
      case 'affinity_based':
        return this.selectAffinityBased(availableProcesses, task);
      default:
        return availableProcesses[0].id;
    }
  }

  private selectRoundRobin(processes: ProcessInfo[]): string {
    // Simple round-robin selection
    return processes[0].id;
  }

  private selectLeastLoaded(processes: ProcessInfo[]): string {
    // Select process with lowest CPU/memory usage
    return processes.reduce((best, current) =>
      current.performance_metrics.cpu_usage < best.performance_metrics.cpu_usage ? current : best
    ).id;
  }

  private selectPerformanceBased(processes: ProcessInfo[], task: Task): string {
    // Select based on historical performance for similar tasks
    return processes.reduce((best, current) => {
      const currentScore = this.calculatePerformanceScore(current, task);
      const bestScore = this.calculatePerformanceScore(best, task);
      return currentScore > bestScore ? current : best;
    }).id;
  }

  private selectAffinityBased(processes: ProcessInfo[], task: Task): string {
    // Select based on task affinity (e.g., same file/module)
    // For now, use performance-based selection
    return this.selectPerformanceBased(processes, task);
  }

  private calculatePerformanceScore(process: ProcessInfo, task: Task): number {
    const metrics = process.performance_metrics;

    // Weighted score based on multiple factors
    const speedScore = metrics.average_duration > 0 ? 1 / metrics.average_duration : 1;
    const reliabilityScore = 1 - metrics.error_rate;
    const efficiencyScore = 1 - metrics.cpu_usage / 100;

    return speedScore * 0.4 + reliabilityScore * 0.4 + efficiencyScore * 0.2;
  }

  private async sendTaskToProcess(processId: string, task: Task): Promise<void> {
    const processInfo = this.findProcessById(processId);
    if (!processInfo) {
      throw new Error(`Process not found: ${processId}`);
    }

    const taskMessage = {
      type: 'task_assignment',
      task: task,
      timestamp: new Date(),
    };

    if (processInfo.worker) {
      // Worker thread
      processInfo.worker.postMessage(taskMessage);
    } else if (processInfo.child_process) {
      // Child process or Claude instance
      processInfo.child_process.stdin?.write(JSON.stringify(taskMessage) + '\n');
    }
  }

  private async tryScaleUp(poolId: string): Promise<void> {
    const pool = this.processPools.get(poolId);
    const policy = this.scalingPolicies.get(poolId);

    if (!pool || !policy || !policy.auto_scaling_enabled) {
      return;
    }

    const currentLoad = this.calculatePoolLoad(pool);
    const currentProcessCount = pool.active_processes.size;

    if (currentLoad >= policy.scale_up_threshold && currentProcessCount < policy.max_processes) {
      console.log(
        `Scaling up pool ${poolId}: load=${currentLoad}%, processes=${currentProcessCount}`
      );
      await this.createProcess(poolId);
    }
  }

  private async tryScaleDown(poolId: string): Promise<void> {
    const pool = this.processPools.get(poolId);
    const policy = this.scalingPolicies.get(poolId);

    if (!pool || !policy || !policy.auto_scaling_enabled) {
      return;
    }

    const currentLoad = this.calculatePoolLoad(pool);
    const currentProcessCount = pool.active_processes.size;

    if (currentLoad <= policy.scale_down_threshold && currentProcessCount > policy.min_processes) {
      console.log(
        `Scaling down pool ${poolId}: load=${currentLoad}%, processes=${currentProcessCount}`
      );
      await this.terminateIdleProcess(poolId);
    }
  }

  private calculatePoolLoad(pool: ProcessPool): number {
    const totalProcesses = pool.active_processes.size;
    const busyProcesses = Array.from(pool.active_processes.values()).filter(
      (p) => p.status === 'busy'
    ).length;

    return totalProcesses > 0 ? (busyProcesses / totalProcesses) * 100 : 0;
  }

  private async terminateIdleProcess(poolId: string): Promise<void> {
    const pool = this.processPools.get(poolId);
    if (!pool) return;

    const idleProcesses = Array.from(pool.active_processes.values()).filter(
      (p) => p.status === 'idle'
    );

    if (idleProcesses.length === 0) return;

    // Terminate the oldest idle process
    const processToTerminate = idleProcesses.reduce((oldest, current) =>
      current.start_time < oldest.start_time ? current : oldest
    );

    await this.terminateProcess(processToTerminate.id);
  }

  private async terminateProcess(processId: string): Promise<void> {
    const processInfo = this.findProcessById(processId);
    if (!processInfo) return;

    try {
      if (processInfo.worker) {
        await processInfo.worker.terminate();
      } else if (processInfo.child_process) {
        processInfo.child_process.kill('SIGTERM');
      }

      // Remove from pool
      for (const pool of this.processPools.values()) {
        if (pool.active_processes.has(processId)) {
          pool.active_processes.delete(processId);
          break;
        }
      }

      console.log(`Terminated process: ${processId}`);
      this.emit('process_terminated', processId);
    } catch (error) {
      console.error(`Failed to terminate process ${processId}:`, error);
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.monitorResources();
      this.processQueues();
      this.checkScaling();
      this.updateMetrics();
    }, 30000); // Every 30 seconds
  }

  private monitorResources(): void {
    for (const [poolId, pool] of this.processPools) {
      for (const [processId, processInfo] of pool.active_processes) {
        this.resourceMonitor.updateProcessMetrics(processId, processInfo);
      }
    }
  }

  private processQueues(): void {
    for (const [poolId, pool] of this.processPools) {
      while (pool.queue.length > 0) {
        const idleProcesses = Array.from(pool.active_processes.values()).filter(
          (p) => p.status === 'idle'
        );

        if (idleProcesses.length === 0) break;

        const taskId = pool.queue.shift()!;
        // Process queued task
        console.log(`Processing queued task ${taskId} in pool ${poolId}`);
      }
    }
  }

  private checkScaling(): void {
    for (const poolId of this.processPools.keys()) {
      this.tryScaleUp(poolId);
      this.tryScaleDown(poolId);
    }
  }

  private updateMetrics(): void {
    const metrics = this.collectSystemMetrics();
    this.reportingSystem.reportAgentStatus(this.createSystemAgent(), metrics);
  }

  private collectSystemMetrics(): any {
    // Collect system-wide metrics
    return {
      completion_percentage: 0,
      time_elapsed: process.uptime() * 1000,
      efficiency_score: 0.8,
      quality_score: 0.85,
      resource_utilization: this.calculateOverallResourceUtilization(),
      error_rate: this.calculateOverallErrorRate(),
      throughput: this.calculateOverallThroughput(),
    };
  }

  private calculateOverallResourceUtilization(): number {
    // Calculate resource utilization across all pools
    return 0.7; // Mock value
  }

  private calculateOverallErrorRate(): number {
    // Calculate error rate across all processes
    return 0.05; // Mock value
  }

  private calculateOverallThroughput(): number {
    // Calculate throughput across all processes
    return 15; // Mock value (tasks per hour)
  }

  private createSystemAgent(): AgentEndpoint {
    return {
      id: 'system_controller',
      name: 'Parallel Process Controller',
      type: 'manager',
      status: 'online',
      last_heartbeat: new Date(),
      capabilities: ['process_management', 'load_balancing', 'resource_monitoring'],
      current_tasks: [],
      load: this.calculateSystemLoad(),
    };
  }

  private calculateSystemLoad(): number {
    let totalProcesses = 0;
    let busyProcesses = 0;

    for (const pool of this.processPools.values()) {
      totalProcesses += pool.active_processes.size;
      busyProcesses += Array.from(pool.active_processes.values()).filter(
        (p) => p.status === 'busy'
      ).length;
    }

    return totalProcesses > 0 ? busyProcesses / totalProcesses : 0;
  }

  private findProcessById(processId: string): ProcessInfo | undefined {
    for (const pool of this.processPools.values()) {
      const process = pool.active_processes.get(processId);
      if (process) return process;
    }
    return undefined;
  }

  private updateProcessActivity(processId: string): void {
    const processInfo = this.findProcessById(processId);
    if (processInfo) {
      processInfo.last_activity = new Date();
    }
  }

  private handleProcessError(processId: string, error: Error): void {
    console.error(`Process ${processId} error:`, error);
    this.emit('process_error', { processId, error });
  }

  private handleProcessExit(processId: string, code: number): void {
    console.log(`Process ${processId} exited with code ${code}`);
    this.emit('process_exit', { processId, code });
  }

  private handleWorkerMessage(processId: string, message: any): void {
    this.updateProcessActivity(processId);
    // Handle worker thread messages
  }

  private handleChildProcessMessage(processId: string, message: string): void {
    this.updateProcessActivity(processId);
    // Handle child process messages
  }

  private getClaudeConfig(poolId: string): any {
    // Return Claude Code configuration based on pool type
    return {
      model: poolId.includes('architect') ? 'opus' : 'sonnet',
      temperature: poolId.includes('architect') ? 0.7 : 0.5,
      max_tokens: poolId.includes('architect') ? 4000 : 2000,
    };
  }

  private getWorkerConfig(poolId: string): any {
    // Return worker thread configuration
    return {
      pool_type: poolId,
      resource_limits: this.resourceLimits,
    };
  }

  // Public API methods
  getSystemStatus(): any {
    const poolStatuses = new Map();

    for (const [poolId, pool] of this.processPools) {
      poolStatuses.set(poolId, {
        type: pool.type,
        capacity: pool.capacity,
        active_processes: pool.active_processes.size,
        queue_size: pool.queue.length,
        load_percentage: this.calculatePoolLoad(pool),
        metrics: pool.load_balancer.metrics,
      });
    }

    return {
      total_pools: this.processPools.size,
      total_processes: Array.from(this.processPools.values()).reduce(
        (sum, pool) => sum + pool.active_processes.size,
        0
      ),
      total_queued_tasks: Array.from(this.processPools.values()).reduce(
        (sum, pool) => sum + pool.queue.length,
        0
      ),
      pool_statuses: Object.fromEntries(poolStatuses),
      resource_limits: this.resourceLimits,
      system_metrics: this.collectSystemMetrics(),
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Parallel Process Controller...');

    // Clear monitoring interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Terminate all processes
    const terminationPromises = [];
    for (const pool of this.processPools.values()) {
      for (const processId of pool.active_processes.keys()) {
        terminationPromises.push(this.terminateProcess(processId));
      }
    }

    await Promise.all(terminationPromises);
    console.log('All processes terminated');
  }
}

class ResourceMonitor {
  constructor(private limits: ResourceLimits) {}

  updateProcessMetrics(processId: string, processInfo: ProcessInfo): void {
    // Mock implementation - in reality, this would collect actual metrics
    processInfo.performance_metrics.cpu_usage = Math.random() * 50;
    processInfo.performance_metrics.memory_usage = Math.random() * 1024;
  }
}
