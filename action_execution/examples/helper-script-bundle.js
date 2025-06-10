/**
 * Voice Assistant Helper Script Bundle
 * 
 * Complete bundled helper script for easy integration into host websites.
 * This file contains all necessary components for Phase 2 functionality.
 * 
 * Usage:
 * <script src="helper-script-bundle.js"></script>
 * <script>
 *   VoiceAssistantHelper.initialize({
 *     allowedOrigins: ['https://your-voice-assistant-domain.com'],
 *     debug: true
 *   });
 * </script>
 */

(function(window) {
    'use strict';

    // Check if already loaded
    if (window.VoiceAssistantHelper) {
        console.warn('Voice Assistant Helper already loaded');
        return;
    }

    // Helper Script Bundle - All components in one file
    const VoiceAssistantHelper = {
        version: '2.0.0',
        initialized: false,
        communicationManager: null,
        elementFinder: null,
        actionExecutor: null,
        config: null,

        /**
         * Initialize the helper script
         */
        initialize(config = {}) {
            if (this.initialized) {
                console.warn('Voice Assistant Helper already initialized');
                return;
            }

            this.config = {
                allowedOrigins: ['*'],
                debug: false,
                autoAcknowledge: true,
                actionTimeout: 10000,
                ...config
            };

            try {
                this.log('Initializing Voice Assistant Helper v' + this.version);
                
                // Initialize components
                this.elementFinder = new ElementFinder({ debug: this.config.debug });
                this.actionExecutor = new ActionExecutor({ 
                    debug: this.config.debug,
                    timeout: this.config.actionTimeout 
                });
                this.communicationManager = new HelperCommunicationManager({
                    allowedOrigins: this.config.allowedOrigins,
                    debug: this.config.debug,
                    elementFinder: this.elementFinder,
                    actionExecutor: this.actionExecutor
                });

                this.initialized = true;
                this.log('Voice Assistant Helper initialized successfully');
                
                // Announce readiness
                this.announceReadiness();

            } catch (error) {
                console.error('Voice Assistant Helper initialization failed:', error);
            }
        },

        /**
         * Announce helper readiness to parent window
         */
        announceReadiness() {
            const readyMessage = {
                type: 'HELPER_READY',
                timestamp: Date.now(),
                version: this.version,
                capabilities: [
                    'click', 'type', 'scroll', 'hover', 'submit',
                    'element-detection', 'form-handling'
                ]
            };

            // Send to parent and all frames
            if (window.parent !== window) {
                window.parent.postMessage(readyMessage, '*');
            }
            
            // Also broadcast to any listening frames
            window.postMessage(readyMessage, '*');
            
            this.log('Helper readiness announced');
        },

        /**
         * Get helper status and statistics
         */
        getStatus() {
            if (!this.initialized) {
                return { initialized: false };
            }

            return {
                initialized: true,
                version: this.version,
                stats: this.communicationManager ? this.communicationManager.getStats() : null,
                config: this.config
            };
        },

        /**
         * Disconnect and cleanup
         */
        disconnect() {
            if (this.communicationManager) {
                this.communicationManager.disconnect();
            }
            this.initialized = false;
            this.log('Helper disconnected');
        },

        /**
         * Debug logging
         */
        log(...args) {
            if (this.config && this.config.debug) {
                console.log('[VoiceAssistantHelper]', ...args);
            }
        }
    };

    /**
     * Element Finder - Simplified version for bundle
     */
    class ElementFinder {
        constructor(config = {}) {
            this.config = { debug: false, ...config };
        }

        async findElement(target) {
            try {
                switch (target.strategy) {
                    case 'css':
                        return document.querySelector(target.value);
                    
                    case 'xpath':
                        return this.findByXPath(target.value)[0] || null;
                    
                    case 'text':
                        return this.findByText(target.value)[0] || null;
                    
                    case 'attribute':
                        return document.querySelector(`[${target.attribute}*="${target.value}"]`);
                    
                    case 'smart':
                        return this.smartFind(target.value);
                    
                    default:
                        return null;
                }
            } catch (error) {
                this.log('Element finding error:', error);
                return null;
            }
        }

        findByXPath(xpath) {
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const elements = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                elements.push(result.snapshotItem(i));
            }
            return elements;
        }

        findByText(text) {
            const elements = [];
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_ELEMENT,
                null
            );

            let node;
            while (node = walker.nextNode()) {
                if (node.textContent && node.textContent.trim().includes(text)) {
                    elements.push(node);
                }
            }

            return elements;
        }

        smartFind(description) {
            // Simple smart finding - try multiple strategies
            const strategies = [
                () => document.querySelector(`[aria-label*="${description}"]`),
                () => document.querySelector(`[title*="${description}"]`),
                () => this.findByText(description)[0],
                () => document.querySelector(`button:contains("${description}")`),
                () => document.querySelector(`a:contains("${description}")`)
            ];

            for (const strategy of strategies) {
                try {
                    const element = strategy();
                    if (element) return element;
                } catch (e) {}
            }

            return null;
        }

        log(...args) {
            if (this.config.debug) {
                console.log('[ElementFinder]', ...args);
            }
        }
    }

    /**
     * Action Executor - Simplified version for bundle
     */
    class ActionExecutor {
        constructor(config = {}) {
            this.config = { debug: false, timeout: 10000, ...config };
        }

        async executeAction(action, element, options = {}) {
            const startTime = Date.now();

            try {
                this.log(`Executing ${action} on`, element);

                let result;
                switch (action.toLowerCase()) {
                    case 'click':
                        result = await this.click(element);
                        break;
                    case 'type':
                        result = await this.type(element, options.value || '');
                        break;
                    case 'clear':
                        result = await this.clear(element);
                        break;
                    case 'scroll':
                        result = await this.scroll(element, options);
                        break;
                    case 'hover':
                        result = await this.hover(element);
                        break;
                    case 'submit':
                        result = await this.submit(element);
                        break;
                    default:
                        throw new Error(`Unknown action: ${action}`);
                }

                return {
                    success: true,
                    message: `${action} completed successfully`,
                    executionTime: Date.now() - startTime,
                    result
                };

            } catch (error) {
                this.log(`Action ${action} failed:`, error);
                return {
                    success: false,
                    message: error.message,
                    executionTime: Date.now() - startTime,
                    error: error.message
                };
            }
        }

        async click(element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.sleep(100);

            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            const events = ['mousedown', 'mouseup', 'click'];
            for (const eventType of events) {
                const event = new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y
                });
                element.dispatchEvent(event);
                await this.sleep(50);
            }

            return 'clicked';
        }

        async type(element, text) {
            element.focus();
            
            // Clear existing content
            if (element.value !== undefined) {
                element.value = '';
            } else {
                element.textContent = '';
            }

            // Type character by character
            for (const char of text) {
                const keyEvents = ['keydown', 'keypress', 'input', 'keyup'];
                
                for (const eventType of keyEvents) {
                    const event = new KeyboardEvent(eventType, {
                        bubbles: true,
                        cancelable: true,
                        key: char,
                        char: char
                    });
                    element.dispatchEvent(event);
                }

                // Update value
                if (element.value !== undefined) {
                    element.value += char;
                } else {
                    element.textContent += char;
                }

                await this.sleep(50);
            }

            // Trigger change event
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return `typed: ${text}`;
        }

        async clear(element) {
            element.focus();
            
            if (element.value !== undefined) {
                element.value = '';
            } else {
                element.textContent = '';
            }

            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            
            return 'cleared';
        }

        async scroll(element, options = {}) {
            const scrollOptions = { behavior: 'smooth' };
            
            if (options.direction === 'up') {
                scrollOptions.top = element.scrollTop - (options.amount || 100);
            } else if (options.direction === 'down') {
                scrollOptions.top = element.scrollTop + (options.amount || 100);
            } else if (options.direction === 'top') {
                scrollOptions.top = 0;
            } else if (options.direction === 'bottom') {
                scrollOptions.top = element.scrollHeight;
            }

            if (element === document.body || element === document.documentElement) {
                window.scrollTo(scrollOptions);
            } else {
                element.scrollTo(scrollOptions);
            }

            return `scrolled ${options.direction}`;
        }

        async hover(element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const rect = element.getBoundingClientRect();
            const mouseEvent = new MouseEvent('mouseover', {
                bubbles: true,
                cancelable: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2
            });

            element.dispatchEvent(mouseEvent);
            return 'hovered';
        }

        async submit(element) {
            const form = element.closest('form') || element;
            
            if (form.tagName === 'FORM') {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
                return 'submitted';
            } else {
                throw new Error('Element is not in a form');
            }
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        log(...args) {
            if (this.config.debug) {
                console.log('[ActionExecutor]', ...args);
            }
        }
    }

    /**
     * Helper Communication Manager - Simplified version for bundle
     */
    class HelperCommunicationManager {
        constructor(config = {}) {
            this.config = {
                allowedOrigins: ['*'],
                debug: false,
                autoAcknowledge: true,
                ...config
            };

            this.elementFinder = config.elementFinder;
            this.actionExecutor = config.actionExecutor;
            this.stats = {
                totalCommands: 0,
                successfulActions: 0,
                failedActions: 0,
                startTime: Date.now()
            };

            this.setupMessageListener();
        }

        setupMessageListener() {
            window.addEventListener('message', this.handleMessage.bind(this));
            this.log('Message listener established');
        }

        async handleMessage(event) {
            try {
                // Basic origin validation
                if (!this.isOriginAllowed(event.origin)) {
                    this.log('Rejected message from unauthorized origin:', event.origin);
                    return;
                }

                const message = event.data;
                if (!message || !message.type) {
                    return;
                }

                this.stats.totalCommands++;
                this.log('Received message:', message.type);

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
                    
                    default:
                        this.log('Unknown message type:', message.type);
                }

            } catch (error) {
                this.log('Error handling message:', error);
            }
        }

        async handleHandshake(event) {
            const response = {
                type: 'HANDSHAKE_RESPONSE',
                timestamp: Date.now(),
                payload: {
                    status: 'connected',
                    version: VoiceAssistantHelper.version,
                    capabilities: ['click', 'type', 'scroll', 'hover', 'submit']
                }
            };

            this.sendMessage(response, event.origin);
            this.log('Handshake completed with:', event.origin);
        }

        async handleActionCommand(event) {
            const command = event.data;
            const startTime = Date.now();

            try {
                this.log('Executing action:', command.payload.action);

                // Find element
                const element = await this.elementFinder.findElement(command.payload.target);
                
                if (!element) {
                    throw new Error('Element not found');
                }

                // Execute action
                const result = await this.actionExecutor.executeAction(
                    command.payload.action,
                    element,
                    command.payload.options || {}
                );

                this.stats.successfulActions++;

                // Send success response
                const response = {
                    type: 'ACTION_RESULT',
                    commandId: command.id,
                    timestamp: Date.now(),
                    success: true,
                    payload: {
                        result: result.result,
                        executionTime: Date.now() - startTime,
                        elementFound: true
                    }
                };

                this.sendMessage(response, event.origin);
                this.log('Action completed successfully');

            } catch (error) {
                this.stats.failedActions++;

                // Send error response
                const response = {
                    type: 'ACTION_RESULT',
                    commandId: command.id,
                    timestamp: Date.now(),
                    success: false,
                    payload: {
                        error: {
                            message: error.message,
                            type: error.constructor.name
                        },
                        executionTime: Date.now() - startTime,
                        elementFound: false
                    }
                };

                this.sendMessage(response, event.origin);
                this.log('Action failed:', error.message);
            }
        }

        async handleHealthCheck(event) {
            const response = {
                type: 'HEALTH_RESPONSE',
                timestamp: Date.now(),
                payload: {
                    status: 'healthy',
                    uptime: Date.now() - this.stats.startTime,
                    stats: this.getStats()
                }
            };

            this.sendMessage(response, event.origin);
        }

        isOriginAllowed(origin) {
            return this.config.allowedOrigins.includes('*') || 
                   this.config.allowedOrigins.includes(origin);
        }

        sendMessage(message, targetOrigin) {
            window.parent.postMessage(message, targetOrigin);
        }

        getStats() {
            return {
                ...this.stats,
                successRate: this.stats.totalCommands > 0 
                    ? this.stats.successfulActions / this.stats.totalCommands 
                    : 0
            };
        }

        disconnect() {
            window.removeEventListener('message', this.handleMessage.bind(this));
            this.log('Helper disconnected');
        }

        log(...args) {
            if (this.config.debug) {
                console.log('[HelperCommunicationManager]', ...args);
            }
        }
    }

    // Auto-initialize if configuration is provided
    if (window.voiceAssistantConfig) {
        VoiceAssistantHelper.initialize(window.voiceAssistantConfig);
    }

    // Expose to global scope
    window.VoiceAssistantHelper = VoiceAssistantHelper;

    // Also create shorter alias
    window.VAHelper = VoiceAssistantHelper;

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = VoiceAssistantHelper;
    }

    // AMD support
    if (typeof define === 'function' && define.amd) {
        define(function() {
            return VoiceAssistantHelper;
        });
    }

    console.log('Voice Assistant Helper Bundle loaded v' + VoiceAssistantHelper.version);

})(typeof window !== 'undefined' ? window : this); 