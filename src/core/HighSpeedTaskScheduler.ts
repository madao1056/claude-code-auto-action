import { EventEmitter } from 'events';
import { Task, AgentConfig } from './MultiAgentOrchestrator';
import { TaskDistributor } from './TaskDistributor';
import { ParallelProcessController } from '../control/ParallelProcessController';

interface TaskBatch {
  id: string;
  tasks: Task[];
  parallelism: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimated_duration: number;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface ExecutionPlan {
  batches: TaskBatch[];
  parallel_streams: number;
  total_estimated_time: number;
  critical_path: string[];
  resource_allocation: Map<string, number>;
}

interface TaskMetrics {
  throughput: number; // tasks per minute
  latency: number; // average task completion time
  error_rate: number;
  resource_utilization: number;
  queue_depth: number;
}

export class HighSpeedTaskScheduler extends EventEmitter {
  private taskDistributor: TaskDistributor;
  private processController: ParallelProcessController;
  private pendingTasks: Map<string, Task> = new Map();
  private runningTasks: Map<string, Task> = new Map();
  private completedTasks: Map<string, Task> = new Map();
  private failedTasks: Map<string, Task> = new Map();
  private executionPlan: ExecutionPlan | null = null;
  private metrics: TaskMetrics;
  private maxConcurrency: number;
  private batchSize: number;

  constructor(
    taskDistributor: TaskDistributor,
    processController: ParallelProcessController,
    options: {
      maxConcurrency?: number;
      batchSize?: number;
    } = {}
  ) {
    super();
    this.taskDistributor = taskDistributor;
    this.processController = processController;
    this.maxConcurrency = options.maxConcurrency || 20;
    this.batchSize = options.batchSize || 5;

    this.metrics = {
      throughput: 0,
      latency: 0,
      error_rate: 0,
      resource_utilization: 0,
      queue_depth: 0,
    };

    this.startMetricsCollection();
  }

  async scheduleTaskBatch(tasks: Task[]): Promise<ExecutionPlan> {
    // Step 1: Analyze task dependencies
    const dependencyGraph = this.buildDependencyGraph(tasks);

    // Step 2: Create execution batches
    const batches = this.createOptimalBatches(tasks, dependencyGraph);

    // Step 3: Calculate critical path
    const criticalPath = this.calculateCriticalPath(batches);

    // Step 4: Allocate resources
    const resourceAllocation = this.calculateResourceAllocation(batches);

    this.executionPlan = {
      batches,
      parallel_streams: this.calculateOptimalStreams(batches),
      total_estimated_time: this.estimateTotalTime(batches, criticalPath),
      critical_path: criticalPath,
      resource_allocation: resourceAllocation,
    };

    // Add tasks to pending queue
    tasks.forEach((task) => this.pendingTasks.set(task.id, task));

    // Start execution
    this.executeSchedule();

    return this.executionPlan;
  }

