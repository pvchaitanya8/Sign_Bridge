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
      <div className="skeu-chip" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 12,
        borderTopColor: 'rgba(251,191,36,0.38)',
        borderLeftColor: 'rgba(251,191,36,0.22)',
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
        <div className="skeu-chip" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
        }}>
          <Mic size={10} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-secondary)',
          }}>Listener Reply</span>
        </div>

        {/* Listening indicator — skeu chip with green accent */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, x: 8 }}
              animate={{ opacity: 1, scale: 1,    x: 0 }}
              exit={{    opacity: 0, scale: 0.85, x: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              className="skeu-chip"
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 12px',
                borderTopColor: 'rgba(52,211,153,0.45)',
                borderLeftColor: 'rgba(52,211,153,0.28)',
              }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

        {/* Mic button + ripple rings container */}
        <div style={{ position: 'relative', flexShrink: 0, width: 64, height: 64 }}>

          {/* Concentric ripple rings when listening */}
          <AnimatePresence>
            {isListening && ([0, 1] as const).map(i => (
              <motion.div
                key={i}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: i * 0.7,
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid var(--green)',
                  pointerEvents: 'none',
                }}
              />
            ))}
          </AnimatePresence>

          {/* Physical mic button — 3-D raised / pressed */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{   scale: 0.91 }}
            onClick={handleToggle}
            style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 1,
              background: isListening ? 'var(--btn-green-grad)' : 'var(--btn-grad)',
              color: isListening ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid',
              borderTopColor:    isListening ? 'rgba(80,245,185,0.80)' : 'var(--bevel-hi-btn)',
              borderLeftColor:   isListening ? 'rgba(60,225,160,0.55)' : 'var(--bevel-hi)',
              borderBottomColor: isListening ? 'rgba(4,96,68,0.90)'    : 'var(--bevel-lo)',
              borderRightColor:  isListening ? 'rgba(6,120,80,0.68)'   : 'rgba(0,0,0,0.42)',
              boxShadow: isListening ? 'var(--btn-green-shadow)' : 'var(--btn-shadow)',
              transition: 'background 0.3s ease, color 0.25s ease, box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
          >
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.span key="stop"
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{    scale: 0.5, opacity: 0 }} transition={{ duration: 0.18 }}
                  style={{ display: 'flex' }}
                >
                  <MicOff size={24} />
                </motion.span>
              ) : (
                <motion.span key="start"
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{    scale: 0.5, opacity: 0 }} transition={{ duration: 0.18 }}
                  style={{ display: 'flex' }}
                >
                  <Mic size={24} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Label + interim */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={isListening ? 'rec' : 'idle'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              style={{
                fontSize: '0.88rem', fontWeight: 700,
                color: isListening ? 'var(--green)' : 'var(--text-primary)',
                lineHeight: 1,
                textShadow: isListening ? '0 0 10px var(--green-glow)' : 'none',
              }}
            >
              {isListening ? 'Recording…' : 'Tap to reply by voice'}
            </motion.p>
          </AnimatePresence>

          {/* Interim transcript or hint */}
          <AnimatePresence mode="wait">
            {isListening && interim ? (
              <motion.div
                key="interim"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0       }}
                className="skeu-inset-sm"
                style={{ borderRadius: 8, padding: '4px 10px' }}
              >
                <p style={{
                  fontSize: '0.74rem', color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {interim}
                </p>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  fontSize: '0.61rem', fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                }}
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
