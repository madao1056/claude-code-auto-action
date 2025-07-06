import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface AgentConfig {
  id: string;
  name: string;
  type: 'architect' | 'manager' | 'worker';
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompts: string[];
  capabilities: string[];
  parallel_limit: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'analysis' | 'implementation' | 'testing' | 'documentation';
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  assignedAgent?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  parent_task?: string;
  child_tasks: string[];
}

export interface ProjectAnalysis {
  project_type: string;
  technologies: string[];
  complexity: 'low' | 'medium' | 'high';
  estimated_tasks: number;
  modifications_needed: string[];
  architecture_changes: string[];
  test_requirements: string[];
  documentation_needs: string[];
}

export class MultiAgentOrchestrator extends EventEmitter {
  private agents: Map<string, AgentConfig> = new Map();
  private tasks: Map<string, Task> = new Map();
  private taskQueue: string[] = [];
  private activeTasks: Map<string, string> = new Map(); // taskId -> agentId
  private projectAnalysis: ProjectAnalysis | null = null;
  private sessionId: string;

  constructor() {
    super();
    this.sessionId = uuidv4();
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // Architect Agent - Top-level planning and architecture
    this.agents.set('architect', {
      id: 'architect',
      name: 'Architecture Agent',
      type: 'architect',
      model: 'opus',
      temperature: 0.7,
      max_tokens: 4000,
      system_prompts: [
        'deep-thinking',
        'architecture-first',
        'step-by-step reasoning',
        'evaluate trade-offs',
        'You are an expert software architect responsible for high-level project analysis and task decomposition.'
      ],
      capabilities: [
        'project_analysis',
        'task_decomposition',
        'architecture_design',
        'technology_selection',
        'risk_assessment'
      ],
      parallel_limit: 1
    });

    // Manager Agents - Task coordination and oversight
    for (let i = 1; i <= 3; i++) {
      this.agents.set(`manager_${i}`, {
        id: `manager_${i}`,
        name: `Manager Agent ${i}`,
        type: 'manager',
        model: 'opus',
        temperature: 0.6,
        max_tokens: 3000,
        system_prompts: [
          'step-by-step',
          'context-aware',
          'consider edge cases',
          'You are a technical manager responsible for coordinating implementation tasks and ensuring quality.'
        ],
        capabilities: [
          'task_coordination',
          'quality_assurance',
          'progress_monitoring',
          'resource_allocation',
          'issue_resolution'
        ],
        parallel_limit: 2
      });
    }

    // Worker Agents - Implementation and execution
    for (let i = 1; i <= 6; i++) {
      this.agents.set(`worker_${i}`, {
        id: `worker_${i}`,
        name: `Worker Agent ${i}`,
        type: 'worker',
        model: 'sonnet',
        temperature: 0.5,
        max_tokens: 2000,
        system_prompts: [
          'implementation-focused',
          'clean-code',
          'performance-critical',
          'You are a skilled developer responsible for implementing specific features and fixes.'
        ],
        capabilities: [
          'code_implementation',
          'bug_fixing',
          'testing',
          'documentation',
          'optimization'
        ],
        parallel_limit: 3
      });
    }
  }

  async analyzeProject(projectPath: string, requirements: string): Promise<ProjectAnalysis> {
    const taskId = this.createTask({
      title: 'Project Analysis',
      description: `Analyze project at ${projectPath} with requirements: ${requirements}`,
      type: 'analysis',
      priority: 'high',
      dependencies: []
    });

    const architectAgent = this.agents.get('architect')!;
    await this.assignTaskToAgent(taskId, architectAgent.id);

    return new Promise((resolve, reject) => {
      this.once(`task_completed:${taskId}`, (result) => {
        this.projectAnalysis = result;
        resolve(result);
      });

      this.once(`task_failed:${taskId}`, (error) => {
        reject(error);
      });
    });
  }

  async decomposeIntoTasks(analysis: ProjectAnalysis): Promise<string[]> {
    const taskId = this.createTask({
      title: 'Task Decomposition',
      description: `Decompose project into executable tasks based on analysis`,
      type: 'analysis',
      priority: 'high',
      dependencies: []
    });

    const architectAgent = this.agents.get('architect')!;
    await this.assignTaskToAgent(taskId, architectAgent.id);

    return new Promise((resolve, reject) => {
      this.once(`task_completed:${taskId}`, (taskIds) => {
        resolve(taskIds);
      });

      this.once(`task_failed:${taskId}`, (error) => {
        reject(error);
      });
    });
  }

  createTask(taskData: Partial<Task>): string {
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      type: taskData.type || 'implementation',
      priority: taskData.priority || 'medium',
      dependencies: taskData.dependencies || [],
      status: 'pending',
      created_at: new Date(),
      child_tasks: [],
      parent_task: taskData.parent_task,
      ...taskData
    };

    this.tasks.set(taskId, task);
    this.taskQueue.push(taskId);
    this.emit('task_created', task);
    
