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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--base)' }}>

      {/* ── Nav bar ─────────────────────────────────────── */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="neu-sm flex items-center justify-between px-6 py-4 mx-4 mt-4 flex-shrink-0"
        style={{ borderRadius: '18px' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          {/* Raised logo mark */}
          <div className="neu-sm flex items-center justify-center"
               style={{ width: 40, height: 40, borderRadius: 12 }}>
            <span className="label" style={{ fontSize: '0.75rem', color: 'var(--green)', letterSpacing: '0.02em' }}>
              SB
            </span>
          </div>

          <div>
            <p className="font-bold tracking-tight" style={{ fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1 }}>
              Sign<span style={{ color: 'var(--green)' }}>Bridge</span>
            </p>
            <p className="label" style={{ marginTop: 2 }}>ASL Translator</p>
          </div>

          <div className="neu-inset-sm" style={{ padding: '2px 10px', borderRadius: 8 }}>
            <span className="label" style={{ color: 'var(--blue)', fontSize: '0.6rem' }}>v2.0</span>
          </div>
        </div>

        {/* Hint */}
        <p className="label hidden sm:block" style={{ fontSize: '0.6rem' }}>
          Hold any ASL sign 1.5 s to type ·&nbsp;
          <span style={{ color: 'var(--green)' }}>Speak &amp; Send</span> to transmit
        </p>
      </motion.header>

      {/* ── Main grid ───────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">

        {/* Left — camera panel */}
        <motion.div
          initial={{ x: -32, opacity: 0 }}
          animate={{ x: 0,   opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
          className="neu-lg flex flex-col overflow-hidden"
          style={{ padding: '20px', minHeight: 0 }}
        >
          <CameraPanel sendFrame={sendFrame} prediction={prediction} status={status} />
        </motion.div>

        {/* Right — conversation stack */}
        <motion.div
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0,  opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.22, ease: 'easeOut' }}
          className="neu-lg flex flex-col overflow-hidden"
          style={{ minHeight: 0 }}
        >
          {/* Transcript feed */}
          <div className="flex-1 overflow-hidden min-h-0" style={{ padding: '20px' }}>
            <TranscriptPanel messages={messages} onSpeak={handleSpeak} />
          </div>

          {/* Divider */}
          <div className="neu-divider" />

          {/* Sentence builder */}
          <div style={{ padding: '16px 20px' }}>
            <SentenceBuilder prediction={prediction} onSend={handleSignerSend} />
          </div>

          {/* Divider */}
          <div className="neu-divider" />

          {/* Listener speech */}
          <div style={{ padding: '16px 20px' }}>
            <SpeechInput onMessage={handleListenerMessage} />
          </div>
        </motion.div>

      </main>
    </div>
  )
}
