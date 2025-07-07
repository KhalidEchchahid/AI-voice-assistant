// DOM Monitor - Performance Manager Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Performance Manager Class
  class PerformanceManager {
    constructor(config = {}) {
      this.config = {
        maxCacheSize: config.maxCacheSize || 500,
        maxScanTime: config.maxScanTime || 16, // Max 16ms per frame
        maxMemoryMB: config.maxMemoryMB || 50,
        throttleDelay: config.throttleDelay || 100,
        priorityElements: config.priorityElements || 100,
        ...config.performance
      }
      
      this.metrics = {
        totalScans: 0,
        avgScanTime: 0,
        scanTimes: [],
        memoryUsage: 0,
        cacheHits: 0,
        cacheMisses: 0,
        throttledOperations: 0,
        performanceBudgetExceeded: 0
      }
      
      this.isThrottling = false
      this.pendingOperations = []
      this.lastCleanup = Date.now()
      this.processingQueue = false
    }

    // Performance Guard - executes function within time budget
    async executeWithBudget(fn, maxTime = this.config.maxScanTime, context = 'unknown') {
      const startTime = performance.now()
      
      try {
        // Check if we should throttle this operation
        if (this.shouldThrottle()) {
          this.metrics.throttledOperations++
          await this.addToQueue(fn, context)
          return { success: false, throttled: true, context }
        }

        const result = await fn()
        const elapsed = performance.now() - startTime
        
        // Track performance
        this.trackScanTime(elapsed)
        
        if (elapsed > maxTime) {
          console.warn(`DOM Monitor: Operation exceeded budget: ${elapsed.toFixed(1)}ms (${context})`)
          this.metrics.performanceBudgetExceeded++
        }
        
        return { success: true, result, elapsed, context }
        
      } catch (error) {
        const elapsed = performance.now() - startTime
        console.error(`DOM Monitor: Error in ${context}:`, error)
        return { success: false, error: error.message, elapsed, context }
      }
    }

    // Smart Scanner - scans only within time budget
    scanWithBudget(elements, processor, timeLimit = this.config.maxScanTime) {
      const startTime = performance.now()
      const results = []
      let processed = 0
      
      for (const element of elements) {
        // Check if we're approaching time limit
        if (performance.now() - startTime >= timeLimit) {
          console.log(`DOM Monitor: Scan budget reached, processed ${processed}/${elements.length} elements`)
          break
        }
        
        try {
          const result = processor(element)
          if (result) results.push(result)
          processed++
        } catch (error) {
          console.warn('DOM Monitor: Error processing element:', error)
        }
      }
      
      return {
        results,
        processed,
        total: elements.length,
        complete: processed === elements.length,
        timeUsed: performance.now() - startTime
      }
    }

    // Priority-based element scanning
    priorityOrderScan(elements, processor) {
      // Sort elements by priority
      const prioritized = elements.sort((a, b) => {
        return this.calculateElementPriority(b) - this.calculateElementPriority(a)
      })
      
      return this.scanWithBudget(prioritized, processor)
    }

    calculateElementPriority(element) {
      let priority = 0
      
      // 1. Visible elements first
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) priority += 10
      
      // 2. Interactive elements second
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea']
      if (interactiveTags.includes(element.tagName.toLowerCase())) priority += 8
      
      // 3. Elements with meaningful text third
      const text = element.textContent || element.value || ''
      if (text.trim().length > 0) priority += 5
      
      // 4. Elements with IDs and data attributes
      if (element.id) priority += 3
      if (element.hasAttribute('data-testid')) priority += 4
      
      return priority
    }

    // Background Processing - use idle time for heavy operations
    scheduleWhenIdle(task, context = 'background') {
      return new Promise((resolve) => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback((deadline) => {
            if (deadline.timeRemaining() > 5) {
              try {
                const result = task()
                resolve({ success: true, result, context })
              } catch (error) {
                resolve({ success: false, error: error.message, context })
              }
            } else {
              // Retry later if not enough idle time
              this.scheduleWhenIdle(task, context).then(resolve)
            }
          })
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            try {
              const result = task()
              resolve({ success: true, result, context })
            } catch (error) {
              resolve({ success: false, error: error.message, context })
            }
          }, 16)
        }
      })
    }

    // Throttling logic
    shouldThrottle() {
      // Check memory pressure
      if (this.estimateMemoryUsage() > this.config.maxMemoryMB) {
        return true
      }
      
      // Check if too many operations are running
      if (this.isThrottling) {
        return true
      }
      
      // Check recent performance
      const recentAvg = this.getRecentAverageScanTime()
      if (recentAvg > this.config.maxScanTime * 2) {
        return true
      }
      
      return false
    }

    async addToQueue(operation, context) {
      this.pendingOperations.push({ operation, context, timestamp: Date.now() })
      
      if (!this.processingQueue) {
        this.processQueue()
      }
    }

    async processQueue() {
      if (this.processingQueue) return
      
      this.processingQueue = true
      this.isThrottling = true
      
      while (this.pendingOperations.length > 0) {
        // Wait for next idle period
        await new Promise(resolve => setTimeout(resolve, this.config.throttleDelay))
        
        const item = this.pendingOperations.shift()
        if (item) {
          try {
            await item.operation()
          } catch (error) {
            console.warn(`DOM Monitor: Queued operation failed (${item.context}):`, error)
          }
        }
      }
      
      this.isThrottling = false
      this.processingQueue = false
    }

    // Memory Management
    estimateMemoryUsage() {
      if (performance.memory) {
        // Convert to MB
        return performance.memory.usedJSHeapSize / (1024 * 1024)
      }
      
      // Fallback estimation based on cache size
      return this.metrics.cacheSize * 0.002 // Rough estimate: 2KB per element
    }

    checkMemoryPressure() {
      const usage = this.estimateMemoryUsage()
      this.metrics.memoryUsage = usage
      
      if (usage > this.config.maxMemoryMB) {
        console.warn(`DOM Monitor: Memory pressure detected: ${usage.toFixed(1)}MB`)
        return true
      }
      
      return false
    }

    // Performance Tracking
    trackScanTime(elapsed) {
      this.metrics.totalScans++
      this.metrics.scanTimes.push(elapsed)
      
      // Keep only recent scan times (last 100)
      if (this.metrics.scanTimes.length > 100) {
        this.metrics.scanTimes = this.metrics.scanTimes.slice(-100)
      }
      
      // Update average
      this.metrics.avgScanTime = this.metrics.scanTimes.reduce((a, b) => a + b, 0) / this.metrics.scanTimes.length
    }

    getRecentAverageScanTime(count = 10) {
      const recent = this.metrics.scanTimes.slice(-count)
      if (recent.length === 0) return 0
      return recent.reduce((a, b) => a + b, 0) / recent.length
    }

    trackCacheHit() {
      this.metrics.cacheHits++
    }

    trackCacheMiss() {
      this.metrics.cacheMisses++
    }

    getCacheHitRate() {
      const total = this.metrics.cacheHits + this.metrics.cacheMisses
      return total > 0 ? this.metrics.cacheHits / total : 0
    }

    // Cleanup and optimization
    shouldRunCleanup() {
      const now = Date.now()
      const timeSinceLastCleanup = now - this.lastCleanup
      
      // Run cleanup every 30 seconds or if memory pressure
      return timeSinceLastCleanup > 30000 || this.checkMemoryPressure()
    }

    markCleanupComplete() {
      this.lastCleanup = Date.now()
    }

    // Adaptive performance tuning
    adaptPerformanceSettings() {
      const avgScanTime = this.metrics.avgScanTime
      const memoryUsage = this.metrics.memoryUsage
      
      // If scans are taking too long, reduce cache size
      if (avgScanTime > this.config.maxScanTime * 1.5) {
        this.config.maxCacheSize = Math.max(100, this.config.maxCacheSize * 0.8)
        console.log(`DOM Monitor: Reduced cache size to ${this.config.maxCacheSize} due to slow scans`)
      }
      
      // If memory usage is high, be more aggressive with cleanup
      if (memoryUsage > this.config.maxMemoryMB * 0.8) {
        this.config.priorityElements = Math.max(50, this.config.priorityElements * 0.9)
        console.log(`DOM Monitor: Reduced priority elements to ${this.config.priorityElements} due to memory usage`)
      }
      
      // If performance is good, gradually increase limits
      if (avgScanTime < this.config.maxScanTime * 0.5 && memoryUsage < this.config.maxMemoryMB * 0.5) {
        this.config.maxCacheSize = Math.min(1000, this.config.maxCacheSize * 1.1)
        this.config.priorityElements = Math.min(200, this.config.priorityElements * 1.1)
      }
    }

    // Performance reporting
    getPerformanceReport() {
      return {
        metrics: { ...this.metrics },
        config: { ...this.config },
        status: {
          isThrottling: this.isThrottling,
          queueLength: this.pendingOperations.length,
          memoryPressure: this.checkMemoryPressure(),
          cacheHitRate: this.getCacheHitRate(),
          avgScanTime: this.metrics.avgScanTime,
          recentAvgScanTime: this.getRecentAverageScanTime()
        },
        recommendations: this.generateRecommendations()
      }
    }

    generateRecommendations() {
      const recommendations = []
      
      if (this.metrics.avgScanTime > this.config.maxScanTime) {
        recommendations.push('Consider reducing scan scope or implementing lazy loading')
      }
      
      if (this.metrics.memoryUsage > this.config.maxMemoryMB * 0.8) {
        recommendations.push('Memory usage high - consider more aggressive cleanup')
      }
      
      if (this.getCacheHitRate() < 0.7) {
        recommendations.push('Low cache hit rate - review caching strategy')
      }
      
      if (this.metrics.throttledOperations > this.metrics.totalScans * 0.1) {
        recommendations.push('High throttling rate - consider increasing performance budgets')
      }
      
      return recommendations
    }

    // Frame rate monitoring
    startFrameRateMonitoring() {
      let frameCount = 0
      let lastTime = performance.now()
      
      const measureFrame = () => {
        frameCount++
        const currentTime = performance.now()
        
        if (currentTime - lastTime >= 1000) {
          const fps = frameCount
          frameCount = 0
          lastTime = currentTime
          
          if (fps < 50) {
            console.warn(`DOM Monitor: Low frame rate detected: ${fps}fps`)
            // Automatically reduce performance budgets
            this.config.maxScanTime = Math.max(8, this.config.maxScanTime * 0.8)
          }
        }
        
        requestAnimationFrame(measureFrame)
      }
      
      requestAnimationFrame(measureFrame)
    }

    // Resource monitoring
    startResourceMonitoring() {
      const monitor = () => {
        // Check memory usage
        this.checkMemoryPressure()
        
        // Adaptive tuning
        this.adaptPerformanceSettings()
        
        // Schedule next check
        setTimeout(monitor, 5000) // Check every 5 seconds
      }
      
      monitor()
    }

    // Public API
    getConfig() {
      return { ...this.config }
    }

    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig }
    }

    getMetrics() {
      return { ...this.metrics }
    }

    reset() {
      this.metrics = {
        totalScans: 0,
        avgScanTime: 0,
        scanTimes: [],
        memoryUsage: 0,
        cacheHits: 0,
        cacheMisses: 0,
        throttledOperations: 0,
        performanceBudgetExceeded: 0
      }
    }
  }

  // Export the module
  window.DOMMonitorModules.PerformanceManager = PerformanceManager

  console.log("✅ DOM Monitor: Performance Manager module loaded")
})() 