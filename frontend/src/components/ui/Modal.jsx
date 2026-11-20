import { useEffect, useId, useRef } from 'react'

import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Modal({
  open,
  onClose,
  title,
  description,
  ariaLabel = 'Dialog',
  children,
  className,
  align = 'center',
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    previousFocus.current = document.activeElement
    const focusTimer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'input, button, textarea, select, [href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusable instanceof HTMLElement) focusable.focus()
      else panelRef.current?.focus()
    }, 60)

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll(
          'input, button, textarea, select, [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 z-[80] flex justify-center px-3 sm:px-4',
            align === 'center' ? 'items-center' : 'items-start pt-[8vh] sm:pt-[10vh]',
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ? undefined : ariaLabel}
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 max-h-[88dvh] w-full overflow-hidden rounded-2xl border border-line bg-white shadow-lift outline-none',
              className,
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div>
                  {title && (
                    <h2 id={titleId} className="font-display text-[16px] font-bold tracking-[-0.02em] text-ink">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-0.5 text-[11.5px] text-ink-mute">{description}</p>}
                </div>
                <button type="button" onClick={onClose} className="icon-button h-8 w-8 shrink-0" aria-label="Close dialog">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="scroll-slim max-h-[calc(88dvh-70px)] overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