    return taskId;
  }

  async assignTaskToAgent(taskId: string, agentId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task || !agent) {
      throw new Error(`Task ${taskId} or Agent ${agentId} not found`);
    }

    task.assignedAgent = agentId;
    task.status = 'in_progress';
    task.started_at = new Date();
    this.activeTasks.set(taskId, agentId);

    this.emit('task_assigned', { task, agent });

    try {
      const result = await this.executeTask(task, agent);
      this.completeTask(taskId, result);
    } catch (error) {
      this.failTask(taskId, error as Error);
    }
  }

  private async executeTask(task: Task, agent: AgentConfig): Promise<any> {
    // Simulate Claude Code execution
    const prompt = this.buildPrompt(task, agent);
    
    // This would be replaced with actual Claude Code API calls
    const mockResult = await this.simulateClaudeExecution(prompt, agent);
    
    return mockResult;
  }

  private buildPrompt(task: Task, agent: AgentConfig): string {
    const systemPrompts = agent.system_prompts.join('\n');
    const context = this.getTaskContext(task);
    
    return `
${systemPrompts}

Project Context:
${JSON.stringify(this.projectAnalysis, null, 2)}

Task Details:
- Title: ${task.title}
- Description: ${task.description}
- Type: ${task.type}
- Priority: ${task.priority}
- Dependencies: ${task.dependencies.join(', ')}

Additional Context:
${context}

Please execute this task and provide a detailed response including:
1. Implementation details
2. Files modified/created
3. Any issues encountered
4. Next steps or recommendations
5. Testing considerations
`;
  }

  private getTaskContext(task: Task): string {
    const dependencies = task.dependencies
      .map(depId => this.tasks.get(depId))
      .filter(dep => dep && dep.status === 'completed')
      .map(dep => `- ${dep!.title}: ${dep!.result}`)
      .join('\n');

    return `
Task Dependencies (completed):
${dependencies}

Related Tasks:
${task.child_tasks.map(childId => {
  const child = this.tasks.get(childId);
  return child ? `- ${child.title} (${child.status})` : '';
}).join('\n')}
`;
  }

  private async simulateClaudeExecution(prompt: string, agent: AgentConfig): Promise<any> {
    // This would be replaced with actual Claude Code API integration
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    return {
      status: 'completed',
      files_modified: ['src/example.ts', 'tests/example.test.ts'],
      implementation_details: 'Mock implementation completed successfully',
      next_steps: ['Run tests', 'Update documentation'],
      agent_used: agent.id
    };
  }

  private completeTask(taskId: string, result: any): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.result = result;
    task.completed_at = new Date();
    this.activeTasks.delete(taskId);

    this.emit('task_completed', task);
    this.emit(`task_completed:${taskId}`, result);

    // Process dependent tasks
    this.processTaskQueue();
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  failTask(taskId: string, error: Error): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'failed';
    task.error = error.message;
    task.completed_at = new Date();
    this.activeTasks.delete(taskId);

    this.emit('task_failed', { task, error });
    this.emit(`task_failed:${taskId}`, error);
  }

  private processTaskQueue(): void {
    // Find tasks that are ready to be executed (dependencies satisfied)
    const readyTasks = this.taskQueue.filter(taskId => {
      const task = this.tasks.get(taskId);
      if (!task || task.status !== 'pending') return false;

      // Check if all dependencies are completed
      return task.dependencies.every(depId => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'completed';
      });
    });

    // Assign tasks to available agents
    for (const taskId of readyTasks) {
      const availableAgent = this.findAvailableAgent();
      if (availableAgent) {
        this.assignTaskToAgent(taskId, availableAgent.id);
        this.taskQueue = this.taskQueue.filter(id => id !== taskId);
      }
    }
  }

  private findAvailableAgent(): AgentConfig | null {
    for (const agent of this.agents.values()) {
      const activeTasksForAgent = Array.from(this.activeTasks.values())
        .filter(agentId => agentId === agent.id);
      
      if (activeTasksForAgent.length < agent.parallel_limit) {
        return agent;
      }
    }
    return null;
  }

  async executeProject(projectPath: string, requirements: string): Promise<void> {
    try {
      // Step 1: Analyze project
      console.log('🔍 Analyzing project...');
      const analysis = await this.analyzeProject(projectPath, requirements);
      
      // Step 2: Decompose into tasks
      console.log('📋 Decomposing into tasks...');
      const taskIds = await this.decomposeIntoTasks(analysis);
      
      // Step 3: Execute tasks in parallel
      console.log('🚀 Executing tasks in parallel...');
      await this.waitForAllTasks();
      
      console.log('✅ Project execution completed!');
    } catch (error) {
      console.error('❌ Project execution failed:', error);
      throw error;
    }
  }

  private async waitForAllTasks(): Promise<void> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const pendingTasks = Array.from(this.tasks.values())
          .filter(task => task.status === 'pending' || task.status === 'in_progress');
        
        if (pendingTasks.length === 0) {
          resolve();
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      
      checkCompletion();
    });
  }

  getStatus(): any {
    const tasksByStatus = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0
    };

    for (const task of this.tasks.values()) {
      tasksByStatus[task.status]++;
    }

    return {
      session_id: this.sessionId,
      total_agents: this.agents.size,
      active_agents: this.activeTasks.size,
      tasks: tasksByStatus,
      project_analysis: this.projectAnalysis
    };
  }
}