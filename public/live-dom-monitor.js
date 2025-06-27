// AI Assistant Live DOM Monitor - Real-time Element Discovery & Caching
;(() => {
  console.log("🔄 AI Assistant Live DOM Monitor: Initializing real-time DOM awareness system")

  // Version and configuration
  const MONITOR_VERSION = "1.0.0"
  const MAX_CACHE_SIZE = 1000
  const CLEANUP_INTERVAL = 30000 // 30 seconds
  const THROTTLE_DELAY = 100 // ms
  const VISIBILITY_THROTTLE = 250 // ms

  // Error boundary for safer execution
  function safeExecute(fn, context = "unknown") {
    try {
      return fn()
    } catch (error) {
      console.error(`🔄 DOM Monitor: Error in ${context}:`, error)
      return { success: false, error: error.message, context }
    }
  }

  // --- Performance Optimized Element Cache ---
  class ElementCache {
    constructor(maxSize = MAX_CACHE_SIZE) {
      this.cache = new Map()
      this.accessCount = new Map()
      this.lastAccess = new Map()
      this.textIndex = new Map()
      this.roleIndex = new Map()
      this.selectorIndex = new Map()
      this.maxSize = maxSize
      this.lastCleanup = Date.now()
    }

    generateElementId(element) {
      // Create unique ID based on element characteristics
      const tag = element.tagName.toLowerCase()
      const id = element.id || ''
      const classes = Array.from(element.classList).join('.')
      const text = this.getElementText(element).slice(0, 50)
      const position = this.getElementPosition(element)
      
      return `${tag}_${id}_${classes}_${text}_${position.x}_${position.y}`.replace(/[^a-zA-Z0-9_]/g, '_')
    }

    getElementText(element) {
      // Extract meaningful text content
      let text = '';
      let source = '';
      
      if (element.getAttribute('aria-label')) {
        text = element.getAttribute('aria-label');
        source = 'aria-label';
      } else if (element.getAttribute('title')) {
        text = element.getAttribute('title');
        source = 'title';
      } else if (element.getAttribute('placeholder')) {
        text = element.getAttribute('placeholder');
        source = 'placeholder';
      } else if (element.value && element.type !== 'password') {
        text = element.value;
        source = 'value';
      } else {
        text = element.textContent || element.innerText || '';
        source = 'textContent';
      }
      
      const finalText = text.trim().slice(0, 100); // Limit text length
      
      // CONSOLE LOG: Show text extraction details
      if (finalText) {
        console.log("📝 DOM Monitor: Text extracted:", {
          element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
          text: finalText,
          source: source,
          originalLength: text.length,
          truncated: text.length > 100
        });
      }
      
      return finalText;
    }

    getElementRole(element) {
      // Determine element role for semantic matching
      if (element.getAttribute('role')) return element.getAttribute('role')
      
      const tag = element.tagName.toLowerCase()
      const type = element.type || ''
      
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

    getElementPosition(element) {
      try {
        const rect = element.getBoundingClientRect()
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

    checkVisibility(element) {
      if (!element.offsetParent && element.style.display !== 'none') return false
      if (element.style.visibility === 'hidden') return false
      if (element.style.opacity === '0') return false
      
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }

    checkInteractability(element) {
      if (!this.checkVisibility(element)) return false
      if (element.disabled) return false
      if (element.getAttribute('aria-disabled') === 'true') return false
      
      const computedStyle = window.getComputedStyle(element)
      if (computedStyle.pointerEvents === 'none') return false
      
      return true
    }

    generateSelectors(element) {
      const selectors = []
      
      // ID selector (highest priority)
      if (element.id) {
        selectors.push({ 
          type: 'id', 
          value: `#${element.id}`, 
          priority: 1,
          confidence: 0.95 
        })
      }
      
      // Data attribute selectors
      const dataAttrs = ['data-testid', 'data-test', 'data-qa', 'data-cy']
      for (const attr of dataAttrs) {
        const value = element.getAttribute(attr)
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
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c && !c.match(/^(ng-|js-|is-|has-)/))
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
      if (element.name) {
        selectors.push({ 
          type: 'name', 
          value: `[name="${element.name}"]`, 
          priority: 4,
          confidence: 0.85 
        })
      }
      
      // XPath (fallback)
      selectors.push({ 
        type: 'xpath', 
        value: this.generateXPath(element), 
        priority: 5,
        confidence: 0.6 
      })
      
      // Text-based selector for buttons and links
      const text = this.getElementText(element)
      if (text && text.length < 50 && ['button', 'a'].includes(element.tagName.toLowerCase())) {
        selectors.push({ 
          type: 'text', 
          value: text, 
          priority: 6,
          confidence: 0.7 
        })
      }
      
      return selectors.sort((a, b) => a.priority - b.priority)
    }

    generateXPath(element) {
      if (element.id) {
        return `//*[@id="${element.id}"]`
      }
      
      const parts = []
      let current = element
      
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

    extractElementData(element) {
      const now = Date.now()
      const elementId = this.generateElementId(element)
      
      const elementData = {
        id: elementId,
        element: element,
        tagName: element.tagName.toLowerCase(),
        text: this.getElementText(element),
        role: this.getElementRole(element),
        selectors: this.generateSelectors(element),
        attributes: this.getRelevantAttributes(element),
        position: this.getElementPosition(element),
        visibility: this.checkVisibility(element),
        interactable: this.checkInteractability(element),
        accessibilityInfo: this.getAccessibilityInfo(element),
        lastSeen: now,
        firstSeen: now,
        updateCount: 1
      }
      
      // CONSOLE LOG: Show detailed element data being extracted
      console.log("🔍 DOM Monitor: Extracting element data:", {
        id: elementId,
        tag: elementData.tagName,
        text: elementData.text,
        role: elementData.role,
        visible: elementData.visibility,
        interactable: elementData.interactable,
        position: `${elementData.position.x},${elementData.position.y} (${elementData.position.width}x${elementData.position.height})`,
        selectors: elementData.selectors.map(s => `${s.type}: ${s.value}`),
        attributes: elementData.attributes
      })
      
      return elementData
    }

    getRelevantAttributes(element) {
      const relevantAttrs = [
        'type', 'name', 'value', 'href', 'src', 'alt', 'title', 
        'placeholder', 'aria-label', 'aria-describedby', 'role',
        'data-testid', 'data-test', 'data-qa'
      ]
      
      const attrs = {}
      for (const attr of relevantAttrs) {
        const value = element.getAttribute(attr)
        if (value !== null) {
          attrs[attr] = value
        }
      }
      
      return attrs
    }

    getAccessibilityInfo(element) {
      return {
        role: element.getAttribute('role'),
        ariaLabel: element.getAttribute('aria-label'),
        ariaDescribedBy: element.getAttribute('aria-describedby'),
        tabIndex: element.tabIndex,
        disabled: element.disabled,
        required: element.required,
        readonly: element.readOnly
      }
    }

    addElement(element) {
      if (!this.isRelevantElement(element)) {
        console.log("⏭️ DOM Monitor: Skipping irrelevant element:", {
          tag: element.tagName.toLowerCase(),
          id: element.id || 'none',
          reason: 'not interactive'
        });
        return null;
      }
      
      const elementId = this.generateElementId(element)
      const existing = this.cache.get(elementId)
      
      if (existing) {
        // Update existing element
        existing.lastSeen = Date.now()
        existing.updateCount++
        existing.position = this.getElementPosition(element)
        existing.visibility = this.checkVisibility(element)
        existing.interactable = this.checkInteractability(element)
        this.updateAccessCount(elementId)
        
        console.log("🔄 DOM Monitor: Updated existing element:", {
          id: elementId.slice(0, 20) + '...',
          tag: element.tagName.toLowerCase(),
          text: existing.text.slice(0, 30),
          updateCount: existing.updateCount,
          visible: existing.visibility,
          interactable: existing.interactable
        });
        
        return elementId
      }
      
      // Check cache size and cleanup if needed
      if (this.cache.size >= this.maxSize) {
        console.log("🧹 DOM Monitor: Cache full, evicting elements...", {
          currentSize: this.cache.size,
          maxSize: this.maxSize
        });
        this.evictLeastRecentlyUsed()
      }
      
      const data = this.extractElementData(element)
      this.cache.set(elementId, data)
      this.updateSearchIndexes(elementId, data)
      this.updateAccessCount(elementId)
      
      console.log("➕ DOM Monitor: Added new element to cache:", {
        id: elementId.slice(0, 20) + '...',
        tag: data.tagName,
        text: data.text.slice(0, 30),
        role: data.role,
        visible: data.visibility,
        interactable: data.interactable,
        cacheSize: this.cache.size
      });
      
      return elementId
    }

    isRelevantElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
      
      const tag = element.tagName.toLowerCase()
      const interactiveTags = [
        'button', 'a', 'input', 'select', 'textarea', 'form',
        'details', 'summary', 'label'
      ]
      
      // Check if it's an interactive tag
      if (interactiveTags.includes(tag)) return true
      
      // Check for interactive attributes
      if (element.onclick || element.getAttribute('onclick')) return true
      if (element.getAttribute('role') === 'button') return true
      if (element.getAttribute('tabindex')) return true
      if (element.classList.contains('btn') || element.classList.contains('button')) return true
      
      return false
    }

    updateSearchIndexes(elementId, data) {
      // Text index
      const text = data.text.toLowerCase()
      if (text) {
        const words = text.split(/\s+/).filter(word => word.length > 2)
        for (const word of words) {
          if (!this.textIndex.has(word)) this.textIndex.set(word, new Set())
          this.textIndex.get(word).add(elementId)
        }
      }
      
      // Role index
      if (!this.roleIndex.has(data.role)) this.roleIndex.set(data.role, new Set())
      this.roleIndex.get(data.role).add(elementId)
      
      // Selector index
      for (const selector of data.selectors) {
        if (!this.selectorIndex.has(selector.value)) this.selectorIndex.set(selector.value, new Set())
        this.selectorIndex.get(selector.value).add(elementId)
      }
    }

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
      if (!data) return
      
      // Remove from cache
      this.cache.delete(elementId)
      this.accessCount.delete(elementId)
      this.lastAccess.delete(elementId)
      
      // Remove from search indexes
      this.removeFromSearchIndexes(elementId, data)
    }

    removeFromSearchIndexes(elementId, data) {
      // Remove from text index
      const text = data.text.toLowerCase()
      if (text) {
        const words = text.split(/\s+/).filter(word => word.length > 2)
        for (const word of words) {
          const wordSet = this.textIndex.get(word)
          if (wordSet) {
            wordSet.delete(elementId)
            if (wordSet.size === 0) this.textIndex.delete(word)
          }
        }
      }
      
      // Remove from role index
      const roleSet = this.roleIndex.get(data.role)
      if (roleSet) {
        roleSet.delete(elementId)
        if (roleSet.size === 0) this.roleIndex.delete(data.role)
      }
      
      // Remove from selector index
      for (const selector of data.selectors) {
        const selectorSet = this.selectorIndex.get(selector.value)
        if (selectorSet) {
          selectorSet.delete(elementId)
          if (selectorSet.size === 0) this.selectorIndex.delete(selector.value)
        }
      }
    }

    findByIntent(intent) {
      console.log("🔍 DOM Monitor: Starting intent search:", { intent });
      
      // Fix TypeError: Add null check for intent
      if (!intent || typeof intent !== 'string') {
        console.warn("⚠️ DOM Monitor: Invalid intent provided:", intent);
        return [];
      }
      
      const intentLower = intent.toLowerCase()
      const results = new Map()
      
      // Text-based search
      const words = intentLower.split(/\s+/).filter(word => word.length > 2)
      console.log("🔍 DOM Monitor: Search words extracted:", words);
      
      for (const word of words) {
        for (const [indexedWord, elementIds] of this.textIndex.entries()) {
          if (indexedWord.includes(word) || word.includes(indexedWord)) {
            console.log("🔍 DOM Monitor: Text match found:", { 
              searchWord: word, 
              indexedWord: indexedWord, 
              elementCount: elementIds.size 
            });
            
            for (const elementId of elementIds) {
              const element = this.cache.get(elementId)
              if (element && element.visibility && element.interactable) {
                const score = this.calculateTextScore(word, indexedWord)
                this.addToResults(results, elementId, score, 'text')
                console.log("🎯 DOM Monitor: Added text match:", {
                  elementId: elementId.slice(0, 20) + '...',
                  text: element.text.slice(0, 30),
                  score: score
                });
              }
            }
          }
        }
      }
      
      // Role-based search
      const roleKeywords = {
        'click': ['button', 'link'],
        'type': ['input', 'textarea'],
        'select': ['select'],
        'submit': ['button', 'form'],
        'check': ['checkbox'],
        'scroll': ['generic']
      }
      
      for (const [action, roles] of Object.entries(roleKeywords)) {
        if (intentLower.includes(action)) {
          console.log("🔍 DOM Monitor: Role-based search triggered:", { action, roles });
          
          for (const role of roles) {
            const elementIds = this.roleIndex.get(role)
            if (elementIds) {
              console.log("🔍 DOM Monitor: Role match found:", { 
                role: role, 
                elementCount: elementIds.size 
              });
              
              for (const elementId of elementIds) {
                const element = this.cache.get(elementId)
                if (element && element.visibility && element.interactable) {
                  const score = 0.8
                  this.addToResults(results, elementId, score, 'role')
                  console.log("🎯 DOM Monitor: Added role match:", {
                    elementId: elementId.slice(0, 20) + '...',
                    role: role,
                    text: element.text.slice(0, 30),
                    score: score
                  });
                }
              }
            }
          }
        }
      }
      
      // Convert to array and sort by score
      const finalResults = Array.from(results.values())
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10);
      
      console.log("✅ DOM Monitor: Search completed:", {
        intent: intent,
        totalResults: finalResults.length,
        topResults: finalResults.slice(0, 3).map(r => ({
          text: r.element.text.slice(0, 30),
          score: r.totalScore,
          confidence: r.confidence
        }))
      });
      
      return finalResults;
    }

    calculateTextScore(searchWord, indexedWord) {
      if (searchWord === indexedWord) return 1.0
      if (indexedWord.includes(searchWord)) return 0.8
      if (searchWord.includes(indexedWord)) return 0.6
      
      // Simple similarity based on character overlap
      const overlap = this.getStringOverlap(searchWord, indexedWord)
      return overlap / Math.max(searchWord.length, indexedWord.length)
    }

    getStringOverlap(str1, str2) {
      let overlap = 0
      const shorter = str1.length < str2.length ? str1 : str2
      const longer = str1.length >= str2.length ? str1 : str2
      
      for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) overlap++
      }
      
      return overlap
    }

    addToResults(results, elementId, score, source) {
      const existing = results.get(elementId)
      if (existing) {
        existing.scores[source] = Math.max(existing.scores[source] || 0, score)
        existing.totalScore = Object.values(existing.scores).reduce((sum, s) => sum + s, 0)
      } else {
        results.set(elementId, {
          elementId,
          element: this.cache.get(elementId),
          scores: { [source]: score },
          totalScore: score,
          confidence: Math.min(score, 0.95)
        })
      }
    }

    getAllElements(filter = {}) {
      const elements = []
      
      for (const [elementId, data] of this.cache.entries()) {
        // Apply filters
        if (filter.visible && !data.visibility) continue
        if (filter.interactable && !data.interactable) continue
        if (filter.role && data.role !== filter.role) continue
        if (filter.tag && data.tagName !== filter.tag) continue
        
        elements.push({
          elementId,
          ...data,
          confidence: 0.8
        })
      }
      
      return elements.sort((a, b) => b.lastSeen - a.lastSeen)
    }

    getStats() {
      const visible = Array.from(this.cache.values()).filter(el => el.visibility).length
      const interactable = Array.from(this.cache.values()).filter(el => el.interactable).length
      
      return {
        totalElements: this.cache.size,
        visibleElements: visible,
        interactableElements: interactable,
        textIndexSize: this.textIndex.size,
        roleIndexSize: this.roleIndex.size,
        selectorIndexSize: this.selectorIndex.size,
        memoryUsage: this.estimateMemoryUsage()
      }
    }

    estimateMemoryUsage() {
      // Rough estimation in KB
      const avgElementSize = 2 // KB per element
      return Math.round(this.cache.size * avgElementSize)
    }

    cleanup() {
      const now = Date.now()
      const maxAge = 300000 // 5 minutes
      const toRemove = []
      
      for (const [elementId, data] of this.cache.entries()) {
        if (now - data.lastSeen > maxAge) {
          toRemove.push(elementId)
        }
      }
      
      for (const elementId of toRemove) {
        this.removeElement(elementId)
      }
      
      this.lastCleanup = now
      
      if (toRemove.length > 0) {
        console.log(`🔄 DOM Monitor: Cleaned up ${toRemove.length} stale elements`)
      }
    }
  }

  // --- DOM Observer System ---
  class DOMObserver {
    constructor(cache, communicationBridge) {
      this.cache = cache
      this.bridge = communicationBridge
      this.mutationObserver = null
      this.intersectionObserver = null
      this.pendingMutations = []
      this.mutationTimer = null
      this.isObserving = false
    }

    startWatching() {
      if (this.isObserving) return
      
      console.log("🔄 DOM Monitor: Starting DOM observation")
      
      // Mutation Observer for DOM changes
      this.mutationObserver = new MutationObserver((mutations) => {
        this.handleMutations(mutations)
      })
      
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'style', 'disabled', 'hidden', 'aria-label']
      })
      
      // Intersection Observer for visibility changes
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.handleVisibilityChanges(entries)
      }, {
        threshold: [0, 0.5, 1],
        rootMargin: '10px'
      })
      
      // Observe existing elements
      this.observeExistingElements()
      
      this.isObserving = true
    }

    stopWatching() {
      if (!this.isObserving) return
      
      if (this.mutationObserver) {
        this.mutationObserver.disconnect()
        this.mutationObserver = null
      }
      
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect()
        this.intersectionObserver = null
      }
      
      this.isObserving = false
      console.log("🔄 DOM Monitor: Stopped DOM observation")
    }

    observeExistingElements() {
      console.log("🔍 DOM Monitor: Starting initial element discovery...");
      
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
      
      for (const element of elements) {
        const elementId = this.cache.addElement(element)
        if (elementId) {
          addedCount++;
          if (this.intersectionObserver) {
            this.intersectionObserver.observe(element)
          }
        } else {
          skippedCount++;
        }
      }
      
      console.log(`✅ DOM Monitor: Initial scan completed:`, {
        totalFound: elements.length,
        added: addedCount,
        skipped: skippedCount,
        cacheSize: this.cache.cache.size,
        indexSizes: {
          text: this.cache.textIndex.size,
          role: this.cache.roleIndex.size,
          selector: this.cache.selectorIndex.size
        }
      });
    }

    handleMutations(mutations) {
      this.pendingMutations.push(...mutations)
      
      if (!this.mutationTimer) {
        this.mutationTimer = setTimeout(() => {
          this.processBatchedMutations(this.pendingMutations)
          this.pendingMutations = []
          this.mutationTimer = null
        }, THROTTLE_DELAY)
      }
    }

    processBatchedMutations(mutations) {
      const addedElements = new Set()
      const removedElements = new Set()
      const modifiedElements = new Set()
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Handle added nodes
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.findInteractiveElements(node).forEach(el => addedElements.add(el))
            }
          }
          
          // Handle removed nodes
          for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.findCachedElements(node).forEach(el => removedElements.add(el))
            }
          }
        } else if (mutation.type === 'attributes') {
          const element = mutation.target
          if (this.cache.isRelevantElement(element)) {
            modifiedElements.add(element)
          }
        }
      }
      
      // Process changes
      this.processAddedElements(addedElements)
      this.processRemovedElements(removedElements)
      this.processModifiedElements(modifiedElements)
      
      // Notify of changes if significant
      if (addedElements.size > 0 || removedElements.size > 0) {
        this.notifyDOMChanges({
          added: addedElements.size,
          removed: removedElements.size,
          modified: modifiedElements.size,
          timestamp: Date.now()
        })
      }
    }

    findInteractiveElements(rootElement) {
      const elements = []
      
      if (this.cache.isRelevantElement(rootElement)) {
        elements.push(rootElement)
      }
      
      const selectors = [
        'button', 'a[href]', 'input', 'select', 'textarea',
        '[onclick]', '[role="button"]', '[tabindex]',
        '.btn', '.button', '.link'
      ]
      
      const found = rootElement.querySelectorAll(selectors.join(','))
      elements.push(...Array.from(found))
      
      return elements
    }

    findCachedElements(rootElement) {
      const elements = []
      
      // This is trickier - we need to find elements that were in our cache
      // For now, we'll do a simple check
      for (const [elementId, data] of this.cache.cache.entries()) {
        if (!document.contains(data.element)) {
          elements.push(data.element)
        }
      }
      
      return elements
    }

    processAddedElements(elements) {
      for (const element of elements) {
        const elementId = this.cache.addElement(element)
        if (elementId && this.intersectionObserver) {
          this.intersectionObserver.observe(element)
        }
      }
      
      if (elements.size > 0) {
        console.log(`🔄 DOM Monitor: Added ${elements.size} new interactive elements`)
      }
    }

    processRemovedElements(elements) {
      for (const element of elements) {
        const elementId = this.cache.generateElementId(element)
        this.cache.removeElement(elementId)
        
        if (this.intersectionObserver) {
          this.intersectionObserver.unobserve(element)
        }
      }
      
      if (elements.size > 0) {
        console.log(`🔄 DOM Monitor: Removed ${elements.size} interactive elements`)
      }
    }

    processModifiedElements(elements) {
      for (const element of elements) {
        // Re-add to cache to update data
        this.cache.addElement(element)
      }
      
      if (elements.size > 0) {
        console.log(`🔄 DOM Monitor: Updated ${elements.size} modified elements`)
      }
    }

    handleVisibilityChanges(entries) {
      for (const entry of entries) {
        const element = entry.target
        const elementId = this.cache.generateElementId(element)
        const cached = this.cache.cache.get(elementId)
        
        if (cached) {
          cached.visibility = entry.isIntersecting
          cached.lastSeen = Date.now()
        }
      }
    }

    notifyDOMChanges(changes) {
      if (this.bridge) {
        this.bridge.sendUpdate('DOM_CHANGED', changes)
      }
    }
  }

  // --- Communication Bridge ---
  class CommunicationBridge {
    constructor() {
      this.messageHandlers = new Map()
      this.setupMessageListener()
    }

    setupMessageListener() {
      window.addEventListener('message', (event) => {
        try {
          const data = event.data
          
          // ENHANCED LOGGING: Log all incoming messages for debugging
          if (data && (data.action || data.type)) {
            console.log("📥 DOM Monitor: Received postMessage:", {
              action: data.action,
              type: data.type,
              source: event.origin,
              from: event.source === window.parent ? "parent_iframe" : "other",
              keys: Object.keys(data),
              timestamp: new Date().toISOString()
            })
          }
          
          // Handle DOM Monitor requests from action-command-handler.tsx
          if (data && data.action === "dom_monitor_request" && data.type === "dom_monitor_request") {
            console.log("🔍 DOM Monitor: Processing DOM request from action-command-handler:", {
              request_id: data.request_id,
              intent: data.intent,
              request_type: data.payload?.request_type,
              options: data.options
            })
            
            // Extract the payload
            const payload = data.payload || data
            this.handleDOMRequest(payload, data.request_id)
          }
          // Handle legacy DOM_MONITOR_ format 
          else if (data && data.type && data.type.startsWith('DOM_MONITOR_')) {
            console.log("🔍 DOM Monitor: Processing legacy DOM_MONITOR_ message:", data.type)
            this.handleMessage(data)
          }
          // Log unhandled messages for debugging
          else if (data && (data.action || data.type)) {
            console.log("❓ DOM Monitor: Unhandled message:", {
              action: data.action,
              type: data.type,
              reason: "No matching handler"
            })
          }
          
        } catch (error) {
          console.error("❌ DOM Monitor: Error processing postMessage:", error)
        }
      })
    }

    handleMessage(message) {
      const handler = this.messageHandlers.get(message.type)
      if (handler) {
        try {
          const result = handler(message.payload)
          this.sendResponse(message.id, result)
        } catch (error) {
          this.sendError(message.id, error.message)
        }
      }
    }

    handleDOMRequest(payload, requestId) {
      try {
        console.log("🔍 DOM Monitor: Starting DOM request processing:", {
          request_id: requestId,
          request_type: payload.request_type,
          intent: payload.intent,
          options: payload.options
        })

        let response = null

        // Route to appropriate handler based on request type
        if (payload.request_type === "find_elements") {
          console.log("🔍 DOM Monitor: Processing find_elements request for intent:", payload.intent)
          
          // Use the internal monitor instance to find elements
          if (window.AIAssistantDOMMonitor && window.AIAssistantDOMMonitor._internal) {
            const monitor = window.AIAssistantDOMMonitor._internal.monitor
            response = monitor.handleElementQuery({
              intent: payload.intent,
              options: payload.options || {}
            })
            
            console.log("✅ DOM Monitor: Element query completed:", {
              success: response.success,
              elements_found: response.elements?.length || 0,
              confidence: response.confidence
            })
          } else {
            console.error("❌ DOM Monitor: Internal monitor not available")
            response = {
              success: false,
              error: "DOM Monitor not properly initialized",
              timestamp: Date.now()
            }
          }
        } 
        else if (payload.request_type === "get_stats") {
          console.log("📊 DOM Monitor: Processing get_stats request")
          if (window.AIAssistantDOMMonitor) {
            response = {
              success: true,
              data: {
                stats: window.AIAssistantDOMMonitor.getStats()
              },
              timestamp: Date.now()
            }
          } else {
            response = {
              success: false,
              error: "DOM Monitor not available",
              timestamp: Date.now()
            }
          }
        }
        else if (payload.request_type === "current_state") {
          console.log("📊 DOM Monitor: Processing current_state request")
          if (window.AIAssistantDOMMonitor && window.AIAssistantDOMMonitor._internal) {
            const allElements = window.AIAssistantDOMMonitor.getAllElements({
              visible: true,
              interactable: true
            })
            
            // Convert to serializable format for postMessage
            const serializableElements = this.serializeRawElementsForTransport(allElements.slice(0, 50))
            
            response = {
              success: true,
              data: {
                elements: serializableElements,
                stats: window.AIAssistantDOMMonitor.getStats(),
                page_info: {
                  url: window.location.href,
                  title: document.title,
                  domain: window.location.hostname,
                  timestamp: Date.now()
                }
              },
              timestamp: Date.now()
            }
          } else {
            response = {
              success: false,
              error: "DOM Monitor not available",
              timestamp: Date.now()
            }
          }
        }
        else {
          console.error("❌ DOM Monitor: Unknown request type:", payload.request_type)
          response = {
            success: false,
            error: `Unknown request type: ${payload.request_type}`,
            timestamp: Date.now()
          }
        }

        // Send response back to action-command-handler.tsx
        this.sendDOMResponse(requestId, response)

      } catch (error) {
        console.error("❌ DOM Monitor: Error processing DOM request:", error)
        this.sendDOMResponse(requestId, {
          success: false,
          error: error.message,
          timestamp: Date.now()
        })
      }
    }

    sendDOMResponse(requestId, responseData) {
      try {
        const message = {
          action: "dom_monitor_response",
          type: "dom_monitor_response", 
          requestId: requestId,
          request_id: requestId, // Both formats for compatibility
          success: responseData.success,
          data: responseData.data || responseData,
          error: responseData.error,
          timestamp: Date.now()
        }

        // Test serialization before sending
        let messageSize = 0
        try {
          const serializedMessage = JSON.stringify(message)
          messageSize = serializedMessage.length
          console.log("📤 DOM Monitor: Message serialization test successful:", {
            request_id: requestId,
            success: responseData.success,
            elements_count: responseData.data?.elements?.length || responseData.elements?.length || 0,
            response_size: messageSize,
            has_elements: !!(responseData.data?.elements || responseData.elements),
            message_structure: {
              action: typeof message.action,
              type: typeof message.type,
              success: typeof message.success,
              data_type: typeof message.data,
              has_error: !!message.error
            }
          })
        } catch (serializationError) {
          console.error("❌ DOM Monitor: Message serialization failed:", serializationError)
          
          // Send simplified error response
          const errorMessage = {
            action: "dom_monitor_response",
            type: "dom_monitor_response", 
            requestId: requestId,
            request_id: requestId,
            success: false,
            error: "Response serialization failed: " + serializationError.message,
            timestamp: Date.now()
          }
          
          window.parent?.postMessage(errorMessage, '*')
          return
        }

        // Send back to parent (action-command-handler.tsx)
        if (window.parent) {
          window.parent.postMessage(message, '*')
          console.log("✅ DOM Monitor: Response sent via postMessage successfully")
        } else {
          console.error("❌ DOM Monitor: No parent window available for response")
        }

      } catch (error) {
        console.error("❌ DOM Monitor: Error sending DOM response:", error)
        
        // Try to send minimal error response
        try {
          window.parent?.postMessage({
            action: "dom_monitor_response",
            type: "dom_monitor_response", 
            requestId: requestId,
            request_id: requestId,
            success: false,
            error: "DOM response send failed: " + error.message,
            timestamp: Date.now()
          }, '*')
        } catch (fallbackError) {
          console.error("❌ DOM Monitor: Even fallback response failed:", fallbackError)
        }
      }
    }

    onMessage(type, handler) {
      this.messageHandlers.set(type, handler)
    }

    sendUpdate(type, data) {
      this.sendToParent({
        type: `DOM_MONITOR_${type}`,
        data: data,
        timestamp: Date.now()
      })
    }

    sendResponse(requestId, data) {
      this.sendToParent({
        type: 'DOM_MONITOR_RESPONSE',
        requestId: requestId,
        data: data,
        timestamp: Date.now()
      })
    }

    sendError(requestId, error) {
      this.sendToParent({
        type: 'DOM_MONITOR_ERROR',
        requestId: requestId,
        error: error,
        timestamp: Date.now()
      })
    }

    sendToParent(message) {
      // Use the same communication pattern as the existing helper
      if (window.AIAssistantLoader && window.AIAssistantLoader.sendMessageToIframe) {
        window.AIAssistantLoader.sendMessageToIframe({
          action: 'dom_monitor_message',
          data: message
        })
      } else {
        // Fallback to direct postMessage
        window.parent.postMessage(message, '*')
      }
    }
  }

  // --- Main DOM Monitor Class ---
  class LiveDOMMonitor {
    constructor() {
      this.cache = new ElementCache()
      this.bridge = new CommunicationBridge()
      this.observer = new DOMObserver(this.cache, this.bridge)
      this.isInitialized = false
      this.cleanupInterval = null
      
      this.setupMessageHandlers()
    }

    async init() {
      if (this.isInitialized) {
        console.log("⏭️ DOM Monitor: Already initialized, skipping...");
        return;
      }
      
      console.log("🚀 DOM Monitor: Starting initialization process...");
      
      try {
        // Wait for DOM to be ready
        console.log("⏳ DOM Monitor: Waiting for DOM to be ready...");
        await this.waitForDOM()
        console.log("✅ DOM Monitor: DOM is ready");
        
        // Start observing
        console.log("👁️ DOM Monitor: Starting element observation...");
        this.observer.startWatching()
        
        // Setup cleanup routine
        console.log("🧹 DOM Monitor: Setting up cleanup routine...");
        this.startCleanupRoutine()
        
        // Send initialization complete message
        const stats = this.cache.getStats();
        console.log("📊 DOM Monitor: Initial stats:", stats);
        
        this.bridge.sendUpdate('INITIALIZED', {
          version: MONITOR_VERSION,
          stats: stats
        })
        
        this.isInitialized = true
        this.initTime = Date.now();
        
        console.log("🎉 DOM Monitor: Initialization completed successfully!", {
          version: MONITOR_VERSION,
          stats: stats,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error("💥 DOM Monitor: Initialization failed:", error)
        throw error
      }
    }

    waitForDOM() {
      return new Promise((resolve) => {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', resolve)
        } else {
          resolve()
        }
      })
    }

    setupMessageHandlers() {
      this.bridge.onMessage('DOM_MONITOR_FIND_ELEMENTS', (payload) => {
        return this.handleElementQuery(payload)
      })
      
      this.bridge.onMessage('DOM_MONITOR_GET_STATS', () => {
        return this.cache.getStats()
      })
      
      this.bridge.onMessage('DOM_MONITOR_GET_ALL_ELEMENTS', (payload) => {
        return this.cache.getAllElements(payload.filter || {})
      })
    }

    handleElementQuery(payload) {
      const { intent, context, options = {} } = payload
      
      try {
        // Find elements matching the intent
        const matches = this.cache.findByIntent(intent)
        
        // Validate elements still exist and are accessible
        const validMatches = this.validateElements(matches)
        
        // Convert to serializable format for postMessage
        const serializableElements = this.serializeElementsForTransport(validMatches)
        
        console.log("🔍 DOM Monitor: Prepared serializable elements:", {
          originalCount: validMatches.length,
          serializableCount: serializableElements.length,
          sampleElement: serializableElements[0] ? {
            text: serializableElements[0].text?.slice(0, 30),
            tag: serializableElements[0].tagName,
            role: serializableElements[0].role,
            selectorsCount: serializableElements[0].selectors?.length || 0
          } : null
        })
        
        return {
          success: true,
          elements: serializableElements,
          total: serializableElements.length,
          confidence: this.calculateOverallConfidence(validMatches),
          timestamp: Date.now(),
          stats: this.cache.getStats()
        }
        
      } catch (error) {
        console.error("❌ DOM Monitor: Error in handleElementQuery:", error)
        return {
          success: false,
          error: error.message,
          timestamp: Date.now()
        }
      }
    }

    serializeElementsForTransport(matches) {
      const serializable = []
      
      for (const match of matches) {
        try {
          const elementData = match.element
          const domElement = elementData.element
          
          // Create serializable version without DOM element reference
          const serializableElement = {
            elementId: elementData.id || match.elementId,
            tagName: elementData.tagName,
            text: elementData.text,
            role: elementData.role,
            selectors: elementData.selectors || [],
            attributes: elementData.attributes || {},
            position: elementData.position || {},
            visibility: elementData.visibility,
            interactable: elementData.interactable,
            accessibilityInfo: elementData.accessibilityInfo || {},
            confidence: match.confidence || 0.8,
            totalScore: match.totalScore || 0,
            scores: match.scores || {},
            validated: match.validated || false,
            timestamp: match.timestamp || Date.now(),
            // Add computed properties for better action execution
            href: domElement?.href || null,
            value: domElement?.value || null,
            type: domElement?.type || null,
            disabled: domElement?.disabled || false,
            readonly: domElement?.readOnly || false
          }
          
          serializable.push(serializableElement)
          
        } catch (error) {
          console.error("❌ DOM Monitor: Error serializing element:", error)
          // Skip this element and continue with others
        }
      }
      
             return serializable
     }

    serializeRawElementsForTransport(elements) {
      const serializable = []
      
      for (const elementData of elements) {
        try {
          const domElement = elementData.element
          
          // Create serializable version without DOM element reference
          const serializableElement = {
            elementId: elementData.elementId || elementData.id,
            tagName: elementData.tagName,
            text: elementData.text,
            role: elementData.role,
            selectors: elementData.selectors || [],
            attributes: elementData.attributes || {},
            position: elementData.position || {},
            visibility: elementData.visibility,
            interactable: elementData.interactable,
            accessibilityInfo: elementData.accessibilityInfo || {},
            confidence: elementData.confidence || 0.8,
            timestamp: elementData.timestamp || Date.now(),
            // Add computed properties for better action execution
            href: domElement?.href || null,
            value: domElement?.value || null,
            type: domElement?.type || null,
            disabled: domElement?.disabled || false,
            readonly: domElement?.readOnly || false
          }
          
          serializable.push(serializableElement)
          
        } catch (error) {
          console.error("❌ DOM Monitor: Error serializing raw element:", error)
          // Skip this element and continue with others
        }
      }
      
      return serializable
    }

    validateElements(matches) {
      const validMatches = []
      
      for (const match of matches) {
        const element = match.element.element
        
        // Check if element still exists in DOM
        if (!document.contains(element)) continue
        
        // Check if element is still accessible
        try {
          const rect = element.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) continue
          
          validMatches.push({
            ...match,
            validated: true,
            timestamp: Date.now()
          })
        } catch (e) {
          // Element not accessible, skip
          continue
        }
      }
      
      return validMatches
    }

    calculateOverallConfidence(matches) {
      if (matches.length === 0) return 0
      
      const avgConfidence = matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length
      const countBonus = Math.min(matches.length / 5, 0.2) // Bonus for multiple matches
      
      return Math.min(avgConfidence + countBonus, 1.0)
    }

    startCleanupRoutine() {
      this.cleanupInterval = setInterval(() => {
        const statsBefore = this.cache.getStats();
        console.log("🧹 DOM Monitor: Running periodic cleanup...", {
          cacheSize: statsBefore.totalElements,
          memoryUsage: statsBefore.memoryUsage + 'KB'
        });
        
        this.cache.cleanup();
        
        const statsAfter = this.cache.getStats();
        const removed = statsBefore.totalElements - statsAfter.totalElements;
        
        if (removed > 0) {
          console.log("✅ DOM Monitor: Cleanup completed:", {
            elementsRemoved: removed,
            cacheSize: statsAfter.totalElements,
            memoryUsage: statsAfter.memoryUsage + 'KB'
          });
        }
      }, CLEANUP_INTERVAL)
    }

    stop() {
      if (this.observer) {
        this.observer.stopWatching()
      }
      
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
      
      this.isInitialized = false
      console.log("🔄 DOM Monitor: Stopped")
    }

    getStatus() {
      return {
        version: MONITOR_VERSION,
        initialized: this.isInitialized,
        observing: this.observer.isObserving,
        stats: this.cache.getStats(),
        performance: {
          cacheSize: this.cache.cache.size,
          memoryUsage: this.cache.estimateMemoryUsage(),
          uptime: this.isInitialized ? Date.now() - this.initTime : 0
        }
      }
    }
  }

  // --- Integration with existing system ---
  
  // Initialize the monitor
  const monitor = new LiveDOMMonitor()
  
  console.log("🔄 DOM Monitor: Script loaded, setting up auto-initialization...");
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    console.log("📄 DOM Monitor: DOM still loading, waiting for DOMContentLoaded...");
    document.addEventListener('DOMContentLoaded', () => {
      console.log("📄 DOM Monitor: DOMContentLoaded fired, initializing...");
      monitor.init().catch(console.error)
    })
  } else {
    console.log("📄 DOM Monitor: DOM already ready, initializing immediately...");
    monitor.init().catch(console.error)
  }

  // Expose DOM Monitor API to work alongside AIAssistantHelper
  window.AIAssistantDOMMonitor = {
    version: MONITOR_VERSION,
    
    // Main API methods
    findElements: (intent, options = {}) => safeExecute(() => {
      console.log("🔍 DOM Monitor API: findElements called:", { intent, options });
      const matches = monitor.cache.findByIntent(intent)
      const validatedMatches = monitor.validateElements(matches)
      console.log("✅ DOM Monitor API: findElements result:", {
        intent: intent,
        totalMatches: matches.length,
        validatedMatches: validatedMatches.length,
        topMatch: validatedMatches[0] ? {
          text: validatedMatches[0].element.text.slice(0, 30),
          confidence: validatedMatches[0].confidence
        } : null
      });
      return validatedMatches;
    }, "findElements"),
    
    getAllElements: (filter = {}) => safeExecute(() => {
      console.log("📋 DOM Monitor API: getAllElements called:", { filter });
      const elements = monitor.cache.getAllElements(filter);
      console.log("✅ DOM Monitor API: getAllElements result:", {
        totalElements: elements.length,
        filter: filter,
        sample: elements.slice(0, 3).map(el => ({
          text: el.text.slice(0, 20),
          tag: el.tagName,
          role: el.role
        }))
      });
      return elements;
    }, "getAllElements"),
    
    getElementBySelector: (selector) => safeExecute(() => {
      console.log("🎯 DOM Monitor API: getElementBySelector called:", { selector });
      const elements = monitor.cache.getAllElements()
      const element = elements.find(el => 
        el.selectors.some(s => s.value === selector)
      );
      console.log("✅ DOM Monitor API: getElementBySelector result:", {
        selector: selector,
        found: !!element,
        element: element ? {
          text: element.text.slice(0, 30),
          tag: element.tagName,
          role: element.role
        } : null
      });
      return element;
    }, "getElementBySelector"),
    
    // Status and stats
    getStats: () => {
      const stats = monitor.cache.getStats();
      console.log("📊 DOM Monitor API: getStats called - result:", stats);
      return stats;
    },
    
    getStatus: () => {
      const status = monitor.getStatus();
      console.log("🔧 DOM Monitor API: getStatus called - result:", status);
      return status;
    },
    
    // Control methods
    refresh: () => safeExecute(() => {
      console.log("🔄 DOM Monitor API: refresh called");
      monitor.observer.observeExistingElements()
      const result = { success: true, message: "Cache refreshed" };
      console.log("✅ DOM Monitor API: refresh completed:", result);
      return result;
    }, "refresh"),
    
    cleanup: () => safeExecute(() => {
      console.log("🧹 DOM Monitor API: cleanup called");
      const sizeBefore = monitor.cache.cache.size;
      monitor.cache.cleanup();
      const sizeAfter = monitor.cache.cache.size;
      const result = { 
        success: true, 
        message: "Cache cleaned up",
        removedElements: sizeBefore - sizeAfter
      };
      console.log("✅ DOM Monitor API: cleanup completed:", result);
      return result;
    }, "cleanup"),
    
    // Utility methods
    isReady: () => {
      const ready = monitor.isInitialized;
      console.log("❓ DOM Monitor API: isReady called - result:", ready);
      return ready;
    },
    
    // For debugging
    _internal: {
      monitor: monitor,
      cache: monitor.cache,
      observer: monitor.observer,
      bridge: monitor.bridge
    }
  }

  console.log(`✅ AI Assistant Live DOM Monitor: Initialization complete (v${MONITOR_VERSION})`)
  
  console.log("🎯 DOM Monitor: Script fully loaded and ready!", {
    version: MONITOR_VERSION,
    loadTime: Date.now(),
    readyState: document.readyState,
    userAgent: navigator.userAgent.slice(0, 50) + '...',
    timestamp: new Date().toISOString()
  });
  
})() 