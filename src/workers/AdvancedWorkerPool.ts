import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';

export interface WorkerTask {
  id: string;
  type: 'file_processing' | 'code_analysis' | 'compilation' | 'testing' | 'custom';
  payload: any;
  priority: number;
  timeout: number;
  retries: number;
  created_at: Date;
}

export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  idleTimeout: number; // ms
  taskTimeout: number; // ms
  maxTasksPerWorker: number;
  enableWorkerRecycling: boolean;
  workerScript?: string;
}

export interface WorkerInfo {
  id: string;
  worker: Worker;
  status: 'idle' | 'busy' | 'terminating';
  tasksCompleted: number;
  tasksAssigned: number;
  errorCount: number;
  createdAt: Date;
  lastUsed: Date;
  currentTask?: string;
}

export interface PoolStatistics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  throughput: number; // tasks per second
  utilization: number; // percentage
}

export class AdvancedWorkerPool extends EventEmitter {
  private workers: Map<string, WorkerInfo> = new Map();
  private taskQueue: WorkerTask[] = [];
  private runningTasks: Map<string, WorkerTask> = new Map();
  private completedTasks: Map<string, any> = new Map();
  private failedTasks: Map<string, Error> = new Map();
  private config: WorkerPoolConfig;
  private workerCounter: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private statistics: PoolStatistics;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super();

    this.config = {
      minWorkers: config.minWorkers ?? Math.max(2, Math.floor(os.cpus().length / 2)),
      maxWorkers: config.maxWorkers ?? os.cpus().length * 2,
      idleTimeout: config.idleTimeout ?? 60000, // 1 minute
      taskTimeout: config.taskTimeout ?? 300000, // 5 minutes
      maxTasksPerWorker: config.maxTasksPerWorker ?? 100,
      enableWorkerRecycling: config.enableWorkerRecycling ?? true,
      workerScript: config.workerScript ?? path.join(__dirname, 'worker-executor.js'),
    };

    this.statistics = {
      totalWorkers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskTime: 0,
      throughput: 0,
      utilization: 0,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Create minimum number of workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.createWorker();
    }

    // Start cleanup and metrics intervals
    this.startMaintenanceIntervals();

