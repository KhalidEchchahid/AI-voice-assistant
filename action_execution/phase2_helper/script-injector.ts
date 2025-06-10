/**
 * Script Injector
 * 
 * Handles injection of helper scripts into host websites with:
 * - Multiple injection strategies
 * - CSP (Content Security Policy) handling
 * - Cross-browser compatibility
 * - Security validation
 * - Fallback mechanisms
 */

interface InjectionConfig {
  targetOrigin: string;
  scriptUrl?: string;
  inlineScript?: string;
  strategies?: InjectionStrategy[];
  cspWorkarounds?: boolean;
  retryAttempts?: number;
  timeout?: number;
  debug?: boolean;
}

interface InjectionStrategy {
  name: string;
  priority: number;
  execute: (config: InjectionConfig) => Promise<InjectionResult>;
}

interface InjectionResult {
  success: boolean;
  strategy: string;
  message: string;
  scriptElement?: HTMLScriptElement;
  error?: {
    type: string;
    message: string;
    cspViolation?: boolean;
  };
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

export class ScriptInjector {
  private config: InjectionConfig;
  private injectedScripts: Map<string, HTMLScriptElement> = new Map();
  private injectionHistory: InjectionResult[] = [];

  constructor(config: InjectionConfig) {
    this.config = {
      strategies: this.getDefaultStrategies(),
      cspWorkarounds: true,
      retryAttempts: 3,
      timeout: 10000,
      debug: false,
      ...config
    };
  }

  /**
   * Main method to inject helper script into target website
   */
  async injectHelper(): Promise<InjectionResult> {
    this.log('Starting script injection for:', this.config.targetOrigin);
    
    // Check if already injected
    const existing = this.injectedScripts.get(this.config.targetOrigin);
    if (existing && document.contains(existing)) {
      return {
        success: true,
        strategy: 'existing',
        message: 'Script already injected',
        scriptElement: existing,
        timing: { startTime: 0, endTime: 0, duration: 0 }
      };
    }

    // Try injection strategies in order of priority
    const strategies = this.config.strategies!.sort((a, b) => b.priority - a.priority);
    let lastError: Error | null = null;

    for (const strategy of strategies) {
      for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
        try {
          this.log(`Attempting ${strategy.name} strategy (attempt ${attempt + 1})`);
          
          const result = await this.executeWithTimeout(
            strategy.execute(this.config),
            this.config.timeout!
          );

          if (result.success) {
            this.injectionHistory.push(result);
            if (result.scriptElement) {
              this.injectedScripts.set(this.config.targetOrigin, result.scriptElement);
            }
            this.log(`Successfully injected using ${strategy.name}`);
            return result;
          } else {
            this.log(`${strategy.name} failed:`, result.message);
            lastError = new Error(result.message);
          }

        } catch (error) {
          this.log(`${strategy.name} attempt ${attempt + 1} failed:`, error.message);
          lastError = error;
          
          // Wait before retry
          if (attempt < this.config.retryAttempts! - 1) {
            await this.sleep(1000 * (attempt + 1));
          }
        }
      }
    }

    // All strategies failed
    const failureResult: InjectionResult = {
      success: false,
      strategy: 'none',
      message: `All injection strategies failed. Last error: ${lastError?.message}`,
      error: {
        type: lastError?.constructor.name || 'InjectionError',
        message: lastError?.message || 'Unknown error'
      },
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };

    this.injectionHistory.push(failureResult);
    return failureResult;
  }

  /**
   * Remove injected script
   */
  removeInjectedScript(targetOrigin?: string): boolean {
    const origin = targetOrigin || this.config.targetOrigin;
    const script = this.injectedScripts.get(origin);
    
    if (script && document.contains(script)) {
      script.remove();
      this.injectedScripts.delete(origin);
      this.log('Removed injected script for:', origin);
      return true;
    }
    
    return false;
  }

  /**
   * Default injection strategies
   */
  private getDefaultStrategies(): InjectionStrategy[] {
    return [
      {
        name: 'direct-script-tag',
        priority: 10,
        execute: this.directScriptInjection.bind(this)
      },
      {
        name: 'dynamic-import',
        priority: 9,
        execute: this.dynamicImportInjection.bind(this)
      },
      {
        name: 'iframe-proxy',
        priority: 8,
        execute: this.iframeProxyInjection.bind(this)
      },
      {
        name: 'blob-url',
        priority: 7,
        execute: this.blobUrlInjection.bind(this)
      },
      {
        name: 'inline-execution',
        priority: 6,
        execute: this.inlineExecution.bind(this)
      },
      {
        name: 'worker-proxy',
        priority: 5,
        execute: this.workerProxyInjection.bind(this)
      },
      {
        name: 'postmessage-bootstrap',
        priority: 4,
        execute: this.postMessageBootstrap.bind(this)
      }
    ];
  }

