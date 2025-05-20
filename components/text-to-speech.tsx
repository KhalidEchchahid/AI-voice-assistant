"use client"

import { useEffect, useState } from "react"

interface TextToSpeechProps {
  text: string
  speak: boolean
  onStart: () => void
  onEnd: () => void
  onError: (error: string) => void
}

export default function TextToSpeech({ text, speak, onStart, onEnd, onError }: TextToSpeechProps) {
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null)

  // Initialize speech synthesis
  useEffect(() => {
    if (!window.speechSynthesis) {
      onError("Speech synthesis not supported in this browser")
      return
    }

    const synth = window.speechSynthesis

    // Cancel any ongoing speech when component unmounts
    return () => {
      synth.cancel()
    }
  }, [onError])

  // Handle text changes
  useEffect(() => {
    if (!text) return

    const newUtterance = new SpeechSynthesisUtterance(text)

    // Get available voices and select a good one
    const voices = window.speechSynthesis.getVoices()

    // Try to find a good English voice
    const preferredVoice = voices.find(
      (voice) =>
        voice.lang.includes("en") &&
        (voice.name.includes("Google") || voice.name.includes("Natural") || voice.name.includes("Premium")),
    )

    if (preferredVoice) {
      newUtterance.voice = preferredVoice
    }

    newUtterance.rate = 1.0
    newUtterance.pitch = 1.0
    newUtterance.volume = 1.0

    newUtterance.onstart = () => {
      onStart()
    }

    newUtterance.onend = () => {
      onEnd()
    }

    newUtterance.onerror = (event) => {
      onError(`Speech synthesis error: ${event.error}`)
    }

    setUtterance(newUtterance)
  }, [text, onStart, onEnd, onError])

  // Start or stop speech based on speak prop
  useEffect(() => {
    if (!utterance || !text) return

    const synth = window.speechSynthesis

    if (speak) {
      synth.cancel() // Cancel any ongoing speech
      synth.speak(utterance)
    } else {
      synth.cancel()
    }

    return () => {
      synth.cancel()
    }
  }, [speak, utterance, text])

  return null
}
