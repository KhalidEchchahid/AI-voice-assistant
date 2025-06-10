// Initialization module for the AI Assistant
;(() => {
  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // Add the initialization function
  window.AIAssistantModules.init = (scriptElement) => {
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

    // Initialize public API
    window.AIAssistantModules.api.init()

    console.log("AI Assistant: Initialization complete")
  }
})()
