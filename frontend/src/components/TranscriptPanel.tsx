import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Hand, Mic }      from 'lucide-react'
import { cn }                      from '../lib/utils'
import type { Message }            from '../types'

interface TranscriptPanelProps {
  messages: Message[]
  onSpeak:  (text: string) => void
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function TranscriptPanel({ messages, onSpeak }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, flexShrink: 0,
      }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-secondary)',
        }}>
          Conversation
        </span>
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1   }}
              className="neu-inset-sm"
              style={{ padding: '3px 12px', borderRadius: 8 }}
            >
              <span style={{
                fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-secondary)',
              }}>
                {messages.length} msg{messages.length !== 1 ? 's' : ''}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Scrollable feed ─────────────────────────────── */}
      <div
        className="neu-inset-lg"
        style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        {/* Empty state */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0         }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="neu-sm" style={{
                  width: 48, height: 48, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Hand size={20} strokeWidth={1.4} style={{ color: 'var(--blue)' }} />
                </div>
                <div className="neu-sm" style={{
                  width: 48, height: 48, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mic size={20} strokeWidth={1.4} style={{ color: 'var(--green)' }} />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}>
                  No messages yet
                </p>
                <p className="label" style={{ lineHeight: 1.8 }}>
                  Sign a message and press<br />
                  <span style={{ color: 'var(--green)' }}>Speak &amp; Send</span>
                  {' '}· or tap the mic to reply
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map(msg => {
            const isSigner = msg.role === 'signer'
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isSigner ? -18 : 18, y: 5 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.26, ease: 'easeOut' }}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-end',
                  flexDirection: isSigner ? 'row' : 'row-reverse',
                }}
              >
                {/* Avatar */}
                <div className="neu-sm" style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isSigner ? 'var(--blue)' : 'var(--green)',
                  marginBottom: 2,
                }}>
                  {isSigner
                    ? <Hand size={13} strokeWidth={2} />
                    : <Mic  size={13} strokeWidth={2} />}
                </div>

                {/* Bubble + meta */}
                <div
                  className="group"
                  style={{
                    maxWidth: '76%', display: 'flex', flexDirection: 'column',
                    alignItems: isSigner ? 'flex-start' : 'flex-end',
                    gap: 5,
                  }}
                >
                  <div
                    className={cn(isSigner ? 'neu-sm' : 'neu-inset-sm')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: isSigner ? 16 : 12,
                      ...(isSigner
                        ? { borderTopLeftRadius: 5 }
                        : { borderTopRightRadius: 5 }),
                    }}
                  >
                    <p style={{
                      fontSize: '0.84rem', lineHeight: 1.55,
                      color: isSigner ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}>
                      {msg.text}
                    </p>
                  </div>

                  {/* Hover meta row */}
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      flexDirection: isSigner ? 'row' : 'row-reverse',
                      padding: '0 4px',
                    }}
                  >
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)',
                      letterSpacing: '0.04em',
                    }}>
                      {formatTime(msg.timestamp)}
                    </span>
                    <button
                      onClick={() => onSpeak(msg.text)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        padding: 2, borderRadius: 4,
                      }}
                      title="Read aloud"
                    >
                      <Volume2 size={11} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
