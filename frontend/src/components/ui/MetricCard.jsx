

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { GlassPanel } from './GlassPanel'
import { Sparkline } from './Sparkline'
import { cn } from '../../lib/utils'



const tileTone = {
  brand: 'text-brand-700 bg-brand-50',
  sea: 'text-sea-700 bg-sea-50',
  jade: 'text-jade-700 bg-jade-50',
  gold: 'text-gold-700 bg-gold-50',
  coral: 'text-coral-700 bg-coral-50',
}














export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  delta,
  deltaLabel = 'vs last month',
  deltaGood = true,
  spark,
  footnote,
  className,
}) {
  const positive = (delta ?? 0) >= 0
  const good = positive === deltaGood
  return (
    <GlassPanel className={cn('overflow-hidden p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label truncate">{label}</p>
          <p className="tabular mt-1.5 font-display text-[26px] font-bold leading-none tracking-[-0.04em] text-ink">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line',
            tileTone[tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>

      <div className="mt-3.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {typeof delta === 'number' ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold',
                  good ? 'bg-jade-50 text-jade-700' : 'bg-coral-50 text-coral-700',
                )}
              >
                {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
              <span className="text-[10.5px] font-medium text-ink-faint">{deltaLabel}</span>
            </div>
          ) : (
            <div className="text-[11px] font-medium text-ink-faint">{footnote}</div>
          )}
        </div>
        {spark && <Sparkline data={spark} tone={tone} className="h-8 w-[86px] shrink-0" />}
      </div>
    </GlassPanel>
  )
}
