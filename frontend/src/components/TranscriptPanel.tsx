/**
 * TranscriptPanel.tsx
 * --------------------
 * Shows the full two-way conversation as a chat-style feed.
 *
 *   Signer   → left-aligned, indigo bubble  (signed → typed → spoken)
 *   Listener → right-aligned, slate bubble  (spoken → typed)
 *
 * Each message has a re-speak button so either party can replay a line.
 *
 * React concept: useEffect + useRef for auto-scroll.
 * When messages change, scroll the container to the bottom.
 */

import { useEffect, useRef } from 'react'
import { Volume2, Hand, Mic } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Message } from '../types'

interface TranscriptPanelProps {
  messages: Message[]
  onSpeak:  (text: string) => void   // re-speak any message on demand
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function TranscriptPanel({ messages, onSpeak }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Conversation
        </h2>
        <span className="text-xs text-slate-600">{messages.length} messages</span>
      </div>

      {/* Message feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-700">
            <div className="flex gap-3 text-2xl">
              <Hand size={28} strokeWidth={1.5} />
              <Mic  size={28} strokeWidth={1.5} />
            </div>
            <p className="text-sm text-center">
              Sign a sentence and press&nbsp;
              <span className="text-indigo-400 font-medium">Speak &amp; Send</span>
              <br />or use the mic below to reply.
            </p>
          </div>
        )}

        {messages.map(msg => {
          const isSigner = msg.role === 'signer'

          return (
            <div
              key={msg.id}
              className={cn('flex gap-2 items-end', isSigner ? 'flex-row' : 'flex-row-reverse')}
            >
              {/* Avatar icon */}
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5',
                isSigner ? 'bg-indigo-500/20' : 'bg-slate-700',
              )}>
                {isSigner
                  ? <Hand size={14} className="text-indigo-400" />
                  : <Mic  size={14} className="text-slate-400" />}
              </div>

              {/* Bubble */}
              <div className={cn(
                'max-w-[78%] group relative',
                isSigner ? 'items-start' : 'items-end',
              )}>
                <div className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  isSigner
                    ? 'bg-indigo-600/20 text-indigo-100 rounded-bl-sm'
                    : 'bg-slate-700/60 text-slate-200 rounded-br-sm',
                )}>
                  {msg.text}
                </div>

                {/* Timestamp + re-speak (visible on hover) */}
                <div className={cn(
                  'flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
                  isSigner ? 'flex-row' : 'flex-row-reverse',
                )}>
                  <span className="text-[10px] text-slate-600">
                    {formatTime(msg.timestamp)}
                  </span>
                  <button
                    onClick={() => onSpeak(msg.text)}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                    title="Read aloud"
                  >
                    <Volume2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
