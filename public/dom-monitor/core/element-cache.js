// DOM Monitor - Enhanced Element Cache Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Enhanced Element Cache Class with Multi-Index Classification
  class EnhancedElementCache {
    constructor(config = {}) {
      this.config = {
        maxSize: config.maxCacheSize || 500,
        cleanupInterval: config.cleanupInterval || 30000,
        maxAge: config.maxAge || 300000, // 5 minutes
        priorityElements: config.priorityElements || 100,
        ...config
      }
      
      // REDESIGNED: Multi-index cache structure for classification
      this.cache = {
        // Main element storage
        elements: new Map(), // elementId -> full element data
        
        // Classification indexes for fast category lookups
        classifications: {
          // By HTML element type
          byType: {
            button: new Set(),
            link: new Set(), 
            input: new Set(),
            select: new Set(),
            textarea: new Set(),
            form: new Set(),
            video: new Set(),
            audio: new Set(),
            iframe: new Set(),
            div: new Set(),
            span: new Set(),
            img: new Set()
          },
          
          // By action capability
          byAction: {
            clickable: new Set(),
            typeable: new Set(),
            selectable: new Set(),
            scrollable: new Set(),
            hoverable: new Set(),
            draggable: new Set()
          },
          
          // By context/purpose
          byContext: {
            navigation: new Set(),
            form: new Set(),
            media: new Set(),
            content: new Set(),
            button: new Set(),
            menu: new Set()
          }
        }
      }
      
      this.accessCount = new Map()
      this.lastAccess = new Map()
      
      // Legacy search indexes (kept for backward compatibility)
      this.textIndex = new Map()
      this.roleIndex = new Map()
      this.selectorIndex = new Map()
      this.attributeIndex = new Map()
      
      // Performance tracking
      this.performanceManager = null
      this.serializer = null
      
      // Statistics
      this.stats = {
        totalElements: 0,
        visibleElements: 0,
        interactableElements: 0,
        cacheHits: 0,
        cacheMisses: 0,
        indexUpdates: 0,
        lastCleanup: Date.now(),
        classifications: {
          clickable: 0,
          typeable: 0,
          navigation: 0,
          form: 0,
          media: 0
        }
      }
    }

    // Initialize with dependencies
    initialize(performanceManager, serializer) {
      this.performanceManager = performanceManager
      this.serializer = serializer
      
      console.log("✅ DOM Monitor: Enhanced Element Cache with Classification initialized")
    }

    // MAIN CLASSIFICATION METHOD: Add element and classify it
    async addElement(element) {
      if (!this.isRelevantElement(element)) {
        return null
      }

      const addOperation = async () => {
        return this._addElementInternal(element)
      }

      if (this.performanceManager) {
        const result = await this.performanceManager.executeWithBudget(
          addOperation, 
          16, // Max 16ms per element
          'addElement'
        )
        
        if (result.success) {
          return result.result
        } else if (result.throttled) {
          console.log("DOM Monitor: Element addition throttled")
          return null
        }
      }
      
      return addOperation()
    }

    _addElementInternal(element) {
      try {
        // Create enhanced element data
        const elementData = new window.DOMMonitorModules.EnhancedElementData(element, this.config)
        const elementId = elementData.basicData.id
        
        const existing = this.cache.elements.get(elementId)
        
        if (existing) {
          // Update existing element
          existing.updateBasicData()
          this.updateAccessCount(elementId)
          this.stats.cacheHits++
          
          // Re-classify in case properties changed
          this._classifyElement(elementId, elementData)
          
          if (this.isDebug()) {
            console.debug("📦 DOM Monitor: Cache UPDATED", { elementId, tag: element.tagName, text: existing.basicData?.text })
          }
          
          return elementId
        }
        
        // Check cache size and cleanup if needed
        if (this.cache.elements.size >= this.config.maxSize) {
          this.evictLeastRecentlyUsed()
        }
        
        // Add new element to main storage
        this.cache.elements.set(elementId, elementData)
        
        // CRITICAL: Classify the element into appropriate categories
        this._classifyElement(elementId, elementData)
        
        // Update legacy indexes for backward compatibility
        this.updateSearchIndexes(elementId, elementData)
        this.updateAccessCount(elementId)
        this.updateStats(elementData)
        this.stats.cacheMisses++
        
        if (this.isDebug()) {
          console.debug("📦 DOM Monitor: Cache ADD with classification", { 
            elementId, 
            tag: element.tagName, 
            text: elementData.basicData?.text,
            classifications: this._getElementClassifications(elementId)
          })
        }
        
        return elementId
        
      } catch (error) {
        console.warn('DOM Monitor: Error adding element to cache:', error)
        return null
      }
    }

    // CLASSIFICATION LOGIC: Automatically classify elements into categories
    _classifyElement(elementId, elementData) {
      const basicData = elementData.basicData
      const tag = basicData.tagName.toLowerCase()
      const attributes = basicData.attributes || {}
      const role = basicData.role.toLowerCase()
      
      // Clear existing classifications for this element
      this._removeFromAllClassifications(elementId)
      
      // Classify by HTML type
      if (this.cache.classifications.byType[tag]) {
        this.cache.classifications.byType[tag].add(elementId)
      }
      
      // Classify by action capability
      this._classifyByAction(elementId, basicData, tag, attributes, role)
      
      // Classify by context/purpose  
      this._classifyByContext(elementId, basicData, tag, attributes, role)
      
      // Update classification stats
      this._updateClassificationStats()
    }

    _classifyByAction(elementId, basicData, tag, attributes, role) {
      // CLICKABLE elements
      if (this._isClickable(tag, attributes, role, basicData)) {
        this.cache.classifications.byAction.clickable.add(elementId)
      }
      
      // TYPEABLE elements  
      if (this._isTypeable(tag, attributes, role)) {
        this.cache.classifications.byAction.typeable.add(elementId)
      }
      
      // SELECTABLE elements
      if (this._isSelectable(tag, attributes, role)) {
        this.cache.classifications.byAction.selectable.add(elementId)
      }
      
      // SCROLLABLE elements
      if (this._isScrollable(basicData)) {
        this.cache.classifications.byAction.scrollable.add(elementId)
      }
      
      // HOVERABLE elements (have hover effects)
      if (this._isHoverable(tag, attributes, basicData)) {
        this.cache.classifications.byAction.hoverable.add(elementId)
      }
      
      // DRAGGABLE elements
      if (this._isDraggable(attributes)) {
        this.cache.classifications.byAction.draggable.add(elementId)
      }
    }

    _classifyByContext(elementId, basicData, tag, attributes, role) {
      // NAVIGATION context
      if (this._isNavigation(tag, attributes, role, basicData)) {
        this.cache.classifications.byContext.navigation.add(elementId)
      }
      
      // FORM context
      if (this._isFormContext(tag, attributes, role)) {
        this.cache.classifications.byContext.form.add(elementId)
      }
      
      // MEDIA context
      if (this._isMediaContext(tag, attributes)) {
        this.cache.classifications.byContext.media.add(elementId)
      }
      
      // CONTENT context 
      if (this._isContentContext(tag, basicData)) {
        this.cache.classifications.byContext.content.add(elementId)
      }
      
      // BUTTON context (specific button-like elements)
      if (this._isButtonContext(tag, attributes, role)) {
        this.cache.classifications.byContext.button.add(elementId)
      }
      
      // MENU context
      if (this._isMenuContext(tag, attributes, role)) {
        this.cache.classifications.byContext.menu.add(elementId)
      }
    }

    // CLASSIFICATION HELPERS: Determine what categories an element belongs to
    
    _isClickable(tag, attributes, role, basicData) {
      return (
        tag === 'button' ||
        tag === 'a' ||
        role === 'button' ||
        role === 'link' ||
        attributes.onclick ||
        attributes.tabindex ||
        basicData.interactable ||
        this._hasClickableClass(attributes.className)
      )
    }
    
    _isTypeable(tag, attributes, role) {
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        role === 'textbox' ||
        attributes.contenteditable === 'true' ||
        (tag === 'input' && this._isTypableInputType(attributes.type))
      )
    }
    
    _isSelectable(tag, attributes, role) {
      return (
        tag === 'select' ||
        role === 'listbox' ||
        role === 'combobox' ||
        (tag === 'input' && (attributes.type === 'checkbox' || attributes.type === 'radio'))
      )
    }
    
    _isScrollable(basicData) {
      // This would need element dimension checking - placeholder for now
      return basicData.position && (basicData.position.height > 100 || basicData.position.width > 100)
    }
    
    _isHoverable(tag, attributes, basicData) {
      return (
        attributes.title ||
        attributes['data-tooltip'] ||
        attributes['aria-label'] ||
        this._hasHoverClass(attributes.className)
      )
    }
    
    _isDraggable(attributes) {
      return attributes.draggable === 'true' || this._hasDraggableClass(attributes.className)
    }
    
    _isNavigation(tag, attributes, role, basicData) {
      return (
        tag === 'nav' ||
        tag === 'a' ||
        role === 'navigation' ||
        role === 'link' ||
        this._hasNavigationClass(attributes.className) ||
        this._isNavigationText(basicData.text)
      )
    }
    
    _isFormContext(tag, attributes, role) {
      return (
        tag === 'form' ||
        tag === 'input' ||
        tag === 'select' ||
        tag === 'textarea' ||
        tag === 'button' ||
        tag === 'fieldset' ||
        tag === 'label' ||
        role === 'form' ||
        attributes.form
      )
    }
    
    _isMediaContext(tag, attributes) {
      return (
        tag === 'video' ||
        tag === 'audio' ||
        tag === 'iframe' ||
        this._hasMediaClass(attributes.className)
      )
    }
    
    _isContentContext(tag, basicData) {
      const contentTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'article', 'section']
      return contentTags.includes(tag) && basicData.text && basicData.text.length > 5
    }
    
    _isButtonContext(tag, attributes, role) {
      return (
        tag === 'button' ||
        role === 'button' ||
        (tag === 'input' && ['button', 'submit', 'reset'].includes(attributes.type)) ||
        this._hasButtonClass(attributes.className)
      )
    }
    
    _isMenuContext(tag, attributes, role) {
      return (
        role === 'menu' ||
        role === 'menubar' ||
        role === 'menuitem' ||
        this._hasMenuClass(attributes.className)
      )
    }

    // HELPER METHODS for class-based detection
    _hasClickableClass(className) {
      if (!className) return false
      const clickableClasses = ['btn', 'button', 'click', 'link', 'clickable']
      return clickableClasses.some(cls => className.includes(cls))
    }
    
    _hasNavigationClass(className) {
      if (!className) return false
      const navClasses = ['nav', 'menu', 'breadcrumb', 'link', 'navigation']
      return navClasses.some(cls => className.includes(cls))
    }
    
    _hasButtonClass(className) {
      if (!className) return false
      const buttonClasses = ['btn', 'button', 'submit', 'action']
      return buttonClasses.some(cls => className.includes(cls))
    }
    
    _hasMenuClass(className) {
      if (!className) return false
      const menuClasses = ['menu', 'dropdown', 'nav', 'submenu']
      return menuClasses.some(cls => className.includes(cls))
    }
    
    _hasHoverClass(className) {
      if (!className) return false
      const hoverClasses = ['tooltip', 'hover', 'popup', 'dropdown']
      return hoverClasses.some(cls => className.includes(cls))
    }
    
    _hasDraggableClass(className) {
      if (!className) return false
      const dragClasses = ['draggable', 'sortable', 'moveable']
      return dragClasses.some(cls => className.includes(cls))
    }
    
    _hasMediaClass(className) {
      if (!className) return false
      const mediaClasses = ['video', 'audio', 'player', 'media']
      return mediaClasses.some(cls => className.includes(cls))
    }
    
    _isTypableInputType(type) {
      const typableTypes = ['text', 'email', 'password', 'search', 'tel', 'url', 'number']
      return !type || typableTypes.includes(type.toLowerCase())
    }
    
    _isNavigationText(text) {
      if (!text) return false
      const navWords = ['home', 'about', 'contact', 'menu', 'navigation', 'nav', 'back', 'next', 'previous']
      const lowerText = text.toLowerCase()
      return navWords.some(word => lowerText.includes(word))
    }

    // CATEGORY-BASED QUERY METHODS: Main API for agent requests
    
    async findByCategory(category, options = {}) {
      console.log(`🔍 DOM Monitor: Finding elements by category '${category}'`)
      
      const results = this._getElementsByCategory(category)
      
      if (results.length === 0) {
        console.log(`⚠️ DOM Monitor: No elements found for category '${category}'`)
        return []
      }
      
      console.log(`✅ DOM Monitor: Found ${results.length} elements for category '${category}'`)
      
      // Convert to agent-friendly format
      return results.map(elementData => ({
        elementId: elementData.basicData.id,
        element: elementData.basicData,
        confidence: Math.min(elementData.priority / 20, 1.0),
        totalScore: elementData.priority,
        classifications: this._getElementClassifications(elementData.basicData.id)
      })).slice(0, options.limit || 20)
    }
    
    _getElementsByCategory(category) {
      const results = []
      let elementIds = new Set()
      
      // Map category requests to classification sets
      switch (category.toLowerCase()) {
        // Action-based categories
        case 'get_clickable_elements':
        case 'clickable':
          elementIds = this.cache.classifications.byAction.clickable
          break
          
        case 'get_form_elements':
        case 'get_type_targets':
        case 'typeable':
          elementIds = this.cache.classifications.byAction.typeable
          break
          
        case 'get_navigation_elements':
        case 'navigation':
          elementIds = this.cache.classifications.byContext.navigation
          break
          
        case 'get_media_elements':
        case 'media':
          elementIds = this.cache.classifications.byContext.media
          break
          
        case 'get_select_targets':
        case 'selectable':
          elementIds = this.cache.classifications.byAction.selectable
          break
          
        case 'get_scroll_targets':
        case 'scrollable':
          elementIds = this.cache.classifications.byAction.scrollable
          break
          
        // Type-based categories
        case 'get_buttons':
        case 'buttons':
          elementIds = this.cache.classifications.byType.button
          break
          
        case 'get_links':
        case 'links':
          elementIds = this.cache.classifications.byType.link
          break
          
        case 'get_inputs':
        case 'inputs':
          elementIds = this.cache.classifications.byType.input
          break
          
        // Combined categories
        case 'get_all_interactive':
        case 'interactive':
          // Combine clickable, typeable, selectable
          elementIds = new Set([
            ...this.cache.classifications.byAction.clickable,
            ...this.cache.classifications.byAction.typeable,
            ...this.cache.classifications.byAction.selectable
          ])
          break
          
        case 'get_visible_elements':
        case 'visible':
          // Return all cached elements that are visible
          elementIds = new Set(this.cache.elements.keys())
          break
          
        default:
          console.warn(`DOM Monitor: Unknown category '${category}'`)
          return []
      }
      
      // Convert element IDs to element data, filtering for visible/interactable
      for (const elementId of elementIds) {
        const elementData = this.cache.elements.get(elementId)
        if (elementData && elementData.basicData.visibility && elementData.basicData.interactable) {
          results.push(elementData)
        }
      }
      
      return results.sort((a, b) => b.priority - a.priority)
    }

    // MISSING METHODS: Add the referenced classification methods
    
    _removeFromAllClassifications(elementId) {
      // Remove element from all classification sets
      Object.values(this.cache.classifications.byType).forEach(set => set.delete(elementId))
      Object.values(this.cache.classifications.byAction).forEach(set => set.delete(elementId))
      Object.values(this.cache.classifications.byContext).forEach(set => set.delete(elementId))
    }
    
    _updateClassificationStats() {
      this.stats.classifications.clickable = this.cache.classifications.byAction.clickable.size
      this.stats.classifications.typeable = this.cache.classifications.byAction.typeable.size
      this.stats.classifications.navigation = this.cache.classifications.byContext.navigation.size
      this.stats.classifications.form = this.cache.classifications.byContext.form.size
      this.stats.classifications.media = this.cache.classifications.byContext.media.size
    }
    
    _getElementClassifications(elementId) {
      const classifications = {
        byType: [],
        byAction: [],
        byContext: []
      }
      
      // Check which type classifications this element belongs to
      for (const [type, set] of Object.entries(this.cache.classifications.byType)) {
        if (set.has(elementId)) {
          classifications.byType.push(type)
        }
      }
      
      // Check action classifications
      for (const [action, set] of Object.entries(this.cache.classifications.byAction)) {
        if (set.has(elementId)) {
          classifications.byAction.push(action)
        }
      }
      
      // Check context classifications
      for (const [context, set] of Object.entries(this.cache.classifications.byContext)) {
        if (set.has(elementId)) {
          classifications.byContext.push(context)
        }
      }
      
      return classifications
    }

    // Enhanced element relevance check
    isRelevantElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
      
      const tag = element.tagName.toLowerCase()
      
      // Interactive tags
      const interactiveTags = [
        'button', 'a', 'input', 'select', 'textarea', 'form',
        'details', 'summary', 'label', 'video', 'audio'
      ]
      
      if (interactiveTags.includes(tag)) return true
      
      // Interactive attributes
      if (element.onclick || element.getAttribute('onclick')) return true
      if (element.getAttribute('role') === 'button') return true
      if (element.getAttribute('tabindex')) return true
      
      // Interactive classes
      const interactiveClasses = ['btn', 'button', 'link', 'clickable', 'interactive']
      if (interactiveClasses.some(cls => element.classList.contains(cls))) return true
      
      // Accessibility indicators
      if (element.getAttribute('aria-label')) return true
      if (element.getAttribute('data-testid')) return true
      
      // Content with meaningful text in clickable containers
      const text = element.textContent?.trim()
      if (text && text.length > 2 && text.length < 100) {
        const parent = element.parentElement
        if (parent && (parent.onclick || parent.style.cursor === 'pointer')) {
          return true
        }
      }
      
      return false
    }

    // UPDATED: Main findByIntent method to use new classification system
    async findByIntent(intent, options = {}) {
      console.log("🔍 DOM Monitor: Starting enhanced intent search:", { intent });
      console.log("🔍 DOM Monitor: Current cache size:", this.cache.elements.size);
      
      // ENHANCED: Better intent validation and fallback handling
      if (!intent || intent === 'undefined' || typeof intent !== 'string') {
        console.warn("⚠️ DOM Monitor: Invalid intent provided:", intent, "- using fallback to show all elements");
        return this._getFallbackElements();
      }
      
      const intentLower = intent.toLowerCase()
      
      // TRY CLASSIFICATION FIRST: Check if this is a category request
      if (this._isKnownCategory(intentLower)) {
        console.log("🎯 DOM Monitor: Using classification system for known category:", intentLower)
        return await this.findByCategory(intentLower, options)
      }
      
      // FALLBACK: Use legacy semantic search for specific terms
      console.log("🔍 DOM Monitor: Using legacy semantic search for:", intentLower)
      return this._findByIntentLegacy(intentLower, options)
    }
    
    _isKnownCategory(intent) {
      const knownCategories = [
        'get_clickable_elements', 'clickable',
        'get_form_elements', 'get_type_targets', 'typeable',
        'get_navigation_elements', 'navigation',
        'get_media_elements', 'media',
        'get_select_targets', 'selectable',
        'get_scroll_targets', 'scrollable',
        'get_buttons', 'buttons',
        'get_links', 'links', 
        'get_inputs', 'inputs',
        'get_all_interactive', 'interactive',
        'get_visible_elements', 'visible'
      ]
      
      return knownCategories.includes(intent)
    }
    
    _findByIntentLegacy(intentLower, options = {}) {
      // This is the original semantic search logic (kept for backward compatibility)
      const results = new Map()
      
      // Extract semantic keywords
      const keywords = this._extractSemanticKeywords(intentLower)
      
      // Multi-strategy search
      this._searchByText(keywords, results)
      this._searchByRole(intentLower, results)
      this._searchByAttributes(keywords, results)
      this._searchBySelectors(keywords, results)
      
      // Convert to array and sort by score
      const finalResults = Array.from(results.values())
        .filter(result => result.element.visibility && result.element.interactable)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, options.limit || 10)
      
      // If no results from semantic search, use fallback
      if (finalResults.length === 0) {
        console.log('DOM Monitor: No semantic results, using fallback for:', intentLower)
        return this._getFallbackElements(options)
      }
      
      return finalResults
    }

    // Check if intent is a default category
    _isDefaultIntent(intent) {
      const defaultIntents = [
        'get_all_interactive', 'get_clickable_elements', 'get_form_elements',
        'get_navigation_elements', 'get_media_elements', 'get_click_targets', 
        'get_type_targets', 'get_select_targets', 'get_scroll_targets',
        'get_buttons', 'get_links', 'get_inputs', 'get_visible_elements'
      ]
      return defaultIntents.includes(intent)
    }

    // Handle default intent categories with specific logic
    _handleDefaultIntent(intent, options = {}) {
      const results = new Map()
      
      console.log(`DOM Monitor: Processing default intent '${intent}' from cache of ${this.cache.elements.size} elements`)
      
      switch (intent) {
        case 'get_all_interactive':
          this._addAllInteractiveElements(results)
          break
          
        case 'get_clickable_elements':
        case 'get_click_targets':
          this._addClickableElements(results)
          break
          
        case 'get_form_elements':
        case 'get_type_targets':
          this._addFormElements(results)
          break
          
        case 'get_navigation_elements':
          this._addNavigationElements(results)
          break
          
        case 'get_media_elements':
          this._addMediaElements(results)
          break
          
        case 'get_select_targets':
          this._addSelectElements(results)
          break
          
        case 'get_scroll_targets':
          this._addScrollableElements(results)
          break
          
        case 'get_buttons':
          this._addButtonElements(results)
          break
          
        case 'get_links':
          this._addLinkElements(results)
          break
          
        case 'get_inputs':
          this._addInputElements(results)
          break
          
        case 'get_visible_elements':
          this._addVisibleElements(results)
          break
          
        default:
          console.log(`DOM Monitor: Unknown default intent '${intent}', using fallback`)
          return this._getFallbackElements(options)
      }
      
      return this._processDefaultIntentResults(results, options, intent)
    }

    // Specific element type handlers for default intents
    _addAllInteractiveElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility && basicData.interactable) {
          this._addElementToResults(results, elementId, data, 7.0, 'interactive_element')
        }
      }
    }

    _addClickableElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility && basicData.interactable) {
          const tag = basicData.tagName.toLowerCase()
          const role = basicData.role.toLowerCase()
          
          if (tag === 'button' || tag === 'a' || role === 'button' || role === 'link' ||
              basicData.attributes?.onclick || basicData.attributes?.tabindex) {
            this._addElementToResults(results, elementId, data, 8.0, 'clickable_element')
          }
        }
      }
    }

    _addFormElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility && basicData.interactable) {
          const tag = basicData.tagName.toLowerCase()
          
          if (['input', 'textarea', 'select', 'form'].includes(tag)) {
            this._addElementToResults(results, elementId, data, 9.0, 'form_element')
          }
        }
      }
    }

    _addNavigationElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility && basicData.interactable) {
          const tag = basicData.tagName.toLowerCase()
          const role = basicData.role.toLowerCase()
          
          if (tag === 'a' || role === 'link' || role === 'navigation' || tag === 'nav') {
            this._addElementToResults(results, elementId, data, 8.5, 'navigation_element')
          }
        }
      }
    }

    _addMediaElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        const tag = basicData.tagName.toLowerCase()
        
        if (['video', 'audio', 'iframe'].includes(tag)) {
          this._addElementToResults(results, elementId, data, 7.5, 'media_element')
        }
      }
    }

    _addSelectElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility && basicData.interactable) {
          const tag = basicData.tagName.toLowerCase()
          
          if (tag === 'select' || (tag === 'input' && basicData.attributes?.type === 'checkbox')) {
            this._addElementToResults(results, elementId, data, 8.5, 'select_element')
          }
        }
      }
    }

    _addScrollableElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility) {
          // Check if element might be scrollable
          if (basicData.position.height > 100 || basicData.position.width > 100) {
            this._addElementToResults(results, elementId, data, 6.0, 'scrollable_element')
          }
        }
      }
    }

    _addButtonElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility && basicData.interactable) {
          const tag = basicData.tagName.toLowerCase()
          const role = basicData.role.toLowerCase()
          
          if (tag === 'button' || role === 'button' || 
              (tag === 'input' && ['submit', 'button'].includes(basicData.attributes?.type))) {
            this._addElementToResults(results, elementId, data, 9.0, 'button_element')
          }
        }
      }
    }

    _addLinkElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility && basicData.interactable) {
          const tag = basicData.tagName.toLowerCase()
          const role = basicData.role.toLowerCase()
          
          if (tag === 'a' || role === 'link') {
            this._addElementToResults(results, elementId, data, 8.5, 'link_element')
          }
        }
      }
    }

    _addInputElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility && basicData.interactable) {
          const tag = basicData.tagName.toLowerCase()
          
          if (tag === 'input' || tag === 'textarea') {
            this._addElementToResults(results, elementId, data, 9.0, 'input_element')
          }
        }
      }
    }

    _addVisibleElements(results) {
      for (const [elementId, data] of this.cache.elements.entries()) {
        const basicData = data.basicData
        if (basicData.visibility) {
          this._addElementToResults(results, elementId, data, 6.0, 'visible_element')
        }
      }
    }

    // Helper method to add elements to results with consistent format
    _addElementToResults(results, elementId, data, score, source) {
      results.set(elementId, {
        elementId,
        element: data.basicData,
        scores: { [source]: score },
        totalScore: score,
        confidence: Math.min(score / 10, 0.95)
      })
    }

    // Process and return default intent results
    _processDefaultIntentResults(results, options, intent) {
      const finalResults = Array.from(results.values())
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, options.limit || 20)
      
      console.log(`DOM Monitor: Default intent '${intent}' found ${finalResults.length} elements`)
      
      if (this.isDebug() && finalResults.length > 0) {
        console.log(`DOM Monitor: Sample ${intent} results:`)
        finalResults.slice(0, 3).forEach((elem, i) => {
          console.log(`  ${i+1}. ${elem.element.tagName} - "${elem.element.text?.slice(0, 30) || 'no text'}" (score: ${elem.totalScore.toFixed(2)})`)
        })
      }
      
      return finalResults
    }

    _extractSemanticKeywords(intentLower) {
      const words = intentLower.split(/\s+/).filter(word => word.length > 2)
      const enhancedKeywords = [...words]
      
      // Enhanced semantic mappings for better matching
      const semanticMaps = {
        'about': ['about', 'about us', 'company', 'info', 'information'],
        'contact': ['contact', 'contact us', 'support', 'help', 'get in touch'],
        'login': ['login', 'log in', 'sign in', 'signin', 'authenticate'],
        'search': ['search', 'find', 'query', 'look for'],
        'submit': ['submit', 'send', 'go', 'continue', 'proceed'],
        'cancel': ['cancel', 'back', 'close', 'exit'],
        
        // Form field mappings with enhanced company field support
        'first': ['first', 'firstname', 'first_name', 'fname'],
        'last': ['last', 'lastname', 'last_name', 'lname'],
        'email': ['email', 'e-mail', 'mail', 'email_address'],
        'phone': ['phone', 'telephone', 'tel', 'mobile', 'number'],
        'password': ['password', 'pass', 'pwd', 'passcode'],
        'message': ['message', 'comment', 'note', 'feedback'],
        'company': ['company', 'organization', 'org', 'business', 'corp', 'employer', 'workplace'],
        'name': ['name', 'firstname', 'lastname', 'fullname', 'username']
      }
      
      // Enhanced word-level matching for better semantic detection
      words.forEach(word => {
        if (semanticMaps[word]) {
          enhancedKeywords.push(...semanticMaps[word])
        }
        
        // Add partial word matching for compound terms
        Object.keys(semanticMaps).forEach(key => {
          if (word.includes(key) || key.includes(word)) {
            enhancedKeywords.push(...semanticMaps[key])
          }
        })
      })
      
      return [...new Set(enhancedKeywords)]
    }

    _searchByText(keywords, results) {
      for (const searchTerm of keywords) {
        for (const [indexedWord, elementIds] of this.textIndex.entries()) {
          const similarity = this._calculateStringSimilarity(searchTerm, indexedWord)
          
          if (similarity >= 0.5) {
            for (const elementId of elementIds) {
              const element = this.cache.elements.get(elementId)
              if (element) {
                const score = similarity * 10
                this._addToResults(results, elementId, score, 'text')
              }
            }
          }
        }
      }
    }

    _searchByRole(intentLower, results) {
      const roleKeywords = {
        'click': ['button', 'link'],
        'type': ['input', 'textarea'],
        'select': ['select'],
        'submit': ['button', 'form'],
        'check': ['checkbox'],
        'play': ['video', 'audio'],
        'scroll': ['generic']
      }
      
      for (const [action, roles] of Object.entries(roleKeywords)) {
        if (intentLower.includes(action)) {
          for (const role of roles) {
            const elementIds = this.roleIndex.get(role)
            if (elementIds) {
              for (const elementId of elementIds) {
                const element = this.cache.elements.get(elementId)
                if (element) {
                  this._addToResults(results, elementId, 8, 'role')
                }
              }
            }
          }
        }
      }
    }

    _searchByAttributes(keywords, results) {
      for (const keyword of keywords) {
        for (const [attrValue, elementIds] of this.attributeIndex.entries()) {
          if (attrValue.includes(keyword)) {
            for (const elementId of elementIds) {
              const element = this.cache.elements.get(elementId)
              if (element) {
                this._addToResults(results, elementId, 6, 'attribute')
              }
            }
          }
        }
      }
    }

    _searchBySelectors(keywords, results) {
      for (const keyword of keywords) {
        for (const [selector, elementIds] of this.selectorIndex.entries()) {
          if (selector.includes(keyword)) {
            for (const elementId of elementIds) {
              const element = this.cache.elements.get(elementId)
              if (element) {
                this._addToResults(results, elementId, 4, 'selector')
              }
            }
          }
        }
      }
    }

    _calculateStringSimilarity(str1, str2) {
      if (str1 === str2) return 1.0
      if (str1.includes(str2) || str2.includes(str1)) return 0.8
      
      // Character overlap ratio
      const set1 = new Set(str1.toLowerCase())
      const set2 = new Set(str2.toLowerCase())
      const intersection = new Set([...set1].filter(x => set2.has(x)))
      const union = new Set([...set1, ...set2])
      
      return intersection.size / union.size
    }

    _addToResults(results, elementId, score, source) {
      const existing = results.get(elementId)
      if (existing) {
        existing.scores[source] = Math.max(existing.scores[source] || 0, score)
        existing.totalScore = Object.values(existing.scores).reduce((sum, s) => sum + s, 0)
      } else {
        results.set(elementId, {
          elementId,
          element: this.cache.elements.get(elementId).basicData,
          scores: { [source]: score },
          totalScore: score,
          confidence: Math.min(score / 10, 0.95)
        })
      }
    }

    _getFallbackElements(options = {}) {
      const elements = []
      
      console.log(`DOM Monitor: Getting fallback elements from cache of ${this.cache.elements.size} elements`)
      
      for (const [elementId, data] of this.cache.elements.entries()) {
        // Be more lenient with fallback - include all cached elements that are relevant
        const basicData = data.basicData
        const isRelevant = this._isElementRelevantForFallback(basicData)
        
        if (isRelevant) {
          elements.push({
            elementId,
            element: basicData,
            scores: { fallback: data.priority / 20 },
            totalScore: data.priority / 20,
            confidence: 0.6
          })
        }
      }
      
      console.log(`DOM Monitor: Fallback found ${elements.length} relevant elements`)
      
      const sortedElements = elements
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, options.limit || 20) // Increase default limit
      
      // Log sample of returned elements for debugging
      if (this.isDebug() && sortedElements.length > 0) {
        console.log('DOM Monitor: Sample fallback elements:')
        sortedElements.slice(0, 3).forEach((elem, i) => {
          console.log(`  ${i+1}. ${elem.element.tagName} - "${elem.element.text?.slice(0, 30) || 'no text'}" (score: ${elem.totalScore.toFixed(2)})`)
        })
      }
      
      return sortedElements
    }

    _isElementRelevantForFallback(basicData) {
      // Check if element is potentially interactive
      const tag = basicData.tagName?.toLowerCase() || ''
      const role = basicData.role?.toLowerCase() || ''
      const text = basicData.text || ''
      const attributes = basicData.attributes || {}
      
      // Interactive tags
      if (['button', 'a', 'input', 'select', 'textarea', 'form'].includes(tag)) {
        return true
      }
      
      // Interactive roles
      if (['button', 'link', 'input', 'textbox'].includes(role)) {
        return true
      }
      
      // Has click handlers or interactive attributes
      if (attributes.onclick || attributes['data-testid'] || attributes.tabindex) {
        return true
      }
      
      // Has meaningful text and might be clickable
      if (text.length > 2 && text.length < 100) {
        return true
      }
      
      // If marked as interactable by the system, include it
      if (basicData.interactable) {
        return true
      }
      
      return false
    }

    // Enhanced indexing with performance budgeting
    updateSearchIndexes(elementId, elementData) {
      try {
        this._updateTextIndex(elementId, elementData)
        this._updateRoleIndex(elementId, elementData)
        this._updateSelectorIndex(elementId, elementData)
        this._updateAttributeIndex(elementId, elementData)
        
        this.stats.indexUpdates++
        
      } catch (error) {
        console.warn('DOM Monitor: Error updating search indexes:', error)
      }
    }

    _updateTextIndex(elementId, elementData) {
      const searchableTexts = []
      
      // Add element text
      if (elementData.basicData.text) {
        searchableTexts.push(elementData.basicData.text.toLowerCase())
      }
      
      // Add attribute-based text
      const attributes = elementData.basicData.attributes || {}
      const searchableAttributes = [
        'name', 'placeholder', 'aria-label', 'title', 'alt', 'value'
      ]
      
      for (const attrName of searchableAttributes) {
        const attrValue = attributes[attrName]
        if (attrValue && typeof attrValue === 'string') {
          searchableTexts.push(attrValue.toLowerCase())
          
          // Split camelCase
          if (attrName === 'name' && /[A-Z]/.test(attrValue)) {
            const splitWords = attrValue.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
            searchableTexts.push(splitWords)
          }
        }
      }
      
      // Index all searchable text
      const allText = searchableTexts.join(' ')
      if (allText.trim()) {
        const words = allText.split(/\s+/).filter(word => word.length > 2)
        
        for (const word of words) {
          if (!this.textIndex.has(word)) {
            this.textIndex.set(word, new Set())
          }
          this.textIndex.get(word).add(elementId)
        }
      }
    }

    _updateRoleIndex(elementId, elementData) {
      const role = elementData.basicData.role
      if (!this.roleIndex.has(role)) {
        this.roleIndex.set(role, new Set())
      }
      this.roleIndex.get(role).add(elementId)
    }

    _updateSelectorIndex(elementId, elementData) {
      const selectors = elementData.basicData.selectors || []
      for (const selector of selectors) {
        if (!this.selectorIndex.has(selector.value)) {
          this.selectorIndex.set(selector.value, new Set())
        }
        this.selectorIndex.get(selector.value).add(elementId)
      }
    }

    _updateAttributeIndex(elementId, elementData) {
      const attributes = elementData.basicData.attributes || {}
      for (const [key, value] of Object.entries(attributes)) {
        if (value && typeof value === 'string') {
          const indexKey = `${key}:${value.toLowerCase()}`
          if (!this.attributeIndex.has(indexKey)) {
            this.attributeIndex.set(indexKey, new Set())
          }
          this.attributeIndex.get(indexKey).add(elementId)
        }
      }
    }

    // Memory management
    updateAccessCount(elementId) {
      const count = this.accessCount.get(elementId) || 0
      this.accessCount.set(elementId, count + 1)
      this.lastAccess.set(elementId, Date.now())
    }

    evictLeastRecentlyUsed() {
      let oldestTime = Date.now()
      let oldestId = null
      
      for (const [id, time] of this.lastAccess.entries()) {
        if (time < oldestTime) {
          oldestTime = time
          oldestId = id
        }
      }
      
      if (oldestId) {
        this.removeElement(oldestId)
      }
    }

    removeElement(elementId) {
      const data = this.cache.elements.get(elementId)
      if (!data) return false
      
      if (this.isDebug()) {
        console.debug("📦 DOM Monitor: Cache REMOVE", { elementId, tag: data.basicData?.tagName, text: data.basicData?.text })
      }
      
      // CRITICAL: Remove from classifications first
      this._removeFromAllClassifications(elementId)
      
      // Remove from main cache
      this.cache.elements.delete(elementId)
      this.accessCount.delete(elementId)
      this.lastAccess.delete(elementId)
      
      // Remove from legacy search indexes
      this.removeFromSearchIndexes(elementId, data)
      this.updateStatsAfterRemoval(data)
      
      return true
    }

    removeFromSearchIndexes(elementId, elementData) {
      // Remove from text index
      this._removeFromTextIndex(elementId, elementData)
      
      // Remove from role index
      const roleSet = this.roleIndex.get(elementData.basicData.role)
      if (roleSet) {
        roleSet.delete(elementId)
        if (roleSet.size === 0) {
          this.roleIndex.delete(elementData.basicData.role)
        }
      }
      
      // Remove from selector index
      const selectors = elementData.basicData.selectors || []
      for (const selector of selectors) {
        const selectorSet = this.selectorIndex.get(selector.value)
        if (selectorSet) {
          selectorSet.delete(elementId)
          if (selectorSet.size === 0) {
            this.selectorIndex.delete(selector.value)
          }
        }
      }
      
      // Remove from attribute index
      const attributes = elementData.basicData.attributes || {}
      for (const [key, value] of Object.entries(attributes)) {
        if (value && typeof value === 'string') {
          const indexKey = `${key}:${value.toLowerCase()}`
          const attrSet = this.attributeIndex.get(indexKey)
          if (attrSet) {
            attrSet.delete(elementId)
            if (attrSet.size === 0) {
              this.attributeIndex.delete(indexKey)
            }
          }
        }
      }
    }

    _removeFromTextIndex(elementId, elementData) {
      // Recreate the same searchable text as in _updateTextIndex
      const searchableTexts = []
      
      if (elementData.basicData.text) {
        searchableTexts.push(elementData.basicData.text.toLowerCase())
      }
      
      const attributes = elementData.basicData.attributes || {}
      const searchableAttributes = ['name', 'placeholder', 'aria-label', 'title', 'alt', 'value']
      
      for (const attrName of searchableAttributes) {
        const attrValue = attributes[attrName]
        if (attrValue && typeof attrValue === 'string') {
          searchableTexts.push(attrValue.toLowerCase())
          
          if (attrName === 'name' && /[A-Z]/.test(attrValue)) {
            const splitWords = attrValue.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
            searchableTexts.push(splitWords)
          }
        }
      }
      
      const allText = searchableTexts.join(' ')
      if (allText.trim()) {
        const words = allText.split(/\s+/).filter(word => word.length > 2)
        for (const word of words) {
          const wordSet = this.textIndex.get(word)
          if (wordSet) {
            wordSet.delete(elementId)
            if (wordSet.size === 0) {
              this.textIndex.delete(word)
            }
          }
        }
      }
    }

    // Statistics and reporting
    updateStats(elementData) {
      this.stats.totalElements = this.cache.elements.size
      
      if (elementData.basicData.visibility) {
        this.stats.visibleElements++
      }
      
      if (elementData.basicData.interactable) {
        this.stats.interactableElements++
      }
    }

    updateStatsAfterRemoval(elementData) {
      this.stats.totalElements = this.cache.elements.size
      
      if (elementData.basicData.visibility) {
        this.stats.visibleElements = Math.max(0, this.stats.visibleElements - 1)
      }
      
      if (elementData.basicData.interactable) {
        this.stats.interactableElements = Math.max(0, this.stats.interactableElements - 1)
      }
    }

    getStats() {
      // Update classification stats before returning
      this._updateClassificationStats()
      
      return {
        totalElements: this.cache.elements.size,
        visibleElements: this.stats.visibleElements,
        interactableElements: this.stats.interactableElements,
        textIndexSize: this.textIndex.size,
        roleIndexSize: this.roleIndex.size,
        selectorIndexSize: this.selectorIndex.size,
        attributeIndexSize: this.attributeIndex.size,
        cacheHits: this.stats.cacheHits,
        cacheMisses: this.stats.cacheMisses,
        indexUpdates: this.stats.indexUpdates,
        memoryUsage: this.estimateMemoryUsage(),
        lastCleanup: this.stats.lastCleanup,
        classifications: this.stats.classifications
      }
    }

    // NEW: Get classification summary for debugging
    getClassificationSummary() {
      const summary = {
        byType: {},
        byAction: {},
        byContext: {}
      }
      
      // Count elements in each classification
      for (const [type, set] of Object.entries(this.cache.classifications.byType)) {
        summary.byType[type] = set.size
      }
      
      for (const [action, set] of Object.entries(this.cache.classifications.byAction)) {
        summary.byAction[action] = set.size
      }
      
      for (const [context, set] of Object.entries(this.cache.classifications.byContext)) {
        summary.byContext[context] = set.size
      }
      
      return summary
    }

    estimateMemoryUsage() {
      // Rough estimation in KB
      const avgElementSize = 2 // KB per element
      const indexOverhead = Math.round((this.textIndex.size + this.roleIndex.size + this.selectorIndex.size) * 0.1)
      return Math.round(this.cache.elements.size * avgElementSize + indexOverhead)
    }

    // IMPROVED: More conservative cleanup to prevent over-cleaning
    cleanup() {
      const now = Date.now()
      const maxAge = this.config.maxAge
      const toRemove = []
      
      // Only cleanup if we haven't cleaned recently (prevent cleanup loops)
      if (now - this.stats.lastCleanup < 10000) { // 10 second minimum between cleanups
        console.log("🧹 DOM Monitor: Skipping cleanup, too recent")
        return {
          removed: 0,
          remaining: this.cache.elements.size,
          skipped: true
        }
      }
      
      for (const [elementId, data] of this.cache.elements.entries()) {
        if (now - data.basicData.lastSeen > maxAge) {
          // Additional check: only remove if element no longer exists in DOM
          if (!document.contains(data.element)) {
            toRemove.push(elementId)
          }
        }
      }
      
      for (const elementId of toRemove) {
        this.removeElement(elementId)
      }
      
      this.stats.lastCleanup = now
      
      if (toRemove.length > 0) {
        console.log(`🧹 DOM Monitor: Cleaned up ${toRemove.length} stale elements`)
      }
      
      return {
        removed: toRemove.length,
        remaining: this.cache.elements.size,
        skipped: false
      }
    }

    // NEW: Verify cache consistency and remove stale elements
    verifyAndCleanCache() {
      console.log("🔍 DOM Monitor: Verifying cache consistency...")
      
      const toRemove = []
      let checkedCount = 0
      let staleCount = 0
      
      for (const [elementId, data] of this.cache.elements.entries()) {
        checkedCount++
        
        // Check if element still exists in DOM
        if (!document.contains(data.element)) {
          toRemove.push(elementId)
          staleCount++
          
          if (this.isDebug()) {
            console.debug(`🗑️ DOM Monitor: Found stale element`, {
              elementId,
              tag: data.basicData.tagName,
              text: data.basicData.text?.slice(0, 30) || ''
            })
          }
        }
      }
      
      // Remove stale elements
      for (const elementId of toRemove) {
        this.removeElement(elementId)
      }
      
      const result = {
        checked: checkedCount,
        staleFound: staleCount,
        removed: toRemove.length,
        remaining: this.cache.elements.size
      }
      
      if (staleCount > 0) {
        console.log(`🧹 DOM Monitor: Cache verification complete - removed ${staleCount} stale elements out of ${checkedCount} checked`)
      } else {
        console.log(`✅ DOM Monitor: Cache verification complete - no stale elements found (${checkedCount} checked)`)
      }
      
      return result
    }

    // NEW: Force complete cache refresh
    async forceRefresh() {
      console.log("🔄 DOM Monitor: Starting force cache refresh...")
      
      // Clear everything
      this.clear()
      
      // Re-scan DOM for relevant elements
      const selectors = [
        'button', 'a[href]', 'input', 'select', 'textarea', 'form',
        '[onclick]', '[role="button"]', '[role="link"]', '[tabindex]',
        '.btn', '.button', '.link', '.clickable', '[data-testid]'
      ]
      
      const elements = document.querySelectorAll(selectors.join(','))
      let addedCount = 0
      let skippedCount = 0
      
      console.log(`🔄 DOM Monitor: Found ${elements.length} potential elements to re-cache`)
      
      for (const element of elements) {
        try {
          if (this.isRelevantElement(element)) {
            const elementId = await this.addElement(element)
            if (elementId) {
              addedCount++
            } else {
              skippedCount++
            }
          } else {
            skippedCount++
          }
        } catch (error) {
          console.warn("DOM Monitor: Error during force refresh:", error)
          skippedCount++
        }
      }
      
      const result = {
        elementsFound: elements.length,
        elementsAdded: addedCount,
        elementsSkipped: skippedCount,
        finalCacheSize: this.cache.elements.size,
        classifications: this.getClassificationSummary()
      }
      
      console.log(`✅ DOM Monitor: Force refresh complete - Added: ${addedCount}, Skipped: ${skippedCount}, Final cache size: ${this.cache.elements.size}`)
      
      return result
    }

    getAllElements(filter = {}) {
      const elements = []
      
      for (const [elementId, data] of this.cache.elements.entries()) {
        // Apply filters
        if (filter.visible && !data.basicData.visibility) continue
        if (filter.interactable && !data.basicData.interactable) continue
        if (filter.role && data.basicData.role !== filter.role) continue
        if (filter.tag && data.basicData.tagName !== filter.tag) continue
        
        // Safely serialize the data
        const serializedData = typeof data.serialize === 'function' 
          ? data.serialize() 
          : data.basicData;
        
        elements.push({
          elementId,
          ...serializedData,
          confidence: Math.min(data.priority / 20, 1.0)
        })
      }
      
      return elements.sort((a, b) => (b.priority || 0) - (a.priority || 0))
    }

    clear() {
      // Clear main cache
      this.cache.elements.clear()
      
      // Clear all classification indexes
      Object.values(this.cache.classifications.byType).forEach(set => set.clear())
      Object.values(this.cache.classifications.byAction).forEach(set => set.clear())
      Object.values(this.cache.classifications.byContext).forEach(set => set.clear())
      
      this.accessCount.clear()
      this.lastAccess.clear()
      this.textIndex.clear()
      this.roleIndex.clear()
      this.selectorIndex.clear()
      this.attributeIndex.clear()
      
      this.stats = {
        totalElements: 0,
        visibleElements: 0,
        interactableElements: 0,
        cacheHits: 0,
        cacheMisses: 0,
        indexUpdates: 0,
        lastCleanup: Date.now(),
        classifications: {
          clickable: 0,
          typeable: 0,
          navigation: 0,
          form: 0,
          media: 0
        }
      }
      
      console.log("🧹 DOM Monitor: Cache completely cleared and reset")
    }

    // NEW: helper to detect debug mode
    isDebug() {
      return this.config.debugMode || (window.DOMMonitor && window.DOMMonitor.config && window.DOMMonitor.config.debugMode)
    }
  }

  // Export the module
  window.DOMMonitorModules.EnhancedElementCache = EnhancedElementCache

  console.log("✅ DOM Monitor: Enhanced Element Cache module loaded")
})() 