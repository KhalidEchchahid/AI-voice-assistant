/**
 * Helper Communication Manager
 * 
 * Receives and processes action commands from the voice assistant widget
 * Handles security validation and coordinates with action executors
 */

import { 
  ActionCommand, 
  ActionResult, 
  HandshakeMessage, 
  HealthCheckMessage,
  SecurityConfig,
  MessageType 
} from '../types/messages';
import { SecurityManager } from '../phase1_communication/security-manager';
import { ActionExecutor } from './action-executor';
import { ElementFinder } from './element-finder';

interface HelperConfig {
  allowedOrigins: string[];
  securityToken?: string;
  debug?: boolean;
  autoAcknowledge?: boolean;
  actionTimeout?: number;
  rateLimitConfig?: {
    maxActionsPerSecond: number;
    maxActionsPerMinute: number;
  };
}

interface HelperStats {
  totalCommandsReceived: number;
  successfulActions: number;
  failedActions: number;
  securityViolations: number;
  averageExecutionTime: number;
  lastActionTime: number;
}

export class HelperCommunicationManager {
  private securityManager: SecurityManager;
  private actionExecutor: ActionExecutor;
  private elementFinder: ElementFinder;
  private config: HelperConfig;
  private isInitialized: boolean = false;
  private widgetOrigin: string | null = null;
  private stats: HelperStats;
  private actionHistory: Map<string, ActionResult> = new Map();
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(config: HelperConfig) {
    this.config = {
      debug: false,
      autoAcknowledge: true,
      actionTimeout: 10000,
      rateLimitConfig: {
        maxActionsPerSecond: 5,
        maxActionsPerMinute: 60
      },
      ...config
    };

    this.stats = {
      totalCommandsReceived: 0,
      successfulActions: 0,
      failedActions: 0,
      securityViolations: 0,
      averageExecutionTime: 0,
      lastActionTime: 0
    };

    this.initializeComponents();
    this.setupMessageListener();
  }

  private initializeComponents(): void {
    // Initialize security manager
    this.securityManager = new SecurityManager({
      allowedOrigins: this.config.allowedOrigins,
      tokenValidationEnabled: true,
      originValidationEnabled: true,
      securityLevel: 'high'
    });

    // Initialize action components
    this.actionExecutor = new ActionExecutor({
      timeout: this.config.actionTimeout,
      debug: this.config.debug
    });

    this.elementFinder = new ElementFinder({
      timeout: 5000,
      retryAttempts: 3,
      debug: this.config.debug
    });

    this.log('Helper Communication Manager initialized');
  }

