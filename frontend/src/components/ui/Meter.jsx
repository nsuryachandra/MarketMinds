import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

const tones = {
  brand: 'bg-[#C8792C]',
  sea: 'bg-sea-500',
  jade: 'bg-jade-500',
  gold: 'bg-gold-500',
  coral: 'bg-coral-500',
  ink: 'bg-ink',
}

export function Meter({ value, tone = 'brand', className, height = 'sm', trackClassName, gradient }) {
  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' }
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-ink/[0.06]', heights[height], trackClassName, className)}>
      <motion.div
        className={cn(
          'h-full rounded-full',
          gradient ? 'bg-gradient-to-r from-[#C8792C] to-[#F4D9A0]' : tones[tone],
        )}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: 'spring', stiffness: 55, damping: 16 }}
      />
    </div>
  )
}
