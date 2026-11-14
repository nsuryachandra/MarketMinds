import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type BadgeTone = 'brand' | 'sea' | 'jade' | 'gold' | 'coral' | 'neutral'

const tones: Record<BadgeTone, string> = {
  brand: 'border-brand-200/70 bg-brand-50 text-brand-800',
  sea: 'border-sea-200/70 bg-sea-50 text-sea-700',
  jade: 'border-jade-200/70 bg-jade-50 text-jade-700',
  gold: 'border-gold-200/70 bg-gold-50 text-gold-700',
  coral: 'border-coral-200/70 bg-coral-50 text-coral-700',
  neutral: 'border-line bg-white/60 text-ink-mute',
}

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
  dot?: boolean
}

export function Badge({ children, tone = 'neutral', className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
