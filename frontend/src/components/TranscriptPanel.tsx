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
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Conversation
        </h2>
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1   }}
              className="text-[10px] text-slate-600 glass px-2 py-0.5 rounded-full"
            >
              {messages.length} msg{messages.length !== 1 ? 's' : ''}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">

        {/* Empty state */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0         }}
              className="h-full flex flex-col items-center justify-center gap-3 text-slate-700 py-6"
            >
              <div className="flex gap-3">
                <div className="glass w-10 h-10 rounded-xl flex items-center justify-center">
                  <Hand size={18} strokeWidth={1.5} className="text-indigo-500/60" />
                </div>
                <div className="glass w-10 h-10 rounded-xl flex items-center justify-center">
                  <Mic  size={18} strokeWidth={1.5} className="text-emerald-500/60" />
                </div>
              </div>
              <p className="text-xs text-center text-slate-600 leading-relaxed">
                Sign a message and press<br />
                <span className="text-indigo-400">Speak &amp; Send</span> · or tap the mic to reply
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
                initial={{ opacity: 0, x: isSigner ? -20 : 20, y: 8 }}
                animate={{ opacity: 1, x: 0,                    y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={cn('flex gap-2 items-end', isSigner ? 'flex-row' : 'flex-row-reverse')}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5 glass',
                  isSigner ? 'text-indigo-400' : 'text-emerald-400',
                )}>
                  {isSigner
                    ? <Hand size={12} strokeWidth={2} />
                    : <Mic  size={12} strokeWidth={2} />}
                </div>

                {/* Bubble */}
                <div className={cn('max-w-[80%] group', isSigner ? 'items-start' : 'items-end')}>
                  <div className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    isSigner
                      ? 'bg-indigo-600/20 border border-indigo-500/20 text-slate-100 rounded-bl-sm'
                      : 'bg-slate-700/40 border border-white/[0.06] text-slate-200 rounded-br-sm',
                  )}>
                    {msg.text}
                  </div>

                  {/* Hover meta */}
                  <div className={cn(
                    'flex items-center gap-1.5 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                    isSigner ? 'flex-row' : 'flex-row-reverse',
                  )}>
                    <span className="text-[10px] text-slate-600">{formatTime(msg.timestamp)}</span>
                    <button
                      onClick={() => onSpeak(msg.text)}
                      className="text-slate-600 hover:text-slate-400 transition-colors"
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
