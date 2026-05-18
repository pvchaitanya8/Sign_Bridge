/**
 * CameraPanel.tsx
 * ---------------
 * Shows the webcam feed and overlays the current prediction.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │ [● Connected]                │  ← status badge
 *   │                              │
 *   │      [live webcam feed]      │
 *   │                              │
 *   │  ╔══════════════════════╗    │
 *   │  ║   A          94%     ║    │  ← prediction bar
 *   │  ╚══════════════════════╝    │
 *   └──────────────────────────────┘
 *
 * React concept: this component owns no state — it receives
 * everything it needs as props (controlled component pattern).
 */

import { useEffect } from 'react'
import { Camera, CameraOff, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { useCamera } from '../hooks/useCamera'
import type { Prediction, ConnectionStatus } from '../types'

interface CameraPanelProps {
  sendFrame:  (blob: Blob) => void
  prediction: Prediction | null
  status:     ConnectionStatus
}

// Maps connection status → badge colour
const statusConfig: Record<ConnectionStatus, { label: string; colour: string; icon: typeof Wifi }> = {
  connected:    { label: 'Connected',    colour: 'bg-emerald-500', icon: Wifi     },
  connecting:   { label: 'Connecting…',  colour: 'bg-amber-400',   icon: Loader2  },
  disconnected: { label: 'Disconnected', colour: 'bg-slate-500',   icon: WifiOff  },
  error:        { label: 'Error',        colour: 'bg-red-500',      icon: WifiOff  },
}

export function CameraPanel({ sendFrame, prediction, status }: CameraPanelProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, stopCamera } = useCamera(sendFrame)

  // Auto-start camera when the WebSocket connects
  useEffect(() => {
    if (status === 'connected' && !isStreaming) startCamera()
  }, [status, isStreaming, startCamera])

  const { label, colour, icon: Icon } = statusConfig[status]

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Camera
        </h2>
        <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white', colour)}>
          <Icon size={12} className={cn(status === 'connecting' && 'animate-spin')} />
          {label}
        </div>
      </div>

      {/* ── Video feed ─────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-[#1a1a2e] flex-1 flex items-center justify-center min-h-0">

        {/* Hidden canvas used for frame capture — never shown */}
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />

        {/* Webcam stream — mirrored via CSS to match canvas mirroring */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={cn(
            'w-full h-full object-cover',
            '[transform:scaleX(-1)]',    // CSS mirror (visual only — canvas mirrors the actual sent frame)
            !isStreaming && 'hidden',
          )}
        />

        {/* Placeholder when camera is off */}
        {!isStreaming && (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <CameraOff size={48} strokeWidth={1} />
            <p className="text-sm">
              {error ?? (status === 'connecting' ? 'Waiting for server…' : 'Camera will start automatically')}
            </p>
          </div>
        )}

        {/* ── Prediction overlay (bottom of feed) ──────────── */}
        {isStreaming && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {prediction ? (
              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">

                {/* Detected letter */}
                <div className="text-4xl font-bold text-white w-12 text-center">
                  {prediction.letter === 'space' ? '⎵' : prediction.letter === 'del' ? '⌫' : prediction.letter}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Confidence</span>
                    <span>{(prediction.confidence * 100).toFixed(0)}%</span>
                  </div>
                  {/* Confidence bar */}
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-400 transition-all duration-150"
                      style={{ width: `${prediction.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2 text-center text-slate-400 text-sm">
                No hand detected
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Camera controls ────────────────────────────────── */}
      <button
        onClick={isStreaming ? stopCamera : startCamera}
        className={cn(
          'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors',
          isStreaming
            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
            : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
        )}
      >
        {isStreaming ? <><CameraOff size={16} /> Stop Camera</> : <><Camera size={16} /> Start Camera</>}
      </button>
    </div>
  )
}
