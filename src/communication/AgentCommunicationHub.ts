import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { thinkingModeManager } from '../thinking/ThinkingModeManager';

export interface Message {
  id: string;
  type: MessageType;
  from: string;
  to: string | 'broadcast';
  payload: any;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  requires_response: boolean;
  correlation_id?: string;
  thinking_mode?: string;
  thinking_tokens?: number;
}

export enum MessageType {
  TASK_ASSIGNMENT = 'task_assignment',
  TASK_UPDATE = 'task_update',
  TASK_COMPLETION = 'task_completion',
  TASK_FAILURE = 'task_failure',
  TASK_REVISION = 'task_revision',
  STATUS_REQUEST = 'status_request',
  STATUS_RESPONSE = 'status_response',
  COORDINATION_REQUEST = 'coordination_request',
  COORDINATION_RESPONSE = 'coordination_response',
  RESOURCE_REQUEST = 'resource_request',
  RESOURCE_RESPONSE = 'resource_response',
  ERROR_REPORT = 'error_report',
  THINKING_MODE_UPDATE = 'thinking_mode_update',
  THINKING_MODE_STATUS = 'thinking_mode_status',
  HEARTBEAT = 'heartbeat',
  SHUTDOWN = 'shutdown',
}

export interface AgentEndpoint {
  id: string;
  name: string;
  type: 'architect' | 'manager' | 'worker';
  websocket?: WebSocket;
  process_id?: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  last_heartbeat: Date;
  capabilities: string[];
  current_tasks: string[];
  load: number;
}

export class AgentCommunicationHub extends EventEmitter {
  private createMessage(data: Omit<Message, 'id' | 'timestamp'>): Message {
    return {
      ...data,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
  }

  private agents: Map<string, AgentEndpoint> = new Map();
  private messageQueue: Message[] = [];
  private responseCallbacks: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private server: WebSocket.Server | null = null;
  private port: number;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 8765) {
    super();
    this.port = port;
    this.initializeServer();
    this.startHeartbeatMonitoring();
  }

