/**
 * App.tsx — Root component (Phase 5: Speech features)
 * -----------------------------------------------------
 * State owned here:
 *   - messages[]   — full conversation transcript
 *   - WebSocket    — prediction stream + sendFrame
 *   - TTS          — speaks signer sentences aloud
 *
 * Data flow:
 *
 *   useWebSocket() → { sendFrame, prediction, status }
 *   useTTS()       → { speak, isSpeaking }
 *
 *   CameraPanel     ← sendFrame, prediction, status
 *   SentenceBuilder ← prediction, onSend(text)
 *                       └─ onSend: adds message + calls speak()
 *   TranscriptPanel ← messages, onSpeak
 *   SpeechInput     ← onMessage(text)
 *                       └─ onMessage: adds listener message
 *
 * Layout (right panel is now a vertical 3-section stack):
 *
 *  ┌───────────────┬─────────────────────────────┐
 *  │               │  Conversation transcript     │ (flex-1, scrollable)
 *  │  Camera Feed  ├─────────────────────────────┤
 *  │               │  Sentence Builder            │ (fixed)
 *  │               ├─────────────────────────────┤
 *  │               │  Listener Speech Input       │ (fixed)
 *  └───────────────┴─────────────────────────────┘
 */

import { useState, useCallback } from 'react'
import { useWebSocket }     from './hooks/useWebSocket'
import { useTTS }           from './hooks/useSpeech'
import { CameraPanel }      from './components/CameraPanel'
import { SentenceBuilder }  from './components/SentenceBuilder'
import { TranscriptPanel }  from './components/TranscriptPanel'
import { SpeechInput }      from './components/SpeechInput'
import type { Message }     from './types'

function makeId() {
  return Math.random().toString(36).slice(2)
}

export default function App() {
  const { status, prediction, sendFrame } = useWebSocket()
  const { speak }                         = useTTS()
  const [messages, setMessages]           = useState<Message[]>([])

  // Called when signer presses "Speak & Send"
  const handleSignerSend = useCallback((text: string) => {
    speak(text)
    setMessages(prev => [...prev, {
      id:        makeId(),
      role:      'signer',
      text,
      timestamp: new Date(),
    }])
  }, [speak])

  // Called when listener finishes speaking
  const handleListenerMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      id:        makeId(),
      role:      'listener',
      text,
      timestamp: new Date(),
    }])
  }, [])

  // Re-speak any message from the transcript
  const handleSpeak = useCallback((text: string) => {
    speak(text)
  }, [speak])

  return (
    <div className="min-h-screen bg-[#0f0f13] text-slate-100 flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            Sign<span className="text-indigo-400">Bridge</span>
          </span>
          <span className="text-xs text-slate-600 font-medium px-2 py-0.5 rounded-full border border-white/10">
            v2.0
          </span>
        </div>
        <p className="text-xs text-slate-500 hidden sm:block">
          Hold any ASL sign 1.5s to type · Press Speak &amp; Send to transmit
        </p>
      </header>

      {/* ── Main layout ─────────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-white/5 overflow-hidden">

        {/* Left — camera */}
        <div className="p-6 flex flex-col overflow-hidden">
          <CameraPanel
            sendFrame={sendFrame}
            prediction={prediction}
            status={status}
          />
        </div>

        {/* Right — conversation stack */}
        <div className="flex flex-col overflow-hidden border-t border-white/5 md:border-t-0">

          {/* 1. Transcript (scrollable, grows to fill space) */}
          <div className="flex-1 overflow-hidden p-6 pb-3 min-h-0">
            <TranscriptPanel messages={messages} onSpeak={handleSpeak} />
          </div>

          <div className="border-t border-white/5" />

          {/* 2. Sentence builder (fixed height) */}
          <div className="p-6 pt-4 pb-3">
            <SentenceBuilder
              prediction={prediction}
              onSend={handleSignerSend}
            />
          </div>

          <div className="border-t border-white/5" />

          {/* 3. Listener speech input (fixed height) */}
          <div className="p-6 pt-4">
            <SpeechInput onMessage={handleListenerMessage} />
          </div>

        </div>
      </main>
    </div>
  )
}
