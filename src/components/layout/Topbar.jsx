import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CheckCircle2,
  Command,
  Database,
  MapPin,
  Menu,
  Search,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { Select } from '../ui/Select'
import { useMarket } from '../../context/MarketContext'
import { allNavItems } from './navigation'
import { cn, formatNumber } from '../../lib/utils'

const statusTone = {
  ok: 'text-jade-700 bg-jade-50 border-jade-200/70',
  degraded: 'text-gold-700 bg-gold-50 border-gold-200/70',
  offline: 'text-coral-700 bg-coral-50 border-coral-200/70',
}

export function Topbar({ onOpenMenu, onOpenSearch }) {
  const location = useLocation()
  const {
    localities,
    localityId,
    setLocalityId,
    health,
    healthLoading,
    refreshHealth,
    metaLoading,
  } = useMarket()
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef(null)

  const currentPage = allNavItems.find((item) => item.to === location.pathname)
  const status = health?.status === 'ok' ? 'ok' : health ? 'degraded' : 'offline'
  const loadedSources = health?.sources?.loaded ?? 0
  const totalSources = health?.sources?.total ?? 0
  const businessCount = health?.table_counts?.businesses ?? 0
  const assistantConfigured = Boolean(health?.assistant?.configured)

  useEffect(() => {
    if (!statusOpen) return undefined
    const handleOutside = (event) => {
      if (!statusRef.current?.contains(event.target)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [statusOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-[rgba(246,242,234,0.78)] backdrop-blur-2xl">
      <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="icon-button h-9 w-9 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden min-w-0 sm:block">
          <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Workspace <span className="text-line-strong">/</span> Hyderabad
          </p>
          <p className="truncate font-display text-[13.5px] font-extrabold tracking-[-0.02em] text-ink">
            {currentPage?.label ?? 'Market workspace'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="group hidden h-9 w-[194px] items-center gap-2 rounded-xl border border-line/80 bg-white/55 px-3 text-left text-[12px] font-medium text-ink-faint transition-all hover:border-line-strong hover:bg-white/80 md:flex xl:w-[264px]"
          >
            <Search className="h-3.5 w-3.5 text-ink-faint group-hover:text-brand-600" />
            <span className="flex-1 truncate">Search market intelligence</span>
            <span className="flex items-center gap-0.5 rounded-md border border-line bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-ink-faint">
              <Command className="h-2.5 w-2.5" />K
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="icon-button h-9 w-9 md:hidden"
            aria-label="Search market intelligence"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="hidden items-center gap-1 rounded-xl border border-line/80 bg-white/55 pl-2.5 sm:flex">
            <MapPin className="h-3 w-3 text-brand-600" />
            <Select
              value={localityId ?? undefined}
              onChange={setLocalityId}
              size="sm"
              searchable
              ariaLabel="Analysis locality"
              searchPlaceholder={metaLoading ? 'Loading localities…' : 'Find a locality…'}
              placeholder={metaLoading ? 'Loading…' : 'Locality'}
              className="w-[158px] xl:w-[178px]"
              buttonClassName="h-9 border-0 bg-transparent px-1.5 pr-2 shadow-none hover:bg-transparent focus-visible:ring-0"
              menuClassName="w-[252px]"
              options={localities.map((locality) => ({
                value: locality.id,
                label: locality.name,
                hint: `${locality.zone} · approximate centre`,
              }))}
            />
          </div>

          <div ref={statusRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setStatusOpen((current) => !current)
                if (!statusOpen) refreshHealth()
              }}
              className={cn(
                'icon-button relative h-9 gap-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.06em]',
                statusOpen && 'border-brand-200 bg-white text-brand-700',
              )}
              aria-label="API status"
              aria-expanded={statusOpen}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  status === 'ok'
                    ? 'bg-jade-500'
                    : status === 'degraded'
                      ? 'bg-gold-500'
                      : 'bg-coral-500',
                )}
              />
              <span className="hidden md:inline">
                {healthLoading ? 'Checking' : status === 'ok' ? 'API live' : 'API issue'}
              </span>
              <Database className="h-3.5 w-3.5 md:hidden" />
            </button>

            {statusOpen && (
              <div className="absolute right-0 top-11 w-[310px] overflow-hidden rounded-2xl border border-white/80 bg-[rgba(255,255,255,0.97)] shadow-lift backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-3">
                  <div>
                    <p className="font-display text-[13px] font-extrabold text-ink">Live API status</p>
                    <p className="text-[10.5px] text-ink-faint">FastAPI · SQLite · OpenStreetMap</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]',
                      statusTone[status],
                    )}
                  >
                    {status === 'ok' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <TriangleAlert className="h-3 w-3" />
                    )}
                    {status === 'ok' ? 'Connected' : status === 'degraded' ? 'Partial' : 'Offline'}
                  </span>
                </div>
                <div className="space-y-2.5 p-4 text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-mute">Sources loaded</span>
                    <span className="tabular font-bold text-ink">
                      {loadedSources}/{totalSources}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-mute">Mapped businesses</span>
                    <span className="tabular font-bold text-ink">{formatNumber(businessCount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-mute">Database ready</span>
                    <span className="font-bold text-ink">{health?.database_ready ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-mute">NVIDIA assistant</span>
                    <span className="inline-flex items-center gap-1 font-bold text-ink">
                      <Sparkles className="h-3 w-3 text-brand-600" />
                      {assistantConfigured ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                  {health?.sources?.failed > 0 && (
                    <p className="rounded-lg border border-gold-200/70 bg-gold-50/60 px-2.5 py-2 text-[10px] font-medium leading-relaxed text-gold-800">
                      {health.sources.failed} source(s) reported a failed latest import.
                    </p>
                  )}
                </div>
                <div className="border-t border-line/70 px-4 py-2.5 text-[9.5px] font-medium leading-relaxed text-ink-faint">
                  Mapped POIs are community data, not a verified business register.
                </div>
              </div>
            )}
          </div>

          <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

          <div className="hidden items-center gap-2 rounded-xl border border-line/70 bg-white/55 px-2.5 py-1.5 lg:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Database className="h-3.5 w-3.5" />
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">Local session</p>
              <p className="text-[10.5px] font-semibold text-ink">No account required</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
