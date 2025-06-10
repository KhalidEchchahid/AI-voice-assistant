// Styles module for the AI Assistant
;(() => {
  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // Add the styles module
  window.AIAssistantModules.styles = {
    // Generate dynamic styles based on configuration
    generate() {
      const config = window.AIAssistantModules.config.current
      const ids = window.AIAssistantModules.config.ELEMENT_IDS

      // Generate theme colors
      let buttonBackground = ""
      let buttonHoverBackground = ""

      switch (config.theme) {
        case "gradient":
          buttonBackground = `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`
          buttonHoverBackground = `linear-gradient(135deg, ${config.primaryColor} 20%, ${config.secondaryColor} 80%)`
          break
        case "dark":
          buttonBackground = "#1a1a1a"
          buttonHoverBackground = "#333333"
          break
        case "light":
          buttonBackground = "#f0f0f0"
          buttonHoverBackground = "#e0e0e0"
          break
        case "custom":
          buttonBackground = config.customColor
          buttonHoverBackground = config.customColor
          break
      }

      // Generate icon color based on theme
      const iconColor = config.theme === "light" ? "#333333" : "white"

      // Generate animation styles
      let animationIn = ""
      let animationOut = ""

      switch (config.animationStyle) {
        case "slide":
          animationIn = config.position === "right" ? "transform: translateX(0);" : "transform: translateX(0);"
          animationOut = config.position === "right" ? "transform: translateX(100%);" : "transform: translateX(-100%);"
          break
        case "fade":
          animationIn = "opacity: 1;"
          animationOut = "opacity: 0;"
          break
        case "none":
          animationIn = ""
          animationOut = ""
          break
      }

      // Position styles
      const positionStyles = config.position === "right" ? "right: 0; top: 0;" : "left: 0; top: 0;"

      return `
        /* Modern reset */
        #${ids.defaultContainer} *,
        #${ids.toggleButton} * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        /* Container styling */
        #${ids.defaultContainer} {
          position: fixed;
          ${positionStyles}
          width: ${config.width};
          height: ${config.height};
          z-index: 9999;
          background-color: transparent;
          display: none;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          ${animationOut}
          box-shadow: ${config.position === "right" ? "-5px" : "5px"} 0 25px rgba(0, 0, 0, 0.15);
        }
        
        /* Visible state */
        #${ids.defaultContainer}.visible {
          display: flex;
          ${animationIn}
        }
        
        /* Minimized state */
        #${ids.defaultContainer}.minimized {
          height: 60px !important;
          overflow: hidden;
        }
        
        /* Header styling */
        #${ids.header} {
          display: ${config.showMinimizeButton || config.showCloseButton ? "flex" : "none"};
          align-items: center;
          justify-content: flex-end;
          padding: 10px;
          background: ${buttonBackground};
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* Control buttons */
        #${ids.controls} {
          display: flex;
          gap: 8px;
        }
        
        #${ids.controls} button {
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        #${ids.controls} button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        /* Iframe styling */
        #${ids.iframe} {
          width: 100%;
          height: 100%;
          border: none;
          flex: 1;
        }
        
        /* Toggle button styling */
        #${ids.toggleButton} {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 50px;
          height: 50px;
          border: none;
          border-radius: 25px;
          cursor: ${config.draggableIcon ? "grab" : "pointer"};
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          transition: all 0.2s ease-in-out;
          background: ${buttonBackground};
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          touch-action: none; /* Prevents default touch actions */
        }
        
        /* Dragging state */
        #${ids.toggleButton}.dragging {
          cursor: grabbing;
          opacity: 0.8;
        }
        
        /* Hover effect */
        #${ids.toggleButton}:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          background: ${buttonHoverBackground};
        }
        
        /* Active effect */
        #${ids.toggleButton}:active {
          transform: scale(0.95);
        }
        
        /* Button icon */
        #${ids.toggleButton} svg {
          width: 24px;
          height: 24px;
          fill: ${iconColor};
          stroke: ${iconColor};
          transition: transform 0.3s ease;
        }
        
        /* Pulse animation for the button */
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(142, 84, 233, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(142, 84, 233, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(142, 84, 233, 0);
          }
        }
        
        /* Apply pulse animation to the button */
        #${ids.toggleButton}.pulse {
          animation: pulse 2s infinite;
        }
        
        /* Responsive adjustments for mobile */
        @media (max-width: ${config.mobileBreakpoint}) {
          #${ids.defaultContainer} {
            width: ${config.mobileFullscreen ? "100%" : config.width};
            height: ${config.mobileFullscreen ? "100vh" : config.height};
            ${config.mobileFullscreen ? "top: 0; left: 0; right: 0; bottom: 0;" : ""}
          }
        }
      `
    },

    // Inject styles into the document
    inject() {
      const styleId = "ai-assistant-styles"
      let styleElement = document.getElementById(styleId)

      if (!styleElement) {
        styleElement = document.createElement("style")
        styleElement.id = styleId
        styleElement.type = "text/css"
        document.head.appendChild(styleElement)
      }

      styleElement.textContent = this.generate()
    },
  }
})()
