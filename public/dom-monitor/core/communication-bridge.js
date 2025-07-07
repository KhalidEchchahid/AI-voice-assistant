// DOM Monitor - Communication Bridge Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Communication Bridge Class
  class CommunicationBridge {
    constructor(config = {}) {
      this.config = {
        maxResponseTime: config.maxResponseTime || 5000,
        maxMessageSize: config.maxMessageSize || 1024 * 1024, // 1MB
        retryAttempts: config.retryAttempts || 3,
        retryDelay: config.retryDelay || 1000,
        ...config
      }
      
      // Dependencies
      this.elementCache = null
      this.serializer = null
      this.performanceManager = null
      
      // Message handling
      this.messageHandlers = new Map()
      this.pendingRequests = new Map()
      this.messageQueue = []
      this.isProcessing = false
      
      // Statistics
      this.stats = {
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        messagesSent: 0,
        messagesReceived: 0,
        lastMessageTime: 0
      }
      
      // Security - Dynamic origin detection
      this.allowedOrigins = new Set([
        'http://localhost:3000',
        'http://localhost:8000',
        'https://localhost:3000',
        'https://localhost:8000'
      ])
      
      // Add current origin automatically
      if (window.location.origin) {
        this.allowedOrigins.add(window.location.origin)
      }
      
      // Add common development ports
      const currentHost = window.location.hostname
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        const commonPorts = [3000, 3001, 3002, 8000, 8001, 8080, 5000]
        commonPorts.forEach(port => {
          this.allowedOrigins.add(`http://${currentHost}:${port}`)
          this.allowedOrigins.add(`https://${currentHost}:${port}`)
        })
      }
      
      this.setupMessageHandlers()
    }

    // Initialize with dependencies
    initialize(elementCache, serializer, performanceManager) {
      this.elementCache = elementCache
      this.serializer = serializer
      this.performanceManager = performanceManager
      
      // Auto-start listening after initialization
      this.startListening()
      
      console.log("✅ DOM Monitor: Communication Bridge initialized")
    }

    // Setup message handlers
    setupMessageHandlers() {
      this.messageHandlers.set('findElements', this.handleFindElements.bind(this))
      this.messageHandlers.set('getAllElements', this.handleGetAllElements.bind(this))
      this.messageHandlers.set('getStats', this.handleGetStats.bind(this))
      this.messageHandlers.set('ping', this.handlePing.bind(this))
      this.messageHandlers.set('forceRescan', this.handleForceRescan.bind(this))
      this.messageHandlers.set('cleanup', this.handleCleanup.bind(this))
      this.messageHandlers.set('updateConfig', this.handleUpdateConfig.bind(this))
    }

    // Start listening for messages
    startListening() {
      window.addEventListener('message', this.handleMessage.bind(this), false)
      console.log("✅ DOM Monitor: Communication Bridge listening for messages")
    }

    // Handle incoming messages
    async handleMessage(event) {
      const startTime = performance.now()
      
      try {
        // Security validation
        if (!this.validateMessageSecurity(event)) {
          console.warn('DOM Monitor: Invalid message origin or format', event.origin)
          return
        }
        
        const { type, data, requestId } = event.data
        
        // Update statistics
        this.stats.messagesReceived++
        this.stats.totalMessages++
        this.stats.lastMessageTime = Date.now()
        
        // Get handler
        const handler = this.messageHandlers.get(type)
        if (!handler) {
          await this.sendErrorResponse(requestId, `Unknown message type: ${type}`)
          return
        }
        
        // Process message with performance budgeting
        const processingOperation = async () => {
          return handler(data, requestId)
        }
        
        if (this.performanceManager) {
          const result = await this.performanceManager.executeWithBudget(
            processingOperation,
            100, // Max 100ms for message processing
            'handleMessage'
          )
          
          if (result.throttled) {
            await this.sendErrorResponse(requestId, 'Message processing throttled due to performance limits')
            return
          }
        } else {
          await processingOperation()
        }
        
        // Update response time statistics
        const responseTime = performance.now() - startTime
        this.stats.totalResponseTime += responseTime
        this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.totalMessages
        
      } catch (error) {
        console.error('DOM Monitor: Error handling message:', error)
        this.stats.failedMessages++
        
        if (event.data?.requestId) {
          await this.sendErrorResponse(event.data.requestId, error.message)
        }
      }
    }

    // Validate message security
    validateMessageSecurity(event) {
      // Check origin
      if (!this.allowedOrigins.has(event.origin)) {
        // In development, be more lenient
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          const url = new URL(event.origin)
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            return true
          }
        }
        return false
      }
      
      // Check message format
      if (!event.data || typeof event.data !== 'object') {
        return false
      }
      
      // Check required fields
      if (!event.data.type || !event.data.requestId) {
        return false
      }
      
      return true
    }

    // Message Handlers
    async handleFindElements(data, requestId) {
      try {
        const { intent, options = {} } = data
        
        if (!intent || typeof intent !== 'string') {
          await this.sendErrorResponse(requestId, 'Invalid intent parameter')
          return
        }
        
        const elements = await this.elementCache.findByIntent(intent, options)
        const response = {
          success: true,
          elements,
          total: elements.length,
          intent,
          options
        }
        
        await this.sendResponse(requestId, response)
        
      } catch (error) {
        await this.sendErrorResponse(requestId, error.message)
      }
    }

    async handleGetAllElements(data, requestId) {
      try {
        const { filter = {} } = data
        const elements = this.elementCache.getAllElements(filter)
        
        const response = {
          success: true,
          elements,
          total: elements.length,
          filter
        }
        
        await this.sendResponse(requestId, response)
        
      } catch (error) {
        await this.sendErrorResponse(requestId, error.message)
      }
    }

    async handleGetStats(data, requestId) {
      try {
        const cacheStats = this.elementCache.getStats()
        const bridgeStats = this.getStats()
        
        const response = {
          success: true,
          stats: {
            cache: cacheStats,
            communication: bridgeStats,
            performance: this.performanceManager?.getStats() || {},
            timestamp: Date.now()
          }
        }
        
        await this.sendResponse(requestId, response)
        
      } catch (error) {
        await this.sendErrorResponse(requestId, error.message)
      }
    }

    async handlePing(data, requestId) {
      try {
        const response = {
          success: true,
          message: 'pong',
          timestamp: Date.now(),
          version: '2.0.0'
        }
        
        await this.sendResponse(requestId, response)
        
      } catch (error) {
        await this.sendErrorResponse(requestId, error.message)
      }
    }

    async handleForceRescan(data, requestId) {
      try {
        // Clear cache and force rescan
        this.elementCache.clear()
        
        // Re-scan DOM
        const elements = document.querySelectorAll(
          'button, a, input, select, textarea, form, [role="button"], [tabindex], [onclick], [data-testid]'
        )
        
        let addedCount = 0
        for (const element of elements) {
          const elementId = await this.elementCache.addElement(element)
          if (elementId) {
            addedCount++
          }
        }
        
        const response = {
          success: true,
          message: 'DOM rescanned successfully',
          elementsAdded: addedCount,
          totalElements: this.elementCache.getStats().totalElements
        }
        
        await this.sendResponse(requestId, response)
        
      } catch (error) {
        await this.sendErrorResponse(requestId, error.message)
      }
    }

    async handleCleanup(data, requestId) {
      try {
        const cleanupResult = this.elementCache.cleanup()
        
        const response = {
          success: true,
          message: 'Cleanup completed',
          ...cleanupResult
        }
        
        await this.sendResponse(requestId, response)
        
      } catch (error) {
        await this.sendErrorResponse(requestId, error.message)
      }
    }

    async handleUpdateConfig(data, requestId) {
      try {
        const { config } = data
        
        if (!config || typeof config !== 'object') {
          await this.sendErrorResponse(requestId, 'Invalid config parameter')
          return
        }
        
        // Update configuration
        Object.assign(this.config, config)
        
        // Update allowed origins if provided
        if (config.allowedOrigins && Array.isArray(config.allowedOrigins)) {
          this.allowedOrigins.clear()
          config.allowedOrigins.forEach(origin => {
            this.allowedOrigins.add(origin)
          })
        }
        
        const response = {
          success: true,
          message: 'Configuration updated',
          config: this.config
        }
        
        await this.sendResponse(requestId, response)
        
      } catch (error) {
        await this.sendErrorResponse(requestId, error.message)
      }
    }

    // Response sending
    async sendResponse(requestId, data) {
      try {
        const serializedData = this.serializer ? 
          this.serializer.serializeResponse(data) : 
          data
        
        const message = {
          type: 'response',
          requestId,
          data: serializedData,
          timestamp: Date.now()
        }
        
        // Check message size
        const messageSize = JSON.stringify(message).length
        if (messageSize > this.config.maxMessageSize) {
          await this.sendErrorResponse(requestId, 'Response too large')
          return
        }
        
        // Send to all allowed origins
        for (const origin of this.allowedOrigins) {
          try {
            window.parent.postMessage(message, origin)
          } catch (error) {
            console.warn('DOM Monitor: Failed to send to origin:', origin, error)
          }
        }
        
        this.stats.messagesSent++
        this.stats.successfulMessages++
        
      } catch (error) {
        console.error('DOM Monitor: Error sending response:', error)
        this.stats.failedMessages++
        throw error
      }
    }

    async sendErrorResponse(requestId, errorMessage) {
      const message = {
        type: 'error',
        requestId,
        error: errorMessage,
        timestamp: Date.now()
      }
      
      try {
        for (const origin of this.allowedOrigins) {
          try {
            window.parent.postMessage(message, origin)
          } catch (error) {
            console.warn('DOM Monitor: Failed to send error to origin:', origin, error)
          }
        }
        
        this.stats.messagesSent++
        this.stats.failedMessages++
        
      } catch (error) {
        console.error('DOM Monitor: Error sending error response:', error)
      }
    }

    // Batch processing for multiple requests
    async processBatch(requests) {
      const results = []
      
      for (const request of requests) {
        try {
          const handler = this.messageHandlers.get(request.type)
          if (handler) {
            const result = await handler(request.data, request.requestId)
            results.push({
              requestId: request.requestId,
              success: true,
              data: result
            })
          } else {
            results.push({
              requestId: request.requestId,
              success: false,
              error: `Unknown message type: ${request.type}`
            })
          }
        } catch (error) {
          results.push({
            requestId: request.requestId,
            success: false,
            error: error.message
          })
        }
      }
      
      return results
    }

    // Queue management
    enqueueMessage(message) {
      this.messageQueue.push({
        ...message,
        timestamp: Date.now()
      })
      
      this.processQueue()
    }

    async processQueue() {
      if (this.isProcessing || this.messageQueue.length === 0) {
        return
      }
      
      this.isProcessing = true
      
      try {
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift()
          
          // Check if message is too old
          if (Date.now() - message.timestamp > this.config.maxResponseTime) {
            await this.sendErrorResponse(message.requestId, 'Message timeout')
            continue
          }
          
          // Process message
          const handler = this.messageHandlers.get(message.type)
          if (handler) {
            await handler(message.data, message.requestId)
          } else {
            await this.sendErrorResponse(message.requestId, `Unknown message type: ${message.type}`)
          }
        }
      } finally {
        this.isProcessing = false
      }
    }

    // Utility methods
    addAllowedOrigin(origin) {
      this.allowedOrigins.add(origin)
      console.log(`DOM Monitor: Added allowed origin: ${origin}`)
    }

    removeAllowedOrigin(origin) {
      this.allowedOrigins.delete(origin)
      console.log(`DOM Monitor: Removed allowed origin: ${origin}`)
    }

    // Statistics and monitoring
    getStats() {
      return {
        totalMessages: this.stats.totalMessages,
        successfulMessages: this.stats.successfulMessages,
        failedMessages: this.stats.failedMessages,
        averageResponseTime: this.stats.averageResponseTime,
        messagesSent: this.stats.messagesSent,
        messagesReceived: this.stats.messagesReceived,
        lastMessageTime: this.stats.lastMessageTime,
        pendingRequests: this.pendingRequests.size,
        queuedMessages: this.messageQueue.length,
        allowedOrigins: Array.from(this.allowedOrigins),
        successRate: this.stats.totalMessages > 0 ? 
          (this.stats.successfulMessages / this.stats.totalMessages) * 100 : 0
      }
    }

    // Performance monitoring
    getPerformanceMetrics() {
      const totalMessages = this.stats.totalMessages
      
      return {
        messagesPerSecond: totalMessages > 0 ? 
          totalMessages / ((Date.now() - this.stats.lastMessageTime) / 1000) : 0,
        errorRate: totalMessages > 0 ? 
          (this.stats.failedMessages / totalMessages) * 100 : 0,
        averageResponseTime: this.stats.averageResponseTime,
        throughput: this.stats.successfulMessages,
        memoryUsage: this.estimateMemoryUsage()
      }
    }

    estimateMemoryUsage() {
      // Rough estimation in KB
      const handlerOverhead = this.messageHandlers.size * 0.1
      const queueOverhead = this.messageQueue.length * 0.5
      const pendingOverhead = this.pendingRequests.size * 0.3
      
      return Math.round(handlerOverhead + queueOverhead + pendingOverhead)
    }

    // Cleanup and reset
    cleanup() {
      // Clear pending requests
      this.pendingRequests.clear()
      
      // Clear message queue
      this.messageQueue = []
      
      // Reset stats
      this.stats = {
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        messagesSent: 0,
        messagesReceived: 0,
        lastMessageTime: 0
      }
      
      this.isProcessing = false
      
      console.log("DOM Monitor: Communication Bridge cleaned up")
    }

    // Advanced features
    broadcastMessage(message) {
      for (const origin of this.allowedOrigins) {
        try {
          window.parent.postMessage(message, origin)
        } catch (error) {
          console.warn('DOM Monitor: Failed to broadcast to origin:', origin, error)
        }
      }
    }

    // Health check
    async healthCheck() {
      return {
        isHealthy: true,
        uptime: Date.now() - this.stats.lastMessageTime,
        stats: this.getStats(),
        performance: this.getPerformanceMetrics(),
        dependencies: {
          elementCache: !!this.elementCache,
          serializer: !!this.serializer,
          performanceManager: !!this.performanceManager
        }
      }
    }
  }

  // Export the module
  window.DOMMonitorModules.CommunicationBridge = CommunicationBridge

  console.log("✅ DOM Monitor: Communication Bridge module loaded")
})() 