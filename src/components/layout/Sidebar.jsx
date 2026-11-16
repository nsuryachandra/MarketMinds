import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Loader2, MapPin, RefreshCw, X } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { navigation } from './navigation'
import { useMarket } from '../../context/MarketContext'
import { CategoryGlyph } from '../ui/CategoryGlyph'
import { Meter } from '../ui/Meter'
import { cn } from '../../lib/utils'






export function Sidebar({ open, onClose }) {
  const { category, locality } = useMarket()
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync, setLastSync] = useState('4 min ago')

  const refresh = () => {
    if (refreshing) return
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      setLastSync('just now')
    }, 1100)
  }

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
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-jade-700">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-jade-500" />
            Demo data
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <CategoryGlyph icon={category.icon} tint={category.tint} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-ink">{category.shortName}</p>
            <p className="flex items-center gap-1 truncate text-[10.5px] font-medium text-ink-mute">
              <MapPin className="h-2.5 w-2.5 text-brand-500" />
              {locality.name}, Hyderabad
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
        </div>
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
            <span className="text-[10.5px] font-bold text-ink-soft">Hyderabad coverage</span>
            <span className="tabular text-[10px] font-bold text-brand-700">86%</span>
          </div>
          <Meter value={86} tone="brand" height="xs" className="mt-1.5" />
          <p className="mt-1.5 text-[9.5px] font-medium leading-relaxed text-ink-faint">
            16 localities · 12 categories tracked
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl px-1 py-1.5">
          <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-ink-faint">
            <CheckCircle2 className="h-3 w-3 text-jade-600" />
            Synced {lastSync}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink-soft"
            aria-label="Refresh demo data"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-line/60 bg-white/55 p-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[10.5px] font-extrabold text-white"
            style={{
              background: 'linear-gradient(140deg, #6d6ae4, #35328c)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 10px -6px rgba(47,43,119,0.6)',
            }}
          >
            AM
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-bold text-ink">Aarav Mehta</p>
            <p className="truncate text-[9.5px] font-medium text-ink-faint">Analyst workspace</p>
          </div>
          <span className="rounded-md border border-line bg-white/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">
            Demo
          </span>
        </div>
      </div>
    </aside>
  )
}
