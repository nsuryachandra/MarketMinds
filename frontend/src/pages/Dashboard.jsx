import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CircleAlert,
  Compass,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  Store,
  TrendingUp,
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
import { MetricCard } from '../components/ui/MetricCard'
import { PanelHeader } from '../components/ui/PanelHeader'
import { Badge } from '../components/ui/Badge'
import { Meter } from '../components/ui/Meter'
import { CategoryGlyph, tintHex } from '../components/ui/CategoryGlyph'
import { RiskGauge } from '../components/domain/RiskGauge'
import { SearchConsole } from '../components/domain/SearchConsole'
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SourceNote,
} from '../components/domain/DataState'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { useMarket } from '../context/MarketContext'
import { useApiResource } from '../hooks/useApiResource'
import { marketApi } from '../lib/api'
import { cn, formatNumber, humanizeMarketText, signed } from '../lib/utils'

function riskDisplay(result) {
  if (!result || result.risk_score === null || result.risk_score === undefined) return null
  return {
    score: result.risk_score,
    band: result.risk_band
      ? result.risk_band.charAt(0).toUpperCase() + result.risk_band.slice(1)
      : 'Moderate',
  }
}

function scoreTone(value) {
  if (value === null || value === undefined) return 'slate'
  if (value >= 70) return 'jade'
  if (value >= 45) return 'gold'
  return 'coral'
}

