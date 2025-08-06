import { EventEmitter } from 'events';
import { Task } from '../core/MultiAgentOrchestrator';

export interface PriorityRule {
  id: string;
  name: string;
  condition: (task: Task, context: PriorityContext) => boolean;
  priority_boost: number;
  weight: number;
  enabled: boolean;
  description: string;
}

export interface PriorityContext {
  system_load: number;
  queue_depth: number;
  error_rate: number;
  user_interaction: boolean;
  deadline?: Date;
  project_priority: 'critical' | 'high' | 'medium' | 'low';
  resource_availability: Record<string, number>;
  historical_data: TaskHistoryData[];
}

export interface TaskHistoryData {
  taskId: string;
  type: string;
  priority: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  resourceUsage: Record<string, number>;
}

export interface PriorityScore {
  base_priority: number;
  dynamic_adjustments: Array<{
    rule_id: string;
    adjustment: number;
    reason: string;
  }>;
  final_score: number;
  urgency_factor: number;
  business_impact: number;
  technical_complexity: number;
  timestamp: Date;
}

export interface PriorityConfiguration {
  enable_dynamic_priority: boolean;
  enable_machine_learning: boolean;
  priority_decay_rate: number; // How much priority decreases over time
  urgency_threshold: number;
  max_priority_boost: number;
  min_priority_floor: number;
  learning_window_hours: number;
  rebalance_interval_ms: number;
}

export class SmartPriorityManager extends EventEmitter {
  private rules: Map<string, PriorityRule> = new Map();
  private taskHistory: TaskHistoryData[] = [];
  private priorityScores: Map<string, PriorityScore> = new Map();
  private config: PriorityConfiguration;
  private mlModel: PriorityMLModel | null = null;
  private rebalanceInterval: NodeJS.Timeout | null = null;
  private contextCache: PriorityContext | null = null;
  private lastContextUpdate: Date | null = null;

  constructor(config: Partial<PriorityConfiguration> = {}) {
    super();

    this.config = {
      enable_dynamic_priority: true,
      enable_machine_learning: true,
      priority_decay_rate: 0.1, // 10% per hour
      urgency_threshold: 80,
      max_priority_boost: 50,
      min_priority_floor: 1,
      learning_window_hours: 168, // 7 days
      rebalance_interval_ms: 60000, // 1 minute
      ...config,
    };

    this.initializeDefaultRules();
    this.startRebalancing();

    if (this.config.enable_machine_learning) {
      this.mlModel = new PriorityMLModel();
    }
  }

