import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Check,
  GitCompareArrows,
  MapPin,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Meter } from '../components/ui/Meter'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SourceNote,
} from '../components/domain/DataState'
import { useMarket } from '../context/MarketContext'
import { useApiResource } from '../hooks/useApiResource'
import { marketApi } from '../lib/api'
import { cn, formatNumber, humanizeMarketText } from '../lib/utils'

const sortOptions = [
  { value: 'opportunity', label: 'Opportunity index' },
  { value: 'competition', label: 'Competition index' },
  { value: 'mapped', label: 'Mapped places' },
  { value: 'density', label: 'Density' },
  { value: 'name', label: 'Locality name' },
]

function scoreColor(score, highIsGood = true) {
  if (score === null || score === undefined) return '#667085'
  if (highIsGood) {
    if (score >= 70) return '#079455'
    if (score >= 45) return '#DC6803'
    return '#D92D20'
  }
  if (score >= 70) return '#D92D20'
  if (score >= 45) return '#DC6803'
  return '#079455'
}

export function MarketExplorer() {
  const navigate = useNavigate()
  const {
    categoryId,
    localityId,
    setLocalityId,
    categories,
    radius,
    dataReady,
    metaLoading,
    metaError,
    reloadMeta,
    isBusinessMode,
  } = useMarket()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('opportunity')
  const [mapMode, setMapMode] = useState('opportunity')
  const [shortlist, setShortlist] = useState(null)
  const effectiveShortlist = shortlist ?? (localityId ? [localityId] : [])

  const category = categories.find((item) => item.id === categoryId)

  const result = useApiResource(
    ({ signal }) =>
      marketApi.getAllLocalityAnalysis(
        { category: categoryId, radius_m: radius },
        { signal },
      ),
    [categoryId, radius],
    { enabled: dataReady },
  )

  const rows = useMemo(
    () =>
      (result.data?.localities ?? []).map((snapshot) => ({
        ...snapshot.locality,
        snapshot,
      })),
    [result.data],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows
      .filter((row) => !term || `${row.name} ${row.zone}`.toLowerCase().includes(term))
      .slice()
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'mapped') return b.snapshot.mapped_poi_count - a.snapshot.mapped_poi_count
        if (sort === 'density') return b.snapshot.density_per_sq_km - a.snapshot.density_per_sq_km
        if (sort === 'competition') {
          return (b.snapshot.scores.competition_index ?? -1) - (a.snapshot.scores.competition_index ?? -1)
        }
        return (b.snapshot.scores.opportunity_index ?? -1) - (a.snapshot.scores.opportunity_index ?? -1)
      })
  }, [rows, query, sort])

  const selected = rows.find((row) => row.id === localityId) ?? filtered[0] ?? null
  const selectedSnapshot = selected?.snapshot
  const selectedScores = selectedSnapshot?.scores
  const topChart = rows
    .slice()
    .sort((a, b) => (b.snapshot.scores.opportunity_index ?? -1) - (a.snapshot.scores.opportunity_index ?? -1))
    .slice(0, 8)
    .map((row) => ({
      name: row.name.length > 13 ? `${row.name.slice(0, 12)}…` : row.name,
      opportunity: row.snapshot.scores.opportunity_index ?? 0,
    }))

  const bounds = useMemo(() => {
    if (!rows.length) return null
    const latitudes = rows.map((row) => row.latitude)
    const longitudes = rows.map((row) => row.longitude)
    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLon = Math.min(...longitudes)
    const maxLon = Math.max(...longitudes)
    return {
      minLat,
      maxLat: maxLat === minLat ? minLat + 0.01 : maxLat,
      minLon,
      maxLon: maxLon === minLon ? minLon + 0.01 : maxLon,
    }
  }, [rows])

  const toggleShortlist = (id) => {
    setShortlist((current) => {
      const base = current ?? effectiveShortlist
      if (base.includes(id)) return base.filter((item) => item !== id)
      if (base.length >= 4) return base
      return [...base, id]
    })
  }

  const compare = () => {
    if (effectiveShortlist.length < 2) return
    navigate(`/location-comparison?localities=${effectiveShortlist.join(',')}`)
  }

  if (metaLoading || result.loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Explore" title="Market explorer" location="Hyderabad" />
        <LoadingBlock label="Comparing locality analyses across Hyderabad…" />
      </div>
    )
  }

  if (metaError || result.error) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Explore" title="Market explorer" location="Hyderabad" />
        <ErrorBlock
          error={metaError || result.error}
          onRetry={() => {
            if (metaError) reloadMeta()
            else result.reload()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Explore"
        title="Market explorer"
        description="Compare every supported locality on the same catchment settings. See mapped supply, density, competition, and opportunity without invented footfall or rent."
        location={`${selected?.name ?? 'Hyderabad'} · ${category?.shortName ?? category?.name ?? ''}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4 text-brand-600" />
              Ask the assistant
            </button>
            <button
              type="button"
              className={cn('btn-primary', effectiveShortlist.length < 2 && 'opacity-60')}
              disabled={effectiveShortlist.length < 2}
              onClick={compare}
            >
              <GitCompareArrows className="h-4 w-4" />
              Compare shortlist
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-extrabold">
                {effectiveShortlist.length}
              </span>
            </button>
          </>
        }
      />

      {isBusinessMode && (
        <div className="rounded-xl border border-gold-200/70 bg-gold-50/50 px-3.5 py-2.5 text-[10.5px] font-medium text-gold-900">
          The explorer shows locality-level context. Exact-business analysis is available on the dashboard and
          competitor pages; selecting a locality here returns to category context.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[268px_minmax(0,1fr)]">
        <GlassPanel className="flex flex-col p-4">
          <PanelHeader
            title="Refine view"
            description="Live filters across every locality."
            icon={SlidersHorizontal}
          />

          <div className="mt-4 rounded-lg border border-line bg-[#F8FAFC] p-3">
            <p className="label">Current analysis</p>
            <div className="mt-1.5 space-y-1 text-[10.5px] font-medium text-ink-mute">
              <p className="flex items-center justify-between gap-2">
                <span>Category</span>
                <span className="truncate font-semibold text-ink-soft">
                  {category?.shortName ?? category?.name ?? '—'}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>Locality</span>
                <span className="truncate font-semibold text-ink-soft">{selected?.name ?? '—'}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>Radius</span>
                <span className="font-semibold text-ink-soft">{radius / 1000} km</span>
              </p>
            </div>
            <p className="mt-2 border-t border-line pt-2 text-[9.5px] leading-relaxed text-ink-faint">
              Change category, locality, or radius from the context switcher in the header.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="explorer-query">
                Locality search
              </label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <input
                  id="explorer-query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by name or zone"
                  className="field h-9 pl-8 text-[12px]"
                />
              </div>
            </div>

            <div>
              <span className="label">Sort by</span>
              <Select
                value={sort}
                onChange={setSort}
                options={sortOptions}
                className="mt-1.5"
                ariaLabel="Sort localities"
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-line/60 bg-white/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Shortlist</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-mute">
              Select 2–4 localities for a side-by-side comparison. Counts are overlapping and not additive.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {effectiveShortlist.map((id) => {
                const item = rows.find((row) => row.id === id)
                return item ? (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleShortlist(id)}
                    className="chip border-brand-200/70 bg-brand-50 text-[10px] text-brand-800"
                  >
                    {item.name}
                    <span className="text-brand-500">×</span>
                  </button>
                ) : null
              })}
              {effectiveShortlist.length === 0 && <span className="text-[10.5px] text-ink-faint">None selected</span>}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="button"
              className={cn('btn-primary w-full', effectiveShortlist.length < 2 && 'opacity-60')}
              disabled={effectiveShortlist.length < 2}
              onClick={compare}
            >
              <GitCompareArrows className="h-4 w-4" />
              Compare {effectiveShortlist.length || 'selected'}
            </button>
            <SourceNote className="mt-2">
              Locality points are approximate reference centres. Circular catchments overlap.
            </SourceNote>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <GlassPanel className="overflow-hidden p-4">
              <PanelHeader
                title="Locality map"
                description="Positions use the supplied reference points, not boundary polygons."
                icon={MapPin}
                action={
                  <div className="flex rounded-lg border border-line bg-white/60 p-0.5">
                    {[
                      { value: 'opportunity', label: 'Opportunity' },
                      { value: 'competition', label: 'Competition' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMapMode(option.value)}
                        className={cn(
                          'rounded-md px-2 py-1 text-[9.5px] font-bold transition-colors',
                          mapMode === option.value
                            ? 'bg-white text-ink shadow-sm'
                            : 'text-ink-faint hover:text-ink',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="relative mt-3 h-[286px] overflow-hidden rounded-xl border border-line bg-[radial-gradient(circle_at_40%_30%,rgba(8,100,232,0.06),transparent_55%),linear-gradient(145deg,#FFFFFF,#F7F9FC)] dot-grid">
                {bounds &&
                  rows.map((row) => {
                    const score =
                      mapMode === 'competition'
                        ? row.snapshot.scores.competition_index
                        : row.snapshot.scores.opportunity_index
                    const left = 8 + ((row.longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 84
                    const top = 8 + ((bounds.maxLat - row.latitude) / (bounds.maxLat - bounds.minLat)) * 78
                    const isSelected = row.id === localityId
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setLocalityId(row.id)}
                        className="group absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${left}%`, top: `${top}%` }}
                        title={`${row.name} · ${mapMode} ${score ?? '—'}/100`}
                      >
                        <span
                          className={cn(
                            'flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-110',
                            isSelected ? 'h-5 w-5' : 'h-3.5 w-3.5',
                          )}
                          style={{ backgroundColor: scoreColor(score, mapMode === 'opportunity') }}
                        />
                        <span
                          className={cn(
                            'absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[8.5px] font-bold shadow-sm',
                            isSelected
                              ? 'z-10 bg-ink text-white'
                              : 'bg-white/90 text-ink-mute opacity-0 transition-opacity group-hover:opacity-100',
                          )}
                        >
                          {row.name}
                        </span>
                      </button>
                    )
                  })}
                <div className="absolute bottom-2 left-2 rounded-md border border-line bg-white/90 px-2 py-1 text-[8.5px] font-semibold text-ink-faint">
                  {mapMode === 'opportunity' ? 'Green = higher opportunity index' : 'Red = higher mapped competition'}
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <PanelHeader
                title="Top opportunity"
                description={`${category?.shortName ?? category?.name} at ${radius / 1000} km.`}
                icon={TrendingUp}
              />
              <div className="mt-2 h-[254px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topChart} margin={{ top: 4, right: 2, bottom: 0, left: -20 }}>
                    <CartesianGrid vertical={false} stroke="#E5EAF1" strokeDasharray="3 5" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 8.5, fill: '#475467', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-32}
                      textAnchor="end"
                      height={46}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#667085' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip formatter={(value) => `${value}/100`} />} />
                    <Bar dataKey="opportunity" name="Opportunity" radius={[5, 5, 0, 0]} fill="#0F9D92" barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <GlassPanel className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 px-4 py-3.5">
                <div>
                  <p className="font-display text-[14px] font-extrabold text-ink">Locality ledger</p>
                  <p className="text-[10.5px] text-ink-faint">
                    {filtered.length} of {rows.length} localities shown
                  </p>
                </div>
                <Badge tone="neutral">{category?.shortName ?? category?.name}</Badge>
              </div>
              <div className="max-h-[430px] overflow-auto scroll-slim">
                <table className="w-full min-w-[460px] text-left">
                  <thead className="sticky top-0 z-10 bg-[#F8FAFC] text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    <tr>
                      <th className="px-4 py-2.5">Locality</th>
                      <th className="px-2 py-2.5">Mapped</th>
                      <th className="px-2 py-2.5">Opportunity</th>
                      <th className="px-2 py-2.5">Competition</th>
                      <th className="px-4 py-2.5 text-right">Shortlist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const selectedRow = row.id === localityId
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            'cursor-pointer border-t border-line/50 text-[11px] transition-colors hover:bg-white/55',
                            selectedRow && 'bg-brand-50/45',
                          )}
                          onClick={() => setLocalityId(row.id)}
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-ink">{row.name}</p>
                            <p className="text-[9.5px] text-ink-faint">{row.zone}</p>
                          </td>
                          <td className="tabular px-2 py-2.5 font-bold text-ink">
                            {formatNumber(row.snapshot.mapped_poi_count)}
                          </td>
                          <td className="px-2 py-2.5">
                            <span
                              className="inline-flex min-w-[34px] justify-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white"
                              style={{ backgroundColor: scoreColor(row.snapshot.scores.opportunity_index, true) }}
                            >
                              {row.snapshot.scores.opportunity_index ?? '—'}
                            </span>
                          </td>
                          <td className="px-2 py-2.5">
                            <span
                              className="inline-flex min-w-[34px] justify-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white"
                              style={{ backgroundColor: scoreColor(row.snapshot.scores.competition_index, false) }}
                            >
                              {row.snapshot.scores.competition_index ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleShortlist(row.id)
                              }}
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-md border text-ink-faint',
                                effectiveShortlist.includes(row.id)
                                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                                  : 'border-line bg-white/60 hover:text-ink',
                              )}
                              aria-label={`${effectiveShortlist.includes(row.id) ? 'Remove' : 'Add'} ${row.name} from comparison`}
                            >
                              <Check className={cn('h-3 w-3', !effectiveShortlist.includes(row.id) && 'opacity-0')} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!filtered.length && (
                  <EmptyBlock
                    className="m-4"
                    title="No localities match this filter"
                    description="Clear the search field or choose a different category."
                  />
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              {selected && selectedSnapshot ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="label">Selected locality</p>
                      <h2 className="mt-1 font-display text-[20px] font-extrabold tracking-[-0.03em] text-ink">
                        {selected.name}
                      </h2>
                      <p className="flex items-center gap-1 text-[10.5px] font-medium text-ink-mute">
                        <MapPin className="h-3 w-3 text-brand-500" />
                        {selected.zone} · approximate reference point
                      </p>
                      {selectedSnapshot?.similarity_cluster?.label && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md border border-brand-200/60 bg-brand-50 px-2 py-0.5 text-[9.5px] font-bold text-brand-800">
                            <Sparkles className="h-3 w-3 text-brand-600" />
                            {selectedSnapshot.similarity_cluster.label}
                          </span>
                        </div>
                      )}
                    </div>
                    <CategoryGlyph icon={category?.icon} tint={category?.tint} size="md" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { label: 'Mapped places', value: formatNumber(selectedSnapshot.mapped_poi_count), icon: Store },
                      { label: 'Density / km²', value: selectedSnapshot.density_per_sq_km, icon: Activity },
                      {
                        label: 'Opportunity',
                        value: selectedScores?.opportunity_index ?? '—',
                        icon: TrendingUp,
                      },
                      {
                        label: 'Competition',
                        value: selectedScores?.competition_index ?? '—',
                        icon: Users,
                      },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-xl border border-line/60 bg-white/50 p-2.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                            {metric.label}
                          </p>
                          <metric.icon className="h-3 w-3 text-ink-faint" />
                        </div>
                        <p className="tabular mt-1 font-display text-[17px] font-extrabold text-ink">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[10px] font-semibold text-ink-mute">
                        <span>Data completeness</span>
                        <span>{selectedScores?.data_completeness ?? '—'}/100</span>
                      </div>
                      <Meter
                        value={selectedScores?.data_completeness ?? 0}
                        tone="sea"
                        height="xs"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-semibold text-ink-mute">
                        <span>Access index</span>
                        <span>{selectedScores?.access_index ?? '—'}/100</span>
                      </div>
                      <Meter value={selectedScores?.access_index ?? 0} tone="jade" height="xs" className="mt-1" />
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-line/60 bg-white/45 p-2.5 text-[10px] leading-relaxed text-ink-mute">
                    <p className="font-bold text-ink">GHMC circle activity</p>
                    <p className="mt-0.5">
                      {selectedSnapshot.activity_context?.circle_name ?? 'No circle assigned'} ·{' '}
                      {formatNumber(selectedSnapshot.activity_context?.circle_application_total_2022_2023 ?? 0)}{' '}
                      applications in 2022–23.
                    </p>
                    <p className="mt-1 text-ink-faint">
                      {formatNumber(selectedSnapshot.access_counts?.bus_stops_within_radius ?? 0)} bus stops ·{' '}
                      {formatNumber(selectedSnapshot.access_counts?.metro_stations_within_radius ?? 0)} metro
                      stations · concentration {selectedSnapshot.category_mix_hhi ?? '—'}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="btn-secondary h-8 px-2 text-[10px]"
                      onClick={() => navigate('/competitor-intelligence')}
                    >
                      <ShieldAlert className="h-3 w-3" />
                      Competitors
                    </button>
                    <button
                      type="button"
                      className="btn-secondary h-8 px-2 text-[10px]"
                      onClick={() => toggleShortlist(selected.id)}
                    >
                      <GitCompareArrows className="h-3 w-3" />
                      {effectiveShortlist.includes(selected.id) ? 'Remove' : 'Shortlist'}
                    </button>
                  </div>
                  <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">
                    {humanizeMarketText(selectedSnapshot.data_quality?.message ?? selectedSnapshot.data_notes?.[0])}
                  </p>
                </>
              ) : (
                <EmptyBlock className="h-full" title="Select a locality" description="Choose a row or map point." />
              )}
            </GlassPanel>
          </div>

          <div className="flex items-center justify-between gap-3 px-1">
            <SourceNote>
              Mapped OpenStreetMap places. Opportunity and competition are relative comparison indices, not forecasts.
            </SourceNote>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-brand-700"
            >
              Dashboard
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
