import { AlertTriangle, Loader2, RefreshCw, SearchX } from 'lucide-react'
import { cn } from '../../lib/utils'

export function LoadingBlock({ label = 'Loading live market data…', className }) {
  return (
    <div
      className={cn(
        'flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-line/60 bg-white/45 px-6 py-10 text-center',
        className,
      )}
      role="status"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700">
        <Loader2 className="h-4.5 w-4.5 animate-spin" />
      </span>
      <div>
        <p className="text-[12.5px] font-bold text-ink">{label}</p>
        <p className="mt-0.5 text-[11px] text-ink-faint">Calculated from the connected SQLite datasets.</p>
      </div>
    </div>
  )
}

export function ErrorBlock({
  error,
  onRetry,
  title = 'Live data could not be loaded',
  className,
}) {
  const message =
    error?.code === 'network_error'
      ? 'The frontend could not reach the FastAPI server. Start the backend and retry.'
      : error?.message || 'An unexpected API error occurred.'
  return (
    <div
      className={cn(
        'flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-coral-200/70 bg-coral-50/45 px-6 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-coral-200 bg-white/80 text-coral-700">
        <AlertTriangle className="h-4.5 w-4.5" />
      </span>
      <div className="max-w-md">
        <p className="text-[12.5px] font-bold text-ink">{title}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary h-9 px-3 text-[12px]">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyBlock({
  title = 'No data for this selection',
  description = 'Try another category, locality, or catchment radius.',
  icon: Icon = SearchX,
  className,
}) {
  return (
    <div
      className={cn(
        'flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border border-line/60 bg-white/40 px-6 py-8 text-center',
        className,
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/70 text-ink-faint">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[12.5px] font-bold text-ink">{title}</p>
      <p className="max-w-md text-[11.5px] leading-relaxed text-ink-mute">{description}</p>
    </div>
  )
}

export function InlineError({ error, onRetry, className }) {
  if (!error) return null
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-xl border border-coral-200/70 bg-coral-50/50 px-3 py-2 text-[11px] font-medium text-coral-800',
        className,
      )}
      role="alert"
    >
      <span>{error.message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-bold underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  )
}

export function SourceNote({ children, className }) {
  return (
    <p className={cn('text-[10.5px] font-medium leading-relaxed text-ink-faint', className)}>
      {children}
    </p>
  )
}