  private initializeDefaultRules(): void {
    // Critical system issues
    this.addRule({
      id: 'system_critical',
      name: 'System Critical Issues',
      condition: (task, context) =>
        task.type === 'analysis' &&
        (task.title.toLowerCase().includes('error') ||
          task.title.toLowerCase().includes('critical') ||
          task.title.toLowerCase().includes('security')),
      priority_boost: 40,
      weight: 1.0,
      enabled: true,
      description: 'Boost priority for critical system issues',
    });

    // User-interactive tasks
    this.addRule({
      id: 'user_interactive',
      name: 'User Interactive Tasks',
      condition: (task, context) => context.user_interaction,
      priority_boost: 25,
      weight: 0.8,
      enabled: true,
      description: 'Boost priority for tasks requiring user interaction',
    });

    // High system load adjustment
    this.addRule({
      id: 'high_load_adjustment',
      name: 'High System Load',
      condition: (task, context) => context.system_load > 80,
      priority_boost: -15, // Reduce priority under high load
      weight: 0.6,
      enabled: true,
      description: 'Reduce priority when system load is high',
    });

    // Queue depth management
    this.addRule({
      id: 'queue_depth_boost',
      name: 'Queue Depth Management',
      condition: (task, context) => {
        const queuePosition = context.queue_depth;
        return task.priority === 'high' && queuePosition > 20;
      },
      priority_boost: 30,
      weight: 0.7,
      enabled: true,
      description: 'Boost high priority tasks when queue is deep',
    });

    // Deadline urgency
    this.addRule({
      id: 'deadline_urgency',
      name: 'Deadline Urgency',
      condition: (task, context) => {
        if (!context.deadline) return false;
        const timeToDeadline = context.deadline.getTime() - Date.now();
        const oneHour = 60 * 60 * 1000;
        return timeToDeadline <= oneHour * 2; // Within 2 hours
      },
      priority_boost: 45,
      weight: 0.9,
      enabled: true,
      description: 'Urgent boost for tasks approaching deadline',
    });

    // Error rate adjustment
    this.addRule({
      id: 'error_rate_adjustment',
      name: 'Error Rate Adjustment',
      condition: (task, context) => context.error_rate > 0.1, // 10% error rate
      priority_boost: -10,
      weight: 0.5,
      enabled: true,
      description: 'Reduce priority when error rate is high',
    });

    // Resource availability
    this.addRule({
      id: 'resource_availability',
      name: 'Resource Availability',
      condition: (task, context) => {
        const requiredResource = this.getTaskResourceType(task);
        const availability = context.resource_availability[requiredResource] || 0;
        return availability > 0.8; // 80% availability
      },
      priority_boost: 15,
      weight: 0.4,
      enabled: true,
      description: 'Boost priority when required resources are available',
    });

    // Historical performance
    this.addRule({
      id: 'historical_success',
      name: 'Historical Success Rate',
      condition: (task, context) => {
        const similarTasks = context.historical_data.filter(
          (h) => h.type === task.type && h.success
        );
        const successRate =
          similarTasks.length /
          Math.max(context.historical_data.filter((h) => h.type === task.type).length, 1);
        return successRate > 0.9; // 90% success rate
      },
      priority_boost: 10,
      weight: 0.3,
      enabled: true,
      description: 'Boost priority for task types with high success rate',
    });

    // Project priority alignment
    this.addRule({
      id: 'project_priority',
      name: 'Project Priority Alignment',
      condition: (task, context) => context.project_priority === 'critical',
      priority_boost: 35,
      weight: 0.8,
      enabled: true,
      description: 'Boost priority for critical project tasks',
    });

    // Implementation priority over documentation
    this.addRule({
      id: 'implementation_priority',
      name: 'Implementation Over Documentation',
      condition: (task, context) => task.type === 'implementation' && context.queue_depth > 10,
      priority_boost: 20,
      weight: 0.6,
      enabled: true,
      description: 'Prioritize implementation tasks when queue is busy',
    });
  }

