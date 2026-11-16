import { useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Check,
  GitCompareArrows,
  Layers,
  Lightbulb,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
  X,
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
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { Meter } from '../components/ui/Meter'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { useMarket } from '../context/MarketContext'
import { categories } from '../data/categories'
import { localities } from '../data/localities'
import { getComparisonMetrics, getMarketSnapshot } from '../lib/analytics'
import { cn, formatCompactINR, formatNumber, signed } from '../lib/utils'



const competitionFilters = [
  { value: 'all', label: 'All', dot: 'bg-ink-faint' },
  { value: 'low', label: 'Low', dot: 'bg-jade-500' },
  { value: 'medium', label: 'Medium', dot: 'bg-gold-500' },
  { value: 'high', label: 'High', dot: 'bg-coral-500' },
]

const mapLabelIds = new Set([
  'charminar',
  'kukatpally',
  'banjara-hills',
  'secunderabad',
  'hitec-city',
  'gachibowli',
])

function bucketCompetition(value) {
  if (value >= 70) return 'high'
  if (value >= 50) return 'medium'
  return 'low'
}

export function MarketExplorer() {
  const navigate = useNavigate()
  const {
    category,
    categoryId,
    locality,
    localityId,
    setCategoryId,
    setLocalityId,
  } = useMarket()

  const [competitionFilter, setCompetitionFilter] = useState('all')
  const [minActivity, setMinActivity] = useState(30)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('opportunity')
  const [mapMode, setMapMode] = useState('competition')
  const [hoveredId, setHoveredId] = useState(null)
  const [shortlist, setShortlist] = useState([localityId])
  const [compareOpen, setCompareOpen] = useState(false)

  const enriched = useMemo(
    () =>
      localities.map((item) => ({
        ...item,
        snapshot: getMarketSnapshot(categoryId, item.id),
      })),
    [categoryId],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return enriched
      .filter((item) => !term || `${item.name} ${item.zone}`.toLowerCase().includes(term))
      .filter((item) => competitionFilter === 'all' || bucketCompetition(item.snapshot.competition) === competitionFilter)
      .filter((item) => item.activity >= minActivity)
      .sort((a, b) =>
        sort === 'opportunity'
          ? b.snapshot.opportunity - a.snapshot.opportunity
          : b.activity - a.activity,
      )
  }, [enriched, query, competitionFilter, minActivity, sort])

  const selectedSnapshot = useMemo(() => getMarketSnapshot(categoryId, localityId), [categoryId, localityId])
  const selectedComparison = useMemo(
    () => getComparisonMetrics(categoryId, localityId),
    [categoryId, localityId],
  )
  const selected = enriched.find((item) => item.id === localityId) ?? enriched[0]
  const hovered = hoveredId ? enriched.find((item) => item.id === hoveredId) : null
  const hasFilters = competitionFilter !== 'all' || minActivity !== 30 || query.length > 0

  const comparisonChart = useMemo(() => {
    const sorted = enriched.slice().sort((a, b) => b.snapshot.opportunity - a.snapshot.opportunity)
    const top = sorted.filter((item) => item.id !== localityId).slice(0, 6)
    if (!top.some((item) => item.id === localityId)) {
      top.push(selected)
    }
    return top.map((item) => ({
      name: item.name,
      Opportunity: item.snapshot.opportunity,
      Competition: item.snapshot.competition,
      selected: item.id === localityId,
    }))
  }, [enriched, localityId, selected])

  const toggleShortlist = (id) => {
    setShortlist((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id)
      if (current.length >= 4) return current
      return [...current, id]
    })
  }

  const heatColor = (item) => {
    if (mapMode === 'competition') {
      if (item.snapshot.competition >= 70) return '#DC6A5F'
      if (item.snapshot.competition >= 50) return '#D0922B'
      return '#1D9B6A'
    }
    if (item.snapshot.opportunity >= 70) return '#14958C'
    if (item.snapshot.opportunity >= 50) return '#5A57D4'
    return '#9AA0B1'
  }

  const shortlistMetrics = shortlist.map((id) => getComparisonMetrics(categoryId, id))

  const opportunitySignals = [
    {
      icon: Users,
      label: 'Demand headroom',
      score: 100 - selectedSnapshot.competition,
      tone: 'jade' ,
      detail: `${selectedSnapshot.competition}/100 competitive intensity leaves ${100 - selectedSnapshot.competition} points of headroom.`,
    },
    {
      icon: TrendingUp,
      label: 'Growth momentum',
      score: Math.min(100, Math.round(selectedSnapshot.growth * 4.6)),
      tone: 'brand' ,
      detail: `${signed(selectedSnapshot.growth)} blended category and locality growth.`,
    },
    {
      icon: Wallet,
      label: 'Rental efficiency',
      score: Math.round(100 - (locality.rentIndex / 42) * 100),
      tone: 'sea' ,
      detail: `₹${locality.rentIndex}/sq ft index against the city’s ₹42 premium benchmark.`,
    },
    {
      icon: Activity,
      label: 'Market activity',
      score: locality.activity,
      tone: 'gold' ,
      detail: `Footfall index ${locality.footfall}/100 with ${formatNumber(locality.newRegs)} new registrations this month.`,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Explore"
        title="Market explorer"
        description="Scan Hyderabad locality by locality, read competition density, and surface where demand is still underserved."
        location={`${locality.name} · ${category.shortName}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4 text-brand-600" />
              Ask the assistant
            </button>
            <button type="button" className="btn-primary" onClick={() => setCompareOpen(true)}>
              <GitCompareArrows className="h-4 w-4" />
              Compare shortlist
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-extrabold">
                {shortlist.length}
              </span>
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[268px_minmax(0,1fr)]">
        <GlassPanel className="flex flex-col p-4">
          <PanelHeader
            title="Refine view"
            description="Filters apply to the atlas and locality list."
            icon={SlidersHorizontal}
          />

          <div className="mt-4">
            <label className="label mb-1.5 block">Business category</label>
            <Select
              value={categoryId}
              onChange={setCategoryId}
              searchable
              options={categories.map((item) => ({
                value: item.id,
                label: item.name,
                hint: `${formatNumber(item.businesses)} businesses · ${signed(item.growth)}`,
                icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
              }))}
              ariaLabel="Category filter"
            />
          </div>

          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label">Competition level</label>
              <span className="text-[9px] font-semibold text-ink-faint">category-adjusted</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {competitionFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setCompetitionFilter(filter.value)}
                  className={cn(
                    'flex h-8 flex-col items-center justify-center gap-1 rounded-lg border text-[9.5px] font-bold transition-all',
                    competitionFilter === filter.value
                      ? 'border-brand-200 bg-white text-ink shadow-soft'
                      : 'border-line/60 bg-white/35 text-ink-mute hover:bg-white/70',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', filter.dot)} />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label">Minimum activity</label>
              <span className="tabular text-[10px] font-bold text-brand-700">{minActivity}+</span>
            </div>
            <input
              type="range"
              min={30}
              max={85}
              step={1}
              value={minActivity}
              onChange={(event) => setMinActivity(Number(event.target.value))}
              className="w-full"
              style={{ '--range-progress': `${((minActivity - 30) / 55) * 100}%` } }
              aria-label="Minimum locality activity"
            />
            <div className="mt-1 flex justify-between text-[8.5px] font-semibold text-ink-faint">
              <span>Quiet</span>
              <span>Active</span>
            </div>
          </div>

          <div className="relative mt-3.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search locality or zone…"
              className="field h-9 rounded-lg pl-8 text-[12px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint hover:text-ink"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="mt-3.5 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-ink-faint">
              {filtered.length} of {localities.length} localities
            </p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setSort('opportunity')}
                className={cn(
                  'rounded-md px-1.5 py-1 text-[9px] font-bold transition-colors',
                  sort === 'opportunity' ? 'bg-brand-50 text-brand-800' : 'text-ink-faint hover:text-ink-soft',
                )}
              >
                Opportunity
              </button>
              <button
                type="button"
                onClick={() => setSort('activity')}
                className={cn(
                  'rounded-md px-1.5 py-1 text-[9px] font-bold transition-colors',
                  sort === 'activity' ? 'bg-brand-50 text-brand-800' : 'text-ink-faint hover:text-ink-soft',
                )}
              >
                Activity
              </button>
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setCompetitionFilter('all')
                setMinActivity(30)
                setQuery('')
              }}
              className="mt-1.5 self-start text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
            >
              Reset filters
            </button>
          )}

          <div className="scroll-slim mt-2 max-h-[352px] flex-1 space-y-1 overflow-y-auto pr-0.5">
            {filtered.map((item) => {
              const isSelected = item.id === localityId
              const inShortlist = shortlist.includes(item.id)
              const compBucket = bucketCompetition(item.snapshot.competition)
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-1 rounded-xl border p-1 transition-all',
                    isSelected
                      ? 'border-brand-200/80 bg-brand-50/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                      : 'border-transparent hover:border-line/70 hover:bg-white/45',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setLocalityId(item.id)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left"
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        compBucket === 'high'
                          ? 'bg-coral-500'
                          : compBucket === 'medium'
                            ? 'bg-gold-500'
                            : 'bg-jade-500',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-[11.5px] font-bold',
                          isSelected ? 'text-brand-900' : 'text-ink-soft',
                        )}
                      >
                        {item.name}
                      </span>
                      <span className="block truncate text-[9px] font-medium text-ink-faint">
                        {item.zone} · {formatNumber(item.businesses)}
                      </span>
                    </span>
                    <span className="tabular rounded-md border border-line/60 bg-white/60 px-1.5 py-0.5 text-[9px] font-bold text-ink-mute">
                      {item.snapshot.opportunity}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleShortlist(item.id)}
                    disabled={!inShortlist && shortlist.length >= 4}
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                      inShortlist
                        ? 'border-brand-200 bg-brand-600 text-white'
                        : 'border-line/60 bg-white/50 text-ink-faint hover:border-brand-200 hover:text-brand-700',
                    )}
                    aria-label={inShortlist ? `Remove ${item.name} from comparison` : `Add ${item.name} to comparison`}
                  >
                    {inShortlist ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </button>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-8 text-center">
                <Search className="mx-auto h-5 w-5 text-ink-faint" />
                <p className="mt-2 text-[11px] font-semibold text-ink-soft">No localities match</p>
                <p className="mt-0.5 text-[10px] text-ink-faint">Loosen a filter to continue.</p>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between rounded-xl border border-line/60 bg-white/40 px-2.5 py-2">
            <span className="text-[9.5px] font-semibold text-ink-faint">Shortlist · up to 4</span>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              disabled={shortlist.length < 2}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 transition-colors hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Compare {shortlist.length}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="overflow-hidden p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 px-1 pb-3">
              <div>
                <p className="label">Interactive atlas</p>
                <h2 className="mt-0.5 font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink">
                  Hyderabad market map
                </h2>
                <p className="mt-0.5 text-[10.5px] text-ink-faint">
                  Stylised geography · markers scaled by business volume
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SegmentedControl
                  value={mapMode}
                  onChange={(value) => setMapMode(value )}
                  options={[
                    { value: 'competition', label: 'Competition' },
                    { value: 'opportunity', label: 'Opportunity' },
                  ]}
                  size="sm"
                />
                <span className="hidden h-8 w-8 items-center justify-center rounded-lg border border-line/70 bg-white/60 text-ink-mute sm:flex">
                  <Layers className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="relative h-[370px] overflow-hidden rounded-2xl border border-line/60 bg-[linear-gradient(150deg,#fbf8f1,#f4efe4)] sm:h-[430px]">
              <div className="absolute inset-0 dot-grid opacity-60" />
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="cityFill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fffdf9" stopOpacity="0.94" />
                    <stop offset="100%" stopColor="#f8f2e7" stopOpacity="0.82" />
                  </linearGradient>
                </defs>
                <path
                  d="M28 7 C 40 3, 54 4, 64 8 L 75 12 C 84 17, 88 27, 87 36 L 90 45 C 92 54, 86 60, 85 68 L 78 76 C 79 84, 71 90, 61 92 L 49 95 C 39 97, 29 91, 23 85 L 15 82 C 8 77, 6 67, 8 58 L 7 47 C 5 37, 12 28, 17 20 L 22 13 Z"
                  fill="url(#cityFill)"
                  stroke="#D8CFBE"
                  strokeWidth="0.6"
                  style={{ filter: 'drop-shadow(0 6px 10px rgba(27,31,47,0.08))' }}
                />
                <path
                  d="M34 17 C 54 13, 72 20, 79 36 C 85 52, 79 70, 62 80 C 45 89, 28 82, 21 68 C 14 54, 17 32, 34 17 Z"
                  fill="none"
                  stroke="#C9BFAD"
                  strokeWidth="0.4"
                  strokeDasharray="1.5 2"
                  opacity="0.9"
                />
                <path
                  d="M31 51 C 39 44, 48 50, 55 43 C 63 36, 70 42, 78 38"
                  fill="none"
                  stroke="#DED6C6"
                  strokeWidth="0.5"
                />
                <path
                  d="M25 64 C 43 58, 52 68, 63 62 C 72 57, 79 63, 86 58"
                  fill="none"
                  stroke="#DED6C6"
                  strokeWidth="0.5"
                />
                <path
                  d="M38 14 C 34 31, 36 45, 44 58 C 50 68, 54 78, 51 91"
                  fill="none"
                  stroke="#D5CCBA"
                  strokeWidth="0.45"
                  strokeDasharray="1.2 1.8"
                />
                <path d="M12 64 C 26 61, 33 73, 47 69 C 58 65, 65 75, 79 76" fill="none" stroke="#8ECFC7" strokeWidth="1.1" opacity="0.75" />
                <ellipse cx="47" cy="43" rx="5.2" ry="3.4" fill="#BFE5DF" stroke="#8ECFC7" strokeWidth="0.35" />
                <ellipse cx="16" cy="80" rx="4.6" ry="3.1" fill="#BFE5DF" stroke="#8ECFC7" strokeWidth="0.3" />
                <ellipse cx="18" cy="61" rx="2.4" ry="1.7" fill="#BFE5DF" stroke="#8ECFC7" strokeWidth="0.3" />
                <path d="M20 34 L 44 42 L 58 27" fill="none" stroke="#FDFBF7" strokeWidth="1.6" opacity="0.9" />
                <path d="M34 52 L 47 80 L 72 69" fill="none" stroke="#FDFBF7" strokeWidth="1.4" opacity="0.8" />
                <text x="50" y="97" textAnchor="middle" fill="#B8AE9C" fontSize="2.1" fontWeight="700" letterSpacing="0.12em">
                  HYDERABAD
                </text>
              </svg>

              {enriched.map((item) => {
                const isSelected = item.id === localityId
                const isHovered = hoveredId === item.id
                const color = heatColor(item)
                const size = 14 + (item.businesses / 6240) * 17
                const intensity =
                  mapMode === 'competition'
                    ? item.snapshot.competition / 100
                    : item.snapshot.opportunity / 100
                const showLabel = mapLabelIds.has(item.id) || isHovered || isSelected
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLocalityId(item.id)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                    aria-label={`Select ${item.name}`}
                  >
                    <span
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg transition-opacity duration-300"
                      style={{
                        left: '50%',
                        top: '50%',
                        width: `${size * 6.4}px`,
                        aspectRatio: '1',
                        background: `radial-gradient(circle, ${color}70 0%, ${color}2e 46%, transparent 72%)`,
                        opacity: 0.5 + intensity * 0.45,
                      }}
                    />
                    <span
                      className={cn(
                        'relative z-10 flex items-center justify-center rounded-full border-[1.5px] border-white transition-all duration-200',
                        isSelected
                          ? 'h-3 w-3 shadow-[0_0_0_4px_rgba(73,70,180,0.18),0_2px_8px_rgba(27,31,47,0.3)]'
                          : 'h-2.5 w-2.5 group-hover:h-3 group-hover:w-3',
                      )}
                      style={{
                        backgroundColor: isSelected ? '#4946B4' : color,
                        boxShadow: isSelected
                          ? '0 0 0 4px rgba(73,70,180,0.16), 0 2px 8px rgba(27,31,47,0.28)'
                          : '0 1px 4px rgba(27,31,47,0.25)',
                      }}
                    />
                    {showLabel && (
                      <span
                        className={cn(
                          'relative z-10 mt-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[8.5px] font-bold transition-colors',
                          isSelected
                            ? 'bg-brand-900 text-white'
                            : 'bg-white/75 text-ink-mute backdrop-blur-sm group-hover:bg-white',
                        )}
                      >
                        {item.name}
                      </span>
                    )}
                  </button>
                )
              })}

              {hovered && (
                <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-1.5 shadow-soft backdrop-blur-xl">
                  <MapPin className="h-3 w-3 text-brand-600" />
                  <span className="text-[10.5px] font-bold text-ink">{hovered.name}</span>
                  <span className="text-[9.5px] font-medium text-ink-faint">
                    {hovered.snapshot.opportunity}/100 opportunity
                  </span>
                </div>
              )}

              <div className="pointer-events-none absolute bottom-3 left-3 hidden w-[224px] rounded-2xl border border-white/80 bg-[rgba(255,255,255,0.82)] p-3 shadow-soft backdrop-blur-xl sm:block">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-extrabold text-ink">{locality.name}</p>
                  <span className="rounded-md border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-brand-700">
                    selected
                  </span>
                </div>
                <p className="mt-0.5 text-[9.5px] font-medium text-ink-faint">
                  {locality.zone} · {formatNumber(locality.businesses)} businesses
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Opp.</p>
                    <p className="tabular text-[13px] font-extrabold text-jade-600">{selectedSnapshot.opportunity}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Comp.</p>
                    <p className="tabular text-[13px] font-extrabold text-coral-600">{selectedSnapshot.competition}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Rent</p>
                    <p className="tabular text-[13px] font-extrabold text-ink">₹{locality.rentIndex}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/risk-analysis')}
                  className="pointer-events-auto mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-brand-600 py-1.5 text-[9.5px] font-bold text-white transition-colors hover:bg-brand-700"
                >
                  Assess this locality
                  <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>

              <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl border border-white/80 bg-white/75 px-2.5 py-2 backdrop-blur-md">
                <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  {mapMode === 'competition' ? 'Competition heat' : 'Opportunity heat'}
                </p>
                <div
                  className="h-1.5 w-[96px] rounded-full"
                  style={{
                    background:
                      mapMode === 'competition'
                        ? 'linear-gradient(90deg,#1D9B6A,#D0922B,#DC6A5F)'
                        : 'linear-gradient(90deg,#9AA0B1,#5A57D4,#14958C)',
                  }}
                />
                <div className="mt-1 flex justify-between text-[7.5px] font-bold text-ink-faint">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full border border-line/60 bg-white/60 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint backdrop-blur-sm">
                <span className="h-1 w-1 rounded-full bg-brand-500" />
                {category.shortName} view
              </div>
            </div>
          </GlassPanel>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
            <GlassPanel className="p-5">
              <div className="flex items-start gap-3">
                <CategoryGlyph icon={category.icon} tint={category.tint} size="lg" clay />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="label">Locality profile</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-jade-200/60 bg-jade-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-jade-700">
                      <span className="h-1 w-1 rounded-full bg-jade-500" />
                      Live model
                    </span>
                  </div>
                  <h2 className="mt-0.5 font-display text-[19px] font-extrabold tracking-[-0.03em] text-ink">
                    {locality.name}
                  </h2>
                  <p className="text-[10.5px] font-medium text-ink-faint">
                    {locality.zone} · Hyderabad · {category.shortName}
                  </p>
                </div>
              </div>

              <p className="mt-3 border-l-2 border-brand-200 pl-3 text-[11px] italic leading-relaxed text-ink-mute">
                {locality.note}
              </p>

              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-line/60 bg-white/45 p-2.5">
                  <p className="label">Category outlets</p>
                  <p className="tabular mt-1 text-[18px] font-extrabold text-ink">
                    {formatNumber(selectedSnapshot.presence)}
                  </p>
                  <p className="text-[9px] font-medium text-ink-faint">
                    within {formatNumber(locality.businesses)} tracked
                  </p>
                </div>
                <div className="rounded-xl border border-line/60 bg-white/45 p-2.5">
                  <p className="label">Nearby · 2 km</p>
                  <p className="tabular mt-1 text-[18px] font-extrabold text-ink">
                    {formatNumber(selectedSnapshot.nearby)}
                  </p>
                  <p className="text-[9px] font-medium text-ink-faint">comparable outlets (est.)</p>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-ink-mute">Competition intensity</span>
                    <span className="tabular font-bold text-coral-600">{selectedSnapshot.competition}/100</span>
                  </div>
                  <Meter value={selectedSnapshot.competition} tone="coral" height="xs" className="mt-1" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-ink-mute">Opportunity signal</span>
                    <span className="tabular font-bold text-jade-600">{selectedSnapshot.opportunity}/100</span>
                  </div>
                  <Meter value={selectedSnapshot.opportunity} tone="jade" height="xs" className="mt-1" />
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-line/60 pt-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint">Rent benchmark</p>
                  <p className="tabular mt-0.5 text-[12px] font-extrabold text-ink">
                    {formatCompactINR(selectedSnapshot.rentBenchmark)}
                    <span className="text-[9px] font-medium text-ink-faint"> /month · 1,200 sq ft</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/risk-analysis')}
                  className="btn-secondary h-8 px-2.5 text-[10.5px]"
                >
                  <ShieldAlert className="h-3 w-3" />
                  Assess risk
                </button>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5">
              <PanelHeader
                eyebrow="Opportunity signals"
                title="What is working here"
                description="Four directional indicators behind the locality score."
                icon={Lightbulb}
              />
              <div className="mt-3.5 space-y-2.5">
                {opportunitySignals.map((signal) => (
                  <div key={signal.label} className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-white/40 p-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/75 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <signal.icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10.5px] font-bold text-ink">{signal.label}</p>
                        <p className="tabular text-[10px] font-extrabold text-ink-soft">{signal.score}</p>
                      </div>
                      <Meter value={signal.score} tone={signal.tone} height="xs" className="mt-1" />
                      <p className="mt-1 text-[9px] leading-relaxed text-ink-faint">{signal.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-100/70 bg-brand-50/50 p-2.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                <p className="flex-1 text-[9.5px] font-medium leading-relaxed text-ink-mute">
                  Suitability score <span className="font-extrabold text-brand-800">{selectedComparison.suitability}/100</span>{" "}
                  for this category at {locality.name}.
                </p>
                <button
                  type="button"
                  onClick={() => toggleShortlist(locality.id)}
                  className="shrink-0 rounded-md border border-brand-200/70 bg-white/70 px-1.5 py-1 text-[9px] font-bold text-brand-700 hover:bg-white"
                >
                  {shortlist.includes(locality.id) ? 'In shortlist' : 'Add compare'}
                </button>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>

      <GlassPanel className="p-5">
        <PanelHeader
          eyebrow="Side by side"
          title="Locality comparison"
          description={`Opportunity versus competition for ${category.name.toLowerCase()} across leading markets.`}
          icon={GitCompareArrows}
          action={
            <div className="flex items-center gap-3 text-[10px] font-semibold text-ink-mute">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-jade-500" />
                Opportunity
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-coral-500" />
                Competition
              </span>
            </div>
          }
        />
        <div className="mt-4 h-[288px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChart} layout="vertical" margin={{ top: 0, right: 18, bottom: 0, left: 8 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#8B90A2', fontWeight: 600 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10.5, fill: '#454C61', fontWeight: 600 }}
                width={94}
              />
              <Tooltip content={<ChartTooltip formatter={(value) => `${value}/100`} />} />
              <Bar dataKey="Opportunity" fill="#1D9B6A" radius={[0, 4, 4, 0]} barSize={9} />
              <Bar dataKey="Competition" fill="#DC6A5F" radius={[0, 4, 4, 0]} barSize={9} fillOpacity={0.78} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[9.5px] font-medium text-ink-faint">
          <Store className="h-3 w-3" />
          Scores are model estimates based on illustrative market data, not verified business records.
        </p>
      </GlassPanel>

      <Modal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title="Comparison shortlist"
        description={`${category.name} · ${shortlist.length} of 4 localities selected`}
        className="max-w-[560px]"
      >
        <div className="p-4">
          {shortlist.length < 2 ? (
            <div className="rounded-2xl border border-dashed border-line bg-canvas/40 px-4 py-8 text-center">
              <GitCompareArrows className="mx-auto h-6 w-6 text-ink-faint" />
              <p className="mt-2 text-[12px] font-bold text-ink">Select at least two localities</p>
              <p className="mt-1 text-[10.5px] text-ink-mute">
                Use the + control beside a locality in the explorer list.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {shortlistMetrics.map((metrics) => (
                <div key={metrics.locality.id} className="rounded-2xl border border-line/70 bg-white/55 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-brand-600" />
                      <p className="text-[12px] font-extrabold text-ink">{metrics.locality.name}</p>
                      <Badge tone={metrics.risk >= 60 ? 'coral' : metrics.risk >= 42 ? 'gold' : 'jade'}>
                        risk {metrics.risk}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleShortlist(metrics.locality.id)}
                      className="rounded-md p-1 text-ink-faint transition-colors hover:bg-coral-50 hover:text-coral-600"
                      aria-label={`Remove ${metrics.locality.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {[
                      { label: 'Suitability', value: metrics.suitability, tone: 'jade'  },
                      { label: 'Competition', value: metrics.competition, tone: 'coral'  },
                      { label: 'Opportunity', value: metrics.snapshot.opportunity, tone: 'brand'  },
                      { label: 'Activity', value: metrics.activity, tone: 'sea'  },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <p className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-faint">{metric.label}</p>
                        <p className="tabular mt-0.5 text-[12px] font-extrabold text-ink">{metric.value}</p>
                        <Meter value={metric.value} tone={metric.tone} height="xs" className="mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={shortlist.length < 2}
              onClick={() => {
                setCompareOpen(false)
                navigate('/location-comparison')
              }}
              className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Open full comparison
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShortlist([])}
              className="btn-secondary"
              disabled={shortlist.length === 0}
            >
              Clear all
            </button>
          </div>
          <p className="mt-2.5 text-center text-[9px] font-medium text-ink-faint">
            Illustrative scores · open the comparison workspace to adjust category and assumptions.
          </p>
        </div>
      </Modal>
    </div>
  )
}
