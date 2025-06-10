// API module for the AI Assistant
;(() => {
  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // Add the API module
  window.AIAssistantModules.api = {
    // Initialize the public API
    init() {
      // Expose API for external control
      window.AIAssistant = {
        toggle: () => window.AIAssistantModules.ui.toggleVisibility(),
        minimize: () => window.AIAssistantModules.ui.toggleMinimize(),
        show: () => {
          if (!window.AIAssistantModules.ui.state.isVisible) {
            window.AIAssistantModules.ui.toggleVisibility()
          }
        },
        hide: () => {
          if (window.AIAssistantModules.ui.state.isVisible) {
            window.AIAssistantModules.ui.toggleVisibility()
          }
        },
        updateConfig: (newConfig) => {
          window.AIAssistantModules.config.update(newConfig)
          window.AIAssistantModules.styles.inject()
        },
      }

      console.log("AI Assistant: Public API initialized")
    },
  }
})()
