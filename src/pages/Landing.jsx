
import { motion } from 'framer-motion'

import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calculator,
  CheckCircle2,
  Compass,
  GitCompareArrows,
  LayoutDashboard,
  MapPin,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { categories, getCategory } from '../data/categories'
import { getLocality, localities, totalLocalityBusinesses } from '../data/localities'
import {
  buildMarketBrief,
  calculateFeasibility,
  calculateRisk,
  defaultFeasibilityInputs,
  defaultRiskInputs,
  getMarketSnapshot,
} from '../lib/analytics'

import { cn, formatCompactINR, formatNumber } from '../lib/utils'

const previewCategory = getCategory('cafes')
const previewLocality = getLocality('banjara-hills')
const previewSnapshot = getMarketSnapshot(previewCategory.id, previewLocality.id)
const previewRisk = calculateRisk(previewCategory.id, previewLocality.id, defaultRiskInputs)
const previewBrief = buildMarketBrief(previewCategory.id, previewLocality.id)
const previewFeasibility = calculateFeasibility(defaultFeasibilityInputs)

const recStyles


 = {
  GO: {
    badge: 'border-jade-200/70 bg-jade-50 text-jade-700',
    icon: CheckCircle2,
    dot: 'bg-jade-500',
    text: 'text-jade-700',
  },
  'CONDITIONAL GO': {
    badge: 'border-gold-200/70 bg-gold-50 text-gold-700',
    icon: AlertTriangle,
    dot: 'bg-gold-500',
    text: 'text-gold-700',
  },
  'NO-GO': {
    badge: 'border-coral-200/70 bg-coral-50 text-coral-700',
    icon: XCircle,
    dot: 'bg-coral-500',
    text: 'text-coral-700',
  },
}

const recStyle = recStyles[previewBrief.recommendation]
const RecIcon = recStyle.icon

const riskAccent =
  previewRisk.band === 'Low'
    ? '#1D9B6A'
    : previewRisk.band === 'Moderate'
      ? '#D0922B'
      : previewRisk.band === 'Elevated'
        ? '#DC6A5F'
        : '#C64F44'

const riskChip =
  previewRisk.band === 'Low'
    ? 'bg-jade-50 text-jade-700 border-jade-200/70'
    : previewRisk.band === 'Moderate'
      ? 'bg-gold-50 text-gold-700 border-gold-200/70'
      : 'bg-coral-50 text-coral-700 border-coral-200/70'

const chartWidth = 520
const chartHeight = 112
const trendValues = previewCategory.trend
const chartMin = Math.min(...trendValues)
const chartMax = Math.max(...trendValues)
const chartSpread = Math.max(1, chartMax - chartMin)
const chartPoints = trendValues.map((value, index) => ({
  x: (index / Math.max(1, trendValues.length - 1)) * chartWidth,
  y: 8 + (1 - (value - chartMin) / chartSpread) * (chartHeight - 22),
}))

