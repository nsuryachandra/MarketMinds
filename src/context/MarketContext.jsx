import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { marketApi } from '../lib/api'

const MarketContext = createContext(null)
const STORAGE = {
  category: 'mm.category',
  locality: 'mm.locality',
  radius: 'mm.radius',
  recent: 'mm.recentSearches',
}

function readString(key) {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

function readRecentSearches() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE.recent) || '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, 6) : []
  } catch {
    return []
  }
}

function readRadius() {
  const value = Number(readString(STORAGE.radius))
  return Number.isFinite(value) && value > 0 ? value : null
}

export function MarketProvider({ children }) {
  const [categories, setCategories] = useState([])
  const [localities, setLocalities] = useState([])
  const [radiusOptions, setRadiusOptions] = useState([])
  const [categoryId, setCategoryIdState] = useState(null)
  const [localityId, setLocalityIdState] = useState(null)
  const [radius, setRadiusState] = useState(readRadius)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState(null)
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [analysisMode, setAnalysisMode] = useState('category')
  const [business, setBusiness] = useState(null)
  const [searchResult, setSearchResult] = useState(null)
  const [searchStatus, setSearchStatus] = useState('idle')
  const [searchError, setSearchError] = useState(null)
  const [lastQuery, setLastQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState(readRecentSearches)

  const addRecentSearch = useCallback((query) => {
    const value = query?.trim()
    if (!value) return
    setRecentSearches((current) => {
      const next = [value, ...current.filter((item) => item !== value)].slice(0, 6)
      return next
    })
  }, [])

  const loadMeta = useCallback(async () => {
    setMetaLoading(true)
    setMetaError(null)
    try {
      const [categoryPayload, localityPayload, healthPayload] = await Promise.all([
        marketApi.getCategories(),
        marketApi.getLocalities(),
        marketApi.getHealth(),
      ])
      const nextCategories = categoryPayload.categories ?? []
      const nextLocalities = localityPayload.localities ?? []
      const categoryIds = new Set(nextCategories.map((item) => item.id))
      const localityIds = new Set(nextLocalities.map((item) => item.id))
      const storedCategory = readString(STORAGE.category)
      const storedLocality = readString(STORAGE.locality)
      const storedRadius = readRadius()
      const nextRadiusOptions = categoryPayload.radius_options_m ?? localityPayload.radius_options_m ?? []
      setCategories(nextCategories)
      setLocalities(nextLocalities)
      setRadiusOptions(nextRadiusOptions)
      setHealth(healthPayload)
      setHealthLoading(false)
      setCategoryIdState(
        storedCategory && categoryIds.has(storedCategory)
          ? storedCategory
          : categoryPayload.default_category,
      )
      setLocalityIdState(
        storedLocality && localityIds.has(storedLocality)
          ? storedLocality
          : localityPayload.default_locality,
      )
      setRadiusState(
        storedRadius && nextRadiusOptions.includes(storedRadius)
          ? storedRadius
          : categoryPayload.default_radius_m,
      )
    } catch (error) {
      setMetaError(error)
      setHealthLoading(false)
    } finally {
      setMetaLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (categoryId) window.localStorage.setItem(STORAGE.category, categoryId)
  }, [categoryId])

  useEffect(() => {
    if (localityId) window.localStorage.setItem(STORAGE.locality, localityId)
  }, [localityId])

  useEffect(() => {
    if (radius) window.localStorage.setItem(STORAGE.radius, String(radius))
  }, [radius])

  useEffect(() => {
    window.localStorage.setItem(STORAGE.recent, JSON.stringify(recentSearches))
  }, [recentSearches])

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const payload = await marketApi.getHealth()
      setHealth(payload)
      return payload
    } finally {
      setHealthLoading(false)
    }
  }, [])

  const category = useMemo(
    () => categories.find((item) => item.id === categoryId) ?? null,
    [categories, categoryId],
  )
  const locality = useMemo(
    () => localities.find((item) => item.id === localityId) ?? null,
    [localities, localityId],
  )

  const resetSearchFeedback = useCallback(() => {
    setSearchResult(null)
    setSearchError(null)
    setSearchStatus('idle')
  }, [])

  const setCategoryId = useCallback(
    (id) => {
      setCategoryIdState(id)
      setBusiness(null)
      setAnalysisMode('category')
      resetSearchFeedback()
    },
    [resetSearchFeedback],
  )

  const setLocalityId = useCallback(
    (id) => {
      setLocalityIdState(id)
      if (analysisMode === 'business') {
        setBusiness(null)
        setAnalysisMode('category')
      }
      resetSearchFeedback()
    },
    [analysisMode, resetSearchFeedback],
  )

  const setRadius = useCallback((value) => {
    setRadiusState(Number(value))
  }, [])

  const applyInterpretation = useCallback(
    (result) => {
      setSearchResult(result)
      setLastQuery(result.query ?? '')
      if (result.match_status === 'matched') {
        if (result.search_type === 'business' && result.business) {
          const selectedCategory = result.category
          const selectedLocality =
            result.locality ?? result.business.nearest_locality ?? null
          if (selectedCategory) setCategoryIdState(selectedCategory.id)
          if (selectedLocality) setLocalityIdState(selectedLocality.id)
          setBusiness(result.business)
          setAnalysisMode('business')
          addRecentSearch(result.query)
        } else if (result.search_type === 'category' && result.category) {
          setCategoryIdState(result.category.id)
          if (result.locality) setLocalityIdState(result.locality.id)
          setBusiness(null)
          setAnalysisMode('category')
          addRecentSearch(result.query)
        }
        setSearchStatus('matched')
        setSearchError(null)
        return
      }
      if (result.match_status === 'needs_clarification') {
        setSearchStatus('needs_clarification')
        setSearchError(null)
        return
      }
      setSearchStatus('not_found')
      setSearchError(null)
    },
    [addRecentSearch],
  )

  const runSearch = useCallback(
    async (query) => {
      const trimmed = query?.trim()
      if (!trimmed) {
        setSearchStatus('error')
        setSearchError(new Error('Enter a category, locality, or business name to search.'))
        return null
      }
      setLastQuery(trimmed)
      setSearchStatus('loading')
      setSearchError(null)
      setSearchResult(null)
      try {
        const result = await marketApi.interpretSearch({ query: trimmed })
        applyInterpretation(result)
        return result
      } catch (error) {
        setSearchStatus('error')
        setSearchError(error)
        return null
      }
    },
    [applyInterpretation],
  )

  const resolveSearchLocality = useCallback(
    async (nextLocalityId) => {
      if (!lastQuery) return null
      setSearchStatus('loading')
      setSearchError(null)
      try {
        const result = await marketApi.interpretSearch({
          query: lastQuery,
          locality_id: nextLocalityId,
        })
        applyInterpretation(result)
        return result
      } catch (error) {
        setSearchStatus('error')
        setSearchError(error)
        return null
      }
    },
    [applyInterpretation, lastQuery],
  )

  const chooseBusiness = useCallback(
    (match) => {
      if (!match?.osm_id) return
      const selectedCategory = match.category
      const selectedLocality = match.nearest_locality
      if (selectedCategory?.id) setCategoryIdState(selectedCategory.id)
      if (selectedLocality?.id) setLocalityIdState(selectedLocality.id)
      setBusiness(match)
      setAnalysisMode('business')
      setSearchStatus('matched')
      setSearchError(null)
      setSearchResult((current) =>
        current
          ? {
              ...current,
              match_status: 'matched',
              business: match,
              business_matches: [],
              category: selectedCategory ?? current.category,
              locality: selectedLocality ?? current.locality,
              clarification: null,
            }
          : current,
      )
      addRecentSearch(lastQuery || match.name)
    },
    [addRecentSearch, lastQuery],
  )

  const chooseCategory = useCallback(
    (nextCategory, nextLocality = null) => {
      if (!nextCategory?.id) return
      setCategoryIdState(nextCategory.id)
      if (nextLocality?.id) setLocalityIdState(nextLocality.id)
      setBusiness(null)
      setAnalysisMode('category')
      setSearchStatus('matched')
      setSearchError(null)
      setSearchResult((current) =>
        current
          ? {
              ...current,
              match_status: 'matched',
              search_type: 'category',
              category: nextCategory,
              locality: nextLocality ?? current.locality,
              business: null,
              business_matches: [],
              clarification: null,
            }
          : current,
      )
    },
    [],
  )

  const clearBusiness = useCallback(() => {
    setBusiness(null)
    setAnalysisMode('category')
  }, [])

  const clearSearch = useCallback(() => {
    setSearchResult(null)
    setSearchStatus('idle')
    setSearchError(null)
  }, [])

  const value = useMemo(
    () => ({
      categories,
      localities,
      radiusOptions,
      categoryId,
      localityId,
      radius,
      category,
      locality,
      health,
      healthLoading,
      metaLoading,
      metaError,
      analysisMode,
      business,
      isBusinessMode: analysisMode === 'business' && Boolean(business),
      searchResult,
      searchStatus,
      searchError,
      lastQuery,
      recentSearches,
      dataReady: !metaLoading && !metaError && Boolean(category && locality),
      setCategoryId,
      setLocalityId,
      setRadius,
      setContext: (nextCategoryId, nextLocalityId) => {
        setCategoryId(nextCategoryId)
        setLocalityId(nextLocalityId)
      },
      runSearch,
      resolveSearchLocality,
      chooseBusiness,
      chooseCategory,
      clearBusiness,
      clearSearch,
      addRecentSearch,
      reloadMeta: loadMeta,
      refreshHealth,
    }),
    [
      categories,
      localities,
      radiusOptions,
      categoryId,
      localityId,
      radius,
      category,
      locality,
      health,
      healthLoading,
      metaLoading,
      metaError,
      analysisMode,
      business,
      searchResult,
      searchStatus,
      searchError,
      lastQuery,
      recentSearches,
      setCategoryId,
      setLocalityId,
      setRadius,
      runSearch,
      resolveSearchLocality,
      chooseBusiness,
      chooseCategory,
      clearBusiness,
      clearSearch,
      addRecentSearch,
      loadMeta,
      refreshHealth,
    ],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('useMarket must be used inside MarketProvider')
  return context
}
