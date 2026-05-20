import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, Hand, Cpu, Mic, ArrowRight } from 'lucide-react'
import type { Message } from '../types'

interface TranscriptPanelProps {
  messages: Message[]
  onSpeak:  (text: string) => void
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

export function TranscriptPanel({ messages, onSpeak }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Section bar ─────────────────────────────────── */}
      <div className="bar">
        <div className="bar-section">
          <span>TRANSCRIPT · LOG</span>
          <span style={{ opacity: 0.55 }}>CH 01</span>
        </div>

        {messages.length > 0
          ? (
            <span className="chip chip-on-dark">
              {messages.length.toString().padStart(2, '0')} MSG{messages.length !== 1 ? 'S' : ''}
            </span>
          )
          : (
            <span style={{ opacity: 0.55, fontSize: 10, letterSpacing: '0.16em' }}>
              LOG · EMPTY
            </span>
          )
        }
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      {messages.length === 0 ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>
          <EmptyState />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>
          <div>
            <AnimatePresence initial={false}>
              {messages.map(msg => {
                const isSigner = msg.role === 'signer'
                const roleLabel = isSigner ? 'SIGNER  ' : 'LISTENER'
                const arrow     = isSigner ? '▸' : '◂'
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="group"
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: 'auto auto auto 1fr auto',
                      gap: 12, alignItems: 'baseline',
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <span className="mono" style={{
                      fontSize: 10, fontWeight: 500,
                      color: 'var(--ink-3)', letterSpacing: '0.04em',
                    }}>
                      {formatTime(msg.timestamp)}
                    </span>

                    <span className="mono" style={{
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: isSigner ? 'var(--accent)' : 'var(--ink-2)',
                      whiteSpace: 'pre',
                    }}>
                      {roleLabel}
                    </span>

                    <span className="mono" style={{
                      fontSize: 12, fontWeight: 600,
                      color: 'var(--ink-3)',
                    }}>
                      {arrow}
                    </span>

                    <p style={{
                      fontSize: 13.5, lineHeight: 1.55,
                      color: 'var(--ink)',
                      fontWeight: 400,
                      wordBreak: 'break-word',
                    }}>
                      {msg.text}
                    </p>

                    <button
                      onClick={() => onSpeak(msg.text)}
                      title="Read aloud"
                      aria-label="Read aloud"
                      className="opacity-0 group-hover:opacity-100"
                      style={{
                        background: 'transparent', border: '1px solid var(--line)',
                        borderRadius: 'var(--r-xs)',
                        cursor: 'pointer',
                        color: 'var(--ink-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26,
                        transition: 'opacity 120ms ease, color 120ms ease, border-color 120ms ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--ink)'
                        e.currentTarget.style.borderColor = 'var(--line-2)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--ink-3)'
                        e.currentTarget.style.borderColor = 'var(--line)'
                      }}
                    >
                      <Volume2 size={12} strokeWidth={1.7} />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Empty state — signal-flow schematic
───────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{
      minHeight: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '20px 24px',
      gap: 14,
      boxSizing: 'border-box',
    }}>
      {/* Headline */}
      <div style={{ textAlign: 'center' }}>
        <p className="label label-ink-2" style={{ fontSize: 9, marginBottom: 6 }}>
          READY FOR CONVERSATION
        </p>
        <p style={{
          fontSize: 13, fontWeight: 500,
          color: 'var(--ink-2)', letterSpacing: '0.01em',
          maxWidth: 340, lineHeight: 1.5,
        }}>
          Sign with your hand or tap the mic to reply by voice.
        </p>
      </div>

      {/* Schematic — three modules with arrows */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr auto 1fr',
        alignItems: 'center', gap: 8,
        width: '100%', maxWidth: 380,
      }}>
        <Node icon={<Hand size={17} strokeWidth={1.7} />} title="HAND" sub="SIGNS" tone="accent" />
        <FlowArrow />
        <Node icon={<Cpu size={17} strokeWidth={1.7} />} title="MODEL" sub="ASL-RF" tone="ink" />
        <FlowArrow />
        <Node icon={<Mic size={17} strokeWidth={1.7} />} title="VOICE" sub="OR TEXT" tone="ink" />
      </div>

      {/* Single-line meta footer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        paddingTop: 6,
      }}>
        <span className="label" style={{ fontSize: 9 }}>HOLD 1.5s</span>
        <span style={{ width: 1, height: 10, background: 'var(--line-2)' }} />
        <span className="label" style={{ fontSize: 9 }}>A–Z · SPACE · DEL</span>
      </div>
    </div>
  )
}

function Node({ icon, title, sub, tone }: {
  icon: React.ReactNode
  title: string
  sub: string
  tone: 'accent' | 'ink'
}) {
  const color = tone === 'accent' ? 'var(--accent)' : 'var(--ink)'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '12px 8px',
      background: 'var(--surface-2)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-sm)',
    }}>
      <div style={{ color, lineHeight: 1 }}>{icon}</div>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="mono" style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
          color: 'var(--ink)',
        }}>
          {title}
        </span>
        <span className="mono" style={{
          fontSize: 9, fontWeight: 500, letterSpacing: '0.12em',
          color: 'var(--ink-3)',
        }}>
          {sub}
        </span>
      </div>
    </div>
  )
}

function FlowArrow() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      color: 'var(--ink-3)',
    }}>
      <ArrowRight size={14} strokeWidth={1.5} />
      <span className="mono" style={{ fontSize: 8, letterSpacing: '0.12em' }}>
        ··
      </span>
    </div>
  )
}
