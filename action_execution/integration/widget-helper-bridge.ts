/**
 * Widget-Helper Bridge
 * 
 * High-level integration layer that connects the voice assistant widget
 * with the helper script, providing seamless communication and coordination
 */

import { WidgetCommunicationManager } from '../phase1_communication/widget-communication-manager';
import { HelperCommunicationManager } from '../phase2_helper/helper-communication-manager';
import { ScriptInjector } from '../phase2_helper/script-injector';
import { ActionCommand, ActionResult, ElementTarget } from '../types/messages';
import { SimpleCommunicationConfig } from '../types/communication';

interface BridgeConfig {
  widgetOrigin: string;
  helperOrigin: string;
  securityToken?: string;
  autoInject?: boolean;
  debug?: boolean;
  helperScriptUrl?: string;
  fallbackStrategies?: string[];
}

interface BridgeStatus {
  widgetConnected: boolean;
  helperConnected: boolean;
  scriptInjected: boolean;
  lastCommunication: number;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
}

export class WidgetHelperBridge {
  private config: BridgeConfig;
  private widgetManager: WidgetCommunicationManager | null = null;
  private helperManager: HelperCommunicationManager | null = null;
  private scriptInjector: ScriptInjector | null = null;
  private status: BridgeStatus;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: BridgeConfig) {
    this.config = {
      autoInject: true,
      debug: false,
      ...config
    };

    this.status = {
      widgetConnected: false,
      helperConnected: false,
      scriptInjected: false,
      lastCommunication: 0,
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0
    };

    this.initializeEventListeners();
  }

  /**
   * Initialize the bridge - sets up both widget and helper communication
   */
  async initialize(): Promise<boolean> {
    this.log('Initializing Widget-Helper Bridge');
    
    try {
      // Determine if we're running in widget or helper context
      const isWidget = this.detectWidgetContext();
      const isHelper = this.detectHelperContext();

      if (isWidget) {
        await this.initializeWidget();
      }

      if (isHelper) {
        await this.initializeHelper();
      }

      if (!isWidget && !isHelper) {
        this.log('Warning: Could not determine execution context');
      }

      this.emit('bridge:initialized', { widget: isWidget, helper: isHelper });
      return true;

    } catch (error) {
      this.log('Bridge initialization failed:', error);
      this.emit('bridge:error', { error });
      return false;
    }
  }

  /**
   * Initialize widget-side communication
   */
  private async initializeWidget(): Promise<void> {
    this.log('Initializing widget communication');

    // Create widget communication manager
    const config: SimpleCommunicationConfig = {
      targetOrigin: this.config.helperOrigin,
      securityToken: this.config.securityToken,
      debug: this.config.debug,
      connectionTimeout: 10000,
      retryAttempts: 3,
      timeout: 10000
    };
    this.widgetManager = new WidgetCommunicationManager(config as any);

    // Set up event handlers
    this.widgetManager.on('connected', () => {
      this.status.widgetConnected = true;
      this.log('Widget connected to helper');
      this.emit('widget:connected');
    });

    this.widgetManager.on('disconnected', () => {
      this.status.widgetConnected = false;
      this.log('Widget disconnected from helper');
      this.emit('widget:disconnected');
    });

    this.widgetManager.on('action:result', (result) => {
      this.handleActionResult(result);
    });

    // Auto-inject helper script if configured
    if (this.config.autoInject && this.config.helperScriptUrl) {
      await this.injectHelperScript();
    }

    // Connect to helper
    const connected = await this.widgetManager.connect();
    if (!connected) {
      throw new Error('Failed to connect widget to helper');
    }
  }

  /**
   * Initialize helper-side communication
   */
  private async initializeHelper(): Promise<void> {
    this.log('Initializing helper communication');

    // Create helper communication manager
    this.helperManager = new HelperCommunicationManager({
      allowedOrigins: [this.config.widgetOrigin],
      securityToken: this.config.securityToken,
      debug: this.config.debug,
      autoAcknowledge: true
    });

    // The helper manager automatically sets up message listeners
    this.status.helperConnected = true;
    this.log('Helper communication initialized');
    this.emit('helper:ready');
  }

  /**
   * Inject helper script into the target website
   */
  async injectHelperScript(): Promise<boolean> {
    if (!this.config.helperScriptUrl) {
      throw new Error('Helper script URL not configured');
    }

    this.log('Injecting helper script:', this.config.helperScriptUrl);

    this.scriptInjector = new ScriptInjector({
      targetOrigin: this.config.helperOrigin,
      scriptUrl: this.config.helperScriptUrl,
      debug: this.config.debug
    });

    const result = await this.scriptInjector.injectHelper();
    
    if (result.success) {
      this.status.scriptInjected = true;
      this.log('Helper script injected successfully using:', result.strategy);
      this.emit('script:injected', { strategy: result.strategy });
      return true;
    } else {
      this.log('Helper script injection failed:', result.message);
      this.emit('script:injection-failed', { error: result.error });
      return false;
    }
  }

  /**
   * Execute an action on the helper side
   */
  async executeAction(
    action: string, 
    target: ElementTarget, 
    options: any = {}
  ): Promise<ActionResult> {
    if (!this.widgetManager) {
      throw new Error('Widget manager not initialized');
    }

    this.status.totalActions++;
    this.status.lastCommunication = Date.now();

    try {
      this.log(`Executing action: ${action}`, target);

      const command: ActionCommand = {
        id: this.generateCommandId(),
        type: 'ACTION_COMMAND',
        timestamp: Date.now(),
        source: 'widget-bridge',
        payload: {
          action,
          target,
          options
        }
      };

      const result = await this.widgetManager.sendCommand(command);
      
      if (result.success) {
        this.status.successfulActions++;
        this.emit('action:success', { command, result });
      } else {
        this.status.failedActions++;
        this.emit('action:failed', { command, result });
      }

      return result;

    } catch (error) {
      this.status.failedActions++;
      const errorResult: ActionResult = {
        id: this.generateCommandId(),
        type: 'ACTION_RESULT',
        commandId: '',
        timestamp: Date.now(),
        source: 'widget-bridge',
        success: false,
        payload: {
          executedAction: action as any,
          elementFound: false,
          error: {
            message: error.message,
            type: error.constructor.name,
            timestamp: Date.now()
          }
        }
      };

      this.emit('action:error', { error, result: errorResult });
      return errorResult;
    }
  }

  /**
   * High-level action methods
   */
  async click(selector: string, options: any = {}): Promise<ActionResult> {
    return this.executeAction('click', {
      strategy: 'css',
      value: selector
    }, options);
  }

  async type(selector: string, text: string, options: any = {}): Promise<ActionResult> {
    return this.executeAction('type', {
      strategy: 'css',
      value: selector
    }, { ...options, value: text });
  }

  async clickByText(text: string, options: any = {}): Promise<ActionResult> {
    return this.executeAction('click', {
      strategy: 'text',
      value: text
    }, options);
  }

  async scrollTo(direction: string, amount?: number): Promise<ActionResult> {
    return this.executeAction('scroll', {
      strategy: 'css',
      value: 'body'
    }, { direction, amount });
  }

  async fillForm(formData: Record<string, string>): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    
    for (const [selector, value] of Object.entries(formData)) {
      const result = await this.type(selector, value);
      results.push(result);
    }
    
    return results;
  }

  async smartAction(description: string, action: string = 'click'): Promise<ActionResult> {
    return this.executeAction(action, {
      strategy: 'smart',
      value: description
    });
  }

  /**
   * Health and status methods
   */
  async checkHealth(): Promise<BridgeStatus> {
    if (this.widgetManager) {
      try {
        // Use performHealthCheck instead of sendHealthCheck
        const healthResult = await this.widgetManager.performHealthCheck();
        this.status.helperConnected = healthResult.healthy;
      } catch (error) {
        this.status.helperConnected = false;
      }
    }

    return { ...this.status };
  }

  getStatus(): BridgeStatus {
    return { ...this.status };
  }

  getSuccessRate(): number {
    if (this.status.totalActions === 0) return 0;
    return this.status.successfulActions / this.status.totalActions;
  }

  /**
   * Event handling
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.log('Event listener error:', error);
        }
      });
    }
  }

  /**
   * Helper methods
   */
  private detectWidgetContext(): boolean {
    // Check if we're in an iframe or have widget-specific globals
    return window.parent !== window || 
           typeof (window as any).voiceAssistantWidget !== 'undefined' ||
           window.location.hash.includes('widget');
  }

  private detectHelperContext(): boolean {
    // Check if we're in the main page context
    return window.parent === window || 
           typeof (window as any).voiceAssistantHelper !== 'undefined';
  }

  private handleActionResult(result: ActionResult): void {
    this.status.lastCommunication = Date.now();
    
    if (result.success) {
      this.status.successfulActions++;
    } else {
      this.status.failedActions++;
    }

    this.emit('action:completed', result);
  }

  private initializeEventListeners(): void {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.emit('bridge:hidden');
      } else {
        this.emit('bridge:visible');
        // Reconnect if needed
        this.reconnectIfNeeded();
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.emit('bridge:unloading');
      this.disconnect();
    });
  }

  private async reconnectIfNeeded(): Promise<void> {
    if (this.widgetManager && !this.status.widgetConnected) {
      this.log('Attempting to reconnect widget');
      await this.widgetManager.connect();
    }
  }

  private generateCommandId(): string {
    return `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WidgetHelperBridge]', ...args);
    }
  }

  /**
   * Cleanup methods
   */
  disconnect(): void {
    if (this.widgetManager) {
      this.widgetManager.disconnect();
      this.widgetManager = null;
    }

    if (this.helperManager) {
      this.helperManager.disconnect();
      this.helperManager = null;
    }

    if (this.scriptInjector) {
      this.scriptInjector.removeInjectedScript();
      this.scriptInjector = null;
    }

    this.status.widgetConnected = false;
    this.status.helperConnected = false;
    this.status.scriptInjected = false;

    this.emit('bridge:disconnected');
    this.log('Bridge disconnected');
  }

  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.log('Bridge destroyed');
  }
}

/**
 * Factory function to create a bridge with common configurations
 */
export function createWidgetHelperBridge(config: BridgeConfig): WidgetHelperBridge {
  return new WidgetHelperBridge(config);
}

/**
 * Auto-initialize bridge based on context
 */
export async function autoInitializeBridge(
  config: Partial<BridgeConfig> = {}
): Promise<WidgetHelperBridge | null> {
  
  // Detect current context and configure appropriately
  const isWidget = window.parent !== window;
  const currentOrigin = window.location.origin;
  
  if (isWidget) {
    // We're in a widget context
    const bridgeConfig: BridgeConfig = {
      widgetOrigin: currentOrigin,
      helperOrigin: window.parent.location.origin,
      autoInject: true,
      debug: true,
      ...config
    };

    const bridge = new WidgetHelperBridge(bridgeConfig);
    const initialized = await bridge.initialize();
    
    return initialized ? bridge : null;
  }

  // We're in a helper context - wait for widget connection
  const bridgeConfig: BridgeConfig = {
    widgetOrigin: '*', // Will be validated during handshake
    helperOrigin: currentOrigin,
    autoInject: false,
    debug: true,
    ...config
  };

  const bridge = new WidgetHelperBridge(bridgeConfig);
  const initialized = await bridge.initialize();
  
  return initialized ? bridge : null;
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).WidgetHelperBridge = WidgetHelperBridge;
  (window as any).createWidgetHelperBridge = createWidgetHelperBridge;
  (window as any).autoInitializeBridge = autoInitializeBridge;
} 