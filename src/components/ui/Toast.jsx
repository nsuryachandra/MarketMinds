import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'






export function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onClose, 2800)
    return () => window.clearTimeout(timer)
  }, [message, onClose])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-5 z-[100] flex items-center gap-2.5 rounded-2xl border border-white/80 bg-[rgba(27,31,47,0.92)] px-4 py-3 text-[12.5px] font-semibold text-white shadow-lift backdrop-blur-xl"
        >
          <CheckCircle2 className="h-4 w-4 text-jade-200" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
