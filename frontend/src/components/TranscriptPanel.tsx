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
        <div className="skeu-chip" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
        }}>
          <Hand size={10} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-secondary)',
          }}>Conversation</span>
        </div>

        {/* Message count chip */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1   }}
              exit={{    opacity: 0, scale: 0.7 }}
              className="skeu-chip"
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

      {/* ── Scrollable feed — inset screen trough ──────── */}
      <div
        className="skeu-inset-lg"
        style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        {/* Empty state — terminal screen aesthetic */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 28,
                position: 'relative',
                /* no overflow:hidden here — it would clip the floating icons */
                paddingTop: 20, paddingBottom: 20,
              }}
            >
              {/* CRT scan-line — isolated in its own overflow:hidden shell */}
              <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
              }}>
                <div className="scan-line" />
              </div>

              {/* Icon pair — floating metal enclosures */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>

                {/* Signer icon box — CSS float, no JS animation loop */}
                <div
                  style={{
                    width: 72, height: 72, borderRadius: 20, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background:
                      'linear-gradient(160deg,' +
                      '  rgba(46,235,160,0.32) 0%,' +
                      '  rgba(20,60,36,0.96)   30%,' +
                      '  rgba(6,20,12,0.98)   100%)',
                    border: '1.5px solid',
                    borderTopColor:    'rgba(46,235,160,0.80)',
                    borderLeftColor:   'rgba(46,235,160,0.50)',
                    borderBottomColor: 'rgba(0,0,0,0.80)',
                    borderRightColor:  'rgba(0,0,0,0.60)',
                    boxShadow:
                      'inset 0 2px 0 rgba(46,235,160,0.40),' +
                      'inset 0 -1px 0 rgba(0,0,0,0.60),' +
                      '0 6px 20px rgba(0,0,0,0.70),' +
                      '0 0 32px rgba(46,235,160,0.55),' +
                      '0 0 64px rgba(46,235,160,0.22)',
                  }}
                >
                  <Hand size={30} strokeWidth={1.5}
                    className="icon-glow-green"
                    style={{ color: 'var(--green)' }}
                  />
                </div>

                {/* Animated separator dots — CSS only */}
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  {([0, 1, 2] as const).map(i => (
                    <div
                      key={i}
                      className={`dot-pulse-${i}`}
                      style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--green)',
                        boxShadow: '0 0 8px var(--green-glow), 0 0 16px var(--green-glow2)',
                      }}
                    />
                  ))}
                </div>

                {/* Listener icon box — CSS float with phase offset */}
                <div
                  style={{
                    width: 72, height: 72, borderRadius: 20, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background:
                      'linear-gradient(160deg,' +
                      '  rgba(110,180,255,0.30) 0%,' +
                      '  rgba(12,28,72,0.96)   30%,' +
                      '  rgba(4,10,38,0.98)    100%)',
                    border: '1.5px solid',
                    borderTopColor:    'rgba(110,180,255,0.76)',
                    borderLeftColor:   'rgba(110,180,255,0.46)',
                    borderBottomColor: 'rgba(0,0,0,0.80)',
                    borderRightColor:  'rgba(0,0,0,0.60)',
                    boxShadow:
                      'inset 0 2px 0 rgba(110,180,255,0.36),' +
                      'inset 0 -1px 0 rgba(0,0,0,0.60),' +
                      '0 6px 20px rgba(0,0,0,0.70),' +
                      '0 0 32px rgba(110,180,255,0.52),' +
                      '0 0 64px rgba(110,180,255,0.20)',
                  }}
                >
                  <Mic size={30} strokeWidth={1.5}
                    className="icon-glow-blue"
                    style={{ color: 'var(--blue)' }}
                  />
                </div>
              </div>

              {/* Text block — uses explicit light colors for inset readability */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{
                  fontSize: '0.90rem', fontWeight: 700,
                  color: 'var(--text-on-inset)',
                  letterSpacing: '-0.01em',
                }}>
                  Ready for conversation
                </p>

                {/* Step hints — always light text */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <p style={{
                    fontSize: '0.62rem', fontWeight: 700,
                    letterSpacing: '0.11em', textTransform: 'uppercase',
                    color: 'var(--text-on-inset-dim)',
                  }}>
                    Sign a message and press{' '}
                    <span style={{
                      color: 'var(--green)',
                      textShadow: '0 0 8px var(--green-glow)',
                    }}>
                      Speak &amp; Send
                    </span>
                  </p>
                  <p style={{
                    fontSize: '0.62rem', fontWeight: 700,
                    letterSpacing: '0.11em', textTransform: 'uppercase',
                    color: 'var(--text-on-inset-muted)',
                  }}>
                    or tap the mic for a voice reply
                  </p>
                </div>
              </div>

              {/* Ambient bottom glow line */}
              <div style={{
                position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 1,
                background: 'linear-gradient(90deg, transparent, var(--green-border), transparent)',
                opacity: 0.5,
              }} />
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
                {/* Avatar — raised metal disc */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1,   opacity: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 380, damping: 20 }}
                  style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 2,
                    background: 'linear-gradient(175deg, var(--srf-raise-hi) 0%, var(--base) 55%, var(--srf-raise-lo) 100%)',
                    border: '1px solid',
                    borderTopColor:    isSigner ? 'rgba(52,211,153,0.35)'  : 'rgba(96,165,250,0.28)',
                    borderLeftColor:   isSigner ? 'rgba(52,211,153,0.20)'  : 'rgba(96,165,250,0.16)',
                    borderBottomColor: 'var(--bevel-lo)',
                    borderRightColor:  'rgba(0,0,0,0.38)',
                    boxShadow: isSigner
                      ? 'inset 0 1px 0 rgba(52,211,153,0.12), 0 3px 8px rgba(0,0,0,0.45), 0 0 8px var(--green-glow2)'
                      : 'inset 0 1px 0 rgba(96,165,250,0.10), 0 3px 8px rgba(0,0,0,0.45), 0 0 8px var(--blue-glow)',
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
                  {/* Skeuomorphic message bubble */}
                  <div
                    className={isSigner ? 'skeu-bubble-signer' : 'skeu-bubble-listener'}
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
                    className={cn('opacity-0 group-hover:opacity-100 transition-opacity duration-200')}
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
