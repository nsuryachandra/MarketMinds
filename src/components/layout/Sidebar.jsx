import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  Database,
  Loader2,
  MapPin,
  RefreshCw,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { navigation } from './navigation'
import { useMarket } from '../../context/MarketContext'
import { CategoryGlyph } from '../ui/CategoryGlyph'
import { Meter } from '../ui/Meter'
import { cn, formatNumber } from '../../lib/utils'

export function Sidebar({ open, onClose }) {
  const {
    category,
    locality,
    business,
    isBusinessMode,
    health,
    healthLoading,
    refreshHealth,
    localities,
    categories,
    metaLoading,
    metaError,
  } = useMarket()
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refreshHealth()
    } finally {
      setRefreshing(false)
    }
  }

  const loadedSources = health?.sources?.loaded ?? 0
  const totalSources = health?.sources?.total ?? 0
  const coverage = totalSources ? (loadedSources / totalSources) * 100 : 0
  const status = health?.status === 'ok' ? 'live' : health ? 'partial' : 'offline'
  const contextLabel = isBusinessMode ? business?.name : category?.shortName ?? category?.name
  const contextDetail = isBusinessMode
    ? `${business?.category?.name ?? category?.name ?? 'Mapped business'} · ${
        business?.nearest_locality?.name ?? locality?.name ?? 'Hyderabad'
      }`
    : locality
      ? `${locality.name}, Hyderabad`
      : 'Waiting for API metadata'

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-line/70 bg-[linear-gradient(175deg,rgba(255,255,255,0.92),rgba(251,248,242,0.88))] shadow-[8px_0_32px_-28px_rgba(27,31,47,0.35)] backdrop-blur-2xl transition-transform duration-300 ease-out lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <NavLink to="/" aria-label="MarketMinds home">
          <Logo />
        </NavLink>
        <button
          type="button"
          onClick={onClose}
          className="icon-button h-8 w-8 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-4 mb-4 rounded-2xl border border-line/70 bg-white/55 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="flex items-center justify-between">
          <span className="label">Analysis context</span>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.08em]',
              status === 'live' ? 'text-jade-700' : status === 'partial' ? 'text-gold-700' : 'text-coral-700',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                status === 'live'
                  ? 'animate-pulse-soft bg-jade-500'
                  : status === 'partial'
                    ? 'bg-gold-500'
                    : 'bg-coral-500',
              )}
            />
            {status === 'live' ? 'Live data' : status === 'partial' ? 'Partial data' : 'API offline'}
          </span>
        </div>
        {metaLoading ? (
          <div className="mt-2 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-white/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
            </span>
            <div className="space-y-1.5">
              <span className="block h-2.5 w-24 animate-pulse rounded bg-ink/10" />
              <span className="block h-2 w-32 animate-pulse rounded bg-ink/5" />
            </div>
          </div>
        ) : metaError ? (
          <button
            type="button"
            onClick={refresh}
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-coral-200/70 bg-coral-50/50 px-2.5 py-2 text-left text-[10.5px] font-semibold text-coral-800"
          >
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            Metadata unavailable. Retry API status.
          </button>
        ) : (
          <div className="mt-2 flex items-center gap-2.5">
            <CategoryGlyph
              icon={isBusinessMode ? category?.icon ?? 'coffee' : category?.icon}
              tint={category?.tint ?? 'slate'}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-ink">{contextLabel ?? 'No selection'}</p>
              <p className="flex items-center gap-1 truncate text-[10.5px] font-medium text-ink-mute">
                <MapPin className="h-2.5 w-2.5 shrink-0 text-brand-500" />
                {contextDetail}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
          </div>
        )}
      </div>

      <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-2">
        {navigation.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[12.5px] font-semibold transition-all duration-200',
                      isActive
                        ? 'border border-brand-100/80 bg-[linear-gradient(100deg,rgba(232,231,251,0.9),rgba(255,255,255,0.6))] text-brand-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_-14px_rgba(59,55,149,0.6)]'
                        : 'border border-transparent text-ink-mute hover:bg-ink/[0.035] hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-500 to-sea-500" />
                      )}
                      <item.icon
                        className={cn(
                          'h-[17px] w-[17px] shrink-0 transition-colors',
                          isActive ? 'text-brand-700' : 'text-ink-faint group-hover:text-ink-mute',
                        )}
                        strokeWidth={1.9}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-md border border-sea-200/60 bg-sea-50 px-1.5 py-0.5 text-[8px] font-extrabold tracking-[0.08em] text-sea-700">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line/60 px-4 pb-4 pt-3.5">
        <div className="rounded-2xl border border-white/80 bg-[linear-gradient(150deg,rgba(255,255,255,0.8),rgba(244,241,251,0.65))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-ink-soft">Data sources ready</span>
            <span className="tabular text-[10px] font-bold text-brand-700">
              {loadedSources}/{totalSources || '—'}
            </span>
          </div>
          <Meter value={coverage} tone="brand" height="xs" className="mt-1.5" />
          <p className="mt-1.5 text-[9.5px] font-medium leading-relaxed text-ink-faint">
            {formatNumber(health?.table_counts?.businesses ?? 0)} mapped POIs ·{' '}
            {localities.length} localities · {categories.length} categories
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl px-1 py-1.5">
          <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-ink-faint">
            {status === 'live' ? (
              <CheckCircle2 className="h-3 w-3 text-jade-600" />
            ) : (
              <TriangleAlert className="h-3 w-3 text-gold-600" />
            )}
            {healthLoading ? 'Checking API…' : status === 'live' ? 'API connected' : 'API needs attention'}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink-soft"
            aria-label="Refresh API status"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-line/60 bg-white/55 p-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Database className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10.5px] font-bold text-ink">Local SQLite workspace</p>
            <p className="truncate text-[9.5px] font-medium text-ink-faint">
              OSM · GHMC · UDISE+ · Metro · Trends
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
