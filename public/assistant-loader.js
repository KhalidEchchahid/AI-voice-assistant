// AI Assistant Loader - UI & Widget Management
;(() => {
  console.log("AI Assistant Loader: Initializing UI system")

  // Load the helper script for action execution
  function loadHelperScript() {
    if (window.AIAssistantHelper) {
      console.log("AI Assistant Loader: Helper already loaded")
      return
    }
    
    // Resolve helper script URL relative to where the loader itself was fetched.
    let helperSrc = 'assistant-helper.js'

    try {
      // `document.currentScript` points to the <script> that is executing right now
      const current = document.currentScript

      if (current && current.src) {
        const url = new URL(current.src, window.location.href)
        // Replace the filename (everything after the last '/') with helper file name
        url.pathname = url.pathname.replace(/[^/]*$/, 'assistant-helper.js')
        helperSrc = url.href
      }
    } catch (err) {
      console.warn('AI Assistant Loader: Could not determine base path of loader script, falling back to relative helper path', err)
    }

    const script = document.createElement('script')
    script.src = helperSrc
    script.onload = () => {
      console.log(`AI Assistant Loader: Helper script loaded successfully from ${helperSrc}`)
      // Load DOM Monitor after helper is loaded
      loadDOMMonitorScript()
    }
    script.onerror = () => console.error(`AI Assistant Loader: Failed to load helper script from ${helperSrc}`)
    document.head.appendChild(script)
  }

  // Load the DOM Monitor script for real-time element discovery
  function loadDOMMonitorScript() {
    if (window.AIAssistantDOMMonitor) {
      console.log("AI Assistant Loader: DOM Monitor already loaded")
      return
    }
    
    // Resolve DOM monitor script URL
    let monitorSrc = 'live-dom-monitor.js'

    try {
      const current = document.currentScript || document.querySelector('script[src*="assistant-loader"]')

      if (current && current.src) {
        const url = new URL(current.src, window.location.href)
        url.pathname = url.pathname.replace(/[^/]*$/, 'live-dom-monitor.js')
        monitorSrc = url.href
      }
    } catch (err) {
      console.warn('AI Assistant Loader: Could not determine base path for DOM monitor script, falling back to relative path', err)
    }

    const script = document.createElement('script')
    script.src = monitorSrc
    script.onload = () => console.log(`AI Assistant Loader: DOM Monitor script loaded successfully from ${monitorSrc}`)
    script.onerror = () => console.error(`AI Assistant Loader: Failed to load DOM Monitor script from ${monitorSrc}`)
    document.head.appendChild(script)
  }

  // --- Configuration ---
  const DEFAULT_CONFIG = {
    // Assistant iframe URL - Auto-detect for development
    iframeUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.local') 
      ? "http://localhost:3000/" 
      : "https://ai-voice-assistant-nu.vercel.app/",

    // Initial state
    initiallyVisible: false,

    // Appearance
    theme: "gradient", // gradient, dark, light, custom
    primaryColor: "#4776E6",
    secondaryColor: "#8E54E9",
    customColor: "#3366FF", // Used when theme is 'custom'
    iconStyle: "microphone", // microphone, chat, robot
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: "1px",
    borderRadius: "16px",

    // Position and size
    position: "right", // right, left, follow-icon, bottom
    width: "400px",
    height: "600px",

    // Features
    draggableIcon: true,
    keyboardShortcut: "a", // with Alt key
    showHeader: false, // No header by default as requested
    showCloseButton: false,
    showMinimizeButton: false,
    rememberPosition: true,

    // Animation
    animationStyle: "slide-up", // slide-up, slide-side, fade, scale
    animationDuration: "0.5s",

    // Mobile settings
    mobileFullscreen: true,
    mobileBreakpoint: "768px",
  }

  // --- Element IDs ---
  const ELEMENT_IDS = {
    iframe: "ai-voice-assistant-iframe-instance",
    containerAttribute: "data-assistant-container-id",
    defaultContainer: "ai-assistant-widget-default-container",
    toggleButton: "ai-assistant-toggle-button",
    header: "ai-assistant-header",
    controls: "ai-assistant-controls",
    styleElement: "ai-assistant-styles",
  }

  // --- State variables ---
  let config = { ...DEFAULT_CONFIG }
  const elements = {
    container: null,
    iframe: null,
    toggleButton: null,
  }
  const state = {
    isVisible: false,
    isMinimized: false,
    isDragging: false,
    dragOffset: null,
    dragStartTime: 0,
    lastPosition: null,
  }

  // --- Read configuration from script data attributes ---
  function readConfigFromAttributes(scriptElement) {
    if (!scriptElement) return config

    console.log("AI Assistant: Reading configuration from attributes")

    // Process all data attributes
    for (const attr of scriptElement.attributes) {
      if (attr.name.startsWith("data-")) {
        const configKey = attr.name.replace("data-", "").replace(/-([a-z])/g, (g) => g[1].toUpperCase())

        if (configKey in config) {
          // Convert boolean strings to actual booleans
          if (attr.value === "true") config[configKey] = true
          else if (attr.value === "false") config[configKey] = false
          else config[configKey] = attr.value

          console.log(`AI Assistant: Set ${configKey} = ${config[configKey]}`)
        }
      }
    }

    // Load saved position if enabled
    if (config.rememberPosition && localStorage.getItem("ai-assistant-position")) {
      try {
        state.lastPosition = JSON.parse(localStorage.getItem("ai-assistant-position"))
      } catch (e) {
        console.error("AI Assistant: Failed to parse saved position", e)
      }
    }

    // Set initial visibility
    state.isVisible = config.initiallyVisible

    return config
  }

  // --- Generate dynamic styles based on configuration ---
  function generateStyles() {
    // Generate theme colors
    let buttonBackground = ""
    let buttonHoverBackground = ""
    let assistantBackground = ""

    switch (config.theme) {
      case "gradient":
        buttonBackground = `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`
        buttonHoverBackground = `linear-gradient(135deg, ${config.primaryColor} 20%, ${config.secondaryColor} 80%)`
        assistantBackground = `linear-gradient(180deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`
        break
      case "dark":
        buttonBackground = "#1a1a1a"
        buttonHoverBackground = "#333333"
        assistantBackground = "#1a1a1a"
        break
      case "light":
        buttonBackground = "#f0f0f0"
        buttonHoverBackground = "#e0e0e0"
        assistantBackground = "#ffffff"
        break
      case "custom":
        buttonBackground = config.customColor
        buttonHoverBackground = config.customColor
        assistantBackground = config.customColor
        break
    }

    // Generate icon color based on theme
    const iconColor = config.theme === "light" ? "#333333" : "white"

    // Generate animation styles
    let animationIn = ""
    let animationOut = ""
    let transformOrigin = ""

    switch (config.animationStyle) {
      case "slide-up":
        animationIn = "transform: translateY(0); opacity: 1;"
        animationOut = "transform: translateY(20px); opacity: 0;"
        break
      case "slide-side":
        if (config.position === "right") {
          animationIn = "transform: translateX(0); opacity: 1;"
          animationOut = "transform: translateX(50px); opacity: 0;"
        } else {
          animationIn = "transform: translateX(0); opacity: 1;"
          animationOut = "transform: translateX(-50px); opacity: 0;"
        }
        break
      case "scale":
        animationIn = "transform: scale(1); opacity: 1;"
        animationOut = "transform: scale(0.9); opacity: 0;"
        transformOrigin = config.position === "right" ? "top right" : "top left"
        break
      case "fade":
        animationIn = "opacity: 1;"
        animationOut = "opacity: 0;"
        break
      default:
        animationIn = "transform: translateY(0); opacity: 1;"
        animationOut = "transform: translateY(20px); opacity: 0;"
    }

    // Position styles
    let positionStyles = ""

    switch (config.position) {
      case "right":
        positionStyles = "right: 20px; top: 20px;"
        break
      case "left":
        positionStyles = "left: 20px; top: 20px;"
        break
      case "bottom":
        positionStyles = "bottom: 20px; right: 20px;"
        break
      default:
        positionStyles = "right: 20px; top: 20px;"
    }

    return `
      /* Modern reset */
      #${ELEMENT_IDS.defaultContainer} *,
      #${ELEMENT_IDS.toggleButton} * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      /* Container styling */
      #${ELEMENT_IDS.defaultContainer} {
        position: fixed;
        ${positionStyles}
        width: ${config.width};
        height: ${config.height};
        z-index: 9999;
        background: ${assistantBackground};
        display: none;
        flex-direction: column;
        transition: all ${config.animationDuration} cubic-bezier(0.16, 1, 0.3, 1);
        ${animationOut}
        ${transformOrigin ? `transform-origin: ${transformOrigin};` : ""}
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        border: ${config.borderWidth} solid ${config.borderColor};
        border-radius: ${config.borderRadius};
        overflow: hidden;
      }
      
      /* Visible state */
      #${ELEMENT_IDS.defaultContainer}.visible {
        display: flex;
        ${animationIn}
      }
      
      /* Minimized state */
      #${ELEMENT_IDS.defaultContainer}.minimized {
        height: 60px !important;
        overflow: hidden;
      }
      
      /* Header styling */
      #${ELEMENT_IDS.header} {
        display: ${config.showHeader ? "flex" : "none"};
        align-items: center;
        justify-content: flex-end;
        padding: 10px;
        background: ${buttonBackground};
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      /* Control buttons */
      #${ELEMENT_IDS.controls} {
        display: flex;
        gap: 8px;
      }
      
      #${ELEMENT_IDS.controls} button {
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
      
      #${ELEMENT_IDS.controls} button:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      /* Iframe styling */
      #${ELEMENT_IDS.iframe} {
        width: 100%;
        height: 100%;
        border: none;
        flex: 1;
      }
      
      /* Toggle button styling */
      #${ELEMENT_IDS.toggleButton} {
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
      #${ELEMENT_IDS.toggleButton}.dragging {
        cursor: grabbing;
        opacity: 0.8;
      }
      
      /* Hover effect */
      #${ELEMENT_IDS.toggleButton}:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        background: ${buttonHoverBackground};
      }
      
      /* Active effect */
      #${ELEMENT_IDS.toggleButton}:active {
        transform: scale(0.95);
      }
      
      /* Button icon */
      #${ELEMENT_IDS.toggleButton} svg {
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
      #${ELEMENT_IDS.toggleButton}.pulse {
        animation: pulse 2s infinite;
      }
      
      /* Responsive adjustments for mobile */
      @media (max-width: ${config.mobileBreakpoint}) {
        #${ELEMENT_IDS.defaultContainer} {
          width: ${config.mobileFullscreen ? "100%" : config.width};
          height: ${config.mobileFullscreen ? "100vh" : config.height};
          ${config.mobileFullscreen ? "top: 0; left: 0; right: 0; bottom: 0; border-radius: 0;" : ""}
        }
      }
    `
  }

  // --- Inject styles into the document ---
  function injectStyles() {
    let styleElement = document.getElementById(ELEMENT_IDS.styleElement)

    if (!styleElement) {
      styleElement = document.createElement("style")
      styleElement.id = ELEMENT_IDS.styleElement
      styleElement.type = "text/css"
      document.head.appendChild(styleElement)
    }

    styleElement.textContent = generateStyles()
    console.log("AI Assistant: Styles injected")
  }

  // --- Create the assistant container and iframe ---
  function createAssistant() {
    // Create or find container
    const containerId = ELEMENT_IDS.defaultContainer
    let mountPoint = document.getElementById(containerId)

    if (!mountPoint) {
      mountPoint = document.createElement("div")
      mountPoint.id = containerId
      document.body.appendChild(mountPoint)
    }

    elements.container = mountPoint

    // Add header with controls if needed
    if (config.showHeader) {
      const header = document.createElement("div")
      header.id = ELEMENT_IDS.header

      const controls = document.createElement("div")
      controls.id = ELEMENT_IDS.controls

      if (config.showMinimizeButton) {
        const minimizeButton = document.createElement("button")
        minimizeButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
        minimizeButton.setAttribute("aria-label", "Minimize")
        minimizeButton.addEventListener("click", toggleMinimize)
        controls.appendChild(minimizeButton)
      }

      if (config.showCloseButton) {
        const closeButton = document.createElement("button")
        closeButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
        closeButton.setAttribute("aria-label", "Close")
        closeButton.addEventListener("click", toggleVisibility)
        controls.appendChild(closeButton)
      }

      header.appendChild(controls)
      mountPoint.appendChild(header)
    }

    // Create iframe
    const iframe = document.createElement("iframe")
    iframe.id = ELEMENT_IDS.iframe
    iframe.src = config.iframeUrl
    iframe.allow = "microphone; camera"
    iframe.title = "AI Voice Assistant"

    mountPoint.appendChild(iframe)
    elements.iframe = iframe

    // Add visible class if initially visible
    if (state.isVisible) {
      mountPoint.classList.add("visible")
    }

    console.log("AI Assistant: UI elements created")
  }

  // --- Create the toggle button ---
  function createToggleButton() {
    const button = document.createElement("button")
    button.id = ELEMENT_IDS.toggleButton
    button.setAttribute("aria-label", "Toggle AI Assistant")
    button.innerHTML = getAssistantIcon(state.isVisible ? "close" : "open")

    // Add pulse animation to draw attention
    if (!state.isVisible) {
      button.classList.add("pulse")
    }

    // Set initial position if saved
    if (state.lastPosition) {
      button.style.top = `${state.lastPosition.y}px`
      button.style.right = "auto"
      button.style.left = `${state.lastPosition.x}px`
    }

    // Add click event for toggling
    button.addEventListener("click", (e) => {
      // Only toggle if we're not dragging
      if (!state.isDragging) {
        toggleVisibility()
      }
    })

    // Add drag functionality if enabled
    if (config.draggableIcon) {
      // Mouse events
      button.addEventListener("mousedown", startDrag)
      document.addEventListener("mousemove", drag)
      document.addEventListener("mouseup", endDrag)

      // Touch events for mobile
      button.addEventListener("touchstart", startDrag, { passive: false })
      document.addEventListener("touchmove", drag, { passive: false })
      document.addEventListener("touchend", endDrag)
    }

    document.body.appendChild(button)
    elements.toggleButton = button

    console.log("AI Assistant: Toggle button created")
  }

  // --- Toggle assistant visibility ---
  function toggleVisibility() {
    state.isVisible = !state.isVisible

    if (elements.container) {
      if (state.isVisible) {
        elements.container.style.display = "flex"
        setTimeout(() => elements.container.classList.add("visible"), 10)

        if (elements.toggleButton) {
          elements.toggleButton.innerHTML = getAssistantIcon("close")
          elements.toggleButton.classList.remove("pulse")
        }

        // Position the assistant near the toggle button if follow-icon is enabled
        if (config.position === "follow-icon" && elements.toggleButton) {
          positionAssistantNearButton()
        }
      } else {
        elements.container.classList.remove("visible")
        setTimeout(() => {
          if (!state.isVisible) elements.container.style.display = "none"
        }, Number.parseFloat(config.animationDuration) * 1000)

        if (elements.toggleButton) {
          elements.toggleButton.innerHTML = getAssistantIcon("open")
          // Add pulse animation after closing
          setTimeout(() => elements.toggleButton.classList.add("pulse"), 1000)
        }
      }
    }
  }

  // --- Position the assistant near the toggle button ---
  function positionAssistantNearButton() {
    const buttonRect = elements.toggleButton.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const containerWidth = Number.parseInt(config.width)
    const containerHeight = Number.parseInt(config.height)

    // Check if there's enough space in different directions
    const spaceRight = windowWidth - buttonRect.right
    const spaceLeft = buttonRect.left
    const spaceBelow = windowHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top

    // Find the best position
    if (spaceRight >= containerWidth) {
      // Position to the right
      elements.container.style.left = `${buttonRect.right + 10}px`
      elements.container.style.top = `${buttonRect.top}px`
      elements.container.style.right = "auto"
      elements.container.style.bottom = "auto"
    } else if (spaceLeft >= containerWidth) {
      // Position to the left
      elements.container.style.right = `${windowWidth - buttonRect.left + 10}px`
      elements.container.style.top = `${buttonRect.top}px`
      elements.container.style.left = "auto"
      elements.container.style.bottom = "auto"
    } else if (spaceBelow >= containerHeight) {
      // Position below
      elements.container.style.top = `${buttonRect.bottom + 10}px`
      elements.container.style.left = `${Math.max(10, Math.min(windowWidth - containerWidth - 10, buttonRect.left))}px`
      elements.container.style.right = "auto"
      elements.container.style.bottom = "auto"
    } else if (spaceAbove >= containerHeight) {
      // Position above
      elements.container.style.bottom = `${windowHeight - buttonRect.top + 10}px`
      elements.container.style.left = `${Math.max(10, Math.min(windowWidth - containerWidth - 10, buttonRect.left))}px`
      elements.container.style.top = "auto"
      elements.container.style.right = "auto"
    } else {
      // Default position (centered)
      elements.container.style.top = "50%"
      elements.container.style.left = "50%"
      elements.container.style.transform = "translate(-50%, -50%)"
      elements.container.style.right = "auto"
      elements.container.style.bottom = "auto"
    }
  }

  // --- Toggle minimize state ---
  function toggleMinimize() {
    state.isMinimized = !state.isMinimized

    if (elements.container) {
      if (state.isMinimized) {
        elements.container.classList.add("minimized")
      } else {
        elements.container.classList.remove("minimized")
      }
    }
  }

  // --- Get icon based on configuration and state ---
  function getAssistantIcon(state = "open") {
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
  }

  // --- Drag functionality ---
  function startDrag(e) {
    // Prevent default only for touch events to avoid scrolling
    if (e.type === "touchstart") {
      e.preventDefault()
    }

    state.isDragging = false // Start with false to detect if it's a click or drag
    state.dragStartTime = Date.now()

    const clientX = e.clientX || (e.touches && e.touches[0].clientX)
    const clientY = e.clientY || (e.touches && e.touches[0].clientY)

    if (!clientX || !clientY) return

    const rect = elements.toggleButton.getBoundingClientRect()
    state.dragOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }

    // Add a class to indicate dragging state
    elements.toggleButton.classList.add("dragging")
  }

  function drag(e) {
    if (!state.dragOffset || !elements.toggleButton) return

    const clientX = e.clientX || (e.touches && e.touches[0].clientX)
    const clientY = e.clientY || (e.touches && e.touches[0].clientY)

    if (!clientX || !clientY) return

    // Only start actual dragging after a small threshold (both time and distance)
    const dragDistance = Math.sqrt(
      Math.pow(clientX - (elements.toggleButton.getBoundingClientRect().left + state.dragOffset.x), 2) +
        Math.pow(clientY - (elements.toggleButton.getBoundingClientRect().top + state.dragOffset.y), 2),
    )

    const dragTime = Date.now() - state.dragStartTime

    if (dragDistance > 5 || dragTime > 200) {
      state.isDragging = true
    }

    if (state.isDragging) {
      const x = clientX - state.dragOffset.x
      const y = clientY - state.dragOffset.y

      // Constrain to window boundaries
      const maxX = window.innerWidth - elements.toggleButton.offsetWidth
      const maxY = window.innerHeight - elements.toggleButton.offsetHeight

      elements.toggleButton.style.left = `${Math.max(0, Math.min(maxX, x))}px`
      elements.toggleButton.style.top = `${Math.max(0, Math.min(maxY, y))}px`
      elements.toggleButton.style.right = "auto"
      elements.toggleButton.style.bottom = "auto"
    }
  }

  function endDrag() {
    if (state.isDragging && config.rememberPosition && elements.toggleButton) {
      // Save position to localStorage
      const rect = elements.toggleButton.getBoundingClientRect()
      const position = { x: rect.left, y: rect.top }
      localStorage.setItem("ai-assistant-position", JSON.stringify(position))
    }

    state.dragOffset = null

    // Small delay to prevent immediate click after drag
    setTimeout(() => {
      state.isDragging = false
    }, 50)

    if (elements.toggleButton) {
      elements.toggleButton.classList.remove("dragging")
    }
  }

  // --- Communication Bridge Functions ---

  // Send message to iframe
  function sendMessageToIframe(message) {
    if (elements.iframe && elements.iframe.contentWindow) {
      try {
        const expectedOrigin = new URL(config.iframeUrl).origin
        
        // ENHANCED: Ensure message is JSON-serializable to prevent DataCloneError
        let serializedMessage;
        try {
          // Test serialization and clean any non-serializable objects
          serializedMessage = JSON.parse(JSON.stringify(message));
        } catch (serializationError) {
          console.warn("AI Assistant: Message serialization failed, attempting cleanup:", serializationError);
          
          // Create a clean version by manually copying serializable properties
          serializedMessage = {};
          for (const [key, value] of Object.entries(message)) {
            try {
              // Test if this property is serializable
              JSON.stringify(value);
              serializedMessage[key] = value;
            } catch (e) {
              console.warn(`AI Assistant: Skipping non-serializable property '${key}':`, e.message);
              // For debugging, include a note about what was skipped
              serializedMessage[`${key}_skipped`] = `Non-serializable: ${typeof value}`;
            }
          }
        }
        
        console.log("AI Assistant: Sending message to iframe:", {
          origin: expectedOrigin,
          messageType: serializedMessage.type || serializedMessage.action,
          messageSize: JSON.stringify(serializedMessage).length
        });
        
        elements.iframe.contentWindow.postMessage(serializedMessage, expectedOrigin)
      } catch (e) {
        console.error("AI Assistant: Failed to send message to iframe:", e)
        console.error("AI Assistant: Message that failed to send:", message)
      }
    } else {
      console.warn("AI Assistant: Cannot send message - iframe not available")
    }
  }

  // --- Handle messages from iframe ---
  function setupMessageHandling() {
    window.addEventListener("message", (event) => {
      let expectedOrigin
      try {
        expectedOrigin = new URL(config.iframeUrl).origin
      } catch (e) {
        console.error("AI Assistant: Invalid iframeUrl for origin check", e)
        return
      }

      if (event.origin !== expectedOrigin) return
      if (!elements.iframe || event.source !== elements.iframe.contentWindow) return

      const command = event.data
      console.log("AI Assistant: Received command from assistant iframe:", command)

              // Handle different command types
        if (command && command.action) {
          switch (command.action) {
            case "execute_actions":
              // Delegate to helper
              if (window.AIAssistantHelper) {
                window.AIAssistantHelper.executeActions(command)
              } else {
                console.error("AI Assistant: Helper not loaded for action execution")
              }
              break
              
            // Handle LiveKit data channel messages forwarded from the widget
            case "livekit_data_received":
              if (window.AIAssistantHelper) {
                window.AIAssistantHelper.handleLiveKitDataMessage(command.data)
              } else {
                console.error("AI Assistant: Helper not loaded for LiveKit data handling")
              }
              break

            // Handle DOM Monitor requests from backend (via LiveKit)
            case "dom_monitor_request":
              console.log('📡 Received DOM Monitor request from backend via iframe:', command);
              
              // Extract request details
              const requestData = command.payload || command;
              const requestId = requestData.request_id;
              const intent = requestData.intent;
              const options = requestData.options || {};
              
              if (window.AIAssistantDOMMonitor) {
                try {
                  console.log('🔍 Processing DOM Monitor request:', { requestId, intent, options });
                  
                  // Call DOM Monitor to find elements based on intent
                  const elements = window.AIAssistantDOMMonitor.findElements(intent, options);
                  
                  console.log('📋 DOM Monitor found elements:', elements);
                  
                  // FIXED: Properly serialize elements to prevent clone errors
                  const serializedElements = elements.map(element => {
                    console.log('🔍 Serializing element:', element); // Debug log
                    
                    // CORRECTED: Use the already-extracted text from DOM Monitor
                    // The structure is: element.element.text (already extracted by DOM Monitor)
                    const elementData = element.element; // This is the elementData from DOM Monitor
                    const domElement = elementData?.element; // This is the actual DOM element
                    
                    // Use the text that DOM Monitor already extracted
                    let elementText = elementData?.text || '';
                    
                    // Only try DOM extraction as a fallback if DOM Monitor text is empty
                    if (!elementText && domElement) {
                      console.log('🔍 DOM Monitor text empty, trying DOM extraction as fallback...');
                      try {
                        if (domElement.textContent && domElement.textContent.trim()) {
                          elementText = domElement.textContent.trim();
                          console.log('✅ Got fallback text from textContent:', elementText.substring(0, 50));
                        } else if (domElement.innerText && domElement.innerText.trim()) {
                          elementText = domElement.innerText.trim();
                          console.log('✅ Got fallback text from innerText:', elementText.substring(0, 50));
                        } else if (domElement.value) {
                          elementText = domElement.value;
                          console.log('✅ Got fallback text from value:', elementText.substring(0, 50));
                        } else if (domElement.alt) {
                          elementText = domElement.alt;
                          console.log('✅ Got fallback text from alt:', elementText.substring(0, 50));
                        } else if (domElement.title) {
                          elementText = domElement.title;
                          console.log('✅ Got fallback text from title:', elementText.substring(0, 50));
                        } else if (domElement.placeholder) {
                          elementText = domElement.placeholder;
                          console.log('✅ Got fallback text from placeholder:', elementText.substring(0, 50));
                        } else if (domElement.getAttribute && domElement.getAttribute('aria-label')) {
                          elementText = domElement.getAttribute('aria-label');
                          console.log('✅ Got fallback text from aria-label:', elementText.substring(0, 50));
                        }
                      } catch (e) {
                        console.error('❌ Error extracting fallback text from DOM element:', e);
                      }
                    } else if (elementText) {
                      console.log('✅ Using DOM Monitor extracted text:', elementText.substring(0, 50));
                    }
                    
                    // Last resort: extract from elementId if it contains encoded text
                    if (!elementText && (element.elementId || elementData?.id)) {
                      const elementId = element.elementId || elementData.id;
                      // Element IDs like "button___call_790_99" contain the text
                      const idParts = elementId.split('___');
                      if (idParts.length > 1) {
                        const textPart = idParts[1].split('__')[0]; // Get part before coordinates
                        if (textPart && textPart !== (elementData?.tagName || element.tagName)) {
                          elementText = textPart.replace(/_/g, ' '); // Convert underscores to spaces
                          console.log('✅ Got text from elementId:', elementText);
                        }
                      }
                    }
                    
                    // Clean up the text (remove extra whitespace, truncate if too long)
                    if (elementText) {
                      elementText = elementText.replace(/\s+/g, ' ').trim();
                      if (elementText.length > 200) {
                        elementText = elementText.substring(0, 197) + '...';
                      }
                    }
                    
                    // Extract attributes - use DOM Monitor data first, then fallback to DOM
                    let elementAttrs = elementData?.attributes || {};
                    if (domElement && Object.keys(elementAttrs).length === 0) {
                      try {
                        elementAttrs = {
                          id: domElement.id || '',
                          className: domElement.className || '',
                          href: domElement.href || '',
                          src: domElement.src || '',
                          alt: domElement.alt || '',
                          title: domElement.title || '',
                          placeholder: domElement.placeholder || '',
                          type: domElement.type || '',
                          name: domElement.name || '',
                          ariaLabel: domElement.getAttribute ? domElement.getAttribute('aria-label') || '' : '',
                          role: domElement.getAttribute ? domElement.getAttribute('role') || '' : ''
                        };
                      } catch (e) {
                        console.error('❌ Error extracting attributes:', e);
                      }
                    }
                    
                    // Create a comprehensive serialized element using DOM Monitor data
                    const serialized = {
                      elementId: element.elementId || elementData?.id || 'unknown',
                      tagName: elementData?.tagName || element.tagName || 'unknown',
                      text: elementText,
                      role: elementData?.role || element.role || elementAttrs.role || 'unknown',
                      confidence: element.confidence || 0.8,
                      position: elementData?.position || element.position || {},
                      visibility: elementData?.visibility !== undefined ? elementData.visibility : true,
                      interactable: elementData?.interactable !== undefined ? elementData.interactable : true,
                      selectors: elementData?.selectors || element.selectors || [],
                      attributes: elementAttrs,
                      // Add debugging info
                      debug: {
                        originalTextFound: !!elementText,
                        textSource: elementText ? (elementData?.text ? 'dom_monitor' : (domElement ? 'dom_fallback' : 'elementId')) : 'none',
                        hasElement: !!domElement,
                        hasElementData: !!elementData,
                        elementKeys: elementData ? Object.keys(elementData) : [],
                        textLength: elementText ? elementText.length : 0,
                        domMonitorText: elementData?.text || 'none',
                        domMonitorTextLength: elementData?.text ? elementData.text.length : 0
                      }
                    };
                    
                    console.log('✅ Serialized element:', {
                      id: serialized.elementId.substring(0, 30) + '...',
                      tag: serialized.tagName,
                      text: serialized.text.substring(0, 50) + (serialized.text.length > 50 ? '...' : ''),
                      textLength: serialized.text.length,
                      textSource: serialized.debug.textSource,
                      domMonitorText: serialized.debug.domMonitorText.substring(0, 30) + '...'
                    });
                    
                    return serialized;
                  });
                  
                  // Prepare response for backend
                  const response = {
                    type: 'dom_monitor_response',
                    request_id: requestId,
                    intent: intent,
                    elements: serializedElements,
                    success: true,
                    timestamp: new Date().toISOString(),
                    source: 'live_dom_monitor'
                  };
                  
                  // Send response back to iframe (which will forward to backend)
                  sendMessageToIframe(response);
                  console.log('📤 Sent DOM Monitor response to iframe:', response);
                  
                } catch (error) {
                  console.error('❌ Error processing DOM Monitor request:', error);
                  
                  // Send error response
                  const errorResponse = {
                    type: 'dom_monitor_response',
                    request_id: requestId,
                    intent: intent,
                    elements: [],
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    source: 'live_dom_monitor'
                  };
                  
                  sendMessageToIframe(errorResponse);
                }
              } else {
                console.warn('⚠️ DOM Monitor not available for request:', requestId);
                
                // Send not available response
                const notAvailableResponse = {
                  type: 'dom_monitor_response',
                  request_id: requestId,
                  intent: intent,
                  elements: [],
                  success: false,
                  error: 'DOM Monitor not initialized',
                  timestamp: new Date().toISOString(),
                  source: 'live_dom_monitor'
                };
                
                sendMessageToIframe(notAvailableResponse);
              }
              break

            // Handle DOM Monitor commands (legacy support)
            case "dom_monitor_find_elements":
              if (window.AIAssistantDOMMonitor) {
                const elements = window.AIAssistantDOMMonitor.findElements(command.intent, command.options)
                sendMessageToIframe({
                  action: "dom_monitor_response",
                  requestId: command.requestId,
                  data: elements,
                  success: true
                })
              } else {
                sendMessageToIframe({
                  action: "dom_monitor_response", 
                  requestId: command.requestId,
                  error: "DOM Monitor not loaded",
                  success: false
                })
              }
              break

            case "dom_monitor_get_stats":
              if (window.AIAssistantDOMMonitor) {
                const stats = window.AIAssistantDOMMonitor.getStats()
                sendMessageToIframe({
                  action: "dom_monitor_response",
                  requestId: command.requestId,
                  data: stats,
                  success: true
                })
              } else {
                sendMessageToIframe({
                  action: "dom_monitor_response",
                  requestId: command.requestId, 
                  error: "DOM Monitor not loaded",
                  success: false
                })
              }
              break

            case "dom_monitor_get_all_elements":
              if (window.AIAssistantDOMMonitor) {
                const elements = window.AIAssistantDOMMonitor.getAllElements(command.filter)
                sendMessageToIframe({
                  action: "dom_monitor_response",
                  requestId: command.requestId,
                  data: elements,
                  success: true
                })
              } else {
                sendMessageToIframe({
                  action: "dom_monitor_response",
                  requestId: command.requestId,
                  error: "DOM Monitor not loaded", 
                  success: false
                })
              }
              break

            case "dom_monitor_refresh":
              if (window.AIAssistantDOMMonitor) {
                const result = window.AIAssistantDOMMonitor.refresh()
                sendMessageToIframe({
                  action: "dom_monitor_response",
                  requestId: command.requestId,
                  data: result,
                  success: true
                })
              } else {
                sendMessageToIframe({
                  action: "dom_monitor_response",
                  requestId: command.requestId,
                  error: "DOM Monitor not loaded",
                  success: false
                })
              }
              break
              
            case "getPageTitle":
              sendMessageToIframe({
                action: "pageTitleResponse",
                title: document.title,
                requestId: command.requestId,
              })
              break
              
            case "closeAssistant":
              toggleVisibility()
              break
              
            default:
              console.warn("AI Assistant: Unknown action:", command.action)
          }
      } else if (command && command.commands) {
        // Direct command execution (new format from backend)
        console.log("AI Assistant: Received direct command execution request")
        if (window.AIAssistantHelper) {
          window.AIAssistantHelper.executeActions(command)
        } else {
          console.error("AI Assistant: Helper not loaded for direct command execution")
        }
      } else {
        console.warn("AI Assistant: Received invalid message format:", command)
      }
    })
  }

  // --- Setup keyboard shortcut ---
  function setupKeyboardShortcut() {
    if (config.keyboardShortcut) {
      document.addEventListener("keydown", (event) => {
        if (event.altKey && event.key === config.keyboardShortcut) {
          toggleVisibility()
        }
      })
    }
  }

  // --- Initialize the assistant ---
  function initAssistant(scriptElement) {
    // Load helper script first
    loadHelperScript()
    
    // Read configuration
    readConfigFromAttributes(scriptElement)

    // Inject styles
    injectStyles()

    // Create UI elements
    createAssistant()
    createToggleButton()

    // Setup event handlers
    setupMessageHandling()
    setupKeyboardShortcut()

    // Expose Loader API for external control and helper communication
    window.AIAssistantLoader = {
      toggle: toggleVisibility,
      minimize: toggleMinimize,
      show: () => {
        if (!state.isVisible) toggleVisibility()
      },
      hide: () => {
        if (state.isVisible) toggleVisibility()
      },
      updateConfig: (newConfig) => {
        config = { ...config, ...newConfig }
        injectStyles()
      },
      sendMessageToIframe: sendMessageToIframe,
      
      // DOM Monitor integration
      domMonitor: {
        findElements: (intent, options = {}) => {
          if (window.AIAssistantDOMMonitor) {
            return window.AIAssistantDOMMonitor.findElements(intent, options)
          } else {
            console.warn("DOM Monitor not available")
            return []
          }
        },
        
        getStats: () => {
          if (window.AIAssistantDOMMonitor) {
            return window.AIAssistantDOMMonitor.getStats()
          } else {
            return null
          }
        },
        
        getAllElements: (filter = {}) => {
          if (window.AIAssistantDOMMonitor) {
            return window.AIAssistantDOMMonitor.getAllElements(filter)
          } else {
            return []
          }
        },
        
        refresh: () => {
          if (window.AIAssistantDOMMonitor) {
            return window.AIAssistantDOMMonitor.refresh()
          } else {
            return { success: false, error: "DOM Monitor not available" }
          }
        },
        
        isReady: () => {
          return window.AIAssistantDOMMonitor && window.AIAssistantDOMMonitor.isReady()
        },
        
        getStatus: () => {
          if (window.AIAssistantDOMMonitor) {
            return window.AIAssistantDOMMonitor.getStatus()
          } else {
            return { available: false, error: "DOM Monitor not loaded" }
          }
        }
      }
    }
    // an other test
    console.log("AI Assistant Loader: Initialization complete")
  }

  // Initialize when the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAssistant(document.currentScript))
  } else {
    initAssistant(document.currentScript)
  }
})() 