function smoothPath(points) {
  return points.reduce((path, point, index, all) => {
    if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    const previous = all[index - 1]
    const controlX = (previous.x + point.x) / 2
    return `${path} C ${controlX.toFixed(1)} ${previous.y.toFixed(1)} ${controlX.toFixed(1)} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  }, '')
}

const heroLinePath = smoothPath(chartPoints)
const heroAreaPath = `${heroLinePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`
const lastChartPoint = chartPoints[chartPoints.length - 1]

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

const heroStats = [
  { value: formatNumber(totalLocalityBusinesses), label: 'tracked businesses' },
  { value: formatNumber(localities.length), label: 'Hyderabad localities' },
  { value: formatNumber(categories.length), label: 'business categories' },
  { value: '8', label: 'connected decision views' },
]

const steps = [
  {
    number: '01',
    icon: Compass,
    title: 'Choose your market',
    description:
      'Start with a category and locality. See supply, activity, competition, and opportunity in one glance.',
  },
  {
    number: '02',
    icon: Calculator,
    title: 'Pressure-test the plan',
    description:
      'Model rent, investment, staffing, and revenue. Watch margin, payback, and break-even respond instantly.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Move with a brief',
    description:
      'Get a clear recommendation, the risks behind it, and a short list of next steps you can act on.',
  },
]

const features







 = [
  {
    title: 'Market Explorer',
    description: 'See supply, density, and opportunity across every tracked locality in Hyderabad.',
    to: '/market-explorer',
    icon: Compass,
    tone: 'brand',
    metric: '16 localities',
    span: 'md:col-span-2',
  },
  {
    title: 'Competitor Intelligence',
    description: 'Map the nearby competitive set, concentration, and where the positioning gaps are.',
    to: '/competitor-intelligence',
    icon: UsersRound,
    tone: 'sea',
    metric: 'HHI + ratings',
  },
  {
    title: 'Market Trends',
    description: 'Track registrations, closures, and category momentum over time.',
    to: '/market-trends',
    icon: TrendingUp,
    tone: 'gold',
    metric: '+16.8% wellness',
  },
  {
    title: 'Risk Analysis',
    description: 'Blend competition, market, financial, and location signals into a directional risk score.',
    to: '/risk-analysis',
    icon: ShieldAlert,
    tone: 'coral',
    metric: `${previewRisk.score}/100 estimate`,
  },
  {
    title: 'Location Comparison',
    description: 'Pressure-test up to four localities side by side on fit, rent, and risk.',
    to: '/location-comparison',
    icon: GitCompareArrows,
    tone: 'brand',
    metric: '4-way compare',
  },
  {
    title: 'Financial Feasibility',
    description: 'Turn assumptions into monthly profit, margin, cash-flow, and a break-even estimate.',
    to: '/financial-feasibility',
    icon: Calculator,
    tone: 'jade',
    metric: `${previewFeasibility.breakEvenMonths ?? '—'} mo payback`,
  },
  {
    title: 'AI Market Assistant',
    description:
      'Ask a plain-language question and get a grounded brief with a recommendation, evidence, and next steps.',
    to: '/market-assistant',
    icon: Sparkles,
    tone: 'sea',
    metric: 'Grounded briefs',
    span: 'md:col-span-2',
  },
]

const toneClasses = {
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  sea: 'bg-sea-50 text-sea-700 border-sea-100',
  jade: 'bg-jade-50 text-jade-700 border-jade-100',
  gold: 'bg-gold-50 text-gold-700 border-gold-100',
  coral: 'bg-coral-50 text-coral-700 border-coral-100',
}

const featureDots = {
  brand: 'bg-brand-500',
  sea: 'bg-sea-500',
  jade: 'bg-jade-500',
  gold: 'bg-gold-500',
  coral: 'bg-coral-500',
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1]  },
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}




) {
  return (
    <motion.div
      {...fadeUp}
      className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : 'text-left')}
    >
      <span className="label">{eyebrow}</span>
      <h2 className="mt-2 font-display text-[27px] font-extrabold leading-[1.1] tracking-[-0.04em] text-ink sm:text-[34px]">
        {title}
      </h2>
      {description && (
        <p className={cn('mt-2.5 text-[13px] leading-relaxed text-ink-mute', align === 'center' && 'mx-auto max-w-xl')}>
          {description}
        </p>
      )}
    </motion.div>
  )
}

function DashboardPreview() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/90 bg-[rgba(255,255,255,0.88)] shadow-lift backdrop-blur-2xl">
      <div className="flex h-8 items-center gap-2 border-b border-line/70 bg-white/60 px-3">
        <span className="h-2 w-2 rounded-full bg-coral-500" />
        <span className="h-2 w-2 rounded-full bg-gold-500" />
        <span className="h-2 w-2 rounded-full bg-jade-500" />
        <div className="mx-auto flex items-center gap-1 rounded-md border border-line/60 bg-white/75 px-2 py-0.5 text-[6.5px] font-semibold text-ink-faint">
          marketminds.app <span className="text-line-strong">/</span> dashboard
        </div>
        <span className="w-8" />
      </div>

      <div className="flex">
        <aside className="hidden w-[148px] shrink-0 border-r border-line/60 bg-white/35 p-2.5 sm:block">
          <div className="flex items-center gap-1.5">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-lg text-[7px] font-extrabold text-white"
              style={{ background: 'linear-gradient(145deg, #6d6ae4, #35328c)' }}
            >
              M
            </span>
            <div>
              <p className="text-[8px] font-extrabold tracking-[-0.02em] text-ink">MarketMinds</p>
              <p className="text-[5.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Intelligence
              </p>
            </div>
          </div>

          <p className="mb-1 mt-3 text-[5.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Workspace
          </p>
          <div className="space-y-0.5">
            {[
              { icon: LayoutDashboard, label: 'Overview', active: true },
              { icon: Compass, label: 'Explorer' },
              { icon: UsersRound, label: 'Competitors' },
              { icon: TrendingUp, label: 'Trends' },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[7px] font-semibold',
                  item.active ? 'bg-brand-50 text-brand-700' : 'text-ink-mute',
                )}
              >
                <item.icon className="h-2.5 w-2.5" />
                {item.label}
              </div>
            ))}
          </div>

          <p className="mb-1 mt-3 text-[5.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Decision tools
          </p>
          <div className="space-y-0.5">
            {[
              { icon: ShieldAlert, label: 'Risk analysis' },
              { icon: GitCompareArrows, label: 'Compare areas' },
              { icon: Calculator, label: 'Feasibility' },
              { icon: Sparkles, label: 'AI assistant' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[7px] font-semibold text-ink-mute"
              >
                <item.icon className="h-2.5 w-2.5" />
                {item.label}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-line/60 bg-white/55 p-2">
            <div className="flex items-center gap-1">
              <span className="h-1 w-1 animate-pulse-soft rounded-full bg-jade-500" />
              <p className="text-[5.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                Demo workspace
              </p>
            </div>
            <p className="mt-1 text-[5.5px] leading-relaxed text-ink-faint">
              Illustrative data for product preview.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-2.5 sm:p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[6px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Workspace / Overview
              </p>
              <h3 className="mt-0.5 font-display text-[11px] font-extrabold tracking-[-0.03em] text-ink">
                Market overview
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 items-center gap-1 rounded-md border border-line/60 bg-white/70 px-1.5 text-[6px] font-semibold text-ink-mute">
                <MapPin className="h-2 w-2 text-brand-500" />
                {previewLocality.name} · {previewCategory.shortName}
              </span>
              <span className="hidden h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[5.5px] font-extrabold text-white sm:flex">
                AM
              </span>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[
              {
                icon: Building2,
                label: 'Est. establishments',
                value: formatNumber(previewSnapshot.presence),
                detail: `${signedValue(previewCategory.growth)} category`,
                tone: 'text-brand-700 bg-brand-50 border-brand-100',
              },
              {
                icon: UsersRound,
                label: 'Competition',
                value: `${previewSnapshot.competition}/100`,
                detail: 'density pressure',
                tone: 'text-coral-700 bg-coral-50 border-coral-100',
              },
              {
                icon: Target,
                label: 'Opportunity',
                value: `${previewSnapshot.opportunity}/100`,
                detail: 'fit score',
                tone: 'text-sea-700 bg-sea-50 border-sea-100',
              },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-line/60 bg-white/60 p-1.5 sm:p-2">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[5.5px] font-bold uppercase tracking-[0.06em] text-ink-faint sm:text-[6px]">
                    {kpi.label}
                  </p>
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', kpi.tone)}>
                    <kpi.icon className="h-2 w-2" />
                  </span>
                </div>
                <p className="tabular mt-1 text-[12px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                  {kpi.value}
                </p>
                <p className="mt-0.5 truncate text-[5.5px] font-medium text-ink-faint">{kpi.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_178px]">
            <div className="rounded-xl border border-line/60 bg-white/55 p-2 sm:p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[7.5px] font-extrabold text-ink">Registration momentum</p>
                  <p className="text-[5.5px] font-medium text-ink-faint">
                    {previewCategory.shortName} · {previewLocality.name} · 8 months
                  </p>
                </div>
                <div className="flex items-center gap-0.5 rounded-md border border-line/60 bg-white/70 p-0.5">
                  <span className="rounded bg-white px-1.5 py-0.5 text-[5.5px] font-bold text-brand-700 shadow-sm">
                    8M
                  </span>
                  <span className="px-1.5 py-0.5 text-[5.5px] font-semibold text-ink-faint">12M</span>
                </div>
              </div>

              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="mt-1.5 h-[92px] w-full"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="hero-chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4946B4" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#4946B4" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((ratio) => (
                  <line
                    key={ratio}
                    x1="0"
                    x2={chartWidth}
                    y1={chartHeight * ratio}
                    y2={chartHeight * ratio}
                    stroke="#EAE3D7"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                  />
                ))}
                <path d={heroAreaPath} fill="url(#hero-chart-fill)" />
                <path
                  d={heroLinePath}
                  fill="none"
                  stroke="#4946B4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="animate-draw-line"
                  strokeDasharray="600"
                />
                <circle cx={lastChartPoint.x} cy={lastChartPoint.y} r="7" fill="#4946B4" opacity="0.12" />
                <circle
                  cx={lastChartPoint.x}
                  cy={lastChartPoint.y}
                  r="3.2"
                  fill="#4946B4"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                />
              </svg>
              <div className="mt-1 flex justify-between text-[5px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                {monthLabels.map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </div>

            <div className="hidden flex-col gap-1.5 md:flex">
              <div className="rounded-xl border border-line/60 bg-white/55 p-2">
                <div className="flex items-center justify-between">
                  <p className="text-[5.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                    Risk estimate
                  </p>
                  <ShieldAlert className="h-2.5 w-2.5 text-coral-500" />
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(${riskAccent} ${previewRisk.score}%, rgba(27,31,47,0.08) 0)`,
                    }}
                  >
                    <div className="flex h-[27px] w-[27px] items-center justify-center rounded-full bg-white">
                      <span className="tabular text-[7.5px] font-extrabold text-ink">{previewRisk.score}</span>
                    </div>
                  </div>
                  <div>
                    <p className={cn('inline-flex rounded-full border px-1.5 py-0.5 text-[5.5px] font-bold', riskChip)}>
                      {previewRisk.band}
                    </p>
                    <p className="mt-0.5 text-[5px] font-medium leading-snug text-ink-faint">
                      Financial pressure {previewRisk.financialPressure}/100
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 rounded-xl border border-line/60 bg-white/55 p-2">
                <p className="text-[5.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                  Category mix
                </p>
                {[
                  { label: 'Restaurants', value: 15.4, tone: 'bg-coral-500' },
                  { label: 'Fashion', value: 10.9, tone: 'bg-brand-500' },
                  { label: 'Cafés', value: 8.3, tone: 'bg-gold-500' },
                ].map((item) => (
                  <div key={item.label} className="mt-1.5">
                    <div className="flex items-center justify-between text-[5.5px] font-semibold">
                      <span className="text-ink-mute">{item.label}</span>
                      <span className="tabular text-ink-faint">{item.value}%</span>
                    </div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                      <div className={cn('h-full rounded-full', item.tone)} style={{ width: `${item.value * 4}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function signedValue(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function Landing() {
  return (
    <div id="top" className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 z-0 noise-overlay" />

      <header className="sticky top-0 z-50 border-b border-line/50 bg-[rgba(245,241,232,0.78)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" aria-label="MarketMinds home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-6 text-[12px] font-semibold text-ink-mute md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#toolkit" className="transition-colors hover:text-ink">
              Product
            </a>
            <a href="#intelligence" className="transition-colors hover:text-ink">
              AI briefs
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[10px] font-semibold text-ink-faint lg:flex">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-jade-500" />
              Product demo
            </span>
            <Link
              to="/dashboard"
              className="btn-primary h-9 px-3.5 text-[12px]"
            >
              Open workspace
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative px-5 pb-14 pt-14 sm:pt-20">
          <div
            className="pointer-events-none absolute inset-0 -z-10 dot-grid opacity-50"
            style={{ maskImage: 'linear-gradient(to bottom, black, transparent 78%)' }}
          />
          <div className="pointer-events-none absolute left-[8%] top-20 -z-10 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl" />
          <div className="pointer-events-none absolute right-[4%] top-40 -z-10 h-80 w-80 rounded-full bg-sea-200/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-64 w-96 rounded-full bg-gold-200/25 blur-3xl" />

          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white/65 py-1 pl-2 pr-3 text-[10.5px] font-semibold text-ink-mute shadow-soft backdrop-blur"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                <Sparkles className="h-2.5 w-2.5" />
              </span>
              Market intelligence for Hyderabad
              <span className="h-1 w-1 rounded-full bg-line-strong" />
              <span className="text-brand-700">Frontend demo</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 font-display text-[43px] font-extrabold leading-[0.98] tracking-[-0.055em] text-ink sm:text-[62px] lg:text-[76px]"
            >
              Understand the market.
              <br />
              Evaluate the risk.
              <br />
              <span className="relative inline-block">
                Make the <span className="serif-accent text-gradient-brand">right move.</span>
                <span className="absolute -bottom-2 left-1/2 h-2 w-2/3 -translate-x-1/2 rounded-full bg-brand-400/20 blur-md" />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mx-auto mt-5 max-w-2xl text-[13.5px] leading-relaxed text-ink-mute sm:text-[15px]"
            >
              Turn scattered local signals into one clear decision. Demand, competition, rent, risk,
              and financial feasibility — brought together in a workspace built for real choices.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
            >
              <Link to="/dashboard" className="btn-primary h-11 px-5 text-[13px]">
                Explore the market
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how-it-works" className="btn-secondary h-11 px-5 text-[13px]">
                See how it works
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-3.5 text-[10px] font-semibold text-ink-faint"
            >
              Instant workspace · no account required · illustrative data throughout
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 36, rotateX: 5 }}
            animate={{ opacity: 1, y: 0, rotateX: 1.5 }}
            transition={{ duration: 0.9, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformPerspective: 1400 }}
            className="relative mx-auto mt-12 max-w-6xl sm:mt-14"
          >
            <div className="absolute -bottom-6 left-[12%] right-[12%] h-12 rounded-[50%] bg-ink/15 blur-2xl" />
            <DashboardPreview />

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.8 }}
              className="absolute -top-5 right-2 z-20 hidden w-[192px] rounded-2xl border border-white/90 bg-[rgba(255,255,255,0.92)] p-3 shadow-lift backdrop-blur-xl lg:right-[-18px] lg:block"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  <Sparkles className="h-2.5 w-2.5 text-brand-500" />
                  AI brief
                </span>
                <span className="text-[7.5px] font-bold text-ink-faint">{previewBrief.confidence}%</span>
              </div>
              <div className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold', recStyle.badge)}>
                <RecIcon className="h-2.5 w-2.5" />
                {previewBrief.recommendation}
              </div>
              <p className="mt-1.5 text-[8.5px] leading-relaxed text-ink-mute">
                {previewBrief.opportunities[0].split('.')[0]}.
              </p>
              <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                <span className="text-[7px] font-semibold text-ink-faint">Proceed with discipline</span>
                <ArrowUpRight className="h-2.5 w-2.5 text-brand-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.95 }}
              className="absolute -bottom-7 left-2 z-20 hidden w-[192px] rounded-2xl border border-white/90 bg-[rgba(255,255,255,0.92)] p-3 shadow-lift backdrop-blur-xl lg:left-[-16px] lg:block"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-jade-200/60 bg-jade-50 text-jade-700">
                  <Wallet className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-ink-faint">Payback estimate</p>
                  <p className="tabular text-[13px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                    {previewFeasibility.breakEvenMonths} months
                  </p>
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                <div className="h-full w-[58%] rounded-full bg-jade-500" />
              </div>
              <p className="mt-1.5 text-[7.5px] font-medium text-ink-faint">
                {previewFeasibility.margin.toFixed(1)}% monthly margin at default assumptions
              </p>
            </motion.div>
          </motion.div>
        </section>

        <section className="px-5">
          <motion.div
            {...fadeUp}
            className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/90 bg-line/60 shadow-soft sm:grid-cols-4"
          >
            {heroStats.map((stat) => (
              <div key={stat.label} className="bg-white/65 px-4 py-4 text-center backdrop-blur-sm sm:py-5">
                <p className="tabular font-display text-[22px] font-extrabold leading-none tracking-[-0.04em] text-ink sm:text-[26px]">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:py-24">
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                From scattered signals to a{' '}
                <span className="serif-accent text-gradient-brand">confident decision.</span>
              </>
            }
            description="Three steps, one workspace. No spreadsheets, no consulting deck, no guesswork dressed up as certainty."
          />

          <div className="relative mx-auto mt-10 max-w-6xl">
            <div className="absolute left-[16%] right-[16%] top-[74px] hidden border-t border-dashed border-line-strong/70 xl:block" />
            <div className="relative grid gap-3 md:grid-cols-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.08 }}
                  className="rounded-3xl border border-white/90 bg-white/55 p-5 shadow-soft backdrop-blur-md"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/90 bg-white/80 text-brand-700 shadow-inner-line">
                      <step.icon className="h-4 w-4" />
                    </span>
                    <span className="serif-accent text-[38px] leading-none text-brand-200">{step.number}</span>
                  </div>
                  <h3 className="mt-4 font-display text-[16px] font-extrabold tracking-[-0.025em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mute">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div {...fadeUp} className="mt-7 text-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-700 transition-colors hover:text-brand-900"
            >
              Start with the dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </section>

        <section id="toolkit" className="scroll-mt-24 border-y border-line/50 bg-white/25 px-5 py-20 sm:py-24">
          <SectionHeading
            eyebrow="The toolkit"
            title={
              <>
                One workspace. <span className="serif-accent text-gradient-brand">Eight ways</span> to see
                the market.
              </>
            }
            description="Every view answers a different question. Together they turn market curiosity into a decision you can defend."
          />

          <div className="mx-auto mt-10 grid max-w-6xl gap-3 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: Math.min(index * 0.05, 0.2) }}
                className={cn(feature.span)}
              >
                <Link
                  to={feature.to}
                  className="group flex h-full flex-col rounded-2xl border border-white/90 bg-white/55 p-4 shadow-soft backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white/80 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl border',
                        toneClasses[feature.tone],
                      )}
                    >
                      <feature.icon className="h-4 w-4" />
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-ink-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </div>

                  <h3 className="mt-3 font-display text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">{feature.description}</p>

                  {feature.title === 'Market Explorer' && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {['Banjara Hills', 'Gachibowli', 'Kokapet', 'Uppal'].map((name, chipIndex) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-full border border-line/70 bg-white/70 px-2 py-0.5 text-[8px] font-semibold text-ink-mute"
                        >
                          <span
                            className={cn(
                              'h-1 w-1 rounded-full',
                              chipIndex === 0
                                ? 'bg-coral-500'
                                : chipIndex === 1
                                  ? 'bg-jade-500'
                                  : chipIndex === 2
                                    ? 'bg-brand-500'
                                    : 'bg-gold-500',
                            )}
                          />
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  {feature.title === 'AI Market Assistant' && (
                    <div className="mt-3 rounded-xl border border-line/60 bg-white/70 p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-brand-600 text-white">
                          <Sparkles className="h-2 w-2" />
                        </span>
                        <p className="text-[8px] font-semibold text-ink-mute">
                          How saturated is {previewLocality.name} for cafés?
                        </p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 border-t border-line/60 pt-1.5">
                        <span className={cn('h-1 w-1 rounded-full', recStyle.dot)} />
                        <p className="text-[8px] font-medium text-ink-faint">
                          {previewBrief.recommendation} · {previewBrief.confidence}% confidence · grounded in
                          current context
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-line/60 bg-white/60 px-2 py-0.5 text-[8px] font-bold text-ink-faint">
                      <span className={cn('h-1 w-1 rounded-full', featureDots[feature.tone])} />
                      {feature.metric}
                    </span>
                    <span className="text-[9px] font-bold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
                      Explore
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="intelligence" className="scroll-mt-24 px-5 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            <motion.div {...fadeUp}>
              <span className="label">Synthesised intelligence</span>
              <h2 className="mt-2 max-w-xl font-display text-[29px] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink sm:text-[38px]">
                A recommendation you can{' '}
                <span className="serif-accent text-gradient-brand">defend.</span>
              </h2>
              <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-mute">
                Most tools give you another chart. MarketMinds reads the market, weighs the downside, and
                states a direction — with the evidence and uncertainty visible.
              </p>

              <div className="mt-6 space-y-2.5">
                {[
                  {
                    icon: Compass,
                    title: 'Grounded in your context',
                    detail: 'The selected category, locality, and cost assumptions shape every answer.',
                  },
                  {
                    icon: ShieldAlert,
                    title: 'Explicit about uncertainty',
                    detail: 'Scores are directional estimates — clearly labelled, never dressed up as certainty.',
                  },
                  {
                    icon: Target,
                    title: 'Built to be acted on',
                    detail: 'Each brief closes with the risks that matter and a short list of next steps.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-white/90 bg-white/50 p-3 shadow-soft backdrop-blur-sm"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line/60 bg-white/75 text-brand-700">
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-[11.5px] font-bold text-ink">{item.title}</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-mute">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/market-assistant"
                className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-700 transition-colors hover:text-brand-900"
              >
                Open the AI market assistant
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            <motion.div {...fadeUp} className="relative">
              <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-brand-200/35 via-sea-200/25 to-gold-200/35 blur-2xl" />
              <div className="relative rounded-[28px] border border-white/90 bg-[rgba(255,255,255,0.78)] p-5 shadow-lift backdrop-blur-2xl sm:p-6">
                <div className="flex items-center justify-between border-b border-line/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="font-display text-[12px] font-extrabold text-ink">Market brief</p>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                        {previewLocality.name} · {previewCategory.shortName}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-line/60 bg-white/70 px-2 py-0.5 text-[8px] font-bold text-ink-faint">
                    Generated
                  </span>
                </div>

                <div className={cn('mt-3.5 rounded-2xl border p-3.5', recStyle.badge)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70">
                        <RecIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[7.5px] font-bold uppercase tracking-[0.12em] opacity-65">
                          Recommendation
                        </p>
                        <p className="mt-0.5 font-display text-[20px] font-extrabold leading-none tracking-[-0.04em]">
                          {previewBrief.recommendation}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[7.5px] font-bold uppercase tracking-[0.1em] opacity-60">
                        Confidence
                      </p>
                      <p className="tabular font-display text-[17px] font-extrabold leading-none">
                        {previewBrief.confidence}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full bg-current opacity-70"
                      style={{ width: `${previewBrief.confidence}%` }}
                    />
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-[10px] leading-relaxed text-ink-mute">
                  {previewBrief.summary}
                </p>

                <div className="mt-3 space-y-1.5">
                  {[previewBrief.opportunities[0], previewBrief.risks[0]].map((line, index) => (
                    <div key={index} className="flex gap-2">
                      <span
                        className={cn(
                          'mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full',
                          index === 0 ? 'bg-jade-500' : 'bg-coral-500',
                        )}
                      />
                      <p className="line-clamp-2 text-[9px] leading-relaxed text-ink-mute">{line}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-line/60 bg-white/60 px-2.5 py-2">
                    <p className="text-[7px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                      Risk estimate
                    </p>
                    <p className="tabular mt-0.5 text-[13px] font-extrabold text-ink">
                      {previewRisk.score}
                      <span className="text-[8px] font-semibold text-ink-faint">/100</span>
                    </p>
                    <p className="mt-0.5 text-[7.5px] font-semibold" style={{ color: riskAccent }}>
                      {previewRisk.band}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line/60 bg-white/60 px-2.5 py-2">
                    <p className="text-[7px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                      Rent benchmark
                    </p>
                    <p className="tabular mt-0.5 text-[13px] font-extrabold text-ink">
                      {formatCompactINR(previewSnapshot.rentBenchmark)}
                    </p>
                    <p className="mt-0.5 text-[7.5px] font-semibold text-ink-faint">per month · 1,200 sq ft</p>
                  </div>
                </div>

                <Link
                  to="/market-assistant"
                  className="mt-3 flex items-center gap-2 rounded-xl border border-line/70 bg-white/70 p-2 transition-colors hover:border-brand-200 hover:bg-white"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                  <span className="flex-1 text-[9px] font-medium text-ink-faint">
                    Ask about rent, saturation, or growth…
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-600 text-white">
                    <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </Link>

                <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                  <span className="text-[8px] font-medium text-ink-faint">
                    Illustrative estimate · mock market data
                  </span>
                  <div className="flex -space-x-1">
                    {['bg-brand-500', 'bg-sea-500', 'bg-gold-500'].map((color) => (
                      <span key={color} className={cn('h-3.5 w-3.5 rounded-full border-2 border-white', color)} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 right-4 z-10 hidden items-center gap-2 rounded-xl border border-white/90 bg-white/90 px-3 py-2 shadow-lift backdrop-blur-xl sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-jade-50 text-jade-700">
                  <Wallet className="h-3 w-3" />
                </span>
                <div>
                  <p className="text-[6.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Break-even
                  </p>
                  <p className="tabular text-[10px] font-extrabold leading-none text-ink">
                    {previewFeasibility.breakEvenMonths} months
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:pb-20">
          <motion.div
            {...fadeUp}
            className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-white/20 px-6 py-12 text-center shadow-lift sm:px-10 sm:py-16"
            style={{
              background: 'linear-gradient(135deg, #25225C 0%, #4946B4 54%, #0E7E77 100%)',
            }}
          >
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-sea-200/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 noise-overlay opacity-20" />

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/80">
                <Sparkles className="h-3 w-3" />
                Before you commit
              </span>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-[29px] font-extrabold leading-[1.06] tracking-[-0.04em] text-white sm:text-[42px]">
                Before you sign the lease,
                <br />
                <span className="serif-accent text-[1.06em] text-sea-200">check the market.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[12.5px] leading-relaxed text-white/70">
                Explore the full workspace with illustrative Hyderabad data. See the demand, test the
                downside, and walk into the negotiation with a point of view.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <Link
                  to="/dashboard"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white bg-white px-5 text-[12.5px] font-bold text-brand-800 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.45)] transition-all hover:-translate-y-0.5 hover:bg-cream"
                >
                  Open the workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/market-assistant"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-[12.5px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask the assistant
                </Link>
              </div>
              <p className="mt-3 text-[9.5px] font-medium text-white/45">
                No sign-up · Frontend-only demo · Not financial advice
              </p>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-line/60 px-5 pb-8 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-3 max-w-[260px] text-[10.5px] leading-relaxed text-ink-mute">
                Market intelligence for people making real decisions about where to open, invest, and grow.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white/50 px-2 py-0.5 text-[8px] font-bold text-ink-faint">
                <span className="h-1 w-1 rounded-full bg-jade-500" />
                Hyderabad · demo workspace
              </span>
            </div>

            {[
              {
                title: 'Workspace',
                links: [
                  { label: 'Overview', to: '/dashboard' },
                  { label: 'Market Explorer', to: '/market-explorer' },
                  { label: 'Competitors', to: '/competitor-intelligence' },
                  { label: 'Market Trends', to: '/market-trends' },
                ],
              },
              {
                title: 'Decision tools',
                links: [
                  { label: 'Risk Analysis', to: '/risk-analysis' },
                  { label: 'Location Comparison', to: '/location-comparison' },
                  { label: 'Financial Feasibility', to: '/financial-feasibility' },
                  { label: 'AI Assistant', to: '/market-assistant' },
                ],
              },
              {
                title: 'Explore',
                links: [
                  { label: 'How it works', to: '#how-it-works' },
                  { label: 'Product', to: '#toolkit' },
                  { label: 'AI briefs', to: '#intelligence' },
                  { label: 'Back to top', to: '#top' },
                ],
              },
            ].map((column) => (
              <div key={column.title}>
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-ink-faint">
                  {column.title}
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {column.links.map((link) =>
                    link.to.startsWith('#') ? (
                      <a
                        key={link.label}
                        href={link.to}
                        className="block text-[10.5px] font-medium text-ink-mute transition-colors hover:text-brand-700"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        to={link.to}
                        className="block text-[10.5px] font-medium text-ink-mute transition-colors hover:text-brand-700"
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-line/60 pt-5 text-[9px] font-medium text-ink-faint sm:flex-row sm:items-center">
            <p>© 2026 MarketMinds. Frontend demonstration with illustrative data.</p>
            <p className="flex items-center gap-1.5">
              <MapPin className="h-2.5 w-2.5" />
              Hyderabad, India · Not verified business information
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
