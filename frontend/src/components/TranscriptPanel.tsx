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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <span className="label">Conversation</span>
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1   }}
              className="neu-inset-sm"
              style={{ padding: '2px 10px', borderRadius: 8 }}
            >
              <span className="label" style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>
                {messages.length} msg{messages.length !== 1 ? 's' : ''}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Inset feed area ────────────────────────────── */}
      <div
        className="neu-inset-lg flex-1 min-h-0"
        style={{ overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}
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
                alignItems: 'center', justifyContent: 'center', gap: 12,
              }}
            >
              {/* Two raised icon tiles */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="neu-sm" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hand size={18} strokeWidth={1.4} style={{ color: 'var(--blue)' }} />
                </div>
                <div className="neu-sm" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic  size={18} strokeWidth={1.4} style={{ color: 'var(--green)' }} />
                </div>
              </div>
              <p className="label" style={{ textAlign: 'center', lineHeight: 1.8, color: 'var(--text-muted)' }}>
                Sign a message and press<br />
                <span style={{ color: 'var(--green)' }}>Speak &amp; Send</span>
                &nbsp;· or tap the mic to reply
              </p>
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
                initial={{ opacity: 0, x: isSigner ? -20 : 20, y: 6 }}
                animate={{ opacity: 1, x: 0,                    y: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                style={{ display: 'flex', gap: 8, alignItems: 'flex-end',
                         flexDirection: isSigner ? 'row' : 'row-reverse' }}
              >
                {/* Avatar disc */}
                <div className="neu-sm" style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 2,
                  color: isSigner ? 'var(--blue)' : 'var(--green)',
                }}>
                  {isSigner
                    ? <Hand size={12} strokeWidth={2} />
                    : <Mic  size={12} strokeWidth={2} />}
                </div>

                {/* Bubble */}
                <div
                  className="group"
                  style={{
                    maxWidth: '78%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: isSigner ? 'flex-start' : 'flex-end',
                  }}
                >
                  {/* Raised chip for signer, inset trough for listener */}
                  <div
                    className={cn(isSigner ? 'neu-sm' : 'neu-inset-sm')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: isSigner ? 14 : 10,
                      borderTopLeftRadius:  isSigner ? 4  : undefined,
                      borderTopRightRadius: !isSigner ? 4 : undefined,
                    }}
                  >
                    <p style={{
                      fontSize: '0.82rem', lineHeight: 1.55,
                      color: isSigner ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}>
                      {msg.text}
                    </p>
                  </div>

                  {/* Hover meta */}
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, padding: '0 4px',
                      flexDirection: isSigner ? 'row' : 'row-reverse',
                    }}
                  >
                    <span className="label" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                    <button
                      onClick={() => onSpeak(msg.text)}
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Read aloud"
                    >
                      <Volume2 size={10} />
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
