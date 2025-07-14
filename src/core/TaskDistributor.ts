import { EventEmitter } from 'events';
import { Task, AgentConfig, ProjectAnalysis } from './MultiAgentOrchestrator';

export interface TaskTemplate {
  type: string;
  title_pattern: string;
  description_pattern: string;
  required_capabilities: string[];
  estimated_duration: number; // in minutes
  priority_rules: {
    base_priority: 'high' | 'medium' | 'low';
    conditions: Array<{
      condition: string;
      priority_modifier: number;
    }>;
  };
}

export interface DistributionStrategy {
  name: string;
  algorithm: 'round_robin' | 'capability_based' | 'load_balanced' | 'priority_first';
  parameters: Record<string, any>;
}

export class TaskDistributor extends EventEmitter {
  private taskTemplates: Map<string, TaskTemplate> = new Map();
  private distributionStrategy: DistributionStrategy;
  private taskHistory: Array<{
    taskId: string;
    agentId: string;
    duration: number;
    success: boolean;
  }> = [];

  constructor(
    strategy: DistributionStrategy = {
      name: 'intelligent',
      algorithm: 'capability_based',
      parameters: {
        load_weight: 0.3,
        capability_weight: 0.4,
        performance_weight: 0.3,
      },
    }
  ) {
    super();
    this.distributionStrategy = strategy;
    this.initializeTaskTemplates();
  }

  private initializeTaskTemplates(): void {
    // Code Analysis Templates
    this.taskTemplates.set('analyze_codebase', {
      type: 'analysis',
      title_pattern: 'Analyze {component} codebase structure',
      description_pattern:
        'Perform comprehensive analysis of {component} including architecture, patterns, dependencies, and potential issues',
      required_capabilities: ['project_analysis', 'architecture_design'],
      estimated_duration: 15,
      priority_rules: {
        base_priority: 'high',
        conditions: [
          { condition: 'is_new_project', priority_modifier: 1 },
          { condition: 'has_complex_architecture', priority_modifier: 2 },
        ],
      },
    });

    this.taskTemplates.set('identify_dependencies', {
      type: 'analysis',
      title_pattern: 'Identify and analyze dependencies for {component}',
      description_pattern:
        'Map out all dependencies, version compatibility, security vulnerabilities, and upgrade paths',
      required_capabilities: ['project_analysis', 'risk_assessment'],
      estimated_duration: 10,
      priority_rules: {
        base_priority: 'medium',
        conditions: [
          { condition: 'has_security_issues', priority_modifier: 3 },
          { condition: 'has_outdated_deps', priority_modifier: 1 },
        ],
      },
    });

    // Implementation Templates
    this.taskTemplates.set('implement_feature', {
      type: 'implementation',
      title_pattern: 'Implement {feature_name} feature',
      description_pattern:
        'Develop {feature_name} according to specifications, including tests, documentation, and error handling',
      required_capabilities: ['code_implementation', 'testing'],
      estimated_duration: 30,
      priority_rules: {
        base_priority: 'medium',
        conditions: [
          { condition: 'is_critical_feature', priority_modifier: 2 },
          { condition: 'blocks_other_tasks', priority_modifier: 1 },
        ],
      },
    });

    this.taskTemplates.set('fix_bug', {
      type: 'implementation',
      title_pattern: 'Fix bug: {bug_description}',
      description_pattern:
        'Investigate, reproduce, and fix the bug: {bug_description}. Include regression tests.',
      required_capabilities: ['bug_fixing', 'testing'],
      estimated_duration: 20,
      priority_rules: {
        base_priority: 'high',
        conditions: [
          { condition: 'is_critical_bug', priority_modifier: 3 },
          { condition: 'affects_production', priority_modifier: 2 },
        ],
      },
    });

    // Testing Templates
    this.taskTemplates.set('create_tests', {
      type: 'testing',
      title_pattern: 'Create comprehensive tests for {component}',
      description_pattern:
        'Develop unit, integration, and end-to-end tests for {component} with >90% coverage',
      required_capabilities: ['testing', 'code_implementation'],
      estimated_duration: 25,
      priority_rules: {
        base_priority: 'medium',
        conditions: [
          { condition: 'low_test_coverage', priority_modifier: 2 },
          { condition: 'critical_component', priority_modifier: 1 },
        ],
      },
    });

    // Documentation Templates
    this.taskTemplates.set('create_documentation', {
      type: 'documentation',
      title_pattern: 'Create documentation for {component}',
      description_pattern:
        'Write comprehensive documentation including API docs, usage examples, and troubleshooting guides',
      required_capabilities: ['documentation'],
      estimated_duration: 15,
      priority_rules: {
        base_priority: 'low',
        conditions: [
          { condition: 'public_api', priority_modifier: 2 },
          { condition: 'complex_component', priority_modifier: 1 },
        ],
      },
    });
  }

