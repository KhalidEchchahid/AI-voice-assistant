// UI module for the AI Assistant
;(() => {
  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // Add the UI module
  window.AIAssistantModules.ui = {
    // State
    elements: {
      container: null,
      iframe: null,
      toggleButton: null,
    },
    state: {
      isVisible: false,
      isMinimized: false,
    },

    // Create the assistant container and iframe
    createAssistant() {
      const config = window.AIAssistantModules.config.current
      const ids = window.AIAssistantModules.config.ELEMENT_IDS

      // Create or find container
      const containerId = ids.defaultContainer
      let mountPoint = document.getElementById(containerId)

      if (!mountPoint) {
        mountPoint = document.createElement("div")
        mountPoint.id = containerId
        document.body.appendChild(mountPoint)
      }

      this.elements.container = mountPoint

      // Add header with controls if needed
      if (config.showMinimizeButton || config.showCloseButton) {
        const header = document.createElement("div")
        header.id = ids.header

        const controls = document.createElement("div")
        controls.id = ids.controls

        if (config.showMinimizeButton) {
          const minimizeButton = document.createElement("button")
          minimizeButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`
          minimizeButton.setAttribute("aria-label", "Minimize")
          minimizeButton.addEventListener("click", () => this.toggleMinimize())
          controls.appendChild(minimizeButton)
        }

        if (config.showCloseButton) {
          const closeButton = document.createElement("button")
          closeButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`
          closeButton.setAttribute("aria-label", "Close")
          closeButton.addEventListener("click", () => this.toggleVisibility())
          controls.appendChild(closeButton)
        }

        header.appendChild(controls)
        mountPoint.appendChild(header)
      }

      // Create iframe
      const iframe = document.createElement("iframe")
      iframe.id = ids.iframe
      iframe.src = config.iframeUrl
      iframe.allow = "microphone; camera"
      iframe.title = "AI Voice Assistant"

      mountPoint.appendChild(iframe)
      this.elements.iframe = iframe

      console.log("AI Assistant: UI elements created")
    },

    // Create the toggle button
    createToggleButton() {
      const config = window.AIAssistantModules.config.current
      const ids = window.AIAssistantModules.config.ELEMENT_IDS
      const lastPosition = window.AIAssistantModules.config.lastPosition

      const button = document.createElement("button")
      button.id = ids.toggleButton
      button.setAttribute("aria-label", "Toggle AI Assistant")
      button.innerHTML = this.getAssistantIcon(this.state.isVisible ? "close" : "open")

      // Add pulse animation to draw attention
      if (!this.state.isVisible) {
        button.classList.add("pulse")
      }

      // Set initial position if saved
      if (lastPosition) {
        button.style.top = `${lastPosition.y}px`
        button.style.right = "auto"
        button.style.left = `${lastPosition.x}px`
      }

      // Add click event for toggling
      button.addEventListener("click", (e) => {
        // Only toggle if we're not dragging
        if (!window.AIAssistantModules.drag.isDragging) {
          this.toggleVisibility()
        }
      })

      document.body.appendChild(button)
      this.elements.toggleButton = button

      console.log("AI Assistant: Toggle button created")
    },

    // Toggle assistant visibility
    toggleVisibility() {
      this.state.isVisible = !this.state.isVisible
      const config = window.AIAssistantModules.config.current

      if (this.elements.container) {
        if (this.state.isVisible) {
          this.elements.container.style.display = "flex"
          setTimeout(() => this.elements.container.classList.add("visible"), 10)

          if (this.elements.toggleButton) {
            this.elements.toggleButton.innerHTML = this.getAssistantIcon("close")
            this.elements.toggleButton.classList.remove("pulse")
          }

          // Position the assistant near the toggle button if follow-icon is enabled
          if (config.position === "follow-icon" && this.elements.toggleButton) {
            this.positionAssistantNearButton()
          }
        } else {
          this.elements.container.classList.remove("visible")
          setTimeout(() => {
            if (!this.state.isVisible) this.elements.container.style.display = "none"
          }, 300)

          if (this.elements.toggleButton) {
            this.elements.toggleButton.innerHTML = this.getAssistantIcon("open")
            // Add pulse animation after closing
            setTimeout(() => this.elements.toggleButton.classList.add("pulse"), 1000)
          }
        }
      }
    },

    // Position the assistant near the toggle button
    positionAssistantNearButton() {
      const buttonRect = this.elements.toggleButton.getBoundingClientRect()
      const windowWidth = window.innerWidth

      if (windowWidth - buttonRect.right > 400) {
        // Enough space on the right
        this.elements.container.style.right = "auto"
        this.elements.container.style.left = `${buttonRect.right + 10}px`
        this.elements.container.style.top = `${buttonRect.top}px`
      } else if (buttonRect.left > 400) {
        // Enough space on the left
        this.elements.container.style.left = "auto"
        this.elements.container.style.right = `${windowWidth - buttonRect.left + 10}px`
        this.elements.container.style.top = `${buttonRect.top}px`
      } else {
        // Not enough space on either side, position below
        this.elements.container.style.left = "auto"
        this.elements.container.style.right = "20px"
        this.elements.container.style.top = `${buttonRect.bottom + 10}px`
      }
    },

    // Toggle minimize state
    toggleMinimize() {
      this.state.isMinimized = !this.state.isMinimized

      if (this.elements.container) {
        if (this.state.isMinimized) {
          this.elements.container.classList.add("minimized")
        } else {
          this.elements.container.classList.remove("minimized")
        }
      }
    },

    // Get icon based on configuration and state
    getAssistantIcon(state = "open") {
      const config = window.AIAssistantModules.config.current

      if (state === "close") {
        // Close icon
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
      }

      // Open icon based on configuration
      switch (config.iconStyle) {
        case "chat":
          return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`
        case "robot":
          return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 9H17M8 13H16M12 3V5M19 7L17 9M5 7L7 9M12 21V18M9 18H15M6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12V15C18 16.1046 17.1046 17 16 17H8C6.89543 17 6 16.1046 6 15V12Z" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`
        case "microphone":
        default:
          return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15.5C14.21 15.5 16 13.71 16 11.5V6C16 3.79 14.21 2 12 2C9.79 2 8 3.79 8 6V11.5C8 13.71 9.79 15.5 12 15.5Z" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4.34998 9.35001V11.35C4.34998 15.57 7.77998 19 12 19C16.22 19 19.65 15.57 19.65 11.35V9.35001" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 19V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 22H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`
      }
    },
  }
})()
