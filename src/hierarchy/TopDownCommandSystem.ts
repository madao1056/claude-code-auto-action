import { EventEmitter } from 'events';
import { MultiAgentOrchestrator, Task, ProjectAnalysis } from '../core/MultiAgentOrchestrator';
import { TaskDistributor } from '../core/TaskDistributor';
import { AgentCommunicationHub, MessageType } from '../communication/AgentCommunicationHub';

export interface CommandContext {
  session_id: string;
  project_path: string;
  requirements: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: Date;
  constraints: {
    budget_limit?: number;
    time_limit?: number;
    resource_constraints?: string[];
    technology_constraints?: string[];
  };
  quality_requirements: {
    test_coverage_min: number;
    performance_requirements: string[];
    security_requirements: string[];
    documentation_level: 'minimal' | 'standard' | 'comprehensive';
  };
}

export interface Command {
  id: string;
  type: CommandType;
  title: string;
  description: string;
  context: CommandContext;
  created_at: Date;
  status: 'pending' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';
  progress: number; // 0-100
  estimated_completion?: Date;
  actual_completion?: Date;
  generated_tasks: string[];
  assigned_agents: string[];
  results?: any;
  error?: string;
}

export enum CommandType {
  ANALYZE_PROJECT = 'analyze_project',
  IMPLEMENT_FEATURE = 'implement_feature',
  FIX_ISSUES = 'fix_issues',
  OPTIMIZE_PERFORMANCE = 'optimize_performance',
  UPGRADE_DEPENDENCIES = 'upgrade_dependencies',
  REFACTOR_CODE = 'refactor_code',
  ADD_TESTING = 'add_testing',
  IMPROVE_SECURITY = 'improve_security',
  CREATE_DOCUMENTATION = 'create_documentation',
  DEPLOY_PROJECT = 'deploy_project'
}

export class TopDownCommandSystem extends EventEmitter {
  private orchestrator: MultiAgentOrchestrator;
  private taskDistributor: TaskDistributor;
  private communicationHub: AgentCommunicationHub;
  private activeCommands: Map<string, Command> = new Map();
  private commandQueue: string[] = [];
  private executionStrategies: Map<CommandType, ExecutionStrategy> = new Map();

  constructor(
    orchestrator: MultiAgentOrchestrator,
    taskDistributor: TaskDistributor,
    communicationHub: AgentCommunicationHub
  ) {
    super();
    this.orchestrator = orchestrator;
    this.taskDistributor = taskDistributor;
    this.communicationHub = communicationHub;
    this.initializeExecutionStrategies();
    this.setupEventListeners();
  }

  private initializeExecutionStrategies(): void {
    this.executionStrategies.set(CommandType.ANALYZE_PROJECT, {
      phases: [
        { name: 'Initial Analysis', agent_type: 'architect', estimated_duration: 10 },
        { name: 'Deep Dive Analysis', agent_type: 'manager', estimated_duration: 20 },
        { name: 'Technology Assessment', agent_type: 'worker', estimated_duration: 15 }
      ],
      parallel_execution: false,
      quality_gates: ['analysis_completeness', 'risk_assessment']
    });

    this.executionStrategies.set(CommandType.IMPLEMENT_FEATURE, {
      phases: [
        { name: 'Feature Design', agent_type: 'architect', estimated_duration: 15 },
        { name: 'Implementation Planning', agent_type: 'manager', estimated_duration: 10 },
        { name: 'Code Implementation', agent_type: 'worker', estimated_duration: 60 },
        { name: 'Testing', agent_type: 'worker', estimated_duration: 30 },
        { name: 'Integration', agent_type: 'manager', estimated_duration: 20 }
      ],
      parallel_execution: true,
      quality_gates: ['design_review', 'code_review', 'test_coverage', 'integration_test']
    });

    this.executionStrategies.set(CommandType.FIX_ISSUES, {
      phases: [
        { name: 'Issue Analysis', agent_type: 'manager', estimated_duration: 10 },
        { name: 'Root Cause Investigation', agent_type: 'worker', estimated_duration: 20 },
        { name: 'Fix Implementation', agent_type: 'worker', estimated_duration: 30 },
        { name: 'Regression Testing', agent_type: 'worker', estimated_duration: 15 },
        { name: 'Verification', agent_type: 'manager', estimated_duration: 10 }
      ],
      parallel_execution: false,
      quality_gates: ['issue_reproduction', 'fix_verification', 'regression_test']
    });

    this.executionStrategies.set(CommandType.OPTIMIZE_PERFORMANCE, {
      phases: [
        { name: 'Performance Profiling', agent_type: 'worker', estimated_duration: 20 },
        { name: 'Bottleneck Analysis', agent_type: 'manager', estimated_duration: 15 },
        { name: 'Optimization Strategy', agent_type: 'architect', estimated_duration: 10 },
        { name: 'Implementation', agent_type: 'worker', estimated_duration: 45 },
        { name: 'Performance Testing', agent_type: 'worker', estimated_duration: 25 }
      ],
      parallel_execution: true,
      quality_gates: ['baseline_measurement', 'optimization_plan', 'performance_improvement']
    });

    this.executionStrategies.set(CommandType.ADD_TESTING, {
      phases: [
        { name: 'Test Strategy', agent_type: 'manager', estimated_duration: 10 },
        { name: 'Unit Tests', agent_type: 'worker', estimated_duration: 40 },
        { name: 'Integration Tests', agent_type: 'worker', estimated_duration: 30 },
        { name: 'E2E Tests', agent_type: 'worker', estimated_duration: 35 },
        { name: 'Test Automation', agent_type: 'manager', estimated_duration: 20 }
      ],
      parallel_execution: true,
      quality_gates: ['test_plan', 'coverage_target', 'test_automation']
    });
  }

