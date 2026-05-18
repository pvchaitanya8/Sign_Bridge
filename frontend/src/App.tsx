import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence }          from 'framer-motion'
import { Sun, Moon }                        from 'lucide-react'
import { useWebSocket }                     from './hooks/useWebSocket'
import { useTTS }                           from './hooks/useSpeech'
import { CameraPanel }                      from './components/CameraPanel'
import { SentenceBuilder }                  from './components/SentenceBuilder'
import { TranscriptPanel }                  from './components/TranscriptPanel'
import { SpeechInput }                      from './components/SpeechInput'
import type { Message }                     from './types'

type Theme = 'dark' | 'light'

function makeId() { return Math.random().toString(36).slice(2) }

function initTheme(): Theme {
  const stored = localStorage.getItem('sb-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function App() {
  const [theme, setTheme]         = useState<Theme>(initTheme)
  const { status, prediction, sendFrame } = useWebSocket()
  const { speak }                 = useTTS()
  const [messages, setMessages]   = useState<Message[]>([])

  /* Apply theme to <html> + persist */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sb-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const handleSignerSend = useCallback((text: string) => {
    speak(text)
    setMessages(prev => [...prev, { id: makeId(), role: 'signer', text, timestamp: new Date() }])
  }, [speak])

  const handleListenerMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: makeId(), role: 'listener', text, timestamp: new Date() }])
  }, [])

  const handleSpeak = useCallback((text: string) => speak(text), [speak])

  const isLight = theme === 'light'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--base)' }}>

      {/* ── Nav ─────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="neu-sm flex items-center justify-between px-6 py-4 mx-4 mt-4 flex-shrink-0"
        style={{ borderRadius: 20 }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          {/* Logo disc */}
          <div className="neu flex items-center justify-center"
               style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--green)',
                           letterSpacing: '0.01em' }}>SB</span>
          </div>

          <div style={{ lineHeight: 1 }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)',
                        letterSpacing: '-0.01em' }}>
              Sign<span style={{ color: 'var(--green)' }}>Bridge</span>
            </p>
            <p className="label" style={{ marginTop: 3 }}>ASL Translator</p>
          </div>

          <div className="neu-inset-sm" style={{ padding: '2px 10px', borderRadius: 8 }}>
            <span className="label" style={{ color: 'var(--blue)', fontSize: '0.58rem' }}>v2.0</span>
          </div>
        </div>

        {/* Right side: hint + toggle */}
        <div className="flex items-center gap-3">
          <p className="label hidden sm:block" style={{ fontSize: '0.58rem' }}>
            Hold any ASL sign 1.5 s to type ·&nbsp;
            <span style={{ color: 'var(--green)' }}>Speak &amp; Send</span> to transmit
          </p>

          {/* Theme toggle */}
          <AnimatePresence mode="wait">
            <motion.button
              key={theme}
              initial={{ scale: 0.7, opacity: 0, rotate: -30 }}
              animate={{ scale: 1,   opacity: 1, rotate: 0   }}
              exit={{    scale: 0.7, opacity: 0, rotate:  30 }}
              transition={{ duration: 0.2 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{   scale: 0.9 }}
              onClick={toggleTheme}
              className="neu-toggle"
              style={{ width: 38, height: 38, display: 'flex', alignItems: 'center',
                       justifyContent: 'center' }}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              title={isLight ? 'Dark mode' : 'Light mode'}
            >
              {isLight
                ? <Moon size={15} style={{ color: 'var(--blue)' }} />
                : <Sun  size={15} style={{ color: 'var(--amber)' }} />}
            </motion.button>
          </AnimatePresence>
        </div>
      </motion.header>

      {/* ── Main grid ───────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">

        {/* Left — camera */}
        <motion.div
          initial={{ x: -32, opacity: 0 }}
          animate={{ x: 0,   opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
          className="neu-lg flex flex-col overflow-hidden"
          style={{ padding: 20, minHeight: 0 }}
        >
          <CameraPanel sendFrame={sendFrame} prediction={prediction} status={status} />
        </motion.div>

        {/* Right — conversation stack */}
        <motion.div
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0,  opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.22, ease: 'easeOut' }}
          className="neu-lg flex flex-col overflow-hidden"
          style={{ minHeight: 0 }}
        >
          {/* Transcript */}
          <div className="flex-1 overflow-hidden min-h-0" style={{ padding: '20px 20px 16px' }}>
            <TranscriptPanel messages={messages} onSpeak={handleSpeak} />
          </div>

          <div className="neu-divider" />

          {/* Sentence builder */}
          <div style={{ padding: '14px 20px' }}>
            <SentenceBuilder prediction={prediction} onSend={handleSignerSend} />
          </div>

          <div className="neu-divider" />

          {/* Listener reply */}
          <div style={{ padding: '14px 20px 18px' }}>
            <SpeechInput onMessage={handleListenerMessage} />
          </div>
        </motion.div>

      </main>
    </div>
  )
}
