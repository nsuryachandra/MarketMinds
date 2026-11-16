import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useMarket } from '../context/MarketContext'
import { categories } from '../data/categories'
import { localities } from '../data/localities'
import { getComparisonMetrics, getNearbyLocalities } from '../lib/analytics'

import { cn, formatCompactINR, formatNumber, signed } from '../lib/utils'

const seriesColors = ['#4946B4', '#14958C', '#D0922B', '#DC6A5F']












const metricRows = [
  {
    key: 'suitability',
    label: 'Location suitability',
    hint: 'Overall category fit',
    value: (m) => m.suitability,
    format: (m) => `${m.suitability}/100`,
    best: 'max',
    meter: (m) => m.suitability,
    tone: 'jade',
  },
  {
    key: 'competition',
    label: 'Competition intensity',
    hint: 'Lower is better',
    value: (m) => m.competition,
    format: (m) => `${m.competition}/100`,
    best: 'min',
    meter: (m) => m.competition,
    tone: 'coral',
  },
  {
    key: 'density',
    label: 'Competitor density',
    hint: 'Category outlets per km²',
    value: (m) => m.snapshot.density,
    format: (m) => `${m.snapshot.density}/km²`,
    best: 'min',
    meter: (m) => Math.min(100, m.snapshot.density * 5),
    tone: 'gold',
  },
  {
    key: 'growth',
    label: 'Market growth',
    hint: 'Locality + category blend',
    value: (m) => m.growth,
    format: (m) => signed(m.growth),
    best: 'max',
    meter: (m) => Math.min(100, Math.max(0, m.growth * 4.2)),
    tone: 'sea',
  },
  {
    key: 'activity',
    label: 'Business activity',
    hint: 'Composite activity index',
    value: (m) => m.activity,
    format: (m) => `${m.activity}/100`,
    best: 'max',
    meter: (m) => m.activity,
    tone: 'brand',
  },
  {
    key: 'risk',
    label: 'Estimated risk',
    hint: 'Lower is better',
    value: (m) => m.risk,
    format: (m) => `${m.risk}/100`,
    best: 'min',
    meter: (m) => m.risk,
    tone: 'coral',
  },
  {
    key: 'affordability',
    label: 'Rental affordability',
    hint: 'Based on local rent index',
    value: (m) => m.affordability,
    format: (m) => `${m.affordability}/100`,
    best: 'max',
    meter: (m) => m.affordability,
    tone: 'jade',
  },
  {
    key: 'rent',
    label: 'Rent index',
    hint: '₹ per sq ft, monthly',
    value: (m) => m.rentIndex,
    format: (m) => `₹${m.rentIndex}/sq ft`,
    best: 'min',
    meter: (m) => (m.rentIndex / 42) * 100,
    tone: 'gold',
  },
]

