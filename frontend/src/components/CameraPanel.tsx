import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff }       from 'lucide-react'
import { cn }          from '../lib/utils'
import { useCamera }   from '../hooks/useCamera'
import type { Prediction, ConnectionStatus } from '../types'

interface CameraPanelProps {
  sendFrame:  (blob: Blob) => void
  prediction: Prediction | null
  status:     ConnectionStatus
}

const statusMap: Record<ConnectionStatus, { label: string; led: string }> = {
  connected:    { label: 'LIVE',       led: 'led-green' },
  connecting:   { label: 'CONNECTING', led: 'led-amber led-pulse' },
  disconnected: { label: 'OFFLINE',    led: 'led-off'   },
  error:        { label: 'ERROR',      led: 'led-red led-pulse' },
}

export function CameraPanel({ sendFrame, prediction, status }: CameraPanelProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, stopCamera } = useCamera(sendFrame)

  useEffect(() => {
    if (status === 'connected' && !isStreaming) startCamera()
  }, [status, isStreaming, startCamera])

  const { label, led } = statusMap[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-secondary)',
        }}>
          Camera Feed
        </span>

        {/* Status chip */}
        <div className="neu-inset-sm" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 14px', borderRadius: 10,
        }}>
          <span className={cn('led', led)} />
          <span style={{
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-secondary)',
          }}>{label}</span>
        </div>
      </div>

      {/* ── Viewport (inset = embedded screen) ─────────── */}
      <div className="med-display" style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />

        {/* Live feed */}
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

        {/* Camera-off placeholder */}
        {!isStreaming && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 20,
          }}>
            <div className="neu" style={{
              width: 72, height: 72, borderRadius: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CameraOff size={28} strokeWidth={1.4} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)',
                marginBottom: 6, letterSpacing: '0.01em',
              }}>
                {error ? 'Camera unavailable' : status === 'connecting' ? 'Connecting to server…' : 'Camera ready'}
              </p>
              <p className="label" style={{ lineHeight: 1.7, maxWidth: 200 }}>
                {error ?? (status === 'connecting'
                  ? 'Stream starts automatically once connected'
                  : 'Click Start Camera below to begin')}
              </p>
            </div>
          </div>
        )}

        {/* ── Prediction overlay ───────────────────────── */}
        <AnimatePresence>
          {isStreaming && prediction && (
            <motion.div
              key="pred"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: 20 }}
              transition={{ duration: 0.22 }}
              style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}
            >
              <div className="neu" style={{
                padding: '14px 18px', borderRadius: 18,
                display: 'flex', alignItems: 'center', gap: 18,
              }}>
                {/* Animated letter */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={prediction.letter}
                    initial={{ rotateY: -90, scale: 0.6, opacity: 0 }}
                    animate={{ rotateY: 0,   scale: 1,   opacity: 1 }}
                    exit={{    rotateY:  90, scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="neu-sm"
                    style={{
                      width: 60, height: 60, borderRadius: 16, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span className="glow-green mono" style={{ fontSize: '1.8rem', fontWeight: 900 }}>
                      {prediction.letter === 'space' ? '⎵'
                       : prediction.letter === 'del'  ? '⌫'
                       : prediction.letter.toUpperCase()}
                    </span>
                  </motion.div>
                </AnimatePresence>

                {/* Confidence */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="label">Confidence</span>
                    <span className="mono glow-green" style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                      {(prediction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="confidence-track">
                    <motion.div
                      className="confidence-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.confidence * 100}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>
                    {prediction.letter === 'space' ? 'Space detected'
                     : prediction.letter === 'del'  ? 'Delete detected'
                     : `Letter "${prediction.letter.toUpperCase()}" detected`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No hand hint */}
        <AnimatePresence>
          {isStreaming && !prediction && (
            <motion.div
              key="no-hand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}
            >
              <div className="neu-inset-sm" style={{ padding: '8px 16px', borderRadius: 10, textAlign: 'center' }}>
                <span className="label" style={{ color: 'var(--text-muted)' }}>
                  No hand detected — show your hand to the camera
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Toggle button ───────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{   scale: 0.97 }}
        onClick={isStreaming ? stopCamera : startCamera}
        className="neu-btn"
        style={{
          flexShrink: 0,
          width: '100%', height: 46,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: '0.84rem', fontWeight: 700, letterSpacing: '0.01em',
          borderRadius: 14,
          color: isStreaming ? 'var(--red)' : 'var(--blue)',
        }}
      >
        {isStreaming
          ? <><CameraOff size={15} /> Stop Camera</>
          : <><Camera    size={15} /> Start Camera</>}
      </motion.button>

    </div>
  )
}
