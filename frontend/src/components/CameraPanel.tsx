import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Power, Disc3 } from 'lucide-react'
import { useCamera } from '../hooks/useCamera'
import type { Prediction, ConnectionStatus } from '../types'

interface CameraPanelProps {
  sendFrame:  (blob: Blob) => void
  prediction: Prediction | null
  status:     ConnectionStatus
}

const statusMap: Record<ConnectionStatus, { label: string; led: string }> = {
  connected:    { label: 'LIVE',       led: 'led led-on led-blink'    },
  connecting:   { label: 'LINKING',    led: 'led led-warn led-blink'  },
  disconnected: { label: 'OFFLINE',    led: 'led led-off'              },
  error:        { label: 'FAULT',      led: 'led led-accent led-blink' },
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(1, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${h}.${m}.${s}`
}

export function CameraPanel({ sendFrame, prediction, status }: CameraPanelProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, stopCamera } = useCamera(sendFrame)
  const [elapsed, setElapsed] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const startRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number>(0)

  // Wrap sendFrame to count frames
  useEffect(() => {
    // count each prediction-tick approximately
    if (prediction) {
      const now = Date.now()
      if (now - lastFrameRef.current > 30) {
        setFrameCount(c => c + 1)
        lastFrameRef.current = now
      }
    }
  }, [prediction])

  /**
   * Auto-start only if camera permission was previously granted.
   * For first-time users (state === 'prompt') we wait for the explicit
   * "START CAPTURE" click — no surprise permission dialogs on page load.
   */
  useEffect(() => {
    if (status !== 'connected' || isStreaming) return
    if (!navigator.permissions?.query) return
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then(p => { if (p.state === 'granted') startCamera() })
      .catch(() => { /* Permissions API not supported — wait for click */ })
  }, [status, isStreaming, startCamera])

  useEffect(() => {
    if (!isStreaming) {
      startRef.current = null
      setElapsed(0)
      setFrameCount(0)
      return
    }
    startRef.current = Date.now()
    const id = window.setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [isStreaming])

  const { label, led } = statusMap[status]
  const letter = prediction?.letter ?? null
  const conf   = prediction?.confidence ?? 0

  const displayLetter =
    !letter            ? '—' :
    letter === 'space' ? '⎵' :
    letter === 'del'   ? '⌫' :
    letter.toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Section bar ─────────────────────────────────── */}
      <div className="bar">
        <div className="bar-section">
          <span>INPUT · CAMERA</span>
          <span style={{ opacity: 0.55 }}>640×480 · 15FPS</span>
          <span style={{ opacity: 0.55 }}>JPEG · Q65</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={led} />
          <span style={{
            fontSize: 10, letterSpacing: '0.18em',
            color: status === 'connected'  ? 'var(--ok)' :
                   status === 'connecting' ? 'var(--warn)' :
                   status === 'error'      ? 'var(--accent)' :
                                             'rgba(236, 235, 229, 0.65)',
          }}>
            {label}
          </span>
        </div>
      </div>

      {/* ── Viewport area ───────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column' }}>
        <div
          className="panel-inset"
          style={{
            flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
          }}
        >
          <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />

          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: isStreaming ? 'block' : 'none',
            }}
          />

          {isStreaming && <div className="scan-line" />}

          {/* Corner brackets */}
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-tr" />
          <div className="corner-bracket corner-bl" />
          <div className="corner-bracket corner-br" />

          {/* HUD: top-left — REC tape readout */}
          {isStreaming && (
            <div style={{
              position: 'absolute', top: 14, left: 30,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                display: 'inline-flex',
                color: 'var(--accent)',
              }}>
                <Disc3 size={11} strokeWidth={1.8} className="reel" />
              </span>
              <span className="hud" style={{ color: 'rgba(236, 235, 229, 0.92)' }}>
                REC {formatElapsed(elapsed)}
              </span>
            </div>
          )}

          {/* HUD: top-right — channel + capacity */}
          {isStreaming && (
            <div style={{
              position: 'absolute', top: 14, right: 30,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
            }}>
              <span className="hud" style={{ color: 'rgba(236, 235, 229, 0.92)' }}>
                CH 01 · ASL
              </span>
              <span className="hud" style={{ color: 'rgba(236, 235, 229, 0.55)' }}>
                FR {frameCount.toString().padStart(4, '0')}
              </span>
            </div>
          )}

          {/* Camera-off — viewfinder standby screen */}
          {!isStreaming && (
            <>
              {/* Rule-of-thirds framing grid */}
              <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33.333%', width: 1, background: 'rgba(236,235,229,0.05)' }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66.666%', width: 1, background: 'rgba(236,235,229,0.05)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: '33.333%', height: 1, background: 'rgba(236,235,229,0.05)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: '66.666%', height: 1, background: 'rgba(236,235,229,0.05)' }} />
              </div>

              {/* Standby composition */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 22,
              }}>
                {/* Focus reticle */}
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none" aria-hidden>
                  <path d="M2 13 V2 H13 M47 2 H58 V13 M58 47 V58 H47 M13 58 H2 V47"
                        stroke="rgba(236,235,229,0.40)" strokeWidth="1.5" />
                  <path d="M30 24 V36 M24 30 H36" stroke="rgba(236,235,229,0.26)" strokeWidth="1" />
                  <circle cx="30" cy="30" r="3.5" stroke="rgba(236,235,229,0.48)" strokeWidth="1" />
                </svg>

                <div style={{ textAlign: 'center', maxWidth: 320 }}>
                  <p className="label" style={{
                    fontSize: 11, color: 'var(--on-inset)',
                    letterSpacing: '0.24em', marginBottom: 9,
                  }}>
                    {error ? 'CAMERA UNAVAILABLE'
                      : status === 'connecting' ? 'AWAITING LINK'
                      : status === 'error'      ? 'CONNECTION FAULT'
                      : 'STANDBY'}
                  </p>
                  <p className="mono" style={{
                    fontSize: 11, color: 'var(--on-inset-dim)',
                    letterSpacing: '0.04em', lineHeight: 1.6,
                  }}>
                    {error ?? (status === 'connecting'
                      ? '> connecting to inference server'
                      : status === 'error'
                      ? '> backend unreachable · verify server'
                      : '> press start to begin capture')}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Prediction overlay */}
          <AnimatePresence>
            {isStreaming && prediction && (
              <motion.div
                key="pred"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y: 4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="liquid-glass"
                style={{
                  position: 'absolute', bottom: 30, left: 30, right: 30,
                  borderRadius: 'var(--r-lg)',
                  padding: '14px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: 18,
                }}
              >
                {/* Letter tile */}
                <div style={{
                  width: 64, height: 64,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(236, 235, 229, 0.04)',
                  border: '1px solid rgba(236, 235, 229, 0.22)',
                  borderRadius: 'var(--r-sm)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 34, fontWeight: 600,
                  color: '#ECEBE5', letterSpacing: '0.02em',
                  position: 'relative',
                }}>
                  {displayLetter}
                  {/* Corner marks on the tile */}
                  <span style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 1, background: 'rgba(236,235,229,0.5)' }} />
                  <span style={{ position: 'absolute', top: 3, left: 3, width: 1, height: 5, background: 'rgba(236,235,229,0.5)' }} />
                  <span style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 1, background: 'rgba(236,235,229,0.5)' }} />
                  <span style={{ position: 'absolute', bottom: 3, right: 3, width: 1, height: 5, background: 'rgba(236,235,229,0.5)' }} />
                </div>

                {/* Confidence + label */}
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span className="hud" style={{ color: 'rgba(236,235,229,0.68)' }}>
                      CONFIDENCE
                    </span>
                    <span className="mono" style={{
                      fontSize: 14, fontWeight: 600,
                      color: '#ECEBE5', letterSpacing: '0.04em',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {(conf * 100).toFixed(0).padStart(3, '0')}%
                    </span>
                  </div>
                  <div className="confidence-track" style={{
                    background: 'rgba(236,235,229,0.08)',
                    borderColor: 'rgba(236,235,229,0.10)',
                    height: 10,
                  }}>
                    <motion.div
                      className="confidence-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${conf * 100}%` }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="hud" style={{ color: 'rgba(236,235,229,0.45)', fontSize: 9 }}>
                      THRESH 045%
                    </span>
                    <span className="hud" style={{ color: 'rgba(236,235,229,0.45)', fontSize: 9 }}>
                      {conf >= 0.45 ? '● PASS' : '○ HOLD'}
                    </span>
                  </div>
                </div>

                {/* Sign label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className="hud" style={{ color: 'rgba(236,235,229,0.45)', fontSize: 9 }}>
                    GESTURE
                  </span>
                  <span className="mono" style={{
                    fontSize: 13, fontWeight: 600,
                    color: '#ECEBE5', letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}>
                    {letter === 'space' ? 'SPACE'
                     : letter === 'del'  ? 'DELETE'
                     : letter?.toUpperCase() ?? '—'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No-hand hint */}
          <AnimatePresence>
            {isStreaming && !prediction && (
              <motion.div
                key="no-hand"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{    opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute', bottom: 30, left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="liquid-glass" style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span className="led led-warn led-blink" />
                  <span className="hud" style={{ color: 'rgba(236,235,229,0.78)' }}>
                    NO SIGNAL · PRESENT HAND TO LENS
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Control strip ───────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'stretch', gap: 12,
        padding: '0 16px 16px',
        flexShrink: 0,
      }}>
        <button
          onClick={isStreaming ? stopCamera : startCamera}
          className={isStreaming ? 'btn btn-accent' : 'btn'}
          style={{ flex: 1 }}
        >
          {isStreaming ? (
            <>
              <span style={{
                width: 8, height: 8, background: 'var(--accent)',
                display: 'inline-block',
              }} />
              STOP CAPTURE
            </>
          ) : (
            <>
              <Power size={13} strokeWidth={1.8} />
              START CAPTURE
            </>
          )}
        </button>

        {/* Stats panel — always visible */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '0 16px',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-sm)',
          background: 'var(--surface-2)',
          height: 42,
        }}>
          <Stat label="ELAPSED" value={isStreaming ? formatElapsed(elapsed) : '0.00.00'} />
          <span style={{ width: 1, height: 22, background: 'var(--line)' }} />
          <Stat label="FRAMES" value={frameCount.toString().padStart(5, '0')} />
        </div>
      </div>

    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="label" style={{ fontSize: 8 }}>{label}</span>
      <span className="mono" style={{
        fontSize: 11, fontWeight: 600,
        color: 'var(--ink)', letterSpacing: '0.06em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  )
}
