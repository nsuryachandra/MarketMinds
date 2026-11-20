import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Compass,
  GitCompareArrows,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Badge } from '../components/ui/Badge'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { SearchConsole } from '../components/domain/SearchConsole'
import { SourceNote } from '../components/domain/DataState'
import { useMarket } from '../context/MarketContext'
import { cn, formatNumber } from '../lib/utils'

const features = [
  {
    title: 'Overview',
    description: 'One market pulse across supply, activity, access, and risk.',
    to: '/dashboard',
    icon: BarChart3,
    tone: 'brand',
  },
  {
    title: 'Market Explorer',
    description: 'Compare mapped supply and opportunity across 50+ Hyderabad localities.',
    to: '/market-explorer',
    icon: Compass,
    tone: 'sea',
  },
  {
    title: 'Competitor Intelligence',
    description: 'See nearby businesses, concentration, and category whitespace.',
    to: '/competitor-intelligence',
    icon: UsersRound,
    tone: 'brand',
  },
  {
    title: 'Market Trends',
    description: 'Read historical licence activity and relative search interest.',
    to: '/market-trends',
    icon: TrendingUp,
    tone: 'jade',
  },
  {
    title: 'Risk Analysis',
    description: 'Understand location pressure before committing capital.',
    to: '/risk-analysis',
    icon: ShieldAlert,
    tone: 'coral',
  },
  {
    title: 'Location Comparison',
    description: 'Compare two to four localities on identical evidence.',
    to: '/location-comparison',
    icon: GitCompareArrows,
    tone: 'sea',
  },
  {
    title: 'Financial Feasibility',
    description: 'Test rent, staffing, investment, and revenue assumptions.',
    to: '/financial-feasibility',
    icon: Calculator,
    tone: 'jade',
  },
  {
    title: 'Market Assistant',
    description: 'Ask grounded questions about the market you are reviewing.',
    to: '/market-assistant',
    icon: Sparkles,
    tone: 'brand',
  },
]

const toneClass = {
  brand: 'border-brand-100 bg-brand-50 text-brand-700',
  sea: 'border-sea-100 bg-sea-50 text-sea-700',
  gold: 'border-gold-100 bg-gold-50 text-gold-700',
  coral: 'border-coral-100 bg-coral-50 text-coral-700',
  jade: 'border-jade-100 bg-jade-50 text-jade-700',
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
}

const sources = [
  {
    name: 'OpenStreetMap',
    detail: 'Mapped business locations and categories',
  },
  {
    name: 'GHMC',
    detail: 'Ward boundaries and licence application aggregates',
  },
  {
    name: 'Google Trends',
    detail: 'Relative search interest by category',
  },
  {
    name: 'Hyderabad transport',
    detail: 'Metro station and bus stop accessibility',
  },
  {
    name: 'UDISE+',
    detail: 'Ward-level school context',
  },
]