  generateTasksFromAnalysis(analysis: ProjectAnalysis): Task[] {
    const tasks: Task[] = [];
    const taskIdCounter = { value: 0 };

    // Generate analysis tasks
    tasks.push(...this.generateAnalysisTasks(analysis, taskIdCounter));

    // Generate implementation tasks
    tasks.push(...this.generateImplementationTasks(analysis, taskIdCounter));

    // Generate testing tasks
    tasks.push(...this.generateTestingTasks(analysis, taskIdCounter));

    // Generate documentation tasks
    tasks.push(...this.generateDocumentationTasks(analysis, taskIdCounter));

    // Set up dependencies
    this.establishTaskDependencies(tasks);

    return tasks;
  }

  private generateAnalysisTasks(analysis: ProjectAnalysis, counter: { value: number }): Task[] {
    const tasks: Task[] = [];

    // Main codebase analysis
    tasks.push(
      this.createTaskFromTemplate('analyze_codebase', {
        id: `task_${++counter.value}`,
        variables: { component: 'entire codebase' },
        priority: 'high',
      })
    );

    // Dependency analysis
    tasks.push(
      this.createTaskFromTemplate('identify_dependencies', {
        id: `task_${++counter.value}`,
        variables: { component: 'project dependencies' },
        priority: 'medium',
      })
    );

    // Technology-specific analysis
    analysis.technologies.forEach((tech) => {
      tasks.push(
        this.createTaskFromTemplate('analyze_codebase', {
          id: `task_${++counter.value}`,
          variables: { component: `${tech} components` },
          priority: 'medium',
        })
      );
    });

    return tasks;
  }

  private generateImplementationTasks(
    analysis: ProjectAnalysis,
    counter: { value: number }
  ): Task[] {
    const tasks: Task[] = [];

    // Feature implementation tasks
    analysis.modifications_needed.forEach((modification) => {
      tasks.push(
        this.createTaskFromTemplate('implement_feature', {
          id: `task_${++counter.value}`,
          variables: { feature_name: modification },
          priority: 'medium',
        })
      );
    });

    // Architecture changes
    analysis.architecture_changes.forEach((change) => {
      tasks.push(
        this.createTaskFromTemplate('implement_feature', {
          id: `task_${++counter.value}`,
          variables: { feature_name: `Architecture: ${change}` },
          priority: 'high',
        })
      );
    });

    return tasks;
  }

  private generateTestingTasks(analysis: ProjectAnalysis, counter: { value: number }): Task[] {
    const tasks: Task[] = [];

    // Test creation for each technology
    analysis.technologies.forEach((tech) => {
      tasks.push(
        this.createTaskFromTemplate('create_tests', {
          id: `task_${++counter.value}`,
          variables: { component: `${tech} components` },
          priority: 'medium',
        })
      );
    });

    // Integration tests
    if (analysis.complexity === 'high') {
      tasks.push(
        this.createTaskFromTemplate('create_tests', {
          id: `task_${++counter.value}`,
          variables: { component: 'integration tests' },
          priority: 'high',
        })
      );
    }

    return tasks;
  }

  private generateDocumentationTasks(
    analysis: ProjectAnalysis,
    counter: { value: number }
  ): Task[] {
    const tasks: Task[] = [];

    // Documentation for each requirement
    analysis.documentation_needs.forEach((docNeed) => {
      tasks.push(
        this.createTaskFromTemplate('create_documentation', {
          id: `task_${++counter.value}`,
          variables: { component: docNeed },
          priority: 'low',
        })
      );
    });

    return tasks;
  }

