import { cn } from '../../lib/utils'

export function LogoMark({ className }) {
  return (
    <div
      className={cn(
        'relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[12px]',
        className,
      )}
      style={{
        background: 'linear-gradient(145deg, #6d6ae4 0%, #4946b4 52%, #2f2b77 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -3px 6px rgba(24,21,65,0.35), 0 8px 16px -8px rgba(47,43,119,0.6)',
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
        <circle cx="24.6" cy="9" r="2.5" fill="#8FE3D6" />
        <circle cx="24.6" cy="9" r="4.6" stroke="rgba(143,227,214,0.35)" strokeWidth="1.1" />
      </svg>
      <span className="pointer-events-none absolute inset-x-1 top-0.5 h-2 rounded-full bg-white/20 blur-[3px]" />
    </div>
  )
}

export function Logo({ compact = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[17px] font-extrabold tracking-[-0.04em] text-ink">
            Market<span className="text-brand-700">Minds</span>
          </div>
          <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.22em] text-ink-faint">
            Market intelligence
          </div>
        </div>
      )}
    </div>
  )
}