  private buildDependencyGraph(tasks: Task[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    tasks.forEach((task) => {
      graph.set(task.id, task.dependencies || []);
    });

    return graph;
  }

  private createOptimalBatches(tasks: Task[], dependencyGraph: Map<string, string[]>): TaskBatch[] {
    const batches: TaskBatch[] = [];
    const processed = new Set<string>();
    let batchId = 1;

    // Group tasks by dependency level (topological sort layers)
    const levels = this.topologicalSort(tasks, dependencyGraph);

    levels.forEach((levelTasks) => {
      // Further group by parallelizability within the same level
      const parallelGroups = this.groupByParallelizability(levelTasks);

      parallelGroups.forEach((group) => {
        // Split large groups into optimal batch sizes
        const taskBatches = this.splitIntoBatches(group, this.batchSize);

        taskBatches.forEach((batchTasks) => {
          batches.push({
            id: `batch_${batchId++}`,
            tasks: batchTasks,
            parallelism: this.calculateBatchParallelism(batchTasks),
            priority: this.calculateBatchPriority(batchTasks),
            estimated_duration: this.estimateBatchDuration(batchTasks),
            dependencies: this.calculateBatchDependencies(batchTasks, batches),
            status: 'pending',
          });
        });
      });
    });

    return batches;
  }

  private topologicalSort(tasks: Task[], dependencyGraph: Map<string, string[]>): Task[][] {
    const levels: Task[][] = [];
    const inDegree = new Map<string, number>();
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    // Calculate in-degrees
    tasks.forEach((task) => {
      inDegree.set(task.id, 0);
    });

    dependencyGraph.forEach((deps, taskId) => {
      deps.forEach((depId) => {
        if (taskMap.has(depId)) {
          inDegree.set(taskId, (inDegree.get(taskId) || 0) + 1);
        }
      });
    });

    // Process levels
    const remaining = new Set(tasks.map((t) => t.id));

    while (remaining.size > 0) {
      const currentLevel: Task[] = [];

      for (const taskId of remaining) {
        if (inDegree.get(taskId) === 0) {
          currentLevel.push(taskMap.get(taskId)!);
        }
      }

      if (currentLevel.length === 0) {
        throw new Error('Circular dependency detected');
      }

      // Remove processed tasks and update in-degrees
      currentLevel.forEach((task) => {
        remaining.delete(task.id);
        dependencyGraph.get(task.id)?.forEach((depId) => {
          if (inDegree.has(depId)) {
            inDegree.set(depId, inDegree.get(depId)! - 1);
          }
        });
      });

      levels.push(currentLevel);
    }

    return levels;
  }

  private groupByParallelizability(tasks: Task[]): Task[][] {
    const groups: Map<string, Task[]> = new Map();

    tasks.forEach((task) => {
      // Group by type and resource requirements
      const groupKey = `${task.type}_${this.getResourceSignature(task)}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }

      groups.get(groupKey)!.push(task);
    });

    return Array.from(groups.values());
  }

  private getResourceSignature(task: Task): string {
    // Simplified resource signature based on task type
    const resourceMap: Record<string, string> = {
      analysis: 'cpu_intensive',
      implementation: 'balanced',
      testing: 'io_intensive',
      documentation: 'low_resource',
    };

    return resourceMap[task.type] || 'balanced';
  }

  private splitIntoBatches(tasks: Task[], batchSize: number): Task[][] {
    const batches: Task[][] = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
      batches.push(tasks.slice(i, i + batchSize));
    }

    return batches;
  }

  private calculateBatchParallelism(tasks: Task[]): number {
    // Determine optimal parallelism based on task characteristics
    const typeParallelism: Record<string, number> = {
      analysis: 4,
      implementation: 3,
      testing: 6,
      documentation: 8,
    };

    const avgParallelism =
      tasks.reduce((sum, task) => {
        return sum + (typeParallelism[task.type] || 2);
      }, 0) / tasks.length;

    return Math.min(avgParallelism, tasks.length, this.maxConcurrency);
  }

  private calculateBatchPriority(tasks: Task[]): 'urgent' | 'high' | 'medium' | 'low' {
    const priorityScores = { high: 3, medium: 2, low: 1 };

    const avgScore =
      tasks.reduce((sum, task) => {
        return sum + (priorityScores[task.priority as keyof typeof priorityScores] || 1);
      }, 0) / tasks.length;

    if (avgScore >= 2.5) return 'urgent';
    if (avgScore >= 2) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  private estimateBatchDuration(tasks: Task[]): number {
    // Base estimation in minutes
    const typeEstimates: Record<string, number> = {
      analysis: 15,
      implementation: 30,
      testing: 20,
      documentation: 10,
    };

    return (
      tasks.reduce((sum, task) => {
        return sum + (typeEstimates[task.type] || 20);
      }, 0) / tasks.length
    ); // Parallel execution average
  }

  private calculateBatchDependencies(tasks: Task[], existingBatches: TaskBatch[]): string[] {
    const dependencies = new Set<string>();

    tasks.forEach((task) => {
      task.dependencies?.forEach((depId) => {
        // Find which batch contains this dependency
        const dependentBatch = existingBatches.find((batch) =>
          batch.tasks.some((t) => t.id === depId)
        );

        if (dependentBatch) {
          dependencies.add(dependentBatch.id);
        }
      });
    });

    return Array.from(dependencies);
  }

  private calculateCriticalPath(batches: TaskBatch[]): string[] {
    // Find the longest path through batch dependencies
    const visited = new Set<string>();
    const criticalPath: string[] = [];
    let maxDuration = 0;

    const dfs = (batchId: string, currentPath: string[], currentDuration: number) => {
      if (visited.has(batchId)) return;

      visited.add(batchId);
      const batch = batches.find((b) => b.id === batchId);

      if (!batch) return;

      const newPath = [...currentPath, batchId];
      const newDuration = currentDuration + batch.estimated_duration;

      if (newDuration > maxDuration) {
        maxDuration = newDuration;
        criticalPath.splice(0, criticalPath.length, ...newPath);
      }

      // Continue to dependent batches
      batches
        .filter((b) => b.dependencies.includes(batchId))
        .forEach((b) => dfs(b.id, newPath, newDuration));

      visited.delete(batchId);
    };

    // Start from batches with no dependencies
    batches.filter((b) => b.dependencies.length === 0).forEach((b) => dfs(b.id, [], 0));

    return criticalPath;
  }

  private calculateResourceAllocation(batches: TaskBatch[]): Map<string, number> {
    const allocation = new Map<string, number>();

    batches.forEach((batch) => {
      const resourceType = this.getBatchResourceType(batch);
      const currentAllocation = allocation.get(resourceType) || 0;
      allocation.set(resourceType, currentAllocation + batch.parallelism);
    });

    return allocation;
  }

  private getBatchResourceType(batch: TaskBatch): string {
    // Simplified resource type classification
    const taskTypes = batch.tasks.map((t) => t.type);
    const dominant = taskTypes.reduce((a, b) =>
      taskTypes.filter((t) => t === a).length >= taskTypes.filter((t) => t === b).length ? a : b
    );

    return dominant;
  }

  private calculateOptimalStreams(batches: TaskBatch[]): number {
    // Calculate optimal number of parallel execution streams
    const maxParallelism = Math.max(...batches.map((b) => b.parallelism));
    return Math.min(maxParallelism, this.maxConcurrency);
  }

  private estimateTotalTime(batches: TaskBatch[], criticalPath: string[]): number {
    return criticalPath.reduce((sum, batchId) => {
      const batch = batches.find((b) => b.id === batchId);
      return sum + (batch?.estimated_duration || 0);
    }, 0);
  }

  private async executeSchedule(): Promise<void> {
    if (!this.executionPlan) {
      throw new Error('No execution plan available');
    }

    const { batches } = this.executionPlan;
    const executing = new Map<string, Promise<void>>();

    // Execute batches respecting dependencies
    const processBatch = async (batch: TaskBatch): Promise<void> => {
      // Wait for dependencies
      await Promise.all(
        batch.dependencies.map((depId) => executing.get(depId) || Promise.resolve())
      );

      batch.status = 'running';
      this.emit('batch_started', batch);

      try {
        // Execute tasks in batch in parallel
        await Promise.all(batch.tasks.map((task) => this.executeTask(task)));

        batch.status = 'completed';
        this.emit('batch_completed', batch);
      } catch (error) {
        batch.status = 'failed';
        this.emit('batch_failed', { batch, error });
        throw error;
      }
    };

    // Start all batches (dependencies will handle ordering)
    batches.forEach((batch) => {
      executing.set(batch.id, processBatch(batch));
    });

    // Wait for all batches to complete
    await Promise.all(executing.values());

    this.emit('schedule_completed', this.executionPlan);
  }

  private async executeTask(task: Task): Promise<void> {
    this.runningTasks.set(task.id, task);
    this.pendingTasks.delete(task.id);

    const startTime = Date.now();

    try {
      // Assign to process controller
      const processId = await this.processController.assignTaskToProcess(task);

      if (!processId) {
        throw new Error(`Failed to assign task ${task.id} to process`);
      }

      // Wait for task completion (this would be event-driven in real implementation)
      await this.waitForTaskCompletion(task.id);

      const endTime = Date.now();
      task.completed_at = new Date();

      this.runningTasks.delete(task.id);
      this.completedTasks.set(task.id, task);

      this.updateMetrics('completed', endTime - startTime);
      this.emit('task_completed', task);
    } catch (error) {
      const endTime = Date.now();

      this.runningTasks.delete(task.id);
      this.failedTasks.set(task.id, task);

      this.updateMetrics('failed', endTime - startTime);
      this.emit('task_failed', { task, error });

      throw error;
    }
  }

  private async waitForTaskCompletion(taskId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out`));
      }, 300000); // 5 minute timeout

