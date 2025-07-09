// DOM Monitor - Live Monitor Module (Main Orchestrator)
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Main Live Monitor Class
  class LiveMonitor {
    constructor(config = {}) {
      this.config = {
        version: '2.0.0',
        autoStart: config.autoStart !== false, // Keep auto-start for compatibility
        performanceMode: config.performanceMode || 'balanced', // 'performance', 'balanced', 'memory'
        debugMode: config.debugMode !== false, // Enable debug mode by default
        ...config
      }
      
      // Module instances
      this.performanceManager = null
      this.serializer = null
      this.elementCache = null
      this.domObserver = null
      this.communicationBridge = null
      
      // Enhancement modules
      this.scrollDetector = null
      this.mediaDetector = null
      this.hoverDetector = null
      
      // State management
      this.isInitialized = false
      this.isRunning = false
      this.initializationPromise = null
      this.stats = {
        startTime: Date.now(),
        totalRequests: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
      
      // DISABLED AUTO-START to prevent conflicts with external initialization
      // Auto-initialize if enabled
      // if (this.config.autoStart) {
      //   this.initialize()
      // }
    }

    // Initialize all modules
    async initialize() {
      if (this.isInitialized || this.initializationPromise) {
        return this.initializationPromise
      }
      
      this.initializationPromise = this._initializeInternal()
      return this.initializationPromise
    }

    async _initializeInternal() {
      try {
        console.log("🚀 DOM Monitor: Initializing Live Monitor v" + this.config.version)
        
        // Initialize performance-aware configuration
        console.log("🔧 DOM Monitor: Getting performance configuration...")
        const performanceConfig = this.getPerformanceConfig()
        
        // Initialize core modules in dependency order
        console.log("🔧 DOM Monitor: Initializing core modules...")
        await this.initializePerformanceManager(performanceConfig)
        await this.initializeSerializer(performanceConfig)
        await this.initializeElementCache(performanceConfig)
        await this.initializeDOMObserver(performanceConfig)
        await this.initializeCommunicationBridge(performanceConfig)
        
        // Initialize enhancement modules
        console.log("🔧 DOM Monitor: Initializing enhancement modules...")
        await this.initializeEnhancementModules(performanceConfig)
        
        // Wire up dependencies
        console.log("🔧 DOM Monitor: Wiring up dependencies...")
        this.wireUpDependencies()
        
        // Start monitoring
        console.log("🔧 DOM Monitor: Starting monitoring services...")
        await this.startMonitoring()
        
        this.isInitialized = true
        this.isRunning = true
        
        console.log("✅ DOM Monitor: Live Monitor fully initialized and running")
        
        // Broadcast initialization complete
        this.broadcastStatus('initialized')
        
        return {
          success: true,
          version: this.config.version,
          modules: this.getModuleStatus()
        }
        
      } catch (error) {
        console.error("❌ DOM Monitor: Initialization failed:", error)
        
        this.broadcastStatus('initialization_failed', error.message)
        
        throw error
      }
    }

    // Get performance configuration based on mode
    getPerformanceConfig() {
      const baseConfig = {
        maxCacheSize: 500,
        maxScanTime: 16,
        maxMemoryMB: 50,
        throttleDelay: 100,
        priorityElements: 100
      }
      
      switch (this.config.performanceMode) {
        case 'performance':
          return {
            ...baseConfig,
            maxCacheSize: 1000,
            maxScanTime: 32,
            maxMemoryMB: 100,
            throttleDelay: 50,
            priorityElements: 200
          }
          
        case 'memory':
          return {
            ...baseConfig,
            maxCacheSize: 250,
            maxScanTime: 8,
            maxMemoryMB: 25,
            throttleDelay: 200,
            priorityElements: 50
          }
          
        default: // balanced
          return baseConfig
      }
    }

    // Initialize individual modules
    async initializePerformanceManager(config) {
      if (!window.DOMMonitorModules.PerformanceManager) {
        throw new Error('PerformanceManager module not loaded')
      }
      
      this.performanceManager = new window.DOMMonitorModules.PerformanceManager(config)
      console.log("✅ DOM Monitor: Performance Manager initialized")
    }

    async initializeSerializer(config) {
      if (!window.DOMMonitorModules.DOMSerializer) {
        throw new Error('DOMSerializer module not loaded')
      }
      
      this.serializer = new window.DOMMonitorModules.DOMSerializer(config)
      console.log("✅ DOM Monitor: Serializer initialized")
    }

    async initializeElementCache(config) {
      if (!window.DOMMonitorModules.EnhancedElementCache) {
        throw new Error('EnhancedElementCache module not loaded')
      }
      
      this.elementCache = new window.DOMMonitorModules.EnhancedElementCache(config)
      this.elementCache.initialize(this.performanceManager, this.serializer)
      console.log("✅ DOM Monitor: Element Cache initialized")
    }

    async initializeDOMObserver(config) {
      if (!window.DOMMonitorModules.DOMObserver) {
        throw new Error('DOMObserver module not loaded')
      }
      
      this.domObserver = new window.DOMMonitorModules.DOMObserver(config)
      this.domObserver.initialize(this.elementCache, this.performanceManager)
      console.log("✅ DOM Monitor: DOM Observer initialized")
    }

    async initializeCommunicationBridge(config) {
      if (!window.DOMMonitorModules.CommunicationBridge) {
        throw new Error('CommunicationBridge module not loaded')
      }
      
      this.communicationBridge = new window.DOMMonitorModules.CommunicationBridge(config)
      this.communicationBridge.initialize(this.elementCache, this.serializer, this.performanceManager)
      console.log("✅ DOM Monitor: Communication Bridge initialized")
    }

    async initializeEnhancementModules(config) {
      // Initialize scroll detector
      if (window.DOMMonitorModules.ScrollDetector) {
        this.scrollDetector = new window.DOMMonitorModules.ScrollDetector(config)
        this.scrollDetector.initialize(this.elementCache, this.performanceManager)
        console.log("✅ DOM Monitor: Scroll Detector initialized")
      }
      
      // Initialize media detector
      if (window.DOMMonitorModules.MediaDetector) {
        this.mediaDetector = new window.DOMMonitorModules.MediaDetector(config)
        this.mediaDetector.initialize(this.elementCache, this.performanceManager)
        console.log("✅ DOM Monitor: Media Detector initialized")
      }
      
      // Initialize hover detector
      if (window.DOMMonitorModules.HoverDetector) {
        this.hoverDetector = new window.DOMMonitorModules.HoverDetector(config)
        this.hoverDetector.initialize(this.elementCache, this.performanceManager)
        console.log("✅ DOM Monitor: Hover Detector initialized")
      }
    }

    // Wire up module dependencies
    wireUpDependencies() {
      // Set up cross-module communication
      if (this.domObserver && this.elementCache) {
        // DOM Observer already initialized with element cache
      }
      
      if (this.communicationBridge && this.elementCache) {
        // Communication Bridge already initialized with element cache
      }
      
      // Set up performance monitoring
      if (this.performanceManager) {
        this.performanceManager.addMonitoredModule('elementCache', this.elementCache)
        this.performanceManager.addMonitoredModule('domObserver', this.domObserver)
        this.performanceManager.addMonitoredModule('communicationBridge', this.communicationBridge)
      }
    }

    // Start monitoring
    async startMonitoring() {
      try {
        // CRITICAL FIX: Perform initial element scan to populate cache
        console.log("🔍 DOM Monitor: Performing initial element scan...")
        await this.performInitialElementScan()
        
        // Start DOM observation
        if (this.domObserver) {
          this.domObserver.startObserving()
        }
        
        // Start enhancement modules
        if (this.scrollDetector) {
          this.scrollDetector.startDetecting()
        }
        
        if (this.mediaDetector) {
          this.mediaDetector.startDetecting()
        }
        
        if (this.hoverDetector) {
          this.hoverDetector.startDetecting()
        }
        
        // Start periodic cleanup
        this.startPeriodicCleanup()
        
        console.log("✅ DOM Monitor: All monitoring services started")
        
      } catch (error) {
        console.error("❌ DOM Monitor: Failed to start monitoring:", error)
        throw error
      }
    }

    // NEW: Perform initial element scan to populate cache
    async performInitialElementScan() {
      if (!this.elementCache) {
        console.warn("DOM Monitor: Element cache not available for initial scan")
        return
      }

      console.log("🔍 DOM Monitor: Starting initial element scan...")

      const scanOperation = async () => {
        const relevantElements = document.querySelectorAll(
          'button, a, input, select, textarea, form, [role="button"], [tabindex], [onclick], [data-testid], [aria-label], .btn, .button, .clickable'
        )
        
        console.log(`🔍 DOM Monitor: Found ${relevantElements.length} potential elements to scan`)
        
        let addedCount = 0
        let skippedCount = 0
        
        for (const element of relevantElements) {
          try {
            const elementId = await this.elementCache.addElement(element)
            if (elementId) {
              addedCount++
              console.log(`✅ DOM Monitor: Added element ${elementId}: ${element.tagName} - "${element.textContent?.trim().slice(0, 30) || 'no text'}"`)
            } else {
              skippedCount++
              console.warn(`❌ DOM Monitor: Skipped element: ${element.tagName} - "${element.textContent?.trim().slice(0, 30) || 'no text'}" (not relevant or failed visibility check)`)
            }
          } catch (error) {
            console.warn("DOM Monitor: Error adding element during initial scan:", error)
            skippedCount++
          }
        }
        
        console.log(`✅ DOM Monitor: Initial scan complete - Added: ${addedCount}, Skipped: ${skippedCount}`)
        
        return {
          totalScanned: relevantElements.length,
          added: addedCount,
          skipped: skippedCount
        }
      }

      try {
        // Add timeout protection to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Initial scan timeout')), 5000) // 5 second timeout
        })

        let result
        if (this.performanceManager) {
          const budgetPromise = this.performanceManager.executeWithBudget(
            scanOperation,
            200, // Allow up to 200ms for initial scan
            'initialElementScan'
          )
          
          result = await Promise.race([budgetPromise, timeoutPromise])
          
          if (result.success) {
            console.log("✅ DOM Monitor: Initial element scan completed successfully")
            return result.result
          } else if (result.throttled) {
            console.warn("⚠️ DOM Monitor: Initial scan was throttled, will continue in background")
            // Continue anyway, background processing will catch up
          }
        } else {
          console.log("🔍 DOM Monitor: Running scan without performance manager")
          result = await Promise.race([scanOperation(), timeoutPromise])
          return result
        }
      } catch (error) {
        console.error("❌ DOM Monitor: Initial scan failed:", error)
        // Don't throw - allow initialization to continue even if scan fails
        return {
          totalScanned: 0,
          added: 0,
          skipped: 0,
          error: error.message
        }
      }
    }

    // Stop monitoring
    stopMonitoring() {
      try {
        // Stop DOM observation
        if (this.domObserver) {
          this.domObserver.stopObserving()
        }
        
        // Stop enhancement modules
        if (this.scrollDetector) {
          this.scrollDetector.stopDetecting()
        }
        
        if (this.mediaDetector) {
          this.mediaDetector.stopDetecting()
        }
        
        if (this.hoverDetector) {
          this.hoverDetector.stopDetecting()
        }
        
        // Clear periodic cleanup
        this.stopPeriodicCleanup()
        
        this.isRunning = false
        
        console.log("✅ DOM Monitor: All monitoring services stopped")
        
        this.broadcastStatus('stopped')
        
      } catch (error) {
        console.error("❌ DOM Monitor: Error stopping monitoring:", error)
      }
    }

    // Periodic cleanup
    startPeriodicCleanup() {
      this.cleanupInterval = setInterval(() => {
        this.performCleanup()
      }, 30000) // Every 30 seconds
    }

    stopPeriodicCleanup() {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
    }

    async performCleanup() {
      try {
        // Clean up element cache
        if (this.elementCache) {
          const cacheResult = this.elementCache.cleanup()
          if (this.config.debugMode) {
            console.log("DOM Monitor: Cache cleanup:", cacheResult)
          }
        }
        
        // Clean up performance manager
        if (this.performanceManager) {
          this.performanceManager.cleanup()
        }
        
        // Clean up communication bridge
        if (this.communicationBridge) {
          this.communicationBridge.cleanup()
        }
        
        // Update memory usage stats
        this.updateMemoryStats()
        
      } catch (error) {
        console.warn("DOM Monitor: Error during cleanup:", error)
      }
    }

    // Public API methods
    async findElements(intent, options = {}) {
      console.log(`🔍 DOM Monitor: findElements called with intent="${intent}", options=`, options)
      
      if (!this.isInitialized) {
        console.log("🔄 DOM Monitor: Not initialized, initializing now...")
        await this.initialize()
      }
      
      this.stats.totalRequests++
      const startTime = performance.now()
      
      try {
        console.log(`📊 DOM Monitor: Cache status - Total elements: ${this.elementCache?.cache?.size || 0}`)
        
        const result = await this.elementCache.findByIntent(intent, options)
        
        console.log(`🎯 DOM Monitor: Search completed - Found ${result.length} elements`)
        if (result.length > 0) {
          result.forEach((element, index) => {
            console.log(`  ${index + 1}. ${element.elementId}: ${element.element.tagName} - "${element.element.text.slice(0, 30)}" (score: ${element.totalScore})`)
          })
        }
        
        // Update response time stats
        const responseTime = performance.now() - startTime
        this.stats.averageResponseTime = 
          (this.stats.averageResponseTime + responseTime) / 2
        
        return result
        
      } catch (error) {
        console.error("DOM Monitor: Error finding elements:", error)
        throw error
      }
    }

    async getAllElements(filter = {}) {
      if (!this.isInitialized) {
        await this.initialize()
      }
      
      this.stats.totalRequests++
      
      try {
        return this.elementCache.getAllElements(filter)
      } catch (error) {
        console.error("DOM Monitor: Error getting all elements:", error)
        throw error
      }
    }

    async forceRescan() {
      if (!this.isInitialized) {
        await this.initialize()
      }
      
      try {
        // Stop current monitoring
        this.stopMonitoring()
        
        // Clear all caches
        this.elementCache.clear()
        
        // Restart monitoring
        await this.startMonitoring()
        
        console.log("✅ DOM Monitor: Force rescan completed")
        
        return {
          success: true,
          message: 'Force rescan completed',
          stats: this.getStats()
        }
        
      } catch (error) {
        console.error("DOM Monitor: Error during force rescan:", error)
        throw error
      }
    }

    // Statistics and monitoring
    getStats() {
      const stats = {
        version: this.config.version,
        uptime: Date.now() - this.stats.startTime,
        isInitialized: this.isInitialized,
        isRunning: this.isRunning,
        totalRequests: this.stats.totalRequests,
        averageResponseTime: this.stats.averageResponseTime,
        memoryUsage: this.stats.memoryUsage,
        performanceMode: this.config.performanceMode
      }
      
      // Add module stats
      if (this.elementCache) {
        stats.cache = this.elementCache.getStats()
      }
      
      if (this.domObserver) {
        stats.observer = this.domObserver.getStats()
      }
      
      if (this.communicationBridge) {
        stats.communication = this.communicationBridge.getStats()
      }
      
      if (this.performanceManager) {
        stats.performance = this.performanceManager.getStats()
      }
      
      return stats
    }

    getModuleStatus() {
      return {
        performanceManager: !!this.performanceManager,
        serializer: !!this.serializer,
        elementCache: !!this.elementCache,
        domObserver: !!this.domObserver,
        communicationBridge: !!this.communicationBridge,
        scrollDetector: !!this.scrollDetector,
        mediaDetector: !!this.mediaDetector,
        hoverDetector: !!this.hoverDetector
      }
    }

    updateMemoryStats() {
      try {
        let totalMemory = 0
        
        if (this.elementCache) {
          totalMemory += this.elementCache.estimateMemoryUsage()
        }
        
        if (this.domObserver) {
          totalMemory += this.domObserver.estimateMemoryUsage()
        }
        
        if (this.communicationBridge) {
          totalMemory += this.communicationBridge.estimateMemoryUsage()
        }
        
        if (this.performanceManager) {
          totalMemory += this.performanceManager.estimateMemoryUsage()
        }
        
        this.stats.memoryUsage = totalMemory
        
      } catch (error) {
        console.warn("DOM Monitor: Error updating memory stats:", error)
      }
    }

    // Configuration management
    updateConfig(newConfig) {
      try {
        Object.assign(this.config, newConfig)
        
        // Update module configurations
        if (this.elementCache && newConfig.cache) {
          Object.assign(this.elementCache.config, newConfig.cache)
        }
        
        if (this.domObserver && newConfig.observer) {
          Object.assign(this.domObserver.config, newConfig.observer)
        }
        
        if (this.communicationBridge && newConfig.communication) {
          Object.assign(this.communicationBridge.config, newConfig.communication)
        }
        
        if (this.performanceManager && newConfig.performance) {
          Object.assign(this.performanceManager.config, newConfig.performance)
        }
        
        console.log("✅ DOM Monitor: Configuration updated")
        
        this.broadcastStatus('config_updated')
        
        return {
          success: true,
          config: this.config
        }
        
      } catch (error) {
        console.error("DOM Monitor: Error updating configuration:", error)
        throw error
      }
    }

    // NEW: Check if the monitor is ready for use
    isReady() {
      return this.isInitialized && this.isRunning && 
             !!this.elementCache && !!this.performanceManager && 
             !!this.domObserver && !!this.communicationBridge
    }

    // Status broadcasting
    broadcastStatus(status, details = null) {
      if (this.communicationBridge) {
        const message = {
          type: 'status',
          status,
          details,
          timestamp: Date.now(),
          version: this.config.version
        }
        
        this.communicationBridge.broadcastMessage(message)
      }
    }

    // Health check
    async healthCheck() {
      const health = {
        isHealthy: true,
        version: this.config.version,
        uptime: Date.now() - this.stats.startTime,
        status: this.isRunning ? 'running' : 'stopped',
        issues: []
      }
      
      // Check each module
      if (!this.performanceManager) {
        health.issues.push('Performance Manager not initialized')
        health.isHealthy = false
      }
      
      if (!this.elementCache) {
        health.issues.push('Element Cache not initialized')
        health.isHealthy = false
      }
      
      if (!this.domObserver) {
        health.issues.push('DOM Observer not initialized')
        health.isHealthy = false
      }
      
      if (!this.communicationBridge) {
        health.issues.push('Communication Bridge not initialized')
        health.isHealthy = false
      }
      
      // Check performance
      if (this.stats.memoryUsage > 100) { // 100MB threshold
        health.issues.push('High memory usage detected')
        health.isHealthy = false
      }
      
      if (this.stats.averageResponseTime > 1000) { // 1 second threshold
        health.issues.push('High response time detected')
      }
      
      // Get module health
      if (this.communicationBridge) {
        const commHealth = await this.communicationBridge.healthCheck()
        health.modules = {
          communication: commHealth
        }
      }
      
      return health
    }

    // Cleanup and shutdown
    async shutdown() {
      try {
        console.log("🔄 DOM Monitor: Shutting down...")
        
        // Stop monitoring
        this.stopMonitoring()
        
        // Clean up all modules
        if (this.elementCache) {
          this.elementCache.clear()
        }
        
        if (this.communicationBridge) {
          this.communicationBridge.cleanup()
        }
        
        if (this.performanceManager) {
          this.performanceManager.cleanup()
        }
        
        // Reset state
        this.isInitialized = false
        this.isRunning = false
        this.initializationPromise = null
        
        console.log("✅ DOM Monitor: Shutdown complete")
        
        return {
          success: true,
          message: 'Shutdown complete'
        }
        
      } catch (error) {
        console.error("❌ DOM Monitor: Error during shutdown:", error)
        throw error
      }
    }

    // Debugging utilities
    debug() {
      if (!this.config.debugMode) {
        console.log("DOM Monitor: Debug mode not enabled")
        return
      }
      
      console.group("🔍 DOM Monitor Debug Information")
      console.log("Configuration:", this.config)
      console.log("Module Status:", this.getModuleStatus())
      console.log("Statistics:", this.getStats())
      console.log("Health Check:", this.healthCheck())
      console.groupEnd()
    }
  }

  // Export the module
  window.DOMMonitorModules.LiveMonitor = LiveMonitor

  // Create global instance
  window.DOMMonitor = new LiveMonitor()

  console.log("✅ DOM Monitor: Live Monitor module loaded and global instance created")
})() 