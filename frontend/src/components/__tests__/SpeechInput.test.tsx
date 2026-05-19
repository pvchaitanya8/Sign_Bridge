/**
 * SpeechInput.test.tsx
 * --------------------
 * Tests the listener microphone toggle component.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SpeechInput } from '../SpeechInput'

// ─────────────────────────────────────────────────────────────────────────────
// Mock useSpeech so we control isSupported / isListening without a real browser
// ─────────────────────────────────────────────────────────────────────────────
const mockStartListening = vi.fn()
const mockStopListening  = vi.fn()

let mockIsListening = false
let mockInterim     = ''
let mockIsSupported = true

vi.mock('../../hooks/useSpeech', () => ({
  useSTT: () => ({
    startListening: mockStartListening,
    stopListening:  mockStopListening,
    isListening:    mockIsListening,
    interim:        mockInterim,
    isSupported:    mockIsSupported,
  }),
}))

beforeEach(() => {
  mockIsListening = false
  mockInterim     = ''
  mockIsSupported = true
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
describe('SpeechInput — supported browser', () => {
  it('renders the section header', () => {
    render(<SpeechInput onMessage={vi.fn()} />)
    expect(screen.getByText(/listener reply/i)).toBeInTheDocument()
  })

  it('shows idle label when not listening', () => {
    render(<SpeechInput onMessage={vi.fn()} />)
    expect(screen.getByText(/tap to reply by voice/i)).toBeInTheDocument()
  })

  it('calls startListening when mic button is clicked while idle', () => {
    render(<SpeechInput onMessage={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /start recording/i })
    fireEvent.click(btn)
    expect(mockStartListening).toHaveBeenCalledOnce()
  })

  it('calls stopListening when mic button is clicked while active', () => {
    mockIsListening = true
    render(<SpeechInput onMessage={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /stop recording/i })
    fireEvent.click(btn)
    expect(mockStopListening).toHaveBeenCalledOnce()
  })

  it('does not show the unsupported warning when API is available', () => {
    render(<SpeechInput onMessage={vi.fn()} />)
    expect(screen.queryByText(/requires chrome or edge/i)).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('SpeechInput — unsupported browser', () => {
  it('shows a warning when SpeechRecognition is not available', () => {
    mockIsSupported = false
    render(<SpeechInput onMessage={vi.fn()} />)
    expect(screen.getByText(/requires chrome or edge/i)).toBeInTheDocument()
  })

  it('does not render the mic button when unsupported', () => {
    mockIsSupported = false
    render(<SpeechInput onMessage={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /recording/i })).not.toBeInTheDocument()
  })
})
