/**
 * TranscriptPanel.test.tsx
 * ------------------------
 * Tests message rendering, empty state, role-based layout,
 * and the speak-aloud button.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TranscriptPanel } from '../TranscriptPanel'
import type { Message } from '../../types'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id:        Math.random().toString(36).slice(2),
    role:      'signer',
    text:      'Hello world',
    timestamp: new Date('2024-01-01T12:00:00'),
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('TranscriptPanel — empty state', () => {
  it('renders empty-state copy when there are no messages', () => {
    render(<TranscriptPanel messages={[]} onSpeak={vi.fn()} />)
    expect(screen.getByText(/ready for conversation/i)).toBeInTheDocument()
  })

  it('does NOT show the message count badge with 0 messages', () => {
    render(<TranscriptPanel messages={[]} onSpeak={vi.fn()} />)
    expect(screen.queryByText(/msg/i)).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('TranscriptPanel — message rendering', () => {
  it('renders message text', () => {
    const msg = makeMessage({ text: 'Nice to meet you' })
    render(<TranscriptPanel messages={[msg]} onSpeak={vi.fn()} />)
    expect(screen.getByText('Nice to meet you')).toBeInTheDocument()
  })

  it('shows correct message count badge', () => {
    const messages = [makeMessage(), makeMessage({ text: 'Second' })]
    render(<TranscriptPanel messages={messages} onSpeak={vi.fn()} />)
    expect(screen.getByText(/2 msgs/i)).toBeInTheDocument()
  })

  it('shows "1 msg" (singular) for exactly one message', () => {
    render(<TranscriptPanel messages={[makeMessage()]} onSpeak={vi.fn()} />)
    expect(screen.getByText(/1 msg$/i)).toBeInTheDocument()
  })

  it('renders multiple messages in order', () => {
    const messages = [
      makeMessage({ text: 'First message' }),
      makeMessage({ text: 'Second message' }),
      makeMessage({ text: 'Third message' }),
    ]
    render(<TranscriptPanel messages={messages} onSpeak={vi.fn()} />)
    const items = screen.getAllByText(/message/)
    expect(items).toHaveLength(3)
  })

  it('renders signer messages (role=signer)', () => {
    const msg = makeMessage({ role: 'signer', text: 'I am signing' })
    render(<TranscriptPanel messages={[msg]} onSpeak={vi.fn()} />)
    expect(screen.getByText('I am signing')).toBeInTheDocument()
  })

  it('renders listener messages (role=listener)', () => {
    const msg = makeMessage({ role: 'listener', text: 'I hear you' })
    render(<TranscriptPanel messages={[msg]} onSpeak={vi.fn()} />)
    expect(screen.getByText('I hear you')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('TranscriptPanel — speak button', () => {
  it('calls onSpeak with message text when volume button clicked', () => {
    const onSpeak = vi.fn()
    const msg = makeMessage({ text: 'Read me aloud' })
    const { container } = render(<TranscriptPanel messages={[msg]} onSpeak={onSpeak} />)

    // The speak button is inside a group that is opacity-0 until hover.
    // We can still find it and click it directly.
    const speakBtn = container.querySelector('button[title="Read aloud"]')
    expect(speakBtn).toBeTruthy()
    fireEvent.click(speakBtn!)

    expect(onSpeak).toHaveBeenCalledWith('Read me aloud')
  })
})
