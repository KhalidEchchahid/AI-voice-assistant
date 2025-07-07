// DOM Monitor - Enhanced Element Data Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Enhanced Element Data Class with Lazy Loading
  class EnhancedElementData {
    constructor(element, config = {}) {
      this.element = element
      this.config = config
      
      // Core data (always loaded)
      this.basicData = this.extractBasicData()
      
      // Specialized data (lazy loaded)
      this.scrollData = null
      this.navigationData = null
      this.mediaData = null
      this.textData = null
      this.hoverData = null
      this.dragData = null
      this.keyboardData = null
      
      // Performance tracking
      this.loadTimes = {}
      this.accessCount = 0
      this.priority = this.calculatePriority()
      this.lastAccess = Date.now()
    }

    extractBasicData() {
      const now = Date.now()
      
      return {
        id: this.generateElementId(),
        tagName: this.element.tagName.toLowerCase(),
        text: this.getElementText(),
        role: this.getElementRole(),
        selectors: this.generateSelectors(),
        attributes: this.getRelevantAttributes(),
        position: this.getElementPosition(),
        visibility: this.checkVisibility(),
        interactable: this.checkInteractability(),
        accessibilityInfo: this.getAccessibilityInfo(),
        lastSeen: now,
        firstSeen: now,
        updateCount: 1
      }
    }

    generateElementId() {
      const tag = this.element.tagName.toLowerCase()
      const id = this.element.id || ''
      
      // Enhanced CSS class filtering
      const allClasses = Array.from(this.element.classList)
      const meaningfulClasses = allClasses
        .filter(cls => 
          !cls.match(/^(flex|items-|justify-|gap-|rounded|text-|font-|transition|focus|hover|disabled|pointer-|opacity-|w-|h-|p-|m-|bg-|border-)/) &&
          cls.length < 30 &&
          cls.length > 1
        )
        .slice(0, 3)
        .join('.')
      
      const text = this.getElementText().slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')
      const position = this.getElementPosition()
      
      const baseId = `${tag}_${id}_${meaningfulClasses}_${text}_${position.x}_${position.y}`
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
      
      const elementHash = this.element.outerHTML ? 
        this.element.outerHTML.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '').slice(-8) : 
        Math.random().toString(36).slice(-6)
      
      return `${baseId}_${elementHash}`.slice(0, 100)
    }

    getElementText() {
      let text = ''
      let source = ''
      
      if (this.element.getAttribute('aria-label')) {
        text = this.element.getAttribute('aria-label')
        source = 'aria-label'
      } else if (this.element.getAttribute('title')) {
        text = this.element.getAttribute('title')
        source = 'title'
      } else if (this.element.getAttribute('placeholder')) {
        text = this.element.getAttribute('placeholder')
        source = 'placeholder'
      } else if (this.element.value && this.element.type !== 'password') {
        text = this.element.value
        source = 'value'
      } else {
        text = this.element.textContent || this.element.innerText || ''
        source = 'textContent'
      }
      
      return text.trim().slice(0, 100)
    }

    getElementRole() {
      if (this.element.getAttribute('role')) return this.element.getAttribute('role')
      
      const tag = this.element.tagName.toLowerCase()
      const type = this.element.type || ''
      
      const roleMap = {
        'button': 'button',
        'a': 'link',
        'input': type === 'submit' ? 'button' : type === 'checkbox' ? 'checkbox' : 'input',
        'select': 'select',
        'textarea': 'textarea',
        'form': 'form',
        'nav': 'navigation',
        'header': 'header',
        'footer': 'footer',
        'main': 'main',
        'section': 'section',
        'article': 'article'
      }
      
      return roleMap[tag] || 'generic'
    }

    generateSelectors() {
      const selectors = []
      
      // ID selector (highest priority)
      if (this.element.id) {
        selectors.push({ 
          type: 'id', 
          value: `#${this.element.id}`, 
          priority: 1,
          confidence: 0.95 
        })
      }
      
      // Data attribute selectors
      const dataAttrs = ['data-testid', 'data-test', 'data-qa', 'data-cy']
      for (const attr of dataAttrs) {
        const value = this.element.getAttribute(attr)
        if (value) {
          selectors.push({ 
            type: 'data-attribute', 
            value: `[${attr}="${value}"]`, 
            priority: 2,
            confidence: 0.9 
          })
        }
      }
      
      // Class selector
      if (this.element.className && typeof this.element.className === 'string') {
        const classes = this.element.className.split(' ').filter(c => c && !c.match(/^(ng-|js-|is-|has-)/))
        if (classes.length > 0 && classes.length <= 3) {
          selectors.push({ 
            type: 'class', 
            value: `.${classes.join('.')}`, 
            priority: 3,
            confidence: 0.75 
          })
        }
      }
      
      // Name attribute
      if (this.element.name) {
        selectors.push({ 
          type: 'name', 
          value: `[name="${this.element.name}"]`, 
          priority: 4,
          confidence: 0.85 
        })
      }
      
      // XPath (fallback)
      selectors.push({ 
        type: 'xpath', 
        value: this.generateXPath(), 
        priority: 5,
        confidence: 0.6 
      })
      
      return selectors.sort((a, b) => a.priority - b.priority)
    }

    generateXPath() {
      if (this.element.id) {
        return `//*[@id="${this.element.id}"]`
      }
      
      const parts = []
      let current = this.element
      
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.tagName.toLowerCase()
        
        if (current.id) {
          selector += `[@id="${current.id}"]`
          parts.unshift(selector)
          break
        } else {
          const siblings = Array.from(current.parentNode?.children || [])
            .filter(child => child.tagName === current.tagName)
          
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1
            selector += `[${index}]`
          }
          
          parts.unshift(selector)
        }
        
        current = current.parentNode
      }
      
      return `//${parts.join('/')}`
    }

    getElementPosition() {
      try {
        const rect = this.element.getBoundingClientRect()
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      } catch (e) {
        return { x: 0, y: 0, width: 0, height: 0 }
      }
    }

    checkVisibility() {
      if (!this.element.offsetParent && this.element.style.display !== 'none') return false
      if (this.element.style.visibility === 'hidden') return false
      if (this.element.style.opacity === '0') return false
      
      const rect = this.element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }

    checkInteractability() {
      if (!this.checkVisibility()) return false
      if (this.element.disabled) return false
      if (this.element.getAttribute('aria-disabled') === 'true') return false
      
      const computedStyle = window.getComputedStyle(this.element)
      if (computedStyle.pointerEvents === 'none') return false
      
      return true
    }

    getRelevantAttributes() {
      const relevantAttrs = [
        'type', 'name', 'value', 'href', 'src', 'alt', 'title', 
        'placeholder', 'aria-label', 'aria-describedby', 'role',
        'data-testid', 'data-test', 'data-qa'
      ]
      
      const attrs = {}
      for (const attr of relevantAttrs) {
        const value = this.element.getAttribute(attr)
        if (value !== null) {
          attrs[attr] = value
        }
      }
      
      return attrs
    }

    getAccessibilityInfo() {
      return {
        role: this.element.getAttribute('role'),
        ariaLabel: this.element.getAttribute('aria-label'),
        ariaDescribedBy: this.element.getAttribute('aria-describedby'),
        tabIndex: this.element.tabIndex,
        disabled: this.element.disabled,
        required: this.element.required,
        readonly: this.element.readOnly
      }
    }

    calculatePriority() {
      let priority = 0
      
      // Higher priority for visible elements
      if (this.basicData.visibility) priority += 10
      
      // Higher priority for interactive elements
      if (this.basicData.interactable) priority += 8
      
      // Higher priority for elements with text
      if (this.basicData.text.length > 0) priority += 5
      
      // Higher priority for buttons and links
      if (['button', 'link'].includes(this.basicData.role)) priority += 7
      
      // Higher priority for form elements
      if (['input', 'select', 'textarea'].includes(this.basicData.role)) priority += 6
      
      return priority
    }

    // Lazy loading methods for specialized data
    getScrollData() {
      if (!this.scrollData) {
        const startTime = performance.now()
        this.scrollData = this.extractScrollData()
        this.loadTimes.scroll = performance.now() - startTime
      }
      this.accessCount++
      this.lastAccess = Date.now()
      return this.scrollData
    }

    getNavigationData() {
      if (!this.navigationData) {
        const startTime = performance.now()
        this.navigationData = this.extractNavigationData()
        this.loadTimes.navigation = performance.now() - startTime
      }
      this.accessCount++
      this.lastAccess = Date.now()
      return this.navigationData
    }

    getMediaData() {
      if (!this.mediaData) {
        const startTime = performance.now()
        this.mediaData = this.extractMediaData()
        this.loadTimes.media = performance.now() - startTime
      }
      this.accessCount++
      this.lastAccess = Date.now()
      return this.mediaData
    }

    extractScrollData() {
      const element = this.element
      
      return {
        isScrollable: element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
        scrollPosition: { x: element.scrollLeft, y: element.scrollTop },
        scrollMax: { x: element.scrollWidth - element.clientWidth, y: element.scrollHeight - element.clientHeight },
        scrollBehavior: getComputedStyle(element).scrollBehavior || 'auto',
        scrollContainer: this.findScrollContainer(),
        direction: this.getScrollDirection()
      }
    }

    extractNavigationData() {
      const element = this.element
      
      return {
        linkType: this.getLinkType(),
        targetPage: element.href || '',
        opensInNewTab: element.target === '_blank',
        downloadLink: element.hasAttribute('download'),
        routingInfo: this.detectSPARouting(),
        breadcrumbLevel: this.getBreadcrumbLevel(),
        backButtonAvailable: window.history.length > 1
      }
    }

    extractMediaData() {
      const element = this.element
      const tagName = element.tagName.toLowerCase()
      
      if (!['video', 'audio', 'iframe'].includes(tagName)) {
        return null
      }
      
      return {
        mediaType: tagName,
        state: this.getMediaState(),
        duration: element.duration || 0,
        currentTime: element.currentTime || 0,
        volume: element.volume || 1,
        muted: element.muted || false,
        fullscreenCapable: !!element.requestFullscreen,
        playbackRate: element.playbackRate || 1,
        customPlayer: this.detectCustomPlayer(),
        controls: this.findMediaControls()
      }
    }

    // Helper methods for specialized data extraction
    findScrollContainer() {
      let parent = this.element.parentElement
      while (parent) {
        const style = getComputedStyle(parent)
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return parent
        }
        parent = parent.parentElement
      }
      return document.documentElement
    }

    getScrollDirection() {
      const style = getComputedStyle(this.element)
      if (style.overflowX !== 'hidden' && style.overflowY !== 'hidden') return 'both'
      if (style.overflowX !== 'hidden') return 'horizontal'
      if (style.overflowY !== 'hidden') return 'vertical'
      return 'none'
    }

    getLinkType() {
      const element = this.element
      if (!element.href) return null
      
      const url = new URL(element.href, window.location.href)
      if (url.hostname !== window.location.hostname) return 'external'
      if (url.hash) return 'anchor'
      if (element.href.startsWith('javascript:')) return 'javascript'
      return 'internal'
    }

    detectSPARouting() {
      // Simple SPA detection logic
      return {
        isRoute: this.element.href && !this.element.href.includes('.'),
        routePattern: this.element.href || ''
      }
    }

    getBreadcrumbLevel() {
      // Simple breadcrumb detection
      let level = 0
      let current = this.element
      while (current.parentElement) {
        if (current.parentElement.getAttribute('role') === 'navigation') {
          level++
        }
        current = current.parentElement
      }
      return level
    }

    getMediaState() {
      const element = this.element
      if (element.paused === false) return 'playing'
      if (element.paused === true) return 'paused'
      if (element.readyState === 0) return 'loading'
      return 'stopped'
    }

    detectCustomPlayer() {
      // Check for common custom player indicators
      const classes = this.element.className
      return classes.includes('video-js') || 
             classes.includes('plyr') || 
             classes.includes('jwplayer') ||
             classes.includes('player')
    }

    findMediaControls() {
      // Find associated media controls
      const controls = {}
      const parent = this.element.parentElement
      
      if (parent) {
        controls.play = parent.querySelector('[data-action="play"], .play-button')
        controls.pause = parent.querySelector('[data-action="pause"], .pause-button')
        controls.seek = parent.querySelector('[data-action="seek"], .seek-bar')
        controls.volume = parent.querySelector('[data-action="volume"], .volume-control')
        controls.fullscreen = parent.querySelector('[data-action="fullscreen"], .fullscreen-button')
      }
      
      return controls
    }

    // Update methods
    updateBasicData() {
      this.basicData.lastSeen = Date.now()
      this.basicData.updateCount++
      this.basicData.position = this.getElementPosition()
      this.basicData.visibility = this.checkVisibility()
      this.basicData.interactable = this.checkInteractability()
    }

    // Serialization for transport
    serialize() {
      return {
        elementId: this.basicData.id,
        tagName: this.basicData.tagName,
        text: this.basicData.text,
        role: this.basicData.role,
        confidence: Math.min(this.priority / 20, 1.0),
        position: this.basicData.position,
        visibility: this.basicData.visibility,
        interactable: this.basicData.interactable,
        selectors: this.basicData.selectors.slice(0, 3),
        attributes: this.basicData.attributes,
        accessibilityInfo: this.basicData.accessibilityInfo,
        // Performance data
        priority: this.priority,
        accessCount: this.accessCount,
        lastAccess: this.lastAccess
      }
    }
  }

  // Export the module
  window.DOMMonitorModules.EnhancedElementData = EnhancedElementData

  console.log("✅ DOM Monitor: Element Data module loaded")
})() 