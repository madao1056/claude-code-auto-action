import { EventEmitter } from 'events';
import { MultiAgentOrchestrator } from '../core/MultiAgentOrchestrator';
import { TaskDistributor, DistributionStrategy } from '../core/TaskDistributor';
import { AgentCommunicationHub } from '../communication/AgentCommunicationHub';
import { TopDownCommandSystem, CommandType, CommandContext } from '../hierarchy/TopDownCommandSystem';
import { BottomUpReportingSystem } from '../reporting/BottomUpReportingSystem';
import { ParallelProcessController, ResourceLimits } from '../control/ParallelProcessController';

export interface SystemConfig {
  communication: {
    hub_port: number;
    heartbeat_interval: number;
    message_timeout: number;
  };
  orchestrator: {
    max_parallel_tasks: number;
    task_timeout: number;
    retry_attempts: number;
  };
  distribution: {
    strategy: DistributionStrategy;
    load_balancing_algorithm: string;
  };
  resources: Partial<ResourceLimits>;
  reporting: {
    real_time_updates: boolean;
    report_retention_hours: number;
    dashboard_refresh_interval: number;
  };
  auto_scaling: {
    enabled: boolean;
    min_agents_per_type: Record<string, number>;
    max_agents_per_type: Record<string, number>;
  };
}

export interface ProjectRequest {
  project_path: string;
  requirements: string;
  command_type: CommandType;
  priority: 'high' | 'medium' | 'low';
  constraints?: {
    time_limit?: number;
    budget_limit?: number;
    resource_constraints?: string[];
  };
  quality_requirements?: {
    test_coverage_min?: number;
    performance_requirements?: string[];
    security_requirements?: string[];
    documentation_level?: 'minimal' | 'standard' | 'comprehensive';
  };
}

export interface SystemStatus {
  status: 'initializing' | 'ready' | 'processing' | 'error' | 'shutdown';
  uptime: number;
  active_commands: number;
  total_agents: number;
  active_agents: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  system_load: number;
  memory_usage: number;
  error_rate: number;
  throughput: number; // tasks per hour
  recent_activities: string[];
}

export class ClaudeCodeAutoSystem extends EventEmitter {
  private config: SystemConfig;
  private orchestrator: MultiAgentOrchestrator;
  private taskDistributor: TaskDistributor;
  private communicationHub: AgentCommunicationHub;
  private commandSystem: TopDownCommandSystem;
  private reportingSystem: BottomUpReportingSystem;
  private processController: ParallelProcessController;
  private systemStatus: SystemStatus;
  private startTime: Date;
  private activeRequests: Map<string, {
    request: ProjectRequest;
    commandId: string;
    startTime: Date;
  }> = new Map();

  constructor(config: Partial<SystemConfig> = {}) {
    super();
    this.config = this.mergeDefaultConfig(config);
    this.startTime = new Date();
    this.systemStatus = this.initializeStatus();
    
    console.log('🚀 Initializing Claude Code Auto System...');
    this.initializeComponents();
    this.setupEventHandlers();
  }

