import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  Command,
  MapPin,
  Menu,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react'
import { Select } from '../ui/Select'
import { useMarket } from '../../context/MarketContext'
import { allNavItems } from './navigation'
import { cn } from '../../lib/utils'

function radiusLabel(value) {
  if (!value) return ''
  return `${Number((value / 1000).toFixed(1))} km`
}

function ContextTrigger({ onOpen, open, category, locality, business, radius, isBusinessMode, triggerRef }) {
  const title = isBusinessMode ? business?.name : category?.shortName ?? category?.name
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onOpen}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={`Change analysis context: ${title || 'market analysis'}`}
      className={cn(
        'group flex min-w-0 items-center gap-2.5 rounded-lg border border-line bg-white p-2 text-left transition-all duration-200 hover:border-line-strong hover:shadow-soft sm:px-3 sm:py-1.5',
        open && 'border-blue-400 bg-blue-50/50 ring-4 ring-blue-500/10',
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-amber-50/70 text-[#C8792C]">
        {isBusinessMode ? <Store className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
      </span>
      <span className="hidden min-w-0 leading-tight sm:block">
        <span className="block max-w-[150px] truncate text-[12px] font-bold text-ink xl:max-w-[210px]">
          {title || 'Loading context'}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-semibold text-ink-faint">
          {locality?.name ?? 'Hyderabad'} · {radiusLabel(radius)} catchment
        </span>
      </span>
      <span className="max-w-[88px] truncate text-[11px] font-bold text-ink sm:hidden">
        {title || 'Context'}
      </span>
      <ChevronDown
        className={cn(
          'ml-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-200 sm:block',
          open && 'rotate-180 text-[#C8792C]',
        )}
      />
    </button>
  )
}

function AnalysisPopover({
  categories,
  localities,
  categoryId,
  localityId,
  radius,
  radiusOptions,
  category,
  business,
  isBusinessMode,
  setCategoryId,
  setLocalityId,
  setRadius,
  clearBusiness,
}) {
  return (
    <div
      role="dialog"
      aria-label="Change analysis context"
      className="fixed left-3 right-3 top-[72px] z-[70] max-h-[calc(100dvh-84px)] w-auto overflow-y-auto scroll-slim rounded-2xl border border-line bg-white shadow-lift sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+9px)] sm:w-[370px]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div>
          <p className="font-display text-[14px] font-bold text-ink">Analysis context</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">
            Updates every workspace page at once.
          </p>
        </div>
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-900">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="space-y-4 p-4">
        {isBusinessMode && business && (
          <div className="flex items-start gap-2.5 rounded-lg border border-sea-200 bg-sea-50/70 p-2.5">
            <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sea-700" />
            <div className="min-w-0 flex-1">
              <p className="label text-sea-700">Focused business</p>
              <p className="truncate text-[12px] font-semibold text-ink">{business.name}</p>
            </div>
            <button
              type="button"
              onClick={clearBusiness}
              className="icon-button h-6 w-6 border-sea-200 bg-white text-sea-700"
              aria-label="Clear business focus"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div>
          <label className="label mb-1.5 block">Business category</label>
          <Select
            value={categoryId ?? undefined}
            onChange={setCategoryId}
            searchable
            ariaLabel="Business category"
            searchPlaceholder="Find a category…"
            options={categories.map((item) => ({
              value: item.id,
              label: item.name,
              hint: item.short_description ?? item.description,
            }))}
          />
        </div>

        <div>
          <label className="label mb-1.5 block">Hyderabad locality</label>
          <Select
            value={localityId ?? undefined}
            onChange={setLocalityId}
            searchable
            ariaLabel="Hyderabad locality"
            searchPlaceholder="Find a locality…"
            options={localities.map((item) => ({
              value: item.id,
              label: item.name,
              hint: item.zone,
            }))}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label">Analysis radius</label>
            <span className="text-[10.5px] font-semibold text-ink-faint">
              {radiusLabel(radius)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {radiusOptions.map((option) => {
              const selected = option === radius
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRadius(option)}
                  className={cn(
                    'flex h-8 items-center justify-center gap-1 rounded-lg border text-[11px] font-semibold transition-all',
                    selected
                      ? 'border-[#C8792C] bg-[#C8792C] text-white shadow-xs'
                      : 'border-line bg-white text-ink-mute hover:border-line-strong hover:text-ink',
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {radiusLabel(option)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg bg-[#F8FAFC] px-3 py-2.5">
          <p className="text-[10.5px] leading-relaxed text-ink-mute">
            Showing{' '}
            <span className="font-semibold text-ink-soft">
              {category?.name ?? 'market data'}
            </span>{' '}
            around{' '}
            <span className="font-semibold text-ink-soft">{localityId ? 'the selected locality' : 'Hyderabad'}</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

export function Topbar({ onOpenMenu, onOpenSearch }) {
  const location = useLocation()
  const {
    localities,
    categories,
    categoryId,
    localityId,
    radius,
    radiusOptions,
    category,
    locality,
    business,
    isBusinessMode,
    setCategoryId,
    setLocalityId,
    setRadius,
    clearBusiness,
  } = useMarket()
  const [contextOpen, setContextOpen] = useState(false)
  const contextRef = useRef(null)
  const triggerRef = useRef(null)

  const currentPage = allNavItems.find((item) => item.to === location.pathname)

  useEffect(() => {
    setContextOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!contextOpen) return undefined
    const handleOutside = (event) => {
      if (!contextRef.current?.contains(event.target)) setContextOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setContextOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [contextOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-xl">
      <div className="flex h-[64px] items-center gap-2.5 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="icon-button h-9 w-9 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden min-w-0 lg:block">
          <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Workspace <span className="text-line-strong">/</span> Hyderabad
          </p>
          <p className="truncate font-display text-[13.5px] font-bold tracking-[-0.02em] text-ink">
            {currentPage?.label ?? 'Market workspace'}
          </p>
        </div>

        <div ref={contextRef} className="relative ml-1 min-w-0 lg:ml-2">
          <ContextTrigger
            triggerRef={triggerRef}
            onOpen={() => setContextOpen((current) => !current)}
            open={contextOpen}
            category={category}
            locality={locality}
            business={business}
            radius={radius}
            isBusinessMode={isBusinessMode}
          />
          {contextOpen && (
            <AnalysisPopover
              categories={categories}
              localities={localities}
              categoryId={categoryId}
              localityId={localityId}
              radius={radius}
              radiusOptions={radiusOptions}
              category={category}
              business={business}
              isBusinessMode={isBusinessMode}
              setCategoryId={setCategoryId}
              setLocalityId={setLocalityId}
              setRadius={setRadius}
              clearBusiness={clearBusiness}
            />
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="group hidden h-9 w-[210px] items-center gap-2 rounded-lg border border-line bg-[#FBFCFE] px-3 text-left text-[12px] font-medium text-ink-faint transition-all duration-200 hover:border-line-strong hover:bg-white hover:shadow-soft xl:w-[280px] md:flex"
          >
            <Search className="h-3.5 w-3.5 text-ink-faint transition-colors group-hover:text-stone-900" />
            <span className="flex-1 truncate">Search markets, localities, businesses</span>
            <span className="flex items-center gap-0.5 rounded border border-line bg-white px-1.5 py-0.5 text-[9px] font-bold text-ink-faint">
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

          <div className="ml-0.5 hidden items-center gap-2 border-l border-line pl-3 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
              MM
            </span>
            <div className="hidden leading-tight xl:block">
              <p className="text-[10.5px] font-bold text-ink">Market analyst</p>
              <p className="text-[9.5px] font-medium text-ink-faint">Local workspace</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
