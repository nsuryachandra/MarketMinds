import { AlertTriangle, Loader2, RefreshCw, SearchX } from 'lucide-react'
import { cn, humanizeMarketText } from '../../lib/utils'

function readableError(error) {
  if (error?.code === 'network_error') {
    return 'Market data could not be reached. Check your connection and try again.'
  }
  if (error?.code === 'ai_timeout') {
    return 'The assistant took too long to respond. Try a shorter question or retry.'
  }
  if (error?.code === 'ai_rate_limited') {
    return 'The assistant is busy right now. Try again in a moment.'
  }
  if (error?.code === 'ai_unavailable') {
    return 'The assistant is temporarily unavailable. Market analysis is still available.'
  }
  if (error?.message && !/fastapi|sqlite|nvidia|api key|backend|provider/i.test(error.message)) {
    return error.message
  }
  return 'Market analysis is temporarily unavailable. Please retry.'
}

export function LoadingBlock({ label = 'Preparing market analysis…', className }) {
  return (
    <div
      className={cn(
        'flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white px-6 py-10 text-center',
        className,
      )}
      role="status"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
      <div>
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-[11.5px] text-ink-faint">Using the latest available market data.</p>
      </div>
    </div>
  )
}

export function ErrorBlock({
  error,
  onRetry,
  title = 'Market data could not be loaded',
  className,
}) {
  return (
    <div
      className={cn(
        'flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-coral-200 bg-coral-50/60 px-6 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-coral-200 bg-white text-coral-700">
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div className="max-w-md">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">{readableError(error)}</p>
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
        'flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-line bg-[#FBFCFE] px-6 py-8 text-center',
        className,
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-faint">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="max-w-md text-[12px] leading-relaxed text-ink-mute">{description}</p>
    </div>
  )
}

export function InlineError({ error, onRetry, className }) {
  if (!error) return null
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-coral-200 bg-coral-50/70 px-3 py-2 text-[11.5px] font-medium text-coral-800',
        className,
      )}
      role="alert"
    >
      <span>{readableError(error)}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  )
}

export function SourceNote({ children, className }) {
  const text = typeof children === 'string' ? humanizeMarketText(children) : children
  return (
    <p className={cn('text-[11px] font-medium leading-relaxed text-ink-faint', className)}>
      {text}
    </p>
  )
}