  private mergeDefaultConfig(userConfig: Partial<SystemConfig>): SystemConfig {
    const defaultConfig: SystemConfig = {
      communication: {
        hub_port: 8765,
        heartbeat_interval: 30000,
        message_timeout: 30000
      },
      orchestrator: {
        max_parallel_tasks: 50,
        task_timeout: 3600000, // 1 hour
        retry_attempts: 3
      },
      distribution: {
        strategy: {
          name: 'intelligent',
          algorithm: 'capability_based',
          parameters: {
            load_weight: 0.3,
            capability_weight: 0.4,
            performance_weight: 0.3
          }
        },
        load_balancing_algorithm: 'performance_based'
      },
      resources: {
        max_concurrent_tasks: 50,
        max_memory_per_process: 2048,
        max_cpu_percentage: 80,
        max_execution_time: 3600,
        max_processes_per_pool: 10
      },
      reporting: {
        real_time_updates: true,
        report_retention_hours: 24,
        dashboard_refresh_interval: 5000
      },
      auto_scaling: {
        enabled: true,
        min_agents_per_type: {
          architect: 1,
          manager: 2,
          worker: 3
        },
        max_agents_per_type: {
          architect: 3,
          manager: 5,
          worker: 10
        }
      }
    };

    return this.deepMerge(defaultConfig, userConfig);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  private initializeStatus(): SystemStatus {
    return {
      status: 'initializing',
      uptime: 0,
      active_commands: 0,
      total_agents: 0,
      active_agents: 0,
      total_tasks: 0,
      completed_tasks: 0,
      failed_tasks: 0,
      system_load: 0,
      memory_usage: 0,
      error_rate: 0,
      throughput: 0,
      recent_activities: []
    };
  }

  private initializeComponents(): void {
    try {
      // Initialize communication hub
      this.communicationHub = new AgentCommunicationHub(this.config.communication.hub_port);
      console.log('✅ Communication Hub initialized');

      // Initialize orchestrator
      this.orchestrator = new MultiAgentOrchestrator();
      console.log('✅ Multi-Agent Orchestrator initialized');

      // Initialize task distributor
      this.taskDistributor = new TaskDistributor(this.config.distribution.strategy);
      console.log('✅ Task Distributor initialized');

      // Initialize reporting system
      this.reportingSystem = new BottomUpReportingSystem();
      console.log('✅ Reporting System initialized');

      // Initialize process controller
      this.processController = new ParallelProcessController(
        this.orchestrator,
        this.communicationHub,
        this.reportingSystem,
        this.config.resources
      );
      console.log('✅ Process Controller initialized');

      // Initialize command system
      this.commandSystem = new TopDownCommandSystem(
        this.orchestrator,
        this.taskDistributor,
        this.communicationHub
      );
      console.log('✅ Command System initialized');

      this.systemStatus.status = 'ready';
      console.log('🎉 Claude Code Auto System ready!');
    } catch (error) {
      this.systemStatus.status = 'error';
      console.error('❌ Failed to initialize system:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Orchestrator events
    this.orchestrator.on('task_completed', (task) => {
      this.systemStatus.completed_tasks++;
      this.updateSystemMetrics();
      this.addActivity(`Task completed: ${task.title}`);
    });

    this.orchestrator.on('task_failed', ({ task, error }) => {
      this.systemStatus.failed_tasks++;
      this.updateSystemMetrics();
      this.addActivity(`Task failed: ${task.title} - ${error.message}`);
    });

    // Command system events
    this.commandSystem.on('command_started', (command) => {
      this.systemStatus.active_commands++;
      this.addActivity(`Command started: ${command.title}`);
    });

    this.commandSystem.on('command_completed', (command) => {
      this.systemStatus.active_commands--;
      this.addActivity(`Command completed: ${command.title}`);
      this.handleCommandCompletion(command.id);
    });

    this.commandSystem.on('command_failed', (command) => {
      this.systemStatus.active_commands--;
      this.addActivity(`Command failed: ${command.title}`);
      this.handleCommandFailure(command.id, command.error || 'Unknown error');
    });

    // Communication hub events
    this.communicationHub.on('agent_registered', (agent) => {
      this.systemStatus.total_agents++;
      this.systemStatus.active_agents++;
      this.addActivity(`Agent registered: ${agent.name}`);
    });

    this.communicationHub.on('agent_disconnected', (agent) => {
      this.systemStatus.active_agents--;
      this.addActivity(`Agent disconnected: ${agent.name}`);
    });

    // Process controller events
    this.processController.on('process_created', ({ poolId, processId }) => {
      this.addActivity(`Process created in ${poolId}: ${processId}`);
    });

    this.processController.on('process_error', ({ processId, error }) => {
      this.addActivity(`Process error: ${processId} - ${error.message}`);
    });

    // Reporting system events
    this.reportingSystem.on('critical_error', (report) => {
      this.handleCriticalError(report);
    });

    this.reportingSystem.on('dashboard_updated', (data) => {
      this.emit('dashboard_update', data);
    });

    // System monitoring
    setInterval(() => {
      this.updateSystemMetrics();
    }, this.config.reporting.dashboard_refresh_interval);
  }

  async processProject(request: ProjectRequest): Promise<string> {
    console.log(`🎯 Processing project request: ${request.requirements}`);
    
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Validate request
      this.validateProjectRequest(request);

      // Create command context
      const commandContext: CommandContext = {
        session_id: requestId,
        project_path: request.project_path,
        requirements: request.requirements,
        priority: request.priority,
        constraints: {
          time_limit: request.constraints?.time_limit,
          budget_limit: request.constraints?.budget_limit,
          resource_constraints: request.constraints?.resource_constraints || [],
          technology_constraints: []
        },
        quality_requirements: {
          test_coverage_min: request.quality_requirements?.test_coverage_min || 80,
          performance_requirements: request.quality_requirements?.performance_requirements || [],
          security_requirements: request.quality_requirements?.security_requirements || [],
          documentation_level: request.quality_requirements?.documentation_level || 'standard'
        }
      };

      // Execute command
      const commandId = await this.commandSystem.executeCommand({
        type: request.command_type,
        title: `${request.command_type}: ${request.requirements}`,
        description: `Processing project at ${request.project_path}`,
        context: commandContext
      });

      // Track request
      this.activeRequests.set(requestId, {
        request,
        commandId,
        startTime: new Date()
      });

      this.emit('project_started', {
        requestId,
        commandId,
        request
      });

      console.log(`✅ Project request initiated: ${requestId}`);
      return requestId;
    } catch (error) {
      console.error(`❌ Failed to process project request:`, error);
      this.emit('project_failed', {
        requestId,
        request,
        error: (error as Error).message
      });
      throw error;
    }
  }

  private validateProjectRequest(request: ProjectRequest): void {
    if (!request.project_path) {
      throw new Error('Project path is required');
    }
    if (!request.requirements) {
      throw new Error('Requirements are required');
    }
    if (!Object.values(CommandType).includes(request.command_type)) {
      throw new Error(`Invalid command type: ${request.command_type}`);
    }
  }

  private handleCommandCompletion(commandId: string): void {
    const request = this.findRequestByCommandId(commandId);
    if (request) {
      const duration = Date.now() - request.startTime.getTime();
      console.log(`🎉 Project completed in ${duration}ms: ${request.request.requirements}`);
      
      this.emit('project_completed', {
        requestId: Array.from(this.activeRequests.keys())
          .find(key => this.activeRequests.get(key)?.commandId === commandId),
        commandId,
        duration,
        request: request.request
      });
    }
  }

  private handleCommandFailure(commandId: string, error: string): void {
    const request = this.findRequestByCommandId(commandId);
    if (request) {
      console.error(`❌ Project failed: ${request.request.requirements} - ${error}`);
      
      this.emit('project_failed', {
        requestId: Array.from(this.activeRequests.keys())
          .find(key => this.activeRequests.get(key)?.commandId === commandId),
        commandId,
        error,
        request: request.request
      });
    }
  }

  private handleCriticalError(report: any): void {
    console.error('🚨 Critical system error:', report);
    this.emit('critical_error', report);
  }

  private findRequestByCommandId(commandId: string) {
    return Array.from(this.activeRequests.values())
      .find(req => req.commandId === commandId);
  }

  private updateSystemMetrics(): void {
    this.systemStatus.uptime = Date.now() - this.startTime.getTime();
    this.systemStatus.system_load = this.calculateSystemLoad();
    this.systemStatus.memory_usage = this.calculateMemoryUsage();
    this.systemStatus.error_rate = this.calculateErrorRate();
    this.systemStatus.throughput = this.calculateThroughput();
    
    this.emit('system_metrics_updated', this.systemStatus);
  }

  private calculateSystemLoad(): number {
    // Calculate system load based on active tasks and agents
    const processStatus = this.processController.getSystemStatus();
    return processStatus.system_metrics?.resource_utilization || 0;
  }

  private calculateMemoryUsage(): number {
    // Get memory usage in MB
    const memoryUsage = process.memoryUsage();
    return Math.round(memoryUsage.rss / 1024 / 1024);
  }

  private calculateErrorRate(): number {
    const total = this.systemStatus.completed_tasks + this.systemStatus.failed_tasks;
    return total > 0 ? this.systemStatus.failed_tasks / total : 0;
  }

  private calculateThroughput(): number {
    const uptimeHours = this.systemStatus.uptime / (1000 * 60 * 60);
    return uptimeHours > 0 ? this.systemStatus.completed_tasks / uptimeHours : 0;
  }

  private addActivity(activity: string): void {
    this.systemStatus.recent_activities.unshift(`${new Date().toISOString()}: ${activity}`);
    if (this.systemStatus.recent_activities.length > 50) {
      this.systemStatus.recent_activities = this.systemStatus.recent_activities.slice(0, 50);
    }
  }

  // Public API methods
  getSystemStatus(): SystemStatus {
    this.updateSystemMetrics();
    return { ...this.systemStatus };
  }

  getDashboardData(): any {
    return this.reportingSystem.getDashboardData();
  }

  getActiveProjects(): Array<{
    requestId: string;
    commandId: string;
    request: ProjectRequest;
    startTime: Date;
    duration: number;
  }> {
    return Array.from(this.activeRequests.entries()).map(([requestId, data]) => ({
      requestId,
      commandId: data.commandId,
      request: data.request,
      startTime: data.startTime,
      duration: Date.now() - data.startTime.getTime()
    }));
  }

  getProjectStatus(requestId: string): any {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      return null;
    }

    const commandStatus = this.commandSystem.getCommandStatus(request.commandId);
    return {
      requestId,
      request: request.request,
      command: commandStatus,
      startTime: request.startTime,
      duration: Date.now() - request.startTime.getTime()
    };
  }

  async cancelProject(requestId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Project not found: ${requestId}`);
    }

    await this.commandSystem.cancelCommand(request.commandId);
    this.activeRequests.delete(requestId);
    
    this.emit('project_cancelled', { requestId, request: request.request });
  }

  generateSystemReport(): any {
    return {
      system_info: {
        version: '1.0.0',
        start_time: this.startTime,
        uptime: this.systemStatus.uptime,
        configuration: this.config
      },
      status: this.getSystemStatus(),
      dashboard: this.getDashboardData(),
      active_projects: this.getActiveProjects(),
      process_status: this.processController.getSystemStatus(),
      communication_stats: this.communicationHub.getHubStats(),
      distribution_stats: this.taskDistributor.getDistributionStats(),
      session_summary: this.reportingSystem.generateSessionSummary()
    };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Claude Code Auto System...');
    
    this.systemStatus.status = 'shutdown';
    
    try {
      // Cancel all active projects
      const cancelPromises = Array.from(this.activeRequests.keys())
        .map(requestId => this.cancelProject(requestId));
      await Promise.all(cancelPromises);

      // Shutdown components
      await this.processController.shutdown();
      this.communicationHub.shutdown();
      
      console.log('✅ System shutdown complete');
      this.emit('system_shutdown');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  // Static factory method
  static async create(config: Partial<SystemConfig> = {}): Promise<ClaudeCodeAutoSystem> {
    const system = new ClaudeCodeAutoSystem(config);
    
    // Wait for system to be ready
    return new Promise((resolve, reject) => {
      if (system.systemStatus.status === 'ready') {
        resolve(system);
      } else if (system.systemStatus.status === 'error') {
        reject(new Error('Failed to initialize system'));
      } else {
        system.once('system_ready', () => resolve(system));
        system.once('system_error', reject);
      }
    });
  }
}