const HERO_LOCALITIES = [
  {
    id: 'ameerpet',
    name: 'Ameerpet',
    zone: 'Central Commercial & Transit Corridor',
    pois: 762,
    footfall: 'High Footfall Density',
    transitScore: 98,
    transitLabel: 'Red & Blue Interchange',
    velocity: '+14.2% YoY',
    topCategory: 'Cafes & Bakeries',
    catchment: '1,000m',
    poisList: [
      { id: 'am-1', label: 'Coaching Hubs', x: 26, y: 22, color: '#C8792C' },
      { id: 'am-2', label: 'Irani Cafés', x: 68, y: 32, color: '#0A0D12' },
      { id: 'am-3', label: 'Metro Bakeries', x: 20, y: 68, color: '#D97706' },
      { id: 'am-4', label: 'Hardware Marts', x: 74, y: 72, color: '#059669' },
    ],
    segments: [
      { name: 'Cafes & Bakeries', share: 36, color: '#0A0D12' },
      { name: 'Education & Coaching', share: 28, color: '#059669' },
      { name: 'Retail & Grocery', share: 22, color: '#D97706' },
      { name: 'Services', share: 14, color: '#475467' },
    ],
  },
  {
    id: 'gachibowli',
    name: 'Gachibowli',
    zone: 'Tech Spine & Financial District',
    pois: 894,
    footfall: 'Corporate Footfall',
    transitScore: 91,
    transitLabel: 'ORR & Metro Feeder',
    velocity: '+22.5% YoY',
    topCategory: 'Dining & Wellness',
    catchment: '2,000m',
    poisList: [
      { id: 'gb-1', label: 'Tech Campuses', x: 28, y: 20, color: '#0A0D12' },
      { id: 'gb-2', label: 'Third-Wave Coffee', x: 72, y: 26, color: '#C8792C' },
      { id: 'gb-3', label: 'CrossFit Studios', x: 18, y: 70, color: '#059669' },
      { id: 'gb-4', label: 'Executive Dining', x: 70, y: 72, color: '#D97706' },
    ],
    segments: [
      { name: 'Dining & Food Courts', share: 42, color: '#0A0D12' },
      { name: 'Fitness & Wellness', share: 24, color: '#059669' },
      { name: 'Corporate Retail', share: 20, color: '#D97706' },
      { name: 'Commercial Hubs', share: 14, color: '#475467' },
    ],
  },
  {
    id: 'banjara-hills',
    name: 'Banjara Hills',
    zone: 'Prime Luxury & High Street',
    pois: 648,
    footfall: 'High Purchasing Power',
    transitScore: 88,
    transitLabel: 'Road No. 1–12 Arteries',
    velocity: '+9.8% YoY',
    topCategory: 'Boutiques & Specialty',
    catchment: '1,500m',
    poisList: [
      { id: 'bh-1', label: 'Couture Boutiques', x: 24, y: 24, color: '#0A0D12' },
      { id: 'bh-2', label: 'Artisan Eateries', x: 74, y: 30, color: '#C8792C' },
      { id: 'bh-3', label: 'Wellness Spas', x: 22, y: 66, color: '#059669' },
      { id: 'bh-4', label: 'Jewelry Salons', x: 70, y: 74, color: '#D97706' },
    ],
    segments: [
      { name: 'Fine Dining', share: 38, color: '#0A0D12' },
      { name: 'Luxury Boutiques', share: 32, color: '#059669' },
      { name: 'Healthcare & Spas', share: 18, color: '#D97706' },
      { name: 'Specialty Retail', share: 12, color: '#475467' },
    ],
  },
  {
    id: 'kukatpally',
    name: 'Kukatpally',
    zone: 'High-Density Residential Hub',
    pois: 815,
    footfall: 'Family & Retail Traffic',
    transitScore: 96,
    transitLabel: 'KPHB Metro Corridor',
    velocity: '+11.4% YoY',
    topCategory: 'Supermarkets & FMCG',
    catchment: '1,000m',
    poisList: [
      { id: 'kp-1', label: 'Electronics Hubs', x: 26, y: 22, color: '#0A0D12' },
      { id: 'kp-2', label: 'Sweet Houses', x: 70, y: 28, color: '#C8792C' },
      { id: 'kp-3', label: 'Pharmacies', x: 20, y: 72, color: '#059669' },
      { id: 'kp-4', label: 'Hypermarkets', x: 72, y: 70, color: '#D97706' },
    ],
    segments: [
      { name: 'Supermarkets & FMCG', share: 34, color: '#0A0D12' },
      { name: 'Electronics & Apparel', share: 30, color: '#059669' },
      { name: 'Bakeries & Sweets', share: 22, color: '#D97706' },
      { name: 'Pharmacies', share: 14, color: '#475467' },
    ],
  },
]

