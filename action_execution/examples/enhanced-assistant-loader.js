;(() => {
  // --- Configuration (keeping your existing system) ---
  const DEFAULT_CONFIG = {
    // Assistant iframe URL
    iframeUrl: "https://ai-voice-assistant-nu.vercel.app/",

    // Initial state
    initiallyVisible: false,

    // Appearance (keeping all your existing theming)
    theme: "gradient",
    primaryColor: "#4776E6", 
    secondaryColor: "#8E54E9",
    customColor: "#3366FF",
    iconStyle: "microphone",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: "1px",
    borderRadius: "16px",

    // Position and size
    position: "right",
    width: "400px", 
    height: "600px",

    // Features
    draggableIcon: true,
    keyboardShortcut: "a",
    showHeader: false,
    showCloseButton: false,
    showMinimizeButton: false,
    rememberPosition: true,

    // Animation
    animationStyle: "slide-up",
    animationDuration: "0.5s",

    // Mobile settings
    mobileFullscreen: true,
    mobileBreakpoint: "768px",

    // NEW: Phase 2 Integration Settings
    enableActionExecution: true,
    helperConfig: {
      allowedOrigins: ['https://ai-voice-assistant-nu.vercel.app'],
      debug: false,
      autoAcknowledge: true,
      actionTimeout: 10000
    }
  }

  // --- Element IDs (keeping your system) ---
  const ELEMENT_IDS = {
    iframe: "ai-voice-assistant-iframe-instance",
    containerAttribute: "data-assistant-container-id", 
    defaultContainer: "ai-assistant-widget-default-container",
    toggleButton: "ai-assistant-toggle-button",
    header: "ai-assistant-header",
    controls: "ai-assistant-controls",
    styleElement: "ai-assistant-styles",
  }

  // --- State variables (enhanced) ---
  let config = { ...DEFAULT_CONFIG }
  const elements = {
    container: null,
    iframe: null,
    toggleButton: null,
  }
  const state = {
    isVisible: false,
    isMinimized: false,
    isDragging: false,
    dragOffset: null,
    dragStartTime: 0,
    lastPosition: null,
    // NEW: Helper state
    helperInitialized: false,
    actionExecutionReady: false
  }

  // NEW: Phase 2 Helper Components
  let helperCommunicationManager = null;
  let elementFinder = null;
  let actionExecutor = null;

  // =============================================================================
  // PHASE 2 INTEGRATION - Helper Script Components
  // =============================================================================

  class HelperCommunicationManager {
    constructor(config) {
      this.config = config;
      this.actionHandlers = new Map();
      this.stats = {
        totalCommandsReceived: 0,
        successfulActions: 0,
        failedActions: 0
      };
      this.setupMessageListener();
      this.setupDefaultActionHandlers();
    }

    setupMessageListener() {
      window.addEventListener('message', async (event) => {
        if (!this.config.allowedOrigins.includes(event.origin)) {
          if (this.config.debug) {
            console.log('Rejected message from:', event.origin);
          }
          return;
        }

        const message = event.data;
        if (message && message.type) {
          await this.handleMessage(event);
        }
      });
    }

    async handleMessage(event) {
      const message = event.data;
      this.stats.totalCommandsReceived++;

      try {
        if (message.type === 'ACTION_EXECUTE' || message.type === 'ACTION_COMMAND') {
          await this.handleActionCommand(event);
        } else if (message.type === 'HEALTH_CHECK') {
          await this.handleHealthCheck(event);
        }
      } catch (error) {
        this.stats.failedActions++;
        this.sendErrorResponse(message.id, error);
      }
    }

    async handleActionCommand(event) {
      const message = event.data;
      const { action, target, data = {}, options = {} } = message.payload;

      try {
        // Find the element
        const element = await elementFinder.findElement(target);
        if (!element) {
          throw new Error(`Element not found: ${JSON.stringify(target)}`);
        }

        // Execute the action
        const result = await actionExecutor.executeAction(action, element, { ...data, ...options });
        
        if (result.success) {
          this.stats.successfulActions++;
        } else {
          this.stats.failedActions++;
        }

        // Send response
        this.sendMessage({
          id: this.generateId(),
          type: 'ACTION_RESULT',
          commandId: message.id,
          success: result.success,
          payload: {
            executedAction: action,
            elementFound: true,
            elementDetails: this.getElementDetails(element),
            ...result
          }
        }, event.origin);

      } catch (error) {
        this.stats.failedActions++;
        this.sendMessage({
          id: this.generateId(),
          type: 'ACTION_RESULT', 
          commandId: message.id,
          success: false,
          payload: {
            executedAction: action,
            elementFound: false,
            error: {
              message: error.message,
              type: error.constructor.name,
              timestamp: Date.now()
            }
          }
        }, event.origin);
      }
    }

    async handleHealthCheck(event) {
      this.sendMessage({
        id: this.generateId(),
        type: 'HEALTH_RESPONSE',
        payload: {
          status: 'healthy',
          version: '2.0.0',
          capabilities: ['click', 'type', 'scroll', 'hover', 'submit'],
          performance: { executionTime: 0 },
          stats: this.stats
        }
      }, event.origin);
    }

    setupDefaultActionHandlers() {
      // These integrate with your existing widget functionality
      this.addActionHandler('closeAssistant', () => {
        if (typeof toggleVisibility === 'function') {
          toggleVisibility();
        }
        return { success: true, message: 'Assistant closed' };
      });

      this.addActionHandler('getPageTitle', () => {
        return { success: true, message: document.title, data: { title: document.title } };
      });
    }

    addActionHandler(actionType, handler) {
      this.actionHandlers.set(actionType, handler);
    }

    getElementDetails(element) {
      return {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        textContent: element.textContent?.slice(0, 100),
        isVisible: this.isElementVisible(element),
        isClickable: this.isElementClickable(element),
        boundingRect: element.getBoundingClientRect()
      };
    }

    isElementVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && 
             style.visibility !== 'hidden' && 
             style.display !== 'none' &&
             style.opacity !== '0';
    }

    isElementClickable(element) {
      return this.isElementVisible(element) && 
             !element.disabled &&
             window.getComputedStyle(element).pointerEvents !== 'none';
    }

    sendMessage(message, targetOrigin) {
      window.parent.postMessage(message, targetOrigin);
    }

    sendErrorResponse(commandId, error) {
      this.sendMessage({
        id: this.generateId(),
        type: 'ERROR',
        payload: {
          error: {
            message: error.message,
            type: error.constructor.name,
            timestamp: Date.now()
          },
          originalMessageId: commandId,
          recoverable: true
        }
      }, '*');
    }

    generateId() {
      return `helper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  class ElementFinder {
    constructor(config = {}) {
      this.config = {
        timeout: 5000,
        retryAttempts: 3,
        debug: false,
        ...config
      };
    }

    async findElement(target) {
      if (typeof target === 'string') {
        // Simple selector string
        return document.querySelector(target);
      }

      if (target.strategy) {
        return await this.findWithStrategy(target);
      }

      if (target.primary) {
        // ElementSelector format
        return await this.findWithElementSelector(target);
      }

      return null;
    }

    async findWithStrategy(target) {
      const { strategy, value, options = {} } = target;

      switch (strategy) {
        case 'css':
          return document.querySelector(value);
        
        case 'xpath':
          const result = document.evaluate(value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return result.singleNodeValue;
        
        case 'text':
          return this.findByText(value, options.partial, options.caseSensitive);
        
        case 'attribute':
          return this.findByAttribute(value, target.attribute);
        
        case 'position':
          return this.findByPosition(target.coordinates?.x, target.coordinates?.y);
        
        case 'smart':
          return this.smartFind(value);
        
        default:
          return document.querySelector(value);
      }
    }

    async findWithElementSelector(selector) {
      // Try primary strategy first
      let element = await this.findWithStrategy(selector.primary);
      if (element) return element;

      // Try fallbacks
      for (const fallback of selector.fallbacks || []) {
        element = await this.findWithStrategy(fallback);
        if (element) return element;
      }

      return null;
    }

    findByText(text, partial = true, caseSensitive = false) {
      const searchText = caseSensitive ? text : text.toLowerCase();
      const elements = document.querySelectorAll('*');
      
      for (const element of elements) {
        if (element.children.length === 0) { // Only leaf nodes
          const elementText = caseSensitive ? element.textContent : element.textContent.toLowerCase();
          if (partial ? elementText.includes(searchText) : elementText.trim() === searchText) {
            return element;
          }
        }
      }
      return null;
    }

    findByAttribute(value, attribute = 'data-testid') {
      return document.querySelector(`[${attribute}="${value}"]`);
    }

    findByPosition(x, y) {
      return document.elementFromPoint(x, y);
    }

    smartFind(description) {
      // Simple smart finding - look for common patterns
      const desc = description.toLowerCase();
      
      if (desc.includes('button')) {
        const buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
        for (const btn of buttons) {
          if (btn.textContent.toLowerCase().includes(desc.replace('button', '').trim())) {
            return btn;
          }
        }
      }
      
      if (desc.includes('input') || desc.includes('field')) {
        return document.querySelector('input[type="text"], input[type="email"], input[type="password"], textarea');
      }
      
      if (desc.includes('link')) {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          if (link.textContent.toLowerCase().includes(desc.replace('link', '').trim())) {
            return link;
          }
        }
      }

      // Fallback to text search
      return this.findByText(desc, true, false);
    }
  }

  class ActionExecutor {
    constructor(config = {}) {
      this.config = {
        timeout: 5000,
        debug: false,
        clickDelay: 100,
        typeDelay: 50,
        ...config
      };
    }

    async executeAction(action, element, options = {}) {
      const startTime = Date.now();
      
      try {
        await this.scrollIntoView(element);
        await this.sleep(this.config.clickDelay);

        let result;
        switch (action) {
          case 'click':
            result = await this.click(element, options);
            break;
          case 'type':
            result = await this.type(element, options.text || options.value, options);
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
          case 'select':
            result = await this.select(element, options.value);
            break;
          case 'check':
          case 'uncheck':
            result = await this.toggleCheckbox(element, action === 'check');
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }

        return {
          success: true,
          message: `${action} completed successfully`,
          timing: {
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime
          },
          ...result
        };

      } catch (error) {
        return {
          success: false,
          message: error.message,
          timing: {
            startTime,
            endTime: Date.now(), 
            duration: Date.now() - startTime
          },
          error: {
            type: error.constructor.name,
            message: error.message
          }
        };
      }
    }

    async click(element, options = {}) {
      if (options.coordinates) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + (options.coordinates.x || rect.width / 2);
        const y = rect.top + (options.coordinates.y || rect.height / 2);
        
        element.dispatchEvent(new MouseEvent('click', {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true
        }));
      } else {
        element.click();
      }
      return { action: 'click' };
    }

    async type(element, text, options = {}) {
      if (options.clearFirst) {
        await this.clear(element);
      }

      element.focus();
      
      if (element.value !== undefined) {
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        element.textContent = text;
      }

      if (options.pressEnter) {
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      return { action: 'type', text };
    }

    async clear(element) {
      element.focus();
      if (element.value !== undefined) {
        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        element.textContent = '';
      }
      return { action: 'clear' };
    }

    async scroll(element, options = {}) {
      const direction = options.direction || 'down';
      const amount = options.distance || 100;
      
      if (direction === 'down') {
        window.scrollBy(0, amount);
      } else if (direction === 'up') {
        window.scrollBy(0, -amount);
      } else if (direction === 'left') {
        window.scrollBy(-amount, 0);
      } else if (direction === 'right') {
        window.scrollBy(amount, 0);
      }
      
      return { action: 'scroll', direction, amount };
    }

    async hover(element) {
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      return { action: 'hover' };
    }

    async submit(element) {
      const form = element.tagName === 'FORM' ? element : element.closest('form');
      if (form) {
        form.submit();
        return { action: 'submit', form: true };
      } else {
        element.click();
        return { action: 'submit', form: false };
      }
    }

    async select(element, value) {
      if (element.tagName === 'SELECT') {
        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return { action: 'select', value };
      }
      throw new Error('Element is not a select element');
    }

    async toggleCheckbox(element, checked) {
      if (element.type === 'checkbox') {
        element.checked = checked;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return { action: checked ? 'check' : 'uncheck', checked };
      }
      throw new Error('Element is not a checkbox');
    }

    async scrollIntoView(element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.sleep(200);
    }

    async sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // =============================================================================
  // ENHANCED MESSAGE HANDLING (replaces your basic handleMessage)
  // =============================================================================

  function setupEnhancedMessageHandling() {
    window.addEventListener("message", (event) => {
      let expectedOrigin
      try {
        expectedOrigin = new URL(config.iframeUrl).origin
      } catch (e) {
        console.error("AI Assistant: Invalid iframeUrl for origin check", e)
        return
      }

      if (event.origin !== expectedOrigin) return
      if (!elements.iframe || event.source !== elements.iframe.contentWindow) return

      const command = event.data
      console.log("AI Assistant: Received command from assistant iframe:", command)

      // NEW: Enhanced command handling with Phase 2 integration
      if (command && command.action) {
        handleEnhancedCommand(command, expectedOrigin);
      }
    })
  }

  async function handleEnhancedCommand(command, expectedOrigin) {
    try {
      switch (command.action) {
        case "clickElement":
          if (command.selector) {
            const element = await elementFinder.findElement(command.selector);
            if (element) {
              await actionExecutor.executeAction('click', element);
              sendResponseToWidget({ 
                action: "actionComplete", 
                success: true, 
                requestId: command.requestId 
              }, expectedOrigin);
            }
          }
          break;

        case "setInputValue":
          if (command.selector && command.value) {
            const element = await elementFinder.findElement(command.selector);
            if (element) {
              await actionExecutor.executeAction('type', element, { text: command.value });
              sendResponseToWidget({ 
                action: "actionComplete", 
                success: true, 
                requestId: command.requestId 
              }, expectedOrigin);
            }
          }
          break;

        case "getPageTitle":
          sendResponseToWidget({
            action: "pageTitleResponse",
            title: document.title,
            requestId: command.requestId,
          }, expectedOrigin);
          break;

        case "closeAssistant":
          toggleVisibility();
          break;

        // NEW: Direct action execution from voice commands
        case "executeVoiceAction":
          if (command.actionType && command.target) {
            const element = await elementFinder.findElement(command.target);
            if (element) {
              const result = await actionExecutor.executeAction(command.actionType, element, command.options);
              sendResponseToWidget({
                action: "voiceActionComplete",
                success: result.success,
                message: result.message,
                requestId: command.requestId
              }, expectedOrigin);
            }
          }
          break;

        default:
          console.warn("AI Assistant: Unknown action:", command.action)
      }
    } catch (error) {
      console.error("AI Assistant: Command execution failed:", error);
      sendResponseToWidget({
        action: "actionError",
        error: error.message,
        requestId: command.requestId
      }, expectedOrigin);
    }
  }

  function sendResponseToWidget(response, targetOrigin) {
    if (elements.iframe && elements.iframe.contentWindow) {
      elements.iframe.contentWindow.postMessage(response, targetOrigin);
    }
  }

  // =============================================================================
  // INITIALIZATION (enhanced)
  // =============================================================================

  function initializePhase2Components() {
    if (!config.enableActionExecution) {
      console.log("AI Assistant: Phase 2 action execution disabled");
      return;
    }

    try {
      // Initialize helper components
      helperCommunicationManager = new HelperCommunicationManager(config.helperConfig);
      elementFinder = new ElementFinder({ debug: config.helperConfig.debug });
      actionExecutor = new ActionExecutor({ debug: config.helperConfig.debug });

      state.helperInitialized = true;
      state.actionExecutionReady = true;

      console.log("AI Assistant: Phase 2 components initialized successfully");
      
      // Announce readiness to the widget
      if (elements.iframe && elements.iframe.contentWindow) {
        elements.iframe.contentWindow.postMessage({
          action: "helperReady",
          capabilities: ['click', 'type', 'scroll', 'hover', 'submit', 'select', 'check'],
          version: "2.0.0"
        }, new URL(config.iframeUrl).origin);
      }

    } catch (error) {
      console.error("AI Assistant: Failed to initialize Phase 2 components:", error);
      state.actionExecutionReady = false;
    }
  }

  // =============================================================================
  // ORIGINAL FUNCTIONS (keeping all your existing functionality)
  // =============================================================================

  function readConfigFromAttributes(scriptElement) {
    if (!scriptElement) return config

    console.log("AI Assistant: Reading configuration from attributes")

    for (const attr of scriptElement.attributes) {
      if (attr.name.startsWith("data-")) {
        const configKey = attr.name.replace("data-", "").replace(/-([a-z])/g, (g) => g[1].toUpperCase())

        if (configKey in config) {
          if (attr.value === "true") config[configKey] = true
          else if (attr.value === "false") config[configKey] = false
          else config[configKey] = attr.value

          console.log(`AI Assistant: Set ${configKey} = ${config[configKey]}`)
        }
      }
    }

    if (config.rememberPosition && localStorage.getItem("ai-assistant-position")) {
      try {
        state.lastPosition = JSON.parse(localStorage.getItem("ai-assistant-position"))
      } catch (e) {
        console.error("AI Assistant: Failed to parse saved position", e)
      }
    }

    state.isVisible = config.initiallyVisible
    return config
  }

  // [Keep all your existing functions: generateStyles, injectStyles, createAssistant, 
  //  createToggleButton, toggleVisibility, positionAssistantNearButton, toggleMinimize,
  //  getAssistantIcon, drag functions, setupKeyboardShortcut...]

  // =============================================================================
  // ENHANCED INITIALIZATION (replaces your initAssistant)
  // =============================================================================

  function initAssistant(scriptElement) {
    // Read configuration
    readConfigFromAttributes(scriptElement)

    // Inject styles
    injectStyles()

    // Create UI elements
    createAssistant()
    createToggleButton()

    // Setup event handlers
    setupEnhancedMessageHandling() // Enhanced version
    setupKeyboardShortcut()

    // NEW: Initialize Phase 2 components
    initializePhase2Components()

    // Expose enhanced API
    window.AIAssistant = {
      toggle: toggleVisibility,
      minimize: toggleMinimize,
      show: () => {
        if (!state.isVisible) toggleVisibility()
      },
      hide: () => {
        if (state.isVisible) toggleVisibility()
      },
      updateConfig: (newConfig) => {
        config = { ...config, ...newConfig }
        injectStyles()
      },
      // NEW: Phase 2 APIs
      executeAction: async (action, target, options) => {
        if (!state.actionExecutionReady) {
          throw new Error("Action execution not ready");
        }
        const element = await elementFinder.findElement(target);
        if (!element) {
          throw new Error("Element not found");
        }
        return await actionExecutor.executeAction(action, element, options);
      },
      findElement: async (target) => {
        if (!state.actionExecutionReady) return null;
        return await elementFinder.findElement(target);
      },
      getHelperStats: () => {
        return helperCommunicationManager ? helperCommunicationManager.stats : null;
      },
      isActionExecutionReady: () => state.actionExecutionReady
    }

    console.log("AI Assistant: Enhanced initialization complete with Phase 2 integration")
  }

  // Initialize when DOM is ready (keeping your existing pattern)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAssistant(document.currentScript))
  } else {
    initAssistant(document.currentScript)
  }

  // [Include all your other existing functions here - generateStyles, injectStyles, 
  //  createAssistant, createToggleButton, toggleVisibility, etc.]
  
})() 