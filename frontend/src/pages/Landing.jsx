import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Compass,
  GitCompareArrows,
  Layers3,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  Store,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Badge } from '../components/ui/Badge'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
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
    description: 'Compare mapped supply and opportunity across 16 Hyderabad localities.',
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

export function Landing() {
  const navigate = useNavigate()
  const { categories, localities, metaLoading, metaError, reloadMeta } = useMarket()

  const mappedTotal = categories.reduce((sum, item) => sum + (item.mapped_poi_count ?? 0), 0)
  const topCategories = categories
    .slice()
    .sort((a, b) => (b.mapped_poi_count ?? 0) - (a.mapped_poi_count ?? 0))
    .slice(0, 5)
  const maxCategory = Math.max(...topCategories.map((item) => item.mapped_poi_count ?? 0), 1)

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-lift focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(1000px_480px_at_72%_-10%,rgba(79,70,229,0.10),transparent_65%)]" />

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
            <Link to="/dashboard" className="btn-primary ml-2 h-9 px-3.5 text-[12px]">
              Open workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
          <Link to="/dashboard" className="btn-primary h-9 px-3.5 text-[12px] md:hidden">
            Workspace
          </Link>
        </div>
      </header>

      <main id="main" className="relative z-10">
        <section className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-center lg:gap-14 lg:px-8 lg:pb-24 lg:pt-20">
          <div>
            <motion.div {...fadeUp}>
              <span className="chip border-brand-200 bg-white text-brand-800">
                <span className="h-1.5 w-1.5 rounded-full bg-jade-500" />
                Hyderabad market intelligence
              </span>
              <h1 className="mt-5 max-w-[640px] font-display text-[45px] font-bold leading-[1.02] tracking-[-0.06em] text-ink sm:text-[58px] lg:text-[64px]">
                Know the market
                <br />
                <span className="text-gradient-brand">before you commit.</span>
              </h1>
              <p className="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-ink-mute sm:text-[16px]">
                Search a business category and locality. MarketMinds connects mapped supply,
                historical activity, transport access, schools, and relative search interest into
                one clear decision workspace.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.06 }}
              className="mt-7 max-w-[610px]"
            >
              <SearchConsole variant="hero" onComplete={() => navigate('/dashboard')} />
              <p className="mt-2.5 px-0.5 text-[10.5px] font-medium text-ink-faint">
                Search by category, locality, or business name. No account required.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.12 }}
              className="mt-8 grid max-w-[610px] grid-cols-3 divide-x divide-line rounded-xl border border-line bg-white"
            >
              {[
                { value: metaLoading ? '—' : formatNumber(mappedTotal), label: 'mapped places' },
                { value: metaLoading ? '—' : formatNumber(localities.length), label: 'localities' },
                { value: '5', label: 'public sources' },
              ].map((stat) => (
                <div key={stat.label} className="px-3 py-3 sm:px-4">
                  <p className="tabular font-display text-[20px] font-bold tracking-[-0.04em] text-ink sm:text-[23px]">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[9.5px] font-semibold text-ink-faint">{stat.label}</p>
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
            <div className="absolute -inset-3 rounded-[32px] bg-gradient-to-br from-brand-500/[0.07] via-transparent to-sea-500/[0.08]" />
            <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <p className="label">Hyderabad at a glance</p>
                  <p className="mt-1 font-display text-[18px] font-bold tracking-[-0.03em] text-ink">
                    Mapped market supply
                  </p>
                </div>
                <Badge tone={metaLoading ? 'neutral' : metaError ? 'coral' : 'jade'} dot>
                  {metaLoading ? 'Preparing data' : metaError ? 'Unavailable' : 'Data ready'}
                </Badge>
              </div>

              <div className="p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="tabular font-display text-[38px] font-bold leading-none tracking-[-0.055em] text-ink">
                      {metaLoading ? '—' : formatNumber(mappedTotal)}
                    </p>
                    <p className="mt-1.5 text-[10.5px] font-semibold text-ink-faint">
                      mapped places across {categories.length || 13} categories
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                    <Store className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Largest categories
                    </p>
                    <p className="text-[9.5px] font-semibold text-ink-faint">Mapped places</p>
                  </div>

                  {metaLoading &&
                    Array.from({ length: 5 }, (_, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="h-7 w-7 animate-pulse rounded-md bg-ink/[0.06]" />
                        <div className="flex-1 space-y-1.5">
                          <span className="block h-2 w-24 animate-pulse rounded bg-ink/[0.07]" />
                          <span className="block h-1.5 w-full animate-pulse rounded bg-ink/[0.04]" />
                        </div>
                      </div>
                    ))}

                  {!metaLoading &&
                    topCategories.map((category) => {
                      const count = category.mapped_poi_count ?? 0
                      return (
                        <div key={category.id} className="flex items-center gap-3">
                          <CategoryGlyph icon={category.icon} tint={category.tint} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-[11px] font-semibold text-ink-soft">
                                {category.shortName}
                              </p>
                              <p className="tabular shrink-0 text-[10.5px] font-bold text-ink">
                                {formatNumber(count)}
                              </p>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-sea-500"
                                style={{ width: `${Math.max(5, (count / maxCategory) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-lg border border-line bg-[#F8FAFC] p-3">
                  <div className="flex -space-x-1.5">
                    {['brand', 'sea', 'jade'].map((tone) => (
                      <span
                        key={tone}
                        className={cn(
                          'h-6 w-6 rounded-full border-2 border-white',
                          tone === 'brand' ? 'bg-brand-500' : tone === 'sea' ? 'bg-sea-500' : 'bg-jade-500',
                        )}
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-bold text-ink">One context, every view</p>
                    <p className="mt-0.5 truncate text-[9.5px] font-medium text-ink-faint">
                      Category · Locality · Catchment radius
                    </p>
                  </div>
                  <Layers3 className="h-4 w-4 shrink-0 text-ink-faint" />
                </div>
              </div>
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
              >
                <Link
                  to={feature.to}
                  className="group flex h-full flex-col rounded-xl border border-line bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-soft"
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border',
                      toneClass[feature.tone],
                    )}
                  >
                    <feature.icon className="h-4 w-4" strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-3.5 font-display text-[14px] font-bold tracking-[-0.02em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-1 flex-1 text-[11px] leading-relaxed text-ink-mute">
                    {feature.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-700">
                    Open view
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
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
              className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#312E81_0%,#4338CA_55%,#0F766E_125%)] p-6 text-white shadow-lift sm:p-8"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                Evidence, not theater
              </p>
              <h2 className="mt-2 max-w-lg font-display text-[28px] font-bold leading-[1.18] tracking-[-0.04em] sm:text-[34px]">
                Every number has a source.
                <br />
                Every gap stays visible.
              </h2>
              <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-white/75">
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
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-[10.5px] font-semibold text-white/90"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sea-200" />
                    {item}
                  </div>
                ))}
              </div>

              <Link
                to="/dashboard"
                className="mt-7 inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 bg-white px-4 text-[12px] font-bold text-brand-800 transition-colors hover:bg-brand-50"
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
