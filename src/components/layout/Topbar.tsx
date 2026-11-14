import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Command,
  Menu,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Select } from '../ui/Select'
import { useMarket } from '../../context/MarketContext'
import { localities } from '../../data/localities'
import { allNavItems } from './navigation'
import { cn } from '../../lib/utils'

interface TopbarProps {
  onOpenMenu: () => void
  onOpenSearch: () => void
}

const competitionDot = (competition: number) =>
  competition >= 70 ? 'bg-coral-500' : competition >= 45 ? 'bg-gold-500' : 'bg-jade-500'

const initialNotifications = [
  {
    id: 'n1',
    icon: Sparkles,
    tone: 'text-brand-700 bg-brand-50 border-brand-100',
    title: 'Kokapet crossed the 85 opportunity threshold',
    detail: 'Grocery and everyday retail supply remains thin.',
    time: '2h ago',
    to: '/market-explorer',
    read: false,
  },
  {
    id: 'n2',
    icon: ShieldAlert,
    tone: 'text-coral-700 bg-coral-50 border-coral-100',
    title: 'Café competition elevated in Banjara Hills',
    detail: 'Three new openings detected in the last 90 days.',
    time: '5h ago',
    to: '/competitor-intelligence',
    read: false,
  },
  {
    id: 'n3',
    icon: TrendingUp,
    tone: 'text-sea-700 bg-sea-50 border-sea-100',
    title: 'Weekly market digest is ready',
    detail: 'Wellness and tech lead this week’s registration growth.',
    time: 'Yesterday',
    to: '/market-assistant',
    read: true,
  },
]

export function Topbar({ onOpenMenu, onOpenSearch }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { localityId, setLocalityId } = useMarket()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const currentPage = allNavItems.find((item) => item.to === location.pathname)
  const unread = notifications.filter((item) => !item.read).length

  useEffect(() => {
    if (!notificationsOpen) return
    const handleOutside = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [notificationsOpen])

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
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-jade-500" />
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Demo</span>
            <Select
              value={localityId}
              onChange={setLocalityId}
              size="sm"
              searchable
              ariaLabel="Analysis locality"
              searchPlaceholder="Find a locality…"
              className="w-[150px] xl:w-[172px]"
              buttonClassName="h-9 border-0 bg-transparent px-1.5 pr-2 shadow-none hover:bg-transparent focus-visible:ring-0"
              menuClassName="w-[252px]"
              options={localities.map((locality) => ({
                value: locality.id,
                label: locality.name,
                hint: `${locality.zone} · ${locality.businesses.toLocaleString('en-IN')} businesses`,
                icon: <span className={cn('h-1.5 w-1.5 rounded-full', competitionDot(locality.competition))} />,
              }))}
            />
          </div>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((current) => !current)}
              className={cn('icon-button relative h-9 w-9', notificationsOpen && 'border-brand-200 bg-white text-brand-700')}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral-500 text-[8px] font-extrabold text-white ring-2 ring-canvas">
                  {unread}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-11 w-[320px] overflow-hidden rounded-2xl border border-white/80 bg-[rgba(255,255,255,0.97)] shadow-lift backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
                  <div>
                    <p className="font-display text-[13px] font-extrabold text-ink">Notifications</p>
                    <p className="text-[10.5px] text-ink-faint">Signals from your workspace</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNotifications((current) => current.map((item) => ({ ...item, read: true })))
                    }
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 transition-colors hover:text-brand-900"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark read
                  </button>
                </div>
                <div className="p-1.5">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setNotifications((current) =>
                          current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
                        )
                        setNotificationsOpen(false)
                        navigate(item.to)
                      }}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-ink/[0.035]',
                        !item.read && 'bg-brand-50/40',
                      )}
                    >
                      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', item.tone)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[11.5px] font-bold leading-snug text-ink">{item.title}</span>
                          {!item.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] leading-relaxed text-ink-mute">{item.detail}</span>
                        <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                          {item.time}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-line/70 px-4 py-2.5 text-[9.5px] font-medium text-ink-faint">
                  Illustrative signals from demo market data.
                </div>
              </div>
            )}
          </div>

          <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[10.5px] font-extrabold text-white"
              style={{
                background: 'linear-gradient(140deg, #6d6ae4, #35328c)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 10px -6px rgba(47,43,119,0.6)',
              }}
            >
              AM
            </div>
            <div className="hidden leading-tight xl:block">
              <p className="text-[11.5px] font-bold text-ink">Aarav Mehta</p>
              <p className="text-[9.5px] font-medium text-ink-faint">Analyst</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
