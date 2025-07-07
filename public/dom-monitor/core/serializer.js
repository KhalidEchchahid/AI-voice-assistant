// DOM Monitor - Serializer Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Safe Serializer Class
  class DOMSerializer {
    constructor(config = {}) {
      this.config = {
        maxStringLength: config.maxStringLength || 1000,
        maxArrayLength: config.maxArrayLength || 100,
        maxObjectDepth: config.maxObjectDepth || 5,
        includeDebugInfo: config.includeDebugInfo || false,
        compressText: config.compressText || true,
        ...config
      }
    }

    // Main serialization method for element data
    serializeElementsForTransport(elements) {
      const serialized = []
      
      for (const element of elements) {
        try {
          const safeElement = this.serializeElement(element)
          if (safeElement) {
            serialized.push(safeElement)
          }
        } catch (error) {
          console.warn('DOM Monitor: Failed to serialize element:', error)
          // Add error placeholder
          serialized.push(this.createErrorPlaceholder(error.message))
        }
      }
      
      return serialized
    }

    // Serialize individual element match
    serializeElement(elementMatch) {
      const elementData = elementMatch.element || elementMatch
      const domElement = elementData.element
      
      if (!elementData) {
        return null
      }

      // Create safe serializable version
      const serialized = {
        elementId: this.safeString(elementData.id || elementMatch.elementId),
        tagName: this.safeString(elementData.tagName),
        text: this.extractAndCompressText(elementData, domElement),
        role: this.safeString(elementData.role),
        confidence: this.safeNumber(elementMatch.confidence || 0.8),
        position: this.serializePosition(elementData.position),
        visibility: this.safeBoolean(elementData.visibility),
        interactable: this.safeBoolean(elementData.interactable),
        selectors: this.serializeSelectors(elementData.selectors),
        attributes: this.serializeAttributes(elementData.attributes),
        accessibilityInfo: this.serializeAccessibilityInfo(elementData.accessibilityInfo),
        metadata: this.serializeMetadata(elementData, elementMatch)
      }

      // Add debug info if enabled
      if (this.config.includeDebugInfo) {
        serialized.debug = this.createDebugInfo(elementData, domElement)
      }

      // Validate serialization
      this.validateSerialization(serialized)
      
      return serialized
    }

    // Extract and compress text content
    extractAndCompressText(elementData, domElement) {
      let text = ''
      let source = 'none'
      
      // Use cached text from elementData first
      if (elementData.text && elementData.text.trim()) {
        text = elementData.text
        source = 'cached'
      } 
      // Fallback to DOM extraction if needed
      else if (domElement) {
        const extractedText = this.extractTextFromDOM(domElement)
        text = extractedText.text
        source = extractedText.source
      }
      
      // Clean and compress text
      if (text) {
        text = this.cleanText(text)
        if (this.config.compressText) {
          text = this.compressText(text)
        }
      }
      
      return text
    }

    extractTextFromDOM(domElement) {
      try {
        // Priority order for text extraction
        const extractors = [
          () => ({ text: domElement.getAttribute('aria-label') || '', source: 'aria-label' }),
          () => ({ text: domElement.getAttribute('title') || '', source: 'title' }),
          () => ({ text: domElement.getAttribute('placeholder') || '', source: 'placeholder' }),
          () => ({ text: domElement.value || '', source: 'value' }),
          () => ({ text: domElement.textContent || '', source: 'textContent' }),
          () => ({ text: domElement.innerText || '', source: 'innerText' }),
          () => ({ text: domElement.alt || '', source: 'alt' })
        ]
        
        for (const extractor of extractors) {
          const result = extractor()
          if (result.text && result.text.trim()) {
            return result
          }
        }
        
        return { text: '', source: 'none' }
        
      } catch (error) {
        console.warn('DOM Monitor: Error extracting text from DOM:', error)
        return { text: '', source: 'error' }
      }
    }

    cleanText(text) {
      return text
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/[\r\n\t]/g, ' ')  // Remove newlines and tabs
        .trim()
        .slice(0, this.config.maxStringLength)
    }

    compressText(text) {
      // Simple text compression for common patterns
      return text
        .replace(/\b(click|button|link|input|submit|save|cancel|close|open|download|upload)\b/gi, (match) => {
          const abbrevs = {
            'click': 'clk', 'button': 'btn', 'link': 'lnk', 'input': 'inp',
            'submit': 'sub', 'save': 'sav', 'cancel': 'cnl', 'close': 'cls',
            'open': 'opn', 'download': 'dl', 'upload': 'ul'
          }
          return abbrevs[match.toLowerCase()] || match
        })
    }

    // Safe type conversion methods
    safeString(value, maxLength = this.config.maxStringLength) {
      if (value === null || value === undefined) return ''
      const str = String(value)
      return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str
    }

    safeNumber(value, defaultValue = 0) {
      if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        return Math.round(value * 100) / 100 // Round to 2 decimal places
      }
      return defaultValue
    }

    safeBoolean(value, defaultValue = false) {
      if (typeof value === 'boolean') return value
      return defaultValue
    }

    safeArray(value, maxLength = this.config.maxArrayLength) {
      if (!Array.isArray(value)) return []
      return value.slice(0, maxLength)
    }

    // Serialize complex objects
    serializePosition(position) {
      if (!position || typeof position !== 'object') {
        return { x: 0, y: 0, width: 0, height: 0 }
      }
      
      return {
        x: this.safeNumber(position.x),
        y: this.safeNumber(position.y),
        width: this.safeNumber(position.width),
        height: this.safeNumber(position.height)
      }
    }

    serializeSelectors(selectors) {
      if (!Array.isArray(selectors)) return []
      
      return this.safeArray(selectors, 5).map(selector => ({
        type: this.safeString(selector.type, 50),
        value: this.safeString(selector.value, 200),
        priority: this.safeNumber(selector.priority),
        confidence: this.safeNumber(selector.confidence)
      }))
    }

    serializeAttributes(attributes) {
      if (!attributes || typeof attributes !== 'object') return {}
      
      const safe = {}
      const allowedAttrs = [
        'id', 'className', 'href', 'src', 'alt', 'title', 
        'placeholder', 'type', 'name', 'value', 'role',
        'aria-label', 'aria-describedby', 'data-testid'
      ]
      
      for (const attr of allowedAttrs) {
        if (attributes.hasOwnProperty(attr)) {
          safe[attr] = this.safeString(attributes[attr], 200)
        }
      }
      
      return safe
    }

    serializeAccessibilityInfo(accessibilityInfo) {
      if (!accessibilityInfo || typeof accessibilityInfo !== 'object') return {}
      
      return {
        role: this.safeString(accessibilityInfo.role, 50),
        ariaLabel: this.safeString(accessibilityInfo.ariaLabel, 200),
        ariaDescribedBy: this.safeString(accessibilityInfo.ariaDescribedBy, 100),
        tabIndex: this.safeNumber(accessibilityInfo.tabIndex),
        disabled: this.safeBoolean(accessibilityInfo.disabled),
        required: this.safeBoolean(accessibilityInfo.required),
        readonly: this.safeBoolean(accessibilityInfo.readonly)
      }
    }

    serializeMetadata(elementData, elementMatch) {
      return {
        priority: this.safeNumber(elementData.priority),
        accessCount: this.safeNumber(elementData.accessCount),
        lastAccess: this.safeNumber(elementData.lastAccess),
        totalScore: this.safeNumber(elementMatch.totalScore),
        timestamp: Date.now()
      }
    }

    // Debug information
    createDebugInfo(elementData, domElement) {
      return {
        hasElement: !!domElement,
        hasElementData: !!elementData,
        textLength: elementData.text ? elementData.text.length : 0,
        selectorsCount: Array.isArray(elementData.selectors) ? elementData.selectors.length : 0,
        attributesCount: elementData.attributes ? Object.keys(elementData.attributes).length : 0,
        timestamp: Date.now(),
        userAgent: navigator.userAgent.slice(0, 100)
      }
    }

    createErrorPlaceholder(errorMessage) {
      return {
        elementId: 'error_placeholder_' + Date.now(),
        tagName: 'error',
        text: 'Serialization Error',
        role: 'error',
        confidence: 0,
        position: { x: 0, y: 0, width: 0, height: 0 },
        visibility: false,
        interactable: false,
        selectors: [],
        attributes: {},
        accessibilityInfo: {},
        metadata: { error: this.safeString(errorMessage, 200) }
      }
    }

    // Validation
    validateSerialization(obj, depth = 0) {
      if (depth > this.config.maxObjectDepth) {
        throw new Error('Object depth exceeded')
      }
      
      if (obj === null || obj === undefined) return
      
      if (typeof obj === 'object') {
        if (obj instanceof Node || obj instanceof Element) {
          throw new Error('DOM node found in serialized data')
        }
        
        if (obj instanceof Function) {
          throw new Error('Function found in serialized data')
        }
        
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            this.validateSerialization(obj[i], depth + 1)
          }
        } else {
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              this.validateSerialization(obj[key], depth + 1)
            }
          }
        }
      }
    }

    // Test serialization
    testSerialization(data) {
      try {
        const serialized = JSON.stringify(data)
        JSON.parse(serialized) // Ensure it can be parsed back
        return {
          success: true,
          size: serialized.length,
          data: data
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          size: 0
        }
      }
    }

    // Serialize response for communication bridge
    serializeResponse(responseData) {
      const response = {
        success: this.safeBoolean(responseData.success),
        timestamp: Date.now()
      }
      
      if (responseData.elements) {
        response.elements = this.serializeElementsForTransport(responseData.elements)
        response.total = response.elements.length
      }
      
      if (responseData.stats) {
        response.stats = this.serializeStats(responseData.stats)
      }
      
      if (responseData.error) {
        response.error = this.safeString(responseData.error, 500)
      }
      
      if (responseData.data) {
        response.data = this.serializeGenericData(responseData.data)
      }
      
      return response
    }

    serializeStats(stats) {
      if (!stats || typeof stats !== 'object') return {}
      
      return {
        totalElements: this.safeNumber(stats.totalElements),
        visibleElements: this.safeNumber(stats.visibleElements),
        interactableElements: this.safeNumber(stats.interactableElements),
        textIndexSize: this.safeNumber(stats.textIndexSize),
        roleIndexSize: this.safeNumber(stats.roleIndexSize),
        memoryUsage: this.safeNumber(stats.memoryUsage)
      }
    }

    serializeGenericData(data, depth = 0) {
      if (depth > this.config.maxObjectDepth) {
        return '[Object too deep]'
      }
      
      if (data === null || data === undefined) return data
      
      if (typeof data === 'string') return this.safeString(data)
      if (typeof data === 'number') return this.safeNumber(data)
      if (typeof data === 'boolean') return data
      
      if (Array.isArray(data)) {
        return this.safeArray(data).map(item => this.serializeGenericData(item, depth + 1))
      }
      
      if (typeof data === 'object') {
        const serialized = {}
        for (const key in data) {
          if (data.hasOwnProperty(key) && typeof data[key] !== 'function') {
            serialized[key] = this.serializeGenericData(data[key], depth + 1)
          }
        }
        return serialized
      }
      
      return String(data).slice(0, 100)
    }

    // Batch processing for large datasets
    serializeBatch(elements, batchSize = 50) {
      const batches = []
      
      for (let i = 0; i < elements.length; i += batchSize) {
        const batch = elements.slice(i, i + batchSize)
        batches.push(this.serializeElementsForTransport(batch))
      }
      
      return batches
    }

    // Compression utilities
    compressSerializedData(data) {
      // Simple compression by removing redundant data
      const compressed = { ...data }
      
      // Remove empty arrays and objects
      for (const key in compressed) {
        if (Array.isArray(compressed[key]) && compressed[key].length === 0) {
          delete compressed[key]
        } else if (typeof compressed[key] === 'object' && 
                   compressed[key] !== null && 
                   Object.keys(compressed[key]).length === 0) {
          delete compressed[key]
        }
      }
      
      return compressed
    }

    // Performance monitoring
    measureSerializationPerformance(data) {
      const startTime = performance.now()
      const result = this.testSerialization(data)
      const endTime = performance.now()
      
      return {
        ...result,
        serializationTime: endTime - startTime,
        efficiency: result.size > 0 ? (endTime - startTime) / result.size * 1000 : 0 // ms per KB
      }
    }
  }

  // Export the module
  window.DOMMonitorModules.DOMSerializer = DOMSerializer

  console.log("✅ DOM Monitor: Serializer module loaded")
})() 