
import { cn } from '../../lib/utils'















export function SegmentedControl({ value, onChange, options, className, size = 'md' }) {
  return (
    <div
      className={cn(
        'glass-inset inline-flex items-center gap-0.5 rounded-xl p-1',
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-all duration-200',
              size === 'md' ? 'h-8 px-3 text-[12px]' : 'h-7 px-2.5 text-[11px]',
              active
                ? 'bg-white text-ink shadow-[0_1px_2px_rgba(27,31,47,0.06),0_4px_10px_-6px_rgba(27,31,47,0.24)]'
                : 'text-ink-mute hover:text-ink-soft',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