export function Dashboard() {
  const navigate = useNavigate()
  const {
    category,
    categoryId,
    locality,
    localityId,
    radius,
    business,
    isBusinessMode,
    clearBusiness,
    metaLoading,
    metaError,
    reloadMeta,
    dataReady,
  } = useMarket()

  const dashboard = useApiResource(
    async ({ signal }) => {
      const shared = { category: categoryId, radius_m: radius }
      const [overview, snapshot, competitors, trends, risk] = await Promise.all([
        marketApi.getOverview(shared, { signal }),
        isBusinessMode && business
          ? marketApi.getBusinessContext(
            { osm_id: business.osm_id, ...shared },
            { signal },
          )
          : marketApi.getLocalityAnalysis(
            { locality: localityId, ...shared },
            { signal },
          ),
        isBusinessMode && business
          ? marketApi.getBusinessCompetitors(
            { osm_id: business.osm_id, ...shared, limit: 50 },
            { signal },
          )
          : marketApi.getCompetitors(
            { locality: localityId, ...shared, limit: 50 },
            { signal },
          ),
        marketApi.getTrends({ category: categoryId }, { signal }),
        isBusinessMode && business
          ? marketApi.estimateBusinessRisk(
            {
              osm_id: business.osm_id,
              category: categoryId,
              radius_m: radius,
            },
            { signal },
          )
          : marketApi.estimateRisk(
            {
              locality: localityId,
              category: categoryId,
              radius_m: radius,
            },
            { signal },
          ),
      ])
      return { overview, snapshot, competitors, trends, risk }
    },
    [categoryId, localityId, radius, isBusinessMode, business?.osm_id],
    { enabled: dataReady },
  )

  const isLoading = metaLoading || dashboard.loading
  const error = metaError || dashboard.error
  const data = dashboard.data
  const overview = data?.overview
  const snapshot = data?.snapshot
  const competitors = data?.competitors
  const trends = data?.trends
  const risk = data?.risk
  const riskResult = riskDisplay(risk)
  const scores = snapshot?.scores
  const dataStatus = snapshot?.data_status

  const donutData = useMemo(() => {
    const counts = overview?.category_counts ?? []
    const sorted = counts.slice().sort((a, b) => b.mapped_poi_count - a.mapped_poi_count)
    const top = sorted.slice(0, 6).map((item) => ({
      id: item.category_id,
      name: item.category_name,
      value: item.mapped_poi_count,
      tint: category?.id === item.category_id ? 'brand' : 'slate',
    }))
    const other = sorted.slice(6).reduce((sum, item) => sum + item.mapped_poi_count, 0)
    return other > 0 ? [...top, { id: 'other', name: 'Other', value: other }] : top
  }, [overview, category?.id])

  const topLocalities = (overview?.top_localities_by_selected_category ?? []).map((item) => ({
    ...item,
    shortName: item.name.length > 13 ? `${item.name.slice(0, 12)}…` : item.name,
  }))

  const cityCategory = overview?.selected_category
  const activity = snapshot?.activity_context
  const access = snapshot?.access_counts
  const dataQuality = snapshot?.data_quality
  const yoy = trends?.ghmc_licence_activity?.yoy_change_2022_to_2023_pct
  const center = snapshot?.analysis_center

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Market overview" title="Preparing your market overview…" location="Hyderabad" />
        <SearchConsole variant="dashboard" />
        <LoadingBlock label="Connecting supply, competition, trends, and risk…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Market overview" title="Market overview" location="Hyderabad" />
        <SearchConsole variant="dashboard" />
        <ErrorBlock
          error={error}
          onRetry={() => {
            if (metaError) reloadMeta()
            else dashboard.reload()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Market overview"
        title="Market overview"
        description="A clear view of mapped supply, nearby competition, accessibility, historical licence activity, and directional risk for the market you selected."
        location={
          isBusinessMode
            ? `${business?.name} · ${category?.shortName ?? category?.name}`
            : `${locality?.name} · ${category?.shortName ?? category?.name}`
        }
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.dispatchEvent(new CustomEvent('marketminds:open-search'))}
            >
              <Search className="h-4 w-4 text-ink-mute" />
              Search
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/risk-analysis')}>
              <ShieldAlert className="h-4 w-4" />
              Full risk analysis
            </button>
          </>
        }
      />

      <SearchConsole variant="dashboard" />

      {isBusinessMode && business && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200/70 bg-brand-50/60 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-100 bg-white/70 text-brand-700">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12px] font-bold text-brand-900">
                Focused business: {business.name}
              </p>
              <p className="mt-0.5 text-[10.5px] font-medium text-brand-800/70">
                {business.category?.name} · nearest locality {business.nearest_locality?.name} ·{' '}
                {center?.distance_to_nearest_locality_center_m
                  ? `${formatNumber(center.distance_to_nearest_locality_center_m)} m from the locality reference point`
                  : 'approximate mapped location'}
              </p>
            </div>
          </div>
          <button type="button" className="btn-secondary h-8 px-2.5 text-[10.5px]" onClick={clearBusiness}>
            Return to locality context
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <GlassPanel className="relative overflow-hidden p-5 lg:p-6">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/[0.04] blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="label">Selected market</span>
                <Badge tone={dataStatus === 'available' ? 'jade' : 'gold'} dot>
                  {dataStatus === 'available' ? 'Analysis ready' : 'Limited data'}
                </Badge>
                <span className="text-[9.5px] font-semibold text-ink-faint">
                  {snapshot?.catchment?.radius_m
                    ? `${snapshot.catchment.radius_m / 1000} km catchment`
                    : ''}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2.5">
                <CategoryGlyph icon={category?.icon} tint={category?.tint} size="md" />
                <div>
                  <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-[-0.035em] text-ink">
                    {category?.name}
                  </h2>
                  <p className="flex items-center gap-1 text-[11px] font-medium text-ink-mute">
                    <MapPin className="h-3 w-3 text-[#C8792C]" />
                    {isBusinessMode ? business?.nearest_locality?.name : locality?.name} · Hyderabad
                  </p>
                </div>
              </div>
            </div>
            <Badge tone="neutral">Market data</Badge>
          </div>

          <div className="relative mt-6 grid gap-6 sm:grid-cols-[210px_1fr] sm:items-center">
            {/* Opportunity Index Hero Gauge */}
            <div className="rounded-2xl border border-line/70 bg-[#FBFCFE] p-4">
              <div className="flex items-end gap-2.5">
                <span className="tabular font-display text-[46px] font-extrabold leading-[0.95] tracking-[-0.055em] text-ink">
                  {scores?.opportunity_index ?? '—'}
                </span>
                <span
                  className={cn(
                    'mb-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold',
                    scores?.opportunity_index >= 60
                      ? 'bg-jade-50 text-jade-700'
                      : 'bg-gold-50 text-gold-700',
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  benchmark
                </span>
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-mute">
                Opportunity index / 100
              </p>
              <Meter
                value={scores?.opportunity_index ?? 0}
                tone={scoreTone(scores?.opportunity_index)}
                className="mt-2.5 w-full"
              />
            </div>

            {/* De-cluttered 4-Metric Unified Strip */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line/70 bg-[#FBFCFE] p-3">
                <p className="label">Catchment Supply</p>
                <p className="tabular mt-1 font-display text-[19px] font-bold text-ink">
                  {formatNumber(snapshot?.mapped_poi_count ?? 0)} Places
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-ink-faint">
                  {cityCategory?.share_of_mapped_pct ?? '—'}% of city mapped supply
                </p>
              </div>

              <div className="rounded-xl border border-line/70 bg-[#FBFCFE] p-3">
                <p className="label">Direct Competitors</p>
                <p className="tabular mt-1 font-display text-[19px] font-bold text-ink">
                  {formatNumber(competitors?.competitor_count ?? 0)} Mapped
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-ink-faint">
                  {competitors?.unnamed_competitor_count
                    ? `${formatNumber(competitors.unnamed_competitor_count)} unnamed in set`
                    : 'All named outlets'}
                </p>
              </div>

              <div className="rounded-xl border border-line/70 bg-[#FBFCFE] p-3">
                <p className="label">Transit Access</p>
                <p className="tabular mt-1 font-display text-[19px] font-bold text-ink">
                  {formatNumber(access?.bus_stops_within_radius ?? 0)} Bus · {formatNumber(access?.metro_stations_within_radius ?? 0)} Metro
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-ink-faint">
                  Access score {scores?.access_index ?? '—'}/100
                </p>
              </div>

              <div className="rounded-xl border border-line/70 bg-[#FBFCFE] p-3">
                <p className="label">Concentration</p>
                <p className="tabular mt-1 font-display text-[19px] font-bold text-ink">
                  HHI {snapshot?.category_mix_hhi ?? '—'}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-ink-faint">
                  Competition idx {scores?.competition_index ?? '—'}/100
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            title="Directional risk"
            description="Directional estimate based on mapped supply, historical activity, access, and data quality."
            icon={ShieldAlert}
            action={
              riskResult ? (
                <Badge tone={riskResult.score >= 70 ? 'coral' : riskResult.score >= 50 ? 'gold' : 'jade'}>
                  {riskResult.band}
                </Badge>
              ) : (
                <Badge tone="gold">Insufficient</Badge>
              )
            }
          />
          <div className="mt-3 flex flex-col items-center">
            {riskResult ? (
              <>
                <RiskGauge result={riskResult} size={208} subtitle="not a failure probability" />
                <button
                  type="button"
                  onClick={() => navigate('/risk-analysis')}
                  className="btn-secondary mt-2 h-8 px-3 text-[10.5px]"
                >
                  Adjust assumptions
                  <ArrowRight className="h-3 w-3" />
                </button>
              </>
            ) : (
              <EmptyBlock
                className="mt-3 w-full"
                icon={CircleAlert}
                title="Risk score unavailable"
                description={
                  risk?.message ??
                  'The selected category does not meet the minimum data threshold for a risk estimate.'
                }
              />
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line/60 bg-white/50 p-2.5">
              <p className="label">Data completeness</p>
              <p className="tabular mt-1 text-[15px] font-extrabold text-ink">
                {scores?.data_completeness ?? '—'}/100
              </p>
            </div>
            <div className="rounded-xl border border-line/60 bg-white/50 p-2.5">
              <p className="label">GHMC activity</p>
              <p className="tabular mt-1 text-[15px] font-extrabold text-ink">
                {activity?.circle_application_total_2022_2023
                  ? formatNumber(activity.circle_application_total_2022_2023)
                  : '—'}
              </p>
              <p className="text-[9px] text-ink-faint">circle applications 2022–23</p>
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            title="City category mix"
            description="Mapped OpenStreetMap places across the 13 supported categories."
            icon={BarChart3}
          />
          <div className="mt-3 h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={donutData} layout="vertical" margin={{ top: 4, right: 22, bottom: 0, left: 0 }}>
                <CartesianGrid horizontal={false} stroke="#E5EAF1" strokeDasharray="3 5" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#667085', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={104}
                  tick={{ fontSize: 9.5, fill: '#475467', fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip formatter={(value) => formatNumber(value)} />} />
                <Bar dataKey="value" name="Mapped places" radius={[0, 6, 6, 0]} barSize={17}>
                  {donutData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.id === 'other' ? '#EAE5DD' : tintHex[entry.tint] ?? '#C8792C'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            title="Top localities"
            description={`Highest mapped ${category?.shortName ?? category?.name} counts in a ${radius / 1000} km catchment.`}
            icon={Compass}
          />
          <div className="mt-3 h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topLocalities} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="#E5EAF1" strokeDasharray="3 5" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 9.5, fill: '#475467', fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#667085', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip formatter={(value) => formatNumber(value)} />} />
                <Bar dataKey="mapped_poi_count" name="Mapped places" radius={[6, 6, 0, 0]} fill="#C8792C" barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Catchment density"
          value={snapshot?.density_per_sq_km ?? '—'}
          icon={Building2}
          tone="brand"
          footnote={`per sq km at ${radius / 1000} km radius`}
        />
        <MetricCard
          label="Named share"
          value={`${snapshot?.named_share_pct ?? '—'}%`}
          icon={Store}
          tone="sea"
          footnote="named mapped outlets in catchment"
        />
        <MetricCard
          label="Access index"
          value={scores?.access_index ?? '—'}
          icon={MapPin}
          tone="jade"
          footnote="relative bus, metro, and ward-school context"
        />
        <MetricCard
          label="GHMC 2022→2023"
          value={yoy === null || yoy === undefined ? '—' : signed(yoy)}
          icon={TrendingUp}
          tone="gold"
          footnote="reported circle-level licence applications"
        />
      </div>

      <GlassPanel className="p-5">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <PanelHeader
              title="What the current snapshot is telling you"
              description="The opportunity index is a relative comparison, not a forecast."
              icon={Activity}
            />
            <div className="mt-3 space-y-2.5">
              {[
                {
                  label: 'Supply and competition',
                  value: `${formatNumber(snapshot?.mapped_poi_count ?? 0)} mapped places in the catchment; ${competitors?.competitor_count ?? 0} nearby same-category competitors.`,
                  tone: 'brand',
                },
                {
                  label: 'Access context',
                  value: `${formatNumber(access?.bus_stops_within_radius ?? 0)} bus stops, ${formatNumber(access?.metro_stations_within_radius ?? 0)} metro stations, and ward-level school context.`,
                  tone: 'sea',
                },
                {
                  label: 'Data quality',
                  value: dataQuality?.message || `Mapped-data completeness is ${scores?.data_completeness ?? '—'}/100.`,
                  tone: dataQuality?.status === 'available' ? 'jade' : 'gold',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'rounded-xl border px-3 py-2.5',
                    item.tone === 'jade'
                      ? 'border-jade-200/60 bg-jade-50/40'
                      : item.tone === 'gold'
                        ? 'border-gold-200/60 bg-gold-50/40'
                        : 'border-line/60 bg-white/45',
                  )}
                >
                  <p className="text-[11px] font-bold text-ink">{item.label}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-mute">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line/60 bg-white/45 p-4">
            <p className="label">Read the limitations</p>
            <ul className="mt-2 space-y-2">
              {(snapshot?.data_notes ?? []).slice(0, 5).map((note) => (
                <li key={note} className="flex gap-2 text-[10.5px] leading-relaxed text-ink-mute">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                  {humanizeMarketText(note)}
                </li>
              ))}
            </ul>
            <SourceNote className="mt-3 border-t border-line/60 pt-2">
              {snapshot?.sources
                ? `Sources: ${Object.values(snapshot.sources).join(' · ')}`
                : 'Source attribution appears when analysis is available.'}
            </SourceNote>
          </div>
        </div>
      </GlassPanel>

      {center && (
        <p className="px-1 text-[9.5px] leading-relaxed text-ink-faint">
          Analysis centre: {center.label} · {center.latitude}, {center.longitude}
          {center.distance_to_nearest_locality_center_m
            ? ` · ${formatNumber(center.distance_to_nearest_locality_center_m)} m from the nearest locality reference point`
            : ''}
        </p>
      )}
    </div>
  )
}
