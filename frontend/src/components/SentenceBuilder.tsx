import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence }     from 'framer-motion'
import { Trash2, Copy, Check, Volume2 } from 'lucide-react'
import { cn }        from '../lib/utils'
import type { Prediction } from '../types'

interface SentenceBuilderProps {
  prediction: Prediction | null
  onSend:     (text: string) => void
}

const HOLD_MS        = 1500
const MIN_CONFIDENCE = 0.45
const RADIUS         = 26
const CIRCUMFERENCE  = 2 * Math.PI * RADIUS

export function SentenceBuilder({ prediction, onSend }: SentenceBuilderProps) {
  const [sentence, setSentence]           = useState('')
  const [pendingLetter, setPendingLetter] = useState<string | null>(null)
  const [progress, setProgress]           = useState(0)
  const [copied, setCopied]               = useState(false)

  const holdTimeout      = useRef<number | null>(null)
  const progressInterval = useRef<number | null>(null)
  const holdStartRef     = useRef<number>(0)

  const clearTimers = () => {
    if (holdTimeout.current)      clearTimeout(holdTimeout.current)
    if (progressInterval.current) clearInterval(progressInterval.current)
  }

  useEffect(() => {
    const letter     = prediction?.letter ?? null
    const confidence = prediction?.confidence ?? 0

    if (!letter || confidence < MIN_CONFIDENCE) {
      clearTimers(); setPendingLetter(null); setProgress(0); return
    }
    if (letter === pendingLetter) return

    clearTimers()
    setPendingLetter(letter)
    setProgress(0)
    holdStartRef.current = Date.now()

    progressInterval.current = window.setInterval(() => {
      setProgress(Math.min((Date.now() - holdStartRef.current) / HOLD_MS, 1))
    }, 30)

    holdTimeout.current = window.setTimeout(() => {
      clearInterval(progressInterval.current!)
      setProgress(0); setPendingLetter(null)
      setSentence(prev =>
        letter === 'del'   ? prev.slice(0, -1)
        : letter === 'space' ? prev + ' '
        : prev + letter
      )
    }, HOLD_MS)

    return () => clearTimers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction?.letter, prediction ? prediction.confidence >= MIN_CONFIDENCE : false])

  const clearSentence = () => { clearTimers(); setSentence(''); setPendingLetter(null); setProgress(0) }

  const copySentence = async () => {
    if (!sentence) return
    await navigator.clipboard.writeText(sentence)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const sendSentence = () => {
    if (!sentence.trim()) return
    onSend(sentence.trim()); clearSentence()
  }

  const ringOffset  = CIRCUMFERENCE * (1 - progress)
  const ringColour  = pendingLetter === 'del' ? '#f87171' : pendingLetter === 'space' ? '#34d399' : '#818cf8'
  const secondsLeft = ((1 - progress) * HOLD_MS / 1000).toFixed(1)

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Sentence Builder
        </h2>
        <span className="text-[10px] text-slate-600">Hold 1.5 s to confirm</span>
      </div>

      <div className="flex items-center gap-4">

        {/* Progress ring */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={RADIUS} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <motion.circle cx="32" cy="32" r={RADIUS}
              fill="none" stroke={ringColour} strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 0.05 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={pendingLetter ?? 'empty'}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{    scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={cn('text-xl font-bold',
                  pendingLetter ? 'gradient-text' : 'text-slate-700')}
              >
                {!pendingLetter ? '—'
                  : pendingLetter === 'space' ? '⎵'
                  : pendingLetter === 'del'   ? '⌫'
                  : pendingLetter}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Status + sentence preview */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[11px] text-slate-500 h-4">
            {pendingLetter
              ? `Hold "${pendingLetter === 'space' ? 'SPACE' : pendingLetter === 'del' ? 'DEL' : pendingLetter}" — ${secondsLeft}s left`
              : 'Waiting for sign…'}
          </p>

          {/* Mini sentence display */}
          <div className="h-9 glass rounded-lg px-3 flex items-center overflow-hidden">
            {sentence ? (
              <p className="text-sm text-white tracking-wide truncate font-medium">
                {sentence}
                <span className="cursor inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle" />
              </p>
            ) : (
              <p className="text-xs text-slate-600 italic">Your sentence appears here…</p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={clearSentence} disabled={!sentence}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-xl glass transition-colors',
            sentence ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-700 cursor-not-allowed',
          )}
        >
          <Trash2 size={14} />
        </motion.button>

        <motion.button whileTap={{ scale: 0.95 }}
          onClick={copySentence} disabled={!sentence}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-xl glass transition-colors',
            sentence ? 'text-slate-400 hover:bg-white/10' : 'text-slate-700 cursor-not-allowed',
          )}
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </motion.button>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={sendSentence} disabled={!sentence.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all',
            sentence.trim()
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
              : 'glass text-slate-600 cursor-not-allowed',
          )}
        >
          <Volume2 size={14} /> Speak &amp; Send
        </motion.button>
      </div>
    </div>
  )
}