    this.emit('pool_initialized', {
      minWorkers: this.config.minWorkers,
      maxWorkers: this.config.maxWorkers,
    });
  }

  private async createWorker(): Promise<string> {
    const workerId = `worker_${++this.workerCounter}`;

    try {
      const worker = new Worker(this.config.workerScript!, {
        workerData: {
          workerId,
          poolConfig: this.config,
        },
      });

      const workerInfo: WorkerInfo = {
        id: workerId,
        worker,
        status: 'idle',
        tasksCompleted: 0,
        tasksAssigned: 0,
        errorCount: 0,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      // Set up worker event handlers
      this.setupWorkerEventHandlers(workerInfo);

      this.workers.set(workerId, workerInfo);
      this.updateStatistics();

      this.emit('worker_created', { workerId, totalWorkers: this.workers.size });

      return workerId;
    } catch (error) {
      this.emit('worker_creation_failed', { workerId, error });
      throw error;
    }
  }

  private setupWorkerEventHandlers(workerInfo: WorkerInfo): void {
    const { worker, id: workerId } = workerInfo;

    worker.on('message', (message) => {
      this.handleWorkerMessage(workerId, message);
    });

    worker.on('error', (error) => {
      this.handleWorkerError(workerId, error);
    });

    worker.on('exit', (code) => {
      this.handleWorkerExit(workerId, code);
    });
  }

  private handleWorkerMessage(workerId: string, message: any): void {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    switch (message.type) {
      case 'task_completed':
        this.handleTaskCompletion(workerId, message.taskId, message.result);
        break;
      case 'task_failed':
        this.handleTaskFailure(workerId, message.taskId, message.error);
        break;
      case 'task_progress':
        this.emit('task_progress', {
          taskId: message.taskId,
          workerId,
          progress: message.progress,
        });
        break;
      case 'worker_ready':
        workerInfo.status = 'idle';
        this.processTaskQueue();
        break;
    }

    workerInfo.lastUsed = new Date();
  }

  private handleWorkerError(workerId: string, error: Error): void {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    workerInfo.errorCount++;
    this.emit('worker_error', { workerId, error, errorCount: workerInfo.errorCount });

    // If worker has too many errors, terminate it
    if (workerInfo.errorCount >= 5) {
      this.terminateWorker(workerId, 'too_many_errors');
    }
  }

  private handleWorkerExit(workerId: string, code: number): void {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    this.workers.delete(workerId);
    this.updateStatistics();

    this.emit('worker_exited', { workerId, exitCode: code });

    // If we're below minimum workers, create a new one
    if (this.workers.size < this.config.minWorkers) {
      this.createWorker().catch((error) => {
        this.emit('worker_replacement_failed', { workerId, error });
      });
    }
  }

  private handleTaskCompletion(workerId: string, taskId: string, result: any): void {
    const workerInfo = this.workers.get(workerId);
    const task = this.runningTasks.get(taskId);

    if (!workerInfo || !task) return;

    // Update worker info
    workerInfo.status = 'idle';
    workerInfo.tasksCompleted++;
    workerInfo.currentTask = undefined;
    workerInfo.lastUsed = new Date();

    // Move task to completed
    this.runningTasks.delete(taskId);
    this.completedTasks.set(taskId, result);

    // Check if worker needs recycling
    if (this.shouldRecycleWorker(workerInfo)) {
      this.recycleWorker(workerId);
    }

    this.emit('task_completed', { taskId, result, workerId });
    this.updateStatistics();
    this.processTaskQueue();
  }

  private handleTaskFailure(workerId: string, taskId: string, error: any): void {
    const workerInfo = this.workers.get(workerId);
    const task = this.runningTasks.get(taskId);

    if (!workerInfo || !task) return;

    // Update worker info
    workerInfo.status = 'idle';
    workerInfo.errorCount++;
    workerInfo.currentTask = undefined;
    workerInfo.lastUsed = new Date();

    // Handle task retry logic
    if (task.retries > 0) {
      task.retries--;
      this.taskQueue.unshift(task); // Add back to front of queue
      this.runningTasks.delete(taskId);
      this.emit('task_retrying', { taskId, retriesLeft: task.retries, workerId });
    } else {
      // Move task to failed
      this.runningTasks.delete(taskId);
      this.failedTasks.set(taskId, new Error(error));
      this.emit('task_failed', { taskId, error, workerId });
    }

    this.updateStatistics();
    this.processTaskQueue();
  }

  private shouldRecycleWorker(workerInfo: WorkerInfo): boolean {
    if (!this.config.enableWorkerRecycling) return false;

    return workerInfo.tasksCompleted >= this.config.maxTasksPerWorker || workerInfo.errorCount >= 3;
  }

  private async recycleWorker(workerId: string): Promise<void> {
    this.emit('worker_recycling', { workerId });

    await this.terminateWorker(workerId, 'recycling');

    // Create replacement worker
    try {
      await this.createWorker();
      this.emit('worker_recycled', { oldWorkerId: workerId });
    } catch (error) {
      this.emit('worker_recycling_failed', { workerId, error });
    }
  }

  private async terminateWorker(workerId: string, reason: string): Promise<void> {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    workerInfo.status = 'terminating';
    this.emit('worker_terminating', { workerId, reason });

    try {
      await workerInfo.worker.terminate();
    } catch (error) {
      this.emit('worker_termination_failed', { workerId, error });
    }

    this.workers.delete(workerId);
    this.updateStatistics();
  }

  private processTaskQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Sort tasks by priority
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    // Find available workers
    const availableWorkers = Array.from(this.workers.values()).filter((w) => w.status === 'idle');

    if (availableWorkers.length === 0) {
      // Try to scale up if possible
      if (this.workers.size < this.config.maxWorkers) {
        this.createWorker()
          .then(() => {
            setTimeout(() => this.processTaskQueue(), 100);
          })
          .catch((error) => {
            this.emit('scaling_failed', { error });
          });
      }
      return;
    }

    // Assign tasks to workers
    const tasksToAssign = Math.min(this.taskQueue.length, availableWorkers.length);

    for (let i = 0; i < tasksToAssign; i++) {
      const task = this.taskQueue.shift()!;
      const worker = availableWorkers[i];
      this.assignTaskToWorker(task, worker);
    }
  }

  private assignTaskToWorker(task: WorkerTask, workerInfo: WorkerInfo): void {
    workerInfo.status = 'busy';
    workerInfo.tasksAssigned++;
    workerInfo.currentTask = task.id;
    workerInfo.lastUsed = new Date();

    this.runningTasks.set(task.id, task);

    // Send task to worker
    workerInfo.worker.postMessage({
      type: 'execute_task',
      task: task,
    });

    // Set up task timeout
    setTimeout(() => {
      if (this.runningTasks.has(task.id)) {
        this.handleTaskTimeout(task.id, workerInfo.id);
      }
    }, task.timeout || this.config.taskTimeout);

    this.emit('task_assigned', {
      taskId: task.id,
      workerId: workerInfo.id,
      queuePosition: 0,
    });
  }

  private handleTaskTimeout(taskId: string, workerId: string): void {
    const task = this.runningTasks.get(taskId);
    if (!task) return;

    this.runningTasks.delete(taskId);
    this.failedTasks.set(taskId, new Error('Task timeout'));

    // Reset worker status
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.status = 'idle';
      workerInfo.currentTask = undefined;
      workerInfo.errorCount++;
    }

    this.emit('task_timeout', { taskId, workerId });
    this.updateStatistics();
    this.processTaskQueue();
  }

  private startMaintenanceIntervals(): void {
    // Cleanup idle workers
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleWorkers();
    }, 30000); // Every 30 seconds

    // Update metrics
    this.metricsInterval = setInterval(() => {
      this.updateStatistics();
      this.emit('statistics_updated', this.statistics);
    }, 5000); // Every 5 seconds
  }

  private cleanupIdleWorkers(): void {
    if (this.workers.size <= this.config.minWorkers) return;

    const now = new Date();
    const idleWorkers = Array.from(this.workers.values())
      .filter(
        (w) => w.status === 'idle' && now.getTime() - w.lastUsed.getTime() > this.config.idleTimeout
      )
      .sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime());

    // Terminate excess idle workers
    const workersToTerminate = Math.min(
      idleWorkers.length,
      this.workers.size - this.config.minWorkers
    );

    for (let i = 0; i < workersToTerminate; i++) {
      this.terminateWorker(idleWorkers[i].id, 'idle_timeout');
    }
  }

  private updateStatistics(): void {
    const workers = Array.from(this.workers.values());

    this.statistics.totalWorkers = workers.length;
    this.statistics.activeWorkers = workers.filter((w) => w.status === 'busy').length;
    this.statistics.idleWorkers = workers.filter((w) => w.status === 'idle').length;
    this.statistics.queuedTasks = this.taskQueue.length;
    this.statistics.completedTasks = this.completedTasks.size;
    this.statistics.failedTasks = this.failedTasks.size;

    // Calculate utilization
    this.statistics.utilization =
      this.statistics.totalWorkers > 0
        ? (this.statistics.activeWorkers / this.statistics.totalWorkers) * 100
        : 0;

    // Calculate throughput (tasks per second in last minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // This is simplified - in production, you'd track actual completion times
    this.statistics.throughput = this.statistics.completedTasks / Math.max(process.uptime(), 1);
  }

  // Public API
  async submitTask(
    type: WorkerTask['type'],
    payload: any,
    options: {
      priority?: number;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<string> {
    const task: WorkerTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority: options.priority ?? 0,
      timeout: options.timeout ?? this.config.taskTimeout,
      retries: options.retries ?? 2,
      created_at: new Date(),
    };

    this.taskQueue.push(task);
    this.emit('task_queued', { taskId: task.id, queuePosition: this.taskQueue.length });

    // Try to process immediately
    setImmediate(() => this.processTaskQueue());

    return task.id;
  }

  async submitBatch(
    tasks: Array<{
      type: WorkerTask['type'];
      payload: any;
      priority?: number;
      timeout?: number;
      retries?: number;
    }>
  ): Promise<string[]> {
    const taskIds: string[] = [];

    for (const taskData of tasks) {
      const taskId = await this.submitTask(taskData.type, taskData.payload, {
        priority: taskData.priority,
        timeout: taskData.timeout,
        retries: taskData.retries,
      });
      taskIds.push(taskId);
    }

    this.emit('batch_queued', { taskIds, batchSize: taskIds.length });
    return taskIds;
  }

  async waitForTask(taskId: string, timeout: number = 300000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Task ${taskId} wait timeout`));
      }, timeout);

      const checkResult = () => {
        if (this.completedTasks.has(taskId)) {
          clearTimeout(timeoutHandle);
          resolve(this.completedTasks.get(taskId));
        } else if (this.failedTasks.has(taskId)) {
          clearTimeout(timeoutHandle);
          reject(this.failedTasks.get(taskId));
        } else {
          setTimeout(checkResult, 100);
        }
      };

      checkResult();
    });
  }

  async waitForBatch(taskIds: string[], timeout: number = 300000): Promise<any[]> {
    const results = await Promise.allSettled(taskIds.map((id) => this.waitForTask(id, timeout)));

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        throw new Error(`Task ${taskIds[index]} failed: ${result.reason}`);
      }
    });
  }

  getStatistics(): PoolStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  getTaskStatus(taskId: string): 'queued' | 'running' | 'completed' | 'failed' | 'not_found' {
    if (this.completedTasks.has(taskId)) return 'completed';
    if (this.failedTasks.has(taskId)) return 'failed';
    if (this.runningTasks.has(taskId)) return 'running';
    if (this.taskQueue.some((t) => t.id === taskId)) return 'queued';
    return 'not_found';
  }

  async scaleUp(targetWorkers?: number): Promise<void> {
    const target = targetWorkers ?? Math.min(this.workers.size * 2, this.config.maxWorkers);

    const workersToCreate = Math.max(0, target - this.workers.size);

    const promises = [];
    for (let i = 0; i < workersToCreate; i++) {
      promises.push(this.createWorker());
    }

    await Promise.allSettled(promises);
    this.emit('scaled_up', { currentWorkers: this.workers.size, targetWorkers: target });
  }

  async scaleDown(targetWorkers?: number): Promise<void> {
    const target =
      targetWorkers ?? Math.max(Math.floor(this.workers.size / 2), this.config.minWorkers);

    const workersToTerminate = Math.max(0, this.workers.size - target);

    // Terminate idle workers first
    const idleWorkers = Array.from(this.workers.values())
      .filter((w) => w.status === 'idle')
      .sort((a, b) => a.tasksCompleted - b.tasksCompleted); // Terminate least productive first

    const promises = [];
    for (let i = 0; i < Math.min(workersToTerminate, idleWorkers.length); i++) {
      promises.push(this.terminateWorker(idleWorkers[i].id, 'scale_down'));
    }

    await Promise.allSettled(promises);
    this.emit('scaled_down', { currentWorkers: this.workers.size, targetWorkers: target });
  }

  async shutdown(): Promise<void> {
    this.emit('pool_shutting_down');

    // Clear intervals
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    // Wait for running tasks to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.runningTasks.size > 0 && Date.now() - startTime < shutdownTimeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Terminate all workers
    const terminationPromises = Array.from(this.workers.keys()).map((workerId) =>
      this.terminateWorker(workerId, 'shutdown')
    );

    await Promise.allSettled(terminationPromises);

    // Clear all data structures
    this.workers.clear();
    this.taskQueue.splice(0);
    this.runningTasks.clear();

    this.emit('pool_shutdown_complete');
  }

  // Utility methods for debugging and monitoring
  getWorkerInfo(): WorkerInfo[] {
    return Array.from(this.workers.values()).map((worker) => ({ ...worker }));
  }

  getQueueStatus(): { queued: number; running: number; completed: number; failed: number } {
    return {
      queued: this.taskQueue.length,
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
      failed: this.failedTasks.size,
    };
  }

  clearCompletedTasks(): void {
    this.completedTasks.clear();
    this.failedTasks.clear();
    this.emit('tasks_cleared');
  }
}

// Export for use in other modules
export default AdvancedWorkerPool;
