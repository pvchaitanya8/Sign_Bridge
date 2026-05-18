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

/* LED colour + label per connection state */
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
    <div className="flex flex-col gap-4 h-full">

      {/* ── Header row ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="label">Camera Feed</span>

        {/* Neumorphic status chip */}
        <div className="neu-inset-sm flex items-center gap-2"
             style={{ padding: '4px 12px', borderRadius: 10 }}>
          <span className={cn('led', led)} />
          <span className="label" style={{ fontSize: '0.58rem' }}>{label}</span>
        </div>
      </div>

      {/* ── Video viewport (inset = embedded screen) ───── */}
      <div className="relative flex-1 min-h-0 med-display overflow-hidden">
        {/* Hidden capture canvas */}
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />

        {/* Live feed */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={cn('w-full h-full object-cover', !isStreaming && 'hidden')}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Camera-off placeholder */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="neu" style={{ width: 64, height: 64, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CameraOff size={26} strokeWidth={1.3} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="label text-center" style={{ maxWidth: 180, lineHeight: 1.6 }}>
              {error ?? (status === 'connecting' ? 'Waiting for server…' : 'Camera starts when connected')}
            </p>
          </div>
        )}

        {/* ── Prediction overlay bar ───────────────────── */}
        <AnimatePresence>
          {isStreaming && prediction && (
            <motion.div
              key="pred-bar"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: 16 }}
              transition={{ duration: 0.22 }}
              className="absolute bottom-0 left-0 right-0"
              style={{ padding: '10px' }}
            >
              {/* Raised prediction chip overlaying the video */}
              <div className="neu" style={{ padding: '12px 14px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14 }}>

                {/* Big letter — flips in */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={prediction.letter}
                    initial={{ rotateY: -90, scale: 0.7, opacity: 0 }}
                    animate={{ rotateY: 0,   scale: 1,   opacity: 1 }}
                    exit={{    rotateY:  90, scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="neu-sm flex items-center justify-center flex-shrink-0"
                    style={{ width: 52, height: 52, borderRadius: 14 }}
                  >
                    <span className="glow-green mono"
                          style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                      {prediction.letter === 'space' ? '⎵'
                       : prediction.letter === 'del'  ? '⌫'
                       : prediction.letter.toUpperCase()}
                    </span>
                  </motion.div>
                </AnimatePresence>

                {/* Confidence meter */}
                <div className="flex-1 min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="label">Confidence</span>
                    <span className="mono glow-green" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      {(prediction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Shimmer bar */}
                  <div className="confidence-track">
                    <motion.div
                      className="confidence-fill"
                      style={{ height: '100%', borderRadius: 99 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.confidence * 100}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>

                  <p className="label" style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>
                    {prediction.letter === 'space' ? 'Space detected'
                     : prediction.letter === 'del'  ? 'Delete detected'
                     : `Letter "${prediction.letter.toUpperCase()}" detected`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No hand detected */}
        <AnimatePresence>
          {isStreaming && !prediction && (
            <motion.div
              key="no-hand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              className="absolute bottom-2 left-2 right-2"
            >
              <div className="neu-inset-sm" style={{ padding: '6px 14px', borderRadius: 10, textAlign: 'center' }}>
                <span className="label" style={{ color: 'var(--text-muted)' }}>
                  No hand detected — show your hand to the camera
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Camera toggle button ────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{   scale: 0.97 }}
        onClick={isStreaming ? stopCamera : startCamera}
        className={cn('neu-btn w-full flex items-center justify-center gap-2')}
        style={{ padding: '10px 0', fontSize: '0.82rem', fontWeight: 600,
                 color: isStreaming ? 'var(--red)' : 'var(--blue)' }}
      >
        {isStreaming
          ? <><CameraOff size={14} /> Stop Camera</>
          : <><Camera    size={14} /> Start Camera</>}
      </motion.button>

    </div>
  )
}
