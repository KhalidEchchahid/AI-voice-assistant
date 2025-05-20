'use client'
import { useState, useEffect } from 'react'
import VoiceAssistant from './voice-assistant'
import { CSSTransition } from 'react-transition-group'

export default function AssistantToggle() {
  const [isOpen, setIsOpen] = useState(false)
  const [iframeHeight, setIframeHeight] = useState('56px')
  const [iframeWidth, setIframeWidth] = useState('56px')
  
  // Inform the parent page about height changes
  useEffect(() => {
    const sendHeightToParent = () => {
      if (window.parent !== window) {
        window.parent.postMessage({
          action: 'resize',
          height: isOpen ? '600px' : '56px',
          width: isOpen ? '350px' : '56px'
        }, '*')
      }
    }
    
    sendHeightToParent()
    
    // Update internal state for styling
    setIframeHeight(isOpen ? '600px' : '56px')
    setIframeWidth(isOpen ? '350px' : '56px')
  }, [isOpen])
  
  return (
    <div 
      className="relative transition-all duration-300 ease-in-out"
      style={{ 
        height: iframeHeight, 
        width: iframeWidth,
        overflow: 'hidden'
      }}
    >
      <CSSTransition
        in={isOpen}
        timeout={300}
        classNames="assistant"
        unmountOnExit
      >
        <div className="absolute top-0 right-0 w-[350px] h-[600px] bg-background/90 backdrop-blur-sm rounded-lg shadow-lg">
          <VoiceAssistant />
        </div>
      </CSSTransition>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center rounded-full p-3 shadow-lg transition-all duration-300 ease-in-out z-10 ${
          isOpen 
            ? 'absolute top-3 right-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground h-10 w-10' 
            : 'bg-primary hover:bg-primary/90 text-primary-foreground h-14 w-14'
        }`}
        aria-label="Toggle AI Assistant"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? 'rotate-45' : ''}`}
        >
          {isOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}