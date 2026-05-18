/**
 * useSpeech.ts
 * ------------
 * Two hooks built on the browser's Web Speech API — zero dependencies,
 * works in Chrome, Edge, and Safari.
 *
 *  useTTS()  — Text-to-Speech  (signer's sentence read aloud)
 *  useSTT()  — Speech-to-Text  (listener speaks → text for signer)
 *
 * Web Speech API is not available in Firefox. We expose
 * `isSupported` so the UI can gracefully hide unavailable features.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// ── Type augment: Web Speech API is missing from TS's default lib ─────────────
declare global {
  interface Window {
    SpeechRecognition?:       new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  lang:            string
  interimResults:  boolean
  continuous:      boolean
  start():         void
  stop():          void
  onresult:        ((event: SpeechRecognitionEvent) => void) | null
  onerror:         ((event: Event) => void) | null
  onend:           (() => void) | null
}

// ────────────────────────────────────────────────────────────────────────────
// useTTS — Text-to-Speech
// ────────────────────────────────────────────────────────────────────────────
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Cancel speech on unmount so it doesn't keep playing after navigation
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return

    // Cancel anything currently playing first
    window.speechSynthesis.cancel()

    const utterance     = new SpeechSynthesisUtterance(text)
    utterance.lang      = 'en-US'
    utterance.rate      = 0.92   // slightly slower = easier to understand
    utterance.pitch     = 1.0
    utterance.volume    = 1.0

    utterance.onstart   = () => setIsSpeaking(true)
    utterance.onend     = () => setIsSpeaking(false)
    utterance.onerror   = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [isSupported])

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { speak, cancel, isSpeaking, isSupported }
}


// ────────────────────────────────────────────────────────────────────────────
// useSTT — Speech-to-Text
// ────────────────────────────────────────────────────────────────────────────
export function useSTT() {
  const [isListening, setIsListening] = useState(false)
  const [interim, setInterim]         = useState('')   // live partial transcript
  const recognitionRef                = useRef<SpeechRecognitionInstance | null>(null)

  // Resolve the correct constructor (Chrome uses webkit prefix)
  const getSR = () => typeof window !== 'undefined'
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
    : undefined

  const isSupported = !!getSR()

  const startListening = useCallback((onFinal: (text: string) => void) => {
    const SR = getSR()
    if (!SR) return

    // Stop any existing session first
    recognitionRef.current?.stop()

    const recognition         = new SR()
    recognition.lang          = 'en-US'
    recognition.interimResults= true    // stream partial results live
    recognition.continuous    = false   // stop after first pause

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Concatenate all result segments
      let interimText = ''
      let finalText   = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText   += text
        else                          interimText  += text
      }

      setInterim(interimText)

      if (finalText) {
        setInterim('')
        setIsListening(false)
        onFinal(finalText.trim())
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
      setInterim('')
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterim('')
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  return { startListening, stopListening, isListening, interim, isSupported }
}
