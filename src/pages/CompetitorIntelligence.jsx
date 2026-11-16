import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Download,
  Flame,
  Info,
  MapPin,
  Search,
  ShieldAlert,
  Star,
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
import { Select } from '../components/ui/Select'
import { MetricCard } from '../components/ui/MetricCard'
import { CategoryGlyph, tintHex } from '../components/ui/CategoryGlyph'
import { Badge } from '../components/ui/Badge'
import { Meter } from '../components/ui/Meter'
import { Toast } from '../components/ui/Toast'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { useMarket } from '../context/MarketContext'
import { categories } from '../data/categories'
import { localities } from '../data/localities'
import {
  getCompetitors,
  getLocalityCategoryBreakdown,
  getMarketSnapshot,
} from '../lib/analytics'

import { cn, formatCompactINR, formatNumber, signed } from '../lib/utils'



const positioningTone = {
  Premium: 'brand',
  'Mid-market': 'sea',
  Value: 'neutral',
} 

function ConcentrationGauge({
  hhi,
  concentration,
}


) {
  const normalized = Math.min(100, Math.max(0, Math.round(((hhi - 300) / 1500) * 100)))
  const color =
    concentration === 'Fragmented' ? '#1D9B6A' : concentration === 'Moderately concentrated' ? '#D0922B' : '#DC6A5F'
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
          stroke="#EAE4D8"
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
          stroke={color}
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
          fill="#1B1F2F"
          fontSize="24"
          fontWeight="800"
          style={{ fontFamily: 'Manrope Variable, sans-serif', letterSpacing: '-0.04em' }}
        >
          {hhi}
        </text>
        <text x="60" y="71" textAnchor="middle" fill="#9AA0B1" fontSize="6.5" fontWeight="700" letterSpacing="0.1em">
          HHI INDEX
        </text>
      </svg>
      <div className="absolute inset-x-0 bottom-2 text-center">
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold"
          style={{ backgroundColor: `${color}14`, borderColor: `${color}30`, color }}
        >
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
          {concentration}
        </span>
      </div>
    </div>
  )
}

