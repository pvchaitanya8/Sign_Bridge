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
  const [theme, setTheme]       = useState<Theme>(initTheme)
  const { status, prediction, sendFrame } = useWebSocket()
  const { speak }               = useTTS()
  const [messages, setMessages] = useState<Message[]>([])

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

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--base)', overflow: 'hidden',
    }}>

      {/* ── Nav bar ─────────────────────────────────────── */}
      <motion.header
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="neu-sm flex-shrink-0"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 28px', margin: '16px 16px 0', borderRadius: 22,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo disc */}
          <div className="neu" style={{
            width: 46, height: 46, borderRadius: 15, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: 900, color: 'var(--green)',
              letterSpacing: '-0.01em',
            }}>SB</span>
          </div>

          <div>
            <p style={{
              fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)',
              letterSpacing: '-0.02em', lineHeight: 1.1,
            }}>
              Sign<span style={{ color: 'var(--green)' }}>Bridge</span>
            </p>
            <p className="label" style={{ marginTop: 3, fontSize: '0.6rem' }}>
              ASL · Two-Way Communication
            </p>
          </div>

          <div className="neu-inset-sm" style={{ padding: '3px 12px', borderRadius: 8, marginLeft: 4 }}>
            <span className="label" style={{ color: 'var(--blue)', fontSize: '0.58rem' }}>v2.0</span>
          </div>
        </div>

        {/* Right: hint + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <p className="label hidden sm:block" style={{ fontSize: '0.58rem' }}>
            Hold any ASL sign 1.5 s to type ·&nbsp;
            <span style={{ color: 'var(--green)' }}>Speak &amp; Send</span> to transmit
          </p>

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
              style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light'
                ? <Moon size={16} style={{ color: 'var(--blue)' }} />
                : <Sun  size={16} style={{ color: 'var(--amber)' }} />}
            </motion.button>
          </AnimatePresence>
        </div>
      </motion.header>

      {/* ── Main grid ───────────────────────────────────── */}
      <main style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 16, padding: 16,
      }}>

        {/* Left — camera */}
        <motion.div
          initial={{ x: -36, opacity: 0 }}
          animate={{ x: 0,   opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="neu-lg"
          style={{ display: 'flex', flexDirection: 'column', padding: 24, minHeight: 0, overflow: 'hidden' }}
        >
          <CameraPanel sendFrame={sendFrame} prediction={prediction} status={status} />
        </motion.div>

        {/* Right — stacked conversation panel */}
        <motion.div
          initial={{ x: 36, opacity: 0 }}
          animate={{ x: 0,  opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.18, ease: 'easeOut' }}
          className="neu-lg"
          style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        >
          {/* ① Transcript — grows to fill all available space */}
          <div style={{ flex: 1, minHeight: 0, padding: '24px 24px 16px', overflow: 'hidden' }}>
            <TranscriptPanel messages={messages} onSpeak={handleSpeak} />
          </div>

          <div className="neu-divider" />

          {/* ② Sentence builder */}
          <div style={{ padding: '20px 24px', flexShrink: 0 }}>
            <SentenceBuilder prediction={prediction} onSend={handleSignerSend} />
          </div>

          <div className="neu-divider" />

          {/* ③ Listener reply */}
          <div style={{ padding: '16px 24px 22px', flexShrink: 0 }}>
            <SpeechInput onMessage={handleListenerMessage} />
          </div>
        </motion.div>

      </main>
    </div>
  )
}
