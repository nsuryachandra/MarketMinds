import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'glass' | 'soft' | 'solid'
  interactive?: boolean
}

export function GlassPanel({
  tone = 'glass',
  interactive = false,
  className,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-3xl',
        tone === 'glass' && 'glass-panel',
        tone === 'soft' && 'glass-soft',
        tone === 'solid' && 'border border-line/80 bg-white shadow-soft',
        interactive &&
          'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
