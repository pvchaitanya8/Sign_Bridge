import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Zap }                  from 'lucide-react'
import { useWebSocket }                    from './hooks/useWebSocket'
import { useTTS }                          from './hooks/useSpeech'
import { CameraPanel }                     from './components/CameraPanel'
import { SentenceBuilder }                 from './components/SentenceBuilder'
import { TranscriptPanel }                 from './components/TranscriptPanel'
import { SpeechInput }                     from './components/SpeechInput'
import type { Message }                    from './types'

type Theme = 'dark' | 'light'

function makeId() { return Math.random().toString(36).slice(2) }

function initTheme(): Theme {
  const stored = localStorage.getItem('sb-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return 'light'   // light is the primary theme; dark is secondary
}

function formatClock(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

const statusLabel: Record<string, string> = {
  connected:    'LIVE',
  connecting:   'LINKING',
  disconnected: 'OFFLINE',
  error:        'FAULT',
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initTheme)
  const { status, prediction, sendFrame } = useWebSocket()
  const { speak } = useTTS()
  const [messages, setMessages] = useState<Message[]>([])
  const [clock, setClock] = useState(() => new Date())
  const [sessionStart] = useState(() => Date.now())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sb-theme', theme)
  }, [theme])

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const handleSignerSend = useCallback((text: string) => {
    speak(text)
    setMessages(prev => [...prev, { id: makeId(), role: 'signer', text, timestamp: new Date() }])
  }, [speak])

  const handleListenerMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: makeId(), role: 'listener', text, timestamp: new Date() }])
  }, [])

  const handleSpeak = useCallback((text: string) => speak(text), [speak])

  const ledClass =
    status === 'connected'  ? 'led led-on led-blink' :
    status === 'connecting' ? 'led led-warn led-blink' :
    status === 'error'      ? 'led led-accent led-blink' :
                              'led led-off'

  const sessionMs = clock.getTime() - sessionStart
  const sessionMin = Math.floor(sessionMs / 60000).toString().padStart(2, '0')
  const sessionSec = Math.floor((sessionMs % 60000) / 1000).toString().padStart(2, '0')

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--paper)', overflow: 'hidden',
    }}>

      {/* ── Header — industrial faceplate ─────────────── */}
      <header style={{
        display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
        height: 64, flexShrink: 0,
        background: 'var(--bar-bg)',
        color: 'var(--bar-fg)',
        borderBottom: '1px solid var(--line)',
      }}>
        {/* Brand block */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 20px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          minWidth: 280,
        }}>
          <div style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent)', color: '#fff',
            borderRadius: 'var(--r-sm)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
            position: 'relative',
          }}>
            SB
            <span style={{
              position: 'absolute', top: 4, right: 4, width: 4, height: 4,
              background: '#fff', borderRadius: '50%',
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18, fontWeight: 700, letterSpacing: '0.04em',
              color: 'var(--bar-fg)', lineHeight: 1,
            }}>
              SIGNBRIDGE
            </h1>
            <span className="hud" style={{
              fontSize: 9, color: 'rgba(236, 235, 229, 0.55)', letterSpacing: '0.18em',
            }}>
              V2.0 · ASL TRANSLATOR
            </span>
          </div>
        </div>

        {/* Center HUD — instrument readouts */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center',
          padding: '0 24px',
          gap: 28,
        }}>
          {/* Status group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={ledClass} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span className="hud" style={{
                color: 'rgba(236, 235, 229, 0.45)', fontSize: 9, letterSpacing: '0.18em',
              }}>
                LINK
              </span>
              <span className="readout" style={{
                fontSize: 13, fontWeight: 600,
                color: status === 'connected'  ? 'var(--ok)' :
                       status === 'connecting' ? 'var(--warn)' :
                       status === 'error'      ? 'var(--accent)' :
                                                 'rgba(236, 235, 229, 0.65)',
              }}>
                {statusLabel[status] ?? 'IDLE'}
              </span>
            </div>
          </div>

          <div className="bar-divider hud-optional-md" />

          <div className="hud-optional-md" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="hud" style={{
              color: 'rgba(236, 235, 229, 0.45)', fontSize: 9, letterSpacing: '0.18em',
              whiteSpace: 'nowrap',
            }}>
              MODEL
            </span>
            <span className="readout" style={{ fontSize: 13, color: 'var(--bar-fg)', whiteSpace: 'nowrap' }}>
              ASL-RF · 29 CL
            </span>
          </div>

          <div className="bar-divider hud-optional-lg" />

          <div className="hud-optional-lg" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="hud" style={{
              color: 'rgba(236, 235, 229, 0.45)', fontSize: 9, letterSpacing: '0.18em',
              whiteSpace: 'nowrap',
            }}>
              SESSION
            </span>
            <span className="readout" style={{ fontSize: 13, color: 'var(--bar-fg)', whiteSpace: 'nowrap' }}>
              {sessionMin}:{sessionSec}
            </span>
          </div>

          <div className="bar-divider hud-optional-lg" />

          <div className="hud-optional-lg" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="hud" style={{
              color: 'rgba(236, 235, 229, 0.45)', fontSize: 9, letterSpacing: '0.18em',
              whiteSpace: 'nowrap',
            }}>
              MSG / HOLD
            </span>
            <span className="readout" style={{ fontSize: 13, color: 'var(--bar-fg)', whiteSpace: 'nowrap' }}>
              {messages.length.toString().padStart(2, '0')} · 1.50s
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Right cluster — clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={12} strokeWidth={1.8} style={{ color: 'rgba(236, 235, 229, 0.45)' }} />
            <span className="readout" style={{
              fontSize: 16, fontWeight: 500,
              color: 'var(--bar-fg)', letterSpacing: '0.06em',
            }}>
              {formatClock(clock)}
            </span>
          </div>
        </div>

        {/* Theme toggle cell */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 16px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            style={{
              width: 36, height: 36,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              borderRadius: 'var(--r-sm)',
              color: 'rgba(236, 235, 229, 0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 220ms cubic-bezier(0.32,0.72,0,1), color 220ms cubic-bezier(0.32,0.72,0,1), border-color 220ms cubic-bezier(0.32,0.72,0,1), transform 220ms cubic-bezier(0.32,0.72,0,1), box-shadow 220ms cubic-bezier(0.32,0.72,0,1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.10)'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.20)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.32)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
              e.currentTarget.style.color = 'rgba(236, 235, 229, 0.85)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {theme === 'light'
              ? <Moon size={14} strokeWidth={1.7} />
              : <Sun  size={14} strokeWidth={1.7} />}
          </button>
        </div>
      </header>

      {/* ── Main — two panels sitting on the page ───────── */}
      <main style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '1.05fr 1fr',
        gap: 14, padding: 14,
      }}>

        {/* Left — camera */}
        <section
          className="panel"
          style={{
            display: 'flex', flexDirection: 'column',
            minHeight: 0, overflow: 'hidden',
          }}
        >
          <CameraPanel sendFrame={sendFrame} prediction={prediction} status={status} />
        </section>

        {/* Right — conversation column */}
        <section
          className="panel"
          style={{
            display: 'flex', flexDirection: 'column',
            minHeight: 0, overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TranscriptPanel messages={messages} onSpeak={handleSpeak} />
          </div>

          <div className="hairline" />

          <div style={{ flexShrink: 0 }}>
            <SentenceBuilder prediction={prediction} onSend={handleSignerSend} />
          </div>

          <div className="hairline" />

          <div style={{ flexShrink: 0 }}>
            <SpeechInput onMessage={handleListenerMessage} />
          </div>
        </section>

      </main>
    </div>
  )
}
