import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CircleCheckBig,
  Compass,
  Flame,
  Lightbulb,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { MetricCard } from '../components/ui/MetricCard'
import { PanelHeader } from '../components/ui/PanelHeader'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { Sparkline } from '../components/ui/Sparkline'
import { CategoryGlyph, tintHex } from '../components/ui/CategoryGlyph'
import { Meter } from '../components/ui/Meter'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { useMarket } from '../context/MarketContext'
import {
  categoryDistribution,
  highCompetitionAreas,
  kpiSparks,
  localityActivityRanking,
  marketGapAreas,
  marketPulseSummary,
  monthlyActivity,
  topEmergingCategories,
} from '../data/dashboard'
import { categories, getCategory } from '../data/categories'
import { localities } from '../data/localities'
import { insights } from '../data/insights'
import { getMarketSnapshot } from '../lib/analytics'
import { cn, formatCompact, formatCompactINR, formatNumber, signed } from '../lib/utils'

const rangeOptions = [
  { value: '12M', label: '12M' },
  { value: '6M', label: '6M' },
  { value: '3M', label: '3M' },
]

const insightTone = {
  opportunity: {
    icon: Lightbulb,
    badge: 'bg-brand-50 text-brand-700 border-brand-100',
    iconClass: 'text-brand-700',
  },
  risk: {
    icon: Flame,
    badge: 'bg-coral-50 text-coral-700 border-coral-100',
    iconClass: 'text-coral-600',
  },
  trend: {
    icon: TrendingUp,
    badge: 'bg-sea-50 text-sea-700 border-sea-100',
    iconClass: 'text-sea-600',
  },
  financial: {
    icon: TrendingDown,
    badge: 'bg-gold-50 text-gold-700 border-gold-100',
    iconClass: 'text-gold-600',
  },
}

