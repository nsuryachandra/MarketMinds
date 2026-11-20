
import { cn } from '../../lib/utils'






export function GlassPanel({
  tone = 'glass',
  interactive = false,
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        'rounded-2xl',
        tone === 'glass' && 'glass-panel',
        tone === 'soft' && 'glass-soft',
        tone === 'solid' && 'border border-line bg-white shadow-soft',
        interactive &&
          'transition-all duration-200 hover:border-line-strong hover:shadow-soft',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
