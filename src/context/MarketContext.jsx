import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { categories, getCategory } from '../data/categories'
import { getLocality, localities } from '../data/localities'












const MarketContext = createContext(null)

function readStored(key, fallback, valid) {
  if (typeof window === 'undefined') return fallback
  const stored = window.localStorage.getItem(key)
  return stored && valid.includes(stored) ? stored : fallback
}

export function MarketProvider({ children }) {
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

  const setCategoryId = useCallback((id) => setCategoryState(id), [])
  const setLocalityId = useCallback((id) => setLocalityState(id), [])
  const setContext = useCallback((category, locality) => {
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
