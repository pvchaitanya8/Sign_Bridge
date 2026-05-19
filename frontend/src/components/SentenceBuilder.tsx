import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence }     from 'framer-motion'
import { Trash2, Copy, Check, Volume2, PenLine } from 'lucide-react'
import { cn }        from '../lib/utils'
import type { Prediction } from '../types'

interface SentenceBuilderProps {
  prediction: Prediction | null
  onSend:     (text: string) => void
}

const HOLD_MS        = 1500
const MIN_CONFIDENCE = 0.45
const RADIUS         = 30
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

  const clearSentence = () => {
    clearTimers(); setSentence(''); setPendingLetter(null); setProgress(0)
  }
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
  const ringColour  =
    pendingLetter === 'del'   ? 'var(--red)'   :
    pendingLetter === 'space' ? 'var(--green)'  : 'var(--blue)'
  const secondsLeft = ((1 - progress) * HOLD_MS / 1000).toFixed(1)
  const SIZE = 80

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="skeu-chip" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
        }}>
          <PenLine size={10} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-secondary)',
          }}>Sentence Builder</span>
        </div>

        <div className="skeu-chip" style={{ padding: '4px 10px' }}>
          <span className="label" style={{ color: 'var(--text-muted)', fontSize: '0.57rem' }}>
            Hold 1.5 s to confirm
          </span>
        </div>
      </div>

      {/* ── Ring + status + preview ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>

        {/* Progress ring disc — skeuomorphic raised dial */}
        <div
          className={pendingLetter ? 'skeu-raised disc-active' : 'skeu-raised'}
          style={{
            width: SIZE, height: SIZE, borderRadius: '50%', flexShrink: 0,
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          {/* SVG ring */}
          <svg
            width={SIZE} height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
          >
            {/* Track — dark trough */}
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              fill="none"
              style={{ stroke: 'var(--srf-inset-bg)', strokeWidth: 5 }}
            />
            {/* Progress arc */}
            <motion.circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              fill="none"
              style={{ stroke: ringColour, strokeWidth: 5, strokeLinecap: 'round' }}
              strokeDasharray={CIRCUMFERENCE}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 0.05 }}
            />
          </svg>

          {/* Center letter */}
          <AnimatePresence mode="wait">
            <motion.span
              key={pendingLetter ?? 'empty'}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{    scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="mono"
              style={{
                position: 'relative', zIndex: 1,
                fontSize: pendingLetter ? '1.65rem' : '1.1rem',
                fontWeight: 900,
                color: pendingLetter ? ringColour : 'var(--text-muted)',
                textShadow: pendingLetter
                  ? `0 0 12px ${ringColour === 'var(--red)' ? 'var(--red-glow)' : 'var(--green-glow)'}`
                  : 'none',
              }}
            >
              {!pendingLetter              ? '—'
               : pendingLetter === 'space' ? '⎵'
               : pendingLetter === 'del'   ? '⌫'
               : pendingLetter.toUpperCase()}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Status line + sentence preview */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <p style={{
            fontSize: '0.72rem', fontWeight: 700,
            color: pendingLetter
              ? (pendingLetter === 'del' ? 'var(--red)' : 'var(--green)')
              : 'var(--text-muted)',
            height: 18, letterSpacing: '0.01em',
            transition: 'color 0.2s ease',
            textShadow: pendingLetter
              ? `0 0 8px ${pendingLetter === 'del' ? 'var(--red-glow)' : 'var(--green-glow)'}`
              : 'none',
          }}>
            {pendingLetter
              ? `Hold "${pendingLetter === 'space' ? 'SPACE' : pendingLetter === 'del' ? 'DEL' : pendingLetter.toUpperCase()}" · ${secondsLeft}s`
              : 'Waiting for sign…'}
          </p>

          {/* Sentence display — inset LCD readout */}
          <div className="skeu-inset-sm" style={{
            height: 46, borderRadius: 12,
            padding: '0 14px',
            display: 'flex', alignItems: 'center', overflow: 'hidden',
            borderTopColor: sentence ? 'rgba(52,211,153,0.48)' : undefined,
            transition: 'border-color 0.3s ease',
          }}>
            {sentence ? (
              <p className="mono" style={{
                fontSize: '0.94rem', fontWeight: 600, letterSpacing: '0.04em',
                color: 'var(--green)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textShadow: '0 0 8px var(--green-glow2)',
              }}>
                {sentence}
                <span className="cursor" style={{
                  display: 'inline-block', width: 2, height: 15,
                  background: 'var(--green)', marginLeft: 3,
                  verticalAlign: 'middle', borderRadius: 1,
                  boxShadow: '0 0 4px var(--green-glow)',
                }} />
              </p>
            ) : (
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', letterSpacing: '0.01em' }}>
                Your sentence appears here…
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Action row ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10 }}>

        {/* Clear */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={clearSentence}
          disabled={!sentence}
          className={cn('skeu-btn', !sentence && 'opacity-40 cursor-not-allowed')}
          style={{
            width: 46, height: 46, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 13, color: sentence ? 'var(--red)' : 'var(--text-muted)',
          }}
          title="Clear"
        >
          <Trash2 size={15} />
        </motion.button>

        {/* Copy */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={copySentence}
          disabled={!sentence}
          className={cn('skeu-btn', !sentence && 'opacity-40 cursor-not-allowed')}
          style={{
            width: 46, height: 46, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 13, color: sentence ? 'var(--text-secondary)' : 'var(--text-muted)',
          }}
          title="Copy"
        >
          {copied
            ? <Check size={15} style={{ color: 'var(--green)' }} />
            : <Copy  size={15} />}
        </motion.button>

        {/* Speak & Send — primary CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{   scale: 0.97 }}
          onClick={sendSentence}
          disabled={!sentence.trim()}
          className={cn(
            sentence.trim() ? 'skeu-btn-primary' : 'skeu-btn opacity-40 cursor-not-allowed',
          )}
          style={{
            flex: 1, height: 46, borderRadius: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: '0.86rem', fontWeight: 800, letterSpacing: '0.02em',
          }}
        >
          <Volume2 size={15} />
          Speak &amp; Send
        </motion.button>
      </div>
    </div>
  )
}
