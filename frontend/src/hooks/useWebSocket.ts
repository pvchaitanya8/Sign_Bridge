/**
 * useWebSocket.ts
 * ---------------
 * Manages the WebSocket connection to the FastAPI backend.
 *
 * React concept used: useRef for mutable values that shouldn't
 * trigger re-renders (the socket itself), useState for values
 * that SHOULD trigger re-renders (status, prediction).
 *
 * Auto-reconnects every 2s if the connection drops.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Prediction, ConnectionStatus } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'
const RECONNECT_DELAY_MS = 2000

export function useWebSocket() {
  const socketRef                               = useRef<WebSocket | null>(null)
  const reconnectTimer                          = useRef<number | null>(null)
  const [status, setStatus]                     = useState<ConnectionStatus>('disconnected')
  const [prediction, setPrediction]             = useState<Prediction | null>(null)

  const connect = useCallback(() => {
    // Don't open a second socket if one already exists
    if (socketRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const ws = new WebSocket(WS_URL)
    socketRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      // Clear any pending reconnect timer
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }

    ws.onclose = () => {
      setStatus('disconnected')
      setPrediction(null)
      // Schedule reconnect
      reconnectTimer.current = window.setTimeout(connect, RECONNECT_DELAY_MS)
    }

    ws.onerror = () => {
      setStatus('error')
      ws.close() // triggers onclose → reconnect
    }

    // Every message from the server is a JSON prediction
    ws.onmessage = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data)

      if (data.hand_detected) {
        setPrediction({
          letter:     data.letter,
          confidence: data.confidence,
        })
      } else {
        setPrediction(null)
      }
    }
  }, [])

  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      socketRef.current?.close()
    }
  }, [connect])

  /**
   * sendFrame — called by CameraPanel on every captured frame.
   * Sends raw Blob bytes (JPEG) to the backend over the WebSocket.
   * Does nothing if the socket isn't open yet.
   */
  const sendFrame = useCallback((blob: Blob) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(blob)
    }
  }, [])

  return { status, prediction, sendFrame }
}
