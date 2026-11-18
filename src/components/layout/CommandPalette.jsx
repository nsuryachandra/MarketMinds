import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CornerDownLeft, MapPin, Search, Shapes, Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { CategoryGlyph } from '../ui/CategoryGlyph'
import { allNavItems } from './navigation'
import { useMarket } from '../../context/MarketContext'
import { cn, formatNumber } from '../../lib/utils'

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const {
    categories,
    localities,
    setCategoryId,
    setLocalityId,
    runSearch,
  } = useMarket()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setQuery('')
    setActiveIndex(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [open])

  const items = useMemo(() => {
    const term = query.trim().toLowerCase()
    const pageItems = allNavItems
      .filter((item) => !term || `${item.label} ${item.description}`.toLowerCase().includes(term))
      .map((item) => ({
        id: `page-${item.to}`,
        group: 'Jump to',
        label: item.label,
        hint: item.description,
        icon: <item.icon className="h-4 w-4" />,
        action: () => navigate(item.to),
      }))

    const searchItem =
      term.length >= 2
        ? [
            {
              id: 'natural-search',
              group: 'Natural-language search',
              label: `Search “${query.trim()}”`,
              hint: 'Interpret a category, locality, or mapped business name',
              icon: <Sparkles className="h-4 w-4" />,
              action: () => {
                runSearch(query)
                navigate('/dashboard')
              },
            },
          ]
        : []

    const localityItems = localities
      .filter((locality) => !term || `${locality.name} ${locality.zone}`.toLowerCase().includes(term))
      .slice(0, term ? 6 : 4)
      .map((locality) => ({
        id: `locality-${locality.id}`,
        group: 'Switch locality',
        label: locality.name,
        hint: `${locality.zone} · approximate reference point`,
        icon: <MapPin className="h-4 w-4" />,
        action: () => setLocalityId(locality.id),
      }))

    const categoryItems = categories
      .filter(
        (category) =>
          !term ||
          `${category.name} ${(category.aliases ?? []).join(' ')}`
            .toLowerCase()
            .includes(term),
      )
      .slice(0, term ? 6 : 4)
      .map((category) => ({
        id: `category-${category.id}`,
        group: 'Switch category',
        label: category.name,
        hint: `${formatNumber(category.mapped_poi_count ?? 0)} mapped POIs citywide`,
        icon: <CategoryGlyph icon={category.icon} tint={category.tint} size="sm" />,
        action: () => setCategoryId(category.id),
      }))

    return [...searchItem, ...pageItems, ...localityItems, ...categoryItems]
  }, [categories, localities, navigate, query, runSearch, setCategoryId, setLocalityId])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const apply = (item) => {
    if (!item) return
    item.action()
    onClose()
  }

  const groups = items.reduce((accumulator, item) => {
    accumulator[item.group] = [...(accumulator[item.group] ?? []), item]
    return accumulator
  }, {})
  const flattened = Object.values(groups).flat()

  return (
    <Modal open={open} onClose={onClose} align="top" className="max-w-[560px]">
      <div className="flex items-center gap-3 border-b border-line/70 px-4 py-3.5">
        <Search className="h-4 w-4 shrink-0 text-brand-600" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((current) => Math.min(flattened.length - 1, current + 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((current) => Math.max(0, current - 1))
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              apply(flattened[activeIndex])
            }
          }}
          placeholder="Search pages, localities, categories, or a business…"
          className="h-7 flex-1 bg-transparent text-[14px] font-medium text-ink outline-none placeholder:text-ink-faint"
        />
        <span className="rounded-md border border-line bg-canvas/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint">
          esc
        </span>
      </div>

      <div className="max-h-[52vh] overflow-y-auto scroll-slim p-2">
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Shapes className="h-7 w-7 text-ink-faint" />
            <p className="text-[12.5px] font-semibold text-ink">No matches for “{query}”</p>
            <p className="text-[11px] text-ink-faint">
              Try a locality, approved category, workspace page, or mapped business name.
            </p>
          </div>
        )}
        {Object.entries(groups).map(([group, groupItems]) => (
          <div key={group} className="mb-1.5">
            <p className="px-2.5 pb-1 pt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              {group}
            </p>
            {groupItems.map((item) => {
              const index = flattened.indexOf(item)
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => apply(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                    activeIndex === index ? 'bg-brand-50' : 'hover:bg-ink/[0.03]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                      activeIndex === index
                        ? 'border-brand-100 bg-white text-brand-700'
                        : 'border-line/70 bg-white/60 text-ink-mute',
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-ink">{item.label}</span>
                    <span className="block truncate text-[10px] font-medium text-ink-faint">{item.hint}</span>
                  </span>
                  {activeIndex === index ? (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2.5 text-[9.5px] font-semibold text-ink-faint">
        <span className="flex items-center gap-3">
          <span>↑↓ navigate</span>
          <span>↵ apply</span>
        </span>
        <span>Context changes apply across the workspace</span>
      </div>
    </Modal>
  )
}
