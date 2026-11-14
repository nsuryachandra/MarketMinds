import { cn } from '../../lib/utils'

const tones = {
  brand: 'bg-brand-600',
  sea: 'bg-sea-500',
  jade: 'bg-jade-500',
  gold: 'bg-gold-500',
  coral: 'bg-coral-500',
  ink: 'bg-ink',
}

interface MeterProps {
  value: number
  tone?: keyof typeof tones
  className?: string
  height?: 'xs' | 'sm' | 'md'
  trackClassName?: string
  gradient?: boolean
}

export function Meter({ value, tone = 'brand', className, height = 'sm', trackClassName, gradient }: MeterProps) {
  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' }
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-ink/[0.06]', heights[height], trackClassName, className)}>
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          gradient ? 'bg-gradient-to-r from-brand-600 to-sea-500' : tones[tone],
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
