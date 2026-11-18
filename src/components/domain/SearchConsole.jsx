import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Store,
} from 'lucide-react'
import { useMarket } from '../../context/MarketContext'
import { cn, formatNumber } from '../../lib/utils'

const EXAMPLES = [
  'Juice Shop in Ameerpet',
  'Café in Banjara Hills',
  'Pharmacy in Kukatpally',
  'Gym in Gachibowli',
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
    <div
      className={cn(
        isHero
          ? 'rounded-[28px] border border-white/90 bg-white/80 p-3 shadow-[0_24px_60px_-36px_rgba(27,31,47,0.45)] backdrop-blur-xl'
          : 'rounded-2xl border border-line/70 bg-white/60 p-2.5',
        className,
      )}
    >
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a category, locality, or mapped business name…"
            aria-label="Natural-language market search"
            className={cn(
              'w-full rounded-2xl border border-line bg-white/75 pl-11 pr-4 font-semibold text-ink outline-none transition-all placeholder:font-medium placeholder:text-ink-faint focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-500/10',
              isHero ? 'h-14 text-[15px]' : 'h-11 text-[13px]',
            )}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={cn('btn-primary shrink-0', isHero ? 'h-14 rounded-2xl px-6' : 'h-11')}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Interpreting…' : 'Analyse'}
        </button>
      </form>

      {isHero && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 px-1">
          <span className="mr-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            Try
          </span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => chooseSuggestion(example)}
              className="rounded-full border border-line/80 bg-white/60 px-2.5 py-1 text-[10.5px] font-semibold text-ink-mute transition-colors hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800"
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
              className="rounded-full border border-line/70 bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-ink-mute hover:text-brand-700"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {searchStatus === 'error' && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-coral-200/70 bg-coral-50/60 px-3 py-2 text-[11.5px] font-medium text-coral-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {searchError?.message || 'The search could not be completed.'}
        </div>
      )}

      {searchResult && searchStatus !== 'loading' && (
        <div className="mt-2.5 rounded-xl border border-line/70 bg-white/65 p-3">
          {searchStatus === 'matched' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-jade-600" />
                <div>
                  <p className="text-[11.5px] font-bold text-ink">
                    {searchResult.search_type === 'business'
                      ? matchedBusiness?.name
                      : searchResult.category?.name}
                  </p>
                  <p className="text-[10.5px] font-medium text-ink-mute">
                    {searchResult.locality?.name ?? matchedBusiness?.nearest_locality?.name} ·{' '}
                    {formatNumber(searchResult.confidence * 100)}% deterministic match
                  </p>
                </div>
              </div>
              <span className="chip border-jade-200/70 bg-jade-50 text-jade-700">
                {searchResult.search_type === 'business' ? 'Business context' : 'Category context'}
              </span>
            </div>
          )}

          {searchStatus === 'needs_clarification' && clarification && (
            <div>
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <div>
                  <p className="text-[11.5px] font-bold text-ink">One quick clarification</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-mute">
                    {clarification.message}
                  </p>
                </div>
              </div>

              {clarification.type === 'locality' && (
                <div className="mt-2.5 flex max-h-[176px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                  {(clarification.options ?? localities).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => resolveLocality(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line/80 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800"
                    >
                      <MapPin className="h-3 w-3 text-brand-500" />
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
                        className="flex w-full items-center gap-2.5 rounded-lg border border-line/70 bg-white px-2.5 py-2 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white/70 text-brand-700">
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
                      className="rounded-lg border border-line/80 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft hover:border-brand-200 hover:text-brand-800"
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
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <div>
                  <p className="text-[11.5px] font-bold text-ink">No exact data match</p>
                  <p className="mt-0.5 max-w-xl text-[10.5px] leading-relaxed text-ink-mute">
                    {searchResult.message ||
                      'No mapped business or approved category matched this search.'}
                  </p>
                  {searchResult.notes?.length > 0 && (
                    <p className="mt-1 text-[10px] text-ink-faint">{searchResult.notes[0]}</p>
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
            <p className="mt-2 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-ink-faint">
              {searchResult.notes[0]}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
