// DOM Monitor - Enhanced Element Cache Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Enhanced Element Cache Class
  class EnhancedElementCache {
    constructor(config = {}) {
      this.config = {
        maxSize: config.maxCacheSize || 500,
        cleanupInterval: config.cleanupInterval || 30000,
        maxAge: config.maxAge || 300000, // 5 minutes
        priorityElements: config.priorityElements || 100,
        ...config
      }
      
      // Core data structures
      this.cache = new Map()
      this.accessCount = new Map()
      this.lastAccess = new Map()
      
      // Enhanced search indexes
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
        lastCleanup: Date.now()
      }
    }

    // Initialize with dependencies
    initialize(performanceManager, serializer) {
      this.performanceManager = performanceManager
      this.serializer = serializer
      
      console.log("✅ DOM Monitor: Enhanced Element Cache initialized")
    }

    // Add element with performance budgeting
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
        
        const existing = this.cache.get(elementId)
        
        if (existing) {
          // Update existing element
          existing.updateBasicData()
          this.updateAccessCount(elementId)
          this.stats.cacheHits++
          
          if (this.isDebug()) {
            console.debug("📦 DOM Monitor: Cache UPDATED", { elementId, tag: element.tagName, text: existing.basicData?.text })
          }
          
          return elementId
        }
        
        // Check cache size and cleanup if needed
        if (this.cache.size >= this.config.maxSize) {
          this.evictLeastRecentlyUsed()
        }
        
        // Add new element
        this.cache.set(elementId, elementData)
        this.updateSearchIndexes(elementId, elementData)
        this.updateAccessCount(elementId)
        this.updateStats(elementData)
        this.stats.cacheMisses++
        
        if (this.isDebug()) {
          console.debug("📦 DOM Monitor: Cache ADD", { elementId, tag: element.tagName, text: elementData.basicData?.text })
        }
        
        return elementId
        
      } catch (error) {
        console.warn('DOM Monitor: Error adding element to cache:', error)
        return null
      }
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

    // Enhanced search with performance budgeting
    async findByIntent(intent, options = {}) {
      const searchOperation = async () => {
        return this._findByIntentInternal(intent, options)
      }

      if (this.performanceManager) {
        const result = await this.performanceManager.executeWithBudget(
          searchOperation,
          50, // Max 50ms for search
          'findByIntent'
        )
        
        if (result.success) {
          this.performanceManager.trackCacheHit()
          return result.result
        } else {
          this.performanceManager.trackCacheMiss()
          return []
        }
      }
      
      return searchOperation()
    }

    _findByIntentInternal(intent, options = {}) {
      if (!intent || typeof intent !== 'string') {
        return this._getFallbackElements(options)
      }
      
      const intentLower = intent.toLowerCase()
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
      
      return finalResults
    }

    _extractSemanticKeywords(intentLower) {
      const words = intentLower.split(/\s+/).filter(word => word.length > 2)
      const enhancedKeywords = [...words]
      
      // Semantic mappings for better matching
      const semanticMaps = {
        'about': ['about', 'about us', 'company', 'info', 'information'],
        'contact': ['contact', 'contact us', 'support', 'help', 'get in touch'],
        'login': ['login', 'log in', 'sign in', 'signin', 'authenticate'],
        'search': ['search', 'find', 'query', 'look for'],
        'submit': ['submit', 'send', 'go', 'continue', 'proceed'],
        'cancel': ['cancel', 'back', 'close', 'exit'],
        
        // Form field mappings
        'first': ['first', 'firstname', 'first_name', 'fname'],
        'last': ['last', 'lastname', 'last_name', 'lname'],
        'email': ['email', 'e-mail', 'mail', 'email_address'],
        'phone': ['phone', 'telephone', 'tel', 'mobile', 'number'],
        'password': ['password', 'pass', 'pwd', 'passcode'],
        'message': ['message', 'comment', 'note', 'feedback']
      }
      
      words.forEach(word => {
        if (semanticMaps[word]) {
          enhancedKeywords.push(...semanticMaps[word])
        }
      })
      
      return [...new Set(enhancedKeywords)]
    }

    _searchByText(keywords, results) {
      for (const searchTerm of keywords) {
        for (const [indexedWord, elementIds] of this.textIndex.entries()) {
          const similarity = this._calculateStringSimilarity(searchTerm, indexedWord)
          
          if (similarity >= 0.5) {
            for (const elementId of elementIds) {
              const element = this.cache.get(elementId)
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
                const element = this.cache.get(elementId)
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
              const element = this.cache.get(elementId)
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
              const element = this.cache.get(elementId)
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
          element: this.cache.get(elementId).basicData,
          scores: { [source]: score },
          totalScore: score,
          confidence: Math.min(score / 10, 0.95)
        })
      }
    }

    _getFallbackElements(options = {}) {
      const elements = []
      
      for (const [elementId, data] of this.cache.entries()) {
        if (data.basicData.visibility && data.basicData.interactable) {
          elements.push({
            elementId,
            element: data.basicData,
            scores: { fallback: data.priority / 20 },
            totalScore: data.priority / 20,
            confidence: 0.5
          })
        }
      }
      
      return elements
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, options.limit || 10)
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
      const data = this.cache.get(elementId)
      if (!data) return false
      
      if (this.isDebug()) {
        console.debug("📦 DOM Monitor: Cache REMOVE", { elementId, tag: data.basicData?.tagName, text: data.basicData?.text })
      }
      
      // Remove from cache
      this.cache.delete(elementId)
      this.accessCount.delete(elementId)
      this.lastAccess.delete(elementId)
      
      // Remove from indexes
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
      this.stats.totalElements = this.cache.size
      
      if (elementData.basicData.visibility) {
        this.stats.visibleElements++
      }
      
      if (elementData.basicData.interactable) {
        this.stats.interactableElements++
      }
    }

    updateStatsAfterRemoval(elementData) {
      this.stats.totalElements = this.cache.size
      
      if (elementData.basicData.visibility) {
        this.stats.visibleElements = Math.max(0, this.stats.visibleElements - 1)
      }
      
      if (elementData.basicData.interactable) {
        this.stats.interactableElements = Math.max(0, this.stats.interactableElements - 1)
      }
    }

    getStats() {
      return {
        totalElements: this.cache.size,
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
        lastCleanup: this.stats.lastCleanup
      }
    }

    estimateMemoryUsage() {
      // Rough estimation in KB
      const avgElementSize = 2 // KB per element
      const indexOverhead = Math.round((this.textIndex.size + this.roleIndex.size + this.selectorIndex.size) * 0.1)
      return Math.round(this.cache.size * avgElementSize + indexOverhead)
    }

    // Cleanup operations
    cleanup() {
      const now = Date.now()
      const maxAge = this.config.maxAge
      const toRemove = []
      
      for (const [elementId, data] of this.cache.entries()) {
        if (now - data.basicData.lastSeen > maxAge) {
          toRemove.push(elementId)
        }
      }
      
      for (const elementId of toRemove) {
        this.removeElement(elementId)
      }
      
      this.stats.lastCleanup = now
      
      if (toRemove.length > 0) {
        console.log(`DOM Monitor: Cleaned up ${toRemove.length} stale elements`)
      }
      
      return {
        removed: toRemove.length,
        remaining: this.cache.size
      }
    }

    getAllElements(filter = {}) {
      const elements = []
      
      for (const [elementId, data] of this.cache.entries()) {
        // Apply filters
        if (filter.visible && !data.basicData.visibility) continue
        if (filter.interactable && !data.basicData.interactable) continue
        if (filter.role && data.basicData.role !== filter.role) continue
        if (filter.tag && data.basicData.tagName !== filter.tag) continue
        
        elements.push({
          elementId,
          ...data.serialize(),
          confidence: Math.min(data.priority / 20, 1.0)
        })
      }
      
      return elements.sort((a, b) => b.priority - a.priority)
    }

    clear() {
      this.cache.clear()
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
        lastCleanup: Date.now()
      }
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