import { useEffect, useMemo, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/utils'























export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select',
  searchable = false,
  className,
  buttonClassName,
  menuClassName,
  size = 'md',
  align = 'left',
  ariaLabel,
  searchPlaceholder = 'Search…',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef(null)

  const selected = options.find((option) => option.value === value)

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const term = query.toLowerCase()
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.hint?.toLowerCase().includes(term),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const handleOutside = (event) => {
      if (!containerRef.current?.contains(event.target )) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    setActiveIndex(Math.max(0, filtered.findIndex((option) => option.value === value)))
    const timer = window.setTimeout(() => {
      if (searchable) searchRef.current?.focus()
      else menuRef.current?.focus()
    }, 40)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const choose = (next) => {
    onChange(next)
    setOpen(false)
  }

  const handleMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(filtered.length - 1, current + 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(0, current - 1))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option) choose(option.value)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white/75 font-semibold text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-white',
          size === 'md' ? 'h-11 px-3.5 text-[13.5px]' : 'h-9 px-3 text-[12.5px]',
          open && 'border-brand-300 bg-white ring-4 ring-brand-500/10',
          buttonClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon}
          <span className={cn('truncate', !selected && 'font-medium text-ink-faint')}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-200',
            open && 'rotate-180 text-brand-600',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            ref={menuRef}
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className={cn(
              'absolute z-[60] mt-2 overflow-hidden rounded-2xl border border-white/80 bg-[rgba(255,255,255,0.97)] p-1.5 shadow-lift backdrop-blur-xl outline-none',
              align === 'right' ? 'right-0' : 'left-0',
              'min-w-full',
              menuClassName,
            )}
          >
            {searchable && (
              <div className="relative mb-1.5">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-line/70 bg-canvas/50 pl-8 pr-2 text-[12.5px] font-medium text-ink outline-none placeholder:text-ink-faint focus:border-brand-300"
                />
              </div>
            )}
            <div className="scroll-slim max-h-64 overflow-y-auto" role="listbox" aria-label={ariaLabel}>
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-ink-faint">No matches found</div>
              )}
              {filtered.map((option, index) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option.value)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                      isSelected
                        ? 'bg-brand-50 font-bold text-brand-800'
                        : 'font-medium text-ink-soft hover:bg-ink/[0.04]',
                      activeIndex === index && !isSelected && 'bg-ink/[0.04]',
                    )}
                  >
                    {option.icon}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.hint && (
                        <span className="mt-0.5 block truncate text-[10.5px] font-medium text-ink-faint">
                          {option.hint}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
