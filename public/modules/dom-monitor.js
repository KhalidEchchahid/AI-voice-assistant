// DOM Monitor module for the AI Assistant
;(() => {
  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // DOM Monitor module
  window.AIAssistantModules.domMonitor = {
    // Module state
    monitor: null,
    isInitialized: false,
    
    // Configuration
    config: {
      maxCacheSize: 1000,
      cleanupInterval: 30000,
      throttleDelay: 100,
      visibilityThrottle: 250,
      autoStart: true
    },

    // Initialize the DOM monitor
    async init() {
      if (this.isInitialized) return

      console.log("🔄 DOM Monitor Module: Initializing...")

      try {
        // Wait for the standalone DOM monitor to be available
        await this.waitForDOMMonitor()
        
        // Get reference to the DOM monitor
        this.monitor = window.AIAssistantDOMMonitor
        
        if (!this.monitor) {
          throw new Error("DOM Monitor not available")
        }

        // Setup integration with existing UI module
        this.setupUIIntegration()
        
        // Setup communication with other modules
        this.setupModuleCommunication()

        this.isInitialized = true
        console.log("✅ DOM Monitor Module: Ready")

      } catch (error) {
        console.error("❌ DOM Monitor Module: Initialization failed:", error)
        throw error
      }
    },

    // Wait for the standalone DOM monitor to load
    waitForDOMMonitor() {
      return new Promise((resolve, reject) => {
        let attempts = 0
        const maxAttempts = 50 // 5 seconds max
        
        const checkForMonitor = () => {
          if (window.AIAssistantDOMMonitor && window.AIAssistantDOMMonitor.isReady()) {
            resolve()
          } else if (attempts >= maxAttempts) {
            reject(new Error("DOM Monitor failed to load within timeout"))
          } else {
            attempts++
            setTimeout(checkForMonitor, 100)
          }
        }
        
        checkForMonitor()
      })
    },

    // Setup integration with UI module
    setupUIIntegration() {
      const uiModule = window.AIAssistantModules.ui
      if (!uiModule) return

      // Enhance the existing message handling
      const originalSetupMessageHandling = uiModule.setupMessageHandling
      if (originalSetupMessageHandling) {
        uiModule.setupMessageHandling = () => {
          originalSetupMessageHandling.call(uiModule)
          this.setupEnhancedMessageHandling()
        }
      }
    },

    // Setup enhanced message handling that includes DOM monitoring
    setupEnhancedMessageHandling() {
      window.addEventListener("message", (event) => {
        const config = window.AIAssistantModules.config?.current
        if (!config) return

        try {
          const expectedOrigin = new URL(config.iframeUrl).origin
          if (event.origin !== expectedOrigin) return

          const iframe = window.AIAssistantModules.ui?.elements?.iframe
          if (!iframe || event.source !== iframe.contentWindow) return

          const command = event.data
          
          // Handle DOM monitor specific commands
          if (command && command.action && command.action.startsWith('dom_monitor_')) {
            this.handleDOMMonitorCommand(command)
          }
        } catch (e) {
          console.error("DOM Monitor Module: Message handling error:", e)
        }
      })
    },

    // Handle DOM monitor specific commands
    async handleDOMMonitorCommand(command) {
      if (!this.monitor) return

      try {
        switch (command.action) {
          case 'dom_monitor_find_elements':
            const elements = await this.findElements(command.intent, command.options)
            this.sendResponse(command.requestId, elements)
            break

          case 'dom_monitor_get_stats':
            const stats = this.monitor.getStats()
            this.sendResponse(command.requestId, stats)
            break

          case 'dom_monitor_get_all_elements':
            const allElements = this.monitor.getAllElements(command.filter)
            this.sendResponse(command.requestId, allElements)
            break

          case 'dom_monitor_refresh':
            const refreshResult = this.monitor.refresh()
            this.sendResponse(command.requestId, refreshResult)
            break

          default:
            console.warn("DOM Monitor Module: Unknown command:", command.action)
        }
      } catch (error) {
        this.sendError(command.requestId, error.message)
      }
    },

    // Enhanced element finding that combines DOM monitor with existing helper
    async findElements(intent, options = {}) {
      if (!this.monitor) {
        throw new Error("DOM Monitor not initialized")
      }

      // Use DOM monitor for real-time element discovery
      const liveElements = this.monitor.findElements(intent, options)
      
      // Enhance with existing helper's validation
      const helper = window.AIAssistantHelper
      const validatedElements = []
      
      for (const elementMatch of liveElements) {
        const element = elementMatch.element?.element
        if (!element) continue

        // Use helper's element validation
        try {
          const rect = element.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            validatedElements.push({
              ...elementMatch,
              helperValidated: true,
              boundingRect: rect
            })
          }
        } catch (e) {
          // Element not accessible
          continue
        }
      }

      return {
        success: true,
        elements: validatedElements,
        total: validatedElements.length,
        source: 'dom_monitor_enhanced',
        timestamp: Date.now()
      }
    },

    // Send response back to iframe
    sendResponse(requestId, data) {
      const uiModule = window.AIAssistantModules.ui
      if (uiModule && uiModule.sendMessageToIframe) {
        uiModule.sendMessageToIframe({
          action: 'dom_monitor_response',
          requestId: requestId,
          data: data,
          success: true
        })
      }
    },

    // Send error response
    sendError(requestId, error) {
      const uiModule = window.AIAssistantModules.ui
      if (uiModule && uiModule.sendMessageToIframe) {
        uiModule.sendMessageToIframe({
          action: 'dom_monitor_response',
          requestId: requestId,
          error: error,
          success: false
        })
      }
    },

    // Setup communication with other modules
    setupModuleCommunication() {
      // Enhance the events module if available
      const eventsModule = window.AIAssistantModules.events
      if (eventsModule) {
        this.enhanceEventsModule(eventsModule)
      }

      // Enhance the API module if available
      const apiModule = window.AIAssistantModules.api
      if (apiModule) {
        this.enhanceAPIModule(apiModule)
      }
    },

    // Enhance events module with DOM monitoring capabilities
    enhanceEventsModule(eventsModule) {
      // Store original message handling
      const originalSetupMessageHandling = eventsModule.setupMessageHandling
      
      if (originalSetupMessageHandling) {
        eventsModule.setupMessageHandling = () => {
          originalSetupMessageHandling.call(eventsModule)
          
          // Add DOM monitor message handling
          eventsModule.onMessage = eventsModule.onMessage || this.onMessage.bind(this)
        }
      }
    },

    // Enhance API module with DOM monitoring methods
    enhanceAPIModule(apiModule) {
      if (apiModule.init) {
        const originalInit = apiModule.init
        apiModule.init = () => {
          originalInit.call(apiModule)
          
          // Add DOM monitor methods to public API
          if (window.AIAssistant) {
            window.AIAssistant.domMonitor = {
              findElements: this.findElements.bind(this),
              getStats: () => this.monitor?.getStats(),
              getAllElements: (filter) => this.monitor?.getAllElements(filter),
              refresh: () => this.monitor?.refresh(),
              isReady: () => this.isInitialized && this.monitor?.isReady()
            }
          }
        }
      }
    },

    // Message handler for DOM monitor events
    onMessage(type, payload) {
      if (type.startsWith('dom_monitor_')) {
        return this.handleDOMMonitorCommand({ action: type, ...payload })
      }
    },

    // Get DOM monitor status
    getStatus() {
      return {
        initialized: this.isInitialized,
        monitorReady: this.monitor?.isReady() || false,
        stats: this.monitor?.getStats() || null,
        version: this.monitor?.version || 'unknown'
      }
    },

    // Update configuration
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig }
    },

    // Public API methods
    getPublicAPI() {
      return {
        findElements: this.findElements.bind(this),
        getStats: () => this.monitor?.getStats(),
        getAllElements: (filter) => this.monitor?.getAllElements(filter),
        refresh: () => this.monitor?.refresh(),
        getStatus: this.getStatus.bind(this),
        isReady: () => this.isInitialized && this.monitor?.isReady()
      }
    }
  }
})() 