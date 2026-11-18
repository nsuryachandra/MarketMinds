import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Compass,
  Database,
  GitCompareArrows,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UsersRound,
  Wallet,
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
    title: 'Market Explorer',
    description: 'Scan all 16 supported localities with real mapped supply, density, and opportunity indices.',
    to: '/market-explorer',
    icon: Compass,
    tone: 'brand',
  },
  {
    title: 'Competitor Intelligence',
    description: 'See nearby mapped outlets, distances, unnamed supply, and category concentration without invented ratings.',
    to: '/competitor-intelligence',
    icon: UsersRound,
    tone: 'sea',
  },
  {
    title: 'Market Trends',
    description: 'Read GHMC 2022–2023 licence application activity and available Google Trends relative interest.',
    to: '/market-trends',
    icon: TrendingUp,
    tone: 'gold',
  },
  {
    title: 'Risk Analysis',
    description: 'Blend mapped competition, historical activity, accessibility, and data completeness into a directional score.',
    to: '/risk-analysis',
    icon: ShieldAlert,
    tone: 'coral',
  },
  {
    title: 'Location Comparison',
    description: 'Compare two to four localities side by side on identical real-data metrics and catchment settings.',
    to: '/location-comparison',
    icon: GitCompareArrows,
    tone: 'brand',
  },
  {
    title: 'Financial Feasibility',
    description: 'Enter your own rent, staffing, investment, and revenue assumptions to model payback and break-even.',
    to: '/financial-feasibility',
    icon: Calculator,
    tone: 'jade',
  },
  {
    title: 'AI Market Assistant',
    description: 'Ask grounded questions when a server-side NVIDIA key is configured. The deterministic analysis always works without AI.',
    to: '/market-assistant',
    icon: Sparkles,
    tone: 'sea',
    wide: true,
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
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
}

