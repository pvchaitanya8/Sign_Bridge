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
        {/* Section label chip */}
        <div className="skeu-chip" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
        }}>
          <Camera size={10} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-secondary)',
          }}>Camera Feed</span>
        </div>

        {/* Status chip */}
        <motion.div
          className="skeu-chip"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px' }}
          animate={status === 'connected'
            ? { boxShadow: [
                'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 5px rgba(0,0,0,0.40)',
                'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 5px rgba(0,0,0,0.40), 0 0 14px rgba(52,211,153,0.22)',
                'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 5px rgba(0,0,0,0.40)',
              ] }
            : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className={cn('led', led)} />
          <span style={{
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: status === 'connected' ? 'var(--green)' : 'var(--text-secondary)',
          }}>{label}</span>
        </motion.div>
      </div>

      {/* ── Viewport — professional monitor bezel ──────── */}
      <div className="skeu-display" style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
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
            <div className="skeu-raised" style={{
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

        {/* ── Prediction overlay — physical HUD panel ──── */}
        <AnimatePresence>
          {isStreaming && prediction && (
            <motion.div
              key="pred"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ position: 'absolute', bottom: 14, left: 12, right: 12 }}
            >
              <div style={{
                background: 'var(--overlay-bg)',
                border: '1px solid',
                borderTopColor: 'rgba(52,211,153,0.45)',
                borderLeftColor: 'rgba(52,211,153,0.28)',
                borderBottomColor: 'rgba(0,0,0,0.65)',
                borderRightColor: 'rgba(0,0,0,0.45)',
                borderRadius: 16,
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 18,
                boxShadow:
                  'inset 0 1px 0 rgba(52,211,153,0.12),' +
                  '0 8px 28px rgba(0,0,0,0.65),' +
                  '0 3px 8px rgba(0,0,0,0.55),' +
                  '0 0 0 1px rgba(52,211,153,0.12)',
              }}>
                {/* Animated letter tile */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={prediction.letter}
                    initial={{ rotateY: -90, scale: 0.55, opacity: 0 }}
                    animate={{ rotateY: 0,   scale: 1,    opacity: 1 }}
                    exit={{    rotateY:  90, scale: 0.55, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{
                      width: 70, height: 70, borderRadius: 14, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(175deg, var(--srf-raise-hi) 0%, var(--base) 55%, var(--srf-raise-lo) 100%)',
                      border: '1px solid',
                      borderTopColor: 'rgba(52,211,153,0.38)',
                      borderLeftColor: 'rgba(52,211,153,0.22)',
                      borderBottomColor: 'var(--bevel-lo)',
                      borderRightColor: 'rgba(0,0,0,0.40)',
                      boxShadow:
                        'inset 0 1px 0 rgba(52,211,153,0.18),' +
                        '0 4px 12px rgba(0,0,0,0.55),' +
                        '0 0 18px var(--green-glow2)',
                    }}
                  >
                    <span className="mono" style={{
                      fontSize: '2.1rem', fontWeight: 900,
                      color: 'var(--green)',
                      textShadow: '0 0 16px var(--green-glow), 0 0 32px var(--green-glow2)',
                    }}>
                      {prediction.letter === 'space' ? '⎵'
                       : prediction.letter === 'del'  ? '⌫'
                       : prediction.letter.toUpperCase()}
                    </span>
                  </motion.div>
                </AnimatePresence>

                {/* Confidence section */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{
                      fontSize: '0.59rem', fontWeight: 700, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--text-muted)',
                    }}>
                      Confidence
                    </span>
                    <motion.span
                      key={prediction.confidence}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0  }}
                      className="mono"
                      style={{
                        fontSize: '1rem', fontWeight: 900,
                        color: 'var(--green)',
                        textShadow: '0 0 10px var(--green-glow)',
                      }}
                    >
                      {(prediction.confidence * 100).toFixed(0)}%
                    </motion.span>
                  </div>
                  <div className="confidence-track">
                    <motion.div
                      className="confidence-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.confidence * 100}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <p style={{
                    fontSize: '0.68rem', fontWeight: 500,
                    color: 'var(--text-secondary)', letterSpacing: '0.01em',
                  }}>
                    {prediction.letter === 'space' ? '⎵  Space gesture detected'
                     : prediction.letter === 'del'  ? '⌫  Delete gesture detected'
                     : `Signing "${prediction.letter.toUpperCase()}"`}
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y: 6 }}
              transition={{ duration: 0.3 }}
              style={{ position: 'absolute', bottom: 14, left: 12, right: 12 }}
            >
              <div style={{
                background: 'rgba(0,0,0,0.55)',
                border: '1px solid',
                borderTopColor: 'rgba(255,255,255,0.08)',
                borderBottomColor: 'rgba(0,0,0,0.70)',
                borderLeftColor: 'rgba(255,255,255,0.05)',
                borderRightColor: 'rgba(0,0,0,0.50)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 3px 8px rgba(0,0,0,0.50)',
                borderRadius: 10, padding: '7px 16px', textAlign: 'center',
              }}>
                <span style={{
                  fontSize: '0.61rem', fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)',
                }}>
                  ✋ Show your hand to the camera
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
        className="skeu-btn"
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
