/**
 * useSpeech.test.ts
 * -----------------
 * Tests for useTTS (text-to-speech) and useSTT (speech-to-text).
 * Both hooks rely on browser APIs that don't exist in jsdom, so we
 * mock speechSynthesis and SpeechRecognition on window.
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTTS, useSTT } from '../useSpeech'

// ─────────────────────────────────────────────────────────────────────────────
// speechSynthesis mock
// ─────────────────────────────────────────────────────────────────────────────
const mockSpeak  = vi.fn()
const mockCancel = vi.fn()

beforeEach(() => {
  vi.stubGlobal('speechSynthesis', {
    speak:   mockSpeak,
    cancel:  mockCancel,
    speaking: false,
  })
  // SpeechSynthesisUtterance needs to exist in jsdom
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    lang = ''; rate = 1; pitch = 1; volume = 1; text = ''
    onstart: (() => void) | null = null
    onend:   (() => void) | null = null
    onerror: (() => void) | null = null
    constructor(public readonly rawText: string) { this.text = rawText }
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// ─────────────────────────────────────────────────────────────────────────────
describe('useTTS', () => {
  it('reports isSupported = true when speechSynthesis is available', () => {
    const { result } = renderHook(() => useTTS())
    expect(result.current.isSupported).toBe(true)
  })

  it('calls speechSynthesis.speak with an utterance', () => {
    const { result } = renderHook(() => useTTS())
    act(() => { result.current.speak('Hello world') })
    expect(mockSpeak).toHaveBeenCalledOnce()
  })

  it('cancels previous speech before speaking', () => {
    const { result } = renderHook(() => useTTS())
    act(() => { result.current.speak('First') })
    act(() => { result.current.speak('Second') })
    // cancel is called once before each speak
    expect(mockCancel).toHaveBeenCalled()
  })

  it('does not speak empty string', () => {
    const { result } = renderHook(() => useTTS())
    act(() => { result.current.speak('') })
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('does not speak whitespace-only string', () => {
    const { result } = renderHook(() => useTTS())
    act(() => { result.current.speak('   ') })
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('cancel() calls speechSynthesis.cancel', () => {
    const { result } = renderHook(() => useTTS())
    act(() => { result.current.cancel() })
    expect(mockCancel).toHaveBeenCalled()
  })

  it('starts with isSpeaking = false', () => {
    const { result } = renderHook(() => useTTS())
    expect(result.current.isSpeaking).toBe(false)
  })

  it('reports isSupported = false when speechSynthesis is absent', () => {
    // stubGlobal sets the value to undefined but the key still exists in window,
    // so `'speechSynthesis' in window` stays true. Delete the property instead.
    const descriptor = Object.getOwnPropertyDescriptor(window, 'speechSynthesis')
    delete (window as unknown as Record<string, unknown>).speechSynthesis
    const { result } = renderHook(() => useTTS())
    expect(result.current.isSupported).toBe(false)
    // Restore so other tests aren't affected
    if (descriptor) Object.defineProperty(window, 'speechSynthesis', descriptor)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SpeechRecognition mock
// ─────────────────────────────────────────────────────────────────────────────
class MockSpeechRecognition {
  lang = 'en-US'; interimResults = false; continuous = false; maxAlternatives = 1
  onresult: ((e: SpeechRecognitionEvent) => void) | null = null
  onerror:  ((e: { error: string; message: string }) => void) | null = null
  onend:    (() => void) | null = null
  onstart:  (() => void) | null = null

  start  = vi.fn(() => this.onstart?.())
  stop   = vi.fn(() => this.onend?.())
  abort  = vi.fn()

  // Test helper — fake a final result
  fireFinalResult(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{
        0: { transcript, confidence: 0.9 },
        isFinal: true,
        length: 1,
      }] as unknown as SpeechRecognitionResultList,
    } as SpeechRecognitionEvent)
  }

  // Test helper — fake an interim result
  fireInterimResult(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{
        0: { transcript, confidence: 0 },
        isFinal: false,
        length: 1,
      }] as unknown as SpeechRecognitionResultList,
    } as SpeechRecognitionEvent)
  }
}

let mockSR: MockSpeechRecognition

beforeEach(() => {
  mockSR = new MockSpeechRecognition()
  const ctor = vi.fn(() => mockSR)
  vi.stubGlobal('SpeechRecognition', ctor)
  vi.stubGlobal('webkitSpeechRecognition', ctor)
})

describe('useSTT', () => {
  it('reports isSupported = true when SpeechRecognition is available', () => {
    const { result } = renderHook(() => useSTT())
    expect(result.current.isSupported).toBe(true)
  })

  it('isListening starts as false', () => {
    const { result } = renderHook(() => useSTT())
    expect(result.current.isListening).toBe(false)
  })

  it('isListening becomes true after startListening', () => {
    const { result } = renderHook(() => useSTT())
    act(() => { result.current.startListening(vi.fn()) })
    // onstart fires synchronously in our mock
    expect(result.current.isListening).toBe(true)
  })

  it('recognition.start() is called', () => {
    const { result } = renderHook(() => useSTT())
    act(() => { result.current.startListening(vi.fn()) })
    expect(mockSR.start).toHaveBeenCalledOnce()
  })

  it('sets continuous = true on the recognition instance', () => {
    const { result } = renderHook(() => useSTT())
    act(() => { result.current.startListening(vi.fn()) })
    expect(mockSR.continuous).toBe(true)
  })

  it('sets interimResults = true', () => {
    const { result } = renderHook(() => useSTT())
    act(() => { result.current.startListening(vi.fn()) })
    expect(mockSR.interimResults).toBe(true)
  })

  it('calls onFinal with accumulated final text when recognition ends', () => {
    const onFinal = vi.fn()
    const { result } = renderHook(() => useSTT())

    act(() => { result.current.startListening(onFinal) })
    act(() => { mockSR.fireFinalResult('hello world') })
    act(() => { result.current.stopListening() })   // triggers onend

    expect(onFinal).toHaveBeenCalledWith('hello world')
  })

  it('accumulates multiple final results before flushing', () => {
    const onFinal = vi.fn()
    const { result } = renderHook(() => useSTT())

    act(() => { result.current.startListening(onFinal) })
    act(() => { mockSR.fireFinalResult('hello') })
    act(() => { mockSR.fireFinalResult('world') })
    act(() => { result.current.stopListening() })

    expect(onFinal).toHaveBeenCalledWith('hello world')
  })

  it('does not call onFinal when no speech was detected', () => {
    const onFinal = vi.fn()
    const { result } = renderHook(() => useSTT())

    act(() => { result.current.startListening(onFinal) })
    act(() => { result.current.stopListening() })   // end with no results

    expect(onFinal).not.toHaveBeenCalled()
  })

  it('updates interim text during recognition', () => {
    const { result } = renderHook(() => useSTT())

    act(() => { result.current.startListening(vi.fn()) })
    act(() => { mockSR.fireInterimResult('hel') })

    expect(result.current.interim).toBe('hel')
  })

  it('clears interim and resets isListening after stop', () => {
    const { result } = renderHook(() => useSTT())

    act(() => { result.current.startListening(vi.fn()) })
    act(() => { mockSR.fireInterimResult('test') })
    act(() => { result.current.stopListening() })

    expect(result.current.interim).toBe('')
    expect(result.current.isListening).toBe(false)
  })

  it('calls abort() on unmount, not stop()', () => {
    const { result, unmount } = renderHook(() => useSTT())
    act(() => { result.current.startListening(vi.fn()) })
    unmount()
    expect(mockSR.abort).toHaveBeenCalled()
    expect(mockSR.stop).not.toHaveBeenCalled()
  })

  it('reports isSupported = false when API is absent', () => {
    vi.stubGlobal('SpeechRecognition', undefined)
    vi.stubGlobal('webkitSpeechRecognition', undefined)
    const { result } = renderHook(() => useSTT())
    expect(result.current.isSupported).toBe(false)
  })
})