export function Dashboard() {
  const navigate = useNavigate()
  const {
    category,
    categoryId,
    locality,
    localityId,
    setCategoryId,
    setLocalityId,
  } = useMarket()
  const [range, setRange] = useState('12M')
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null)
  const [greeting] = useState(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })

  const snapshot = useMemo(() => getMarketSnapshot(categoryId, localityId), [categoryId, localityId])

  const rangeCount = range === '12M' ? 12 : range === '6M' ? 6 : 3
  const series = monthlyActivity.slice(monthlyActivity.length - rangeCount)
  const latest = monthlyActivity[monthlyActivity.length - 1]
  const netAdditions = latest.registrations - latest.closures

  const donutData = useMemo(() => {
    const sorted = categoryDistribution.slice()
    const top = sorted.slice(0, 6)
    const other = sorted.slice(6).reduce((sum, item) => sum + item.value, 0)
    return [...top, { name: 'Other', value: other, id: 'other' }]
  }, [])

  const donutColors = donutData.map((slice) =>
    slice.id === 'other' ? '#C9C2B4' : tintHex[getCategory(slice.id).tint],
  )
  const activeSlice = hoveredSlice !== null ? donutData[hoveredSlice] : null

  const dateLabel = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Market overview"
        title={`${greeting}, Aarav.`}
        description="Here is how Hyderabad’s business landscape is moving today — and where the next decision may be hiding."
        location="Hyderabad"
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('marketminds:open-search'))
              }}
            >
              <Search className="h-4 w-4 text-ink-mute" />
              Search
              <span className="ml-1 hidden rounded-md border border-line bg-canvas/70 px-1.5 py-0.5 text-[9px] font-bold text-ink-faint sm:inline">
                ⌘K
              </span>
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/risk-analysis')}>
              <Plus className="h-4 w-4" />
              New analysis
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <GlassPanel className="relative overflow-hidden p-5 lg:p-6">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-500/[0.07] blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="label">City market pulse</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-jade-200/70 bg-jade-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-jade-700">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-jade-500" />
                  Expanding
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-ink-faint">
                {dateLabel} · updated 4 minutes ago
              </p>
            </div>
            <SegmentedControl value={range} onChange={setRange} options={rangeOptions} size="sm" />
          </div>

          <div className="relative mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
            <div>
              <div className="flex items-end gap-2.5">
                <span className="tabular font-display text-[48px] font-extrabold leading-[0.95] tracking-[-0.055em] text-ink">
                  {marketPulseSummary.index}
                </span>
                <span className="mb-1.5 inline-flex items-center gap-1 rounded-lg bg-jade-50 px-1.5 py-1 text-[11px] font-bold text-jade-700">
                  <ArrowUpRight className="h-3 w-3" />
                  {signed(marketPulseSummary.change)}
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] font-semibold text-ink-mute">Market activity index</p>
            </div>

            <div className="h-[132px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4946B4" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#4946B4" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#9AA0B1', fontWeight: 600 }}
                    interval="preserveStartEnd"
                    dy={4}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(73,70,180,0.18)', strokeWidth: 1 }}
                    content={<ChartTooltip formatter={(value) => value.toFixed(1)} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="activity"
                    name="Activity index"
                    stroke="#4946B4"
                    strokeWidth={2.4}
                    fill="url(#pulseFill)"
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#4946B4' }}
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 divide-x divide-line/70 rounded-xl border border-line/60 bg-white/45">
            <div className="px-3.5 py-2.5">
              <p className="label">Active base</p>
              <p className="tabular mt-1 text-[15px] font-extrabold text-ink">{marketPulseSummary.activeShare}%</p>
            </div>
            <div className="px-3.5 py-2.5">
              <p className="label">New this month</p>
              <p className="tabular mt-1 text-[15px] font-extrabold text-ink">
                {formatNumber(marketPulseSummary.newThisMonth)}
              </p>
            </div>
            <div className="px-3.5 py-2.5">
              <p className="label">Opportunity index</p>
              <p className="tabular mt-1 text-[15px] font-extrabold text-ink">{marketPulseSummary.opportunityIndex}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 lg:p-6">
          <PanelHeader
            eyebrow="Quick analysis"
            title="Pressure-test a decision"
            description="Choose a category and locality to pre-load your workspace."
            icon={Sparkles}
          />
          <div className="mt-4 space-y-3.5">
            <div>
              <label className="label mb-1.5 block">Business category</label>
              <Select
                value={categoryId}
                onChange={setCategoryId}
                searchable
                ariaLabel="Business category"
                options={categories.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: `${formatNumber(item.businesses)} businesses · ${signed(item.growth)} YoY`,
                  icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
                }))}
              />
            </div>
            <div>
              <label className="label mb-1.5 block">Locality</label>
              <Select
                value={localityId}
                onChange={setLocalityId}
                searchable
                ariaLabel="Locality"
                searchPlaceholder="Find a Hyderabad locality…"
                options={localities.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: `${item.zone} · ${formatNumber(item.businesses)} businesses`,
                  icon: <MapPin className="h-3.5 w-3.5 text-brand-500" />,
                }))}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-line/60 bg-white/40 p-3.5">
            <div className="flex items-center justify-between">
              <span className="label">Live snapshot</span>
              <span className="text-[10px] font-semibold text-ink-faint">{locality.name}</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[9.5px] font-semibold text-ink-faint">Competition</p>
                <p className="tabular mt-0.5 text-[15px] font-extrabold text-coral-600">{snapshot.competition}</p>
              </div>
              <div>
                <p className="text-[9.5px] font-semibold text-ink-faint">Opportunity</p>
                <p className="tabular mt-0.5 text-[15px] font-extrabold text-jade-600">{snapshot.opportunity}</p>
              </div>
              <div>
                <p className="text-[9.5px] font-semibold text-ink-faint">Local outlets</p>
                <p className="tabular mt-0.5 text-[15px] font-extrabold text-ink">{formatNumber(snapshot.presence)}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-medium text-ink-mute">
              <span>Rent benchmark</span>
              <span className="font-bold text-ink">{formatCompactINR(snapshot.rentBenchmark)}/mo</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => navigate('/risk-analysis')}
            >
              Assess this market
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={() => navigate('/market-explorer')}
              aria-label="Open market explorer"
            >
              <Compass className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2.5 flex items-center gap-1 text-[9.5px] font-medium text-ink-faint">
            <MapPin className="h-2.5 w-2.5" />
            {category.name} · {locality.name} · Hyderabad
          </p>
        </GlassPanel>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tracked businesses"
          value={formatNumber(48236)}
          icon={Store}
          tone="brand"
          delta={2.8}
          spark={kpiSparks.tracked}
        />
        <MetricCard
          label="Active businesses"
          value={formatNumber(39967)}
          icon={CircleCheckBig}
          tone="jade"
          delta={3.1}
          spark={kpiSparks.active}
        />
        <MetricCard
          label="New registrations"
          value={formatNumber(1284)}
          icon={UserPlus}
          tone="sea"
          delta={3.9}
          deltaLabel="this month"
          spark={kpiSparks.registrations}
        />
        <MetricCard
          label="Estimated inactive"
          value={formatNumber(8269)}
          icon={Archive}
          tone="coral"
          delta={0.5}
          deltaGood={false}
          deltaLabel="vs last month"
          spark={kpiSparks.inactive}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Momentum"
            title="Market growth trend"
            description="Monthly new registrations against estimated closures."
            icon={TrendingUp}
            action={
              <div className="flex items-center gap-3 text-[10px] font-semibold text-ink-mute">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-600" />
                  New registrations
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral-500" />
                  Closures
                </span>
              </div>
            }
          />
          <div className="mt-4 h-[252px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="registrationsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4946B4" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#4946B4" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10.5, fill: '#8B90A2', fontWeight: 600 }}
                  dy={5}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10.5, fill: '#8B90A2', fontWeight: 600 }}
                  tickFormatter={(value: number) => formatCompact(value)}
                  width={48}
                />
                <Tooltip content={<ChartTooltip formatter={(value) => formatNumber(value)} />} />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  name="New registrations"
                  stroke="#4946B4"
                  strokeWidth={2.3}
                  fill="url(#registrationsFill)"
                  activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: '#4946B4' }}
                />
                <Line
                  type="monotone"
                  dataKey="closures"
                  name="Closures"
                  stroke="#DC6A5F"
                  strokeWidth={1.9}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 3.5, stroke: '#fff', strokeWidth: 2, fill: '#DC6A5F' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-mute">
              <TrendingUp className="h-3.5 w-3.5 text-jade-600" />
              Net <span className="font-bold text-ink">+{formatNumber(netAdditions)}</span> businesses added this
              month
            </p>
            <p className="text-[10px] font-semibold text-ink-faint">
              {range === '12M' ? 'Dec 2025 – Nov 2026' : `Last ${rangeCount} months`} · illustrative data
            </p>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Composition"
            title="Category distribution"
            description="Share of tracked businesses city-wide."
            icon={Building2}
          />
          <div className="relative mt-1 h-[192px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip formatter={(value) => formatNumber(value)} />} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2.5}
                  cornerRadius={4}
                  stroke="none"
                  onMouseEnter={(_, index) => setHoveredSlice(index)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  {donutData.map((entry, index) => (
                    <Cell
                      key={entry.id}
                      fill={donutColors[index]}
                      opacity={hoveredSlice === null || hoveredSlice === index ? 1 : 0.35}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="tabular font-display text-[24px] font-extrabold leading-none tracking-[-0.04em] text-ink">
                {activeSlice ? formatCompact(activeSlice.value) : '48.2K'}
              </p>
              <p className="mt-1 max-w-[90px] truncate text-center text-[9.5px] font-semibold text-ink-faint">
                {activeSlice ? activeSlice.name : 'tracked businesses'}
              </p>
            </div>
          </div>
          <div className="mt-1 space-y-1">
            {donutData.slice(0, 5).map((slice, index) => {
              const item = categories.find((entry) => entry.id === slice.id)
              if (!item) return null
              return (
                <button
                  key={slice.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(item.id)
                    navigate('/market-explorer')
                  }}
                  onMouseEnter={() => setHoveredSlice(index)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-ink/[0.035]"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: donutColors[index] }} />
                  <span className="flex-1 truncate text-[11px] font-semibold text-ink-soft">{item.shortName}</span>
                  <span className="tabular text-[10.5px] font-bold text-ink">{formatNumber(slice.value)}</span>
                  <span className="tabular w-9 text-right text-[10px] font-semibold text-ink-faint">
                    {((slice.value / 48236) * 100).toFixed(1)}%
                  </span>
                </button>
              )
            })}
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Locality signal"
            title="Locality activity"
            description="Top markets by composite activity score."
            icon={MapPin}
            action={
              <button
                type="button"
                onClick={() => navigate('/location-comparison')}
                className="text-[10.5px] font-bold text-brand-700 transition-colors hover:text-brand-900"
              >
                Compare
              </button>
            }
          />
          <div className="mt-4 space-y-3">
            {localityActivityRanking.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setLocalityId(item.id)
                  navigate('/market-explorer')
                }}
                className="group flex w-full items-center gap-3 text-left"
              >
                <span className="tabular w-4 text-[10px] font-bold text-ink-faint">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11.5px] font-bold text-ink group-hover:text-brand-800">
                      {item.name}
                    </p>
                    <p className="tabular text-[10.5px] font-bold text-ink-soft">{item.activity}</p>
                  </div>
                  <Meter value={item.activity} gradient={index === 0} tone="sea" height="xs" className="mt-1.5" />
                </div>
              </button>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Momentum"
            title="Emerging categories"
            description="Fastest year-on-year registration growth."
            icon={TrendingUp}
          />
          <div className="mt-3.5 space-y-1.5">
            {topEmergingCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategoryId(item.id)
                  navigate('/market-trends')
                }}
                className="group flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-ink/[0.035]"
              >
                <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-bold text-ink group-hover:text-brand-800">{item.name}</p>
                  <p className="text-[9.5px] font-medium text-ink-faint">{formatNumber(item.businesses)} businesses</p>
                </div>
                <span className="rounded-md border border-jade-200/60 bg-jade-50 px-1.5 py-0.5 text-[10px] font-bold text-jade-700">
                  {signed(item.growth)}
                </span>
              </button>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Risk / gap"
            title="Competition heat & gaps"
            description="Where pressure is building — and where room remains."
            icon={Flame}
          />
          <div className="mt-3.5">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-coral-600">High competition</p>
            <div className="grid grid-cols-2 gap-1.5">
              {highCompetitionAreas.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setLocalityId(item.id)
                    navigate('/competitor-intelligence')
                  }}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-white/45 px-2 py-1.5 text-left transition-colors hover:border-coral-200 hover:bg-coral-50/40"
                >
                  <span className="truncate text-[10.5px] font-semibold text-ink-soft">{item.name}</span>
                  <span className="tabular text-[10px] font-bold text-coral-600">{item.competition}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 border-t border-line/60 pt-3">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-jade-700">Market gaps</p>
            <div className="grid grid-cols-2 gap-1.5">
              {marketGapAreas.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setLocalityId(item.id)
                    navigate('/market-explorer')
                  }}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-white/45 px-2 py-1.5 text-left transition-colors hover:border-jade-200 hover:bg-jade-50/40"
                >
                  <span className="truncate text-[10.5px] font-semibold text-ink-soft">{item.name}</span>
                  <span className="tabular text-[10px] font-bold text-jade-600">{item.opportunity}</span>
                </button>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Signals"
            title="Recent market insights"
            description="Interpreted signals from tracked registrations and activity."
            icon={Lightbulb}
            action={
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Live brief
              </span>
            }
          />
          <div className="mt-3.5 divide-y divide-line/60">
            {insights.slice(0, 4).map((insight) => {
              const tone = insightTone[insight.type]
              return (
                <button
                  key={insight.id}
                  type="button"
                  onClick={() => navigate(insight.to)}
                  className="group flex w-full items-start gap-3 py-3 text-left first:pt-1 last:pb-0"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border',
                      tone.badge,
                    )}
                  >
                    <tone.icon className={cn('h-3.5 w-3.5', tone.iconClass)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-bold text-ink group-hover:text-brand-800">
                        {insight.title}
                      </span>
                      <span className="rounded-md border border-line/70 bg-white/70 px-1.5 py-0.5 text-[9px] font-bold text-ink-faint">
                        {insight.metric}
                      </span>
                    </span>
                    <span className="mt-0.5 block max-w-[620px] text-[10.5px] leading-relaxed text-ink-mute">
                      {insight.detail}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                      {insight.tag}
                      <span className="h-0.5 w-0.5 rounded-full bg-ink-faint" />
                      {insight.time}
                    </span>
                  </span>
                  <ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </button>
              )
            })}
          </div>
        </GlassPanel>

        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(150deg,rgba(232,231,251,0.92),rgba(255,255,255,0.78)_48%,rgba(238,249,247,0.82))] p-6 shadow-glass">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-brand-200/50" />
          <div className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 rounded-full border border-brand-200/40" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-sea-200/20 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="label">Next best move</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/80 bg-white/70 text-brand-700 shadow-soft">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <h3 className="mt-3 font-display text-[21px] font-extrabold leading-snug tracking-[-0.03em] text-ink">
              Pressure-test a
              <br />
              <span className="serif-accent font-normal text-brand-800">Kokapet entry</span>
            </h3>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mute">
              Kokapet carries the city’s widest supply–demand gap right now — 88/100 opportunity against
              26/100 competition.
            </p>
            <div className="mt-4 flex items-end gap-3">
              <div>
                <p className="tabular font-display text-[30px] font-extrabold leading-none tracking-[-0.04em] text-jade-600">
                  88
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  Opportunity score
                </p>
              </div>
              <Sparkline
                data={[42, 48, 51, 57, 62, 68, 73, 78, 82, 86, 88]}
                tone="jade"
                className="mb-1 h-9 flex-1"
              />
            </div>
            <button
              type="button"
              className="btn-primary mt-4 w-full"
              onClick={() => {
                setLocalityId('kokapet')
                navigate('/risk-analysis')
              }}
            >
              Evaluate this locality
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/market-assistant')}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 text-[10.5px] font-bold text-brand-700 transition-colors hover:text-brand-900"
            >
              <UsersRound className="h-3 w-3" />
              Ask the market assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
