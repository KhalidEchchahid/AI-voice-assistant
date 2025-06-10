// Drag module for the AI Assistant
;(() => {
  // Initialize the module
  window.AIAssistantModules = window.AIAssistantModules || {}

  // Add the drag module
  window.AIAssistantModules.drag = {
    // State
    isDragging: false,
    dragOffset: null,
    dragStartTime: 0,

    // Initialize drag functionality
    init() {
      const config = window.AIAssistantModules.config.current
      const button = window.AIAssistantModules.ui.elements.toggleButton

      if (!config.draggableIcon || !button) return

      // Mouse events
      button.addEventListener("mousedown", (e) => this.startDrag(e))
      document.addEventListener("mousemove", (e) => this.drag(e))
      document.addEventListener("mouseup", () => this.endDrag())

      // Touch events for mobile
      button.addEventListener("touchstart", (e) => this.startDrag(e), { passive: false })
      document.addEventListener("touchmove", (e) => this.drag(e), { passive: false })
      document.addEventListener("touchend", () => this.endDrag())

      console.log("AI Assistant: Drag functionality initialized")
    },

    // Start dragging
    startDrag(e) {
      const button = window.AIAssistantModules.ui.elements.toggleButton

      // Prevent default only for touch events to avoid scrolling
      if (e.type === "touchstart") {
        e.preventDefault()
      }

      this.isDragging = false // Start with false to detect if it's a click or drag
      this.dragStartTime = Date.now()

      const clientX = e.clientX || (e.touches && e.touches[0].clientX)
      const clientY = e.clientY || (e.touches && e.touches[0].clientY)

      if (!clientX || !clientY) return

      const rect = button.getBoundingClientRect()
      this.dragOffset = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      }

      // Add a class to indicate dragging state
      button.classList.add("dragging")
    },

    // Drag the button
    drag(e) {
      const button = window.AIAssistantModules.ui.elements.toggleButton

      if (!this.dragOffset || !button) return

      const clientX = e.clientX || (e.touches && e.touches[0].clientX)
      const clientY = e.clientY || (e.touches && e.touches[0].clientY)

      if (!clientX || !clientY) return

      // Only start actual dragging after a small threshold (both time and distance)
      const dragDistance = Math.sqrt(
        Math.pow(clientX - (button.getBoundingClientRect().left + this.dragOffset.x), 2) +
          Math.pow(clientY - (button.getBoundingClientRect().top + this.dragOffset.y), 2),
      )

      const dragTime = Date.now() - this.dragStartTime

      if (dragDistance > 5 || dragTime > 200) {
        this.isDragging = true
      }

      if (this.isDragging) {
        const x = clientX - this.dragOffset.x
        const y = clientY - this.dragOffset.y

        // Constrain to window boundaries
        const maxX = window.innerWidth - button.offsetWidth
        const maxY = window.innerHeight - button.offsetHeight

        button.style.left = `${Math.max(0, Math.min(maxX, x))}px`
        button.style.top = `${Math.max(0, Math.min(maxY, y))}px`
        button.style.right = "auto"
        button.style.bottom = "auto"
      }
    },

    // End dragging
    endDrag() {
      const config = window.AIAssistantModules.config.current
      const button = window.AIAssistantModules.ui.elements.toggleButton

      if (this.isDragging && config.rememberPosition && button) {
        // Save position to localStorage
        const rect = button.getBoundingClientRect()
        const position = { x: rect.left, y: rect.top }
        localStorage.setItem("ai-assistant-position", JSON.stringify(position))
      }

      this.dragOffset = null

      // Small delay to prevent immediate click after drag
      setTimeout(() => {
        this.isDragging = false
      }, 50)

      if (button) {
        button.classList.remove("dragging")
      }
    },
  }
})()
