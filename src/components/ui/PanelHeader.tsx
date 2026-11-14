import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PanelHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function PanelHeader({ title, description, eyebrow, icon: Icon, action, className }: PanelHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-white/70 text-brand-700">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="label mb-1">{eyebrow}</p>}
          <h2 className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-mute">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
