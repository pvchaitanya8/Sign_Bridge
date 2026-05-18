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
        : prev + letter.toUpperCase()
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

  const ringOffset = CIRCUMFERENCE * (1 - progress)
  const ringColour =
    pendingLetter === 'del'   ? 'var(--red)'   :
    pendingLetter === 'space' ? 'var(--green)'  : 'var(--blue)'
  const secondsLeft = ((1 - progress) * HOLD_MS / 1000).toFixed(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="label">Sentence Builder</span>
        <span className="label" style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
          Hold 1.5 s to confirm
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

        {/* ── Progress ring (raised neumorphic disc) ────── */}
        <div className="neu" style={{
          width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
        }}>
          <svg
            width="68" height="68"
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
            viewBox="0 0 68 68"
          >
            {/* Track */}
            <circle cx="34" cy="34" r={RADIUS} fill="none"
              stroke="var(--shadow-dark)" strokeWidth="4" />
            {/* Fill */}
            <motion.circle cx="34" cy="34" r={RADIUS}
              fill="none" stroke={ringColour} strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 0.05 }}
            />
          </svg>

          {/* Center letter */}
          <AnimatePresence mode="wait">
            <motion.span
              key={pendingLetter ?? 'empty'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{    scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mono"
              style={{
                fontSize: pendingLetter ? '1.35rem' : '1rem',
                fontWeight: 800,
                color: pendingLetter ? ringColour : 'var(--text-muted)',
                textShadow: pendingLetter ? `0 0 10px ${ringColour}55` : 'none',
                position: 'relative', zIndex: 1,
              }}
            >
              {!pendingLetter     ? '—'
               : pendingLetter === 'space' ? '⎵'
               : pendingLetter === 'del'   ? '⌫'
               : pendingLetter.toUpperCase()}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* ── Status + sentence preview ─────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Status line */}
          <p className="label" style={{ height: 16, fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
            {pendingLetter
              ? `Hold "${pendingLetter === 'space' ? 'SPACE' : pendingLetter === 'del' ? 'DEL' : pendingLetter.toUpperCase()}" — ${secondsLeft}s left`
              : 'Waiting for sign…'}
          </p>

          {/* Inset sentence display */}
          <div className="neu-inset-sm" style={{
            height: 40, borderRadius: 10,
            padding: '0 12px',
            display: 'flex', alignItems: 'center', overflow: 'hidden',
          }}>
            {sentence ? (
              <p className="mono" style={{
                fontSize: '0.88rem', fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                letterSpacing: '0.04em',
              }}>
                {sentence}
                <span className="cursor" style={{
                  display: 'inline-block', width: 2, height: 14,
                  background: 'var(--green)', marginLeft: 2,
                  verticalAlign: 'middle', borderRadius: 1,
                }} />
              </p>
            ) : (
              <p className="label" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                Your sentence appears here…
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Action buttons ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8 }}>

        {/* Clear */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={clearSentence}
          disabled={!sentence}
          className={cn('neu-btn', !sentence && 'cursor-not-allowed')}
          style={{
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: sentence ? 'var(--red)' : 'var(--text-muted)',
          }}
          title="Clear"
        >
          <Trash2 size={14} />
        </motion.button>

        {/* Copy */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={copySentence}
          disabled={!sentence}
          className={cn('neu-btn', !sentence && 'cursor-not-allowed')}
          style={{
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: sentence ? 'var(--text-secondary)' : 'var(--text-muted)',
          }}
          title="Copy"
        >
          {copied
            ? <Check size={14} style={{ color: 'var(--green)' }} />
            : <Copy  size={14} />}
        </motion.button>

        {/* Speak & Send */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{   scale: 0.97 }}
          onClick={sendSentence}
          disabled={!sentence.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            sentence.trim() ? 'neu-btn-primary' : 'neu-btn cursor-not-allowed',
          )}
          style={{
            height: 38, fontSize: '0.8rem', fontWeight: 700,
            letterSpacing: '0.03em',
          }}
        >
          <Volume2 size={13} /> Speak &amp; Send
        </motion.button>
      </div>
    </div>
  )
}
