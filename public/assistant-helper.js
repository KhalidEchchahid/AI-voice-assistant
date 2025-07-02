// AI Assistant Helper - Action Execution & DOM Manipulation
;(() => {
  console.log("AI Assistant Helper: Initializing action execution system")

  // Version and compatibility check
  const HELPER_VERSION = "2.2.0"
  
  // Error boundary for safer execution
  function safeExecute(fn, context = "unknown") {
    try {
      const result = fn()
      // If the function returns a promise, handle it properly
      if (result && typeof result.then === 'function') {
        return result.catch(error => {
          console.error(`AI Assistant Helper: Error in ${context}:`, error)
          return { success: false, error: error.message, context }
        })
      }
      return result
    } catch (error) {
      console.error(`AI Assistant Helper: Error in ${context}:`, error)
      return { success: false, error: error.message, context }
    }
  }

  // --- Action Execution Functions ---
  
  // Find element using multiple strategies
  function findElement(actionCommand) {
    console.log("🔍 AI Assistant: Finding element with:", actionCommand)
    
    let element = null
    
    // Strategy 1: CSS Selector
    if (actionCommand.selector) {
      try {
        element = document.querySelector(actionCommand.selector)
        if (element) {
          console.log("✅ AI Assistant: Found element via CSS selector:", actionCommand.selector)
          return element
        }
      } catch (e) {
        console.warn("⚠️ AI Assistant: CSS selector failed:", actionCommand.selector, e)
      }
    }
    
    // Strategy 2: XPath
    if (actionCommand.xpath) {
      try {
        const result = document.evaluate(
          actionCommand.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        )
        element = result.singleNodeValue
        if (element) {
          console.log("✅ AI Assistant: Found element via XPath:", actionCommand.xpath)
          return element
        }
      } catch (e) {
        console.warn("⚠️ AI Assistant: XPath failed:", actionCommand.xpath, e)
      }
    }
    
    // Strategy 3: Text content search
    if (actionCommand.text && actionCommand.action !== "type") {
      try {
        const xpath = `//*[contains(text(), "${actionCommand.text}")]`
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        element = result.singleNodeValue
        if (element) {
          console.log("✅ AI Assistant: Found element via text content:", actionCommand.text)
          return element
        }
      } catch (e) {
        console.warn("⚠️ AI Assistant: Text search failed:", actionCommand.text, e)
      }
    }
    
    // Strategy 4: Coordinates (as last resort)
    if (actionCommand.coordinates) {
      try {
        element = document.elementFromPoint(actionCommand.coordinates.x, actionCommand.coordinates.y)
        if (element) {
          console.log("✅ AI Assistant: Found element via coordinates:", actionCommand.coordinates)
          return element
        }
      } catch (e) {
        console.warn("⚠️ AI Assistant: Coordinate search failed:", actionCommand.coordinates, e)
      }
    }
    
    console.warn("❌ AI Assistant: Could not find element with any strategy for:", actionCommand)
    return null
  }
  
  // Animated mouse pointer with cool click effects
  function showAnimatedCursor(element) {
    return new Promise((resolve) => {
      if (!element) {
        resolve()
        return
      }
    
    // Create animated cursor
    const cursor = document.createElement('div')
    cursor.className = 'ai-animated-cursor'
    cursor.innerHTML = `
      <div class="cursor-pointer">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 3L5.5 19L9.5 15L12.5 18.5L15 17L12 13.5L18.5 7L5.5 3Z" fill="currentColor"/>
          <path d="M5.5 3L5.5 19L9.5 15L12.5 18.5L15 17L12 13.5L18.5 7L5.5 3Z" stroke="white" stroke-width="1"/>
        </svg>
      </div>
      <div class="cursor-trail"></div>
    `
    
    // Style the cursor
    Object.assign(cursor.style, {
      position: 'fixed',
      left: '100px',
      top: '100px',
      width: '24px',
      height: '24px',
      zIndex: '999999',
      pointerEvents: 'none',
        transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      transform: 'translate(-50%, -50%)',
      color: '#3B82F6'
    })
    
    document.body.appendChild(cursor)
    
    // Get target position
    const rect = element.getBoundingClientRect()
    const targetX = rect.left + rect.width / 2
    const targetY = rect.top + rect.height / 2
    
    // Add floating animation while moving
      cursor.style.animation = 'cursorFloat 0.6s ease-in-out'
    
    // Animate to target
    setTimeout(() => {
      cursor.style.left = targetX + 'px'
      cursor.style.top = targetY + 'px'
      cursor.style.transform = 'translate(-50%, -50%) scale(1.2)'
    }, 100)
    
      // Action should happen after cursor reaches target
    setTimeout(() => {
      performClickAnimation(cursor, targetX, targetY)
        // Resolve the promise here so the actual action can be performed
        resolve()
      }, 700)
    
      // Remove cursor after click animation
    setTimeout(() => {
      cursor.style.opacity = '0'
      cursor.style.transform = 'translate(-50%, -50%) scale(0.5)'
      setTimeout(() => cursor.remove(), 500)
      }, 2000)
    })
  }
  
  // Cool click animation effects
  function performClickAnimation(cursor, x, y) {
    // Scale down cursor for "press" effect
    cursor.style.transform = 'translate(-50%, -50%) scale(0.9)'
    cursor.style.transition = 'all 0.1s ease-out'
    
    // Create multiple ripple effects
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        createRippleEffect(x, y, i)
      }, i * 100)
    }
    
    // Create particle burst
    setTimeout(() => {
      createParticleBurst(x, y)
    }, 150)
    
    // Scale back up
    setTimeout(() => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1.2)'
      cursor.style.transition = 'all 0.2s ease-out'
    }, 150)
  }
  
  // Create ripple effect
  function createRippleEffect(x, y, delay) {
    const ripple = document.createElement('div')
    ripple.className = 'click-ripple'
    
    Object.assign(ripple.style, {
      position: 'fixed',
      left: x + 'px',
      top: y + 'px',
      width: '10px',
      height: '10px',
      background: `rgba(59, 130, 246, ${0.8 - delay * 0.2})`,
      borderRadius: '50%',
      transform: 'translate(-50%, -50%) scale(0)',
      zIndex: '999998',
      pointerEvents: 'none',
      animation: `clickRipple ${0.8 + delay * 0.2}s ease-out forwards`
    })
    
    document.body.appendChild(ripple)
    setTimeout(() => ripple.remove(), 1000 + delay * 200)
  }
  
  // Create particle burst effect
  function createParticleBurst(x, y) {
    const particleCount = 12
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className = 'click-particle'
      
      const angle = (360 / particleCount) * i
      const velocity = 40 + Math.random() * 20
      const size = 3 + Math.random() * 3
      
      Object.assign(particle.style, {
        position: 'fixed',
        left: x + 'px',
        top: y + 'px',
        width: size + 'px',
        height: size + 'px',
        background: `hsl(${220 + Math.random() * 40}, 80%, 60%)`,
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '999997',
        pointerEvents: 'none',
        animation: `particleBurst 0.8s ease-out forwards`
      })
      
      // Set CSS variables for animation
      particle.style.setProperty('--angle', angle + 'deg')
      particle.style.setProperty('--velocity', velocity + 'px')
      
      document.body.appendChild(particle)
      setTimeout(() => particle.remove(), 800)
    }
  }
  
  // Smart Select Handler - handles both native selects and custom dropdowns
  async function executeSmartSelect(element, actionCommand) {
    try {
      // Extract target value from intent
      const targetValue = extractTargetValueFromIntent(actionCommand.intent, actionCommand.value)
      console.log("🎯 AI Assistant: Smart select target:", targetValue)
      
      if (!targetValue) {
        throw new Error("Could not extract target value from intent")
      }
      
      // Check if it's a native HTML select element
      if (element.tagName.toLowerCase() === 'select') {
        console.log("📋 AI Assistant: Handling native select element")
        return await handleNativeSelect(element, targetValue, actionCommand)
      } else {
        console.log("🎨 AI Assistant: Handling custom dropdown/combobox")
        return await handleCustomDropdown(element, targetValue, actionCommand)
      }
      
    } catch (error) {
      console.error("❌ AI Assistant: Smart select error:", error)
      return { 
        success: false, 
        error: error.message,
        action_id: actionCommand.command_id || actionCommand.id,
        element_found: true
      }
    }
  }
  
  // Extract target value from user intent
  function extractTargetValueFromIntent(intent, providedValue) {
    // If value is explicitly provided, use it
    if (providedValue) {
      return providedValue
    }
    
    // Parse from intent string
    const intent_lower = intent.toLowerCase()
    
    // Common patterns: "select X from", "choose X", "pick X"
    let match = intent.match(/select\s+([^from]+?)(?:\s+from|$)/i)
    if (match) return match[1].trim()
    
    match = intent.match(/choose\s+([^from]+?)(?:\s+from|$)/i)
    if (match) return match[1].trim()
    
    match = intent.match(/pick\s+([^from]+?)(?:\s+from|$)/i)
    if (match) return match[1].trim()
    
    // Try to extract quoted values
    match = intent.match(/["']([^"']+)["']/i)
    if (match) return match[1].trim()
    
    // Try to extract capitalized words (often option names)
    match = intent.match(/([A-Z][A-Za-z\s-]+[A-Za-z])/i)
    if (match) return match[1].trim()
    
    console.warn("⚠️ AI Assistant: Could not extract target value from intent:", intent)
    return null
  }
  
  // Handle native HTML select elements
  async function handleNativeSelect(selectElement, targetValue, actionCommand) {
    console.log("📋 AI Assistant: Processing native select options")
    
    const options = Array.from(selectElement.options)
    console.log("📋 AI Assistant: Available options:", options.map(opt => `"${opt.text}" (value: "${opt.value}")`))
    
    // Find matching option by text or value
    let matchingOption = null
    
    // 1. Exact text match
    matchingOption = options.find(opt => opt.text.trim().toLowerCase() === targetValue.toLowerCase())
    
    // 2. Exact value match
    if (!matchingOption) {
      matchingOption = options.find(opt => opt.value.toLowerCase() === targetValue.toLowerCase())
    }
    
    // 3. Partial text match
    if (!matchingOption) {
      matchingOption = options.find(opt => opt.text.toLowerCase().includes(targetValue.toLowerCase()))
    }
    
    // 4. Partial value match
    if (!matchingOption) {
      matchingOption = options.find(opt => opt.value.toLowerCase().includes(targetValue.toLowerCase()))
    }
    
    if (!matchingOption) {
      throw new Error(`Option "${targetValue}" not found in select. Available options: ${options.map(opt => opt.text).join(', ')}`)
    }
    
    // Select the option
    selectElement.selectedIndex = matchingOption.index
    selectElement.value = matchingOption.value
    
    // Trigger events
    selectElement.dispatchEvent(new Event('change', { bubbles: true }))
    selectElement.dispatchEvent(new Event('input', { bubbles: true }))
    
    console.log(`✅ AI Assistant: Selected option "${matchingOption.text}" (value: "${matchingOption.value}")`)
    
    return { 
      success: true, 
      message: `Selected "${matchingOption.text}" from dropdown`,
      action_id: actionCommand.command_id || actionCommand.id,
      element_found: true,
      selected_option: matchingOption.text,
      selected_value: matchingOption.value
    }
  }
  
  // Handle custom dropdown/combobox elements (React-Select, etc.)
  async function handleCustomDropdown(element, targetValue, actionCommand) {
    console.log("🎨 AI Assistant: Processing custom dropdown")
    
    try {
      // Step 1: Click to open dropdown
      console.log("🎨 Step 1: Opening dropdown")
      element.click()
      
      // Wait for dropdown to open
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Step 2: Look for search input that appeared
      const searchInput = findDropdownSearchInput(element)
      if (searchInput) {
        console.log("🎨 Step 2: Found search input, typing target value")
        searchInput.focus()
        searchInput.value = targetValue
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
        searchInput.dispatchEvent(new Event('keyup', { bubbles: true }))
        
        // Wait for search results
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // Step 3: Find and click the matching option
      console.log("🎨 Step 3: Looking for matching option to click")
      const option = findDropdownOption(element, targetValue)
      
      if (!option) {
        throw new Error(`Option "${targetValue}" not found in custom dropdown`)
      }
      
      console.log("🎨 Step 3: Clicking matching option")
      option.click()
      
      // Wait for selection to complete
      await new Promise(resolve => setTimeout(resolve, 200))
      
      console.log(`✅ AI Assistant: Selected "${targetValue}" from custom dropdown`)
      
      return { 
        success: true, 
        message: `Selected "${targetValue}" from custom dropdown`,
        action_id: actionCommand.command_id || actionCommand.id,
        element_found: true,
        selected_option: targetValue
      }
      
    } catch (error) {
      // If custom dropdown logic fails, try simple click as fallback
      console.log("🎨 Custom dropdown logic failed, trying simple click fallback")
      element.click()
      
      return { 
        success: true, 
        message: `Clicked dropdown (custom logic failed, used fallback)`,
        action_id: actionCommand.command_id || actionCommand.id,
        element_found: true,
        warning: error.message
      }
    }
  }
  
  // Find search input in opened dropdown
  function findDropdownSearchInput(dropdownElement) {
    // Common selectors for search inputs in dropdowns
    const selectors = [
      'input[type="text"]',
      'input[role="combobox"]',
      'input[aria-expanded]',
      '.react-select__input input',
      '.select__input input',
      '[class*="search"] input',
      '[class*="filter"] input'
    ]
    
    // Look within the dropdown element and its vicinity
    for (const selector of selectors) {
      // First try within the dropdown element
      let input = dropdownElement.querySelector(selector)
      if (input && input.offsetParent !== null) { // Must be visible
        return input
      }
      
      // Then try within the document (for portaled dropdowns)
      const inputs = document.querySelectorAll(selector)
      for (const input of inputs) {
        if (input.offsetParent !== null && isInputRecentlyVisible(input)) {
          return input
        }
      }
    }
    
    console.log("🎨 No search input found in dropdown")
    return null
  }
  
  // Check if input became visible recently (for portaled dropdowns)
  function isInputRecentlyVisible(input) {
    const rect = input.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0
  }
  
  // Find option element in opened dropdown
  function findDropdownOption(dropdownElement, targetValue) {
    // Common selectors for dropdown options
    const selectors = [
      '[role="option"]',
      '.react-select__option',
      '.select__option',
      '[class*="option"]',
      '[class*="item"]',
      'li',
      'div[data-value]'
    ]
    
    const targetLower = targetValue.toLowerCase()
    
    // Look within the dropdown and document (for portaled dropdowns)
    const contexts = [dropdownElement, document]
    
    for (const context of contexts) {
      for (const selector of selectors) {
        const options = context.querySelectorAll(selector)
        
        for (const option of options) {
          if (!option.offsetParent) continue // Skip hidden elements
          
          const optionText = (option.textContent || '').trim().toLowerCase()
          const optionValue = option.getAttribute('data-value') || ''
          
          // Check for exact or partial matches
          if (optionText === targetLower || 
              optionValue.toLowerCase() === targetLower ||
              optionText.includes(targetLower) ||
              optionValue.toLowerCase().includes(targetLower)) {
            
            console.log(`🎨 Found matching option: "${option.textContent}" (selector: ${selector})`)
            return option
          }
        }
      }
    }
    
    console.log(`🎨 No matching option found for "${targetValue}"`)
    return null
  }

  // Execute individual action
  // NEW BEHAVIOR: Actions now follow realistic user interaction flow:
  // 1. Cursor animates to target element (if applicable)
  // 2. Click animation plays
  // 3. Actual DOM action is performed
  // This creates a more natural, human-like interaction pattern
  async function executeAction(actionCommand) {
    // COMPATIBILITY FIX: Handle both "action" and "type" fields
    const actionType = actionCommand.action || actionCommand.type
    
    console.log("🎯 AI Assistant: Executing action:", {
      action: actionType,
      originalAction: actionCommand.action,
      originalType: actionCommand.type,
      id: actionCommand.id || actionCommand.command_id,
      selector: actionCommand.selector,
      xpath: actionCommand.xpath,
      value: actionCommand.value,
      text: actionCommand.text,
      options: actionCommand.options,
      scroll_direction: actionCommand.scroll_direction,
      scroll_amount: actionCommand.scroll_amount
    })
    
    if (!actionType) {
      console.error("❌ AI Assistant: No action type found in command:", actionCommand)
      return { success: false, error: "No action type specified", action_id: actionCommand.command_id || actionCommand.id }
    }
    
    try {
      // Some actions don't need elements
      const needsElement = !["scroll", "wait", "navigate"].includes(actionType)
      const element = needsElement ? findElement(actionCommand) : null
      
      if (needsElement && !element) {
        const error = `Element not found for action: ${actionType}`
        console.error("❌ AI Assistant:", error)
        return { success: false, error: error, action_id: actionCommand.command_id || actionCommand.id }
      }
      
      // Show animated cursor if requested and element exists - WAIT for animation to complete
      // Skip cursor animation for page-level scroll actions (scroll without specific target element)
      const isPageLevelScroll = actionType === "scroll" && !element
      const shouldShowCursor = element && 
                              actionCommand.options?.highlight !== false && 
                              !isPageLevelScroll
      
      if (shouldShowCursor) {
        console.log("🎬 AI Assistant: Starting cursor animation...")
        await showAnimatedCursor(element)
        console.log("✅ AI Assistant: Cursor animation completed, now performing action")
      }
      
      // Execute action based on type
      switch (actionType) {
        case "click":
          element.click()
          console.log("✅ AI Assistant: Clicked element")
          break
          
        case "type":
          // Use 'value' field from backend, fallback to 'text'
          const textToType = actionCommand.value || actionCommand.text || ""
          console.log("📝 AI Assistant: Typing text:", textToType)
          
          element.focus()
          
          // Clear existing content if specified
          if (actionCommand.options?.clear_first || actionCommand.options?.clearFirst) {
            element.value = ""
            console.log("🗑️ AI Assistant: Cleared existing content")
          }
          
          element.value = textToType
          element.dispatchEvent(new Event('input', { bubbles: true }))
          element.dispatchEvent(new Event('change', { bubbles: true }))
          element.dispatchEvent(new Event('keyup', { bubbles: true }))
          console.log("✅ AI Assistant: Typed text:", textToType)
          break
          
        case "clear":
          if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
            element.value = ""
            element.dispatchEvent(new Event('input', { bubbles: true }))
            element.dispatchEvent(new Event('change', { bubbles: true }))
            console.log("✅ AI Assistant: Cleared input")
          }
          break
          
        case "scroll":
          if (element) {
            // Scroll specific element
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            console.log("✅ AI Assistant: Scrolled to element")
          } else {
            // Scroll page - handle multiple direction/amount field formats
            const direction = actionCommand.scroll_direction || actionCommand.options?.direction || actionCommand.direction || "down"
            const amount = actionCommand.amount || actionCommand.options?.amount || (actionCommand.scroll_amount * 100) || 300
            
            console.log(`🎯 AI Assistant: Scrolling ${direction} by ${amount}px (scroll_amount: ${actionCommand.scroll_amount})`)
            
            if (direction === "down") {
              window.scrollBy(0, amount)
            } else if (direction === "up") {
              window.scrollBy(0, -amount)
            } else if (direction === "left") {
              window.scrollBy(-amount, 0)
            } else if (direction === "right") {
              window.scrollBy(amount, 0)
            }
            console.log(`✅ AI Assistant: Scrolled ${direction} by ${amount}px`)
          }
          break
          
        case "hover":
          element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
          console.log("✅ AI Assistant: Hovered over element")
          break
          
        case "focus":
          element.focus()
          console.log("✅ AI Assistant: Focused element")
          break
          
        case "submit":
          if (element.tagName === 'FORM') {
            element.submit()
          } else {
            // Find parent form
            const form = element.closest('form')
            if (form) {
              form.submit()
            } else {
              element.click() // Fallback to click
            }
          }
          console.log("✅ AI Assistant: Submitted form")
          break
          
        case "check":
          if (element.type === "checkbox" || element.type === "radio") {
            element.checked = true
            element.dispatchEvent(new Event('change', { bubbles: true }))
            console.log("✅ AI Assistant: Checked element")
          } else {
            throw new Error("Element is not a checkbox or radio button")
          }
          break
          
        case "uncheck":
          if (element.type === "checkbox") {
            element.checked = false
            element.dispatchEvent(new Event('change', { bubbles: true }))
            console.log("✅ AI Assistant: Unchecked element")
          } else {
            throw new Error("Element is not a checkbox")
          }
          break
          
        case "navigate":
          const url = actionCommand.value || actionCommand.url
          if (url) {
            window.location.href = url
            console.log("✅ AI Assistant: Navigating to:", url)
          } else {
            throw new Error("No URL provided for navigation")
          }
          break
          
        case "wait":
          const waitTime = actionCommand.timeout || actionCommand.value || 1000
          console.log(`⏱️ AI Assistant: Waiting ${waitTime}ms`)
          // Return immediately, the delay will be handled by executeActions
          break
          
        case "getValue":
          const value = element.value || element.textContent || element.innerText || ""
          console.log("✅ AI Assistant: Got value:", value)
          return { 
            success: true, 
            message: "Value retrieved successfully",
            action_id: actionCommand.command_id || actionCommand.id,
            element_found: true,
            value: value
          }
          
        case "getText":
          const text = element.textContent || element.innerText || ""
          console.log("✅ AI Assistant: Got text:", text)
          return { 
            success: true, 
            message: "Text retrieved successfully",
            action_id: actionCommand.command_id || actionCommand.id,
            element_found: true,
            text: text
          }
          
        case "select":
          console.log("📋 AI Assistant: Executing smart select action")
          return await executeSmartSelect(element, actionCommand)
          
        default:
          throw new Error(`Unknown action type: ${actionType}`)
      }
      
      return { 
        success: true, 
        message: `${actionType} executed successfully`,
        action_id: actionCommand.command_id || actionCommand.id,
        element_found: needsElement ? true : null
      }
      
    } catch (error) {
      console.error("❌ AI Assistant: Action execution error:", error)
      return { 
        success: false, 
        error: error.message,
        action_id: actionCommand.command_id || actionCommand.id,
        element_found: needsElement ? !!findElement(actionCommand) : null
      }
    }
  }
  
  // Execute multiple actions
  function executeActions(command) {
    console.log("🚀 AI Assistant: Received command from assistant iframe:", command)
    
    // Handle both direct actions array and wrapped command structure
    let actions = []
    if (Array.isArray(command)) {
      actions = command
    } else if (command.actions) {
      actions = command.actions
    } else if (command.payload) {
      actions = command.payload
    } else if (command.commands) {
      actions = command.commands  // New structure from our backend
    }
    
    if (!Array.isArray(actions) || actions.length === 0) {
      console.error("❌ AI Assistant: Invalid actions format - expected non-empty array, got:", {
        command,
        actions,
        commandType: typeof command,
        actionsType: typeof actions
      })
      return
    }
    
    console.log(`🎯 AI Assistant: Executing ${actions.length} actions:`)
    actions.forEach((action, index) => {
      const actionType = action.action || action.type
      const description = action.intent || action.options?.description || 'No description'
      console.log(`  ${index + 1}. ${actionType}: ${description}`)
    })
    
    const results = []
    let currentDelay = 0
    
    // Execute each action with appropriate delay
    actions.forEach((actionCommand, index) => {
      // Calculate delay - use action's timeout for wait actions, default 500ms otherwise
      let actionDelay = 500
      if (actionCommand.action === "wait") {
        actionDelay = actionCommand.timeout || actionCommand.value || 1000
      } else if (actionCommand.delay_before) {
        actionDelay = actionCommand.delay_before
      }
      
      setTimeout(async () => {
        console.log(`⏱️ AI Assistant: Executing action ${index + 1}/${actions.length} after ${currentDelay}ms delay`)
        const result = await executeAction(actionCommand)
        results.push(result)
        
        console.log(`${result.success ? '✅' : '❌'} AI Assistant: Action ${index + 1}/${actions.length} result:`, result)
        
        // Send result back to iframe via the loader's message system
        sendActionResult(result, index, actions.length)
        
        // If this is the last action, send summary
        if (index === actions.length - 1) {
          const summary = {
            total_actions: actions.length,
            successful_actions: results.filter(r => r.success).length,
            failed_actions: results.filter(r => !r.success).length,
            results: results,
            session_id: command.session_id,
            timestamp: new Date().toISOString()
          }
          
          console.log("🎉 AI Assistant: All actions completed:", summary)
          sendActionsSummary(summary)
        }
      }, currentDelay)
      
      // Update delay for next action
      currentDelay += actionDelay
    })
  }

  // Send action result back to iframe (via loader)
  function sendActionResult(result, index, total) {
    if (window.AIAssistantLoader && window.AIAssistantLoader.sendMessageToIframe) {
      window.AIAssistantLoader.sendMessageToIframe({
        action: "action_result",
        result: result,
        command_id: result.action_id,
        index: index,
        total: total
      })
    }
  }

  // Send actions summary back to iframe (via loader)
  function sendActionsSummary(summary) {
    if (window.AIAssistantLoader && window.AIAssistantLoader.sendMessageToIframe) {
      window.AIAssistantLoader.sendMessageToIframe({
        action: "actions_complete",
        summary: summary
      })
    }
  }

  // Handle LiveKit data channel messages
  function handleLiveKitDataMessage(dataMessage) {
    try {
      console.log("📨 AI Assistant: Processing LiveKit data message:", dataMessage)
      console.log("📨 AI Assistant: Message type:", typeof dataMessage)
      
      // Parse the JSON if it's still a string
      let parsedMessage = dataMessage
      if (typeof dataMessage === 'string') {
        try {
        parsedMessage = JSON.parse(dataMessage)
          console.log("📨 AI Assistant: Parsed message:", parsedMessage)
        } catch (parseError) {
          console.error("❌ AI Assistant: Failed to parse JSON:", parseError)
          return
        }
      }
      
      // Check if this is an action command
      if (parsedMessage && (parsedMessage.commands || parsedMessage.actions)) {
        console.log("🎯 AI Assistant: Found action commands, executing from LiveKit data channel")
        console.log("🎯 AI Assistant: Actions found:", parsedMessage.actions?.length || parsedMessage.commands?.length || 0)
        executeActions(parsedMessage)
      } else if (parsedMessage && parsedMessage.type === 'execute_actions') {
        console.log("🎯 AI Assistant: Found execute_actions type, processing...")
        console.log("🎯 AI Assistant: Actions found:", parsedMessage.actions?.length || 0)
        executeActions(parsedMessage)
      } else if (parsedMessage && parsedMessage.type === 'conversational_response') {
        console.log("💬 AI Assistant: Received conversational response:", parsedMessage.message)
        // Pass back to iframe for display/handling
        if (window.AIAssistantLoader && window.AIAssistantLoader.sendMessageToIframe) {
          window.AIAssistantLoader.sendMessageToIframe({
            action: "conversational_response",
            message: parsedMessage.message,
            session_id: parsedMessage.session_id
          })
        }
      } else {
        console.log("❓ AI Assistant: Unknown LiveKit data message format:", parsedMessage)
        console.log("❓ AI Assistant: Message keys:", Object.keys(parsedMessage || {}))
      }
    } catch (e) {
      console.error("❌ AI Assistant: Error handling LiveKit data message:", e)
      console.error("❌ AI Assistant: Original message:", dataMessage)
    }
  }

  // Add CSS animations for cursor effects
  function addCursorAnimations() {
    if (document.getElementById('ai-cursor-animations')) return
    
    const style = document.createElement('style')
    style.id = 'ai-cursor-animations'
    style.textContent = `
      @keyframes cursorFloat {
        0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
        50% { transform: translate(-50%, -50%) translateY(-5px); }
      }
      
      @keyframes clickRipple {
        0% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(8);
          opacity: 0;
        }
      }
      
      @keyframes particleBurst {
        0% {
          transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0) rotate(calc(-1 * var(--angle)));
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--velocity)) rotate(calc(-1 * var(--angle)));
          opacity: 0;
        }
      }
      
      .ai-animated-cursor {
        filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
      }
      
      .ai-animated-cursor .cursor-pointer {
        animation: pulse 1.5s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `
    document.head.appendChild(style)
  }

  // --- Expose Helper API ---
  window.AIAssistantHelper = {
    version: HELPER_VERSION,
    executeAction: (action) => safeExecute(async () => await executeAction(action), "executeAction"),
    executeActions: (commands) => safeExecute(() => executeActions(commands), "executeActions"),
    handleLiveKitDataMessage: (data) => safeExecute(() => handleLiveKitDataMessage(data), "handleLiveKitDataMessage"),
    findElement,
    showAnimatedCursor,
    // Utility functions
    isReady: () => true,
    getSupportedActions: () => [
      "click", "type", "clear", "scroll", "hover", "focus", "submit", 
      "check", "uncheck", "navigate", "wait", "getValue", "getText", "select"
    ]
  }

  // Initialize animations on load
  addCursorAnimations()

  console.log(`✅ AI Assistant Helper: Initialization complete (v${HELPER_VERSION})`)
})() 