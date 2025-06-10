/**
 * Basic Integration Example for Voice Assistant Action Execution Phase 1
 * 
 * This example demonstrates how to set up and use the communication system
 * between a voice assistant widget and helper scripts.
 */

import { WidgetCommunicationManager } from '../phase1_communication/widget-communication-manager';
import { createDevelopmentConfig } from '../utils/config-builder';
import type { ActionCommand, ActionResult } from '../types/messages';

// ============================================================================
// WIDGET-SIDE INTEGRATION EXAMPLE
// ============================================================================

/**
 * Example of integrating the communication manager in a voice assistant widget
 */
export class VoiceAssistantWidget {
  private communicationManager: WidgetCommunicationManager;

  constructor() {
    // Create a development configuration
    const config = createDevelopmentConfig([
      'https://example.com',
      'https://app.example.com'
    ]);

    // Initialize communication manager
    this.communicationManager = new WidgetCommunicationManager(config);
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for communication events
   */
  private setupEventListeners(): void {
    // Connection events
    this.communicationManager.on('connected', (data) => {
      console.log('✅ Connected to helper script:', data);
      this.onConnected(data);
    });

    this.communicationManager.on('disconnected', (data) => {
      console.log('🔌 Disconnected from helper script:', data);
      this.onDisconnected(data);
    });

    this.communicationManager.on('error', (data) => {
      console.error('❌ Communication error:', data);
      this.onError(data);
    });

    // Security events
    this.communicationManager.on('security_violation', (data) => {
      console.warn('🚨 Security violation:', data);
      this.onSecurityViolation(data);
    });

    // Helper script events
    this.communicationManager.on('helper_ready', (data) => {
      console.log('🤖 Helper script ready:', data);
    });

    this.communicationManager.on('helper_error', (data) => {
      console.error('⚠️ Helper script error:', data);
    });
  }

  /**
   * Start the voice assistant
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting voice assistant widget...');
      
      // Attempt to connect to helper script
      const connected = await this.communicationManager.connect();
      
      if (connected) {
        console.log('✅ Voice assistant ready!');
        this.showReadyState();
      } else {
        console.log('⚠️ Helper script not available, attempting injection...');
        await this.injectHelperScript();
      }

    } catch (error) {
      console.error('Failed to start voice assistant:', error);
      this.showErrorState(error as Error);
    }
  }

  /**
   * Execute a voice command
   */
  async executeCommand(command: string): Promise<void> {
    try {
      console.log(`🗣️ Executing command: "${command}"`);
      
      // Parse voice command into action
      const action = this.parseVoiceCommand(command);
      
      if (!action) {
        throw new Error('Could not understand the command');
      }

      // Send action to helper script
      const result = await this.communicationManager.sendCommand(action);
      
      if (result.success) {
        console.log('✅ Command executed successfully:', result.payload.result);
        this.showSuccess(`Command "${command}" executed successfully`);
      } else {
        console.error('❌ Command failed:', result.payload.error);
        this.showError(`Command failed: ${result.payload.error?.message}`);
      }

    } catch (error) {
      console.error('Error executing command:', error);
      this.showError(`Error: ${(error as Error).message}`);
    }
  }

  /**
   * Parse voice command into action command
   */
  private parseVoiceCommand(command: string): ActionCommand | null {
    const lowercaseCommand = command.toLowerCase().trim();

    // Click actions
    if (lowercaseCommand.includes('click')) {
      const text = this.extractTextFromCommand(lowercaseCommand, 'click');
      return this.createActionCommand('click', {
        strategy: 'text',
        value: text || 'button'
      });
    }

    // Type actions
    if (lowercaseCommand.includes('type') || lowercaseCommand.includes('enter')) {
      const text = this.extractTextFromCommand(lowercaseCommand, ['type', 'enter']);
      return this.createActionCommand('type', {
        strategy: 'css',
        value: 'input[type="text"], textarea',
        text: text || ''
      });
    }

    // Scroll actions
    if (lowercaseCommand.includes('scroll')) {
      const direction = lowercaseCommand.includes('up') ? 'up' : 'down';
      return this.createActionCommand('scroll', {
        direction,
        amount: 300
      });
    }

    // Navigate actions
    if (lowercaseCommand.includes('go to') || lowercaseCommand.includes('navigate')) {
      const url = this.extractUrlFromCommand(lowercaseCommand);
      if (url) {
        return this.createActionCommand('navigate', { url });
      }
    }

    return null;
  }

  /**
   * Create an action command
   */
  private createActionCommand(actionType: string, actionData: any): ActionCommand {
    return {
      id: this.generateCommandId(),
      type: 'ACTION_COMMAND',
      timestamp: Date.now(),
      source: 'voice-assistant',
      payload: {
        action: actionType,
        target: actionData,
        options: {
          timeout: 5000,
          retries: 2,
          waitForElement: true
        }
      }
    };
  }

  /**
   * Check system health
   */
  async checkHealth(): Promise<void> {
    try {
      const healthResult = await this.communicationManager.performHealthCheck();
      
      console.log('🏥 Health Check Results:');
      console.log(`  Overall Health: ${healthResult.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      console.log(`  Connectivity: ${healthResult.connectivity.reachable ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`  Latency: ${healthResult.connectivity.latency}ms`);
      console.log(`  Security: ${healthResult.security.tokenValid ? '✅ Secure' : '⚠️ Security Issues'}`);
      
      if (healthResult.recommendations.length > 0) {
        console.log('  Recommendations:');
        healthResult.recommendations.forEach(rec => {
          console.log(`    • ${rec}`);
        });
      }

    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  /**
   * Get current status
   */
  getStatus(): any {
    return {
      connected: this.communicationManager.isConnected(),
      status: this.communicationManager.getStatus(),
      config: this.communicationManager.getConfig()
    };
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private onConnected(data: any): void {
    this.showReadyState();
    // You could update UI, enable voice recognition, etc.
  }

  private onDisconnected(data: any): void {
    this.showDisconnectedState();
    // You could show reconnection UI, disable features, etc.
  }

  private onError(data: any): void {
    this.showErrorState(data.error);
    // You could show error messages, fallback options, etc.
  }

  private onSecurityViolation(data: any): void {
    // Handle security violations - log, alert user, etc.
    console.warn('Security violation detected, taking protective measures');
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async injectHelperScript(): Promise<void> {
    const injected = await this.communicationManager.injectHelperScript();
    if (injected) {
      // Wait a bit for helper to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.communicationManager.connect();
    } else {
      throw new Error('Failed to inject helper script');
    }
  }

  private extractTextFromCommand(command: string, trigger: string | string[]): string {
    const triggers = Array.isArray(trigger) ? trigger : [trigger];
    
    for (const t of triggers) {
      const index = command.indexOf(t);
      if (index !== -1) {
        return command.substring(index + t.length).trim();
      }
    }
    
    return '';
  }

  private extractUrlFromCommand(command: string): string | null {
    const urlPattern = /https?:\/\/[^\s]+/;
    const match = command.match(urlPattern);
    return match ? match[0] : null;
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // UI STATE MANAGEMENT (Placeholder implementations)
  // ============================================================================

  private showReadyState(): void {
    console.log('🟢 Widget State: Ready');
    // Update UI to show ready state
  }

  private showDisconnectedState(): void {
    console.log('🔴 Widget State: Disconnected');
    // Update UI to show disconnected state
  }

  private showErrorState(error: Error): void {
    console.log('🔴 Widget State: Error -', error.message);
    // Update UI to show error state
  }

  private showSuccess(message: string): void {
    console.log('✅ Success:', message);
    // Show success notification
  }

  private showError(message: string): void {
    console.log('❌ Error:', message);
    // Show error notification
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    this.communicationManager.destroy();
  }
}

// ============================================================================
// HELPER SCRIPT INTEGRATION EXAMPLE
// ============================================================================

/**
 * Example of integrating the communication system in a helper script
 * This code would run on the target website
 */
export class HelperScriptExample {
  private communicationManager: any; // Would use HelperCommunicationManager
  private actionHandlers = new Map<string, Function>();

  constructor() {
    console.log('🤖 Helper script initializing...');
    this.setupActionHandlers();
    this.initializeCommunication();
  }

  /**
   * Set up action handlers for different action types
   */
  private setupActionHandlers(): void {
    // Click handler
    this.actionHandlers.set('click', async (command: any) => {
      const element = await this.findElement(command.target);
      if (element) {
        element.click();
        return { success: true, message: 'Element clicked' };
      } else {
        throw new Error('Element not found');
      }
    });

    // Type handler
    this.actionHandlers.set('type', async (command: any) => {
      const element = await this.findElement(command.target);
      if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        element.value = command.target.text || '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return { success: true, message: 'Text entered' };
      } else {
        throw new Error('Input element not found');
      }
    });

    // Scroll handler
    this.actionHandlers.set('scroll', async (command: any) => {
      const amount = command.target.amount || 300;
      const direction = command.target.direction || 'down';
      
      window.scrollBy(0, direction === 'down' ? amount : -amount);
      return { success: true, message: `Scrolled ${direction}` };
    });

    // Navigate handler
    this.actionHandlers.set('navigate', async (command: any) => {
      if (command.target.url) {
        window.location.href = command.target.url;
        return { success: true, message: 'Navigation started' };
      } else {
        throw new Error('No URL provided');
      }
    });
  }

  /**
   * Initialize communication with widget
   */
  private initializeCommunication(): void {
    // Listen for messages from widget
    window.addEventListener('message', this.handleMessage.bind(this));
    
    // Announce readiness
    this.announceReady();
  }

  /**
   * Handle incoming messages from widget
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const message = event.data;
      
      if (!message || !message.type) {
        return; // Ignore non-protocol messages
      }

      console.log('📨 Helper received message:', message.type);

      switch (message.type) {
        case 'HANDSHAKE_REQUEST':
          this.handleHandshake(message);
          break;
          
        case 'ACTION_COMMAND':
          await this.handleActionCommand(message);
          break;
          
        case 'HEALTH_CHECK':
          this.handleHealthCheck(message);
          break;
      }

    } catch (error) {
      console.error('Error handling message:', error);
      this.sendErrorResponse(event.data?.id, error as Error);
    }
  }

  /**
   * Handle handshake request
   */
  private handleHandshake(message: any): void {
    const response = {
      id: this.generateMessageId(),
      type: 'HANDSHAKE_RESPONSE',
      timestamp: Date.now(),
      source: 'helper-script',
      payload: {
        accepted: true,
        sessionId: this.generateSessionId(),
        capabilities: [
          'click',
          'type',
          'scroll',
          'navigate',
          'find-element'
        ],
        version: '1.0.0'
      }
    };

    this.sendMessage(response);
    console.log('🤝 Handshake completed');
  }

  /**
   * Handle action command
   */
  private async handleActionCommand(message: any): Promise<void> {
    const { action, target, options } = message.payload;
    
    try {
      const handler = this.actionHandlers.get(action);
      if (!handler) {
        throw new Error(`Unknown action: ${action}`);
      }

      const result = await handler({ target, options });
      
      const response = {
        id: this.generateMessageId(),
        type: 'ACTION_RESULT',
        timestamp: Date.now(),
        source: 'helper-script',
        commandId: message.id,
        success: true,
        payload: {
          result,
          executionTime: Date.now() - message.timestamp
        }
      };

      this.sendMessage(response);
      
    } catch (error) {
      this.sendErrorResponse(message.id, error as Error, 'ACTION_RESULT');
    }
  }

  /**
   * Handle health check
   */
  private handleHealthCheck(message: any): void {
    const response = {
      id: this.generateMessageId(),
      type: 'HEALTH_RESPONSE',
      timestamp: Date.now(),
      source: 'helper-script',
      payload: {
        status: 'healthy',
        capabilities: Array.from(this.actionHandlers.keys()),
        performance: {
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          timing: performance.timing
        }
      }
    };

    this.sendMessage(response);
  }

  /**
   * Find element using various strategies
   */
  private async findElement(target: any): Promise<Element | null> {
    const { strategy, value } = target;

    switch (strategy) {
      case 'css':
        return document.querySelector(value);
        
      case 'xpath':
        const result = document.evaluate(value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue as Element;
        
      case 'text':
        return this.findElementByText(value);
        
      default:
        return document.querySelector(value);
    }
  }

  /**
   * Find element by text content
   */
  private findElementByText(text: string): Element | null {
    const xpath = `//*[contains(text(), "${text}")]`;
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue as Element;
  }

  /**
   * Send message to widget
   */
  private sendMessage(message: any): void {
    window.postMessage(message, '*');
  }

  /**
   * Send error response
   */
  private sendErrorResponse(commandId: string, error: Error, type = 'ERROR'): void {
    const response = {
      id: this.generateMessageId(),
      type,
      timestamp: Date.now(),
      source: 'helper-script',
      commandId,
      success: false,
      payload: {
        error: {
          message: error.message,
          code: 'EXECUTION_ERROR'
        },
        recoverable: true
      }
    };

    this.sendMessage(response);
  }

  /**
   * Announce helper script is ready
   */
  private announceReady(): void {
    console.log('🤖 Helper script ready for commands');
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `helper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Initialize widget
const widget = new VoiceAssistantWidget();
widget.start();

// Example 2: Execute commands
widget.executeCommand('click the login button');
widget.executeCommand('type hello@example.com');
widget.executeCommand('scroll down');

// Example 3: Check health
widget.checkHealth();

// Example 4: Helper script (would run on target website)
// const helper = new HelperScriptExample(); 