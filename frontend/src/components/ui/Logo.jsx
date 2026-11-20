import { cn } from '../../lib/utils'

export function LogoMark({ className }) {
  return (
    <div
      className={cn(
        'relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px]',
        className,
      )}
      style={{
        background: 'linear-gradient(145deg, #6366F1 0%, #4F46E5 48%, #3730A3 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 12px -8px rgba(67,56,202,0.6)',
      }}
    >
      <svg viewBox="0 0 32 32" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
        <path
          d="M6 22.5L11.4 16.2L15.8 19.4L23.2 10.4"
          stroke="white"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24.6" cy="9" r="2.5" fill="#99F6E4" />
        <circle cx="24.6" cy="9" r="4.6" stroke="rgba(153,246,228,0.35)" strokeWidth="1.1" />
      </svg>
    </div>
  )
}

export function Logo({ compact = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[17px] font-bold tracking-[-0.045em] text-ink">
            Market<span className="text-brand-700">Minds</span>
          </div>
          <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            Market intelligence
          </div>
        </div>
      )}
    </div>
  )
}