  addRule(rule: PriorityRule): void {
    this.rules.set(rule.id, rule);
    this.emit('rule_added', rule);
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.emit('rule_removed', { ruleId });
    }
    return removed;
  }

  updateRule(ruleId: string, updates: Partial<PriorityRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    this.emit('rule_updated', { ruleId, rule: updatedRule });
    return true;
  }

  enableRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { enabled: true });
  }

  disableRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { enabled: false });
  }

  calculatePriority(task: Task, context?: PriorityContext): PriorityScore {
    const ctx = context || this.getCurrentContext();

    // Base priority mapping
    const basePriorityMap = { high: 100, medium: 50, low: 25 };
    const basePriority = basePriorityMap[task.priority as keyof typeof basePriorityMap] || 50;

    const adjustments: PriorityScore['dynamic_adjustments'] = [];
    let totalAdjustment = 0;

    // Apply rules
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(task, ctx)) {
          const weightedBoost = rule.priority_boost * rule.weight;
          totalAdjustment += weightedBoost;

          adjustments.push({
            rule_id: ruleId,
            adjustment: weightedBoost,
            reason: rule.description,
          });
        }
      } catch (error) {
        this.emit('rule_error', { ruleId, error, task: task.id });
      }
    }

    // Apply ML prediction if available
    if (this.config.enable_machine_learning && this.mlModel) {
      try {
        const mlAdjustment = this.mlModel.predictPriorityAdjustment(task, ctx, this.taskHistory);
        totalAdjustment += mlAdjustment;

        adjustments.push({
          rule_id: 'ml_prediction',
          adjustment: mlAdjustment,
          reason: 'Machine learning prediction',
        });
      } catch (error) {
        this.emit('ml_error', { error, task: task.id });
      }
    }

    // Apply bounds
    const maxBoost = this.config.max_priority_boost;
    const minFloor = this.config.min_priority_floor;

    totalAdjustment = Math.max(-basePriority + minFloor, Math.min(totalAdjustment, maxBoost));

    const finalScore = Math.max(minFloor, basePriority + totalAdjustment);

    // Calculate additional factors
    const urgencyFactor = this.calculateUrgencyFactor(task, ctx);
    const businessImpact = this.calculateBusinessImpact(task, ctx);
    const technicalComplexity = this.calculateTechnicalComplexity(task, ctx);

    const score: PriorityScore = {
      base_priority: basePriority,
      dynamic_adjustments: adjustments,
      final_score: finalScore,
      urgency_factor: urgencyFactor,
      business_impact: businessImpact,
      technical_complexity: technicalComplexity,
      timestamp: new Date(),
    };

    this.priorityScores.set(task.id, score);
    this.emit('priority_calculated', { task: task.id, score });

    return score;
  }

  private calculateUrgencyFactor(task: Task, context: PriorityContext): number {
    let urgency = 0;

    // Time-based urgency
    if (context.deadline) {
      const timeToDeadline = context.deadline.getTime() - Date.now();
      const oneHour = 60 * 60 * 1000;

      if (timeToDeadline <= oneHour) urgency += 50;
      else if (timeToDeadline <= oneHour * 4) urgency += 30;
      else if (timeToDeadline <= oneHour * 24) urgency += 15;
    }

    // Queue-based urgency
    if (context.queue_depth > 30) urgency += 20;
    else if (context.queue_depth > 15) urgency += 10;

    // System state urgency
    if (context.error_rate > 0.2) urgency += 25;
    if (context.system_load > 90) urgency += 15;

    return Math.min(urgency, 100);
  }

  private calculateBusinessImpact(task: Task, context: PriorityContext): number {
    let impact = 25; // Base impact

    // Project priority impact
    switch (context.project_priority) {
      case 'critical':
        impact += 40;
        break;
      case 'high':
        impact += 25;
        break;
      case 'medium':
        impact += 10;
        break;
      case 'low':
        impact += 0;
        break;
    }

    // Task type impact
    switch (task.type) {
      case 'analysis':
        impact += task.title.toLowerCase().includes('security') ? 30 : 10;
        break;
      case 'implementation':
        impact += 20;
        break;
      case 'testing':
        impact += 15;
        break;
      case 'documentation':
        impact += 5;
        break;
    }

    // User interaction impact
    if (context.user_interaction) impact += 20;

    return Math.min(impact, 100);
  }

  private calculateTechnicalComplexity(task: Task, context: PriorityContext): number {
    let complexity = 25; // Base complexity

    // Dependency complexity
    if (task.dependencies && task.dependencies.length > 0) {
      complexity += task.dependencies.length * 5;
    }

    // Historical complexity (based on average duration)
    const similarTasks = context.historical_data.filter((h) => h.type === task.type);
    if (similarTasks.length > 0) {
      const avgDuration =
        similarTasks.reduce((sum, h) => sum + h.duration, 0) / similarTasks.length;

      if (avgDuration > 1800000)
        complexity += 30; // > 30 minutes
      else if (avgDuration > 600000)
        complexity += 15; // > 10 minutes
      else if (avgDuration > 180000) complexity += 5; // > 3 minutes
    }

    // Task description complexity indicators
    const complexityKeywords = ['refactor', 'architecture', 'migration', 'optimization'];
    const hasComplexKeyword = complexityKeywords.some(
      (keyword) =>
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword)
    );

    if (hasComplexKeyword) complexity += 20;

    return Math.min(complexity, 100);
  }

  prioritizeTasks(tasks: Task[], context?: PriorityContext): Task[] {
    const ctx = context || this.getCurrentContext();

    // Calculate priorities for all tasks
    const taskPriorities = tasks.map((task) => ({
      task,
      score: this.calculatePriority(task, ctx),
    }));

    // Sort by final score (descending)
    taskPriorities.sort((a, b) => b.score.final_score - a.score.final_score);

    // Apply priority decay for old tasks
    if (this.config.enable_dynamic_priority) {
      this.applyPriorityDecay(taskPriorities);
    }

    const sortedTasks = taskPriorities.map((tp) => tp.task);

    this.emit('tasks_prioritized', {
      task_count: tasks.length,
      highest_priority: taskPriorities[0]?.score.final_score || 0,
      lowest_priority: taskPriorities[taskPriorities.length - 1]?.score.final_score || 0,
    });

    return sortedTasks;
  }

  private applyPriorityDecay(taskPriorities: Array<{ task: Task; score: PriorityScore }>): void {
    const now = Date.now();
    const decayRate = this.config.priority_decay_rate;

    taskPriorities.forEach(({ task, score }) => {
      const ageHours = (now - task.created_at.getTime()) / (1000 * 60 * 60);
      const decayFactor = Math.pow(1 - decayRate, ageHours);

      score.final_score *= decayFactor;
      score.final_score = Math.max(score.final_score, this.config.min_priority_floor);
    });
  }

  updateTaskHistory(taskData: TaskHistoryData): void {
    this.taskHistory.push(taskData);

    // Keep only recent history
    const cutoffTime = Date.now() - this.config.learning_window_hours * 60 * 60 * 1000;
    this.taskHistory = this.taskHistory.filter((h) => h.timestamp.getTime() > cutoffTime);

    // Update ML model if available
    if (this.config.enable_machine_learning && this.mlModel) {
      this.mlModel.updateModel(this.taskHistory);
    }

    this.emit('history_updated', { total_records: this.taskHistory.length });
  }

  private getCurrentContext(): PriorityContext {
    // Cache context for 30 seconds
    if (
      this.contextCache &&
      this.lastContextUpdate &&
      Date.now() - this.lastContextUpdate.getTime() < 30000
    ) {
      return this.contextCache;
    }

    // In a real implementation, these would be fetched from system monitors
    this.contextCache = {
      system_load: Math.random() * 100, // Mock system load
      queue_depth: Math.floor(Math.random() * 50),
      error_rate: Math.random() * 0.1,
      user_interaction: Math.random() > 0.7,
      project_priority: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)] as any,
      resource_availability: {
        cpu: Math.random(),
        memory: Math.random(),
        disk: Math.random(),
        network: Math.random(),
      },
      historical_data: this.taskHistory,
    };

    this.lastContextUpdate = new Date();
    return this.contextCache;
  }

  private getTaskResourceType(task: Task): string {
    switch (task.type) {
      case 'analysis':
        return 'cpu';
      case 'implementation':
        return 'memory';
      case 'testing':
        return 'cpu';
      case 'documentation':
        return 'disk';
      default:
        return 'cpu';
    }
  }

  private startRebalancing(): void {
    this.rebalanceInterval = setInterval(() => {
      this.rebalancePriorities();
    }, this.config.rebalance_interval_ms);
  }

  private rebalancePriorities(): void {
    if (this.priorityScores.size === 0) return;

    const context = this.getCurrentContext();
    let adjustmentsMade = 0;

    // Check if any priorities need updating based on context changes
    for (const [taskId, score] of this.priorityScores) {
      const ageMinutes = (Date.now() - score.timestamp.getTime()) / (1000 * 60);

      // Recalculate if score is old or context has changed significantly
      if (ageMinutes > 5 || this.shouldRecalculate(score, context)) {
        // In a real implementation, you'd need access to the task object
        // This is a simplified example
        adjustmentsMade++;
      }
    }

    if (adjustmentsMade > 0) {
      this.emit('priorities_rebalanced', { adjustments: adjustmentsMade });
    }
  }

  private shouldRecalculate(score: PriorityScore, context: PriorityContext): boolean {
    // Simple heuristic - recalculate if system conditions changed significantly
    return context.system_load > 80 || context.error_rate > 0.1 || context.queue_depth > 25;
  }

  // Public API methods
  getRules(): PriorityRule[] {
    return Array.from(this.rules.values());
  }

  getTaskScore(taskId: string): PriorityScore | undefined {
    return this.priorityScores.get(taskId);
  }

  getConfiguration(): PriorityConfiguration {
    return { ...this.config };
  }

  updateConfiguration(updates: Partial<PriorityConfiguration>): void {
    this.config = { ...this.config, ...updates };

    // Restart rebalancing if interval changed
    if (updates.rebalance_interval_ms && this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval);
      this.startRebalancing();
    }

    this.emit('configuration_updated', this.config);
  }

  getStatistics(): any {
    const scores = Array.from(this.priorityScores.values());

    return {
      total_rules: this.rules.size,
      enabled_rules: Array.from(this.rules.values()).filter((r) => r.enabled).length,
      total_scores: scores.length,
      average_score:
        scores.length > 0 ? scores.reduce((sum, s) => sum + s.final_score, 0) / scores.length : 0,
      highest_score: scores.length > 0 ? Math.max(...scores.map((s) => s.final_score)) : 0,
      lowest_score: scores.length > 0 ? Math.min(...scores.map((s) => s.final_score)) : 0,
      history_size: this.taskHistory.length,
      ml_enabled: this.config.enable_machine_learning,
      dynamic_enabled: this.config.enable_dynamic_priority,
    };
  }

  shutdown(): void {
    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval);
      this.rebalanceInterval = null;
    }

    this.rules.clear();
    this.priorityScores.clear();
    this.taskHistory.splice(0);
    this.contextCache = null;

    this.emit('shutdown_complete');
  }
}

