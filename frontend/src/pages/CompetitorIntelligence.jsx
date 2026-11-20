import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  MapPin,
  Search,
  ShieldAlert,
  Store,
  UsersRound,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Badge } from '../components/ui/Badge'
import { Meter } from '../components/ui/Meter'
import { Toast } from '../components/ui/Toast'
import { CategoryGlyph, tintHex } from '../components/ui/CategoryGlyph'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { EmptyBlock, ErrorBlock, LoadingBlock, SourceNote } from '../components/domain/DataState'
import { useMarket } from '../context/MarketContext'
import { useApiResource } from '../hooks/useApiResource'
import { marketApi } from '../lib/api'
import { cn, formatNumber } from '../lib/utils'

function hhiLabel(value) {
  if (value === null || value === undefined) return { label: 'Unavailable', tone: 'neutral', color: '#667085' }
  if (value < 1500) return { label: 'Fragmented mix', tone: 'jade', color: '#079455' }
  if (value < 2500) return { label: 'Moderate mix', tone: 'gold', color: '#DC6803' }
  return { label: 'Concentrated mix', tone: 'coral', color: '#D92D20' }
}

function distanceText(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function ConcentrationGauge({ hhi }) {
  const meta = hhiLabel(hhi)
  const normalized = Math.min(100, Math.max(0, ((hhi ?? 0) / 10000) * 100))
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const arc = circumference * 0.75
  return (
    <div className="relative mx-auto h-[152px] w-[172px]">
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#E5EAF1"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          transform="rotate(135 60 60)"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={meta.color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${arc * (normalized / 100)} ${circumference}`}
          transform="rotate(135 60 60)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)' }}
        />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          fill="#111827"
          fontSize="22"
          fontWeight="800"
          style={{ fontFamily: 'Manrope Variable, sans-serif', letterSpacing: '-0.04em' }}
        >
          {hhi ?? '—'}
        </text>
        <text x="60" y="71" textAnchor="middle" fill="#667085" fontSize="6" fontWeight="700" letterSpacing="0.08em">
          CONCENTRATION
        </text>
      </svg>
      <div className="absolute inset-x-0 bottom-2 text-center">
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold"
          style={{ backgroundColor: `${meta.color}14`, borderColor: `${meta.color}30`, color: meta.color }}
        >
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
        </span>
      </div>
    </div>
  )
}

export function CompetitorIntelligence() {
  const navigate = useNavigate()
  const {
    categories,
    categoryId,
    localityId,
    setLocalityId,
    category,
    locality,
    radius,
    dataReady,
    metaLoading,
    metaError,
    reloadMeta,
    business,
    isBusinessMode,
    clearBusiness,
  } = useMarket()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('distance')
  const [sortDirection, setSortDirection] = useState('asc')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const competitorResult = useApiResource(
    ({ signal }) =>
      isBusinessMode
        ? marketApi.getBusinessCompetitors(
            { osm_id: business.osm_id, category: categoryId, radius_m: radius, limit: 100 },
            { signal },
          )
        : marketApi.getCompetitors(
            { locality: localityId, category: categoryId, radius_m: radius, limit: 100 },
            { signal },
          ),
    [isBusinessMode, business?.osm_id, localityId, categoryId, radius],
    { enabled: dataReady },
  )

  const snapshotResult = useApiResource(
    ({ signal }) =>
      isBusinessMode
        ? marketApi.getBusinessContext(
            { osm_id: business.osm_id, category: categoryId, radius_m: radius },
            { signal },
          )
        : marketApi.getLocalityAnalysis(
            { locality: localityId, category: categoryId, radius_m: radius },
            { signal },
          ),
    [isBusinessMode, business?.osm_id, localityId, categoryId, radius],
    { enabled: dataReady },
  )

  const pressureResult = useApiResource(
    ({ signal }) =>
      marketApi.getAllLocalityAnalysis({ category: categoryId, radius_m: radius }, { signal }),
    [categoryId, radius],
    { enabled: dataReady },
  )

  const data = competitorResult.data
  const snapshot = snapshotResult.data
  const records = useMemo(() => data?.competitors ?? [], [data])
  const hhi = data?.category_mix_hhi
  const hhiMeta = hhiLabel(hhi)
  const catchment = data?.catchment

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase()
    return records
      .filter((record) => {
        if (!term) return true
        return [record.display_name, record.name, record.subtype, record.osm_value]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term))
      })
      .slice()
      .sort((a, b) => {
        const modifier = sortDirection === 'asc' ? 1 : -1
        if (sortKey === 'name') {
          return (a.display_name || '').localeCompare(b.display_name || '') * modifier
        }
        return ((a.distance_m ?? Infinity) - (b.distance_m ?? Infinity)) * modifier
      })
  }, [records, search, sortKey, sortDirection])

  const mixData = useMemo(
    () =>
      (data?.category_mix ?? []).map((item) => ({
        id: item.category_id,
        name: item.category_name,
        count: item.mapped_poi_count,
        share: item.share_pct,
      })),
    [data],
  )

  const pressureRows = useMemo(
    () =>
      (pressureResult.data?.localities ?? [])
        .map((item) => ({ ...item.locality, snapshot: item }))
        .sort(
          (a, b) =>
            (b.snapshot.scores.competition_index ?? -1) - (a.snapshot.scores.competition_index ?? -1),
        )
        .slice(0, 8),
    [pressureResult.data],
  )

  const setSort = (key) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection(key === 'distance' ? 'asc' : 'desc')
    }
  }

  const copyRecords = async () => {
    const header = 'Name,Type,Distance (m),Inside GHMC,Name quality'
    const rows = records.map((record) =>
      [
        csvCell(record.display_name || record.name || 'Unnamed outlet'),
        csvCell(record.subtype || record.osm_value || 'Mapped outlet'),
        typeof record.distance_m === 'number' && Number.isFinite(record.distance_m)
          ? Math.round(record.distance_m)
          : '',
        record.inside_ghmc ? 'Yes' : 'No',
        record.name_status === 'named' ? 'Named' : 'Unnamed',
      ].join(','),
    )
    try {
      await navigator.clipboard.writeText([header, ...rows].join('\n'))
      setToast(`Copied ${records.length} mapped competitor rows`)
    } catch {
      setToast('Clipboard unavailable in this browser')
    }
  }

  const sortIcon = (key) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-ink-faint" />
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-brand-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-brand-600" />
    )
  }

  if (metaLoading || competitorResult.loading || snapshotResult.loading || pressureResult.loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Competitive landscape" title="Competitor intelligence" location={locality?.name} />
        <LoadingBlock label="Loading nearby competitor rows and market context…" />
      </div>
    )
  }

  const error = metaError || competitorResult.error || snapshotResult.error || pressureResult.error
  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Competitive landscape" title="Competitor intelligence" location={locality?.name} />
        <ErrorBlock
          error={error}
          onRetry={() => {
            if (metaError) reloadMeta()
            else if (competitorResult.error) competitorResult.reload()
            else if (snapshotResult.error) snapshotResult.reload()
            else pressureResult.reload()
          }}
        />
      </div>
    )
  }

  const density = catchment?.area_km2
    ? Math.round(((data?.competitor_count ?? 0) / catchment.area_km2) * 100) / 100
    : null
  const categoryShare = mixData.find((item) => item.id === categoryId)?.share

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Competitive landscape"
        title="Competitor intelligence"
        description="Explore mapped outlets in the selected category and catchment. Ratings, sales, revenue, market share, and closure status are not available and are not estimated."
        location={`${isBusinessMode ? business.name : locality.name} · ${category.name}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => navigate('/market-explorer')}>
              <MapPin className="h-4 w-4" />
              Explore localities
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/risk-analysis')}>
              <ShieldAlert className="h-4 w-4" />
              Assess risk
            </button>
          </>
        }
      />

      <GlassPanel className="flex flex-wrap items-center gap-3 p-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <CategoryGlyph icon={category.icon} tint={category.tint} size="md" />
          <div className="min-w-0 leading-tight">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Analysis scope</p>
            <p className="max-w-[220px] truncate text-[12px] font-bold text-ink">
              {isBusinessMode ? business.name : locality?.name ?? 'Hyderabad'}
            </p>
          </div>
        </div>
        <div className="hidden h-7 w-px bg-line sm:block" />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip">{category.name}</span>
          <span className="chip">
            <MapPin className="h-3 w-3 text-brand-500" />
            {isBusinessMode ? business.nearest_locality_name : locality?.name}
          </span>
          <span className="chip">{radius / 1000} km radius</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[9.5px] font-semibold text-ink-mute">
          {isBusinessMode && (
            <button
              type="button"
              onClick={clearBusiness}
              className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-brand-800"
            >
              <Store className="h-3 w-3" />
              Clear business focus
              <span className="text-brand-500">×</span>
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-sea-700">
            <span className="h-1.5 w-1.5 rounded-full bg-sea-500" />
            Mapped public data
          </span>
        </div>
      </GlassPanel>

      {isBusinessMode && (
        <div className="rounded-xl border border-brand-100/70 bg-brand-50/40 px-3.5 py-2.5 text-[10.5px] leading-relaxed text-brand-900/80">
          Analysis centre is the mapped coordinate for <strong>{business.name}</strong>. The selected business is
          excluded from the competitor count. Nearest locality:{' '}
          <strong>{business.nearest_locality_name}</strong>
          {business.nearest_locality_distance_m !== null &&
          business.nearest_locality_distance_m !== undefined &&
          Number.isFinite(Number(business.nearest_locality_distance_m))
            ? ` (${Math.round(Number(business.nearest_locality_distance_m))} m away)`
            : ''}.
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={isBusinessMode ? 'Other nearby outlets' : 'Nearby competitors'}
          value={formatNumber(data?.competitor_count ?? 0)}
          icon={UsersRound}
          tone="coral"
          footnote={`${radius / 1000} km mapped-category count`}
        />
        <MetricCard
          label="Category density"
          value={density !== null ? `${density}/km²` : '—'}
          icon={MapPin}
          tone="gold"
          footnote={`Circular area ${formatNumber(catchment?.area_km2 ?? 0)} km²`}
        />
        <MetricCard
          label="Category share"
          value={categoryShare !== undefined ? `${categoryShare}%` : '—'}
          icon={Store}
          tone="brand"
          footnote="Selected category among all mapped places in catchment"
        />
        <MetricCard
          label="Competition index"
          value={snapshot?.scores?.competition_index ?? '—'}
          icon={ShieldAlert}
          tone="sea"
          footnote="Relative to the highest locality count at this radius"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Distribution"
            title="Catchment category mix"
            description={`All mapped business categories inside the ${radius / 1000} km catchment, ranked by count.`}
            icon={Store}
            action={
              <span className="chip">
                {formatNumber(snapshot?.all_mapped_poi_count_in_catchment ?? 0)} mapped places
              </span>
            }
          />
          <div className="mt-4 h-[286px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mixData}
                layout="vertical"
                margin={{ top: 0, right: 26, bottom: 0, left: 6 }}
                barSize={13}
              >
                <CartesianGrid strokeDasharray="3 5" stroke="#E5EAF1" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#667085', fontWeight: 600 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={112}
                  tick={{ fontSize: 10.5, fill: '#475467', fontWeight: 600 }}
                />
                <Tooltip
                  content={
                    <ChartTooltip effect="dot" />
                  }
                />
                <Bar dataKey="count" name="Mapped places" radius={[0, 5, 5, 0]}>
                  {mixData.map((entry) => {
                    const categoryMeta = categories.find((item) => item.id === entry.id)
                    return (
                      <Cell
                        key={entry.id}
                        fill={tintHex[categoryMeta?.tint] ?? '#0A0D12'}
                        fillOpacity={entry.id === categoryId ? 0.95 : 0.3}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <p className="text-[10px] font-medium text-ink-mute">
              <span className="font-bold text-ink">{category.name}</span> accounts for{' '}
              <span className="font-bold text-ink">{categoryShare ?? '—'}%</span> of{' '}
              {formatNumber(snapshot?.all_mapped_poi_count_in_catchment ?? 0)} mapped places in this catchment.
            </p>
            <SourceNote>Counts overlap across localities and are not additive.</SourceNote>
          </div>
        </GlassPanel>

        <GlassPanel className="flex flex-col p-5">
          <PanelHeader
            eyebrow="Concentration"
            title="Category-mix concentration"
            description="Concentration across mapped business categories, not revenue or market share."
            icon={Info}
          />
          <div className="mt-2">
            <ConcentrationGauge hhi={hhi} />
          </div>
          <div className="mt-1 space-y-1.5">
            {mixData.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tintHex[categories.find((entry) => entry.id === item.id)?.tint] ?? '#667085' }}
                />
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-ink-soft">
                  {item.name}
                </span>
                <span className="tabular text-[10px] font-bold text-ink">{item.share}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-xl border border-line/60 bg-white/40 p-2.5 text-[9.5px] leading-relaxed text-ink-mute">
            {hhi === null || hhi === undefined
              ? 'Not enough mapped category data to compute a concentration score.'
              : hhiMeta.label === 'Fragmented mix'
                ? 'Mapped supply is spread across categories. This does not mean demand is unmet or that a new outlet will succeed.'
                : hhiMeta.label === 'Moderate mix'
                  ? 'A few categories make up a larger share of mapped supply. Use the competitor table for category-level detail.'
                  : 'One or more categories dominate mapped supply. This is a composition indicator, not a measure of market power.'}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-line/60 pt-3 text-[9.5px] font-medium text-ink-faint">
            <span>Concentration range 0–10,000</span>
            <span className="font-bold text-ink-mute">{hhiMeta.label}</span>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.5fr]">
        <GlassPanel className="min-w-0 p-5">
          <PanelHeader
            eyebrow="Intensity"
            title="Locality pressure"
            description="Competition index for the same category and radius."
            icon={ShieldAlert}
          />
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {pressureRows.map((row) => {
              const isSelected = row.id === (isBusinessMode ? business.nearest_locality_id : localityId)
              const score = row.snapshot.scores.competition_index
              const color = score === null ? '#667085' : score >= 70 ? '#D92D20' : score >= 45 ? '#DC6803' : '#079455'
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setLocalityId(row.id)}
                  className={cn(
                    'group rounded-xl border p-2.5 text-left transition-all duration-200',
                    isSelected
                      ? 'border-brand-200 bg-brand-50/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                      : 'border-line/60 bg-white/40 hover:border-line-strong hover:bg-white/75',
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate text-[10.5px] font-bold text-ink">{row.name}</p>
                    {isSelected && (
                      <span className="rounded bg-brand-600 px-1 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.06em] text-white">
                        near
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="tabular text-[17px] font-extrabold leading-none" style={{ color }}>
                      {score ?? '—'}
                    </span>
                    <span className="text-[8.5px] font-semibold text-ink-faint">/100</span>
                  </div>
                  <Meter value={score ?? 0} tone="coral" height="xs" className="mt-1.5" />
                  <div className="mt-1 flex items-center justify-between text-[8px] font-bold">
                    <span style={{ color }}>
                      {score === null ? 'Unavailable' : score >= 70 ? 'Crowded' : score >= 45 ? 'Competitive' : 'Lighter'}
                    </span>
                    <span className="text-ink-faint">{formatNumber(row.snapshot.mapped_poi_count)} mapped</span>
                  </div>
                </button>
              )
            })}
          </div>
          {!pressureRows.length && (
            <EmptyBlock className="mt-3" title="No locality pressure data" description="Try another category." />
          )}
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line/60 bg-white/40 p-2.5">
            <Info className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            <p className="text-[9px] leading-relaxed text-ink-mute">
              The competition index is relative to the highest count at this radius. It is not a saturation or
              demand forecast.
            </p>
          </div>
        </GlassPanel>

        <GlassPanel className="flex min-w-0 flex-col p-5">
          <PanelHeader
            eyebrow="Mapped records"
            title="Nearby competitor list"
            description={
              isBusinessMode
                ? 'Mapped outlets in this category within the selected radius, excluding the selected business.'
                : 'Mapped outlets in this category within the selected radius.'
            }
            icon={UsersRound}
            action={
              <button type="button" onClick={copyRecords} className="btn-secondary h-8 px-2.5 text-[10.5px]">
                <Copy className="h-3 w-3" />
                Copy CSV
              </button>
            }
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter mapped outlets…"
                className="field h-8 rounded-lg pl-8 text-[11.5px]"
              />
            </div>
            <span className="text-[9.5px] font-semibold text-ink-faint">
              {filteredRecords.length} of {records.length} returned
            </span>
          </div>

          <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-gold-100 bg-gold-50/60 px-2.5 py-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
            <p className="text-[9px] leading-relaxed text-gold-700">
              {formatNumber(data?.unnamed_competitor_count ?? 0)} unnamed mapped outlets
              {data?.unnamed_competitor_share_pct !== null && data?.unnamed_competitor_share_pct !== undefined
                ? ` (${data.unnamed_competitor_share_pct}% of rows)`
                : ''}
              . Missing names are shown explicitly; no ratings or sales are inferred.
            </p>
          </div>

          <div className="mt-2.5 min-w-0 flex-1 overflow-auto scroll-slim">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
                <tr className="border-b border-line">
                  <th className="pb-2 pl-1.5 pr-2 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    <button
                      type="button"
                      onClick={() => setSort('name')}
                      className="flex items-center gap-1 hover:text-ink"
                    >
                      Mapped outlet {sortIcon('name')}
                    </button>
                  </th>
                  <th className="px-2 pb-2 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Type
                  </th>
                  <th className="px-2 pb-2">
                    <button
                      type="button"
                      onClick={() => setSort('distance')}
                      className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
                    >
                      Distance {sortIcon('distance')}
                    </button>
                  </th>
                  <th className="px-2 pb-2 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Ward / scope
                  </th>
                  <th className="px-2 pb-2 text-right text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Name data
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.osm_id}
                    className="border-b border-line/50 transition-colors last:border-0 hover:bg-white/55"
                  >
                    <td className="max-w-[230px] py-2.5 pl-1.5 pr-2">
                      <p className={cn('truncate text-[11px] font-bold', record.name_status === 'named' ? 'text-ink' : 'text-ink-mute italic')}>
                        {record.display_name || record.name || 'Unnamed mapped outlet'}
                      </p>
                      <p className="truncate text-[9px] font-medium text-ink-faint">
                        {record.name_status === 'named' ? 'Community-mapped record' : 'Name missing in source'}
                      </p>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="text-[10px] font-semibold text-ink-soft">
                        {record.subtype || record.osm_value || 'Mapped outlet'}
                      </span>
                    </td>
                    <td className="tabular px-2 py-2.5 text-[10.5px] font-semibold text-ink-soft">
                      {distanceText(record.distance_m)}
                    </td>
                    <td className="px-2 py-2.5 text-[10px] font-medium text-ink-mute">
                      {record.ward_id ?? 'Not assigned'} · {record.inside_ghmc ? 'GHMC' : 'Outside GHMC'}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <Badge tone={record.name_status === 'named' ? 'jade' : 'neutral'} className="text-[8.5px]">
                        {record.name_status === 'named' ? 'Named' : 'Unnamed'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredRecords.length && (
              <EmptyBlock
                className="m-3"
                title={records.length ? 'No rows match this filter' : 'No mapped competitors in this catchment'}
                description={
                  records.length
                    ? 'Clear the filter or choose a different category.'
                    : 'Try a larger radius or another locality. Absence of mapped outlets is not proof of low competition.'
                }
              />
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5">
            <p className="text-[9px] font-medium text-ink-faint">
              Straight-line distances from{' '}
              {data?.analysis_center?.label ?? 'the analysis centre'} · up to {data?.limit ?? 100} closest mapped outlets
            </p>
            <button
              type="button"
              onClick={() => navigate('/market-assistant')}
              className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
            >
              Ask about this landscape
            </button>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-2 px-1 md:grid-cols-3">
        {(data?.data_notes ?? []).slice(0, 3).map((note) => (
          <SourceNote key={note}>{note}</SourceNote>
        ))}
      </div>

      <Toast message={toast} onClose={closeToast} />
    </div>
  )
}