      // In real implementation, this would listen to process controller events
      const checkCompletion = () => {
        if (this.completedTasks.has(taskId)) {
          clearTimeout(timeout);
          resolve();
        } else if (this.failedTasks.has(taskId)) {
          clearTimeout(timeout);
          reject(new Error(`Task ${taskId} failed`));
        } else {
          setTimeout(checkCompletion, 100);
        }
      };

      checkCompletion();
    });
  }

  private updateMetrics(outcome: 'completed' | 'failed', duration: number): void {
    const totalTasks = this.completedTasks.size + this.failedTasks.size;

    if (outcome === 'completed') {
      // Update throughput (tasks per minute)
      this.metrics.throughput = this.completedTasks.size / (process.uptime() / 60);

      // Update average latency
      this.metrics.latency = (this.metrics.latency * (totalTasks - 1) + duration) / totalTasks;
    }

    // Update error rate
    this.metrics.error_rate = this.failedTasks.size / Math.max(totalTasks, 1);

    // Update queue depth
    this.metrics.queue_depth = this.pendingTasks.size;

    // Update resource utilization
    this.metrics.resource_utilization = this.runningTasks.size / this.maxConcurrency;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.emit('metrics_updated', this.metrics);
    }, 5000); // Every 5 seconds
  }

  // Public API
  getStatus(): any {
    return {
      metrics: this.metrics,
      execution_plan: this.executionPlan,
      pending_tasks: this.pendingTasks.size,
      running_tasks: this.runningTasks.size,
      completed_tasks: this.completedTasks.size,
      failed_tasks: this.failedTasks.size,
      max_concurrency: this.maxConcurrency,
    };
  }

  async cancelAllTasks(): Promise<void> {
    // Cancel all pending and running tasks
    for (const task of this.runningTasks.values()) {
      this.emit('task_cancelled', task);
    }

    this.pendingTasks.clear();
    this.runningTasks.clear();

    this.emit('all_tasks_cancelled');
  }

  setMaxConcurrency(maxConcurrency: number): void {
    this.maxConcurrency = maxConcurrency;
    this.emit('concurrency_updated', maxConcurrency);
  }

  setBatchSize(batchSize: number): void {
    this.batchSize = batchSize;
    this.emit('batch_size_updated', batchSize);
  }
}