  private initializeServer(): void {
    this.server = new WebSocket.Server({ port: this.port });

    this.server.on('connection', (ws: WebSocket, request) => {
      console.log('New agent connection established');

      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString()) as Message;
          this.handleIncomingMessage(message, ws);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      ws.on('close', () => {
        const agent = this.findAgentByWebSocket(ws);
        if (agent) {
          console.log(`Agent ${agent.id} disconnected`);
          agent.status = 'offline';
          this.emit('agent_disconnected', agent);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log(`Agent Communication Hub listening on port ${this.port}`);
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkAgentHeartbeats();
      this.sendHeartbeatRequests();
    }, 30000); // Every 30 seconds
  }

  private checkAgentHeartbeats(): void {
    const now = new Date();
    const timeout = 60000; // 1 minute timeout

    for (const agent of this.agents.values()) {
      if (agent.status === 'online' || agent.status === 'busy') {
        const timeSinceLastHeartbeat = now.getTime() - agent.last_heartbeat.getTime();
        if (timeSinceLastHeartbeat > timeout) {
          console.warn(`Agent ${agent.id} heartbeat timeout`);
          agent.status = 'offline';
          this.emit('agent_timeout', agent);
        }
      }
    }
  }

  private sendHeartbeatRequests(): void {
    const heartbeatMessage: Omit<Message, 'id' | 'timestamp'> = {
      type: MessageType.HEARTBEAT,
      from: 'hub',
      to: 'broadcast',
      payload: { request: 'heartbeat' },
      priority: 'low',
      requires_response: true,
    };

    this.broadcastMessage(heartbeatMessage);
  }

  private handleIncomingMessage(message: Message, ws: WebSocket): void {
    console.log(`Received message: ${message.type} from ${message.from}`);

    // Handle correlation responses
    if (message.correlation_id && this.responseCallbacks.has(message.correlation_id)) {
      const callback = this.responseCallbacks.get(message.correlation_id)!;
      clearTimeout(callback.timeout);
      this.responseCallbacks.delete(message.correlation_id);
      callback.resolve(message.payload);
      return;
    }

    switch (message.type) {
      case MessageType.STATUS_REQUEST:
        this.handleStatusRequest(message, ws);
        break;

      case MessageType.TASK_UPDATE:
        this.handleTaskUpdate(message);
        break;

      case MessageType.TASK_COMPLETION:
        this.handleTaskCompletion(message);
        break;

      case MessageType.TASK_FAILURE:
        this.handleTaskFailure(message);
        break;

      case MessageType.TASK_REVISION:
        this.handleTaskRevision(message);
        break;

      case MessageType.THINKING_MODE_UPDATE:
        this.handleThinkingModeUpdate(message);
        break;

      case MessageType.THINKING_MODE_STATUS:
        this.handleThinkingModeStatus(message);
        break;

      case MessageType.COORDINATION_REQUEST:
        this.handleCoordinationRequest(message);
        break;

      case MessageType.RESOURCE_REQUEST:
        this.handleResourceRequest(message);
        break;

      case MessageType.ERROR_REPORT:
        this.handleErrorReport(message);
        break;

      case MessageType.HEARTBEAT:
        this.handleHeartbeat(message, ws);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }

    // Emit event for external listeners
    this.emit('message_received', message);
  }

  private handleStatusRequest(message: Message, ws: WebSocket): void {
    const agent = this.findAgentByWebSocket(ws);
    if (!agent) return;

    const response: Omit<Message, 'id' | 'timestamp'> = {
      type: MessageType.STATUS_RESPONSE,
      from: 'hub',
      to: message.from,
      payload: {
        agent_count: this.agents.size,
        online_agents: Array.from(this.agents.values()).filter((a) => a.status === 'online').length,
        message_queue_size: this.messageQueue.length,
      },
      priority: 'medium',
      requires_response: false,
      correlation_id: message.id,
    };

    this.sendMessage(this.createMessage(response), ws);
  }

  private handleTaskUpdate(message: Message): void {
    const agent = this.agents.get(message.from);
    if (agent) {
      agent.load = message.payload.load || agent.load;
      agent.current_tasks = message.payload.current_tasks || agent.current_tasks;
    }

    this.emit('task_update', message);
  }

  private handleTaskCompletion(message: Message): void {
    const agent = this.agents.get(message.from);
    if (agent) {
      agent.current_tasks = agent.current_tasks.filter(
        (taskId) => taskId !== message.payload.task_id
      );
      agent.load = Math.max(0, agent.load - 1);
    }

    this.emit('task_completion', message);
  }

  private handleTaskFailure(message: Message): void {
    const agent = this.agents.get(message.from);
    if (agent) {
      agent.current_tasks = agent.current_tasks.filter(
        (taskId) => taskId !== message.payload.task_id
      );
      agent.load = Math.max(0, agent.load - 1);
    }

    this.emit('task_failure', message);
  }

  private handleCoordinationRequest(message: Message): void {
    // Find appropriate agents for coordination
    const requestedCapabilities = message.payload.required_capabilities || [];
    const availableAgents = Array.from(this.agents.values())
      .filter((agent) => agent.status === 'online' || agent.status === 'idle')
      .filter((agent) => requestedCapabilities.every((cap) => agent.capabilities.includes(cap)));

    const response: Omit<Message, 'id' | 'timestamp'> = {
      type: MessageType.COORDINATION_RESPONSE,
      from: 'hub',
      to: message.from,
      payload: {
        available_agents: availableAgents.map((a) => ({
          id: a.id,
          type: a.type,
          load: a.load,
          capabilities: a.capabilities,
        })),
      },
      priority: 'medium',
      requires_response: false,
      correlation_id: message.id,
    };

    const requesterAgent = this.agents.get(message.from);
    if (requesterAgent?.websocket) {
      this.sendMessage(response, requesterAgent.websocket);
    }
  }

  private handleResourceRequest(message: Message): void {
    // Handle resource allocation requests
    const resourceType = message.payload.resource_type;
    const quantity = message.payload.quantity || 1;

    // Simple resource allocation logic
    const response: Omit<Message, 'id' | 'timestamp'> = {
      type: MessageType.RESOURCE_RESPONSE,
      from: 'hub',
      to: message.from,
      payload: {
        resource_type: resourceType,
        allocated: quantity,
        available: true,
      },
      priority: 'medium',
      requires_response: false,
      correlation_id: message.id,
    };

    const requesterAgent = this.agents.get(message.from);
    if (requesterAgent?.websocket) {
      this.sendMessage(response, requesterAgent.websocket);
    }
  }

  private handleErrorReport(message: Message): void {
    console.error(`Error reported by ${message.from}:`, message.payload);
    this.emit('agent_error', {
      agent_id: message.from,
      error: message.payload,
    });
  }

  private handleHeartbeat(message: Message, ws: WebSocket): void {
    const agent = this.findAgentByWebSocket(ws);
    if (agent) {
      agent.last_heartbeat = new Date();
      agent.status = message.payload.status || 'online';
    }

    if (message.requires_response) {
      const response: Omit<Message, 'id' | 'timestamp'> = {
        type: MessageType.HEARTBEAT,
        from: 'hub',
        to: message.from,
        payload: { response: 'pong' },
        priority: 'low',
        requires_response: false,
        correlation_id: message.id,
      };

      this.sendMessage(this.createMessage(response), ws);
    }
  }

  registerAgent(
    agentInfo: Omit<AgentEndpoint, 'status' | 'last_heartbeat' | 'current_tasks' | 'load'>
  ): void {
    const agent: AgentEndpoint = {
      ...agentInfo,
      status: 'online',
      last_heartbeat: new Date(),
      current_tasks: [],
      load: 0,
    };

    this.agents.set(agent.id, agent);
    console.log(`Agent ${agent.id} registered`);
    this.emit('agent_registered', agent);
  }

  async sendMessageToAgent(
    agentId: string,
    messageData: Omit<Message, 'id' | 'timestamp' | 'from'>
  ): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.websocket) {
      throw new Error(`Agent ${agentId} not found or not connected`);
    }

    // Add thinking mode information for task-related messages
    let thinkingMode: any = null;
    if (
      messageData.type === MessageType.TASK_ASSIGNMENT ||
      messageData.type === MessageType.TASK_UPDATE ||
      messageData.type === MessageType.TASK_REVISION
    ) {
      const taskId = messageData.payload?.task_id || messageData.payload?.id || agentId;
      const context = messageData.type === MessageType.TASK_REVISION ? 'codeRevision' : 'default';
      thinkingMode = thinkingModeManager.getThinkingMode(taskId, context);
    }

    const message: Message = {
      ...messageData,
      id: uuidv4(),
      timestamp: new Date(),
      from: 'hub',
      thinking_mode: thinkingMode?.mode,
      thinking_tokens: thinkingMode?.maxTokens,
    };

    if (messageData.requires_response) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.responseCallbacks.delete(message.id);
          reject(new Error(`Message timeout for agent ${agentId}`));
        }, 30000); // 30 second timeout

        this.responseCallbacks.set(message.id, {
          resolve,
          reject,
          timeout,
        });

        this.sendMessage(message, agent.websocket!);
      });
    } else {
      this.sendMessage(message, agent.websocket);
      return Promise.resolve();
    }
  }

  broadcastMessage(messageData: Message | Omit<Message, 'id' | 'timestamp'>): void {
    const message =
      'id' in messageData && 'timestamp' in messageData
        ? messageData
        : this.createMessage(messageData as Omit<Message, 'id' | 'timestamp'>);
    // Add thinking mode information for task-related broadcasts
    let thinkingMode: any = null;
    if (
      messageData.type === MessageType.TASK_ASSIGNMENT ||
      messageData.type === MessageType.TASK_UPDATE ||
      messageData.type === MessageType.TASK_REVISION
    ) {
      const taskId = messageData.payload?.task_id || messageData.payload?.id || 'broadcast';
      const context = messageData.type === MessageType.TASK_REVISION ? 'codeRevision' : 'default';
      thinkingMode = thinkingModeManager.getThinkingMode(taskId, context);
    }

    const broadcastMessage: Message = {
      ...messageData,
      id: uuidv4(),
      timestamp: new Date(),
      thinking_mode: thinkingMode?.mode,
      thinking_tokens: thinkingMode?.maxTokens,
    };

    for (const agent of this.agents.values()) {
      if (
        agent.websocket &&
        (agent.status === 'online' || agent.status === 'busy' || agent.status === 'idle')
      ) {
        this.sendMessage(broadcastMessage, agent.websocket);
      }
    }
  }

  private sendMessage(message: Message | Omit<Message, 'id' | 'timestamp'>, ws: WebSocket): void {
    try {
      const fullMessage = 'id' in message && 'timestamp' in message 
        ? message 
        : this.createMessage(message as Omit<Message, 'id' | 'timestamp'>);
      ws.send(JSON.stringify(fullMessage));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  private findAgentByWebSocket(ws: WebSocket): AgentEndpoint | undefined {
    return Array.from(this.agents.values()).find((agent) => agent.websocket === ws);
  }

  async assignTask(agentId: string, taskData: any): Promise<any> {
    return this.sendMessageToAgent(agentId, {
      type: MessageType.TASK_ASSIGNMENT,
      to: agentId,
      payload: taskData,
      priority: 'high',
      requires_response: true,
    });
  }

  async requestCoordination(fromAgentId: string, coordinationData: any): Promise<any> {
    return this.sendMessageToAgent(fromAgentId, {
      type: MessageType.COORDINATION_REQUEST,
      to: fromAgentId,
      payload: coordinationData,
      priority: 'medium',
      requires_response: true,
    });
  }

  getAgentStatus(agentId: string): AgentEndpoint | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentEndpoint[] {
    return Array.from(this.agents.values());
  }

  getOnlineAgents(): AgentEndpoint[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.status === 'online' || agent.status === 'idle'
    );
  }

  getAgentsByType(type: 'architect' | 'manager' | 'worker'): AgentEndpoint[] {
    return Array.from(this.agents.values()).filter((agent) => agent.type === type);
  }

  shutdown(): void {
    console.log('Shutting down Communication Hub...');

    // Send shutdown message to all agents
    this.broadcastMessage({
      type: MessageType.SHUTDOWN,
      from: 'hub',
      to: 'broadcast',
      payload: { reason: 'Hub shutting down' },
      priority: 'high',
      requires_response: false,
    });

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Clear response callbacks
    for (const callback of this.responseCallbacks.values()) {
      clearTimeout(callback.timeout);
      callback.reject(new Error('Hub shutting down'));
    }
    this.responseCallbacks.clear();

    // Close server
    if (this.server) {
      this.server.close();
    }

    console.log('Communication Hub shut down');
  }

  private handleTaskRevision(message: Message): void {
    const taskId = message.payload.task_id;
    if (taskId) {
      thinkingModeManager.trackRevision(taskId);

      // Get updated thinking mode after revision tracking
      const thinkingMode = thinkingModeManager.getThinkingMode(taskId, 'codeRevision');

      // Broadcast thinking mode update to all agents
      this.broadcastMessage({
        type: MessageType.THINKING_MODE_UPDATE,
        from: 'hub',
        to: 'broadcast',
        payload: {
          task_id: taskId,
          thinking_mode: thinkingMode.mode,
          max_tokens: thinkingMode.maxTokens,
          description: thinkingMode.description,
          revision_count: thinkingModeManager.getRevisionCount(taskId),
        },
        priority: 'medium',
        requires_response: false,
      });
    }

    this.emit('task_revision', message);
  }

  private handleThinkingModeUpdate(message: Message): void {
    console.log(`🧠 思考モード更新: ${JSON.stringify(message.payload)}`);
    this.emit('thinking_mode_update', message);
  }

  private handleThinkingModeStatus(message: Message): void {
    const status = thinkingModeManager.getThinkingModeStatus();

    const response: Omit<Message, 'id' | 'timestamp'> = {
      type: MessageType.THINKING_MODE_STATUS,
      from: 'hub',
      to: message.from,
      payload: status,
      priority: 'low',
      requires_response: false,
    };

    this.sendMessageToAgent(message.from, response);
    this.emit('thinking_mode_status', message);
  }

  // Public methods for thinking mode management
  public setThinkingMode(taskId: string, mode: string): void {
    thinkingModeManager.setMode(mode);

    this.broadcastMessage({
      type: MessageType.THINKING_MODE_UPDATE,
      from: 'hub',
      to: 'broadcast',
      payload: {
        task_id: taskId,
        thinking_mode: mode,
        max_tokens: thinkingModeManager.getAllModes()[mode]?.maxTokens || 4000,
        description: thinkingModeManager.getAllModes()[mode]?.description || 'Unknown mode',
      },
      priority: 'medium',
      requires_response: false,
    });
  }

  public getThinkingModeForTask(
    taskId: string,
    context: 'codeRevision' | 'complexTask' | 'errorHandling' | 'default' = 'default'
  ): {
    mode: string;
    maxTokens: number;
    description: string;
  } {
    return thinkingModeManager.getThinkingMode(taskId, context);
  }

  public resetTaskRevisionCount(taskId: string): void {
    thinkingModeManager.resetRevisionCount(taskId);
  }

  public getThinkingModeStatus(): any {
    return thinkingModeManager.getThinkingModeStatus();
  }

  getHubStats(): any {
    const agentsByStatus = {
      online: 0,
      offline: 0,
      busy: 0,
      idle: 0,
    };

    const agentsByType = {
      architect: 0,
      manager: 0,
      worker: 0,
    };

    for (const agent of this.agents.values()) {
      agentsByStatus[agent.status]++;
      agentsByType[agent.type]++;
    }

    return {
      total_agents: this.agents.size,
      agents_by_status: agentsByStatus,
      agents_by_type: agentsByType,
      message_queue_size: this.messageQueue.length,
      pending_responses: this.responseCallbacks.size,
      uptime: process.uptime(),
    };
  }
}
