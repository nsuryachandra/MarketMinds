import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { allNavItems } from './navigation'

export function AppShell() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    const page = allNavItems.find((item) => item.to === location.pathname)
    document.title = page ? `${page.label} · MarketMinds` : 'MarketMinds'
  }, [location.pathname])

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((current) => !current)
      }
    }
    const openSearch = () => setSearchOpen(true)
    window.addEventListener('keydown', handler)
    window.addEventListener('marketminds:open-search', openSearch)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('marketminds:open-search', openSearch)
    }
  }, [])

  const closeSearch = useCallback(() => setSearchOpen(false), [])

  return (
    <div className="relative min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="relative z-10 min-h-screen lg:pl-[264px]">
        <Topbar onOpenMenu={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />

        <main className="mx-auto w-full max-w-[1560px] px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-7">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={closeSearch} />
    </div>
  )
}
