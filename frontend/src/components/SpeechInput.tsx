/**
 * SpeechInput.tsx
 * ----------------
 * The hearing person's input area. They press the mic button,
 * speak naturally, and their words appear as a message in the
 * transcript for the signer to read.
 *
 *  ┌────────────────────────────────────────────┐
 *  │  🎤  Listening... "Hi, how are you?"       │
 *  │            [● Stop]                        │
 *  └────────────────────────────────────────────┘
 *
 * When not recording:
 *  ┌────────────────────────────────────────────┐
 *  │       [🎤 Tap to speak]                    │
 *  └────────────────────────────────────────────┘
 */

import { Mic, MicOff, AlertCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import { useSTT } from '../hooks/useSpeech'

interface SpeechInputProps {
  onMessage: (text: string) => void   // called when listener finishes speaking
}

export function SpeechInput({ onMessage }: SpeechInputProps) {
  const { startListening, stopListening, isListening, interim, isSupported } = useSTT()

  const handleToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening(onMessage)
    }
  }

  // Browser doesn't support STT
  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 text-amber-400 text-sm">
        <AlertCircle size={16} />
        Speech input requires Chrome or Edge.
      </div>
    )
  }

  return (
    <div className="space-y-2">

      {/* Section label */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Listener Reply
        </p>
        {isListening && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Listening…
          </span>
        )}
      </div>

      {/* Live interim transcript */}
      {isListening && (
        <div className="min-h-[2.5rem] px-3 py-2 rounded-xl bg-[#1a1a2e] text-slate-300 text-sm italic">
          {interim || <span className="text-slate-600">Speak now…</span>}
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200',
          isListening
            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200',
        )}
      >
        {isListening
          ? <><MicOff size={16} /> Stop recording</>
          : <><Mic    size={16} /> Tap to reply by voice</>}
      </button>
    </div>
  )
}
