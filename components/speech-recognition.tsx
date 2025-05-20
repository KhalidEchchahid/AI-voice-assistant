"use client"

import { useEffect, useState } from "react"

// Extend the Window interface to include SpeechRecognition types
interface Window {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionProps {
  isListening: boolean
  onTranscript: (transcript: string) => void
  onFinalTranscript: (transcript: string) => void
  onError: (error: string) => void
}

export default function SpeechRecognition({
  isListening,
  onTranscript,
  onFinalTranscript,
  onError,
}: SpeechRecognitionProps) {
  const [recognition, setRecognition] = useState<any>(null)

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as Window).SpeechRecognition || (window as Window).webkitSpeechRecognition
    if (!SpeechRecognition) {
      onError("Speech recognition not supported in this browser")
      return
    }

    const recognitionInstance = new SpeechRecognition()
    recognitionInstance.continuous = true
    recognitionInstance.interimResults = true
    recognitionInstance.lang = "en-US"

    recognitionInstance.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (interimTranscript) {
        onTranscript(interimTranscript)
      }

      if (finalTranscript) {
        onFinalTranscript(finalTranscript)
      }
    }

    recognitionInstance.onerror = (event: any) => {
      console.error("Speech recognition error", event.error)
      onError(`Speech recognition error: ${event.error}`)
    }

    recognitionInstance.onend = () => {
      // If still listening, restart recognition
      if (isListening) {
        try {
          recognitionInstance.start()
        } catch (err) {
          console.error("Error restarting speech recognition:", err)
        }
      }
    }

    setRecognition(recognitionInstance)

    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop()
        } catch (err) {
          // Ignore errors when stopping
        }
      }
    }
  }, [onTranscript, onFinalTranscript, onError])

  // Start or stop recognition based on isListening prop
  useEffect(() => {
    if (!recognition) return

    if (isListening) {
      try {
        recognition.start()
      } catch (err) {
        console.error("Error starting speech recognition:", err)
        // If already started, don't throw an error
        if (!(err instanceof DOMException && err.name === "InvalidStateError")) {
          onError("Failed to start speech recognition")
        }
      }
    } else {
      try {
        recognition.stop()
      } catch (err) {
        // Ignore errors when stopping
      }
    }
  }, [isListening, recognition, onError])

  return null
}
