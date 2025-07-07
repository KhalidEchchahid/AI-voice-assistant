// DOM Monitor - DOM Observer Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Enhanced DOM Observer Class
  class DOMObserver {
    constructor(config = {}) {
      this.config = {
        observeInterval: config.observeInterval || 1000,
        maxMutationsPerBatch: config.maxMutationsPerBatch || 50,
        throttleDelay: config.throttleDelay || 100,
        debugMode: config.debugMode || false,
        ...config
      }
      
      // Observers
      this.mutationObserver = null
      this.intersectionObserver = null
      this.resizeObserver = null
      
      // Dependencies
      this.elementCache = null
      this.performanceManager = null
      
      // State tracking
      this.isObserving = false
      this.observedElements = new Set()
      this.mutationQueue = []
      this.visibilityMap = new Map()
      this.sizeMap = new Map()
      
      // Performance tracking
      this.stats = {
        totalMutations: 0,
        totalVisibilityChanges: 0,
        totalSizeChanges: 0,
        processingTime: 0,
        throttledOperations: 0,
        lastProcessTime: 0
      }
      
      // Throttled processing
      this.processThrottled = this.createThrottledProcessor()
    }

    // Helper to check debug mode
    isDebugMode() {
      return this.config.debugMode || 
             (window.DOMMonitor && window.DOMMonitor.config && window.DOMMonitor.config.debugMode)
    }

    // Helper to check if element is relevant for caching
    isRelevantElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
      
      // Check by tag name
      const relevantTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'FORM']
      if (relevantTags.includes(element.tagName)) return true
      
      // Check by attributes
      if (element.hasAttribute('role') && element.getAttribute('role') === 'button') return true
      if (element.hasAttribute('tabindex')) return true
      if (element.hasAttribute('onclick')) return true
      if (element.hasAttribute('data-testid')) return true
      if (element.hasAttribute('aria-label')) return true
      
      // Check by class
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.toLowerCase()
        if (classes.includes('btn') || classes.includes('button') || classes.includes('clickable')) return true
      }
      
      return false
    }

    // Initialize with dependencies
    initialize(elementCache, performanceManager) {
      this.elementCache = elementCache
      this.performanceManager = performanceManager
      
      this.setupMutationObserver()
      this.setupIntersectionObserver()
      this.setupResizeObserver()
      
      console.log("✅ DOM Monitor: DOM Observer initialized")
    }

    // Setup mutation observer with performance budgeting
    setupMutationObserver() {
      this.mutationObserver = new MutationObserver((mutations) => {
        this.handleMutations(mutations)
      })
      
      const config = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'class', 'style', 'hidden', 'disabled', 'readonly',
          'aria-label', 'aria-hidden', 'data-testid', 'id'
        ],
        attributeOldValue: false,
        characterData: false,
        characterDataOldValue: false
      }
      
      this.mutationObserver.observe(document.body, config)
      console.log("✅ DOM Monitor: Mutation observer active")
    }

    // Setup intersection observer for visibility tracking
    setupIntersectionObserver() {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.handleIntersectionChanges(entries)
      }, {
        root: null,
        rootMargin: '50px',
        threshold: [0, 0.1, 0.5, 0.9, 1.0]
      })
      
      console.log("✅ DOM Monitor: Intersection observer active")
    }

    // Setup resize observer for size tracking
    setupResizeObserver() {
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver((entries) => {
          this.handleSizeChanges(entries)
        })
        
        console.log("✅ DOM Monitor: Resize observer active")
      } else {
        console.warn("DOM Monitor: ResizeObserver not supported")
      }
    }

    // Start observing
    startObserving() {
      if (this.isObserving) {
        console.log("DOM Monitor: Already observing")
        return
      }
      
      this.isObserving = true
      
      // Begin tracking existing elements
      this.observeExistingElements()
      
      console.log("✅ DOM Monitor: Started observing DOM changes")
    }

    // Stop observing
    stopObserving() {
      this.isObserving = false
      
      if (this.mutationObserver) {
        this.mutationObserver.disconnect()
      }
      
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect()
      }
      
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
      }
      
      this.observedElements.clear()
      this.mutationQueue = []
      
      console.log("✅ DOM Monitor: Stopped observing")
    }

    // Handle mutation events with performance budgeting
    async handleMutations(mutations) {
      if (!this.isObserving || !this.performanceManager) {
        return
      }
      
      const processingOperation = async () => {
        return this._processMutations(mutations)
      }
      
      const result = await this.performanceManager.executeWithBudget(
        processingOperation,
        32, // Max 32ms for mutation processing
        'handleMutations'
      )
      
      if (result.throttled) {
        this.stats.throttledOperations++
        // Queue for later processing
        this.mutationQueue.push(...mutations)
        this.processThrottled()
      }
    }

    async _processMutations(mutations) {
      const startTime = performance.now()
      const processedElements = new Set()
      
      // Limit mutations per batch
      const limitedMutations = mutations.slice(0, this.config.maxMutationsPerBatch)
      
      for (const mutation of limitedMutations) {
        try {
          await this.processSingleMutation(mutation, processedElements)
        } catch (error) {
          console.warn('DOM Monitor: Error processing mutation:', error)
        }
      }
      
      const processingTime = performance.now() - startTime
      this.stats.processingTime += processingTime
      this.stats.totalMutations += limitedMutations.length
      this.stats.lastProcessTime = Date.now()
      
      return {
        processed: limitedMutations.length,
        processingTime,
        elementsUpdated: processedElements.size
      }
    }

    async processSingleMutation(mutation, processedElements) {
      const { type, target, addedNodes, removedNodes, attributeName } = mutation
      
      switch (type) {
        case 'childList':
          await this.handleChildListMutation(addedNodes, removedNodes, processedElements)
          break
          
        case 'attributes':
          await this.handleAttributeMutation(target, attributeName, processedElements)
          break
      }
    }

    async handleChildListMutation(addedNodes, removedNodes, processedElements) {
      // Process added nodes
      for (const node of addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          await this.processAddedElement(node, processedElements)
        }
      }
      
      // Process removed nodes
      for (const node of removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          await this.processRemovedElement(node, processedElements)
        }
      }
    }

    async processAddedElement(element, processedElements) {
      if (processedElements.has(element)) return
      
      // Check if element is relevant for caching
      if (this.isRelevantElement(element)) {
        // Add to cache
        const elementId = await this.elementCache.addElement(element)
        this.observeElement(element)
        processedElements.add(element)
        
        if (this.isDebugMode() && elementId) {
          console.debug(`➕ DOM Monitor: Added element to DOM & cache`, {
            elementId,
            tag: element.tagName,
            className: element.className,
            id: element.id,
            text: element.textContent?.substring(0, 50) || ''
          })
        }
        
        // Process child elements
        const relevantChildren = element.querySelectorAll(
          'button, a, input, select, textarea, form, [role="button"], [tabindex], [onclick], [data-testid]'
        )
        
        for (const child of relevantChildren) {
          if (!processedElements.has(child)) {
            const childId = await this.elementCache.addElement(child)
            this.observeElement(child)
            processedElements.add(child)
            
            if (this.isDebugMode() && childId) {
              console.debug(`➕ DOM Monitor: Added child element`, {
                elementId: childId,
                tag: child.tagName,
                className: child.className,
                text: child.textContent?.substring(0, 30) || ''
              })
            }
          }
        }
      }
    }

    async processRemovedElement(element, processedElements) {
      if (processedElements.has(element)) return
      
      // Remove from cache
      const elementId = this.generateElementId(element)
      const wasRemoved = this.elementCache.removeElement(elementId)
      this.unobserveElement(element)
      processedElements.add(element)
      
      if (this.isDebugMode() && wasRemoved) {
        console.debug(`➖ DOM Monitor: Removed element from DOM & cache`, {
          elementId,
          tag: element.tagName,
          className: element.className,
          id: element.id,
          text: element.textContent?.substring(0, 50) || ''
        })
      }
      
      // Process child elements
      const allChildren = element.querySelectorAll('*')
      for (const child of allChildren) {
        const childId = this.generateElementId(child)
        const childWasRemoved = this.elementCache.removeElement(childId)
        this.unobserveElement(child)
        processedElements.add(child)
        
        if (this.isDebugMode() && childWasRemoved) {
          console.debug(`➖ DOM Monitor: Removed child element`, {
            elementId: childId,
            tag: child.tagName,
            className: child.className,
            text: child.textContent?.substring(0, 30) || ''
          })
        }
      }
    }

    async handleAttributeMutation(element, attributeName, processedElements) {
      if (processedElements.has(element)) return
      
      const elementId = this.generateElementId(element)
      const oldValue = this.elementCache.cache.get(elementId)?.basicData?.attributes?.[attributeName]
      const newValue = element.getAttribute(attributeName)
      
      // Update element in cache (addElement handles both add and update)
      await this.elementCache.addElement(element)
      processedElements.add(element)
      
      if (this.isDebugMode()) {
        console.debug(`🔄 DOM Monitor: Attribute changed`, {
          elementId,
          tag: element.tagName,
          className: element.className,
          attribute: attributeName,
          oldValue,
          newValue,
          text: element.textContent?.substring(0, 30) || ''
        })
      }
    }

    // Handle intersection changes with batching
    handleIntersectionChanges(entries) {
      const visibilityChanges = []
      
      for (const entry of entries) {
        const element = entry.target
        const elementId = this.generateElementId(element)
        const isVisible = entry.intersectionRatio > 0
        
        const previousVisibility = this.visibilityMap.get(elementId)
        if (previousVisibility !== isVisible) {
          this.visibilityMap.set(elementId, isVisible)
          visibilityChanges.push({
            elementId,
            element,
            isVisible,
            intersectionRatio: entry.intersectionRatio,
            boundingBox: entry.boundingClientRect,
            wasVisible: previousVisibility
          })
          
          if (this.isDebugMode()) {
            console.debug(`👁️ DOM Monitor: Visibility changed`, {
              elementId,
              tag: element.tagName,
              className: element.className,
              isVisible,
              wasVisible: previousVisibility,
              intersectionRatio: entry.intersectionRatio.toFixed(2),
              text: element.textContent?.substring(0, 30) || ''
            })
          }
        }
      }
      
      if (visibilityChanges.length > 0) {
        this.processVisibilityChanges(visibilityChanges)
      }
    }

    async processVisibilityChanges(changes) {
      const processingOperation = async () => {
        return this._processVisibilityChanges(changes)
      }
      
      if (this.performanceManager) {
        const result = await this.performanceManager.executeWithBudget(
          processingOperation,
          16, // Max 16ms for visibility processing
          'processVisibilityChanges'
        )
        
        if (result.throttled) {
          this.stats.throttledOperations++
        }
      } else {
        await processingOperation()
      }
    }

    async _processVisibilityChanges(changes) {
      for (const change of changes) {
        const { elementId, element, isVisible, intersectionRatio, boundingBox } = change
        
        const cachedElement = this.elementCache.cache.get(elementId)
        if (cachedElement) {
          // Update visibility data
          cachedElement.basicData.visibility = isVisible
          cachedElement.basicData.intersectionRatio = intersectionRatio
          cachedElement.basicData.position = {
            x: boundingBox.left,
            y: boundingBox.top,
            width: boundingBox.width,
            height: boundingBox.height
          }
          
          // Update last seen timestamp
          cachedElement.basicData.lastSeen = Date.now()
          
          // Update cache access
          this.elementCache.updateAccessCount(elementId)
        }
      }
      
      this.stats.totalVisibilityChanges += changes.length
    }

    // Handle size changes
    handleSizeChanges(entries) {
      const sizeChanges = []
      
      for (const entry of entries) {
        const element = entry.target
        const elementId = this.generateElementId(element)
        const newSize = {
          width: entry.contentRect.width,
          height: entry.contentRect.height
        }
        
        const previousSize = this.sizeMap.get(elementId)
        if (!previousSize || 
            previousSize.width !== newSize.width || 
            previousSize.height !== newSize.height) {
          
          this.sizeMap.set(elementId, newSize)
          sizeChanges.push({
            elementId,
            element,
            newSize,
            previousSize
          })
          
          if (this.isDebugMode()) {
            console.debug(`📐 DOM Monitor: Size changed`, {
              elementId,
              tag: element.tagName,
              className: element.className,
              newSize: `${newSize.width}x${newSize.height}`,
              previousSize: previousSize ? `${previousSize.width}x${previousSize.height}` : 'unknown',
              text: element.textContent?.substring(0, 30) || ''
            })
          }
        }
      }
      
      if (sizeChanges.length > 0) {
        this.processSizeChanges(sizeChanges)
      }
    }

    async processSizeChanges(changes) {
      const processingOperation = async () => {
        return this._processSizeChanges(changes)
      }
      
      if (this.performanceManager) {
        const result = await this.performanceManager.executeWithBudget(
          processingOperation,
          16, // Max 16ms for size processing
          'processSizeChanges'
        )
        
        if (result.throttled) {
          this.stats.throttledOperations++
        }
      } else {
        await processingOperation()
      }
    }

    async _processSizeChanges(changes) {
      for (const change of changes) {
        const { elementId, element, newSize } = change
        
        const cachedElement = this.elementCache.cache.get(elementId)
        if (cachedElement) {
          // Update size data
          cachedElement.basicData.position = {
            ...cachedElement.basicData.position,
            width: newSize.width,
            height: newSize.height
          }
          
          // Update last seen timestamp
          cachedElement.basicData.lastSeen = Date.now()
          
          // Update cache access
          this.elementCache.updateAccessCount(elementId)
        }
      }
      
      this.stats.totalSizeChanges += changes.length
    }

    // Element observation management
    observeElement(element) {
      if (this.observedElements.has(element)) return
      
      this.observedElements.add(element)
      
      // Add to intersection observer
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(element)
      }
      
      // Add to resize observer
      if (this.resizeObserver) {
        this.resizeObserver.observe(element)
      }
    }

    unobserveElement(element) {
      if (!this.observedElements.has(element)) return
      
      this.observedElements.delete(element)
      
      // Remove from intersection observer
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(element)
      }
      
      // Remove from resize observer
      if (this.resizeObserver) {
        this.resizeObserver.unobserve(element)
      }
      
      // Clean up maps
      const elementId = this.generateElementId(element)
      this.visibilityMap.delete(elementId)
      this.sizeMap.delete(elementId)
    }

    // Observe existing elements on start
    observeExistingElements() {
      const relevantElements = document.querySelectorAll(
        'button, a, input, select, textarea, form, [role="button"], [tabindex], [onclick], [data-testid]'
      )
      
      for (const element of relevantElements) {
        this.observeElement(element)
      }
      
      console.log(`DOM Monitor: Observing ${relevantElements.length} existing elements`)
    }

    updateVisibilityObservation(element) {
      // Re-observe element to get updated visibility
      if (this.intersectionObserver && this.observedElements.has(element)) {
        this.intersectionObserver.unobserve(element)
        this.intersectionObserver.observe(element)
      }
    }

    // Throttled processing for queued operations
    createThrottledProcessor() {
      let timeoutId = null
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId)
        
        timeoutId = setTimeout(async () => {
          if (this.mutationQueue.length > 0) {
            const queuedMutations = this.mutationQueue.splice(0, this.config.maxMutationsPerBatch)
            await this._processMutations(queuedMutations)
          }
        }, this.config.throttleDelay)
      }
    }

    // Utility methods
    generateElementId(element) {
      // Generate consistent ID for element
      const tagName = element.tagName.toLowerCase()
      const id = element.id
      const className = element.className
      const textContent = element.textContent?.trim().slice(0, 50) || ''
      
      // Create hash-like ID
      const hashInput = `${tagName}:${id}:${className}:${textContent}`
      return this.simpleHash(hashInput)
    }

    simpleHash(str) {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(36)
    }

    // Statistics and monitoring
    getStats() {
      return {
        totalMutations: this.stats.totalMutations,
        totalVisibilityChanges: this.stats.totalVisibilityChanges,
        totalSizeChanges: this.stats.totalSizeChanges,
        averageProcessingTime: this.stats.totalMutations > 0 ? 
          this.stats.processingTime / this.stats.totalMutations : 0,
        throttledOperations: this.stats.throttledOperations,
        observedElements: this.observedElements.size,
        visibilityMapSize: this.visibilityMap.size,
        sizeMapSize: this.sizeMap.size,
        queuedMutations: this.mutationQueue.length,
        lastProcessTime: this.stats.lastProcessTime,
        isObserving: this.isObserving
      }
    }

    // Performance monitoring
    getPerformanceMetrics() {
      return {
        processingEfficiency: this.stats.totalMutations > 0 ?
          this.stats.processingTime / this.stats.totalMutations : 0,
        throttleRate: this.stats.totalMutations > 0 ?
          this.stats.throttledOperations / this.stats.totalMutations : 0,
        observationOverhead: this.observedElements.size * 0.1, // Rough estimate in KB
        memoryUsage: this.estimateMemoryUsage()
      }
    }

    estimateMemoryUsage() {
      // Rough estimation in KB
      const observerOverhead = 5 // KB per observer
      const elementTracking = this.observedElements.size * 0.2 // KB per tracked element
      const mapOverhead = (this.visibilityMap.size + this.sizeMap.size) * 0.1
      
      return Math.round(observerOverhead + elementTracking + mapOverhead)
    }

    // Cleanup and reset
    cleanup() {
      this.stopObserving()
      
      // Clear all tracking data
      this.visibilityMap.clear()
      this.sizeMap.clear()
      this.mutationQueue = []
      
      // Reset stats
      this.stats = {
        totalMutations: 0,
        totalVisibilityChanges: 0,
        totalSizeChanges: 0,
        processingTime: 0,
        throttledOperations: 0,
        lastProcessTime: 0
      }
    }

    // Advanced features
    forceRescan() {
      console.log("DOM Monitor: Force rescanning DOM")
      this.cleanup()
      this.startObserving()
    }

    pauseObserving() {
      this.isObserving = false
      console.log("DOM Monitor: Paused observing")
    }

    resumeObserving() {
      this.isObserving = true
      console.log("DOM Monitor: Resumed observing")
    }
  }

  // Export the module
  window.DOMMonitorModules.DOMObserver = DOMObserver

  console.log("✅ DOM Monitor: DOM Observer module loaded")
})() 