  /**
   * Strategy 1: Direct script tag injection
   */
  private async directScriptInjection(config: InjectionConfig): Promise<InjectionResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      
      if (config.scriptUrl) {
        script.src = config.scriptUrl;
        script.crossOrigin = 'anonymous';
      } else if (config.inlineScript) {
        script.textContent = config.inlineScript;
      } else {
        resolve({
          success: false,
          strategy: 'direct-script-tag',
          message: 'No script URL or inline script provided',
          timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
        });
        return;
      }

      script.onload = () => {
        resolve({
          success: true,
          strategy: 'direct-script-tag',
          message: 'Script loaded successfully',
          scriptElement: script,
          timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
        });
      };

      script.onerror = (error) => {
        resolve({
          success: false,
          strategy: 'direct-script-tag',
          message: 'Script failed to load',
          error: {
            type: 'LoadError',
            message: 'Script tag failed to load',
            cspViolation: this.detectCSPViolation(error)
          },
          timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
        });
      };

      // Add to DOM
      (document.head || document.documentElement).appendChild(script);
    });
  }

  /**
   * Strategy 2: Dynamic import injection
   */
  private async dynamicImportInjection(config: InjectionConfig): Promise<InjectionResult> {
    const startTime = Date.now();

    try {
      if (!config.scriptUrl) {
        throw new Error('Dynamic import requires script URL');
      }

      // Use dynamic import
      const module = await import(config.scriptUrl);
      
      return {
        success: true,
        strategy: 'dynamic-import',
        message: 'Module imported successfully',
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
      };

    } catch (error) {
      return {
        success: false,
        strategy: 'dynamic-import',
        message: 'Dynamic import failed',
        error: {
          type: error.constructor.name,
          message: error.message,
          cspViolation: this.detectCSPViolation(error)
        },
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Strategy 3: iframe proxy injection
   */
  private async iframeProxyInjection(config: InjectionConfig): Promise<InjectionResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      // Create proxy iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';

      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) {
            throw new Error('Cannot access iframe document');
          }

          // Inject script into iframe
          const script = iframeDoc.createElement('script');
          if (config.scriptUrl) {
            script.src = config.scriptUrl;
          } else if (config.inlineScript) {
            script.textContent = config.inlineScript;
          }

          script.onload = () => {
            resolve({
              success: true,
              strategy: 'iframe-proxy',
              message: 'Script loaded via iframe proxy',
              timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
            });
          };

          script.onerror = () => {
            resolve({
              success: false,
              strategy: 'iframe-proxy',
              message: 'Script failed to load in iframe',
              timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
            });
          };

          iframeDoc.head.appendChild(script);

        } catch (error) {
          resolve({
            success: false,
            strategy: 'iframe-proxy',
            message: 'Iframe access denied',
            error: {
              type: error.constructor.name,
              message: error.message
            },
            timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
          });
        }
      };

      iframe.onerror = () => {
        resolve({
          success: false,
          strategy: 'iframe-proxy',
          message: 'Iframe creation failed',
          timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
        });
      };

      document.body.appendChild(iframe);
    });
  }

  /**
   * Strategy 4: Blob URL injection
   */
  private async blobUrlInjection(config: InjectionConfig): Promise<InjectionResult> {
    const startTime = Date.now();

    try {
      let scriptContent = config.inlineScript;
      
      if (config.scriptUrl && !scriptContent) {
        // Fetch script content
        const response = await fetch(config.scriptUrl);
        scriptContent = await response.text();
      }

      if (!scriptContent) {
        throw new Error('No script content available');
      }

      // Create blob URL
      const blob = new Blob([scriptContent], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = blobUrl;

        script.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve({
            success: true,
            strategy: 'blob-url',
            message: 'Script loaded via blob URL',
            scriptElement: script,
            timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
          });
        };

        script.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          resolve({
            success: false,
            strategy: 'blob-url',
            message: 'Blob URL script failed to load',
            timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
          });
        };

        document.head.appendChild(script);
      });

    } catch (error) {
      return {
        success: false,
        strategy: 'blob-url',
        message: 'Blob URL creation failed',
        error: {
          type: error.constructor.name,
          message: error.message
        },
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Strategy 5: Inline execution
   */
  private async inlineExecution(config: InjectionConfig): Promise<InjectionResult> {
    const startTime = Date.now();

    try {
      let scriptContent = config.inlineScript;
      
      if (config.scriptUrl && !scriptContent) {
        const response = await fetch(config.scriptUrl);
        scriptContent = await response.text();
      }

      if (!scriptContent) {
        throw new Error('No script content available for inline execution');
      }

      // Execute script content directly
      const func = new Function(scriptContent);
      func();

      return {
        success: true,
        strategy: 'inline-execution',
        message: 'Script executed inline successfully',
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
      };

    } catch (error) {
      return {
        success: false,
        strategy: 'inline-execution',
        message: 'Inline execution failed',
        error: {
          type: error.constructor.name,
          message: error.message,
          cspViolation: error.message.includes('unsafe-eval')
        },
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Strategy 6: Worker proxy injection
   */
  private async workerProxyInjection(config: InjectionConfig): Promise<InjectionResult> {
    const startTime = Date.now();

    try {
      const workerScript = `
        self.onmessage = function(e) {
          if (e.data.type === 'load-script') {
            try {
              importScripts(e.data.url);
              self.postMessage({success: true, message: 'Script loaded in worker'});
            } catch (error) {
              self.postMessage({success: false, message: error.message});
            }
          }
        };
      `;

      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      return new Promise((resolve) => {
        worker.onmessage = (e) => {
          worker.terminate();
          resolve({
            success: e.data.success,
            strategy: 'worker-proxy',
            message: e.data.message,
            timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
          });
        };

        worker.onerror = (error) => {
          worker.terminate();
          resolve({
            success: false,
            strategy: 'worker-proxy',
            message: 'Worker failed',
            error: {
              type: 'WorkerError',
              message: error.message
            },
            timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
          });
        };

        worker.postMessage({
          type: 'load-script',
          url: config.scriptUrl
        });
      });

    } catch (error) {
      return {
        success: false,
        strategy: 'worker-proxy',
        message: 'Worker creation failed',
        error: {
          type: error.constructor.name,
          message: error.message
        },
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Strategy 7: PostMessage bootstrap
   */
  private async postMessageBootstrap(config: InjectionConfig): Promise<InjectionResult> {
    const startTime = Date.now();

    try {
      // Create a minimal bootstrap that sets up postMessage communication
      const bootstrapScript = `
        (function() {
          window.voiceAssistantBootstrap = {
            ready: true,
            loadHelper: function(scriptUrl) {
              const script = document.createElement('script');
              script.src = scriptUrl;
              document.head.appendChild(script);
            }
          };
          
          window.parent.postMessage({
            type: 'BOOTSTRAP_READY',
            origin: window.location.origin
          }, '*');
        })();
      `;

      const script = document.createElement('script');
      script.textContent = bootstrapScript;
      document.head.appendChild(script);

      return {
        success: true,
        strategy: 'postmessage-bootstrap',
        message: 'Bootstrap installed successfully',
        scriptElement: script,
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
      };

    } catch (error) {
      return {
        success: false,
        strategy: 'postmessage-bootstrap',
        message: 'Bootstrap installation failed',
        error: {
          type: error.constructor.name,
          message: error.message
        },
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime }
      };
    }
  }

  /**
   * Helper methods
   */
  private detectCSPViolation(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    const cspKeywords = [
      'Content Security Policy',
      'unsafe-eval',
      'unsafe-inline',
      'script-src',
      'refused to execute'
    ];
    
    return cspKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[ScriptInjector]', ...args);
    }
  }

  // Public methods
  public getInjectionHistory(): InjectionResult[] {
    return [...this.injectionHistory];
  }

  public getInjectedScripts(): Map<string, HTMLScriptElement> {
    return new Map(this.injectedScripts);
  }

  public clearHistory(): void {
    this.injectionHistory = [];
  }

  public isScriptInjected(targetOrigin?: string): boolean {
    const origin = targetOrigin || this.config.targetOrigin;
    const script = this.injectedScripts.get(origin);
    return !!(script && document.contains(script));
  }

  public updateConfig(newConfig: Partial<InjectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Helper function to create a script injector with common configurations
export function createScriptInjector(targetOrigin: string, options: Partial<InjectionConfig> = {}): ScriptInjector {
  return new ScriptInjector({
    targetOrigin,
    ...options
  });
}

// Export default configurations
export const DEFAULT_INJECTION_CONFIG: Partial<InjectionConfig> = {
  cspWorkarounds: true,
  retryAttempts: 3,
  timeout: 10000,
  debug: false
};

export const DEVELOPMENT_INJECTION_CONFIG: Partial<InjectionConfig> = {
  ...DEFAULT_INJECTION_CONFIG,
  debug: true,
  timeout: 5000,
  retryAttempts: 1
};

export const PRODUCTION_INJECTION_CONFIG: Partial<InjectionConfig> = {
  ...DEFAULT_INJECTION_CONFIG,
  debug: false,
  timeout: 15000,
  retryAttempts: 5
}; 