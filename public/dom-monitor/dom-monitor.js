// AI Assistant DOM Monitor - Main Entry Point (Modular Architecture)
;(() => {
  console.log("🔄 AI Assistant DOM Monitor: Initializing modular system")

  // Module configuration
  const DOM_MONITOR_CONFIG = {
    version: "2.0.0",
    modules: {
      core: [
        'element-data.js',
        'performance-manager.js', 
        'serializer.js',
        'element-cache.js',
        'dom-observer.js',
        'communication-bridge.js',
        'live-monitor.js'
      ],
      enhancements: [
        'scroll-detector.js',
        'media-detector.js', 
        'hover-detector.js'
      ]
    },
    performance: {
      maxCacheSize: 500,
      maxScanTime: 16,
      maxMemoryMB: 50,
      throttleDelay: 100,
      priorityElements: 100
    }
  }

  // Module loader with dependency management
  class ModuleLoader {
    constructor() {
      this.loadedModules = new Map()
      this.loading = new Map()
      this.basePath = this.getBasePath()
    }

    getBasePath() {
      try {
        const currentScript = document.currentScript || document.querySelector('script[src*="dom-monitor"]')
        if (currentScript && currentScript.src) {
          return currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1)
        }
      } catch (e) {
        console.warn('DOM Monitor: Could not determine base path, using relative')
      }
      return './dom-monitor/'
    }

    async loadModule(modulePath) {
      if (this.loadedModules.has(modulePath)) {
        return this.loadedModules.get(modulePath)
      }

      if (this.loading.has(modulePath)) {
        return this.loading.get(modulePath)
      }

      const loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        const fullPath = this.basePath + modulePath
        
        script.src = fullPath
        script.onload = () => {
          console.log(`✅ DOM Monitor: Loaded module ${modulePath}`)
          this.loadedModules.set(modulePath, true)
          resolve(true)
        }
        script.onerror = () => {
          console.error(`❌ DOM Monitor: Failed to load module ${modulePath}`)
          reject(new Error(`Failed to load module: ${modulePath}`))
        }
        
        document.head.appendChild(script)
      })

      this.loading.set(modulePath, loadPromise)
      return loadPromise
    }

    async loadModules(moduleList) {
      const results = await Promise.allSettled(
        moduleList.map(module => this.loadModule(module))
      )
      
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length > 0) {
        console.error('DOM Monitor: Some modules failed to load:', failed)
        throw new Error(`Failed to load ${failed.length} modules`)
      }
      
      return true
    }

    // NEW: Sequential loader to ensure dependency order (e.g., core modules)
    async loadModulesSequentially(moduleList) {
      for (const module of moduleList) {
        await this.loadModule(module)
      }
      return true
    }
  }

  // Initialize the DOM Monitor system
  async function initializeDOMMonitor() {
    try {
      console.log("🚀 DOM Monitor: Starting modular initialization...")
      
      const loader = new ModuleLoader()
      
      // Load core modules first
      console.log("📦 DOM Monitor: Loading core modules...")
      await loader.loadModulesSequentially(DOM_MONITOR_CONFIG.modules.core.map(m => `core/${m}`))
      
      // Load enhancement modules
      console.log("🔧 DOM Monitor: Loading enhancement modules...")
      await loader.loadModules(DOM_MONITOR_CONFIG.modules.enhancements.map(m => `enhancements/${m}`))
      
      // Wait for window.DOMMonitorModules to be available
      let attempts = 0
      while (!window.DOMMonitorModules && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      if (!window.DOMMonitorModules) {
        throw new Error("DOM Monitor modules not properly initialized")
      }
      
      // Initialize the main monitor with configuration
      console.log("🔄 DOM Monitor: Initializing main monitor...")
      
      // The LiveMonitor auto-initializes and creates window.DOMMonitor
      // No need to create a new instance as it's already created in live-monitor.js
      
      // Verify it's initialized
      if (window.DOMMonitor) {
        console.log("✅ DOM Monitor: Global instance ready")
        
        // For backward compatibility, also expose as AIAssistantDOMMonitor
        window.AIAssistantDOMMonitor = window.DOMMonitor
      } else {
        throw new Error("DOM Monitor global instance not created")
      }
      
      console.log(`✅ DOM Monitor: Modular system ready (v${DOM_MONITOR_CONFIG.version})`)
      
    } catch (error) {
      console.error("💥 DOM Monitor: Initialization failed:", error)
      
      // Fallback: try to load the old monolithic version
      console.log("🔄 DOM Monitor: Attempting fallback to monolithic version...")
      try {
        const fallbackScript = document.createElement('script')
        fallbackScript.src = './live-dom-monitor-fallback.js'
        document.head.appendChild(fallbackScript)
      } catch (fallbackError) {
        console.error("💥 DOM Monitor: Fallback also failed:", fallbackError)
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDOMMonitor)
  } else {
    initializeDOMMonitor()
  }

})() 