// Events module for the AI Assistant
;(() => {
  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // Add the events module
  window.AIAssistantModules.events = {
    // Initialize event handlers
    init() {
      this.setupMessageHandling()
      this.setupKeyboardShortcut()

      console.log("AI Assistant: Event handlers initialized")
    },

    // Setup message handling from iframe
    setupMessageHandling() {
      const config = window.AIAssistantModules.config.current
      const iframe = window.AIAssistantModules.ui.elements.iframe

      window.addEventListener("message", (event) => {
        let expectedOrigin
        try {
          expectedOrigin = new URL(config.iframeUrl).origin
        } catch (e) {
          console.error("AI Assistant: Invalid iframeUrl for origin check", e)
          return
        }

        if (event.origin !== expectedOrigin) return
        if (!iframe || event.source !== iframe.contentWindow) return

        const command = event.data
        console.log("AI Assistant: Received command from assistant iframe:", command)

        if (command && command.action) {
          switch (command.action) {
            case "clickElement":
              // Implementation for clicking elements
              break
            case "setInputValue":
              // Implementation for setting input values
              break
            case "getPageTitle":
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                  {
                    action: "pageTitleResponse",
                    title: document.title,
                    requestId: command.requestId,
                  },
                  expectedOrigin,
                )
              }
              break
            case "closeAssistant":
              window.AIAssistantModules.ui.toggleVisibility()
              break
            default:
              console.warn("AI Assistant: Unknown action:", command.action)
          }
        } else {
          console.warn("AI Assistant: Received invalid message format:", command)
        }
      })
    },

    // Setup keyboard shortcut
    setupKeyboardShortcut() {
      const config = window.AIAssistantModules.config.current

      if (config.keyboardShortcut) {
        document.addEventListener("keydown", (event) => {
          if (event.altKey && event.key === config.keyboardShortcut) {
            window.AIAssistantModules.ui.toggleVisibility()
          }
        })
      }
    },
  }
})()