// Simplified ML Model for priority prediction
class PriorityMLModel {
  private trainingData: Array<{
    features: number[];
    target: number;
  }> = [];

  private weights: number[] = [];
  private bias: number = 0;
  private isModelTrained: boolean = false;

  constructor() {
    // Initialize with random weights
    this.weights = Array.from({ length: 10 }, () => Math.random() - 0.5);
    this.bias = Math.random() - 0.5;
  }

  extractFeatures(task: Task, context: PriorityContext, history: TaskHistoryData[]): number[] {
    const features = [];

    // Task features
    features.push(task.priority === 'high' ? 1 : task.priority === 'medium' ? 0.5 : 0);
    features.push(task.dependencies?.length || 0);
    features.push(task.type === 'analysis' ? 1 : task.type === 'implementation' ? 0.7 : 0.3);

    // Context features
    features.push(context.system_load / 100);
    features.push(context.queue_depth / 100);
    features.push(context.error_rate);
    features.push(context.user_interaction ? 1 : 0);

    // Historical features
    const similarTasks = history.filter((h) => h.type === task.type);
    features.push(
      similarTasks.length > 0
        ? similarTasks.reduce((sum, h) => sum + (h.success ? 1 : 0), 0) / similarTasks.length
        : 0.5
    );
    features.push(similarTasks.length);

    // Time feature
    const ageHours = (Date.now() - task.created_at.getTime()) / (1000 * 60 * 60);
    features.push(Math.min(ageHours / 24, 1)); // Normalize to 0-1 over 24 hours

    return features;
  }

  predictPriorityAdjustment(
    task: Task,
    context: PriorityContext,
    history: TaskHistoryData[]
  ): number {
    if (!this.isModelTrained || this.weights.length === 0) {
      return 0; // No prediction if model isn't trained
    }

    const features = this.extractFeatures(task, context, history);

    // Simple linear prediction
    let prediction = this.bias;
    for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
      prediction += features[i] * this.weights[i];
    }

    // Scale and bound the prediction
    return Math.max(-30, Math.min(30, prediction * 10));
  }

  updateModel(history: TaskHistoryData[]): void {
    // Simplified online learning - in production, you'd use a proper ML library
    if (history.length < 10) return; // Need minimum data

    // This is a very simplified approach - in practice, you'd implement
    // proper gradient descent, cross-validation, etc.
    this.isModelTrained = true;

    // Mock training process
    console.log(`ML Model updated with ${history.length} historical records`);
  }
}

export default SmartPriorityManager;
