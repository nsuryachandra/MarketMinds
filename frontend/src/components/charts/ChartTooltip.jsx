import { cn } from '../../lib/utils'

















export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelSuffix,
  className,
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className={cn(
        'min-w-[148px] rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-lift',
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
        {label}
        {labelSuffix ? ` ${labelSuffix}` : ''}
      </p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry, index) => (
          <div key={`${entry.dataKey ?? entry.name}-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-mute">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: entry.color ?? '#C8792C' }}
              />
              {entry.name}
            </span>
            <span className="tabular text-[11.5px] font-bold text-ink">
              {typeof entry.value === 'number' && formatter
                ? formatter(entry.value, entry.name)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
