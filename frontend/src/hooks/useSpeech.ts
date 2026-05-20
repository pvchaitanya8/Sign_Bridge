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
// Includes Web Audio API amplitude tracking so callers can pulse the
// microphone button in sync with the user's actual voice level.
// ═════════════════════════════════════════════════════════════════════════════
export function useSTT() {
  const [isListening, setIsListening] = useState(false)
  const [interim, setInterim]         = useState('')
  const [audioLevel, setAudioLevel]   = useState(0)   // 0–1 RMS amplitude

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const analyserRef    = useRef<AnalyserNode  | null>(null)
  const streamRef      = useRef<MediaStream   | null>(null)
  const rafRef         = useRef<number>(0)

  const getSR = () =>
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined

  const isSupported = !!getSR()

  /** Tear down Web Audio resources and zero the level meter. */
  const stopAudio = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close().catch(() => {})
    streamRef.current  = null
    audioCtxRef.current = null
    analyserRef.current = null
    setAudioLevel(0)
  }

  /**
   * Start a parallel getUserMedia stream → AudioContext → AnalyserNode
   * RAF loop that reads RMS amplitude and updates audioLevel at ~60 fps.
   * Runs alongside SpeechRecognition so both can use the microphone.
   */
  const startAudio = () => {
    if (!navigator.mediaDevices?.getUserMedia) return
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        streamRef.current = stream
        const ctx      = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize              = 512
        analyser.smoothingTimeConstant = 0.68
        ctx.createMediaStreamSource(stream).connect(analyser)
        audioCtxRef.current = ctx
        analyserRef.current = analyser

        const buf = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteTimeDomainData(buf)
          // RMS: centre-normalise each sample (128 = silence), compute root-mean-square
          let sum = 0
          for (let i = 0; i < buf.length; i++) {
            const s = (buf[i] - 128) / 128
            sum += s * s
          }
          // Scale ×5 so a conversational voice level fills the 0–1 range visibly
          setAudioLevel(Math.min(Math.sqrt(sum / buf.length) * 5, 1))
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      })
      .catch(() => { /* graceful degradation — audioLevel stays 0 */ })
  }

  const startListening = useCallback((onFinal: (text: string) => void) => {
    const SR = getSR()
    if (!SR) return

    // Abort any previous session cleanly
    recognitionRef.current?.abort()

    const recognition           = new SR()
    recognition.lang            = 'en-US'
    recognition.interimResults  = true
    recognition.continuous      = true   // ← key fix: don't stop on first pause
    recognition.maxAlternatives = 1

    // Accumulates all confirmed final segments for this session
    // (a plain object so closures share the same mutable ref)
    const session = { finalText: '' }

    recognition.onstart = () => {
      setIsListening(true)
      startAudio()
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
      stopAudio()
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
      stopAudio()
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
    // Audio cleanup happens inside recognition.onend; also guard here
    // in case onend never fires (e.g. permission revoked mid-session).
    stopAudio()
  }, [])

  // Abort on unmount — don't flush partial text; also clean up audio
  useEffect(() => () => {
    recognitionRef.current?.abort()
    stopAudio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { startListening, stopListening, isListening, interim, isSupported, audioLevel }
}
