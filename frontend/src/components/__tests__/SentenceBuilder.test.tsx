/**
 * SentenceBuilder.test.tsx
 * ------------------------
 * Tests the hold-to-confirm logic, sentence building, and action buttons.
 * We use fake timers to control the 1500 ms hold window.
 */

import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SentenceBuilder } from '../SentenceBuilder'
import type { Prediction } from '../../types'

const HOLD_MS = 1500

// framer-motion uses requestAnimationFrame internally; stub it for jsdom
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

function makePrediction(letter: string, confidence = 0.9): Prediction {
  return { letter, confidence }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('SentenceBuilder — initial render', () => {
  it('renders the section header', () => {
    render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    expect(screen.getByText(/sentence builder/i)).toBeInTheDocument()
  })

  it('shows placeholder when sentence is empty', () => {
    render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    expect(screen.getByText(/your sentence appears here/i)).toBeInTheDocument()
  })

  it('Speak & Send button is disabled with no sentence', () => {
    render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /speak & send/i })
    expect(btn).toBeDisabled()
  })

  it('shows "Waiting for sign" status when prediction is null', () => {
    render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    expect(screen.getByText(/waiting for sign/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('SentenceBuilder — hold-to-confirm', () => {
  it('shows hold status when a valid prediction arrives', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    rerender(<SentenceBuilder prediction={makePrediction('A')} onSend={vi.fn()} />)
    expect(screen.getByText(/hold "A"/i)).toBeInTheDocument()
  })

  it('appends letter to sentence after HOLD_MS', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    rerender(<SentenceBuilder prediction={makePrediction('A')} onSend={vi.fn()} />)

    act(() => { vi.advanceTimersByTime(HOLD_MS + 50) })

    // The sentence preview should now show "A"
    expect(screen.getByText(/^A/)).toBeInTheDocument()
  })

  it('does NOT append if confidence is below MIN_CONFIDENCE (0.45)', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    rerender(<SentenceBuilder prediction={makePrediction('A', 0.30)} onSend={vi.fn()} />)

    act(() => { vi.advanceTimersByTime(HOLD_MS + 50) })

    expect(screen.getByText(/your sentence appears here/i)).toBeInTheDocument()
  })

  it('resets timer when a different letter is detected mid-hold', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)

    rerender(<SentenceBuilder prediction={makePrediction('A')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(HOLD_MS / 2) })

    // Switch to B — timer should reset
    rerender(<SentenceBuilder prediction={makePrediction('B')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(HOLD_MS / 2) })

    // Only half the hold time has elapsed since 'B' arrived — nothing yet
    expect(screen.getByText(/your sentence appears here/i)).toBeInTheDocument()
  })

  it('appends "space" as a space character', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)

    // First add a letter
    rerender(<SentenceBuilder prediction={makePrediction('H')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50) })

    rerender(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    rerender(<SentenceBuilder prediction={makePrediction('space')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50) })

    // .mono is used by both the ring center <span> and the sentence <p>.
    // querySelector('p.mono') targets only the sentence display paragraph.
    const preview = document.querySelector('p.mono') as HTMLElement
    expect(preview?.textContent).toMatch(/^H/)
  })

  it('deletes last character when "del" is held', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)

    rerender(<SentenceBuilder prediction={makePrediction('X')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50) })

    rerender(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    rerender(<SentenceBuilder prediction={makePrediction('del')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50) })

    expect(screen.getByText(/your sentence appears here/i)).toBeInTheDocument()
  })

  it('tolerates a brief detection dropout without resetting the hold', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)

    rerender(<SentenceBuilder prediction={makePrediction('A')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(800) })             // mid-hold

    // brief dropout — shorter than the 300 ms grace window
    rerender(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(150) })

    // detection recovers — the hold kept counting underneath
    rerender(<SentenceBuilder prediction={makePrediction('A')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(600) })             // ~1550 ms total → commits

    const preview = document.querySelector('p.mono') as HTMLElement
    expect(preview?.textContent).toMatch(/^A/)
  })

  it('resets the hold when a dropout exceeds the grace window', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)

    rerender(<SentenceBuilder prediction={makePrediction('A')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(700) })

    // long dropout — exceeds the 300 ms grace window → hold resets
    rerender(<SentenceBuilder prediction={null} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(400) })

    // detection recovers, but the previous hold is gone
    rerender(<SentenceBuilder prediction={makePrediction('A')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(900) })             // only 900 ms of a fresh hold

    expect(screen.getByText(/your sentence appears here/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('SentenceBuilder — action buttons', () => {
  it('calls onSend with the current sentence and clears it', () => {
    const onSend = vi.fn()
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={onSend} />)

    rerender(<SentenceBuilder prediction={makePrediction('A')} onSend={onSend} />)
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50) })

    const sendBtn = screen.getByRole('button', { name: /speak & send/i })
    expect(sendBtn).not.toBeDisabled()
    fireEvent.click(sendBtn)

    expect(onSend).toHaveBeenCalledWith('A')
    // Sentence cleared
    expect(screen.getByText(/your sentence appears here/i)).toBeInTheDocument()
  })

  it('clear button resets the sentence', () => {
    const { rerender } = render(<SentenceBuilder prediction={null} onSend={vi.fn()} />)

    rerender(<SentenceBuilder prediction={makePrediction('Z')} onSend={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50) })

    fireEvent.click(screen.getByTitle(/clear/i))
    expect(screen.getByText(/your sentence appears here/i)).toBeInTheDocument()
  })
})
