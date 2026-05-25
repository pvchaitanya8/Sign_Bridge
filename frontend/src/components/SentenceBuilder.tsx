import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion }     from 'framer-motion'
import { Trash2, Copy, Check, Send }   from 'lucide-react'
import type { Prediction }             from '../types'

interface SentenceBuilderProps {
  prediction: Prediction | null
  onSend:     (text: string) => void
}

const HOLD_MS          = 1500
const MIN_CONFIDENCE   = 0.45
const DROPOUT_GRACE_MS = 300   // tolerate brief detection loss before resetting the hold
const RADIUS           = 32
const CIRCUMFERENCE    = 2 * Math.PI * RADIUS
const SIZE             = 84

export function SentenceBuilder({ prediction, onSend }: SentenceBuilderProps) {
  const [sentence, setSentence]           = useState('')
  const [pendingLetter, setPendingLetter] = useState<string | null>(null)
  const [progress, setProgress]           = useState(0)
  const [copied, setCopied]               = useState(false)

  const holdTimeout      = useRef<number | null>(null)
  const progressInterval = useRef<number | null>(null)
  const dropoutTimeout   = useRef<number | null>(null)
  const holdStartRef     = useRef<number>(0)
  const pendingRef       = useRef<string | null>(null)

  const clearTimers = () => {
    if (holdTimeout.current)      clearTimeout(holdTimeout.current)
    if (progressInterval.current) clearInterval(progressInterval.current)
    if (dropoutTimeout.current)   clearTimeout(dropoutTimeout.current)
    holdTimeout.current = progressInterval.current = dropoutTimeout.current = null
  }

  const resetHold = () => {
    clearTimers()
    pendingRef.current = null
    setPendingLetter(null)
    setProgress(0)
  }

  const beginHold = (letter: string) => {
    clearTimers()
    pendingRef.current = letter
    setPendingLetter(letter)
    setProgress(0)
    holdStartRef.current = Date.now()

    progressInterval.current = window.setInterval(() => {
      setProgress(Math.min((Date.now() - holdStartRef.current) / HOLD_MS, 1))
    }, 30)

    holdTimeout.current = window.setTimeout(() => {
      clearTimers()
      pendingRef.current = null
      setProgress(0)
      setPendingLetter(null)
      setSentence(prev =>
        letter === 'del'   ? prev.slice(0, -1)
        : letter === 'space' ? prev + ' '
        : prev + letter.toUpperCase()
      )
    }, HOLD_MS)
  }

  /**
   * Hold-to-confirm with dropout smoothing. A brief loss of detection
   * (one flickered frame, motion blur, a momentary confidence dip) does
   * NOT reset the hold — only a sustained dropout past DROPOUT_GRACE_MS
   * does. A different *confident* letter still switches immediately.
   */
  useEffect(() => {
    const letter     = prediction?.letter ?? null
    const confidence = prediction?.confidence ?? 0
    const valid      = !!letter && confidence >= MIN_CONFIDENCE

    if (valid) {
      if (letter === pendingRef.current) {
        // Good frame for the held letter — cancel any pending dropout reset
        if (dropoutTimeout.current) {
          clearTimeout(dropoutTimeout.current)
          dropoutTimeout.current = null
        }
        return
      }
      // A different confident letter — switch the hold to it
      beginHold(letter as string)
      return
    }

    // Invalid frame (no hand / low confidence)
    if (!pendingRef.current) return
    // Mid-hold dropout — tolerate briefly; the hold keeps counting underneath
    if (!dropoutTimeout.current) {
      dropoutTimeout.current = window.setTimeout(resetHold, DROPOUT_GRACE_MS)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction?.letter, prediction ? prediction.confidence >= MIN_CONFIDENCE : false])

  // Tear down timers on unmount
  useEffect(() => () => clearTimers(), [])

  const clearSentence = () => {
    resetHold(); setSentence('')
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
  const secondsLeft = ((1 - progress) * HOLD_MS / 1000).toFixed(1)

  const displayLetter =
    !pendingLetter              ? '—' :
    pendingLetter === 'space'   ? '⎵' :
    pendingLetter === 'del'     ? '⌫' :
    pendingLetter.toUpperCase()

  const statusText = pendingLetter
    ? `Hold "${pendingLetter === 'space' ? 'SPACE' : pendingLetter === 'del' ? 'DEL' : pendingLetter.toUpperCase()}" · ${secondsLeft}s`
    : 'Waiting for sign…'

  return (
    <div>

      {/* ── Section bar ─────────────────────────────────── */}
      <div className="bar">
        <div className="bar-section">
          <span>SENTENCE BUILDER</span>
          <span style={{ opacity: 0.55 }}>HOLD 1.5s</span>
        </div>
        <span style={{
          fontSize: 10, letterSpacing: '0.18em',
          color: 'rgba(236, 235, 229, 0.55)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          LEN {sentence.length.toString().padStart(3, '0')}
        </span>
      </div>

      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Ring + status + preview ─────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Progress ring */}
          <div style={{
            width: SIZE, height: SIZE, flexShrink: 0,
            position: 'relative', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg
              width={SIZE} height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
            >
              <circle
                cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                fill="none"
                stroke="var(--line-2)"
                strokeWidth={2}
              />
              <motion.circle
                cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={3}
                strokeLinecap="butt"
                strokeDasharray={CIRCUMFERENCE}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 0.05 }}
              />
            </svg>

            <AnimatePresence mode="wait">
              <motion.span
                key={pendingLetter ?? 'empty'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{    opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="mono"
                style={{
                  position: 'relative',
                  fontSize: pendingLetter ? 32 : 24,
                  fontWeight: 600,
                  color: pendingLetter ? 'var(--accent)' : 'var(--ink-4)',
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                }}
              >
                {displayLetter}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Status + preview column */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="label" style={{
                color: pendingLetter ? 'var(--accent)' : 'var(--ink-3)',
                fontSize: 10,
              }}>
                {statusText}
              </span>
              <span className="mono" style={{
                fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {pendingLetter ? `${(progress * 100).toFixed(0).padStart(3, '0')}%` : '000%'}
              </span>
            </div>

            {/* Sentence display — terminal readout */}
            <div
              className="panel-inset"
              style={{
                height: 48,
                padding: '0 14px',
                display: 'flex', alignItems: 'center', overflow: 'hidden',
                position: 'relative',
              }}
            >
              {sentence ? (
                <p className="mono" style={{
                  fontSize: 14, fontWeight: 500, letterSpacing: '0.08em',
                  color: 'var(--on-inset)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}>
                  {sentence}
                  <span className="cursor" style={{
                    background: 'var(--accent)', width: 8, height: 14,
                  }} />
                </p>
              ) : (
                <p className="mono" style={{
                  fontSize: 12, color: 'var(--on-inset-mute)',
                  letterSpacing: '0.06em', lineHeight: 1,
                }}>
                  Your sentence appears here…
                </p>
              )}

              {/* Tiny corner brackets on the readout */}
              <span style={{ position: 'absolute', top: 4, left: 4, width: 6, height: 1, background: 'var(--on-inset-line)' }} />
              <span style={{ position: 'absolute', top: 4, left: 4, width: 1, height: 6, background: 'var(--on-inset-line)' }} />
              <span style={{ position: 'absolute', bottom: 4, right: 4, width: 6, height: 1, background: 'var(--on-inset-line)' }} />
              <span style={{ position: 'absolute', bottom: 4, right: 4, width: 1, height: 6, background: 'var(--on-inset-line)' }} />
            </div>
          </div>
        </div>

        {/* ── Action row ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={clearSentence}
            disabled={!sentence}
            className="btn btn-icon"
            title="Clear"
            aria-label="Clear"
          >
            <Trash2 size={14} strokeWidth={1.7} />
          </button>

          <button
            onClick={copySentence}
            disabled={!sentence}
            className="btn btn-icon"
            title="Copy"
            aria-label="Copy"
          >
            {copied
              ? <Check size={14} strokeWidth={1.8} style={{ color: 'var(--ok)' }} />
              : <Copy  size={14} strokeWidth={1.7} />}
          </button>

          <button
            onClick={sendSentence}
            disabled={!sentence.trim()}
            className={sentence.trim() ? 'btn btn-primary' : 'btn'}
            style={{ flex: 1 }}
          >
            <Send size={14} strokeWidth={1.8} />
            Speak &amp; Send
          </button>
        </div>
      </div>
    </div>
  )
}
