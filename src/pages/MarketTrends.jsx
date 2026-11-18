import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Info,
  LineChart as LineChartIcon,
  MapPin,
  Search,
  Sparkles,
  Store,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Select } from '../components/ui/Select'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { Badge } from '../components/ui/Badge'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { EmptyBlock, ErrorBlock, LoadingBlock, SourceNote } from '../components/domain/DataState'
import { useMarket } from '../context/MarketContext'
import { useApiResource } from '../hooks/useApiResource'
import { marketApi } from '../lib/api'
import { cn, formatNumber } from '../lib/utils'

function monthLabel(period) {
  if (!period) return ''
  const [, month] = period.split('-')
  const date = new Date(2000, Number(month) - 1, 1)
  return date.toLocaleString('en-IN', { month: 'short' })
}

function signedPct(value) {
  if (value === null || value === undefined) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function MarketTrends() {
  const navigate = useNavigate()
  const { categories, category, categoryId, setCategoryId, dataReady, metaLoading, metaError, reloadMeta } =
    useMarket()
  const [circleNo, setCircleNo] = useState(null)

  const result = useApiResource(
    ({ signal }) =>
      marketApi.getTrends(
        { category: categoryId, circle_no: circleNo ?? undefined },
        { signal },
      ),
    [categoryId, circleNo],
    { enabled: dataReady },
  )

  const data = result.data
  const ghmc = data?.ghmc_licence_activity
  const annual = ghmc?.annual_totals ?? []
  const monthly = useMemo(() => ghmc?.monthly ?? [], [ghmc])
  const google = data?.google_trends
  const latestAnnual = annual[annual.length - 1]
  const priorAnnual = annual[annual.length - 2]

  const monthlyChart = useMemo(
    () =>
      monthly.map((row) => ({
        ...row,
        label: monthLabel(row.period),
        fullLabel: row.period,
      })),
    [monthly],
  )

  const googleChart = useMemo(
    () =>
      (google?.monthly ?? []).map((row) => ({
        ...row,
        label: monthLabel(row.period),
      })),
    [google],
  )

  const circleData = useMemo(
    () =>
      (ghmc?.circles ?? []).slice(0, 8).map((circle) => ({
        name: circle.circle_name,
        y2022: circle.applications_by_year?.['2022'] ?? 0,
        y2023: circle.applications_by_year?.['2023'] ?? 0,
        change: circle.yoy_change_2022_to_2023_pct,
        total: circle.total_2022_2023,
      })),
    [ghmc],
  )

  const circleOptions = useMemo(
    () =>
      (ghmc?.circles ?? []).map((circle) => ({
        value: String(circle.circle_no),
        label: circle.circle_name,
        hint: `${formatNumber(circle.total_2022_2023)} applications`,
        icon: <MapPin className="h-3.5 w-3.5 text-brand-500" />,
      })),
    [ghmc],
  )

  if (metaLoading || result.loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Historical intelligence" title="Market trends" location="Hyderabad · 2022–2023" />
        <LoadingBlock label="Loading recorded GHMC activity and available search-interest trends…" />
      </div>
    )
  }

  const pageError = metaError || result.error
  if (pageError) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Historical intelligence" title="Market trends" location="Hyderabad · 2022–2023" />
        <ErrorBlock
          error={pageError}
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
        eyebrow="Historical intelligence"
        title="Market trends"
        description="Read the supplied historical activity without pretending it is current category demand. GHMC values are reported licence applications by circle; Google Trends values are relative search interest."
        location={circleNo ? `${circleData[0]?.name ?? 'Selected circle'} · GHMC` : 'Hyderabad · GHMC 2022–2023'}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => navigate('/market-explorer')}>
              <MapPin className="h-4 w-4" />
              Locality explorer
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4" />
              Ask the assistant
            </button>
          </>
        }
      />

      <GlassPanel className="flex flex-wrap items-center gap-3 p-3.5">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/45 py-1 pl-1 pr-3">
          <CategoryGlyph icon={category.icon} tint={category.tint} size="md" clay />
          <div className="leading-tight">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Search-interest scope</p>
            <p className="text-[11.5px] font-extrabold text-ink">{category.name}</p>
          </div>
        </div>
        <div className="h-7 w-px bg-line/80" />
        <div className="min-w-[190px] flex-1 sm:max-w-[250px]">
          <Select
            value={categoryId ?? undefined}
            onChange={setCategoryId}
            size="sm"
            searchable
            align="left"
            ariaLabel="Trends category"
            options={categories.map((item) => ({
              value: item.id,
              label: item.name,
              hint: item.aliases?.length ? item.aliases.slice(0, 2).join(', ') : 'Approved category',
              icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
            }))}
          />
        </div>
        <div className="min-w-[180px] flex-1 sm:max-w-[230px]">
          <Select
            value={circleNo === null ? '' : String(circleNo)}
            onChange={(value) => setCircleNo(value ? Number(value) : null)}
            size="sm"
            searchable
            ariaLabel="GHMC circle"
            placeholder="All GHMC circles"
            options={circleOptions}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {circleNo !== null && (
            <button type="button" onClick={() => setCircleNo(null)} className="chip text-brand-800">
              Clear circle filter
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-gold-700">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            Recorded historical data
          </span>
        </div>
      </GlassPanel>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={`${latestAnnual?.year ?? 'Latest'} applications`}
          value={formatNumber(latestAnnual?.applications ?? 0)}
          icon={Store}
          tone="brand"
          footnote={circleNo ? 'Selected GHMC circle' : 'All loaded GHMC circles'}
        />
        <MetricCard
          label="2022 → 2023 change"
          value={signedPct(ghmc?.yoy_change_2022_to_2023_pct)}
          icon={
            (ghmc?.yoy_change_2022_to_2023_pct ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight
          }
          tone={(ghmc?.yoy_change_2022_to_2023_pct ?? 0) >= 0 ? 'jade' : 'coral'}
          footnote={
            priorAnnual
              ? `${formatNumber(priorAnnual.applications)} in ${priorAnnual.year}`
              : 'Prior-year total unavailable'
          }
        />
        <MetricCard
          label="GHMC circles"
          value={formatNumber(ghmc?.circle_count ?? 0)}
          icon={BarChart3}
          tone="gold"
          footnote="Circles represented in the recorded series"
        />
        <MetricCard
          label="Google Trends"
          value={google ? `${google.latest_interest}/100` : '—'}
          icon={Search}
          tone="sea"
          footnote={
            google
              ? `${google.term_label} · Telangana relative interest`
              : 'No mapped trend term for this category'
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.58fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="GHMC activity"
            title="Reported licence applications"
            description="Monthly application aggregates from the supplied GHMC series. This is not approved openings or current demand."
            icon={TrendingUp}
            action={
              <span className="chip">
                {circleNo ? 'Selected circle' : 'All GHMC circles'} · 2022–23
              </span>
            }
          />
          <div className="mt-4 h-[286px]">
            {monthlyChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart} margin={{ top: 8, right: 10, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="ghmcActivityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4946B4" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#4946B4" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9.5, fill: '#8B90A2', fontWeight: 600 }}
                    dy={5}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tick={{ fontSize: 9.5, fill: '#8B90A2', fontWeight: 600 }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value) => `${formatNumber(value)} applications`}
                        labelSuffix="reported"
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    name="Applications"
                    stroke="#4946B4"
                    strokeWidth={2.3}
                    fill="url(#ghmcActivityFill)"
                    activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: '#4946B4' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyBlock
                className="h-full"
                title="No GHMC monthly activity"
                description="The selected circle has no loaded monthly application rows."
              />
            )}
          </div>
          <div className="mt-2 grid gap-2 border-t border-line/60 pt-3 sm:grid-cols-3">
            <div>
              <p className="label">Reference years</p>
              <p className="mt-0.5 text-[11px] font-bold text-ink">2022–2023</p>
            </div>
            <div>
              <p className="label">Coverage</p>
              <p className="mt-0.5 text-[11px] font-bold text-ink">
                {circleNo ? 'One GHMC circle' : `${ghmc?.circle_count ?? 0} circles`}
              </p>
            </div>
            <div>
              <p className="label">Series length</p>
              <p className="mt-0.5 text-[11px] font-bold text-ink">{monthly.length} recorded months</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Relative interest"
            title={google ? google.term_label : 'Google Trends availability'}
            description={
              google
                ? 'Relative search interest in Telangana. This is not search volume or customer demand.'
                : 'Only five approved categories have a mapped search-term series.'
            }
            icon={LineChartIcon}
            action={
              google ? <Badge tone="neutral">0–100 relative</Badge> : <Badge tone="gold">Not mapped</Badge>
            }
          />
          {google ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Latest week</p>
                  <p className="tabular mt-0.5 text-[14px] font-extrabold text-ink">
                    {google.latest_interest}
                  </p>
                </div>
                <div className="rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Recent avg.</p>
                  <p className="tabular mt-0.5 text-[14px] font-extrabold text-ink">
                    {google.recent_52_week_average ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">52-wk change</p>
                  <p
                    className={cn(
                      'tabular mt-0.5 text-[14px] font-extrabold',
                      (google.last_52_weeks_vs_previous_52_weeks_change_pct ?? 0) >= 0
                        ? 'text-jade-700'
                        : 'text-coral-600',
                    )}
                  >
                    {signedPct(google.last_52_weeks_vs_previous_52_weeks_change_pct)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-[238px]">
                {googleChart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={googleChart} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#8B90A2', fontWeight: 600 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        tick={{ fontSize: 9, fill: '#8B90A2', fontWeight: 600 }}
                      />
                      <Tooltip content={<ChartTooltip formatter={(value) => `${value}/100 relative interest`} />} />
                      <ReferenceLine y={50} stroke="#D5CCBA" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="average_interest"
                        name="Relative interest"
                        stroke="#14958C"
                        strokeWidth={2.2}
                        dot={false}
                        activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: '#14958C' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyBlock className="h-full" title="No monthly trend points" />
                )}
              </div>
              <p className="mt-1.5 flex items-start gap-1.5 text-[9px] leading-relaxed text-ink-faint">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                {google.note}
              </p>
            </>
          ) : (
            <div className="mt-4">
              <EmptyBlock
                title="No Google Trends series for this category"
                description={
                  data?.google_trends_note ||
                  'The approved trend categories are restaurants, grocery, fashion, pharmacy, and fitness.'
                }
                icon={Search}
              />
              <div className="mt-3 rounded-xl border border-brand-100/70 bg-brand-50/40 p-3">
                <p className="text-[10px] font-bold text-brand-900">What is still available</p>
                <p className="mt-0.5 text-[9px] leading-relaxed text-ink-mute">
                  The GHMC application activity is not category-specific. It remains visible for historical
                  context, but it must not be presented as demand for {category.name}.
                </p>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Circle comparison"
            title="Application activity by GHMC circle"
            description="Recorded 2022 and 2023 aggregates. Circle boundaries do not map one-to-one onto localities."
            icon={BarChart3}
            action={<span className="chip">Top {circleData.length} circles</span>}
          />
          <div className="mt-4 h-[286px]">
            {circleData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={circleData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={3}>
                  <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 8.5, fill: '#6B7285', fontWeight: 600 }}
                    interval={0}
                    angle={-24}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tick={{ fontSize: 9, fill: '#8B90A2', fontWeight: 600 }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip content={<ChartTooltip formatter={(value) => `${formatNumber(value)} applications`} />} />
                  <Legend
                    wrapperStyle={{ fontSize: 9, fontWeight: 600, color: '#6B7285' }}
                    iconType="circle"
                    iconSize={6}
                  />
                  <Bar dataKey="y2022" name="2022" fill="#A9A6D8" radius={[4, 4, 0, 0]} barSize={12}>
                    {circleData.map((entry) => (
                      <Cell key={`2022-${entry.name}`} fill="#A9A6D8" />
                    ))}
                  </Bar>
                  <Bar dataKey="y2023" name="2023" fill="#4946B4" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyBlock className="h-full" title="No circle comparison" />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <p className="text-[10px] font-medium text-ink-mute">
              The annual series is not a current market-growth indicator and cannot identify locality openings.
            </p>
            <span className="chip">GHMC circles</span>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Series detail"
            title="Annual totals"
            description="All recorded years in the supplied GHMC series."
            icon={Activity}
          />
          <div className="mt-3 overflow-hidden rounded-xl border border-line/60">
            <table className="w-full text-left">
              <thead className="bg-white/55 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                <tr>
                  <th className="px-3 py-2.5">Year</th>
                  <th className="px-3 py-2.5 text-right">Applications</th>
                  <th className="px-3 py-2.5 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {annual.map((row, index) => {
                  const previous = annual[index - 1]
                  const change =
                    previous && previous.applications
                      ? ((row.applications - previous.applications) / previous.applications) * 100
                      : null
                  return (
                    <tr key={row.year} className="border-t border-line/50 text-[11px]">
                      <td className="px-3 py-2.5 font-bold text-ink">{row.year}</td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold text-ink-soft">
                        {formatNumber(row.applications)}
                      </td>
                      <td
                        className={cn(
                          'tabular px-3 py-2.5 text-right font-bold',
                          change === null ? 'text-ink-faint' : change >= 0 ? 'text-jade-700' : 'text-coral-600',
                        )}
                      >
                        {change === null ? '—' : signedPct(change)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!annual.length && <EmptyBlock className="m-3" title="No annual totals" />}
          </div>
          <div className="mt-3 rounded-xl border border-gold-100 bg-gold-50/60 p-3">
            <p className="flex items-center gap-1.5 text-[9.5px] font-bold text-gold-800">
              <Info className="h-3 w-3" />
              Interpretation boundary
            </p>
            <p className="mt-1 text-[9px] leading-relaxed text-gold-800/80">
              A licence application is not a confirmed opening, and GHMC data is aggregated by circle. Use it as
              historical context, not as proof of current demand or category momentum.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/market-assistant')}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line/70 bg-white/50 py-2 text-[10.5px] font-bold text-brand-700 transition-colors hover:bg-white"
          >
            Discuss this series with the assistant
          </button>
        </GlassPanel>
      </div>

      <div className="grid gap-2 px-1 md:grid-cols-3">
        {(ghmc?.data_notes ?? []).slice(0, 3).map((note) => (
          <SourceNote key={note}>{note}</SourceNote>
        ))}
        {google && <SourceNote>{google.note}</SourceNote>}
      </div>
    </div>
  )
}