  private setupEventListeners(): void {
    this.orchestrator.on('task_completed', (task: Task) => {
      this.handleTaskCompletion(task);
    });

    this.orchestrator.on('task_failed', (data: { task: Task; error: Error }) => {
      this.handleTaskFailure(data.task, data.error);
    });

    this.communicationHub.on('agent_error', (data: { agent_id: string; error: any }) => {
      this.handleAgentError(data.agent_id, data.error);
    });
  }

  async executeCommand(commandData: Omit<Command, 'id' | 'created_at' | 'status' | 'progress' | 'generated_tasks' | 'assigned_agents'>): Promise<string> {
    const command: Command = {
      ...commandData,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      status: 'pending',
      progress: 0,
      generated_tasks: [],
      assigned_agents: []
    };

    this.activeCommands.set(command.id, command);
    this.commandQueue.push(command.id);

    console.log(`🎯 Executing command: ${command.title}`);
    this.emit('command_started', command);

    try {
      await this.processCommand(command);
      return command.id;
    } catch (error) {
      command.status = 'failed';
      command.error = (error as Error).message;
      this.emit('command_failed', command);
      throw error;
    }
  }

  private async processCommand(command: Command): Promise<void> {
    const strategy = this.executionStrategies.get(command.type);
    if (!strategy) {
      throw new Error(`No execution strategy found for command type: ${command.type}`);
    }

    // Phase 1: Analysis and Planning
    command.status = 'analyzing';
    this.updateCommandProgress(command.id, 10);

    const analysis = await this.performAnalysis(command);
    this.updateCommandProgress(command.id, 30);

    // Phase 2: Task Generation and Planning
    command.status = 'planning';
    const tasks = await this.generateTasks(command, analysis, strategy);
    command.generated_tasks = tasks.map(t => t.id);
    this.updateCommandProgress(command.id, 50);

    // Phase 3: Execution
    command.status = 'executing';
    await this.executeTasks(command, tasks, strategy);
    this.updateCommandProgress(command.id, 90);

    // Phase 4: Completion and Quality Gates
    await this.runQualityGates(command, strategy);
    command.status = 'completed';
    command.actual_completion = new Date();
    this.updateCommandProgress(command.id, 100);

    console.log(`✅ Command completed: ${command.title}`);
    this.emit('command_completed', command);
  }

  private async performAnalysis(command: Command): Promise<ProjectAnalysis> {
    console.log(`🔍 Analyzing project for command: ${command.title}`);

    // Use the architect agent for high-level analysis
    const analysisPrompt = this.buildAnalysisPrompt(command);
    
    try {
      const analysis = await this.orchestrator.analyzeProject(
        command.context.project_path,
        analysisPrompt
      );

      console.log(`📊 Analysis completed for: ${command.title}`);
      return analysis;
    } catch (error) {
      console.error(`❌ Analysis failed for: ${command.title}`, error);
      throw error;
    }
  }

  private buildAnalysisPrompt(command: Command): string {
    return `
Analyze the project for the following command:

Command Type: ${command.type}
Title: ${command.title}
Description: ${command.description}
Requirements: ${command.context.requirements}

Project Context:
- Path: ${command.context.project_path}
- Priority: ${command.context.priority}
- Constraints: ${JSON.stringify(command.context.constraints, null, 2)}
- Quality Requirements: ${JSON.stringify(command.context.quality_requirements, null, 2)}

Please provide:
1. Project structure analysis
2. Technology stack assessment
3. Complexity evaluation
4. Risk identification
5. Resource requirements
6. Estimated timeline
7. Specific recommendations for this command type
`;
  }

