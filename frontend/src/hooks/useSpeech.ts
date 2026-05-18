/**
 * useSpeech.ts
 * ------------
 * Two hooks built on the browser's Web Speech API — zero dependencies,
 * works in Chrome, Edge, and Safari (not Firefox).
 *
 *  useTTS()  — Text-to-Speech  (signer's sentence read aloud)
 *  useSTT()  — Speech-to-Text  (listener speaks → text bubble for signer)
 *
 * STT design: continuous=true so the user can speak naturally without
 * the browser cutting off mid-sentence. Final transcript is accumulated
 * across multiple result events and flushed in onend (triggered by
 * stopListening or by a natural pause with continuous=false).
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// ── Web Speech API type augmentation ─────────────────────────────────────────
// TypeScript's default lib doesn't include the Web Speech API types.
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
  maxAlternatives: number
  start():         void
  stop():          void
  abort():         void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror:  ((event: SpeechRecognitionErrorEvent) => void) | null
  onend:    (() => void) | null
  onstart:  (() => void) | null
}

interface SpeechRecognitionErrorEvent extends Event {
  error:   string   // 'not-allowed' | 'network' | 'audio-capture' | etc.
  message: string
}


// ═════════════════════════════════════════════════════════════════════════════
// useTTS — Text-to-Speech
// ═════════════════════════════════════════════════════════════════════════════
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Cancel any in-flight speech on unmount
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return

    window.speechSynthesis.cancel()   // stop anything already playing

    const utterance    = new SpeechSynthesisUtterance(text)
    utterance.lang     = 'en-US'
    utterance.rate     = 0.92   // slightly slower = easier to understand
    utterance.pitch    = 1.0
    utterance.volume   = 1.0

    utterance.onstart  = () => setIsSpeaking(true)
    utterance.onend    = () => setIsSpeaking(false)
    utterance.onerror  = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [isSupported])

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { speak, cancel, isSpeaking, isSupported }
}


// ═════════════════════════════════════════════════════════════════════════════
// useSTT — Speech-to-Text
// ═════════════════════════════════════════════════════════════════════════════
export function useSTT() {
  const [isListening, setIsListening] = useState(false)
  const [interim, setInterim]         = useState('')
  const recognitionRef                = useRef<SpeechRecognitionInstance | null>(null)

  const getSR = () =>
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined

  const isSupported = !!getSR()

  const startListening = useCallback((onFinal: (text: string) => void) => {
    const SR = getSR()
    if (!SR) return

    // Abort any previous session cleanly
    recognitionRef.current?.abort()

    const recognition          = new SR()
    recognition.lang           = 'en-US'
    recognition.interimResults = true
    recognition.continuous     = true   // ← key fix: don't stop on first pause
    recognition.maxAlternatives = 1

    // Accumulates all confirmed final segments for this session
    // (a plain object so closures share the same mutable ref)
    const session = { finalText: '' }

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimChunk = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          session.finalText += transcript + ' '
        } else {
          interimChunk += transcript
        }
      }

      // Show interim text while speaking; fall back to accumulated final
      setInterim(interimChunk || session.finalText.trimEnd())
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Log so developers can diagnose permission/network issues
      console.warn(`[STT] Recognition error: "${event.error}" — ${event.message}`)

      if (event.error === 'no-speech') {
        // Not fatal — user was silent; keep listening
        return
      }

      setIsListening(false)
      setInterim('')
    }

    recognition.onend = () => {
      // Flush accumulated text when the session ends
      const text = session.finalText.trim()
      if (text) {
        onFinal(text)
      }
      session.finalText = ''
      setIsListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      // start() throws if called on an already-started instance
      console.warn('[STT] Could not start recognition:', err)
      setIsListening(false)
    }
  }, [])   // getSR is stable (reads window); onFinal is a parameter, not a dep

  const stopListening = useCallback(() => {
    // stop() (not abort()) lets onend fire so accumulated text is flushed
    recognitionRef.current?.stop()
  }, [])

  // Abort on unmount — don't flush partial text
  useEffect(() => () => { recognitionRef.current?.abort() }, [])

  return { startListening, stopListening, isListening, interim, isSupported }
}
