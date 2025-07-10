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
      // Enable debug mode if explicitly set or if we're in development
      return this.config.debugMode || 
             window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             window.location.search.includes('debug=true')
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
      
      // FIXED: Add error handling to prevent observer from stopping
      try {
        this.isObserving = true
        
        // Begin tracking existing elements
        this.observeExistingElements()
        
        console.log("✅ DOM Monitor: Started observing DOM changes")
      } catch (error) {
        console.error("❌ DOM Monitor: Error starting observation:", error)
        this.isObserving = false
      }
    }

    // Stop observing
    stopObserving() {
      if (!this.isObserving) {
        return
      }
      
      console.log("DOM Monitor: Stopping DOM observation...")
      
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
      // FIXED: Add robust error handling to prevent observer from stopping
      if (!this.isObserving) {
        console.log("DOM Monitor: Ignoring mutations - not observing")
        return
      }
      
      if (!this.elementCache) {
        console.warn("DOM Monitor: No element cache available for mutations")
        return
      }
      
      try {
        const processingOperation = async () => {
          return this._processMutations(mutations)
        }
        
        if (this.performanceManager) {
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
        } else {
          await processingOperation()
        }
      } catch (error) {
        console.warn("DOM Monitor: Error handling mutations (continuing):", error)
        // Don't stop observing on error, just log and continue
      }
    }

    async _processMutations(mutations) {
      const startTime = performance.now()
      const processedElements = new Set()
      
      // Limit mutations per batch
      const limitedMutations = mutations.slice(0, this.config.maxMutationsPerBatch)
      
      for (const mutation of limitedMutations) {
        // FIXED: Add per-mutation error handling
        try {
          await this.processSingleMutation(mutation, processedElements)
        } catch (error) {
          console.warn('DOM Monitor: Error processing single mutation (continuing):', error)
          // Continue processing other mutations
        }
      }
      
      const processingTime = performance.now() - startTime
      this.stats.processingTime += processingTime
      this.stats.totalMutations += limitedMutations.length
      this.stats.lastProcessTime = Date.now()
      
      if (this.isDebugMode() && processedElements.size > 0) {
        console.debug(`🔄 DOM Monitor: Processed ${limitedMutations.length} mutations, updated ${processedElements.size} elements`)
      }
      
      return {
        processed: limitedMutations.length,
        processingTime,
        elementsUpdated: processedElements.size
      }
    }

    async processSingleMutation(mutation, processedElements) {
      // IMPROVED: More robust mutation handling with better logging
      if (this.isDebugMode()) {
        console.debug(`🔄 DOM Monitor: Processing mutation`, {
          type: mutation.type,
          target: mutation.target.tagName,
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length
        })
      }
      
      switch (mutation.type) {
        case 'childList':
          // Handle added nodes
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                await this.processAddedElement(node, processedElements)
              }
            }
          }
          
          // Handle removed nodes - IMPROVED: More thorough removal
          if (mutation.removedNodes.length > 0) {
            for (const node of mutation.removedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                await this.processRemovedElement(node, processedElements)
              }
            }
          }
          break
          
        case 'attributes':
          await this.handleAttributeMutation(mutation, processedElements)
          break
      }
    }

    async processRemovedElement(element, processedElements) {
      if (processedElements.has(element)) return
      
      try {
        // IMPROVED: More thorough element removal
        const elementId = this.generateElementId(element)
        
        // DEBUG: Log element ID generation for tracking  
        if (this.isDebugMode()) {
          console.debug(`🆔 DOM Monitor: Generated ID for REMOVE`, {
            elementId,
            tag: element.tagName,
            className: element.className,
            dataTest: element.getAttribute('data-test'),
            text: element.textContent?.slice(0, 30) || '',
            inDOM: document.contains(element)
          })
        }
        
        // Check if element is actually removed from DOM (not just moved)
        const stillInDOM = document.contains(element)
        
        if (!stillInDOM) {
          // Remove from cache
          const wasRemoved = this.elementCache.removeElement(elementId)
          this.unobserveElement(element)
          processedElements.add(element)
          
          if (this.isDebugMode()) {
            console.debug(`➖ DOM Monitor: ${wasRemoved ? 'SUCCESSFULLY' : 'FAILED TO'} remove element from cache`, {
              elementId,
              tag: element.tagName,
              className: element.className,
              id: element.id,
              dataTest: element.getAttribute('data-test'),
              text: element.textContent?.substring(0, 50) || '',
              wasRemoved
            })
          }
          
          // IMPROVED: Process child elements more efficiently and thoroughly
          if (element.children && element.children.length > 0) {
            // Get all descendants, not just direct children
            const allDescendants = Array.from(element.querySelectorAll('*'))
            
            // Process in batches to avoid performance issues
            const batchSize = 20
            for (let i = 0; i < allDescendants.length; i += batchSize) {
              const batch = allDescendants.slice(i, i + batchSize)
              
              for (const child of batch) {
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
              
              // Small delay between batches to prevent blocking
              if (i + batchSize < allDescendants.length) {
                await new Promise(resolve => setTimeout(resolve, 1))
              }
            }
          }
        } else {
          if (this.isDebugMode()) {
            console.debug(`⚠️ DOM Monitor: Element removed from parent but still in DOM (moved?)`, {
              elementId,
              tag: element.tagName
            })
          }
        }
      } catch (error) {
        console.warn('DOM Monitor: Error processing removed element (continuing):', error)
      }
    }

    async processAddedElement(element, processedElements) {
      if (processedElements.has(element)) return
      
      // IMPROVED: Add safety checks and better duplicate detection
      try {
        // Verify element is actually in DOM and relevant
        if (!document.contains(element) || !this.isRelevantElement(element)) {
          return
        }
        
        // IMPROVED: Check if we already have this element to prevent duplicates
        const elementId = this.generateElementId(element)
        const existingElement = this.elementCache.cache.elements.get(elementId)
        
        // DEBUG: Log element ID generation for tracking
        if (this.isDebugMode()) {
          console.debug(`🆔 DOM Monitor: Generated ID for ADD`, {
            elementId,
            tag: element.tagName,
            className: element.className,
            dataTest: element.getAttribute('data-test'),
            text: element.textContent?.slice(0, 30) || '',
            inDOM: document.contains(element)
          })
        }
        
        if (existingElement) {
          // Element already cached, just update it
          await this.elementCache.addElement(element)
          processedElements.add(element)
          
          if (this.isDebugMode()) {
            console.debug(`🔄 DOM Monitor: Updated existing element`, {
              elementId,
              tag: element.tagName,
              className: element.className,
              text: element.textContent?.substring(0, 50) || ''
            })
          }
          return
        }
        
        // Add new element to cache
        const newElementId = await this.elementCache.addElement(element)
        if (newElementId) {
          this.observeElement(element)
          processedElements.add(element)
          
          if (this.isDebugMode()) {
            console.debug(`➕ DOM Monitor: Added NEW element to DOM & cache`, {
              elementId: newElementId,
              tag: element.tagName,
              className: element.className,
              id: element.id,
              dataTest: element.getAttribute('data-test'),
              text: element.textContent?.substring(0, 50) || ''
            })
          }
        }
        
        // IMPROVED: Process child elements more efficiently
        if (element.children && element.children.length > 0) {
          const relevantChildren = element.querySelectorAll(
            'button, a, input, select, textarea, form, [role="button"], [tabindex], [onclick], [data-testid]'
          )
          
          // Process up to 15 children to balance thoroughness vs performance
          const childrenToProcess = Array.from(relevantChildren).slice(0, 15)
          
          for (const child of childrenToProcess) {
            if (!processedElements.has(child) && this.isRelevantElement(child)) {
              const childElementId = this.generateElementId(child)
              const existingChild = this.elementCache.cache.elements.get(childElementId)
              
              if (!existingChild) {
                const childId = await this.elementCache.addElement(child)
                if (childId) {
                  this.observeElement(child)
                  processedElements.add(child)
                  
                  if (this.isDebugMode()) {
                    console.debug(`➕ DOM Monitor: Added NEW child element`, {
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
        }
      } catch (error) {
        console.warn('DOM Monitor: Error processing added element (continuing):', error)
      }
    }

    async handleAttributeMutation(mutation, processedElements) {
      const element = mutation.target
      const elementId = this.generateElementId(element)
      const attributeName = mutation.attributeName
      
      // FIXED: Update cache reference to use new structure
      const oldValue = this.elementCache.cache.elements.get(elementId)?.basicData?.attributes?.[attributeName]
      const newValue = element.getAttribute(attributeName)
      
      if (oldValue !== newValue) {
        // Update element in cache
        const updated = await this.elementCache.addElement(element)
        if (updated) {
          processedElements.add(element)
          
          if (this.isDebugMode()) {
            console.debug(`🔄 DOM Monitor: Attribute updated`, {
              elementId,
              tag: element.tagName,
              attribute: attributeName,
              oldValue,
              newValue
            })
          }
        }
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

    async _processVisibilityChanges(entries) {
      for (const entry of entries) {
        const element = entry.target
        const elementId = this.generateElementId(element)
        
        // FIXED: Update cache reference to use new structure
        const cachedElement = this.elementCache.cache.elements.get(elementId)
        
        if (cachedElement) {
          const wasVisible = cachedElement.basicData.visibility
          const isVisible = entry.isIntersecting
          
          if (wasVisible !== isVisible) {
            // Update element data
            await this.elementCache.addElement(element)
            
            if (this.isDebugMode()) {
              console.debug(`👁️ DOM Monitor: Visibility changed`, {
                elementId,
                tag: element.tagName,
                wasVisible,
                isVisible
              })
            }
          }
        }
      }
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

    // IMPROVED: More robust element observation with existing elements
    observeExistingElements() {
      console.log("🔍 DOM Monitor: Starting initial element discovery...");
      
      try {
        const selectors = [
          'button', 'a[href]', 'input', 'select', 'textarea', 'form',
          '[onclick]', '[role="button"]', '[role="link"]', '[tabindex]',
          '.btn', '.button', '.link', '.clickable'
        ]
        
        console.log("🔍 DOM Monitor: Using selectors:", selectors);
        
        const elements = document.querySelectorAll(selectors.join(','))
        let addedCount = 0;
        let skippedCount = 0;
        
        console.log("🔍 DOM Monitor: Found potential elements:", elements.length);
        
        // Process elements in batches to avoid blocking
        const batchSize = 20
        const processBatch = async (batch) => {
          for (const element of batch) {
            try {
              if (this.isRelevantElement(element)) {
                const elementId = await this.elementCache.addElement(element)
                if (elementId) {
                  this.observeElement(element)
                  addedCount++
                } else {
                  skippedCount++
                }
              } else {
                skippedCount++
              }
            } catch (error) {
              console.warn("DOM Monitor: Error adding element during initial scan:", error)
              skippedCount++
            }
          }
        }
        
        // Process in batches
        const batches = []
        for (let i = 0; i < elements.length; i += batchSize) {
          batches.push(Array.from(elements).slice(i, i + batchSize))
        }
        
        // Process first batch immediately, others async
        if (batches.length > 0) {
          processBatch(batches[0]).then(() => {
            console.log(`✅ DOM Monitor: Initial batch completed - Added: ${addedCount}, Skipped: ${skippedCount}`)
            
            // Process remaining batches asynchronously
            batches.slice(1).forEach((batch, index) => {
              setTimeout(() => processBatch(batch), (index + 1) * 100)
            })
          })
        }
        
        console.log(`✅ DOM Monitor: Started initial scan - processing ${elements.length} elements in ${batches.length} batches`)
        
      } catch (error) {
        console.error("❌ DOM Monitor: Error in initial element discovery:", error)
      }
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