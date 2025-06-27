// AI Assistant Helper - Action Execution & DOM Manipulation
;(() => {
  console.log("AI Assistant Helper: Initializing action execution system")

  // Version and compatibility check
  const HELPER_VERSION = "2.1.0"
  
  // Error boundary for safer execution
  function safeExecute(fn, context = "unknown") {
    try {
      return fn()
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
  
  // Highlight element with red border
  function highlightElement(element) {
    if (!element || !element.style) return
    
    // Store original border for restoration
    const originalBorder = element.style.border
    const originalBoxShadow = element.style.boxShadow
    
    // Apply highlight
    element.style.border = "2px solid #FF0000"
    element.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.5)"
    
    // Remove highlight after delay
    setTimeout(() => {
      element.style.border = originalBorder
      element.style.boxShadow = originalBoxShadow
    }, 1500)
  }
  
  // Execute individual action
  function executeAction(actionCommand) {
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
      
      // Highlight element if requested and element exists
      if (element && actionCommand.options?.highlight !== false) {
        highlightElement(element)
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
      
      setTimeout(() => {
        console.log(`⏱️ AI Assistant: Executing action ${index + 1}/${actions.length} after ${currentDelay}ms delay`)
        const result = executeAction(actionCommand)
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

  // --- Expose Helper API ---
  window.AIAssistantHelper = {
    version: HELPER_VERSION,
    executeAction: (action) => safeExecute(() => executeAction(action), "executeAction"),
    executeActions: (commands) => safeExecute(() => executeActions(commands), "executeActions"),
    handleLiveKitDataMessage: (data) => safeExecute(() => handleLiveKitDataMessage(data), "handleLiveKitDataMessage"),
    findElement,
    highlightElement,
    // Utility functions
    isReady: () => true,
    getSupportedActions: () => [
      "click", "type", "clear", "scroll", "hover", "focus", "submit", 
      "check", "uncheck", "navigate", "wait", "getValue", "getText"
    ]
  }

  console.log(`✅ AI Assistant Helper: Initialization complete (v${HELPER_VERSION})`)
})() 