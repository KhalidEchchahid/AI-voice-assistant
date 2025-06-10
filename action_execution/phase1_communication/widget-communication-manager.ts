/**
 * Widget Communication Manager for Voice Assistant Action Execution
 * 
 * Manages communication from the voice assistant widget to helper scripts
 * running on host websites. Handles command sending, response processing,
 * and connection management.
 */

import type {
  WidgetCommunicationManager as IWidgetCommunicationManager,
  CommunicationConfig,
  CommunicationStatus,
  CommunicationEvent,
  EventHandler,
  MessageHandler,
  HealthCheckResult,
  ConnectionState
} from '../types/communication';

import type {
  AnyMessage,
  MessageType,
  ActionCommand,
  ActionResult,
  HandshakeRequest,
  HandshakeResponse,
  HealthCheck,
  HealthResponse,
  ErrorMessage
} from '../types/messages';

import { SecurityManager } from './security-manager';

export class WidgetCommunicationManager implements IWidgetCommunicationManager {
  private config: CommunicationConfig;
  private securityManager: SecurityManager;
  private connectionState: ConnectionState = 'disconnected';
  private eventHandlers = new Map<CommunicationEvent, Set<EventHandler>>();
  private messageHandlers = new Map<MessageType, MessageHandler>();
  private pendingCommands = new Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    timestamp: number;
  }>();
  
  private status: CommunicationStatus = {
    connected: false,
    connecting: false,
    connectionAttempts: 0,
    messagesExchanged: 0,
    errorCount: 0,
    securityViolations: 0,
    rateLimitHits: 0
  };

  private sessionId?: string;
  private helperCapabilities: string[] = [];
  private reconnectTimer?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: CommunicationConfig) {
    this.config = config;
    this.securityManager = new SecurityManager(config.security);
    this.initializeEventListeners();
    this.startHealthMonitoring();
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Establish connection with helper script
   */
  async connect(): Promise<boolean> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return this.connectionState === 'connected';
    }

    this.connectionState = 'connecting';
    this.status.connecting = true;
    this.status.connectionAttempts++;

    try {
      // Generate security token
      const token = this.securityManager.generateToken([
        'action:execute',
        'page:read',
        'element:find'
      ]);

      // Send handshake request
      const handshakeRequest: HandshakeRequest = {
        id: this.generateMessageId(),
        type: 'HANDSHAKE_REQUEST',
        timestamp: Date.now(),
        source: 'voice-assistant',
        securityToken: token.value,
        payload: {
          version: '1.0.0',
          capabilities: [
            'action-execution',
            'element-finding',
            'page-monitoring'
          ],
          origin: window.location.origin,
          securityToken: token.value
        }
      };

      const response = await this.sendMessageWithResponse<HandshakeResponse>(
        handshakeRequest,
        'HANDSHAKE_RESPONSE',
        5000 // 5 second timeout for handshake
      );

      if (response.payload.accepted) {
        this.connectionState = 'connected';
        this.status.connected = true;
        this.status.connecting = false;
        this.status.lastConnected = Date.now();
        this.sessionId = response.payload.sessionId;
        this.helperCapabilities = response.payload.capabilities;

        this.emit('connected', {
          sessionId: this.sessionId,
          capabilities: this.helperCapabilities
        });

        console.log('✅ Connected to helper script:', response.payload);
        return true;
      } else {
        throw new Error(response.payload.error || 'Handshake rejected');
      }

    } catch (error) {
      this.connectionState = 'failed';
      this.status.connecting = false;
      this.status.errorCount++;
      this.status.lastError = error as Error;

      this.emit('error', {
        error: error as Error,
        recoverable: true
      });

      console.error('❌ Failed to connect to helper script:', error);

      // Schedule reconnection if enabled
      if (this.config.connection.autoReconnect) {
        this.scheduleReconnection();
      }

      return false;
    }
  }

  /**
   * Disconnect from helper script
   */
  disconnect(): void {
    this.connectionState = 'disconnected';
    this.status.connected = false;
    this.status.connecting = false;

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    // Reject all pending commands
    for (const [id, pending] of this.pendingCommands) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingCommands.clear();

    this.emit('disconnected', {
      reason: 'Manual disconnect',
      willReconnect: false
    });

    console.log('🔌 Disconnected from helper script');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  /**
   * Send a message to helper script
   */
  async sendMessage(message: AnyMessage): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to helper script');
    }

    // Add security token
    const token = this.securityManager.getCurrentToken();
    if (token) {
      message.securityToken = token.value;
    }

    try {
      // Post message to target origin
      const targetOrigin = this.config.targetOrigin;
      window.postMessage(message, targetOrigin);

      this.status.messagesExchanged++;
      this.status.lastMessageTime = Date.now();

      this.emit('message_sent', {
        messageId: message.id,
        type: message.type,
        size: JSON.stringify(message).length
      });

    } catch (error) {
      this.status.errorCount++;
      this.status.lastError = error as Error;
      throw error;
    }
  }

  /**
   * Send message and wait for specific response type
   */
  private async sendMessageWithResponse<T extends AnyMessage>(
    message: AnyMessage,
    expectedResponseType: MessageType,
    timeoutMs = this.config.timeout
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(message.id);
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingCommands.set(message.id, {
        resolve: (result: T) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
        timestamp: Date.now()
      });

      // Send the message
      this.sendMessage(message).catch(reject);
    });
  }

  /**
   * Add message handler
   */
  addMessageHandler(type: MessageType, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove message handler
   */
  removeMessageHandler(type: MessageType): void {
    this.messageHandlers.delete(type);
  }

  // ============================================================================
  // COMMAND EXECUTION
  // ============================================================================

  /**
   * Send an action command to helper script
   */
  async sendCommand(command: ActionCommand): Promise<ActionResult> {
    if (!this.isConnected()) {
      await this.connect();
    }

    if (!this.isConnected()) {
      throw new Error('Unable to establish connection to helper script');
    }

    try {
      const result = await this.sendMessageWithResponse<ActionResult>(
        command,
        'ACTION_RESULT',
        command.payload.options?.timeout || this.config.timeout
      );

      if (!result.success && result.payload.error) {
        console.warn('Command failed:', result.payload.error);
      }

      return result;

    } catch (error) {
      console.error('Command execution failed:', error);
      throw error;
    }
  }

  /**
   * Send command with retry logic
   */
  async sendCommandWithRetry(command: ActionCommand, maxRetries: number): Promise<ActionResult> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.sendCommand(command);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
          console.log(`Command failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await this.sleep(delay);

          // Try to reconnect if connection was lost
          if (!this.isConnected()) {
            await this.connect();
          }
        }
      }
    }

    throw lastError!;
  }

  // ============================================================================
  // HELPER SCRIPT MANAGEMENT
  // ============================================================================

  /**
   * Inject helper script into target page
   */
  async injectHelperScript(): Promise<boolean> {
    try {
      // This would be implemented based on your specific injection strategy
      // For now, we assume the helper script is already injected
      console.log('📦 Helper script injection (placeholder implementation)');
      
      // In a real implementation, this might:
      // 1. Load helper script from CDN
      // 2. Create script element
      // 3. Inject into target page
      // 4. Wait for initialization

      return true;
    } catch (error) {
      console.error('Failed to inject helper script:', error);
      return false;
    }
  }

  /**
   * Check if helper script is available
   */
  async checkHelperScript(): Promise<boolean> {
    try {
      const healthCheck: HealthCheck = {
        id: this.generateMessageId(),
        type: 'HEALTH_CHECK',
        timestamp: Date.now(),
        source: 'voice-assistant',
        payload: {
          requestedInfo: ['performance', 'capabilities']
        }
      };

      const response = await this.sendMessageWithResponse<HealthResponse>(
        healthCheck,
        'HEALTH_RESPONSE',
        3000 // 3 second timeout
      );

      return response.payload.status === 'healthy';

    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CommunicationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.security) {
      this.securityManager.updateConfig(config.security);
    }

    this.emit('config_updated', { changes: config });
  }

  /**
   * Get current configuration
   */
  getConfig(): CommunicationConfig {
    return { ...this.config };
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Add event handler
   */
  on(event: CommunicationEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove event handler
   */
  off(event: CommunicationEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event
   */
  emit(event: CommunicationEvent, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // HEALTH AND STATUS
  // ============================================================================

  /**
   * Get current status
   */
  getStatus(): CommunicationStatus {
    return { ...this.status };
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      healthy: true,
      connectivity: {
        reachable: false,
        latency: 0,
        packetLoss: 0,
        stability: 0
      },
      performance: {
        averageLatency: this.status.latency || 0,
        peakLatency: 0,
        throughput: 0,
        memoryUsage: 0
      },
      security: {
        tokenValid: false,
        originVerified: true,
        encryptionActive: false,
        violationCount: this.status.securityViolations,
        riskLevel: 'low'
      },
      capabilities: {
        coreFeatures: [],
        optionalFeatures: [],
        compatibility: {
          browser: navigator.userAgent,
          version: '1.0.0',
          supportLevel: 'full',
          missingFeatures: [],
          workarounds: []
        }
      },
      recommendations: [],
      timestamp: Date.now()
    };

    // Test connectivity
    try {
      const startTime = Date.now();
      const isReachable = await this.checkHelperScript();
      const latency = Date.now() - startTime;
      
      result.connectivity.reachable = isReachable;
      result.connectivity.latency = latency;
      result.connectivity.stability = this.status.errorCount / Math.max(1, this.status.connectionAttempts);
    } catch (error) {
      result.healthy = false;
      result.recommendations.push('Helper script is not reachable');
    }

    // Check security
    const securityCheck = this.securityManager.performSecurityCheck();
    result.security.tokenValid = securityCheck.passed;
    result.security.riskLevel = securityCheck.level;

    if (!securityCheck.passed) {
      result.healthy = false;
      result.recommendations.push(...securityCheck.recommendations);
    }

    // Overall health assessment
    if (this.status.errorCount > 5) {
      result.healthy = false;
      result.recommendations.push('High error rate detected');
    }

    if (result.recommendations.length === 0) {
      result.recommendations.push('System is operating normally');
    }

    this.emit('health_check', {
      status: this.status,
      latency: result.connectivity.latency
    });

    return result;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Listen for messages from helper script
    window.addEventListener('message', this.handleIncomingMessage.bind(this));

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
  }

  /**
   * Handle incoming messages from helper script
   */
  private handleIncomingMessage(event: MessageEvent): void {
    try {
      const message: AnyMessage = event.data;

      // Validate message structure
      if (!message || typeof message !== 'object' || !message.type) {
        return; // Ignore non-protocol messages
      }

      // Security validation
      const validation = this.securityManager.validateMessage(message, event.origin);
      if (!validation.valid) {
        this.status.securityViolations++;
        console.warn('Security validation failed:', validation.errors);
        return;
      }

      this.status.messagesExchanged++;
      this.status.lastMessageTime = Date.now();

      // Calculate latency if we can
      const latency = Date.now() - message.timestamp;
      if (this.status.latency) {
        this.status.latency = (this.status.latency + latency) / 2; // Running average
      } else {
        this.status.latency = latency;
      }

      this.emit('message_received', {
        messageId: message.id,
        type: message.type,
        latency
      });

      // Handle pending command responses
      if (message.type === 'ACTION_RESULT') {
        const result = message as ActionResult;
        const pending = this.pendingCommands.get(result.commandId);
        if (pending) {
          this.pendingCommands.delete(result.commandId);
          pending.resolve(result);
          return;
        }
      }

      // Handle other response types
      const pending = this.pendingCommands.get(message.id);
      if (pending) {
        this.pendingCommands.delete(message.id);
        pending.resolve(message);
        return;
      }

      // Handle specific message types
      this.handleSpecificMessage(message);

      // Call registered message handler
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message, {
          origin: event.origin,
          timestamp: Date.now(),
          messageId: message.id,
          sessionId: this.sessionId,
          userAgent: navigator.userAgent,
          isSecure: event.origin.startsWith('https:'),
          metadata: {}
        });
      }

    } catch (error) {
      this.status.errorCount++;
      this.status.lastError = error as Error;
      console.error('Error handling incoming message:', error);
    }
  }

  /**
   * Handle specific message types
   */
  private handleSpecificMessage(message: AnyMessage): void {
    switch (message.type) {
      case 'ERROR':
        const errorMsg = message as ErrorMessage;
        console.error('Helper script error:', errorMsg.payload.error);
        this.emit('helper_error', {
          error: errorMsg.payload.error.message,
          fatal: !errorMsg.payload.recoverable
        });
        break;

      case 'HEALTH_RESPONSE':
        const healthMsg = message as HealthResponse;
        if (healthMsg.payload.status !== 'healthy') {
          this.emit('helper_error', {
            error: `Helper script unhealthy: ${healthMsg.payload.status}`,
            fatal: false
          });
        }
        break;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    const delay = this.config.connection.reconnectInterval;
    console.log(`🔄 Scheduling reconnection in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      
      if (this.status.connectionAttempts < this.config.connection.maxReconnectAttempts) {
        console.log('🔄 Attempting to reconnect...');
        this.connectionState = 'reconnecting';
        await this.connect();
      } else {
        console.error('❌ Max reconnection attempts reached');
        this.emit('error', {
          error: new Error('Max reconnection attempts reached'),
          recoverable: false
        });
      }
    }, delay);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (!this.config.connection.keepAlive) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      if (this.isConnected()) {
        try {
          await this.checkHelperScript();
        } catch (error) {
          console.warn('Health check failed:', error);
          // Connection might be lost, try to reconnect
          if (this.config.connection.autoReconnect) {
            this.connectionState = 'disconnected';
            this.status.connected = false;
            this.scheduleReconnection();
          }
        }
      }
    }, this.config.connection.keepAliveInterval);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnect();
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.eventHandlers.clear();
    this.messageHandlers.clear();
  }
} 