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
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 12,
      }}>
        <AlertCircle size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
        <p style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--amber)' }}>
          Speech input requires Chrome or Edge
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-secondary)',
        }}>
          Listener Reply
        </span>

        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: 8 }}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <span className="led led-green led-pulse" />
              <span style={{
                fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--green)',
              }}>
                Listening
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mic row ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

        {/* Circular mic button */}
        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{   scale: 0.92 }}
          onClick={handleToggle}
          className={isListening ? 'mic-ring' : 'neu'}
          style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
            background: isListening ? 'var(--green-dim)' : 'var(--base)',
            color: isListening ? 'var(--green)' : 'var(--text-secondary)',
            transition: 'background 0.25s ease, color 0.25s ease',
          }}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.span key="stop"
                initial={{ rotate: -20, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{    rotate:  20, opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ display: 'flex' }}
              >
                <MicOff size={22} />
              </motion.span>
            ) : (
              <motion.span key="start"
                initial={{ rotate: 20,  opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{    rotate: -20, opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ display: 'flex' }}
              >
                <Mic size={22} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Label + interim */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <p style={{
            fontSize: '0.86rem', fontWeight: 700,
            color: isListening ? 'var(--green)' : 'var(--text-primary)',
            lineHeight: 1, transition: 'color 0.2s ease',
          }}>
            {isListening ? 'Recording…' : 'Tap to reply by voice'}
          </p>

          {/* Interim transcript or label */}
          <AnimatePresence mode="wait">
            {isListening && interim ? (
              <motion.p
                key="interim"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0       }}
                style={{
                  fontSize: '0.76rem', color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                "{interim}"
              </motion.p>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
                         textTransform: 'uppercase', color: 'var(--text-muted)' }}
              >
                {isListening ? 'Tap again to stop' : 'Listener side · STT'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
