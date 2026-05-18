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
        {/* Glass section label */}
        <div className="glass-pill" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
        }}>
          <Hand size={10} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-secondary)',
          }}>Conversation</span>
        </div>

        {/* Message count — glass pill badge */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1   }}
              exit={{    opacity: 0, scale: 0.7 }}
              className="glass-pill"
              style={{ padding: '4px 12px' }}
            >
              <span style={{
                fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--green)',
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 20,
              }}
            >
              {/* Animated icon pair with connector dots */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 52, height: 52, borderRadius: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--green-dim), rgba(52,211,153,0.04))',
                    border: '1px solid var(--green-border)',
                    boxShadow: '0 0 20px var(--green-glow2)',
                  }}
                >
                  <Hand size={22} strokeWidth={1.4} style={{ color: 'var(--green)' }} />
                </motion.div>

                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22 }}
                      style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--text-muted)',
                      }}
                    />
                  ))}
                </div>

                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  style={{
                    width: 52, height: 52, borderRadius: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--blue-glow), rgba(96,165,250,0.04))',
                    border: '1px solid var(--blue-glow)',
                    boxShadow: '0 0 20px var(--blue-glow)',
                  }}
                >
                  <Mic size={22} strokeWidth={1.4} style={{ color: 'var(--blue)' }} />
                </motion.div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)',
                  marginBottom: 8, letterSpacing: '-0.01em',
                }}>
                  Ready for conversation
                </p>
                <p className="label" style={{ lineHeight: 1.9, fontSize: '0.59rem' }}>
                  Sign a message and press{' '}
                  <span style={{ color: 'var(--green)' }}>Speak &amp; Send</span><br />
                  or tap the mic for a voice reply
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
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1,   opacity: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 380, damping: 20 }}
                  style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 2,
                    background: isSigner
                      ? 'linear-gradient(135deg, var(--green-dim), rgba(52,211,153,0.06))'
                      : 'linear-gradient(135deg, var(--blue-glow), rgba(96,165,250,0.06))',
                    border: isSigner
                      ? '1px solid var(--green-border)'
                      : '1px solid var(--blue-glow)',
                    boxShadow: isSigner
                      ? '0 2px 10px var(--green-glow2)'
                      : '0 2px 10px var(--blue-glow)',
                    color: isSigner ? 'var(--green)' : 'var(--blue)',
                  }}
                >
                  {isSigner
                    ? <Hand size={13} strokeWidth={2.2} />
                    : <Mic  size={13} strokeWidth={2.2} />}
                </motion.div>

                {/* Bubble + meta */}
                <div
                  className="group"
                  style={{
                    maxWidth: '76%', display: 'flex', flexDirection: 'column',
                    alignItems: isSigner ? 'flex-start' : 'flex-end',
                    gap: 5,
                  }}
                >
                  {/* Glass bubble — green for signer, blue for listener */}
                  <div
                    className={isSigner ? 'glass-green' : 'glass-blue'}
                    style={{
                      padding: '10px 14px',
                      ...(isSigner
                        ? { borderTopLeftRadius: 4 }
                        : { borderTopRightRadius: 4 }),
                    }}
                  >
                    <p style={{
                      fontSize: '0.84rem', lineHeight: 1.6,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
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
