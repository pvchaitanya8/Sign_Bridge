import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, AlertCircle } from 'lucide-react'
import { cn }       from '../lib/utils'
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
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl glass text-amber-400/80 text-xs">
        <AlertCircle size={14} /> Speech input requires Chrome or Edge
      </div>
    )
  }

  return (
    <div className="space-y-2">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Listener Reply
        </h2>
        <AnimatePresence>
          {isListening && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: 8 }}
              className="flex items-center gap-1.5 text-[10px] text-emerald-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Listening…
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Live interim transcript */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{    opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-xl px-3 py-2.5 text-sm text-slate-300 italic min-h-[2.5rem] flex items-center">
              {interim || <span className="text-slate-600">Speak now…</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{   scale: 0.96 }}
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isListening
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 mic-active'
            : 'glass text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]',
        )}
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.span key="stop"
              initial={{ rotate: -10, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              className="flex items-center gap-2"
            >
              <MicOff size={15} /> Stop recording
            </motion.span>
          ) : (
            <motion.span key="start"
              initial={{ rotate: 10, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              className="flex items-center gap-2"
            >
              <Mic size={15} /> Tap to reply by voice
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

    </div>
  )
}