  private setupMessageListener(): void {
    window.addEventListener('message', this.handleMessage.bind(this));
    this.log('Message listener established');
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      // Basic origin validation
      if (!this.config.allowedOrigins.includes('*') && 
          !this.config.allowedOrigins.includes(event.origin)) {
        this.stats.securityViolations++;
        this.log('Rejected message from unauthorized origin:', event.origin);
        return;
      }

      const message = event.data;
      if (!message || !message.type) {
        return;
      }

      this.stats.totalCommandsReceived++;
      this.log('Received message:', message.type, message);

      // Handle different message types
      switch (message.type) {
        case 'HANDSHAKE_REQUEST':
          await this.handleHandshake(event);
          break;
        
        case 'ACTION_COMMAND':
          await this.handleActionCommand(event);
          break;
        
        case 'HEALTH_CHECK':
          await this.handleHealthCheck(event);
          break;
        
        case 'SECURITY_TOKEN_UPDATE':
          await this.handleTokenUpdate(event);
          break;
        
        default:
          this.log('Unknown message type:', message.type);
      }

    } catch (error) {
      this.log('Error handling message:', error);
      this.stats.failedActions++;
    }
  }

  private async handleHandshake(event: MessageEvent): Promise<void> {
    const handshakeRequest: HandshakeMessage = event.data;
    
    try {
      // Validate handshake
      const isValid = await this.securityManager.validateHandshake(handshakeRequest);
      
      if (isValid) {
        this.widgetOrigin = event.origin;
        this.isInitialized = true;
        
        // Send handshake response
        const response: HandshakeMessage = {
          id: this.generateId(),
          type: 'HANDSHAKE_RESPONSE',
          timestamp: Date.now(),
          source: 'helper-script',
          payload: {
            status: 'connected',
            capabilities: this.getCapabilities(),
            helperVersion: '2.0.0',
            securityLevel: 'high'
          }
        };

        this.sendMessage(response, event.origin);
        this.log('Handshake completed with:', event.origin);
      } else {
        this.stats.securityViolations++;
        this.log('Handshake validation failed');
      }
    } catch (error) {
      this.log('Handshake error:', error);
    }
  }

  private async handleActionCommand(event: MessageEvent): Promise<void> {
    const command: ActionCommand = event.data;
    const startTime = Date.now();

    try {
      // Security validation
      if (!this.isInitialized || event.origin !== this.widgetOrigin) {
        throw new Error('Unauthorized action command');
      }

      // Rate limiting check
      if (!this.checkRateLimit(event.origin)) {
        throw new Error('Rate limit exceeded');
      }

      // Validate command structure
      if (!this.validateCommand(command)) {
        throw new Error('Invalid command structure');
      }

      this.log('Executing action:', command.payload.action, command.payload.target);

      // Find target element
      const element = await this.elementFinder.findElement(command.payload.target);
      
      if (!element) {
        throw new Error(`Element not found: ${JSON.stringify(command.payload.target)}`);
      }

      // Execute action
      const executionResult = await this.actionExecutor.executeAction(
        command.payload.action,
        element,
        command.payload.options || {}
      );

      const executionTime = Date.now() - startTime;
      this.updateStats(true, executionTime);

      // Send success response
      const result: ActionResult = {
        id: this.generateId(),
        type: 'ACTION_RESULT',
        commandId: command.id,
        timestamp: Date.now(),
        source: 'helper-script',
        success: true,
        payload: {
          result: executionResult,
          executionTime,
          elementFound: true,
          elementDetails: {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.substring(0, 100)
          }
        }
      };

      this.actionHistory.set(command.id, result);
      this.sendMessage(result, event.origin);
      
      this.log('Action completed successfully:', command.payload.action);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateStats(false, executionTime);

      // Send error response
      const errorResult: ActionResult = {
        id: this.generateId(),
        type: 'ACTION_RESULT',
        commandId: command.id,
        timestamp: Date.now(),
        source: 'helper-script',
        success: false,
        payload: {
          error: {
            message: error.message,
            type: error.constructor.name,
            stack: this.config.debug ? error.stack : undefined
          },
          executionTime,
          elementFound: false
        }
      };

      this.actionHistory.set(command.id, errorResult);
      this.sendMessage(errorResult, event.origin);
      
      this.log('Action failed:', error.message);
    }
  }

  private async handleHealthCheck(event: MessageEvent): Promise<void> {
    const healthResponse: HealthCheckMessage = {
      id: this.generateId(),
      type: 'HEALTH_RESPONSE',
      timestamp: Date.now(),
      source: 'helper-script',
      payload: {
        status: 'healthy',
        uptime: Date.now() - this.stats.lastActionTime,
        stats: this.getHealthStats(),
        capabilities: this.getCapabilities()
      }
    };

    this.sendMessage(healthResponse, event.origin);
  }

  private async handleTokenUpdate(event: MessageEvent): Promise<void> {
    try {
      const { newToken } = event.data.payload;
      await this.securityManager.updateToken(newToken);
      this.log('Security token updated');
    } catch (error) {
      this.log('Token update failed:', error);
    }
  }

  private validateCommand(command: ActionCommand): boolean {
    return !!(
      command.id &&
      command.type === 'ACTION_COMMAND' &&
      command.payload &&
      command.payload.action &&
      command.payload.target
    );
  }

  private checkRateLimit(origin: string): boolean {
    const now = Date.now();
    const originLimits = this.rateLimitTracker.get(origin) || [];
    
    // Remove old entries (older than 1 minute)
    const recentActions = originLimits.filter(time => now - time < 60000);
    
    // Check per-second limit (last 1 second)
    const lastSecondActions = recentActions.filter(time => now - time < 1000);
    if (lastSecondActions.length >= this.config.rateLimitConfig!.maxActionsPerSecond) {
      return false;
    }
    
    // Check per-minute limit
    if (recentActions.length >= this.config.rateLimitConfig!.maxActionsPerMinute) {
      return false;
    }
    
    // Add current action and update tracker
    recentActions.push(now);
    this.rateLimitTracker.set(origin, recentActions);
    
    return true;
  }

  private updateStats(success: boolean, executionTime: number): void {
    if (success) {
      this.stats.successfulActions++;
    } else {
      this.stats.failedActions++;
    }
    
    // Update average execution time
    const totalActions = this.stats.successfulActions + this.stats.failedActions;
    this.stats.averageExecutionTime = 
      (this.stats.averageExecutionTime * (totalActions - 1) + executionTime) / totalActions;
    
    this.stats.lastActionTime = Date.now();
  }

  private getCapabilities(): string[] {
    return [
      'click',
      'type',
      'scroll',
      'hover',
      'submit',
      'navigate',
      'screenshot',
      'element-detection',
      'form-handling',
      'multi-element-selection'
    ];
  }

  private getHealthStats(): any {
    return {
      totalCommands: this.stats.totalCommandsReceived,
      successRate: this.stats.successfulActions / (this.stats.successfulActions + this.stats.failedActions) || 0,
      averageExecutionTime: this.stats.averageExecutionTime,
      securityViolations: this.stats.securityViolations,
      isInitialized: this.isInitialized,
      widgetConnected: !!this.widgetOrigin
    };
  }

  private sendMessage(message: any, targetOrigin: string): void {
    window.parent.postMessage(message, targetOrigin);
    this.log('Sent message:', message.type, 'to', targetOrigin);
  }

  private generateId(): string {
    return `helper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[HelperCommunicationManager]', ...args);
    }
  }

  // Public methods for integration
  public getStats(): HelperStats {
    return { ...this.stats };
  }

  public getActionHistory(): Map<string, ActionResult> {
    return new Map(this.actionHistory);
  }

  public clearHistory(): void {
    this.actionHistory.clear();
    this.log('Action history cleared');
  }

  public disconnect(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.isInitialized = false;
    this.widgetOrigin = null;
    this.log('Helper disconnected');
  }
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
  (window as any).HelperCommunicationManager = HelperCommunicationManager;
} 