import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, AlertCircle } from 'lucide-react'
import { useSTT }   from '../hooks/useSpeech'

interface SpeechInputProps {
  onMessage: (text: string) => void
}

export function SpeechInput({ onMessage }: SpeechInputProps) {
  const { startListening, stopListening, isListening, interim, isSupported } = useSTT()

  const handleToggle = () =>
    isListening ? stopListening() : startListening(onMessage)

  if (!isSupported) {
    return (
      <div className="neu-inset-sm" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 12,
        color: 'var(--amber)',
      }}>
        <AlertCircle size={14} />
        <span className="label" style={{ color: 'var(--amber)' }}>
          Speech input requires Chrome or Edge
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="label">Listener Reply</span>
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: 8 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span className="led led-green led-pulse" />
              <span className="label" style={{ color: 'var(--green)', fontSize: '0.6rem' }}>
                Listening…
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Live interim transcript ─────────────────────── */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{    opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="neu-inset-sm" style={{
              padding: '8px 12px', borderRadius: 10,
              minHeight: 36,
              display: 'flex', alignItems: 'center',
            }}>
              {interim
                ? <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{interim}</p>
                : <p className="label" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Speak now…</p>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mic button ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Large raised circular mic button */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{   scale: 0.94 }}
          onClick={handleToggle}
          className={isListening ? 'mic-ring' : 'neu'}
          style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
            background: isListening ? 'var(--green-dim)' : 'var(--base)',
            color: isListening ? 'var(--green)' : 'var(--text-secondary)',
            transition: 'background 0.2s, color 0.2s',
          }}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.span key="stop"
                initial={{ rotate: -20, opacity: 0 }}
                animate={{ rotate: 0,   opacity: 1 }}
                exit={{    rotate:  20, opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex' }}
              >
                <MicOff size={20} />
              </motion.span>
            ) : (
              <motion.span key="start"
                initial={{ rotate: 20,  opacity: 0 }}
                animate={{ rotate: 0,   opacity: 1 }}
                exit={{    rotate: -20, opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex' }}
              >
                <Mic size={20} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Label */}
        <div>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
            {isListening ? 'Recording…' : 'Tap to reply by voice'}
          </p>
          <p className="label" style={{ marginTop: 4 }}>
            {isListening ? 'Tap again to stop' : 'Listener side · STT'}
          </p>
        </div>
      </div>

    </div>
  )
}
