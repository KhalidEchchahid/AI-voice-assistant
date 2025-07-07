// DOM Monitor - Scroll Detector Enhancement Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Scroll Detector Class
  class ScrollDetector {
    constructor(config = {}) {
      this.config = {
        scrollThreshold: config.scrollThreshold || 10,
        updateInterval: config.updateInterval || 100,
        maxScrollElements: config.maxScrollElements || 50,
        ...config
      }
      
      // Dependencies
      this.elementCache = null
      this.performanceManager = null
      
      // State tracking
      this.isDetecting = false
      this.scrollableElements = new Map()
      this.scrollPositions = new Map()
      this.scrollHandlers = new Map()
      
      // Performance
      this.lastUpdateTime = 0
      this.updateThrottled = this.createThrottledUpdate()
      
      // Statistics
      this.stats = {
        totalScrollableElements: 0,
        scrollEventsTracked: 0,
        lastScanTime: 0
      }
    }

    // Initialize with dependencies
    initialize(elementCache, performanceManager) {
      this.elementCache = elementCache
      this.performanceManager = performanceManager
      
      console.log("✅ DOM Monitor: Scroll Detector initialized")
    }

    // Start detecting scrollable elements
    startDetecting() {
      if (this.isDetecting) {
        console.log("DOM Monitor: Scroll detection already active")
        return
      }
      
      this.isDetecting = true
      
      // Initial scan
      this.scanForScrollableElements()
      
      // Add global scroll listener
      this.addGlobalScrollListener()
      
      // Start periodic scanning
      this.startPeriodicScan()
      
      console.log("✅ DOM Monitor: Scroll detection started")
    }

    // Stop detecting
    stopDetecting() {
      this.isDetecting = false
      
      // Remove all scroll listeners
      this.removeAllScrollListeners()
      
      // Clear periodic scan
      this.stopPeriodicScan()
      
      // Clear tracked data
      this.scrollableElements.clear()
      this.scrollPositions.clear()
      
      console.log("✅ DOM Monitor: Scroll detection stopped")
    }

    // Scan for scrollable elements
    async scanForScrollableElements() {
      const scanOperation = async () => {
        return this._scanForScrollableElementsInternal()
      }
      
      if (this.performanceManager) {
        const result = await this.performanceManager.executeWithBudget(
          scanOperation,
          32, // Max 32ms for scanning
          'scanScrollableElements'
        )
        
        if (result.success) {
          this.stats.lastScanTime = Date.now()
        }
      } else {
        await scanOperation()
        this.stats.lastScanTime = Date.now()
      }
    }

    _scanForScrollableElementsInternal() {
      const startTime = performance.now()
      
      // Find all potentially scrollable elements
      const candidates = document.querySelectorAll('*')
      let processed = 0
      
      for (const element of candidates) {
        // Performance check
        if (performance.now() - startTime > 30) {
          console.log("DOM Monitor: Scroll scan time limit reached")
          break
        }
        
        if (this.isScrollable(element)) {
          this.trackScrollableElement(element)
          processed++
          
          // Limit number of tracked elements
          if (processed >= this.config.maxScrollElements) {
            break
          }
        }
      }
      
      this.stats.totalScrollableElements = this.scrollableElements.size
      
      return {
        processed,
        total: candidates.length,
        scrollableFound: this.scrollableElements.size
      }
    }

    // Check if element is scrollable
    isScrollable(element) {
      try {
        const style = window.getComputedStyle(element)
        const isScrollableX = element.scrollWidth > element.clientWidth && 
                            (style.overflowX === 'auto' || style.overflowX === 'scroll')
        const isScrollableY = element.scrollHeight > element.clientHeight && 
                            (style.overflowY === 'auto' || style.overflowY === 'scroll')
        
        return isScrollableX || isScrollableY
      } catch (error) {
        return false
      }
    }

    // Track scrollable element
    trackScrollableElement(element) {
      const elementId = this.generateElementId(element)
      
      if (this.scrollableElements.has(elementId)) {
        return
      }
      
      const scrollData = this.extractScrollData(element)
      this.scrollableElements.set(elementId, {
        element,
        scrollData,
        lastUpdate: Date.now()
      })
      
      // Add scroll listener to this element
      this.addScrollListener(element, elementId)
      
      // Update element cache with scroll data
      this.updateElementCache(element, scrollData)
    }

    // Extract comprehensive scroll data
    extractScrollData(element) {
      const style = window.getComputedStyle(element)
      
      return {
        isScrollable: true,
        scrollPosition: {
          x: element.scrollLeft || 0,
          y: element.scrollTop || 0
        },
        scrollMax: {
          x: Math.max(0, element.scrollWidth - element.clientWidth),
          y: Math.max(0, element.scrollHeight - element.clientHeight)
        },
        scrollBehavior: style.scrollBehavior || 'auto',
        scrollDirection: this.getScrollDirection(element),
        scrollContainer: this.findScrollContainer(element),
        stickyElements: this.findStickyElements(element),
        scrollProgress: {
          x: element.scrollLeft / Math.max(1, element.scrollWidth - element.clientWidth),
          y: element.scrollTop / Math.max(1, element.scrollHeight - element.clientHeight)
        },
        hasHorizontalScroll: element.scrollWidth > element.clientWidth,
        hasVerticalScroll: element.scrollHeight > element.clientHeight,
        isAtTop: element.scrollTop === 0,
        isAtBottom: element.scrollTop >= element.scrollHeight - element.clientHeight - 1,
        isAtLeft: element.scrollLeft === 0,
        isAtRight: element.scrollLeft >= element.scrollWidth - element.clientWidth - 1
      }
    }

    // Get scroll direction capabilities
    getScrollDirection(element) {
      const style = window.getComputedStyle(element)
      
      if (style.overflowX !== 'hidden' && style.overflowY !== 'hidden') {
        return 'both'
      } else if (style.overflowX !== 'hidden') {
        return 'horizontal'
      } else if (style.overflowY !== 'hidden') {
        return 'vertical'
      }
      
      return 'none'
    }

    // Find parent scroll container
    findScrollContainer(element) {
      let parent = element.parentElement
      
      while (parent && parent !== document.body) {
        if (this.isScrollable(parent)) {
          return {
            element: parent,
            id: this.generateElementId(parent),
            tagName: parent.tagName.toLowerCase()
          }
        }
        parent = parent.parentElement
      }
      
      // Document is the default scroll container
      return {
        element: document.documentElement,
        id: 'document',
        tagName: 'html'
      }
    }

    // Find sticky elements within scrollable container
    findStickyElements(container) {
      const stickyElements = []
      const elements = container.querySelectorAll('*')
      
      for (const element of elements) {
        const style = window.getComputedStyle(element)
        if (style.position === 'sticky' || style.position === 'fixed') {
          stickyElements.push({
            id: this.generateElementId(element),
            tagName: element.tagName.toLowerCase(),
            position: style.position,
            top: style.top,
            bottom: style.bottom
          })
        }
        
        // Limit to prevent performance issues
        if (stickyElements.length >= 10) break
      }
      
      return stickyElements
    }

    // Add scroll listener to element
    addScrollListener(element, elementId) {
      const handler = this.createScrollHandler(elementId)
      
      element.addEventListener('scroll', handler, { passive: true })
      this.scrollHandlers.set(elementId, { element, handler })
    }

    // Create throttled scroll handler
    createScrollHandler(elementId) {
      let lastUpdate = 0
      
      return (event) => {
        const now = Date.now()
        if (now - lastUpdate < this.config.updateInterval) {
          return
        }
        
        lastUpdate = now
        this.handleScrollEvent(event.target, elementId)
      }
    }

    // Handle scroll events
    handleScrollEvent(element, elementId) {
      this.stats.scrollEventsTracked++
      
      const scrollData = this.extractScrollData(element)
      const tracked = this.scrollableElements.get(elementId)
      
      if (tracked) {
        tracked.scrollData = scrollData
        tracked.lastUpdate = Date.now()
        
        // Update element cache
        this.updateElementCache(element, scrollData)
      }
      
      // Store scroll position for restoration
      this.scrollPositions.set(elementId, {
        x: element.scrollLeft,
        y: element.scrollTop,
        timestamp: Date.now()
      })
    }

    // Update element cache with scroll data
    updateElementCache(element, scrollData) {
      if (!this.elementCache) return
      
      const elementId = this.generateElementId(element)
      const cachedElement = this.elementCache.cache.get(elementId)
      
      if (cachedElement) {
        // Inject scroll data into cached element
        cachedElement.scrollData = scrollData
        cachedElement.hasScrollData = true
      }
    }

    // Global scroll listener for document
    addGlobalScrollListener() {
      const handler = () => {
        this.handleScrollEvent(document.documentElement, 'document')
      }
      
      window.addEventListener('scroll', handler, { passive: true })
      this.scrollHandlers.set('global', { element: window, handler })
    }

    // Remove all scroll listeners
    removeAllScrollListeners() {
      for (const [id, { element, handler }] of this.scrollHandlers.entries()) {
        if (element === window) {
          window.removeEventListener('scroll', handler)
        } else {
          element.removeEventListener('scroll', handler)
        }
      }
      
      this.scrollHandlers.clear()
    }

    // Periodic scan for new scrollable elements
    startPeriodicScan() {
      this.scanInterval = setInterval(() => {
        if (this.isDetecting) {
          this.scanForScrollableElements()
        }
      }, 5000) // Scan every 5 seconds
    }

    stopPeriodicScan() {
      if (this.scanInterval) {
        clearInterval(this.scanInterval)
        this.scanInterval = null
      }
    }

    // Throttled update function
    createThrottledUpdate() {
      let timeoutId = null
      
      return (callback) => {
        if (timeoutId) clearTimeout(timeoutId)
        
        timeoutId = setTimeout(() => {
          callback()
        }, this.config.updateInterval)
      }
    }

    // Get scroll data for specific element
    getScrollDataForElement(element) {
      const elementId = this.generateElementId(element)
      const tracked = this.scrollableElements.get(elementId)
      
      if (tracked) {
        // Update if stale
        if (Date.now() - tracked.lastUpdate > 1000) {
          tracked.scrollData = this.extractScrollData(element)
          tracked.lastUpdate = Date.now()
        }
        
        return tracked.scrollData
      }
      
      // Check if element is scrollable and return fresh data
      if (this.isScrollable(element)) {
        return this.extractScrollData(element)
      }
      
      return null
    }

    // Restore scroll position
    restoreScrollPosition(element) {
      const elementId = this.generateElementId(element)
      const position = this.scrollPositions.get(elementId)
      
      if (position) {
        element.scrollLeft = position.x
        element.scrollTop = position.y
        return true
      }
      
      return false
    }

    // Utility to generate element ID
    generateElementId(element) {
      if (element === document.documentElement) return 'document'
      
      const tag = element.tagName.toLowerCase()
      const id = element.id || ''
      const classes = Array.from(element.classList).slice(0, 2).join('.')
      
      return `${tag}_${id}_${classes}_${element.offsetTop}_${element.offsetLeft}`
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 100)
    }

    // Get statistics
    getStats() {
      return {
        totalScrollableElements: this.scrollableElements.size,
        scrollEventsTracked: this.stats.scrollEventsTracked,
        lastScanTime: this.stats.lastScanTime,
        scrollPositionsCached: this.scrollPositions.size,
        isDetecting: this.isDetecting
      }
    }

    // Cleanup
    cleanup() {
      this.removeAllScrollListeners()
      this.scrollableElements.clear()
      this.scrollPositions.clear()
      
      this.stats = {
        totalScrollableElements: 0,
        scrollEventsTracked: 0,
        lastScanTime: 0
      }
    }

    // Advanced scroll operations
    async scrollToElement(element, options = {}) {
      const scrollData = this.getScrollDataForElement(element)
      if (!scrollData) return false
      
      const container = scrollData.scrollContainer.element
      const rect = element.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      const scrollOptions = {
        behavior: options.smooth ? 'smooth' : 'auto',
        top: rect.top - containerRect.top + container.scrollTop,
        left: rect.left - containerRect.left + container.scrollLeft
      }
      
      container.scrollTo(scrollOptions)
      return true
    }

    // Check if element is in viewport of its scroll container
    isElementInScrollViewport(element) {
      const scrollData = this.getScrollDataForElement(element)
      if (!scrollData) return true // Non-scrollable elements are considered in viewport
      
      const container = scrollData.scrollContainer.element
      const rect = element.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      return (
        rect.top >= containerRect.top &&
        rect.left >= containerRect.left &&
        rect.bottom <= containerRect.bottom &&
        rect.right <= containerRect.right
      )
    }
  }

  // Export the module
  window.DOMMonitorModules.ScrollDetector = ScrollDetector

  console.log("✅ DOM Monitor: Scroll Detector enhancement module loaded")
})() 