export function CompetitorIntelligence() {
  const navigate = useNavigate()
  const {
    category,
    categoryId,
    locality,
    localityId,
    setCategoryId,
    setLocalityId,
  } = useMarket()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('distance')
  const [sortDirection, setSortDirection] = useState('asc')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const snapshot = useMemo(() => getMarketSnapshot(categoryId, localityId), [categoryId, localityId])
  const competitorSet = useMemo(() => getCompetitors(categoryId, localityId), [categoryId, localityId])
  const breakdown = useMemo(() => getLocalityCategoryBreakdown(localityId).slice(0, 8), [localityId])

  const topShare = competitorSet.records
    .slice()
    .sort((a, b) => b.share - a.share)
    .slice(0, 3)
  const topShareTotal = topShare.reduce((sum, record) => sum + record.share, 0)

  const intensityMarkets = useMemo(() => {
    const ranked = localities
      .map((item) => ({
        locality: item,
        snapshot: getMarketSnapshot(categoryId, item.id),
      }))
      .sort((a, b) => b.snapshot.competition - a.snapshot.competition)
      .slice(0, 8)
    if (!ranked.some((item) => item.locality.id === localityId)) {
      ranked[ranked.length - 1] = {
        locality,
        snapshot,
      }
    }
    return ranked
  }, [categoryId, localityId, locality, snapshot])

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase()
    return competitorSet.records
      .filter((record) => !term || `${record.name} ${record.positioning}`.toLowerCase().includes(term))
      .slice()
      .sort((a, b) => {
        const modifier = sortDirection === 'asc' ? 1 : -1
        return (a[sortKey] - b[sortKey]) * modifier
      })
  }, [competitorSet.records, search, sortKey, sortDirection])

  const setSort = (key) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection(key === 'distance' ? 'asc' : 'desc')
    }
  }

  const copyRecords = async () => {
    const header = 'Business,Distance (km),Rating,Reviews,Established,Positioning,Est. share %'
    const rows = competitorSet.records.map((record) =>
      [
        record.name,
        record.distance,
        record.rating,
        record.reviews,
        record.established,
        record.positioning,
        record.share,
      ].join(','),
    )
    try {
      await navigator.clipboard.writeText([header, ...rows].join('\n'))
      setToast('Sample competitor table copied as CSV')
    } catch {
      setToast('Clipboard unavailable — sample data is illustrative only')
    }
  }

  const chartData = breakdown.map((item) => ({
    name: item.category.shortName,
    count: item.count,
    id: item.category.id,
    tint: item.category.tint,
  }))

  const sortIcon = (key) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-ink-faint" />
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-brand-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-brand-600" />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Competitive landscape"
        title="Know the field before you enter it"
        description="Map nearby competitors, understand category concentration, and find the positioning lane that is still open."
        location={`${locality.name} · ${category.shortName}`}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/market-explorer')}
            >
              <MapPin className="h-4 w-4" />
              Open on map
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/risk-analysis')}>
              <ShieldAlert className="h-4 w-4" />
              Assess risk
            </button>
          </>
        }
      />

      <GlassPanel className="flex flex-wrap items-center gap-3 p-3.5">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/45 py-1 pl-1 pr-3">
          <CategoryGlyph icon={category.icon} tint={category.tint} size="md" clay />
          <div className="leading-tight">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Analysis scope</p>
            <p className="text-[11.5px] font-extrabold text-ink">{category.name}</p>
          </div>
        </div>
        <div className="h-7 w-px bg-line/80" />
        <div className="min-w-[170px] flex-1 sm:max-w-[220px]">
          <Select
            value={categoryId}
            onChange={setCategoryId}
            size="sm"
            searchable
            align="left"
            ariaLabel="Competitor category"
            options={categories.map((item) => ({
              value: item.id,
              label: item.name,
              hint: `${formatNumber(item.businesses)} businesses · ${signed(item.growth)}`,
              icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
            }))}
          />
        </div>
        <div className="min-w-[160px] flex-1 sm:max-w-[220px]">
          <Select
            value={localityId}
            onChange={setLocalityId}
            size="sm"
            searchable
            ariaLabel="Competitor locality"
            searchPlaceholder="Find a locality…"
            options={localities.map((item) => ({
              value: item.id,
              label: item.name,
              hint: `${item.zone} · ${formatNumber(item.businesses)} businesses`,
              icon: <MapPin className="h-3.5 w-3.5 text-brand-500" />,
            }))}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[9.5px] font-semibold text-ink-mute">
          <span>
            Category growth <span className="text-jade-700">{signed(category.growth)}</span>
          </span>
          <span className="h-4 w-px bg-line" />
          <span>
            Rent index <span className="text-ink">₹{locality.rentIndex}/sq ft</span>
          </span>
          <span className="h-4 w-px bg-line" />
          <span className="flex items-center gap-1 text-gold-700">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            Illustrative dataset
          </span>
        </div>
      </GlassPanel>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Nearby competitors"
          value={formatNumber(snapshot.nearby)}
          icon={UsersRound}
          tone="coral"
          footnote={`Within an estimated 2 km radius`}
        />
        <MetricCard
          label="Category density"
          value={`${snapshot.density}/km²`}
          icon={MapPin}
          tone="gold"
          footnote="Trade-area density, category-adjusted"
        />
        <MetricCard
          label="Locality outlets"
          value={formatNumber(snapshot.presence)}
          icon={Store}
          tone="brand"
          footnote={`${category.shortName} · ${locality.name}`}
        />
        <MetricCard
          label="Competition intensity"
          value={`${snapshot.competition}/100`}
          icon={Flame}
          tone="sea"
          footnote={`Opportunity signal ${snapshot.opportunity}/100`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Distribution"
            title="Locality category mix"
            description={`All tracked business categories in ${locality.name}, ranked by outlet count.`}
            icon={Store}
            action={
              <div className="hidden items-center gap-1.5 rounded-full border border-line/70 bg-white/60 px-2 py-1 text-[9px] font-bold text-ink-mute sm:flex">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tintHex[category.tint] }} />
                {category.shortName} highlighted
              </div>
            }
          />
          <div className="mt-4 h-[286px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 26, bottom: 0, left: 6 }} barSize={13}>
                <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#8B90A2', fontWeight: 600 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={98}
                  tick={{ fontSize: 10.5, fill: '#454C61', fontWeight: 600 }}
                />
                <Tooltip content={<ChartTooltip formatter={(value) => `${formatNumber(value)} outlets`} />} />
                <Bar dataKey="count" name="Outlets" radius={[0, 5, 5, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={tintHex[entry.tint]}
                      fillOpacity={entry.id === categoryId ? 0.95 : 0.32}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <p className="text-[10px] font-medium text-ink-mute">
              <span className="font-bold text-ink">{category.name}</span> accounts for an estimated{" "}
              <span className="font-bold text-ink">{formatNumber(snapshot.presence)}</span> of{" "}
              {formatNumber(locality.businesses)} tracked businesses here.
            </p>
            <span className="chip">Estimated · illustrative</span>
          </div>
        </GlassPanel>

        <GlassPanel className="flex flex-col p-5">
          <PanelHeader
            eyebrow="Concentration"
            title="Market concentration"
            description="How power is distributed among established players."
            icon={Flame}
          />
          <div className="mt-2">
            <ConcentrationGauge hhi={competitorSet.hhi} concentration={competitorSet.concentration} />
          </div>
          <div className="mt-1">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.05]">
              {topShare.map((record, index) => (
                <div
                  key={record.id}
                  className="h-full border-r border-white/60"
                  style={{
                    width: `${record.share}%`,
                    backgroundColor: ['#3B3795', '#5A57D4', '#8B88E8'][index],
                  }}
                />
              ))}
              <div
                className="h-full bg-[#D9D2C4]"
                style={{ width: `${Math.max(0, 100 - topShareTotal)}%` }}
              />
            </div>
            <div className="mt-2.5 space-y-1.5">
              {topShare.map((record, index) => (
                <div key={record.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ['#3B3795', '#5A57D4', '#8B88E8'][index] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-ink-soft">
                    {record.name}
                  </span>
                  <span className="tabular text-[10px] font-bold text-ink">{record.share}%</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#D9D2C4]" />
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-ink-mute">
                  Long tail of independent operators
                </span>
                <span className="tabular text-[10px] font-bold text-ink-soft">
                  {Math.max(0, 100 - topShareTotal).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 rounded-xl border border-line/60 bg-white/40 p-2.5 text-[9.5px] leading-relaxed text-ink-mute">
            {competitorSet.concentration === 'Fragmented'
              ? 'No single operator dominates. Share is winnable with a sharper proposition, but loyalty will be low.'
              : competitorSet.concentration === 'Moderately concentrated'
                ? 'A handful of players hold meaningful share. Differentiate clearly and avoid competing on price alone.'
                : 'Established operators control a large share. Entry requires a materially differentiated offer or a niche audience.'}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-line/60 pt-3 text-[9.5px] font-medium text-ink-faint">
            <span>Estimated HHI · sample share model</span>
            <span className="font-bold text-ink-mute">{competitorSet.concentration}</span>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.5fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Intensity"
            title="Nearby market pressure"
            description="Category-adjusted competition across leading localities."
            icon={Flame}
          />
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {intensityMarkets.map(({ locality: market, snapshot: marketSnapshot }) => {
              const isSelected = market.id === localityId
              const level =
                marketSnapshot.competition >= 70 ? 'Crowded' : marketSnapshot.competition >= 50 ? 'Competitive' : 'Open'
              const color =
                marketSnapshot.competition >= 70 ? '#DC6A5F' : marketSnapshot.competition >= 50 ? '#D0922B' : '#1D9B6A'
              return (
                <button
                  key={market.id}
                  type="button"
                  onClick={() => setLocalityId(market.id)}
                  className={cn(
                    'group rounded-xl border p-2.5 text-left transition-all duration-200',
                    isSelected
                      ? 'border-brand-200 bg-brand-50/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                      : 'border-line/60 bg-white/40 hover:border-line-strong hover:bg-white/75',
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate text-[10.5px] font-bold text-ink">{market.name}</p>
                    {isSelected && (
                      <span className="rounded bg-brand-600 px-1 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.06em] text-white">
                        you
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="tabular text-[17px] font-extrabold leading-none" style={{ color }}>
                      {marketSnapshot.competition}
                    </span>
                    <span className="text-[8.5px] font-semibold text-ink-faint">/100</span>
                  </div>
                  <Meter value={marketSnapshot.competition} tone="coral" height="xs" className="mt-1.5" />
                  <div className="mt-1 flex items-center justify-between text-[8px] font-bold">
                    <span style={{ color }}>{level}</span>
                    <span className="text-ink-faint">{marketSnapshot.nearby} nearby</span>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line/60 bg-white/40 p-2.5">
            <Info className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            <p className="text-[9px] leading-relaxed text-ink-mute">
              Values are category-adjusted estimates. Select any tile to update the full page.
            </p>
          </div>
        </GlassPanel>

        <GlassPanel className="flex flex-col p-5">
          <PanelHeader
            eyebrow="Sample comparison"
            title="Competitor comparison"
            description="A fictional sample of nearby operators for format benchmarking."
            icon={UsersRound}
            action={
              <button type="button" onClick={copyRecords} className="btn-secondary h-8 px-2.5 text-[10.5px]">
                <Download className="h-3 w-3" />
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
                placeholder="Search sample businesses…"
                className="field h-8 rounded-lg pl-8 text-[11.5px]"
              />
            </div>
            <span className="text-[9.5px] font-semibold text-ink-faint">
              {filteredRecords.length} of {competitorSet.records.length} records
            </span>
          </div>

          <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-gold-100 bg-gold-50/60 px-2.5 py-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
            <p className="text-[9px] leading-relaxed text-gold-700">
              Illustrative sample records. Business names are fictional and are not presented as verified real
              businesses.
            </p>
          </div>

          <div className="mt-2.5 flex-1 overflow-x-auto scroll-slim">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line/70">
                  <th className="pb-2 pl-1.5 pr-2 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Business
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
                  <th className="px-2 pb-2">
                    <button
                      type="button"
                      onClick={() => setSort('rating')}
                      className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
                    >
                      Rating {sortIcon('rating')}
                    </button>
                  </th>
                  <th className="px-2 pb-2 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Est.
                  </th>
                  <th className="px-2 pb-2 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Positioning
                  </th>
                  <th className="px-2 pb-2">
                    <button
                      type="button"
                      onClick={() => setSort('share')}
                      className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
                    >
                      Share {sortIcon('share')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="group border-b border-line/50 transition-colors last:border-0 hover:bg-white/55"
                  >
                    <td className="py-2.5 pl-1.5 pr-2">
                      <p className="text-[11px] font-bold text-ink">{record.name}</p>
                      <p className="text-[9px] font-medium text-ink-faint">
                        {record.reviews.toLocaleString('en-IN')} reviews
                      </p>
                    </td>
                    <td className="tabular px-2 py-2.5 text-[10.5px] font-semibold text-ink-soft">
                      {record.distance.toFixed(1)} km
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-ink">
                        <Star className="h-3 w-3 fill-gold-400 text-gold-500" style={{ color: '#D0922B' }} />
                        {record.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="tabular px-2 py-2.5 text-[10.5px] font-semibold text-ink-mute">
                      {record.established}
                    </td>
                    <td className="px-2 py-2.5">
                      <Badge tone={positioningTone[record.positioning]}>{record.positioning}</Badge>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="tabular w-8 text-[10px] font-bold text-ink-soft">{record.share}%</span>
                        <Meter value={record.share * 6} tone="brand" height="xs" className="w-12" />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[11px] font-medium text-ink-faint">
                      No sample records match “{search}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5">
            <p className="text-[9px] font-medium text-ink-faint">
              Rent benchmark for this locality: {formatCompactINR(snapshot.rentBenchmark)}/month (1,200 sq ft est.)
            </p>
            <button
              type="button"
              onClick={() => navigate('/market-assistant')}
              className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
            >
              Ask about positioning
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </GlassPanel>
      </div>

      <Toast message={toast} onClose={closeToast} />
    </div>
  )
}