export function LocationComparison() {
  const navigate = useNavigate()
  const { category, categoryId, localityId, setCategoryId, setLocalityId } = useMarket()
  const initialSelection = useCallback(() => {
    const nearby = getNearbyLocalities(localityId, 4).map((item) => item.id)
    return [localityId, ...nearby.filter((id) => id !== localityId)].slice(0, 3)
  }, [localityId])

  const [selectedIds, setSelectedIds] = useState(initialSelection)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])
  const previousContext = useRef(localityId)

  useEffect(() => {
    if (previousContext.current === localityId) return
    previousContext.current = localityId
    setSelectedIds((current) => {
      if (current.includes(localityId)) return current
      if (current.length >= 4) return [...current.slice(0, 3), localityId]
      return [...current, localityId]
    })
  }, [localityId])

  const metrics = useMemo(
    () => selectedIds.map((id) => getComparisonMetrics(categoryId, id)),
    [categoryId, selectedIds],
  )

  const winner = useMemo(
    () => metrics.slice().sort((a, b) => b.suitability - a.suitability)[0],
    [metrics],
  )

  const radarData = useMemo(() => {
    const axes = [
      { subject: 'Opportunity', get: (m) => m.snapshot.opportunity },
      { subject: 'Low competition', get: (m) => 100 - m.competition },
      { subject: 'Growth', get: (m) => Math.min(100, Math.max(0, m.growth * 4.2)) },
      { subject: 'Activity', get: (m) => m.activity },
      { subject: 'Affordability', get: (m) => m.affordability },
    ]
    return axes.map((axis) => {
      const point = { subject: axis.subject }
      metrics.forEach((entry) => {
        point[entry.locality.id] = Math.round(axis.get(entry))
      })
      return point
    })
  }, [metrics])

  const barData = metrics.map((entry) => ({
    name: entry.locality.name,
    Suitability: entry.suitability,
    Risk: entry.risk,
  }))

  const bestValue = (row) => {
    const values = metrics.map((entry) => row.value(entry))
    return row.best === 'max' ? Math.max(...values) : Math.min(...values)
  }

  const addLocality = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id) || current.length >= 4) return current
      return [...current, id]
    })
  }

  const removeLocality = (id) => {
    setSelectedIds((current) => (current.length <= 2 ? current : current.filter((entry) => entry !== id)))
  }

  const copyComparison = async () => {
    const header = ['Metric', ...metrics.map((entry) => entry.locality.name)].join(',')
    const rows = metricRows.map((row) =>
      [row.label, ...metrics.map((entry) => row.format(entry))].join(','),
    )
    try {
      await navigator.clipboard.writeText(
        [`Comparison for ${category.name} — illustrative estimates`, header, ...rows].join('\n'),
      )
      setToast('Comparison summary copied')
    } catch {
      setToast('Clipboard unavailable in this browser')
    }
  }

  const available = localities.filter((item) => !selectedIds.includes(item.id))
  const overallBest = winner?.suitability ?? 0
  const overallRisk = winner?.risk ?? 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Spatial decisions"
        title="Compare localities, side by side"
        description="Hold the category constant, vary the location, and see which market gives your concept the cleanest path."
        location={`${category.name} · Hyderabad`}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedIds(initialSelection())}
            >
              <RotateCcw className="h-4 w-4 text-ink-mute" />
              Reset selection
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4" />
              Ask AI to choose
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
              value={categoryId}
              onChange={setCategoryId}
              size="sm"
              searchable
              ariaLabel="Comparison category"
              options={categories.map((item) => ({
                value: item.id,
                label: item.name,
                hint: `${formatNumber(item.businesses)} businesses · ${signed(item.growth)}`,
                icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
              }))}
            />
          </div>

          <div className="hidden h-7 w-px bg-line/80 md:block" />

          <div className="flex flex-wrap items-center gap-1.5">
            {metrics.map((entry, index) => (
              <span
                key={entry.locality.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border py-1 pl-2 pr-1 text-[10.5px] font-bold',
                  entry.locality.id === localityId
                    ? 'border-brand-200 bg-brand-50 text-brand-800'
                    : 'border-line bg-white/60 text-ink-soft',
                )}
                style={{ borderColor: entry.locality.id === localityId ? undefined : `${seriesColors[index]}30` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seriesColors[index] }} />
                {entry.locality.name}
                <button
                  type="button"
                  onClick={() => removeLocality(entry.locality.id)}
                  disabled={selectedIds.length <= 2}
                  className="rounded-full p-0.5 text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-20"
                  aria-label={`Remove ${entry.locality.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select
              value=""
              onChange={addLocality}
              size="sm"
              searchable
              placeholder={selectedIds.length >= 4 ? 'Maximum 4 selected' : '+ Add locality'}
              className="w-[168px]"
              menuClassName="w-[250px]"
              ariaLabel="Add locality to comparison"
              options={available.map((item) => ({
                value: item.id,
                label: item.name,
                hint: `${item.zone} · ${item.opportunity}/100 opportunity`,
                icon: <MapPin className="h-3.5 w-3.5 text-brand-500" />,
              }))}
            />
            <button type="button" onClick={copyComparison} className="icon-button" aria-label="Copy comparison">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </GlassPanel>

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
                <p className="label">Model recommendation</p>
                <h2 className="mt-0.5 font-display text-[19px] font-extrabold tracking-[-0.03em] text-ink">
                  {winner.locality.name} leads this shortlist
                </h2>
                <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-ink-mute">
                  Highest category suitability at {overallBest}/100, with an estimated risk of {overallRisk}/100.
                  This is a directional comparison — pressure-test rents and site-level footfall before deciding.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <div className="rounded-xl border border-white/80 bg-white/65 px-3 py-2 text-center">
                <p className="tabular text-[19px] font-extrabold leading-none text-jade-700">{overallBest}</p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Suitability</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/65 px-3 py-2 text-center">
                <p className="tabular text-[19px] font-extrabold leading-none text-coral-600">{overallRisk}</p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Risk</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/65 px-3 py-2 text-center">
                <p className="tabular text-[19px] font-extrabold leading-none text-ink">
                  {formatNumber(winner.snapshot.nearby)}
                </p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Nearby</p>
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
          description={`${metrics.length} localities compared for ${category.name.toLowerCase()}. Best value in each row is highlighted.`}
          icon={GitCompareArrows}
          action={
            <div className="flex items-center gap-2">
              <span className="chip hidden sm:inline-flex">
                <Info className="h-3 w-3" />
                Illustrative estimates
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
                {metrics.map((entry, index) => {
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
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seriesColors[index] }} />
                            {entry.locality.zone}
                            {isFocus && <span className="text-brand-700">· focus</span>}
                          </p>
                        </div>
                        {selectedIds.length > 2 && (
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
                          {entry.suitability}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">fit</span>
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
                    {metrics.map((entry) => {
                      const value = row.value(entry)
                      const isBest = value === best
                      const isFocus = entry.locality.id === localityId
                      return (
                        <td
                          key={entry.locality.id}
                          className={cn(
                            'px-2.5 py-2.5',
                            isFocus && 'bg-brand-50/30',
                            isBest && 'bg-jade-50/40',
                          )}
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
                            tone={isBest ? 'jade' : row.tone}
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
            Best-fit highlights are model comparisons, not investment recommendations.
          </p>
          <div className="flex items-center gap-2">
            {metrics.map((entry) => (
              <span key={entry.locality.id} className="text-[8.5px] font-semibold text-ink-faint">
                {entry.locality.name}: {formatCompactINR(entry.snapshot.rentBenchmark)}/mo
              </span>
            ))}
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Trade-offs"
            title="Locality profile comparison"
            description="Five normalised dimensions. Larger coverage indicates a stronger overall position."
            icon={TrendingUp}
            action={
              <div className="flex items-center gap-2">
                {metrics.map((entry) => (
                  <span
                    key={entry.locality.id}
                    className="flex items-center gap-1 text-[8.5px] font-bold text-ink-mute"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seriesColors[metrics.indexOf(entry)] }} />
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
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 9.5, fill: '#6B7285', fontWeight: 600 }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip content={<ChartTooltip formatter={(value) => `${Math.round(value)}/100`} />} />
                {metrics.map((entry, index) => (
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
            title="Suitability vs risk"
            description="The ideal locality sits high on suitability and low on estimated risk."
            icon={GitCompareArrows}
            action={
              <div className="flex items-center gap-3 text-[9.5px] font-semibold text-ink-mute">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-jade-500" />
                  Suitability
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral-500" />
                  Risk
                </span>
              </div>
            }
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
                <Bar dataKey="Suitability" fill="#1D9B6A" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="Risk" fill="#DC6A5F" radius={[4, 4, 0, 0]} barSize={18} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 rounded-xl border border-brand-100/70 bg-brand-50/40 p-3">
            <p className="text-[10px] font-bold text-brand-900">Reading this chart</p>
            <p className="mt-0.5 text-[9px] leading-relaxed text-ink-mute">
              A locality with high suitability and high risk is a trade candidate: better demand, but tighter
              economics or heavier competition. Check the scorecard rows before committing.
            </p>
          </div>
        </GlassPanel>
      </div>

      <Toast message={toast} onClose={closeToast} />
    </div>
  )
}
