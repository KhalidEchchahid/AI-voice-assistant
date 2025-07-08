// DOM Monitor - Hover Detector Enhancement Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Hover Detector Class
  class HoverDetector {
    constructor(config = {}) {
      this.config = {
        hoverDelay: config.hoverDelay || 300,
        maxHoverElements: config.maxHoverElements || 100,
        tooltipDelay: config.tooltipDelay || 500,
        scanInterval: config.scanInterval || 5000,
        ...config
      }
      
      // Dependencies
      this.elementCache = null
      this.performanceManager = null
      
      // State tracking
      this.isDetecting = false
      this.hoverElements = new Map()
      this.activeHovers = new Map()
      this.hoverTimers = new Map()
      
      // Tooltip patterns
      this.tooltipPatterns = {
        attributes: ['title', 'data-tooltip', 'data-tip', 'aria-label', 'data-original-title'],
        classes: ['tooltip', 'popover', 'hint', 'tip', 'info-bubble'],
        roles: ['tooltip', 'note', 'complementary']
      }
      
      // Dropdown patterns
      this.dropdownPatterns = {
        classes: ['dropdown', 'menu', 'submenu', 'nav-menu', 'context-menu'],
        attributes: ['data-dropdown', 'data-menu', 'aria-haspopup', 'aria-expanded'],
        roles: ['menu', 'menubar', 'menuitem', 'listbox']
      }
      
      // Statistics
      this.stats = {
        totalHoverElements: 0,
        tooltipElements: 0,
        dropdownElements: 0,
        menuElements: 0,
        hoverEventsTracked: 0,
        lastScanTime: 0
      }
    }

    // Initialize with dependencies
    initialize(elementCache, performanceManager) {
      this.elementCache = elementCache
      this.performanceManager = performanceManager
      
      console.log("✅ DOM Monitor: Hover Detector initialized")
    }

    // Start detecting hover elements
    startDetecting() {
      if (this.isDetecting) {
        console.log("DOM Monitor: Hover detection already active")
        return
      }
      
      this.isDetecting = true
      
      // Initial scan
      this.scanForHoverElements()
      
      // Start global hover tracking
      this.startGlobalHoverTracking()
      
      // Start periodic scanning
      this.startPeriodicScan()
      
      console.log("✅ DOM Monitor: Hover detection started")
    }

    // Stop detecting
    stopDetecting() {
      this.isDetecting = false
      
      // Stop global hover tracking
      this.stopGlobalHoverTracking()
      
      // Clear periodic scan
      this.stopPeriodicScan()
      
      // Clear timers
      this.clearAllHoverTimers()
      
      // Clear tracked data
      this.hoverElements.clear()
      this.activeHovers.clear()
      
      console.log("✅ DOM Monitor: Hover detection stopped")
    }

    // Scan for hover elements
    async scanForHoverElements() {
      const scanOperation = async () => {
        return this._scanForHoverElementsInternal()
      }
      
      if (this.performanceManager) {
        const result = await this.performanceManager.executeWithBudget(
          scanOperation,
          32, // Max 32ms for scanning
          'scanHoverElements'
        )
        
        if (result.success) {
          this.stats.lastScanTime = Date.now()
        }
      } else {
        await scanOperation()
        this.stats.lastScanTime = Date.now()
      }
    }

    _scanForHoverElementsInternal() {
      const startTime = performance.now()
      let processed = 0
      
      // Scan for tooltip elements
      const tooltipElements = this.findTooltipElements()
      for (const element of tooltipElements) {
        if (performance.now() - startTime > 30) break
        if (processed >= this.config.maxHoverElements) break
        
        this.trackHoverElement(element, 'tooltip')
        processed++
      }
      
      // Scan for dropdown elements
      const dropdownElements = this.findDropdownElements()
      for (const element of dropdownElements) {
        if (performance.now() - startTime > 30) break
        if (processed >= this.config.maxHoverElements) break
        
        this.trackHoverElement(element, 'dropdown')
        processed++
      }
      
      // Scan for elements with CSS hover effects
      const hoverEffectElements = this.findHoverEffectElements()
      for (const element of hoverEffectElements) {
        if (performance.now() - startTime > 30) break
        if (processed >= this.config.maxHoverElements) break
        
        this.trackHoverElement(element, 'hover-effect')
        processed++
      }
      
      this.updateStatistics()
      
      return {
        processed,
        hoverElementsFound: this.hoverElements.size
      }
    }

    // Find tooltip elements
    findTooltipElements() {
      const elements = new Set()
      
      // Find by attributes
      for (const attr of this.tooltipPatterns.attributes) {
        const found = document.querySelectorAll(`[${attr}]`)
        found.forEach(el => elements.add(el))
      }
      
      // Find by classes
      for (const className of this.tooltipPatterns.classes) {
        const found = document.querySelectorAll(`.${className}, [class*="${className}"]`)
        found.forEach(el => elements.add(el))
      }
      
      // Find by roles
      for (const role of this.tooltipPatterns.roles) {
        const found = document.querySelectorAll(`[role="${role}"]`)
        found.forEach(el => elements.add(el))
      }
      
      return Array.from(elements)
    }

    // Find dropdown elements
    findDropdownElements() {
      const elements = new Set()
      
      // Find by classes
      for (const className of this.dropdownPatterns.classes) {
        const found = document.querySelectorAll(`.${className}, [class*="${className}"]`)
        found.forEach(el => {
          // Check if it has child elements that could be menu items
          if (el.children.length > 0 || el.querySelector('ul, ol, [role="menu"]')) {
            elements.add(el)
          }
        })
      }
      
      // Find by attributes
      for (const attr of this.dropdownPatterns.attributes) {
        const found = document.querySelectorAll(`[${attr}]`)
        found.forEach(el => elements.add(el))
      }
      
      // Find by roles
      for (const role of this.dropdownPatterns.roles) {
        const found = document.querySelectorAll(`[role="${role}"]`)
        found.forEach(el => elements.add(el))
      }
      
      return Array.from(elements)
    }

    // Find elements with CSS hover effects
    findHoverEffectElements() {
      const elements = []
      const allElements = document.querySelectorAll('*')
      
      for (const element of allElements) {
        if (elements.length >= 50) break // Limit to prevent performance issues
        
        if (this.hasHoverEffects(element)) {
          elements.push(element)
        }
      }
      
      return elements
    }

    // Check if element has hover effects
    hasHoverEffects(element) {
      try {
        // Create a temporary style element to check :hover styles
        const testId = 'hover-test-' + Math.random().toString(36).substr(2, 9)
        element.id = element.id || testId
        
        const style = document.createElement('style')
        style.textContent = `#${element.id}:hover { --hover-test: 1; }`
        document.head.appendChild(style)
        
        // Force style recalculation
        window.getComputedStyle(element).getPropertyValue('--hover-test')
        
        // Check if element has hover styles in stylesheets
        const hasHover = this.checkStyleSheets(element)
        
        // Cleanup
        document.head.removeChild(style)
        if (element.id === testId) element.removeAttribute('id')
        
        return hasHover
      } catch (error) {
        return false
      }
    }

    // Check stylesheets for hover rules
    checkStyleSheets(element) {
      try {
        const sheets = document.styleSheets
        const elementMatches = (selector) => {
          try {
            return element.matches(selector.replace(':hover', ''))
          } catch {
            return false
          }
        }
        
        for (const sheet of sheets) {
          try {
            const rules = sheet.cssRules || sheet.rules
            for (const rule of rules) {
              if (rule.selectorText && rule.selectorText.includes(':hover')) {
                if (elementMatches(rule.selectorText)) {
                  return true
                }
              }
            }
          } catch {
            // Cross-origin stylesheets will throw errors
            continue
          }
        }
      } catch (error) {
        // Ignore errors from cross-origin stylesheets
      }
      
      return false
    }

    // Track hover element
    trackHoverElement(element, type) {
      const elementId = this.generateElementId(element)
      
      if (this.hoverElements.has(elementId)) {
        return
      }
      
      const hoverData = this.extractHoverData(element, type)
      this.hoverElements.set(elementId, {
        element,
        type,
        hoverData,
        lastUpdate: Date.now()
      })
      
      // Update element cache
      this.updateElementCache(element, hoverData)
    }

    // Extract comprehensive hover data
    extractHoverData(element, type) {
      const baseData = {
        hasHoverEffects: true,
        hoverType: type,
        hoverTiming: this.detectHoverTiming(element)
      }
      
      switch (type) {
        case 'tooltip':
          return {
            ...baseData,
            tooltipData: this.extractTooltipData(element)
          }
          
        case 'dropdown':
          return {
            ...baseData,
            dropdownData: this.extractDropdownData(element)
          }
          
        case 'hover-effect':
          return {
            ...baseData,
            effectData: this.extractHoverEffectData(element)
          }
          
        default:
          return baseData
      }
    }

    // Extract tooltip data
    extractTooltipData(element) {
      const tooltipContent = this.getTooltipContent(element)
      const tooltipPosition = this.detectTooltipPosition(element)
      
      return {
        hasTooltip: true,
        tooltipContent,
        tooltipDelay: this.getTooltipDelay(element),
        tooltipPosition,
        tooltipTrigger: 'hover', // Could also be 'click' or 'focus'
        tooltipPersistent: this.isTooltipPersistent(element),
        tooltipSource: this.getTooltipSource(element)
      }
    }

    // Get tooltip content
    getTooltipContent(element) {
      // Check various tooltip attributes
      for (const attr of this.tooltipPatterns.attributes) {
        const content = element.getAttribute(attr)
        if (content) return content
      }
      
      // Check for associated tooltip element
      const tooltipId = element.getAttribute('aria-describedby')
      if (tooltipId) {
        const tooltipEl = document.getElementById(tooltipId)
        if (tooltipEl) return tooltipEl.textContent
      }
      
      // Check for child tooltip element
      const childTooltip = element.querySelector('.tooltip, [role="tooltip"]')
      if (childTooltip) return childTooltip.textContent
      
      return ''
    }

    // Detect tooltip position
    detectTooltipPosition(element) {
      const classes = element.className || ''
      const positions = ['top', 'bottom', 'left', 'right']
      
      for (const pos of positions) {
        if (typeof classes === 'string' && (classes.includes(`tooltip-${pos}`) || classes.includes(`${pos}-tooltip`))) {
          return pos
        }
      }
      
      // Check data attributes
      return element.getAttribute('data-tooltip-position') || 
             element.getAttribute('data-placement') || 
             'top'
    }

    // Get tooltip delay
    getTooltipDelay(element) {
      const delay = element.getAttribute('data-tooltip-delay') ||
                   element.getAttribute('data-delay')
      
      return delay ? parseInt(delay) : this.config.tooltipDelay
    }

    // Check if tooltip is persistent
    isTooltipPersistent(element) {
      return element.hasAttribute('data-tooltip-persistent') ||
             element.classList.contains('tooltip-persistent')
    }

    // Get tooltip source
    getTooltipSource(element) {
      if (element.hasAttribute('title')) return 'title'
      if (element.hasAttribute('data-tooltip')) return 'data-tooltip'
      if (element.hasAttribute('aria-label')) return 'aria-label'
      return 'other'
    }

    // Extract dropdown data
    extractDropdownData(element) {
      const dropdownContent = this.findDropdownContent(element)
      const dropdownItems = this.findDropdownItems(dropdownContent)
      
      return {
        isDropdownTrigger: true,
        dropdownContent: dropdownContent ? this.generateElementId(dropdownContent) : null,
        dropdownItems: dropdownItems.map(item => ({
          id: this.generateElementId(item),
          text: item.textContent.trim(),
          href: item.href || null,
          hasSubmenu: this.hasSubmenu(item)
        })),
        dropdownPosition: this.detectDropdownPosition(element),
        autoClose: this.detectAutoClose(element),
        openOn: this.detectOpenTrigger(element),
        closeOn: this.detectCloseTrigger(element),
        isNested: this.isNestedDropdown(element),
        menuLevels: this.countMenuLevels(element)
      }
    }

    // Find dropdown content
    findDropdownContent(trigger) {
      // Check aria-controls
      const controlsId = trigger.getAttribute('aria-controls')
      if (controlsId) {
        return document.getElementById(controlsId)
      }
      
      // Check next sibling
      let sibling = trigger.nextElementSibling
      if (sibling && this.isDropdownContent(sibling)) {
        return sibling
      }
      
      // Check child elements
      const child = trigger.querySelector('ul, ol, .dropdown-menu, [role="menu"]')
      if (child) return child
      
      // Check parent for dropdown structure
      const parent = trigger.parentElement
      if (parent) {
        const menu = parent.querySelector('.dropdown-menu, [role="menu"]')
        if (menu && menu !== trigger) return menu
      }
      
      return null
    }

    // Check if element is dropdown content
    isDropdownContent(element) {
      const dropdownSelectors = [
        'ul', 'ol', '.dropdown-menu', '.menu', 
        '[role="menu"]', '[role="listbox"]'
      ]
      
      return dropdownSelectors.some(selector => element.matches(selector))
    }

    // Find dropdown items
    findDropdownItems(content) {
      if (!content) return []
      
      const items = content.querySelectorAll(
        'li > a, li > button, [role="menuitem"], .dropdown-item, .menu-item'
      )
      
      return Array.from(items).slice(0, 50) // Limit to prevent performance issues
    }

    // Check if item has submenu
    hasSubmenu(item) {
      const parent = item.parentElement
      return !!(parent && parent.querySelector('ul, ol, .submenu, .dropdown-menu'))
    }

    // Detect dropdown position
    detectDropdownPosition(element) {
      const classes = element.className || ''
      const positions = ['dropdown', 'dropup', 'dropstart', 'dropend', 'dropleft', 'dropright']
      
      for (const pos of positions) {
        if (typeof classes === 'string' && classes.includes(pos)) return pos
      }
      
      return 'dropdown' // Default
    }

    // Detect auto close behavior
    detectAutoClose(element) {
      if (element.hasAttribute('data-auto-close')) {
        return element.getAttribute('data-auto-close') !== 'false'
      }
      
      return !element.classList.contains('dropdown-persistent')
    }

    // Detect open trigger
    detectOpenTrigger(element) {
      if (element.hasAttribute('data-trigger')) {
        return element.getAttribute('data-trigger')
      }
      
      // Default to hover for most dropdowns
      return 'hover'
    }

    // Detect close trigger
    detectCloseTrigger(element) {
      return element.getAttribute('data-close-on') || 'mouseleave'
    }

    // Check if nested dropdown
    isNestedDropdown(element) {
      let parent = element.parentElement
      while (parent) {
        if (this.isDropdownContent(parent)) return true
        parent = parent.parentElement
      }
      return false
    }

    // Count menu levels
    countMenuLevels(element) {
      let levels = 0
      let current = element
      
      while (current && levels < 5) {
        const submenu = current.querySelector('ul, ol, .submenu')
        if (submenu) {
          levels++
          current = submenu
        } else {
          break
        }
      }
      
      return levels
    }

    // Extract hover effect data
    extractHoverEffectData(element) {
      return {
        hasVisualChange: true,
        hoverClasses: this.detectHoverClasses(element),
        transitionDuration: this.getTransitionDuration(element),
        transformations: this.detectHoverTransformations(element)
      }
    }

    // Detect hover classes
    detectHoverClasses(element) {
      const classes = Array.from(element.classList)
      return classes.filter(cls => 
        cls.includes('hover') || 
        cls.includes('over') ||
        cls.includes('active')
      )
    }

    // Get transition duration
    getTransitionDuration(element) {
      const style = window.getComputedStyle(element)
      const duration = style.transitionDuration || '0s'
      return parseFloat(duration) * 1000 // Convert to milliseconds
    }

    // Detect hover transformations
    detectHoverTransformations(element) {
      // This would need more sophisticated detection
      // For now, return basic info
      const style = window.getComputedStyle(element)
      return {
        hasTransition: style.transition !== 'none',
        hasTransform: style.transform !== 'none',
        cursor: style.cursor
      }
    }

    // Detect hover timing
    detectHoverTiming(element) {
      const showDelay = parseInt(element.getAttribute('data-show-delay') || '0')
      const hideDelay = parseInt(element.getAttribute('data-hide-delay') || '0')
      
      return {
        showDelay: showDelay || this.config.hoverDelay,
        hideDelay: hideDelay || 0,
        persistent: element.hasAttribute('data-hover-persistent')
      }
    }

    // Start global hover tracking
    startGlobalHoverTracking() {
      this.globalMouseMoveHandler = (e) => this.handleGlobalMouseMove(e)
      this.globalMouseOverHandler = (e) => this.handleGlobalMouseOver(e)
      this.globalMouseOutHandler = (e) => this.handleGlobalMouseOut(e)
      
      document.addEventListener('mousemove', this.globalMouseMoveHandler, true)
      document.addEventListener('mouseover', this.globalMouseOverHandler, true)
      document.addEventListener('mouseout', this.globalMouseOutHandler, true)
    }

    // Stop global hover tracking
    stopGlobalHoverTracking() {
      if (this.globalMouseMoveHandler) {
        document.removeEventListener('mousemove', this.globalMouseMoveHandler, true)
        document.removeEventListener('mouseover', this.globalMouseOverHandler, true)
        document.removeEventListener('mouseout', this.globalMouseOutHandler, true)
      }
    }

    // Handle global mouse move
    handleGlobalMouseMove(event) {
      // Track current hover target
      this.currentHoverTarget = event.target
    }

    // Handle global mouse over
    handleGlobalMouseOver(event) {
      const element = event.target
      const elementId = this.generateElementId(element)
      
      // Track hover start
      if (!this.activeHovers.has(elementId)) {
        this.activeHovers.set(elementId, {
          element,
          startTime: Date.now(),
          enterPoint: { x: event.clientX, y: event.clientY }
        })
        
        // Set timer to detect sustained hover
        const timer = setTimeout(() => {
          this.handleSustainedHover(element)
        }, this.config.hoverDelay)
        
        this.hoverTimers.set(elementId, timer)
      }
      
      this.stats.hoverEventsTracked++
    }

    // Handle global mouse out
    handleGlobalMouseOut(event) {
      const element = event.target
      const elementId = this.generateElementId(element)
      
      // Clear hover timer
      const timer = this.hoverTimers.get(elementId)
      if (timer) {
        clearTimeout(timer)
        this.hoverTimers.delete(elementId)
      }
      
      // Track hover end
      const hoverData = this.activeHovers.get(elementId)
      if (hoverData) {
        hoverData.endTime = Date.now()
        hoverData.duration = hoverData.endTime - hoverData.startTime
        hoverData.exitPoint = { x: event.clientX, y: event.clientY }
        
        // Check if this was a meaningful hover
        if (hoverData.duration > 100) {
          this.recordHoverInteraction(element, hoverData)
        }
        
        this.activeHovers.delete(elementId)
      }
    }

    // Handle sustained hover
    handleSustainedHover(element) {
      const elementId = this.generateElementId(element)
      
      // Check if element has hover functionality
      if (!this.hoverElements.has(elementId)) {
        // Dynamically check for hover functionality
        if (this.hasHoverFunctionality(element)) {
          this.trackHoverElement(element, 'dynamic')
        }
      }
    }

    // Check if element has hover functionality
    hasHoverFunctionality(element) {
      // Quick checks for common hover indicators
      return !!(
        element.title ||
        element.getAttribute('data-tooltip') ||
        element.classList.contains('dropdown-toggle') ||
        element.querySelector('.dropdown-menu') ||
        this.hasHoverEffects(element)
      )
    }

    // Record hover interaction
    recordHoverInteraction(element, hoverData) {
      const elementId = this.generateElementId(element)
      const tracked = this.hoverElements.get(elementId)
      
      if (tracked) {
        tracked.lastInteraction = {
          duration: hoverData.duration,
          timestamp: Date.now()
        }
        
        // Update element cache with interaction data
        this.updateElementCache(element, tracked.hoverData)
      }
    }

    // Update element cache with hover data
    updateElementCache(element, hoverData) {
      if (!this.elementCache) return
      
      const elementId = this.generateElementId(element)
      const cachedElement = this.elementCache.cache.get(elementId)
      
      if (cachedElement) {
        cachedElement.hoverData = hoverData
        cachedElement.hasHoverData = true
      }
    }

    // Clear all hover timers
    clearAllHoverTimers() {
      for (const timer of this.hoverTimers.values()) {
        clearTimeout(timer)
      }
      this.hoverTimers.clear()
    }

    // Periodic scan
    startPeriodicScan() {
      this.scanInterval = setInterval(() => {
        if (this.isDetecting) {
          this.scanForHoverElements()
        }
      }, this.config.scanInterval)
    }

    stopPeriodicScan() {
      if (this.scanInterval) {
        clearInterval(this.scanInterval)
        this.scanInterval = null
      }
    }

    // Update statistics
    updateStatistics() {
      this.stats.totalHoverElements = this.hoverElements.size
      this.stats.tooltipElements = 0
      this.stats.dropdownElements = 0
      this.stats.menuElements = 0
      
      for (const [id, data] of this.hoverElements.entries()) {
        switch (data.type) {
          case 'tooltip':
            this.stats.tooltipElements++
            break
          case 'dropdown':
            this.stats.dropdownElements++
            if (data.hoverData.dropdownData?.menuLevels > 0) {
              this.stats.menuElements++
            }
            break
        }
      }
    }

    // Get hover data for specific element
    getHoverDataForElement(element) {
      const elementId = this.generateElementId(element)
      const tracked = this.hoverElements.get(elementId)
      
      if (tracked) {
        return tracked.hoverData
      }
      
      // Check dynamically
      if (this.hasHoverFunctionality(element)) {
        const type = this.detectHoverType(element)
        return this.extractHoverData(element, type)
      }
      
      return null
    }

    // Detect hover type dynamically
    detectHoverType(element) {
      if (element.title || element.getAttribute('data-tooltip')) return 'tooltip'
      if (element.classList.contains('dropdown') || element.querySelector('.dropdown-menu')) return 'dropdown'
      return 'hover-effect'
    }

    // Utility to generate element ID
    generateElementId(element) {
      const tag = element.tagName.toLowerCase()
      const id = element.id || ''
      const classes = Array.from(element.classList).slice(0, 2).join('.')
      const text = element.textContent?.trim().slice(0, 20).replace(/[^a-zA-Z0-9]/g, '') || ''
      
      return `${tag}_${id}_${classes}_${text}_${element.offsetTop}_${element.offsetLeft}`
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 100)
    }

    // Get statistics
    getStats() {
      return {
        ...this.stats,
        activeHovers: this.activeHovers.size,
        isDetecting: this.isDetecting
      }
    }

    // Cleanup
    cleanup() {
      this.stopGlobalHoverTracking()
      this.clearAllHoverTimers()
      this.hoverElements.clear()
      this.activeHovers.clear()
      
      this.stats = {
        totalHoverElements: 0,
        tooltipElements: 0,
        dropdownElements: 0,
        menuElements: 0,
        hoverEventsTracked: 0,
        lastScanTime: 0
      }
    }
  }

  // Export the module
  window.DOMMonitorModules.HoverDetector = HoverDetector

  console.log("✅ DOM Monitor: Hover Detector enhancement module loaded")
})() 