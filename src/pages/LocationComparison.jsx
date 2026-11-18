import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Copy,
  Crown,
  GitCompareArrows,
  Info,
  MapPin,
  RotateCcw,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { Select } from '../components/ui/Select'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { Meter } from '../components/ui/Meter'
import { Toast } from '../components/ui/Toast'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { EmptyBlock, ErrorBlock, LoadingBlock, SourceNote } from '../components/domain/DataState'
import { useMarket } from '../context/MarketContext'
import { useApiResource } from '../hooks/useApiResource'
import { marketApi } from '../lib/api'
import { cn, formatNumber } from '../lib/utils'

const seriesColors = ['#4946B4', '#14958C', '#D0922B', '#DC6A5F']

const metricRows = [
  {
    key: 'mapped',
    label: 'Mapped POIs',
    hint: 'Selected category in catchment',
    value: (entry) => entry.mapped_poi_count,
    format: (entry) => formatNumber(entry.mapped_poi_count),
    meter: (entry) => Math.min(100, entry.mapped_poi_count),
  },
  {
    key: 'density',
    label: 'Density',
    hint: 'Mapped category POIs per km²',
    value: (entry) => entry.density_per_sq_km,
    format: (entry) => `${entry.density_per_sq_km}/km²`,
    meter: (entry) => Math.min(100, entry.density_per_sq_km * 4),
  },
  {
    key: 'share',
    label: 'Category share',
    hint: 'Share of mapped POIs in category',
    value: (entry) => entry.category_share_of_mapped_pct,
    format: (entry) => `${entry.category_share_of_mapped_pct}%`,
    meter: (entry) => entry.category_share_of_mapped_pct,
  },
  {
    key: 'opportunity',
    label: 'Opportunity index',
    hint: 'Higher is relatively stronger',
    best: 'max',
    value: (entry) => entry.scores.opportunity_index,
    format: (entry) => (entry.scores.opportunity_index === null ? '—' : `${entry.scores.opportunity_index}/100`),
    meter: (entry) => entry.scores.opportunity_index ?? 0,
    tone: 'jade',
  },
  {
    key: 'competition',
    label: 'Competition index',
    hint: 'Higher means more mapped supply',
    best: 'min',
    value: (entry) => entry.scores.competition_index,
    format: (entry) => (entry.scores.competition_index === null ? '—' : `${entry.scores.competition_index}/100`),
    meter: (entry) => entry.scores.competition_index ?? 0,
    tone: 'coral',
  },
  {
    key: 'activity',
    label: 'GHMC activity',
    hint: 'Circle-level 2022–23 applications',
    best: 'max',
    value: (entry) => entry.scores.activity_index,
    format: (entry) => (entry.scores.activity_index === null ? '—' : `${entry.scores.activity_index}/100`),
    meter: (entry) => entry.scores.activity_index ?? 0,
    tone: 'sea',
  },
  {
    key: 'access',
    label: 'Access index',
    hint: 'Bus, metro, and assigned-ward school signal',
    best: 'max',
    value: (entry) => entry.scores.access_index,
    format: (entry) => `${entry.scores.access_index}/100`,
    meter: (entry) => entry.scores.access_index,
    tone: 'brand',
  },
  {
    key: 'complete',
    label: 'Data completeness',
    hint: 'Mapped-data support and coverage',
    best: 'max',
    value: (entry) => entry.scores.data_completeness,
    format: (entry) => `${entry.scores.data_completeness}/100`,
    meter: (entry) => entry.scores.data_completeness,
    tone: 'gold',
  },
]

