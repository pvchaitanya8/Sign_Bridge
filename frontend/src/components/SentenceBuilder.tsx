/**
 * SentenceBuilder.tsx
 * --------------------
 * Converts a stream of per-frame predictions into a sentence.
 *
 * Hold-to-confirm mechanic:
 *   - User holds a sign steady for HOLD_MS (1.5s) → letter confirmed
 *   - If the detected letter changes before time is up → timer resets
 *   - "del" held → deletes the last character
 *   - "space" held → inserts a space
 *   - A progress ring fills up to show how long the sign has been held
 *
 * Why hold-to-confirm instead of instant?
 *   Without it, a brief flicker to a neighbouring letter would type it.
 *   1.5s feels natural — it's how long you'd hold a key on a keyboard.
 *
 * React concepts used:
 *   - useRef for timers (clearTimeout/clearInterval) — refs survive
 *     re-renders without causing them, perfect for side-effect handles
 *   - useEffect with [prediction?.letter] dependency — runs only when
 *     the LETTER changes, not on every confidence fluctuation
 */

import { useState, useEffect, useRef } from 'react'
import { Trash2, Copy, Check, Volume2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Prediction } from '../types'

interface SentenceBuilderProps {
  prediction: Prediction | null
  onSend:     (text: string) => void   // fires when user hits "Speak & Send"
}

const HOLD_MS         = 1500   // ms to hold a sign before it's confirmed
const MIN_CONFIDENCE  = 0.45   // below this we ignore the prediction
const RING_RADIUS     = 28     // SVG circle radius (px)
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function SentenceBuilder({ prediction, onSend }: SentenceBuilderProps) {
  const [sentence, setSentence]           = useState('')
  const [pendingLetter, setPendingLetter] = useState<string | null>(null)
  const [progress, setProgress]           = useState(0)   // 0 → 1
  const [copied, setCopied]               = useState(false)

  const holdTimeout     = useRef<number | null>(null)
  const progressInterval= useRef<number | null>(null)
  const holdStartRef    = useRef<number>(0)

  // Clear timers helper
  const clearTimers = () => {
    if (holdTimeout.current)      window.clearTimeout(holdTimeout.current)
    if (progressInterval.current) window.clearInterval(progressInterval.current)
  }

  // ── Core hold-to-confirm logic ─────────────────────────────────────────────
  useEffect(() => {
    const letter      = prediction?.letter ?? null
    const confidence  = prediction?.confidence ?? 0

    // No hand or low confidence → reset everything
    if (!letter || confidence < MIN_CONFIDENCE) {
      clearTimers()
      setPendingLetter(null)
      setProgress(0)
      return
    }

    // Same letter still being held → do nothing, timers are already running
    if (letter === pendingLetter) return

    // New letter detected → cancel old timers, start fresh
    clearTimers()
    setPendingLetter(letter)
    setProgress(0)
    holdStartRef.current = Date.now()

    // Animate the progress ring
    progressInterval.current = window.setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current
      setProgress(Math.min(elapsed / HOLD_MS, 1))
    }, 30)   // ~33fps for smooth ring animation

    // Confirm the letter after HOLD_MS
    holdTimeout.current = window.setTimeout(() => {
      window.clearInterval(progressInterval.current!)
      setProgress(0)
      setPendingLetter(null)

      setSentence(prev => {
        if (letter === 'del')   return prev.slice(0, -1)
        if (letter === 'space') return prev + ' '
        return prev + letter
      })
    }, HOLD_MS)

    // Cleanup if letter changes before timer fires
    return () => clearTimers()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction?.letter, prediction ? prediction.confidence >= MIN_CONFIDENCE : false])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clearSentence = () => {
    clearTimers()
    setSentence('')
    setPendingLetter(null)
    setProgress(0)
  }

  const copySentence = async () => {
    if (!sentence) return
    await navigator.clipboard.writeText(sentence)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendSentence = () => {
    if (!sentence.trim()) return
    onSend(sentence.trim())
    clearSentence()
  }

  // SVG ring offset — 0 progress = full gap, 1 progress = full ring
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress)

  // Human-readable label for special signs
  const displayLetter = (l: string) =>
    l === 'space' ? 'SPACE' : l === 'del' ? 'DEL' : l

  const ringColour = pendingLetter === 'del'
    ? '#f87171'    // red for delete
    : pendingLetter === 'space'
      ? '#34d399'  // green for space
      : '#818cf8'  // indigo for letters

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Sentence Builder
        </h2>
        <span className="text-xs text-slate-500">
          Hold sign for 1.5s to confirm
        </span>
      </div>

      {/* ── Progress ring + pending letter ─────────────────── */}
      <div className="flex flex-col items-center justify-center gap-3 py-4">
        <div className="relative w-20 h-20">
          {/* Background ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={RING_RADIUS}
              fill="none" stroke="#1e1e2e" strokeWidth="5" />
            {/* Progress ring */}
            <circle cx="32" cy="32" r={RING_RADIUS}
              fill="none"
              stroke={ringColour}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              className="transition-all duration-75"
            />
          </svg>
          {/* Letter in the centre */}
          <div className="absolute inset-0 flex items-center justify-center">
            {pendingLetter ? (
              <span className="text-2xl font-bold text-white">
                {pendingLetter === 'space' ? '⎵' : pendingLetter === 'del' ? '⌫' : pendingLetter}
              </span>
            ) : (
              <span className="text-slate-600 text-sm">—</span>
            )}
          </div>
        </div>

        {/* Status text below ring */}
        <p className="text-xs text-slate-500 h-4">
          {pendingLetter
            ? `Hold "${displayLetter(pendingLetter)}" for ${((1 - progress) * HOLD_MS / 1000).toFixed(1)}s more…`
            : 'Waiting for sign…'}
        </p>
      </div>

      {/* ── Sentence display ───────────────────────────────── */}
      <div className="flex-1 rounded-2xl bg-[#1a1a2e] p-4 flex flex-col gap-3 min-h-0">
        <div className="flex-1 overflow-y-auto">
          {sentence ? (
            <p className="text-2xl font-medium text-white tracking-wide break-words leading-relaxed">
              {sentence}
              {/* Blinking cursor */}
              <span className="inline-block w-0.5 h-6 bg-indigo-400 ml-1 animate-pulse align-middle" />
            </p>
          ) : (
            <p className="text-slate-600 text-sm italic">
              Your sentence will appear here as you sign…
            </p>
          )}
        </div>

        {/* Character count */}
        <div className="text-xs text-slate-600 text-right">
          {sentence.length} characters
        </div>
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={clearSentence}
          disabled={!sentence}
          className={cn(
            'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            sentence
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed',
          )}
        >
          <Trash2 size={15} />
        </button>

        <button
          onClick={copySentence}
          disabled={!sentence}
          className={cn(
            'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            sentence
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed',
          )}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>

        {/* Primary action — speak the sentence and add to transcript */}
        <button
          onClick={sendSentence}
          disabled={!sentence.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            sentence.trim()
              ? 'bg-indigo-600 text-white hover:bg-indigo-500'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed',
          )}
        >
          <Volume2 size={15} /> Speak &amp; Send
        </button>
      </div>
    </div>
  )
}
