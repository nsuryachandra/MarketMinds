
import { MapPin } from 'lucide-react'
import { cn } from '../../lib/utils'










export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  location,
  className,
}) {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          {eyebrow && <span className="label">{eyebrow}</span>}
          {location && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-ink-faint">
              <MapPin className="h-3 w-3 text-brand-600" />
              {location}
            </span>
          )}
        </div>
        <h1 className="font-display text-[25px] font-bold leading-[1.15] tracking-[-0.04em] text-ink sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[660px] text-[13px] leading-relaxed text-ink-mute">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
