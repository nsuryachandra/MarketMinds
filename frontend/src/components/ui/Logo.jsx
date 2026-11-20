import { cn } from '../../lib/utils'

export function LogoMark({ className }) {
  return (
    <img
      src="/brand-mark.png"
      alt="MarketMinds"
      className={cn('h-8 w-8 shrink-0 rounded-lg object-contain shadow-xs', className)}
    />
  )
}

export function Logo({ compact = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[16.5px] font-bold tracking-[-0.035em] text-[#141416]">
            Market<span className="text-[#C8792C]">Minds</span>
          </div>
          <div className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#71717A]">
            Spatial Intelligence
          </div>
        </div>
      )}
    </div>
  )
}
