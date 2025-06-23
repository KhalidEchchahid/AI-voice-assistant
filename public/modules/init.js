// Initialization module for the AI Assistant
;(() => {
  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // Add the initialization function
  window.AIAssistantModules.init = async (scriptElement) => {
    // Read configuration
    window.AIAssistantModules.config.readFromAttributes(scriptElement)

    // Inject styles
    window.AIAssistantModules.styles.inject()

    // Create UI elements
    window.AIAssistantModules.ui.createAssistant()
    window.AIAssistantModules.ui.createToggleButton()

    // Initialize drag functionality
    window.AIAssistantModules.drag.init()

    // Initialize event handlers
    window.AIAssistantModules.events.init()

    // Initialize DOM monitor if available
    if (window.AIAssistantModules.domMonitor) {
      try {
        await window.AIAssistantModules.domMonitor.init()
        console.log("AI Assistant: DOM Monitor initialized successfully")
      } catch (error) {
        console.warn("AI Assistant: DOM Monitor initialization failed:", error)
      }
    }

    // Initialize public API
    window.AIAssistantModules.api.init()

    console.log("AI Assistant: Initialization complete")
  }
})()
