import React                       from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, Square, AlertCircle } from 'lucide-react'
import { useSTT } from '../hooks/useSpeech'

interface SpeechInputProps {
  onMessage: (text: string) => void
}

const METER_BARS = 16

export function SpeechInput({ onMessage }: SpeechInputProps) {
  const { startListening, stopListening, isListening, interim, isSupported, audioLevel } = useSTT()

  const handleToggle = () =>
    isListening ? stopListening() : startListening(onMessage)

  /**
   * Inline style applied ONLY while recording so the mic button pulses
   * with the user's actual voice amplitude (0–1 RMS from Web Audio API).
   * - scale: grows up to 18 % at peak voice level (conversational = ~0.4–0.7)
   * - filter: drop-shadow glow whose radius & opacity track amplitude
   * When recording stops the inline style is removed and the CSS class
   * transition springs the button smoothly back to rest.
   */
  const micPulseStyle: React.CSSProperties | undefined = isListening
    ? {
        transform: `scale(${(1 + audioLevel * 0.18).toFixed(3)})`,
        filter: audioLevel > 0.02
          ? `drop-shadow(0 0 ${(audioLevel * 14).toFixed(1)}px rgba(215, 42, 56, ${Math.min(0.25 + audioLevel * 0.55, 0.80).toFixed(2)}))`
          : 'none',
        transition: 'transform 90ms ease-out, filter 90ms ease-out',
      }
    : undefined

  if (!isSupported) {
    return (
      <div>
        <div className="bar">
          <span>LISTENER REPLY</span>
        </div>
        <div style={{
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle size={14} strokeWidth={1.7} style={{ color: 'var(--warn)', flexShrink: 0 }} />
          <p className="mono" style={{
            fontSize: 11, color: 'var(--warn)',
            letterSpacing: '0.06em',
          }}>
            Speech input requires Chrome or Edge
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>

      {/* ── Section bar ─────────────────────────────────── */}
      <div className="bar">
        <div className="bar-section">
          <span>LISTENER REPLY</span>
          <span style={{ opacity: 0.55 }}>STT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={isListening ? 'led led-accent led-blink' : 'led led-off'} />
          <span style={{
            fontSize: 10, letterSpacing: '0.18em',
            color: isListening ? 'var(--accent)' : 'rgba(236, 235, 229, 0.55)',
          }}>
            {isListening ? 'RECORDING' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* ── Mic row ─────────────────────────────────────── */}
      <div style={{
        padding: '18px 16px',
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <button
          onClick={handleToggle}
          className={isListening ? 'btn-circle btn-circle-active' : 'btn-circle'}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
          style={micPulseStyle}
        >
          {isListening
            ? <Square size={18} strokeWidth={1.8} fill="currentColor" />
            : <Mic    size={22} strokeWidth={1.8} />}
        </button>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <p style={{
              fontSize: 14, fontWeight: 600,
              color: isListening ? 'var(--accent)' : 'var(--ink)',
              letterSpacing: '0.01em', lineHeight: 1,
            }}>
              {isListening ? 'Recording…' : 'Tap to reply by voice'}
            </p>

            {/* Level meter — animated bars only when recording */}
            <div className={`meter ${isListening ? 'meter-active' : ''}`}>
              {Array.from({ length: METER_BARS }).map((_, i) => {
                const baseHeight = 30 + ((i * 37) % 70)
                return (
                  <span
                    key={i}
                    style={{
                      height: isListening ? undefined : `${baseHeight}%`,
                      animation: isListening
                        ? `meter-bounce ${0.42 + (i % 5) * 0.10}s ease-in-out ${i * 0.06}s infinite`
                        : 'none',
                    }}
                  />
                )
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isListening && interim ? (
              <motion.div
                key="interim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{    opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="panel-inset"
                style={{
                  padding: '6px 10px',
                  overflow: 'hidden',
                }}
              >
                <p className="mono" style={{
                  fontSize: 11, color: 'var(--on-inset)',
                  letterSpacing: '0.04em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}>
                  {interim}
                </p>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="label"
                style={{ fontSize: 10 }}
              >
                {isListening
                  ? '> tap stop when finished · auto-detects pause'
                  : 'STT · listener side · english (US)'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
