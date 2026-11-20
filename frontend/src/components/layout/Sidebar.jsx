import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, X } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { navigation } from './navigation'
import { useMarket } from '../../context/MarketContext'
import { cn } from '../../lib/utils'

export function Sidebar({ open, onClose }) {
  const { localities, categories } = useMarket()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-line bg-white transition-transform duration-300 ease-out lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
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

      <div className="mx-4 mb-5 flex items-center gap-2.5 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-[#C8792C]">
          <MapPin className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11.5px] font-bold text-ink">Hyderabad market</p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-ink-faint">
            {localities.length || '—'} localities · {categories.length || '—'} categories
          </p>
        </div>
      </div>

      <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-3">
        {navigation.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
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
                      'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[12.5px] font-semibold transition-colors duration-150',
                      isActive ? 'text-white' : 'text-ink-mute hover:bg-amber-50/60 hover:text-[#C8792C]',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="sidebarActiveBg"
                          className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#C8792C] to-[#B3631C] shadow-[0_4px_14px_-2px_rgba(200,121,44,0.42)]"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span
                        className={cn(
                          'relative z-10 -ml-1 mr-0.5 h-3.5 w-[2px] rounded-r bg-[#F4D9A0] transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <item.icon
                        className={cn(
                          'relative z-10 h-[17px] w-[17px] shrink-0 transition-colors',
                          isActive ? 'text-white' : 'text-ink-faint group-hover:text-[#C8792C]',
                        )}
                        strokeWidth={1.9}
                      />
                      <span className="relative z-10 flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="relative z-10 rounded border border-sea-200 bg-sea-50 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.06em] text-sea-700">
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
    </aside>
  )
}
