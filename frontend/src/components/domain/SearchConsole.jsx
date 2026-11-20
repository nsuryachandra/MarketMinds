import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Loader2,
  MapPin,
  Search,
  Store,
  TriangleAlert,
} from 'lucide-react'
import { useMarket } from '../../context/MarketContext'
import { InlineError } from './DataState'
import { cn, formatNumber, humanizeMarketText } from '../../lib/utils'

const EXAMPLES = [
  'Bakery in Ameerpet',
  'Juice shop in Ameerpet',
  'Pharmacy in Kukatpally',
  'Café in Banjara Hills',
]

function distanceLabel(value) {
  if (value === null || value === undefined) return null
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`
  return `${Math.round(value)} m`
}

export function SearchConsole({ variant = 'hero', onComplete, className }) {
  const {
    runSearch,
    resolveSearchLocality,
    chooseBusiness,
    chooseCategory,
    searchStatus,
    searchResult,
    searchError,
    lastQuery,
    recentSearches,
    localities,
    locality,
  } = useMarket()
  const [query, setQuery] = useState(lastQuery || '')
  const loading = searchStatus === 'loading'
  const isHero = variant === 'hero'
  const clarification = searchResult?.clarification
  const categoryHint = searchResult?.category_hint
  const matchedBusiness = searchResult?.business

  useEffect(() => {
    if (lastQuery && lastQuery !== query) setQuery(lastQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastQuery])

  const finish = (result) => {
    if (result?.match_status === 'matched') onComplete?.(result)
  }

  const submit = async (event, value = query) => {
    event?.preventDefault()
    const result = await runSearch(value)
    finish(result)
  }

  const chooseSuggestion = (value) => {
    setQuery(value)
    submit(null, value)
  }

  const resolveLocality = async (localityId) => {
    const result = await resolveSearchLocality(localityId)
    finish(result)
  }

  const selectBusiness = (match) => {
    chooseBusiness(match)
    onComplete?.(match)
  }

  const applyCategoryHint = () => {
    if (!categoryHint) return
    chooseCategory(categoryHint, searchResult?.locality ?? locality ?? null)
    onComplete?.(searchResult)
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'transition-all duration-300',
          isHero
            ? 'rounded-2xl border border-line/90 bg-white/95 p-2 shadow-[0_16px_36px_-16px_rgba(10,13,18,0.10),0_1px_3px_rgba(10,13,18,0.04)] backdrop-blur-xl ring-1 ring-black/[0.03] focus-within:border-amber-300 focus-within:ring-4 focus-within:ring-amber-500/15 focus-within:shadow-[0_20px_40px_-15px_rgba(200,121,44,0.18)]'
            : 'rounded-xl border border-line bg-white p-1.5 shadow-soft focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-500/15',
        )}
      >
        <form onSubmit={submit} className="flex flex-col gap-1.5 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint transition-colors group-focus-within:text-stone-900" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search category or locality (e.g. Bakery in Ameerpet)"
              aria-label="Search a category, locality, or business name"
              className={cn(
                'w-full rounded-xl border-0 bg-transparent pl-10 pr-3 font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-ink-faint focus:bg-white',
                isHero ? 'h-[50px] text-[14.5px]' : 'h-10 text-[12.5px]',
              )}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'btn-primary btn-luminous group shrink-0 font-semibold tracking-wide',
              isHero ? 'h-[50px] rounded-xl px-6 text-[13.5px]' : 'h-10 rounded-lg px-4 text-[12.5px]',
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{loading ? 'Reading your search…' : 'Explore market'}</span>
            {!loading && (
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
            )}
          </button>
        </form>
      </div>

      {isHero && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 px-0.5">
          <span className="mr-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
            Try
          </span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => chooseSuggestion(example)}
              className="rounded-full border border-line/90 bg-white/80 backdrop-blur-xs px-3 py-1 text-[11px] font-semibold text-ink-mute transition-all hover:border-stone-400 hover:bg-stone-50 hover:text-stone-950 hover:shadow-xs active:scale-[0.98]"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {!isHero && recentSearches.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint">Recent</span>
          {recentSearches.slice(0, 3).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => chooseSuggestion(item)}
              className="rounded-md border border-line bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-mute hover:border-brand-200 hover:text-brand-700"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <InlineError error={searchError} className="mt-2.5" />

      {searchResult && searchStatus !== 'loading' && (
        <div className="mt-2.5 rounded-xl border border-line bg-[#FBFCFE] p-3">
          {searchStatus === 'matched' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-jade-600" />
                <div>
                  <p className="text-[12px] font-bold text-ink">
                    {searchResult.search_type === 'business'
                      ? matchedBusiness?.name
                      : searchResult.category?.name}
                  </p>
                  <p className="text-[10.5px] font-medium text-ink-mute">
                    {searchResult.locality?.name ?? matchedBusiness?.nearest_locality?.name}
                    {' · '}
                    {formatNumber(searchResult.confidence * 100)}% confidence
                  </p>
                </div>
              </div>
              <span className="chip border-jade-200 bg-jade-50 text-jade-700">
                {searchResult.search_type === 'business' ? 'Business analysis' : 'Category analysis'}
              </span>
            </div>
          )}

          {searchStatus === 'needs_clarification' && clarification && (
            <div>
              <div className="flex items-start gap-2">
                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <div>
                  <p className="text-[12px] font-bold text-ink">Which one did you mean?</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-mute">
                    {clarification.message}
                  </p>
                </div>
              </div>

              {clarification.type === 'locality' && (
                <div className="mt-2.5 flex max-h-[176px] flex-wrap gap-1.5 overflow-y-auto pr-1 scroll-slim">
                  {(clarification.options ?? localities).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => resolveLocality(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition-colors hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900"
                    >
                      <MapPin className="h-3 w-3 text-stone-600" />
                      {item.name}
                    </button>
                  ))}
                </div>
              )}

              {clarification.type === 'business' && (
                <div className="mt-2.5 space-y-1.5">
                  {searchResult.business_matches.map((match) => {
                    const distance = distanceLabel(match.distance_from_selected_locality_m)
                    return (
                      <button
                        key={match.osm_id}
                        type="button"
                        onClick={() => selectBusiness(match)}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-white px-2.5 py-2 text-left transition-colors hover:border-stone-400 hover:bg-stone-50"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-[#FBFCFE] text-stone-800">
                          <Store className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11.5px] font-bold text-ink">
                            {match.name}
                          </span>
                          <span className="block truncate text-[10px] font-medium text-ink-faint">
                            {match.category?.name} · {match.nearest_locality?.name}
                            {distance ? ` · ${distance} from selected locality` : ''}
                          </span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      </button>
                    )
                  })}
                </div>
              )}

              {clarification.type === 'category' && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {clarification.options.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        chooseCategory(item, searchResult.locality)
                        onComplete?.(searchResult)
                      }}
                      className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft hover:border-stone-400 hover:text-stone-900"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {searchStatus === 'not_found' && (
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <div>
                  <p className="text-[12px] font-bold text-ink">No matching market found</p>
                  <p className="mt-0.5 max-w-xl text-[10.5px] leading-relaxed text-ink-mute">
                    {searchResult.message ||
                      'Try a supported category, locality, or mapped business name.'}
                  </p>
                  {searchResult.notes?.length > 0 && (
                    <p className="mt-1 text-[10px] text-ink-faint">{humanizeMarketText(searchResult.notes[0])}</p>
                  )}
                </div>
              </div>
              {categoryHint && (
                <button
                  type="button"
                  onClick={applyCategoryHint}
                  className="btn-secondary h-8 px-2.5 text-[10.5px]"
                >
                  Analyse as {categoryHint.name}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {searchStatus === 'matched' && searchResult.notes?.length > 0 && (
            <p className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-ink-faint">
              {humanizeMarketText(searchResult.notes[0])}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
