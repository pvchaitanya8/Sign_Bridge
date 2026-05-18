/**
 * App.tsx — Root component
 * -------------------------
 * Owns the WebSocket hook (single shared connection) and
 * distributes its outputs to child components:
 *
 *   useWebSocket()
 *     ├─ sendFrame  ──────────> CameraPanel     (sends frames up)
 *     ├─ prediction ──────────> SentenceBuilder (receives letters)
 *     └─ status     ──────────> CameraPanel     (shows connection badge)
 *
 * Two-panel layout:
 *   Left  -> CameraPanel    (webcam + prediction overlay)
 *   Right -> SentenceBuilder (hold ring + sentence text)
 */

import { useWebSocket }    from './hooks/useWebSocket'
import { CameraPanel }     from './components/CameraPanel'
import { SentenceBuilder } from './components/SentenceBuilder'

export default function App() {
  const { status, prediction, sendFrame } = useWebSocket()

  return (
    <div className="min-h-screen bg-[#0f0f13] text-slate-100 flex flex-col">

      {/* Top nav */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            Sign<span className="text-indigo-400">Bridge</span>
          </span>
          <span className="text-xs text-slate-600 font-medium px-2 py-0.5 rounded-full border border-white/10">
            v2.0
          </span>
        </div>
        <p className="text-xs text-slate-500 hidden sm:block">
          Hold any ASL sign for 1.5s to type it
        </p>
      </header>

      {/* Two-panel layout */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-white/5 overflow-hidden">

        {/* Left — camera */}
        <div className="p-6 flex flex-col">
          <CameraPanel
            sendFrame={sendFrame}
            prediction={prediction}
            status={status}
          />
        </div>

        {/* Right — sentence builder */}
        <div className="p-6 flex flex-col border-t border-white/5 md:border-t-0">
          <SentenceBuilder prediction={prediction} />
        </div>

      </main>

    </div>
  )
}
