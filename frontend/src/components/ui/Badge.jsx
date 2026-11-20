
import { cn } from '../../lib/utils'



const tones = {
  brand: 'border-brand-200 bg-brand-50 text-brand-800',
  sea: 'border-sea-200 bg-sea-50 text-sea-700',
  jade: 'border-jade-200 bg-jade-50 text-jade-700',
  gold: 'border-gold-200 bg-gold-50 text-gold-700',
  coral: 'border-coral-200 bg-coral-50 text-coral-700',
  neutral: 'border-line bg-[#F8FAFC] text-ink-mute',
}








export function Badge({ children, tone = 'neutral', className, dot = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
