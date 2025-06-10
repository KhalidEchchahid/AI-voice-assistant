// Configuration module for the AI Assistant
;(() => {
  // Default configuration
  const DEFAULT_CONFIG = {
    // Assistant iframe URL
    iframeUrl: "https://ai-voice-assistant-nu.vercel.app/",

    // Initial state
    initiallyVisible: false,

    // Appearance
    theme: "gradient", // gradient, dark, light, custom
    primaryColor: "#4776E6",
    secondaryColor: "#8E54E9",
    customColor: "", // Used when theme is 'custom'
    iconStyle: "microphone", // microphone, chat, robot

    // Position and size
    position: "right", // right, left, follow-icon
    width: "400px",
    height: "100vh",

    // Features
    draggableIcon: true,
    keyboardShortcut: "a", // with Alt key
    showCloseButton: true,
    showMinimizeButton: true,
    rememberPosition: true,

    // Animation
    animationStyle: "slide", // slide, fade, none

    // Mobile settings
    mobileFullscreen: true,
    mobileBreakpoint: "768px",
  }

  // Element IDs
  const ELEMENT_IDS = {
    iframe: "ai-voice-assistant-iframe-instance",
    containerAttribute: "data-assistant-container-id",
    defaultContainer: "ai-assistant-widget-default-container",
    toggleButton: "ai-assistant-toggle-button",
    header: "ai-assistant-header",
    controls: "ai-assistant-controls",
  }

  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // Add the config module
  window.AIAssistantModules.config = {
    DEFAULT_CONFIG,
    ELEMENT_IDS,

    // Current configuration (will be populated during initialization)
    current: { ...DEFAULT_CONFIG },

    // Read configuration from script data attributes
    readFromAttributes(scriptElement) {
      if (!scriptElement) return this.current

      // Process all data attributes
      for (const attr of scriptElement.attributes) {
        if (attr.name.startsWith("data-")) {
          const configKey = attr.name.replace("data-", "").replace(/-([a-z])/g, (g) => g[1].toUpperCase())

          if (configKey in this.current) {
            // Convert boolean strings to actual booleans
            if (attr.value === "true") this.current[configKey] = true
            else if (attr.value === "false") this.current[configKey] = false
            else this.current[configKey] = attr.value
          }
        }
      }

      // Load saved position if enabled
      if (this.current.rememberPosition && localStorage.getItem("ai-assistant-position")) {
        try {
          this.lastPosition = JSON.parse(localStorage.getItem("ai-assistant-position"))
        } catch (e) {
          console.error("AI Assistant: Failed to parse saved position", e)
        }
      }

      return this.current
    },

    // Update configuration
    update(newConfig) {
      this.current = { ...this.current, ...newConfig }
      return this.current
    },
  }
})()
