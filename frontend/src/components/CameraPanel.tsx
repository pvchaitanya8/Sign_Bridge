import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn }          from '../lib/utils'
import { useCamera }   from '../hooks/useCamera'
import type { Prediction, ConnectionStatus } from '../types'

interface CameraPanelProps {
  sendFrame:  (blob: Blob) => void
  prediction: Prediction | null
  status:     ConnectionStatus
}

const statusConfig: Record<ConnectionStatus, { label: string; dot: string; icon: typeof Wifi }> = {
  connected:    { label: 'Live',        dot: 'bg-emerald-400', icon: Wifi    },
  connecting:   { label: 'Connecting',  dot: 'bg-amber-400',   icon: Loader2 },
  disconnected: { label: 'Offline',     dot: 'bg-slate-500',   icon: WifiOff },
  error:        { label: 'Error',       dot: 'bg-red-500',     icon: WifiOff },
}

export function CameraPanel({ sendFrame, prediction, status }: CameraPanelProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, stopCamera } = useCamera(sendFrame)

  useEffect(() => {
    if (status === 'connected' && !isStreaming) startCamera()
  }, [status, isStreaming, startCamera])

  const { label, dot, icon: Icon } = statusConfig[status]

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Camera Feed
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 glass px-2.5 py-1 rounded-full">
          <span className={cn('w-1.5 h-1.5 rounded-full', dot,
            status === 'connected' && 'animate-pulse')} />
          <Icon size={11} className={cn(status === 'connecting' && 'animate-spin')} />
          {label}
        </div>
      </div>

      {/* Video viewport */}
      <div className="relative flex-1 rounded-xl overflow-hidden bg-black/40 min-h-0">
        {/* Hidden capture canvas */}
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />

        {/* Live feed */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={cn(
            'w-full h-full object-cover [transform:scaleX(-1)]',
            !isStreaming && 'hidden',
          )}
        />

        {/* Camera-off placeholder */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
              <CameraOff size={28} strokeWidth={1.2} />
            </div>
            <p className="text-xs text-center max-w-[180px]">
              {error ?? (status === 'connecting' ? 'Waiting for server…' : 'Camera starts automatically')}
            </p>
          </div>
        )}

        {/* ── Prediction overlay ───────────────────────── */}
        <AnimatePresence>
          {isStreaming && prediction && (
            <motion.div
              key="pred-bar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 p-3"
            >
              <div className="glass-strong rounded-xl p-3 flex items-center gap-4">

                {/* Big animated letter */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={prediction.letter}
                    initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
                    animate={{ scale: 1,   opacity: 1, rotateY: 0   }}
                    exit={{    scale: 0.5, opacity: 0, rotateY:  90 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0"
                  >
                    <span className="text-3xl font-bold gradient-text">
                      {prediction.letter === 'space' ? '⎵'
                       : prediction.letter === 'del'  ? '⌫'
                       : prediction.letter}
                    </span>
                  </motion.div>
                </AnimatePresence>

                {/* Confidence */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Confidence</span>
                    <span className="text-white font-semibold tabular-nums">
                      {(prediction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full confidence-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.confidence * 100}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {prediction.letter === 'space' ? 'Space'
                     : prediction.letter === 'del'  ? 'Delete'
                     : `Letter "${prediction.letter}"`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No hand */}
        <AnimatePresence>
          {isStreaming && !prediction && (
            <motion.div
              key="no-hand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              className="absolute bottom-3 left-3 right-3"
            >
              <div className="glass rounded-lg px-3 py-2 text-center text-xs text-slate-500">
                No hand detected — show your hand to the camera
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera toggle */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{   scale: 0.97 }}
        onClick={isStreaming ? stopCamera : startCamera}
        className={cn(
          'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors glass',
          isStreaming
            ? 'text-red-400 hover:bg-red-500/10'
            : 'text-indigo-400 hover:bg-indigo-500/10',
        )}
      >
        {isStreaming
          ? <><CameraOff size={15} /> Stop Camera</>
          : <><Camera    size={15} /> Start Camera</>}
      </motion.button>
    </div>
  )
}