export function Landing() {
  const navigate = useNavigate()
  const {
    categories,
    localities,
    health,
    metaLoading,
    metaError,
    reloadMeta,
  } = useMarket()

  const mappedTotal = categories.reduce((sum, item) => sum + (item.mapped_poi_count ?? 0), 0)
  const loadedSources = health?.sources?.loaded ?? 0
  const totalSources = health?.sources?.total ?? 0
  const topCategories = categories
    .slice()
    .sort((a, b) => (b.mapped_poi_count ?? 0) - (a.mapped_poi_count ?? 0))
    .slice(0, 6)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 noise-overlay" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[720px] bg-[radial-gradient(ellipse_at_top,rgba(73,70,180,0.14),transparent_62%)]" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1240px] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link to="/" aria-label="MarketMinds home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#capabilities" className="btn-ghost h-9 text-[12px]">
            Capabilities
          </a>
          <a href="#data" className="btn-ghost h-9 text-[12px]">
            Data
          </a>
          <a href="#limits" className="btn-ghost h-9 text-[12px]">
            Limitations
          </a>
          <Link to="/dashboard" className="btn-secondary ml-1 h-9 px-3 text-[12px]">
            Open workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
        <Link to="/dashboard" className="btn-primary h-9 px-3 text-[12px] md:hidden">
          Workspace
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-center lg:px-8 lg:pb-24 lg:pt-14">
          <div>
            <motion.div {...fadeUp}>
              <span className="chip border-brand-200/70 bg-white/65 text-brand-800">
                <span className="h-1.5 w-1.5 rounded-full bg-jade-500" />
                Hyderabad · live local data
              </span>
              <h1 className="mt-5 max-w-3xl font-display text-[42px] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-[58px]">
                Decide where to open.
                <br />
                <span className="text-gradient-brand">With data, not hunches.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-mute">
                MarketMinds combines mapped Hyderabad businesses, GHMC licence aggregates,
                transport access, schools, and relative search interest into one connected
                location-intelligence workspace.
              </p>
            </motion.div>

            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="mt-7 max-w-2xl">
              <SearchConsole variant="hero" onComplete={() => navigate('/dashboard')} />
              <p className="mt-2.5 px-1 text-[10.5px] font-medium text-ink-faint">
                Try a category and locality, or an exact mapped business name. No login required.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.16 }}
              className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {[
                {
                  value: metaLoading ? '—' : formatNumber(mappedTotal),
                  label: 'mapped POIs',
                },
                {
                  value: metaLoading ? '—' : formatNumber(localities.length),
                  label: 'localities',
                },
                {
                  value: metaLoading ? '—' : formatNumber(categories.length),
                  label: 'categories',
                },
                {
                  value: totalSources ? `${loadedSources}/${totalSources}` : '—',
                  label: 'sources loaded',
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/80 bg-white/50 px-3.5 py-3 backdrop-blur">
                  <p className="tabular font-display text-[24px] font-extrabold tracking-[-0.04em] text-ink">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>

            {metaError && (
              <div className="mt-4 flex max-w-2xl flex-wrap items-center justify-between gap-2 rounded-xl border border-coral-200/70 bg-coral-50/60 px-3 py-2 text-[11px] font-medium text-coral-800">
                <span>Live metadata could not be loaded from the FastAPI server.</span>
                <button type="button" onClick={reloadMeta} className="font-bold underline underline-offset-2">
                  Retry
                </button>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-brand-500/10 via-sea-500/5 to-gold-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[30px] border border-white/90 bg-white/72 p-5 shadow-[0_30px_80px_-50px_rgba(27,31,47,0.5)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">Live category coverage</p>
                  <p className="mt-1 font-display text-[18px] font-extrabold tracking-[-0.03em] text-ink">
                    What the map can see
                  </p>
                </div>
                <Badge tone={health?.status === 'ok' ? 'jade' : 'gold'} dot>
                  {metaLoading ? 'Loading' : health?.status === 'ok' ? 'API connected' : 'Check API'}
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                {metaLoading &&
                  Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-xl border border-line/60 bg-white/45 p-2.5">
                      <span className="h-8 w-8 animate-pulse rounded-[9px] bg-ink/10" />
                      <div className="flex-1 space-y-1.5">
                        <span className="block h-2.5 w-28 animate-pulse rounded bg-ink/10" />
                        <span className="block h-2 w-20 animate-pulse rounded bg-ink/5" />
                      </div>
                    </div>
                  ))}
                {!metaLoading &&
                  topCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center gap-2.5 rounded-xl border border-line/60 bg-white/45 p-2.5"
                    >
                      <CategoryGlyph icon={category.icon} tint={category.tint} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-bold text-ink">{category.shortName}</p>
                        <p className="text-[9.5px] font-medium text-ink-faint">
                          OpenStreetMap mapped POIs
                        </p>
                      </div>
                      <span className="tabular text-[12px] font-extrabold text-ink">
                        {formatNumber(category.mapped_poi_count ?? 0)}
                      </span>
                    </div>
                  ))}
                {!metaLoading && topCategories.length === 0 && (
                  <p className="rounded-xl border border-line/70 bg-white/50 p-4 text-[11px] text-ink-mute">
                    No category metadata is available. Start the backend and retry.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-line/60 bg-[linear-gradient(145deg,rgba(232,231,251,0.6),rgba(255,255,255,0.45))] p-3.5">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-brand-600" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-800">
                    Data stack
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['OpenStreetMap', 'GHMC', 'UDISE+', 'Hyderabad Metro', 'Bus stops', 'Google Trends'].map(
                    (source) => (
                      <span key={source} className="chip bg-white/70 text-[9.5px]">
                        {source}
                      </span>
                    ),
                  )}
                </div>
                <p className="mt-2 text-[9.5px] leading-relaxed text-ink-faint">
                  Community-mapped supply and historical aggregates, with source limitations shown inside
                  every analysis.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="capabilities" className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="label">Connected decision views</p>
              <h2 className="mt-1.5 font-display text-[30px] font-extrabold tracking-[-0.04em] text-ink">
                One context, eight ways to interrogate it.
              </h2>
            </div>
            <p className="max-w-md text-[12.5px] leading-relaxed text-ink-mute">
              Change the category, locality, or radius once. Every page recalculates from the same
              backend data.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div key={feature.to} {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.04 }}>
                <Link
                  to={feature.to}
                  className={cn(
                    'group flex h-full flex-col rounded-2xl border border-white/90 bg-white/55 p-4 shadow-[0_12px_32px_-30px_rgba(27,31,47,0.4)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-lift',
                    feature.wide && 'xl:col-span-2',
                  )}
                >
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', toneClass[feature.tone])}>
                    <feature.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <h3 className="mt-3.5 font-display text-[15px] font-extrabold tracking-[-0.025em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-1 flex-1 text-[11.5px] leading-relaxed text-ink-mute">{feature.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-700">
                    Open view
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="data" className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] border border-white/90 bg-[linear-gradient(145deg,rgba(47,43,119,0.97),rgba(73,70,180,0.92),rgba(20,149,140,0.8))] p-7 text-white shadow-[0_30px_70px_-44px_rgba(47,43,119,0.7)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                Built for real decisions
              </p>
              <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight tracking-[-0.04em]">
                Every number has a source.
                <br />
                Every limitation is visible.
              </h2>
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/75">
                The workspace does not fill gaps with demo values. When a dataset cannot answer a
                question, the interface says so.
              </p>
              <div className="mt-6 space-y-2.5">
                {[
                  'Deterministic category and business search',
                  'Shared live context across every route',
                  'Optional server-side AI with grounded context',
                  'Clear citations and data-quality notes',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-[11.5px] font-semibold text-white/90">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-white/60" />
                    {item}
                  </div>
                ))}
              </div>
              <Link
                to="/dashboard"
                className="mt-7 inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-[12px] font-bold text-white transition-colors hover:bg-white/20"
              >
                Explore the workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Search,
                  title: 'Two search modes',
                  text: 'Category searches resolve approved synonyms and localities. Exact business searches match mapped OSM names and show every candidate outlet.',
                },
                {
                  icon: MapPin,
                  title: 'Real geography',
                  text: '16 supported locality reference points and business map coordinates feed circular catchments at 500 m, 1 km, or 2 km.',
                },
                {
                  icon: BarChart3,
                  title: 'Relative indices',
                  text: 'Competition, opportunity, and activity scores are transparent model estimates, not sales, demand, or profit forecasts.',
                },
                {
                  icon: Wallet,
                  title: 'Your financial inputs',
                  text: 'Rent, staffing, investment, and revenue are never inferred. Financial feasibility reflects only the figures you enter.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/90 bg-white/55 p-4 backdrop-blur">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/75 text-brand-700">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-3 text-[13px] font-extrabold text-ink">{item.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="limits" className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-line/70 bg-white/50 p-6 backdrop-blur sm:p-8">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="label">Read before deciding</p>
                <h2 className="mt-1.5 font-display text-[24px] font-extrabold tracking-[-0.035em] text-ink">
                  What this platform does not know
                </h2>
              </div>
              <Badge tone="gold">No fabricated metrics</Badge>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                'OpenStreetMap is incomplete and community-mapped. A low count is not proof of low competition.',
                'Circular catchments are approximate and overlap. Locality counts cannot be summed into unique city totals.',
                'GHMC values are reported licence applications from 2022–2023, not actual openings or current growth.',
                'Google Trends measures relative search interest, not customer volume or revenue.',
                'Schools have no usable coordinates in the supplied dataset, so they inform ward context rather than radius counts.',
                'Rent is available only when you enter it. No rent benchmark, footfall, sales, or closure data is invented.',
              ].map((item) => (
                <p key={item} className="rounded-xl border border-line/60 bg-white/55 p-3 text-[10.5px] leading-relaxed text-ink-mute">
                  {item}
                </p>
              ))}
            </div>
            <SourceNote className="mt-4">
              © OpenStreetMap contributors · GHMC ward boundaries and licence applications · UDISE+ ·
              Hyderabad transport datasets · Google Trends.
            </SourceNote>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line/60">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <Logo />
          <p className="text-[10px] font-medium text-ink-faint">
            Location intelligence for Hyderabad · Built with a real FastAPI + SQLite backend
          </p>
        </div>
      </footer>
    </div>
  )
}
