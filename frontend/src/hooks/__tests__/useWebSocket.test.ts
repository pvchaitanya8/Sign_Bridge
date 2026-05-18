/**
 * useWebSocket.test.ts
 * --------------------
 * Tests for the auto-reconnecting WebSocket hook.
 *
 * Strategy: we replace globalThis.WebSocket with a manual mock class
 * BEFORE any import resolves (vi.mock hoisting). We capture the latest
 * constructed instance via a module-scoped ref and trigger events on it.
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── The mock MUST be defined before the hook module is imported ───────────────
class MockWebSocket {
  static OPEN    = 1
  static CLOSING = 2
  static CLOSED  = 3

  readyState = MockWebSocket.OPEN
  url: string

  onopen:    (() => void) | null = null
  onclose:   (() => void) | null = null
  onerror:   (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null

  send  = vi.fn()
  close = vi.fn(() => { this.readyState = MockWebSocket.CLOSED })

  constructor(url: string) {
    this.url = url
    // Register in module-level registry so tests can grab it
    _lastInstance = this
  }

  simulateMessage(data: object) { this.onmessage?.({ data: JSON.stringify(data) }) }
  simulateOpen()  { this.onopen?.() }
  simulateClose() { this.readyState = MockWebSocket.CLOSED; this.onclose?.() }
  simulateError() { this.onerror?.() }
}

// Populated by MockWebSocket constructor above
let _lastInstance: MockWebSocket | undefined

// Install mock on globalThis BEFORE hook module loads
;(globalThis as Record<string, unknown>).WebSocket = MockWebSocket

// Now import the hook (after global is patched)
import { useWebSocket } from '../useWebSocket'

// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  _lastInstance = undefined
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

/** Render hook, flush React effects, return hook + WS instance */
async function setup() {
  const hook = renderHook(() => useWebSocket())
  // Flush all pending effects / microtasks
  await act(async () => { await Promise.resolve() })
  return { ...hook, ws: _lastInstance! }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('useWebSocket — connection lifecycle', () => {
  it('WebSocket constructor is called on mount', async () => {
    await setup()
    expect(_lastInstance).toBeDefined()
  })

  it('status is "connecting" immediately after connect()', async () => {
    const { result } = await setup()
    expect(result.current.status).toBe('connecting')
  })

  it('transitions to "connected" on socket open', async () => {
    const { result, ws } = await setup()
    await act(async () => { ws.simulateOpen() })
    expect(result.current.status).toBe('connected')
  })

  it('transitions to "disconnected" on socket close', async () => {
    const { result, ws } = await setup()
    await act(async () => { ws.simulateOpen() })
    await act(async () => { ws.simulateClose() })
    expect(result.current.status).toBe('disconnected')
  })

  it('transitions to "error" on socket error', async () => {
    const { result, ws } = await setup()
    await act(async () => { ws.simulateError() })
    expect(result.current.status).toBe('error')
  })

  it('reconnects after disconnect (schedule fires after 2 s)', async () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useWebSocket())
      await act(async () => { await Promise.resolve() })

      const firstInstance = _lastInstance!
      await act(async () => {
        firstInstance.simulateOpen()
        firstInstance.simulateClose()
        vi.advanceTimersByTime(2100)
        await Promise.resolve()
      })

      // A second MockWebSocket should have been created for the reconnect
      expect(_lastInstance).not.toBe(firstInstance)
    } finally {
      vi.useRealTimers()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('useWebSocket — prediction parsing', () => {
  it('sets prediction when hand is detected', async () => {
    const { result, ws } = await setup()
    await act(async () => { ws.simulateOpen() })
    await act(async () => {
      ws.simulateMessage({ hand_detected: true, letter: 'A', confidence: 0.92 })
    })
    expect(result.current.prediction).toEqual({ letter: 'A', confidence: 0.92 })
  })

  it('clears prediction when no hand is detected', async () => {
    const { result, ws } = await setup()
    await act(async () => { ws.simulateOpen() })
    await act(async () => {
      ws.simulateMessage({ hand_detected: true, letter: 'B', confidence: 0.80 })
    })
    await act(async () => {
      ws.simulateMessage({ hand_detected: false, letter: null, confidence: null })
    })
    expect(result.current.prediction).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('useWebSocket — sendFrame', () => {
  it('sends a Blob when socket is OPEN', async () => {
    const { result, ws } = await setup()
    await act(async () => { ws.simulateOpen() })

    const blob = new Blob(['frame'], { type: 'image/jpeg' })
    act(() => { result.current.sendFrame(blob) })

    expect(ws.send).toHaveBeenCalledWith(blob)
  })

  it('does not throw when socket readyState is CLOSED', async () => {
    const { result, ws } = await setup()
    ws.readyState = MockWebSocket.CLOSED

    const blob = new Blob(['frame'], { type: 'image/jpeg' })
    expect(() => { act(() => { result.current.sendFrame(blob) }) }).not.toThrow()
  })
})