export function LocationComparison() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    categories,
    localities,
    category,
    categoryId,
    localityId,
    setCategoryId,
    setLocalityId,
    radius,
    setRadius,
    radiusOptions,
    dataReady,
    metaLoading,
    metaError,
    reloadMeta,
  } = useMarket()
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const queryIds = useMemo(() => {
    const raw = searchParams.get('localities')
    if (!raw) return []
    return [...new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 4)
  }, [searchParams])

  const [selectedIds, setSelectedIds] = useState(queryIds)

  const effectiveIds = useMemo(() => {
    if (metaLoading || !localities.length) return selectedIds
    const validIds = new Set(localities.map((item) => item.id))
    const next = selectedIds.filter((id) => validIds.has(id))
    if (!next.length && localityId && validIds.has(localityId)) next.push(localityId)
    for (const item of localities) {
      if (next.length >= 2) break
      if (!next.includes(item.id)) next.push(item.id)
    }
    return next.slice(0, 4)
  }, [selectedIds, localities, localityId, metaLoading])

  useEffect(() => {
    if (effectiveIds.length < 2) return
    const next = effectiveIds.join(',')
    if (searchParams.get('localities') !== next) {
      setSearchParams({ localities: next }, { replace: true })
    }
  }, [effectiveIds, searchParams, setSearchParams])

  const comparison = useApiResource(
    ({ signal }) =>
      marketApi.compareLocalities(
        { localities: effectiveIds, category: categoryId, radius_m: radius },
        { signal },
      ),
    [effectiveIds, categoryId, radius],
    { enabled: dataReady && effectiveIds.length >= 2 },
  )

  const entries = useMemo(() => comparison.data?.localities ?? [], [comparison.data])
  const winner = useMemo(
    () =>
      entries
        .slice()
        .filter((entry) => entry.scores.opportunity_index !== null)
        .sort((a, b) => b.scores.opportunity_index - a.scores.opportunity_index)[0] ?? null,
    [entries],
  )

  const radarData = useMemo(() => {
    const axes = [
      { subject: 'Opportunity', get: (entry) => entry.scores.opportunity_index },
      {
        subject: 'Low competition',
        get: (entry) =>
          entry.scores.competition_index === null ? null : 100 - entry.scores.competition_index,
      },
      { subject: 'Activity', get: (entry) => entry.scores.activity_index },
      { subject: 'Access', get: (entry) => entry.scores.access_index },
      { subject: 'Data', get: (entry) => entry.scores.data_completeness },
    ]
    return axes.map((axis) => {
      const point = { subject: axis.subject }
      entries.forEach((entry) => {
        const value = axis.get(entry)
        point[entry.locality.id] = value === null || value === undefined ? null : Math.round(value)
      })
      return point
    })
  }, [entries])

  const barData = entries.map((entry) => ({
    name: entry.locality.name,
    Opportunity: entry.scores.opportunity_index,
    Competition: entry.scores.competition_index,
  }))

  const bestValue = (row) => {
    if (!row.best) return null
    const values = entries.map((entry) => row.value(entry)).filter((value) => value !== null && value !== undefined)
    if (!values.length) return null
    return row.best === 'max' ? Math.max(...values) : Math.min(...values)
  }

  const addLocality = (id) => {
    setSelectedIds((current) => {
      const base = current.length ? current : effectiveIds
      if (base.includes(id) || base.length >= 4) return base
      return [...base, id]
    })
  }

  const removeLocality = (id) => {
    setSelectedIds((current) => {
      const base = current.length ? current : effectiveIds
      return base.length <= 2 ? base : base.filter((entry) => entry !== id)
    })
  }

  const resetSelection = () => {
    const next = [localityId, ...localities.map((item) => item.id)].filter(
      (id, index, list) => id && list.indexOf(id) === index,
    )
    setSelectedIds(next.slice(0, 3))
  }

  const copyComparison = async () => {
    const header = ['Metric', ...entries.map((entry) => entry.locality.name)].join(',')
    const rows = metricRows.map((row) => [row.label, ...entries.map((entry) => row.format(entry))].join(','))
    try {
      await navigator.clipboard.writeText(
        [
          `MarketMinds locality comparison — ${category.name}`,
          `Radius: ${radius / 1000} km. Mapped OpenStreetMap data.`,
          header,
          ...rows,
        ].join('\n'),
      )
      setToast('Comparison copied with source limitations')
    } catch {
      setToast('Clipboard unavailable in this browser')
    }
  }

  if (metaLoading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Spatial decisions" title="Compare localities" />
        <LoadingBlock label="Loading locality metadata…" />
      </div>
    )
  }

  const pageError = metaError || comparison.error
  if (pageError) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Spatial decisions" title="Compare localities" />
        <ErrorBlock
          error={pageError}
          onRetry={() => {
            if (metaError) reloadMeta()
            else comparison.reload()
          }}
        />
      </div>
    )
  }

  const available = localities.filter((item) => !effectiveIds.includes(item.id))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Spatial decisions"
        title="Compare localities, side by side"
        description="Hold the category and radius constant, then compare mapped supply, competition, activity, access, and data completeness. There is no rent benchmark in the dataset."
        location={`${category.name} · ${radius / 1000} km`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={resetSelection}>
              <RotateCcw className="h-4 w-4 text-ink-mute" />
              Reset selection
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4" />
              Ask the assistant
            </button>
          </>
        }
      />

      <GlassPanel className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/45 py-1 pl-1 pr-3">
            <CategoryGlyph icon={category.icon} tint={category.tint} size="md" clay />
            <div className="leading-tight">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Category held constant</p>
              <p className="text-[11.5px] font-extrabold text-ink">{category.name}</p>
            </div>
          </div>
          <div className="min-w-[180px] max-w-[240px] flex-1">
            <Select
              value={categoryId ?? undefined}
              onChange={setCategoryId}
              size="sm"
              searchable
              ariaLabel="Comparison category"
              options={categories.map((item) => ({
                value: item.id,
                label: item.name,
                hint: `${formatNumber(item.mapped_poi_count ?? 0)} mapped POIs`,
                icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
              }))}
            />
          </div>
          <div className="min-w-[140px] max-w-[180px] flex-1">
            <Select
              value={String(radius)}
              onChange={(value) => setRadius(Number(value))}
              size="sm"
              ariaLabel="Comparison radius"
              options={radiusOptions.map((value) => ({
                value: String(value),
                label: `${value / 1000} km radius`,
              }))}
            />
          </div>

          <div className="hidden h-7 w-px bg-line/80 md:block" />

          <div className="flex flex-wrap items-center gap-1.5">
            {effectiveIds.map((id) => {
              const item = localities.find((entry) => entry.id === id)
              if (!item) return null
              const index = effectiveIds.indexOf(id)
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/60 py-1 pl-2 pr-1 text-[10.5px] font-bold text-ink-soft"
                  style={{ borderColor: `${seriesColors[index]}35` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seriesColors[index] }} />
                  {item.name}
                  <button
                    type="button"
                    onClick={() => removeLocality(id)}
                    disabled={effectiveIds.length <= 2}
                    className="rounded-full p-0.5 text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-20"
                    aria-label={`Remove ${item.name}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select
              value=""
              onChange={addLocality}
              size="sm"
              searchable
              placeholder={effectiveIds.length >= 4 ? 'Maximum 4 selected' : '+ Add locality'}
              className="w-[168px]"
              menuClassName="w-[250px]"
              ariaLabel="Add locality to comparison"
              options={available.map((item) => ({
                value: item.id,
                label: item.name,
                hint: `${item.zone}${item.circle_name ? ` · ${item.circle_name}` : ''}`,
                icon: <MapPin className="h-3.5 w-3.5 text-brand-500" />,
              }))}
            />
            <button type="button" onClick={copyComparison} className="icon-button" aria-label="Copy comparison">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </GlassPanel>

      {comparison.loading ? (
        <LoadingBlock label="Comparing real locality snapshots…" />
      ) : entries.length < 2 ? (
        <EmptyBlock
          title="Select at least two localities"
          description="Use the add control above to build a shortlist of two to four localities."
        />
      ) : (
        <>
          {winner && (
            <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(110deg,rgba(239,250,244,0.9),rgba(255,255,255,0.85)_48%,rgba(238,249,247,0.82))] p-5 shadow-glass">
              <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border border-jade-200/40" />
              <div className="pointer-events-none absolute -right-2 -top-10 h-36 w-36 rounded-full border border-jade-200/40" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex items-start gap-3">
                  <span className="clay-tile flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-gold-600">
                    <Crown className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="label">Highest relative opportunity index</p>
                    <h2 className="mt-0.5 font-display text-[19px] font-extrabold tracking-[-0.03em] text-ink">
                      {winner.locality.name} leads this shortlist
                    </h2>
                    <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-ink-mute">
                      Opportunity index {winner.scores.opportunity_index}/100 with competition index{' '}
                      {winner.scores.competition_index ?? '—'}/100. This is a directional comparison of mapped
                      signals, not an investment recommendation.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                  <div className="rounded-xl border border-white/80 bg-white/65 px-3 py-2 text-center">
                    <p className="tabular text-[19px] font-extrabold leading-none text-jade-700">
                      {winner.scores.opportunity_index}
                    </p>
                    <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                      Opportunity
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-white/65 px-3 py-2 text-center">
                    <p className="tabular text-[19px] font-extrabold leading-none text-coral-600">
                      {winner.scores.competition_index ?? '—'}
                    </p>
                    <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                      Competition
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-white/65 px-3 py-2 text-center">
                    <p className="tabular text-[19px] font-extrabold leading-none text-ink">
                      {formatNumber(winner.mapped_poi_count)}
                    </p>
                    <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                      Mapped
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalityId(winner.locality.id)}
                    className="btn-primary h-9 px-3 text-[11px]"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Set as focus
                  </button>
                </div>
              </div>
            </div>
          )}

          <GlassPanel className="overflow-hidden p-5">
            <PanelHeader
              eyebrow="Side by side"
              title="Locality scorecard"
              description={`${entries.length} localities compared for ${category.name}. Best available value in each ranked row is highlighted.`}
              icon={GitCompareArrows}
              action={
                <div className="flex items-center gap-2">
                  <span className="chip hidden sm:inline-flex">
                    <Info className="h-3 w-3" />
                    Mapped-data model
                  </span>
                  <button type="button" onClick={copyComparison} className="btn-secondary h-8 px-2.5 text-[10.5px]">
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
              }
            />

            <div className="mt-4 overflow-x-auto scroll-slim">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-[164px] pb-3 pl-2 pr-3 text-left text-[8.5px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                      Metric
                    </th>
                    {entries.map((entry, index) => {
                      const isFocus = entry.locality.id === localityId
                      const isWinner = winner?.locality.id === entry.locality.id
                      return (
                        <th
                          key={entry.locality.id}
                          className={cn(
                            'rounded-t-xl border-b border-line/70 px-2.5 pb-3 pt-2 text-left',
                            isFocus && 'bg-brand-50/35',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-[11.5px] font-extrabold text-ink">
                                {isWinner && <Crown className="h-3 w-3 shrink-0 text-gold-600" />}
                                {entry.locality.name}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-[8.5px] font-semibold text-ink-faint">
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: seriesColors[index] }}
                                />
                                {entry.locality.zone}
                                {isFocus && <span className="text-brand-700">· focus</span>}
                              </p>
                            </div>
                            {effectiveIds.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeLocality(entry.locality.id)}
                                className="rounded p-0.5 text-ink-faint transition-colors hover:bg-coral-50 hover:text-coral-600"
                                aria-label={`Remove ${entry.locality.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="tabular font-display text-[23px] font-extrabold leading-none tracking-[-0.04em] text-ink">
                              {entry.scores.opportunity_index ?? '—'}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                              opportunity
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row, rowIndex) => {
                    const best = bestValue(row)
                    return (
                      <tr
                        key={row.key}
                        className={cn('border-b border-line/50 last:border-0', rowIndex % 2 === 1 && 'bg-white/20')}
                      >
                        <td className="py-2.5 pl-2 pr-3">
                          <p className="text-[10.5px] font-bold text-ink">{row.label}</p>
                          <p className="mt-0.5 text-[8.5px] font-medium text-ink-faint">{row.hint}</p>
                        </td>
                        {entries.map((entry) => {
                          const value = row.value(entry)
                          const isBest = row.best && best !== null && value === best
                          const isFocus = entry.locality.id === localityId
                          return (
                            <td
                              key={entry.locality.id}
                              className={cn('px-2.5 py-2.5', isFocus && 'bg-brand-50/30', isBest && 'bg-jade-50/40')}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'tabular text-[11.5px] font-extrabold',
                                    isBest ? 'text-jade-700' : 'text-ink',
                                  )}
                                >
                                  {row.format(entry)}
                                </span>
                                {isBest && (
                                  <span className="rounded bg-jade-100/80 px-1 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.06em] text-jade-700">
                                    best
                                  </span>
                                )}
                              </div>
                              <Meter
                                value={row.meter(entry)}
                                tone={isBest ? 'jade' : row.tone ?? 'brand'}
                                height="xs"
                                className="mt-1.5 max-w-[130px]"
                              />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
              <p className="flex items-center gap-1.5 text-[9px] font-medium text-ink-faint">
                <Info className="h-3 w-3" />
                Catchments overlap. Counts are not additive and are not city totals.
              </p>
              <button
                type="button"
                onClick={() => navigate('/risk-analysis')}
                className="text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
              >
                Run a risk assessment
              </button>
            </div>
          </GlassPanel>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <GlassPanel className="p-5">
              <PanelHeader
                eyebrow="Trade-offs"
                title="Normalised profile comparison"
                description="Five model dimensions. Larger coverage indicates a relatively stronger position."
                icon={TrendingUp}
                action={
                  <div className="flex items-center gap-2">
                    {entries.map((entry, index) => (
                      <span key={entry.locality.id} className="flex items-center gap-1 text-[8.5px] font-bold text-ink-mute">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: seriesColors[index] }}
                        />
                        <span className="hidden lg:inline">{entry.locality.name}</span>
                      </span>
                    ))}
                  </div>
                }
              />
              <div className="mt-2 h-[310px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="#E5DED1" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9.5, fill: '#6B7285', fontWeight: 600 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip formatter={(value) => `${Math.round(value)}/100`} />} />
                    {entries.map((entry, index) => (
                      <Radar
                        key={entry.locality.id}
                        name={entry.locality.name}
                        dataKey={entry.locality.id}
                        stroke={seriesColors[index]}
                        fill={seriesColors[index]}
                        fillOpacity={0.09}
                        strokeWidth={2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5">
              <PanelHeader
                eyebrow="Balance"
                title="Opportunity vs competition"
                description="The model favours relatively high opportunity and lower mapped competition."
                icon={GitCompareArrows}
              />
              <div className="mt-3 h-[252px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: '#6B7285', fontWeight: 600 }}
                      interval={0}
                      dy={5}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      tick={{ fontSize: 9.5, fill: '#8B90A2', fontWeight: 600 }}
                    />
                    <Tooltip content={<ChartTooltip formatter={(value) => `${value}/100`} />} />
                    <Legend
                      wrapperStyle={{ fontSize: 9, fontWeight: 600, color: '#6B7285' }}
                      iconType="circle"
                      iconSize={6}
                    />
                    <Bar dataKey="Opportunity" fill="#1D9B6A" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="Competition" fill="#DC6A5F" radius={[4, 4, 0, 0]} barSize={18} fillOpacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 rounded-xl border border-brand-100/70 bg-brand-50/40 p-3">
                <p className="text-[10px] font-bold text-brand-900">Reading the chart</p>
                <p className="mt-0.5 text-[9px] leading-relaxed text-ink-mute">
                  A locality can rank well on opportunity while still carrying relatively high mapped competition.
                  Check the access and data-completeness rows before lowering uncertainty.
                </p>
              </div>
            </GlassPanel>
          </div>

          <div className="grid gap-2 px-1 md:grid-cols-3">
            {(comparison.data?.data_notes ?? []).slice(0, 3).map((note) => (
              <SourceNote key={note}>{note}</SourceNote>
            ))}
            {comparison.data?.comparison_note && <SourceNote>{comparison.data.comparison_note}</SourceNote>}
          </div>
        </>
      )}

      <Toast message={toast} onClose={closeToast} />
    </div>
  )
}