export function Landing() {
  const navigate = useNavigate()
  const { categories, localities, setLocalityId, metaLoading, metaError, reloadMeta } = useMarket()
  const [activeLocalityIndex, setActiveLocalityIndex] = useState(0)
  const activeLocality = HERO_LOCALITIES[activeLocalityIndex]

  const mappedTotal = categories.reduce((sum, item) => sum + (item.mapped_poi_count ?? 0), 0)

  const handleExploreCatchment = (id) => {
    setLocalityId(id)
    navigate('/market-explorer')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-lift focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(1000px_480px_at_72%_-10%,rgba(8,100,232,0.08),transparent_65%)]" />

      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="MarketMinds home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Landing navigation">
            <a href="#how" className="btn-ghost h-9 text-[12px]">
              How it works
            </a>
            <a href="#views" className="btn-ghost h-9 text-[12px]">
              Views
            </a>
            <a href="#data" className="btn-ghost h-9 text-[12px]">
              Data
            </a>
            <a href="#limits" className="btn-ghost h-9 text-[12px]">
              Limits
            </a>
            <Link to="/dashboard" className="btn-primary btn-luminous group ml-2 h-9 px-4 text-[12px] font-semibold tracking-wide">
              <span>Open workspace</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </nav>
          <Link to="/dashboard" className="btn-primary btn-luminous h-9 px-3.5 text-[12px] md:hidden">
            Workspace
          </Link>
        </div>
      </header>

      <main id="main" className="relative z-10">
        <section className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-16">
          <div>
            <motion.div {...fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/90 bg-white/95 px-3.5 py-1 text-[11px] font-semibold text-stone-900 shadow-xs backdrop-blur-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F4D9A0] opacity-90" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C8792C]" />
                </span>
                <span>Hyderabad Urban Market Intelligence</span>
                <span className="text-ink-faint">·</span>
                <span className="font-mono text-[10.5px] font-bold text-[#C8792C]">
                  {localities.length ? `${localities.length} Localities` : '54 Localities'}
                </span>
              </div>
              <h1 className="mt-5 max-w-[640px] font-display text-[46px] font-bold leading-[1.02] tracking-[-0.055em] text-ink sm:text-[58px] lg:text-[66px]">
                Know the market
                <br />
                <span className="font-serif italic font-normal tracking-normal text-ink-mute">before you </span>
                <span className="text-gradient-brand">commit.</span>
              </h1>
              <p className="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-ink-mute sm:text-[16px]">
                Search any business category and locality. MarketMinds connects mapped retail supply,
                historical licence filings, metro access, and search demand into one evidence workspace.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.06 }}
              className="mt-7 max-w-[610px]"
            >
              <SearchConsole variant="hero" onComplete={() => navigate('/dashboard')} />
              <p className="mt-2.5 px-0.5 text-[10.5px] font-medium text-ink-faint">
                Search by category, locality, or business name. Zero signup required.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.12 }}
              className="mt-8 grid max-w-[610px] grid-cols-3 divide-x divide-line/80 rounded-2xl border border-line/80 bg-white/85 p-1 shadow-soft backdrop-blur-xs"
            >
              {[
                {
                  value: mappedTotal,
                  renderValue: () => (
                    <AnimatedNumber
                      value={mappedTotal}
                      className="tabular font-display text-[22px] font-bold tracking-[-0.04em] text-ink sm:text-[25px]"
                    />
                  ),
                  label: 'Mapped Outlets',
                  detail: '13 categories audited',
                },
                {
                  value: localities.length || 54,
                  renderValue: () => (
                    <AnimatedNumber
                      value={localities.length || 54}
                      className="tabular font-display text-[22px] font-bold tracking-[-0.04em] text-ink sm:text-[25px]"
                    />
                  ),
                  label: 'Active Catchments',
                  detail: '155 GHMC wards covered',
                },
                {
                  value: 11,
                  renderValue: () => (
                    <span className="tabular font-display text-[22px] font-bold tracking-[-0.04em] text-ink sm:text-[25px]">
                      11
                    </span>
                  ),
                  label: 'Evidence Streams',
                  detail: 'Civic, mobility, search',
                },
              ].map((stat) => (
                <div key={stat.label} className="px-3.5 py-3 sm:px-4">
                  {metaLoading ? (
                    <span className="tabular font-display text-[22px] font-bold tracking-[-0.04em] text-ink sm:text-[25px]">
                      —
                    </span>
                  ) : (
                    stat.renderValue()
                  )}
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-mute">
                    {stat.label}
                  </p>
                  <p className="text-[9.5px] font-medium text-ink-faint">{stat.detail}</p>
                </div>
              ))}
            </motion.div>

            {metaError && (
              <div className="mt-4 flex max-w-[610px] flex-wrap items-center justify-between gap-2 rounded-lg border border-coral-200 bg-coral-50 px-3 py-2 text-[11px] font-medium text-coral-800">
                <span>Live market data is temporarily unavailable.</span>
                <button type="button" onClick={reloadMeta} className="font-bold underline underline-offset-2">
                  Retry
                </button>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="relative"
          >
            {/* Ambient Aura */}
            <div className="absolute -inset-2 rounded-[36px] bg-gradient-to-br from-brand-500/[0.08] via-blue-500/[0.04] to-sea-500/[0.07] blur-xl" />

            <div className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white/90 p-5 shadow-[0_24px_50px_-15px_rgba(200,121,44,0.14),0_1px_3px_rgba(16,24,40,0.04)] backdrop-blur-xl sm:p-6">
              {/* Header: Catchment title and locality switcher pills */}
              <div className="flex flex-col gap-3 border-b border-line/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C8792C]" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8792C]">
                      Live Spatial Radar
                    </p>
                  </div>
                  <p className="mt-0.5 font-display text-[17px] font-bold tracking-[-0.03em] text-ink">
                    {activeLocality.name} Catchment
                  </p>
                </div>

                {/* Locality Selector Pills */}
                <div className="flex flex-wrap items-center gap-1">
                  {HERO_LOCALITIES.map((loc, idx) => {
                    const isActive = activeLocalityIndex === idx
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setActiveLocalityIndex(idx)}
                        className={cn(
                          'relative rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200',
                          isActive ? 'text-white' : 'text-ink-mute hover:text-[#C8792C]',
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="heroRadarPill"
                            className="absolute inset-0 rounded-lg bg-[#C8792C] shadow-xs"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">{loc.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Spatial Catchment Radar Graphic */}
              <div className="relative mt-4 flex items-center justify-center overflow-hidden rounded-2xl border border-line/60 bg-gradient-to-b from-[#FAF8F5] to-[#F3EDE4] py-6">
                {/* SVG Concentric Rings and Radar Animation */}
                <div className="relative h-[210px] w-[210px]">
                  {/* Concentric Catchment Orbit Circles */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-amber-200/80" />
                  <div className="absolute inset-[24px] rounded-full border border-dashed border-amber-300/70" />
                  <div className="absolute inset-[48px] rounded-full border border-amber-300/40 bg-amber-50/30" />

                  {/* Sonar Expanding Waves */}
                  {[0, 1.5, 3.0].map((delay) => (
                    <motion.div
                      key={delay}
                      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400/50"
                      style={{ width: 60, height: 60 }}
                      animate={{
                        scale: [1, 3.4],
                        opacity: [0.7, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4.5,
                        delay,
                        ease: 'easeOut',
                      }}
                    />
                  ))}

                  {/* Radar Sweep Line */}
                  <div className="animate-radar absolute inset-0 origin-center">
                    <div className="h-1/2 w-1/2 origin-bottom-right bg-gradient-to-br from-[#C8792C]/25 to-transparent [clip-path:polygon(100%_100%,_0_0,_100%_0)]" />
                  </div>

                  {/* Concentric Distance Labels */}
                  <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[8.5px] font-bold tracking-wider text-amber-700/80">
                    {activeLocality.catchment}
                  </span>
                  <span className="pointer-events-none absolute left-1/2 top-[26px] -translate-x-1/2 text-[8px] font-bold tracking-wider text-amber-600">
                    500m
                  </span>

                  {/* Dynamic Mapped POI Floating Nodes */}
                  {activeLocality.poisList.map((poi, idx) => (
                    <motion.div
                      key={poi.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: [0, -3.5, 0],
                      }}
                      transition={{
                        layout: { type: 'spring', stiffness: 340, damping: 28 },
                        y: { repeat: Infinity, duration: 3.2 + idx * 0.5, ease: 'easeInOut' },
                      }}
                      whileHover={{ scale: 1.12, y: -5 }}
                      className="absolute flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-0.5 shadow-xs border border-amber-200/90 cursor-default select-none transition-shadow hover:shadow-soft"
                      style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: poi.color }} />
                      <span className="text-[9px] font-bold text-ink">{poi.label}</span>
                    </motion.div>
                  ))}

                  {/* Epicenter Pin with Pulse */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#C8792C] text-white shadow-md shadow-amber-500/40">
                      <MapPin className="h-4 w-4" />
                      <span className="absolute -inset-1.5 animate-ping rounded-full bg-[#F4D9A0] opacity-60" />
                    </div>
                  </div>
                </div>

                {/* Catchment Info Badge */}
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between rounded-lg bg-white/85 px-3 py-1.5 text-[10px] shadow-xs backdrop-blur-sm border border-line/60">
                  <span className="font-semibold text-ink-mute">{activeLocality.zone}</span>
                  <span className="font-bold text-[#C8792C]">{activeLocality.footfall}</span>
                </div>
              </div>

              {/* 3-Metric Executive Strip */}
              <div className="mt-4 grid grid-cols-3 divide-x divide-line/70 rounded-xl border border-line/70 bg-[#FAF8F5] p-2.5">
                <div className="px-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-ink-faint">
                    Catchment Supply
                  </p>
                  <p className="tabular mt-0.5 font-display text-[17px] font-bold text-ink">
                    <AnimatedNumber value={activeLocality.pois} /> POIs
                  </p>
                  <p className="text-[9px] font-medium text-ink-faint truncate">{activeLocality.topCategory}</p>
                </div>

                <div className="px-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-ink-faint">
                    Transit Access
                  </p>
                  <p className="tabular mt-0.5 font-display text-[17px] font-bold text-[#C8792C]">
                    <AnimatedNumber value={activeLocality.transitScore} />/100
                  </p>
                  <p className="text-[9px] font-medium text-ink-faint truncate">{activeLocality.transitLabel}</p>
                </div>

                <div className="px-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-ink-faint">
                    Filing Velocity
                  </p>
                  <p className="tabular mt-0.5 font-display text-[17px] font-bold text-jade-700">
                    {activeLocality.velocity}
                  </p>
                  <p className="text-[9px] font-medium text-ink-faint">GHMC trade licenses</p>
                </div>
              </div>

              {/* Proportional Category Distribution Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-ink-mute">Catchment Category Mix</span>
                  <span className="text-[9px] text-ink-faint">OpenStreetMap Verified</span>
                </div>
                {/* Segmented Bar */}
                <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-line-soft">
                  {activeLocality.segments.map((seg) => (
                    <motion.div
                      key={seg.name}
                      initial={false}
                      animate={{ width: `${seg.share}%` }}
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      style={{ backgroundColor: seg.color }}
                      className="h-full"
                      title={`${seg.name}: ${seg.share}%`}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {activeLocality.segments.map((seg) => (
                    <div key={seg.name} className="flex items-center gap-1 text-[9.5px]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="font-medium text-ink-mute">{seg.name}</span>
                      <span className="tabular font-bold text-ink">{seg.share}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive CTA button to open that exact catchment */}
              <button
                type="button"
                onClick={() => handleExploreCatchment(activeLocality.id)}
                className="btn-secondary group mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-bold text-ink"
              >
                <span>Explore {activeLocality.name} in Catchment Explorer</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>
        </section>

        <section id="how" className="border-y border-line bg-white">
          <div className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
              <motion.div {...fadeUp}>
                <p className="label">How it works</p>
                <h2 className="mt-2 max-w-md font-display text-[29px] font-bold leading-[1.18] tracking-[-0.045em] text-ink sm:text-[34px]">
                  From a question to an evidence-backed decision.
                </h2>
                <p className="mt-3 max-w-md text-[12.5px] leading-relaxed text-ink-mute">
                  Every view shares the same live context, so the market you search stays with you
                  as you move from overview to financial detail.
                </p>
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    number: '01',
                    title: 'Search the market',
                    copy: 'Choose a category, locality, or exact nearby business.',
                    icon: Search,
                  },
                  {
                    number: '02',
                    title: 'Read the evidence',
                    copy: 'Separate mapped supply, historical activity, access, and search interest.',
                    icon: BarChart3,
                  },
                  {
                    number: '03',
                    title: 'Test the decision',
                    copy: 'Compare locations, assess pressure, and model your own economics.',
                    icon: Calculator,
                  },
                ].map((step, index) => (
                  <motion.div
                    key={step.number}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: index * 0.06 }}
                    className="rounded-xl border border-line bg-[#FBFCFE] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-brand-700">
                        <step.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="tabular text-[10px] font-bold text-ink-faint">{step.number}</span>
                    </div>
                    <h3 className="mt-3.5 text-[12.5px] font-bold text-ink">{step.title}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">{step.copy}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="views" className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="label">Connected decision views</p>
              <h2 className="mt-2 max-w-xl font-display text-[30px] font-bold tracking-[-0.045em] text-ink sm:text-[36px]">
                One market. Eight ways to understand it.
              </h2>
            </div>
            <p className="max-w-sm text-[12px] leading-relaxed text-ink-mute">
              Change the category, locality, or radius once. Every view recalculates from the same
              market context.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.to}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.03 }}
                whileHover={{ y: -5, scale: 1.012 }}
                className="h-full"
              >
                <Link
                  to={feature.to}
                  className="group flex h-full flex-col rounded-xl border border-line bg-white p-4 transition-all duration-300 hover:border-amber-300 hover:shadow-[0_12px_28px_-6px_rgba(200,121,44,0.18)]"
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-110',
                      toneClass[feature.tone],
                    )}
                  >
                    <feature.icon className="h-4 w-4" strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-3.5 font-display text-[14px] font-bold tracking-[-0.02em] text-ink transition-colors group-hover:text-[#C8792C]">
                    {feature.title}
                  </h3>
                  <p className="mt-1 flex-1 text-[11px] leading-relaxed text-ink-mute">
                    {feature.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-[#C8792C]">
                    <span>Open view</span>
                    <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="data" className="border-y border-line bg-white">
          <div className="mx-auto grid w-full max-w-[1240px] gap-4 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
            <motion.div
              {...fadeUp}
              className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#141416_0%,#2A1B0E_60%,#C8792C_125%)] p-6 text-white shadow-lift sm:p-8"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/90">
                Evidence, not theater
              </p>
              <h2 className="mt-2 max-w-lg font-display text-[28px] font-bold leading-[1.18] tracking-[-0.04em] sm:text-[34px]">
                Every number has a source.
                <br />
                Every gap stays visible.
              </h2>
              <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-amber-100/90">
                MarketMinds does not fill missing data with demo values, invented ratings, or
                synthetic demand. When the available data cannot answer a question, the workspace says so.
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {[
                  'Real mapped supply',
                  'Transparent indices',
                  'Source-level context',
                  'Honest unavailable states',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.08] px-2.5 py-2 text-[10.5px] font-semibold text-white/95"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    {item}
                  </div>
                ))}
              </div>

              <Link
                to="/dashboard"
                className="mt-7 inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 bg-white px-4 text-[12px] font-bold text-[#C8792C] transition-colors hover:bg-amber-50"
              >
                Explore the workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
              <div className="rounded-2xl border border-line bg-[#FBFCFE] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="label">Data foundation</p>
                    <h3 className="mt-1 font-display text-[20px] font-bold tracking-[-0.03em] text-ink">
                      Five public sources, one view
                    </h3>
                  </div>
                  <MapPin className="h-4 w-4 text-brand-600" />
                </div>
                <div className="mt-4 divide-y divide-line">
                  {sources.map((source) => (
                    <div key={source.name} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      <div>
                        <p className="text-[11.5px] font-bold text-ink-soft">{source.name}</p>
                        <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-faint">
                          {source.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <SourceNote className="mt-4 border-t border-line pt-3">
                  Community-mapped supply and historical aggregates. Source limitations appear
                  inside every analysis.
                </SourceNote>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="limits" className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="label">Read before deciding</p>
              <h2 className="mt-2 font-display text-[27px] font-bold tracking-[-0.04em] text-ink sm:text-[32px]">
                What this platform cannot know
              </h2>
            </div>
            <Badge tone="gold">No fabricated metrics</Badge>
          </div>

          <div className="mt-5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {[
              'OpenStreetMap is incomplete and community-mapped. A low count is not proof of low competition.',
              'Circular catchments overlap. Locality counts cannot be added into unique city totals.',
              'GHMC figures are reported licence applications from 2022–2023, not confirmed openings.',
              'Google Trends measures relative search interest, not customer volume or revenue.',
              'Rent, footfall, sales, and closures are not invented. Rent is used only when you enter it.',
              'Competition and opportunity scores are directional model estimates, not forecasts.',
            ].map((item) => (
              <p
                key={item}
                className="rounded-lg border border-line bg-white p-3.5 text-[10.5px] leading-relaxed text-ink-mute"
              >
                {item}
              </p>
            ))}
          </div>

          <SourceNote className="mt-4">
            © OpenStreetMap contributors · GHMC ward boundaries and licence applications · UDISE+ ·
            Hyderabad transport records · Google Trends.
          </SourceNote>
        </section>

        <section className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-white px-6 py-8 shadow-soft sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 right-1/3 h-52 w-52 rounded-full bg-sea-100/50 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="label">Start with a question</p>
                <h2 className="mt-2 max-w-lg font-display text-[27px] font-bold tracking-[-0.04em] text-ink sm:text-[32px]">
                  Which market will you understand next?
                </h2>
                <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-ink-mute">
                  Search a category and locality, or open the workspace and adjust the context
                  whenever you need.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link to="/dashboard" className="btn-primary">
                  Open workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a href="#main" className="btn-secondary">
                  Search a market
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line bg-white">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <Logo />
          <p className="text-[10px] font-medium text-ink-faint">
            Local market intelligence for Hyderabad · Evidence-first decision support
          </p>
        </div>
      </footer>
    </div>
  )
}