  private async generateTasks(command: Command, analysis: ProjectAnalysis, strategy: ExecutionStrategy): Promise<Task[]> {
    console.log(`📋 Generating tasks for command: ${command.title}`);

    const baseTasks = this.taskDistributor.generateTasksFromAnalysis(analysis);
    
    // Customize tasks based on command type and strategy
    const customizedTasks = this.customizeTasksForCommand(baseTasks, command, strategy);
    
    // Add command-specific tasks
    const commandSpecificTasks = await this.generateCommandSpecificTasks(command, analysis, strategy);
    
    const allTasks = [...customizedTasks, ...commandSpecificTasks];
    
    console.log(`📋 Generated ${allTasks.length} tasks for command: ${command.title}`);
    return allTasks;
  }

  private customizeTasksForCommand(tasks: Task[], command: Command, strategy: ExecutionStrategy): Task[] {
    return tasks.map(task => {
      // Adjust priority based on command context
      if (command.context.priority === 'high') {
        task.priority = task.priority === 'low' ? 'medium' : 'high';
      }

      // Add command-specific context to task descriptions
      task.description += `\n\nCommand Context: ${command.title}\nRequirements: ${command.context.requirements}`;

      return task;
    });
  }

  private async generateCommandSpecificTasks(command: Command, analysis: ProjectAnalysis, strategy: ExecutionStrategy): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const phase of strategy.phases) {
      const task: Task = {
        id: `${command.id}_${phase.name.toLowerCase().replace(/\s+/g, '_')}`,
        title: `${command.title} - ${phase.name}`,
        description: `Execute ${phase.name} phase for command: ${command.title}`,
        type: this.mapPhaseToTaskType(phase.name),
        priority: command.context.priority,
        dependencies: [],
        status: 'pending',
        created_at: new Date(),
        child_tasks: []
      };

      tasks.push(task);
    }

    // Set up phase dependencies
    if (!strategy.parallel_execution) {
      for (let i = 1; i < tasks.length; i++) {
        tasks[i].dependencies = [tasks[i - 1].id];
      }
    }

    return tasks;
  }

  private mapPhaseToTaskType(phaseName: string): Task['type'] {
    if (phaseName.toLowerCase().includes('analysis') || phaseName.toLowerCase().includes('design')) {
      return 'analysis';
    }
    if (phaseName.toLowerCase().includes('test')) {
      return 'testing';
    }
    if (phaseName.toLowerCase().includes('documentation')) {
      return 'documentation';
    }
    return 'implementation';
  }

  private async executeTasks(command: Command, tasks: Task[], strategy: ExecutionStrategy): Promise<void> {
    console.log(`🚀 Executing ${tasks.length} tasks for command: ${command.title}`);

    // Register tasks with orchestrator
    for (const task of tasks) {
      this.orchestrator.createTask(task);
    }

    // Assign agents based on strategy
    const agentAssignments = await this.assignAgentsToTasks(tasks, strategy);
    command.assigned_agents = [...new Set(agentAssignments.map(a => a.agentId))];

    // Execute tasks
    for (const assignment of agentAssignments) {
      await this.orchestrator.assignTaskToAgent(assignment.taskId, assignment.agentId);
    }

    // Wait for completion
    await this.waitForTaskCompletion(tasks);
  }

  private async assignAgentsToTasks(tasks: Task[], strategy: ExecutionStrategy): Promise<Array<{ taskId: string; agentId: string }>> {
    const assignments: Array<{ taskId: string; agentId: string }> = [];
    const availableAgents = this.communicationHub.getOnlineAgents();

    for (const task of tasks) {
      // Find corresponding phase
      const phase = strategy.phases.find(p => 
        task.title.toLowerCase().includes(p.name.toLowerCase())
      );

      let suitableAgents = availableAgents;
      if (phase) {
        suitableAgents = availableAgents.filter(agent => agent.type === phase.agent_type);
      }

      const selectedAgent = this.taskDistributor.distributeTask(task, suitableAgents);
      if (selectedAgent) {
        assignments.push({
          taskId: task.id,
          agentId: selectedAgent.id
        });
      }
    }

    return assignments;
  }

  private async waitForTaskCompletion(tasks: Task[]): Promise<void> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const pendingTasks = tasks.filter(task => 
          task.status === 'pending' || task.status === 'in_progress'
        );

        if (pendingTasks.length === 0) {
          resolve();
        } else {
          setTimeout(checkCompletion, 2000);
        }
      };

      checkCompletion();
    });
  }

  private async runQualityGates(command: Command, strategy: ExecutionStrategy): Promise<void> {
    console.log(`🔍 Running quality gates for command: ${command.title}`);

    for (const gate of strategy.quality_gates) {
      const result = await this.executeQualityGate(gate, command);
      if (!result.passed) {
        throw new Error(`Quality gate failed: ${gate} - ${result.reason}`);
      }
    }

    console.log(`✅ All quality gates passed for command: ${command.title}`);
  }

  private async executeQualityGate(gate: string, command: Command): Promise<{ passed: boolean; reason?: string }> {
    // Mock quality gate execution
    // In a real implementation, this would run actual quality checks
    console.log(`Running quality gate: ${gate}`);
    
    // Simulate quality gate execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Random success for demo (in reality, this would be real quality checks)
    const passed = Math.random() > 0.1; // 90% success rate
    
    return {
      passed,
      reason: passed ? undefined : `Quality gate ${gate} failed validation`
    };
  }

  private handleTaskCompletion(task: Task): void {
    // Update command progress based on completed tasks
    this.updateCommandProgressFromTasks();
  }

  private handleTaskFailure(task: Task, error: Error): void {
    console.error(`Task failed: ${task.title}`, error);
    
    // Find associated command and handle failure
    const command = this.findCommandByTask(task.id);
    if (command) {
      command.status = 'failed';
      command.error = `Task failure: ${task.title} - ${error.message}`;
      this.emit('command_failed', command);
    }
  }

  private handleAgentError(agentId: string, error: any): void {
    console.error(`Agent error: ${agentId}`, error);
    
    // Handle agent-level errors that might affect commands
    this.emit('agent_error', { agentId, error });
  }

  private updateCommandProgress(commandId: string, progress: number): void {
    const command = this.activeCommands.get(commandId);
    if (command) {
      command.progress = progress;
      this.emit('command_progress', command);
    }
  }

  private updateCommandProgressFromTasks(): void {
    for (const command of this.activeCommands.values()) {
      if (command.status === 'executing' && command.generated_tasks.length > 0) {
        // Calculate progress based on completed tasks
        // This would need integration with the task tracking system
        const estimatedProgress = Math.min(95, command.progress + 5);
        this.updateCommandProgress(command.id, estimatedProgress);
      }
    }
  }

  private findCommandByTask(taskId: string): Command | undefined {
    return Array.from(this.activeCommands.values())
      .find(command => command.generated_tasks.includes(taskId));
  }

  getCommandStatus(commandId: string): Command | undefined {
    return this.activeCommands.get(commandId);
  }

  getAllActiveCommands(): Command[] {
    return Array.from(this.activeCommands.values());
  }

  getCommandsByStatus(status: Command['status']): Command[] {
    return Array.from(this.activeCommands.values())
      .filter(command => command.status === status);
  }

  private async cancelCommandTasks(command: Command): Promise<void> {
    console.log(`🚫 Cancelling tasks for command: ${command.title}`);

    // Cancel all tasks associated with this command
    for (const taskId of command.generated_tasks) {
      // Get task from orchestrator
      const task = this.orchestrator.getTask(taskId);
      if (task && (task.status === 'pending' || task.status === 'in_progress')) {
        // Mark task as failed
        this.orchestrator.failTask(taskId, new Error('Command cancelled by user'));
      }
    }

    // Notify all assigned agents about the cancellation
    const cancellationMessage = {
      type: MessageType.SHUTDOWN,
      from: 'system',
      to: 'broadcast' as const,
      payload: {
        command_id: command.id,
        command_title: command.title,
        reason: 'Command cancelled by user',
        affected_tasks: command.generated_tasks
      },
      priority: 'high' as const,
      requires_response: false
    };

    // Send cancellation notification to all assigned agents
    for (const agentId of command.assigned_agents) {
      await this.communicationHub.sendMessageToAgent(agentId, {
        ...cancellationMessage,
        to: agentId
      });
    }

    // Also broadcast to all agents for awareness
    this.communicationHub.broadcastMessage(cancellationMessage);

    console.log(`✅ Cancelled ${command.generated_tasks.length} tasks and notified ${command.assigned_agents.length} agents`);
  }

  async cancelCommand(commandId: string): Promise<void> {
    const command = this.activeCommands.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    command.status = 'failed';
    command.error = 'Cancelled by user';
    
    // Cancel associated tasks and notify agents
    await this.cancelCommandTasks(command);
    
    this.emit('command_cancelled', command);
  }
}

interface ExecutionStrategy {
  phases: Array<{
    name: string;
    agent_type: 'architect' | 'manager' | 'worker';
    estimated_duration: number;
  }>;
  parallel_execution: boolean;
  quality_gates: string[];
}