// DOM Monitor - Media Detector Enhancement Module
;(() => {
  window.DOMMonitorModules = window.DOMMonitorModules || {}

  // Media Detector Class
  class MediaDetector {
    constructor(config = {}) {
      this.config = {
        updateInterval: config.updateInterval || 500,
        maxMediaElements: config.maxMediaElements || 30,
        trackCustomPlayers: config.trackCustomPlayers !== false,
        ...config
      }
      
      // Dependencies
      this.elementCache = null
      this.performanceManager = null
      
      // State tracking
      this.isDetecting = false
      this.mediaElements = new Map()
      this.mediaObservers = new Map()
      this.eventListeners = new Map()
      
      // Custom player patterns
      this.customPlayerPatterns = [
        'video-js', 'plyr', 'jwplayer', 'flowplayer', 'youtube', 'vimeo',
        'videojs', 'player', 'media-wrapper', 'video-container'
      ]
      
      // Statistics
      this.stats = {
        totalMediaElements: 0,
        videoElements: 0,
        audioElements: 0,
        iframeElements: 0,
        customPlayers: 0,
        lastScanTime: 0
      }
    }

    // Initialize with dependencies
    initialize(elementCache, performanceManager) {
      this.elementCache = elementCache
      this.performanceManager = performanceManager
      
      console.log("✅ DOM Monitor: Media Detector initialized")
    }

    // Start detecting media elements
    startDetecting() {
      if (this.isDetecting) {
        console.log("DOM Monitor: Media detection already active")
        return
      }
      
      this.isDetecting = true
      
      // Initial scan
      this.scanForMediaElements()
      
      // Start periodic scanning
      this.startPeriodicScan()
      
      console.log("✅ DOM Monitor: Media detection started")
    }

    // Stop detecting
    stopDetecting() {
      this.isDetecting = false
      
      // Remove all listeners
      this.removeAllMediaListeners()
      
      // Clear periodic scan
      this.stopPeriodicScan()
      
      // Clear tracked data
      this.mediaElements.clear()
      this.mediaObservers.clear()
      
      console.log("✅ DOM Monitor: Media detection stopped")
    }

    // Scan for media elements
    async scanForMediaElements() {
      const scanOperation = async () => {
        return this._scanForMediaElementsInternal()
      }
      
      if (this.performanceManager) {
        const result = await this.performanceManager.executeWithBudget(
          scanOperation,
          32, // Max 32ms for scanning
          'scanMediaElements'
        )
        
        if (result.success) {
          this.stats.lastScanTime = Date.now()
        }
      } else {
        await scanOperation()
        this.stats.lastScanTime = Date.now()
      }
    }

    _scanForMediaElementsInternal() {
      const startTime = performance.now()
      
      // Find all media elements
      const videos = document.querySelectorAll('video')
      const audios = document.querySelectorAll('audio')
      const iframes = document.querySelectorAll('iframe')
      
      let processed = 0
      
      // Process video elements
      for (const video of videos) {
        if (performance.now() - startTime > 30) break
        
        this.trackMediaElement(video, 'video')
        processed++
        
        if (processed >= this.config.maxMediaElements) break
      }
      
      // Process audio elements
      for (const audio of audios) {
        if (performance.now() - startTime > 30) break
        if (processed >= this.config.maxMediaElements) break
        
        this.trackMediaElement(audio, 'audio')
        processed++
      }
      
      // Process iframe elements (might contain media)
      for (const iframe of iframes) {
        if (performance.now() - startTime > 30) break
        if (processed >= this.config.maxMediaElements) break
        
        if (this.isMediaIframe(iframe)) {
          this.trackMediaElement(iframe, 'iframe')
          processed++
        }
      }
      
      // Look for custom players
      if (this.config.trackCustomPlayers) {
        const customPlayers = this.findCustomPlayers()
        for (const player of customPlayers) {
          if (performance.now() - startTime > 30) break
          if (processed >= this.config.maxMediaElements) break
          
          this.trackCustomPlayer(player)
          processed++
        }
      }
      
      this.updateStatistics()
      
      return {
        processed,
        total: videos.length + audios.length + iframes.length,
        mediaFound: this.mediaElements.size
      }
    }

    // Check if iframe is likely to contain media
    isMediaIframe(iframe) {
      const src = iframe.src || ''
      const mediaPatterns = [
        'youtube', 'vimeo', 'dailymotion', 'twitch',
        'soundcloud', 'spotify', 'wistia', 'brightcove'
      ]
      
      return mediaPatterns.some(pattern => src.includes(pattern))
    }

    // Find custom media players
    findCustomPlayers() {
      const players = []
      
      for (const pattern of this.customPlayerPatterns) {
        const elements = document.querySelectorAll(
          `[class*="${pattern}"], [id*="${pattern}"], [data-player*="${pattern}"]`
        )
        
        for (const element of elements) {
          // Check if it contains video or audio elements
          if (element.querySelector('video, audio') || this.hasMediaControls(element)) {
            players.push(element)
          }
        }
      }
      
      return players
    }

    // Check if element has media controls
    hasMediaControls(element) {
      const controlKeywords = [
        'play', 'pause', 'seek', 'volume', 'fullscreen',
        'progress', 'duration', 'time'
      ]
      
      const html = element.innerHTML.toLowerCase()
      return controlKeywords.some(keyword => html.includes(keyword))
    }

    // Track media element
    trackMediaElement(element, type) {
      const elementId = this.generateElementId(element)
      
      if (this.mediaElements.has(elementId)) {
        // Update existing
        const existing = this.mediaElements.get(elementId)
        existing.mediaData = this.extractMediaData(element, type)
        existing.lastUpdate = Date.now()
        return
      }
      
      const mediaData = this.extractMediaData(element, type)
      this.mediaElements.set(elementId, {
        element,
        type,
        mediaData,
        lastUpdate: Date.now()
      })
      
      // Add event listeners
      this.addMediaListeners(element, elementId)
      
      // Update element cache
      this.updateElementCache(element, mediaData)
    }

    // Track custom player
    trackCustomPlayer(playerElement) {
      const media = playerElement.querySelector('video, audio')
      if (media) {
        this.trackMediaElement(media, media.tagName.toLowerCase())
      }
      
      // Track the player container as well
      const elementId = this.generateElementId(playerElement)
      const playerData = {
        isCustomPlayer: true,
        playerType: this.detectPlayerType(playerElement),
        controls: this.findPlayerControls(playerElement),
        mediaElement: media
      }
      
      this.mediaElements.set(elementId + '_player', {
        element: playerElement,
        type: 'custom_player',
        mediaData: playerData,
        lastUpdate: Date.now()
      })
      
      this.stats.customPlayers++
    }

    // Detect custom player type
    detectPlayerType(element) {
      const classes = element.className
      const id = element.id
      
      for (const pattern of this.customPlayerPatterns) {
        if (classes.includes(pattern) || id.includes(pattern)) {
          return pattern
        }
      }
      
      return 'unknown'
    }

    // Extract comprehensive media data
    extractMediaData(element, type) {
      if (type === 'iframe') {
        return this.extractIframeMediaData(element)
      }
      
      const mediaElement = element
      
      return {
        mediaType: type,
        state: this.getMediaState(mediaElement),
        duration: mediaElement.duration || 0,
        currentTime: mediaElement.currentTime || 0,
        volume: mediaElement.volume || 1,
        muted: mediaElement.muted || false,
        fullscreenCapable: this.isFullscreenCapable(mediaElement),
        playbackRate: mediaElement.playbackRate || 1,
        customPlayer: this.isCustomPlayer(mediaElement),
        controls: this.findMediaControls(mediaElement),
        
        // Additional media info
        src: mediaElement.src || mediaElement.currentSrc || '',
        sources: this.getMediaSources(mediaElement),
        poster: mediaElement.poster || '',
        preload: mediaElement.preload || 'metadata',
        autoplay: mediaElement.autoplay || false,
        loop: mediaElement.loop || false,
        
        // State information
        paused: mediaElement.paused,
        ended: mediaElement.ended,
        seeking: mediaElement.seeking,
        readyState: mediaElement.readyState,
        networkState: mediaElement.networkState,
        
        // Buffer information
        buffered: this.getBufferedRanges(mediaElement),
        
        // Quality information (if available)
        qualityLevels: this.getQualityLevels(mediaElement),
        currentQuality: this.getCurrentQuality(mediaElement),
        
        // Subtitle/caption tracks
        textTracks: this.getTextTracks(mediaElement),
        
        // Player dimensions
        dimensions: {
          width: mediaElement.offsetWidth,
          height: mediaElement.offsetHeight,
          aspectRatio: mediaElement.videoWidth && mediaElement.videoHeight ? 
            mediaElement.videoWidth / mediaElement.videoHeight : null
        }
      }
    }

    // Extract iframe media data
    extractIframeMediaData(iframe) {
      return {
        mediaType: 'iframe',
        src: iframe.src,
        provider: this.detectMediaProvider(iframe.src),
        dimensions: {
          width: iframe.offsetWidth,
          height: iframe.offsetHeight
        },
        // Limited data available for iframes
        state: 'unknown',
        customPlayer: true,
        controls: {
          external: true,
          available: false
        }
      }
    }

    // Detect media provider from URL
    detectMediaProvider(url) {
      const providers = {
        'youtube': 'YouTube',
        'vimeo': 'Vimeo',
        'dailymotion': 'Dailymotion',
        'twitch': 'Twitch',
        'soundcloud': 'SoundCloud',
        'spotify': 'Spotify'
      }
      
      for (const [key, name] of Object.entries(providers)) {
        if (url.includes(key)) return name
      }
      
      return 'Unknown'
    }

    // Get media state
    getMediaState(element) {
      if (element.paused === false) return 'playing'
      if (element.paused === true && element.currentTime > 0) return 'paused'
      if (element.ended) return 'ended'
      if (element.readyState === 0) return 'loading'
      if (element.seeking) return 'seeking'
      return 'stopped'
    }

    // Check fullscreen capability
    isFullscreenCapable(element) {
      return !!(
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullscreen
      )
    }

    // Check if using custom player
    isCustomPlayer(element) {
      const parent = element.parentElement
      if (!parent) return false
      
      const classes = parent.className + ' ' + (parent.parentElement?.className || '')
      return this.customPlayerPatterns.some(pattern => classes.includes(pattern))
    }

    // Find media controls
    findMediaControls(element) {
      const parent = element.parentElement
      const controls = {}
      
      if (element.controls) {
        controls.native = true
        return controls
      }
      
      if (parent) {
        controls.play = this.findControlElement(parent, ['play', 'play-button', 'play-btn'])
        controls.pause = this.findControlElement(parent, ['pause', 'pause-button', 'pause-btn'])
        controls.seek = this.findControlElement(parent, ['seek', 'progress', 'timeline'])
        controls.volume = this.findControlElement(parent, ['volume', 'vol', 'mute'])
        controls.fullscreen = this.findControlElement(parent, ['fullscreen', 'fs', 'expand'])
        controls.custom = Object.values(controls).some(c => c !== null)
      }
      
      return controls
    }

    // Find control element by keywords
    findControlElement(container, keywords) {
      for (const keyword of keywords) {
        const element = container.querySelector(
          `[class*="${keyword}"], [id*="${keyword}"], [data-action*="${keyword}"]`
        )
        if (element) return element
      }
      return null
    }

    // Get media sources
    getMediaSources(element) {
      const sources = []
      const sourceElements = element.querySelectorAll('source')
      
      for (const source of sourceElements) {
        sources.push({
          src: source.src,
          type: source.type,
          media: source.media
        })
      }
      
      return sources
    }

    // Get buffered ranges
    getBufferedRanges(element) {
      const ranges = []
      const buffered = element.buffered
      
      for (let i = 0; i < buffered.length; i++) {
        ranges.push({
          start: buffered.start(i),
          end: buffered.end(i)
        })
      }
      
      return ranges
    }

    // Get quality levels (for advanced players)
    getQualityLevels(element) {
      // This would need player-specific implementation
      // Placeholder for now
      return []
    }

    // Get current quality
    getCurrentQuality(element) {
      // This would need player-specific implementation
      return null
    }

    // Get text tracks
    getTextTracks(element) {
      const tracks = []
      const textTracks = element.textTracks
      
      if (textTracks) {
        for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i]
          tracks.push({
            kind: track.kind,
            label: track.label,
            language: track.language,
            mode: track.mode,
            active: track.mode === 'showing'
          })
        }
      }
      
      return tracks
    }

    // Find player controls in custom player
    findPlayerControls(playerElement) {
      return {
        wrapper: playerElement,
        controls: this.findMediaControls(playerElement.querySelector('video, audio') || playerElement)
      }
    }

    // Add media event listeners
    addMediaListeners(element, elementId) {
      const events = [
        'play', 'pause', 'ended', 'timeupdate',
        'volumechange', 'seeking', 'seeked',
        'loadstart', 'loadeddata', 'error'
      ]
      
      const handlers = {}
      
      for (const event of events) {
        handlers[event] = () => this.handleMediaEvent(element, elementId, event)
        element.addEventListener(event, handlers[event])
      }
      
      this.eventListeners.set(elementId, { element, handlers })
    }

    // Handle media events
    handleMediaEvent(element, elementId, eventType) {
      const tracked = this.mediaElements.get(elementId)
      
      if (tracked) {
        // Update media data
        tracked.mediaData = this.extractMediaData(element, tracked.type)
        tracked.lastUpdate = Date.now()
        tracked.lastEvent = eventType
        
        // Update element cache
        this.updateElementCache(element, tracked.mediaData)
      }
    }

    // Update element cache with media data
    updateElementCache(element, mediaData) {
      if (!this.elementCache) return
      
      const elementId = this.generateElementId(element)
      const cachedElement = this.elementCache.cache.get(elementId)
      
      if (cachedElement) {
        cachedElement.mediaData = mediaData
        cachedElement.hasMediaData = true
      }
    }

    // Remove all media listeners
    removeAllMediaListeners() {
      for (const [id, { element, handlers }] of this.eventListeners.entries()) {
        for (const [event, handler] of Object.entries(handlers)) {
          element.removeEventListener(event, handler)
        }
      }
      
      this.eventListeners.clear()
    }

    // Periodic scan
    startPeriodicScan() {
      this.scanInterval = setInterval(() => {
        if (this.isDetecting) {
          this.scanForMediaElements()
        }
      }, 5000) // Scan every 5 seconds
    }

    stopPeriodicScan() {
      if (this.scanInterval) {
        clearInterval(this.scanInterval)
        this.scanInterval = null
      }
    }

    // Update statistics
    updateStatistics() {
      this.stats.totalMediaElements = this.mediaElements.size
      this.stats.videoElements = 0
      this.stats.audioElements = 0
      this.stats.iframeElements = 0
      
      for (const [id, data] of this.mediaElements.entries()) {
        switch (data.type) {
          case 'video':
            this.stats.videoElements++
            break
          case 'audio':
            this.stats.audioElements++
            break
          case 'iframe':
            this.stats.iframeElements++
            break
        }
      }
    }

    // Get media data for specific element
    getMediaDataForElement(element) {
      const elementId = this.generateElementId(element)
      const tracked = this.mediaElements.get(elementId)
      
      if (tracked) {
        // Update if stale
        if (Date.now() - tracked.lastUpdate > 1000) {
          tracked.mediaData = this.extractMediaData(element, tracked.type)
          tracked.lastUpdate = Date.now()
        }
        
        return tracked.mediaData
      }
      
      // Check if it's a media element
      const tagName = element.tagName.toLowerCase()
      if (['video', 'audio'].includes(tagName)) {
        return this.extractMediaData(element, tagName)
      }
      
      return null
    }

    // Media control operations
    async playMedia(element) {
      if (element.play) {
        try {
          await element.play()
          return true
        } catch (error) {
          console.warn('DOM Monitor: Failed to play media:', error)
          return false
        }
      }
      return false
    }

    pauseMedia(element) {
      if (element.pause) {
        element.pause()
        return true
      }
      return false
    }

    seekMedia(element, time) {
      if (typeof element.currentTime !== 'undefined') {
        element.currentTime = Math.max(0, Math.min(time, element.duration || 0))
        return true
      }
      return false
    }

    setVolume(element, volume) {
      if (typeof element.volume !== 'undefined') {
        element.volume = Math.max(0, Math.min(1, volume))
        return true
      }
      return false
    }

    // Utility to generate element ID
    generateElementId(element) {
      const tag = element.tagName.toLowerCase()
      const id = element.id || ''
      const src = element.src ? element.src.slice(-20) : ''
      
      return `${tag}_${id}_${src}_${element.offsetTop}_${element.offsetLeft}`
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 100)
    }

    // Get statistics
    getStats() {
      return {
        ...this.stats,
        isDetecting: this.isDetecting
      }
    }

    // Cleanup
    cleanup() {
      this.removeAllMediaListeners()
      this.mediaElements.clear()
      this.mediaObservers.clear()
      
      this.stats = {
        totalMediaElements: 0,
        videoElements: 0,
        audioElements: 0,
        iframeElements: 0,
        customPlayers: 0,
        lastScanTime: 0
      }
    }
  }

  // Export the module
  window.DOMMonitorModules.MediaDetector = MediaDetector

  console.log("✅ DOM Monitor: Media Detector enhancement module loaded")
})() 