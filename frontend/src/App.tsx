import { useState, useCallback } from 'react'
import { motion }               from 'framer-motion'
import { useWebSocket }         from './hooks/useWebSocket'
import { useTTS }               from './hooks/useSpeech'
import { CameraPanel }          from './components/CameraPanel'
import { SentenceBuilder }      from './components/SentenceBuilder'
import { TranscriptPanel }      from './components/TranscriptPanel'
import { SpeechInput }          from './components/SpeechInput'
import type { Message }         from './types'

function makeId() { return Math.random().toString(36).slice(2) }

export default function App() {
  const { status, prediction, sendFrame } = useWebSocket()
  const { speak }                         = useTTS()
  const [messages, setMessages]           = useState<Message[]>([])

  const handleSignerSend = useCallback((text: string) => {
    speak(text)
    setMessages(prev => [...prev, { id: makeId(), role: 'signer', text, timestamp: new Date() }])
  }, [speak])

  const handleListenerMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: makeId(), role: 'listener', text, timestamp: new Date() }])
  }, [])

  const handleSpeak = useCallback((text: string) => speak(text), [speak])

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">

      {/* ── Ambient gradient orbs ──────────────────────── */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* ── Content (above orbs) ───────────────────────── */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Nav */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="glass flex items-center justify-between px-6 py-4 flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">
                Sign<span className="gradient-text">Bridge</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 rounded-full border border-white/10 glass">
              v2.0
            </span>
          </div>

          <p className="text-xs text-slate-500 hidden sm:block">
            Hold any ASL sign for 1.5 s to type · Press&nbsp;
            <span className="text-indigo-400">Speak &amp; Send</span> to transmit
          </p>
        </motion.header>

        {/* Main grid */}
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">

          {/* Left — camera */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="glass rounded-2xl p-5 flex flex-col overflow-hidden"
          >
            <CameraPanel sendFrame={sendFrame} prediction={prediction} status={status} />
          </motion.div>

          {/* Right — conversation stack */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0,  opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            className="glass rounded-2xl flex flex-col overflow-hidden"
          >
            {/* Transcript */}
            <div className="flex-1 p-5 overflow-hidden min-h-0">
              <TranscriptPanel messages={messages} onSpeak={handleSpeak} />
            </div>

            <div className="border-t border-white/[0.06] mx-4" />

            {/* Sentence builder */}
            <div className="p-5 pt-4">
              <SentenceBuilder prediction={prediction} onSend={handleSignerSend} />
            </div>

            <div className="border-t border-white/[0.06] mx-4" />

            {/* Listener speech */}
            <div className="p-5 pt-4">
              <SpeechInput onMessage={handleListenerMessage} />
            </div>
          </motion.div>

        </main>
      </div>
    </div>
  )
}