  private createTaskFromTemplate(
    templateKey: string,
    options: {
      id: string;
      variables: Record<string, string>;
      priority?: 'high' | 'medium' | 'low';
    }
  ): Task {
    const template = this.taskTemplates.get(templateKey);
    if (!template) {
      throw new Error(`Template ${templateKey} not found`);
    }

    const title = this.interpolateString(template.title_pattern, options.variables);
    const description = this.interpolateString(template.description_pattern, options.variables);

    return {
      id: options.id,
      title,
      description,
      type: template.type as Task['type'],
      priority: options.priority || template.priority_rules.base_priority,
      dependencies: [],
      status: 'pending',
      created_at: new Date(),
      child_tasks: [],
    };
  }

  private interpolateString(pattern: string, variables: Record<string, string>): string {
    let result = pattern;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  private establishTaskDependencies(tasks: Task[]): void {
    // Analysis tasks should complete before implementation
    const analysisTasks = tasks.filter((t) => t.type === 'analysis');
    const implementationTasks = tasks.filter((t) => t.type === 'implementation');
    const testingTasks = tasks.filter((t) => t.type === 'testing');
    const documentationTasks = tasks.filter((t) => t.type === 'documentation');

    // Implementation depends on analysis
    implementationTasks.forEach((implTask) => {
      implTask.dependencies = analysisTasks.map((t) => t.id);
    });

    // Testing depends on implementation
    testingTasks.forEach((testTask) => {
      testTask.dependencies = implementationTasks.map((t) => t.id);
    });

    // Documentation can run parallel with testing but after implementation
    documentationTasks.forEach((docTask) => {
      docTask.dependencies = implementationTasks.map((t) => t.id);
    });
  }

  distributeTask(task: Task, availableAgents: AgentConfig[]): AgentConfig | null {
    if (availableAgents.length === 0) {
      return null;
    }

    switch (this.distributionStrategy.algorithm) {
      case 'capability_based':
        return this.distributeByCapability(task, availableAgents);
      case 'load_balanced':
        return this.distributeByLoad(task, availableAgents);
      case 'priority_first':
        return this.distributeByPriority(task, availableAgents);
      case 'round_robin':
        return this.distributeRoundRobin(task, availableAgents);
      default:
        return this.distributeSmart(task, availableAgents);
    }
  }

  private distributeByCapability(task: Task, agents: AgentConfig[]): AgentConfig | null {
    const template = Array.from(this.taskTemplates.values()).find((t) => t.type === task.type);

    if (!template) {
      return agents[0]; // Fallback
    }

    const suitableAgents = agents.filter((agent) =>
      template.required_capabilities.every((cap) => agent.capabilities.includes(cap))
    );

    if (suitableAgents.length === 0) {
      return agents[0]; // Fallback to any available agent
    }

    // Return the most suitable agent based on performance history
    return this.getBestPerformingAgent(suitableAgents, task.type);
  }

  private distributeByLoad(task: Task, agents: AgentConfig[]): AgentConfig {
    // Simple load balancing - agent with least active tasks
    const agentLoads = agents.map((agent) => ({
      agent,
      load: this.getAgentLoad(agent.id),
    }));

    agentLoads.sort((a, b) => a.load - b.load);
    return agentLoads[0].agent;
  }

  private distributeByPriority(task: Task, agents: AgentConfig[]): AgentConfig {
    // High priority tasks go to the most capable agents
    if (task.priority === 'high') {
      return agents.find((a) => a.type === 'architect') || agents[0];
    } else if (task.priority === 'medium') {
      return agents.find((a) => a.type === 'manager') || agents[0];
    } else {
      return agents.find((a) => a.type === 'worker') || agents[0];
    }
  }

  private distributeRoundRobin(task: Task, agents: AgentConfig[]): AgentConfig {
    // Simple round robin based on task count
    const taskCounts = agents.map((agent) => ({
      agent,
      count: this.getAgentTaskCount(agent.id),
    }));

    taskCounts.sort((a, b) => a.count - b.count);
    return taskCounts[0].agent;
  }

  private distributeSmart(task: Task, agents: AgentConfig[]): AgentConfig {
    // Intelligent distribution combining multiple factors
    const scores = agents.map((agent) => ({
      agent,
      score: this.calculateAgentScore(agent, task),
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores[0].agent;
  }

  private calculateAgentScore(agent: AgentConfig, task: Task): number {
    const params = this.distributionStrategy.parameters;

    const capabilityScore = this.getCapabilityScore(agent, task);
    const loadScore = 1 - this.getAgentLoad(agent.id) / agent.parallel_limit;
    const performanceScore = this.getPerformanceScore(agent.id, task.type);

    return (
      capabilityScore * (params.capability_weight || 0.4) +
      loadScore * (params.load_weight || 0.3) +
      performanceScore * (params.performance_weight || 0.3)
    );
  }

  private getCapabilityScore(agent: AgentConfig, task: Task): number {
    const template = Array.from(this.taskTemplates.values()).find((t) => t.type === task.type);

    if (!template) return 0.5;

    const matchingCapabilities = template.required_capabilities.filter((cap) =>
      agent.capabilities.includes(cap)
    );

    return matchingCapabilities.length / template.required_capabilities.length;
  }

  private getAgentLoad(agentId: string): number {
    // This would be implemented to track actual active tasks
    return Math.floor(Math.random() * 3); // Mock implementation
  }

  private getAgentTaskCount(agentId: string): number {
    return this.taskHistory.filter((h) => h.agentId === agentId).length;
  }

  private getPerformanceScore(agentId: string, taskType: string): number {
    const relevantHistory = this.taskHistory.filter((h) => h.agentId === agentId && h.success);

    if (relevantHistory.length === 0) return 0.5;

    const successRate =
      relevantHistory.length / this.taskHistory.filter((h) => h.agentId === agentId).length;

    const avgDuration =
      relevantHistory.reduce((sum, h) => sum + h.duration, 0) / relevantHistory.length;

    // Normalize scores (higher is better)
    const normalizedSuccessRate = successRate;
    const normalizedSpeed = Math.max(0, 1 - avgDuration / 60); // Assume 60 min baseline

    return (normalizedSuccessRate + normalizedSpeed) / 2;
  }

  private getBestPerformingAgent(agents: AgentConfig[], taskType: string): AgentConfig {
    const scores = agents.map((agent) => ({
      agent,
      score: this.getPerformanceScore(agent.id, taskType),
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores[0].agent;
  }

  recordTaskCompletion(taskId: string, agentId: string, duration: number, success: boolean): void {
    this.taskHistory.push({
      taskId,
      agentId,
      duration,
      success,
    });

    // Keep only recent history (last 1000 tasks)
    if (this.taskHistory.length > 1000) {
      this.taskHistory = this.taskHistory.slice(-1000);
    }
  }

  getDistributionStats(): any {
    const agentStats = new Map<
      string,
      {
        tasksAssigned: number;
        successRate: number;
        avgDuration: number;
      }
    >();

    for (const record of this.taskHistory) {
      if (!agentStats.has(record.agentId)) {
        agentStats.set(record.agentId, {
          tasksAssigned: 0,
          successRate: 0,
          avgDuration: 0,
        });
      }

      const stats = agentStats.get(record.agentId)!;
      stats.tasksAssigned++;
    }

    // Calculate success rates and average durations
    for (const [agentId, stats] of agentStats) {
      const agentRecords = this.taskHistory.filter((r) => r.agentId === agentId);
      const successfulTasks = agentRecords.filter((r) => r.success);

      stats.successRate = successfulTasks.length / agentRecords.length;
      stats.avgDuration =
        agentRecords.reduce((sum, r) => sum + r.duration, 0) / agentRecords.length;
    }

    return {
      strategy: this.distributionStrategy,
      agentStats: Object.fromEntries(agentStats),
      totalTasks: this.taskHistory.length,
    };
  }
}
