import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { categories, getCategory } from '../data/categories'
import { getLocality, localities } from '../data/localities'
import type { Category, Locality } from '../lib/types'

interface MarketContextValue {
  categoryId: string
  localityId: string
  category: Category
  locality: Locality
  setCategoryId: (id: string) => void
  setLocalityId: (id: string) => void
  setContext: (categoryId: string, localityId: string) => void
}

const MarketContext = createContext<MarketContextValue | null>(null)

function readStored(key: string, fallback: string, valid: string[]) {
  if (typeof window === 'undefined') return fallback
  const stored = window.localStorage.getItem(key)
  return stored && valid.includes(stored) ? stored : fallback
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [categoryId, setCategoryState] = useState(() =>
    readStored('mm.category', 'cafes', categories.map((c) => c.id)),
  )
  const [localityId, setLocalityState] = useState(() =>
    readStored('mm.locality', 'banjara-hills', localities.map((l) => l.id)),
  )

  useEffect(() => {
    window.localStorage.setItem('mm.category', categoryId)
  }, [categoryId])

  useEffect(() => {
    window.localStorage.setItem('mm.locality', localityId)
  }, [localityId])

  const setCategoryId = useCallback((id: string) => setCategoryState(id), [])
  const setLocalityId = useCallback((id: string) => setLocalityState(id), [])
  const setContext = useCallback((category: string, locality: string) => {
    setCategoryState(category)
    setLocalityState(locality)
  }, [])

  const value = useMemo(
    () => ({
      categoryId,
      localityId,
      category: getCategory(categoryId),
      locality: getLocality(localityId),
      setCategoryId,
      setLocalityId,
      setContext,
    }),
    [categoryId, localityId, setCategoryId, setLocalityId, setContext],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('useMarket must be used inside MarketProvider')
  return context
}
