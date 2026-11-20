import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Calculator,
  Database,
  Gauge,
  Info,
  MapPin,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Store,
  UsersRound,
  Wallet,
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
import { Badge } from '../components/ui/Badge'
import { Meter } from '../components/ui/Meter'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { RiskGauge } from '../components/domain/RiskGauge'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { EmptyBlock, ErrorBlock, LoadingBlock, SourceNote } from '../components/domain/DataState'
import { useMarket } from '../context/MarketContext'
import { useApiResource } from '../hooks/useApiResource'
import { marketApi } from '../lib/api'
import { cn, formatNumber } from '../lib/utils'

const factorIcons = {
  competition: UsersRound,
  activity: Activity,
  access: MapPin,
  data_quality: Database,
  financial: Wallet,
}

const bandLabels = {
  low: 'Low',
  moderate: 'Moderate',
  elevated: 'Elevated',
  high: 'High',
  insufficient_data: 'Insufficient data',
}

const bandColors = {
  low: '#079455',
  moderate: '#DC6803',
  elevated: '#D92D20',
  high: '#912018',
  insufficient_data: '#667085',
}

function factorTone(points) {
  if (points === null || points === undefined) return 'neutral'
  if (points < 30) return 'jade'
  if (points < 50) return 'gold'
  return 'coral'
}

function displayFactorLabel(label) {
  if (label === 'User-supplied operating cost pressure') return 'Operating cost pressure'
  return label
}

function moneyValue(raw) {
  if (raw === '' || raw === null || raw === undefined) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(0, value) : undefined
}

function MoneyField({ label, value, onChange, hint, required = false }) {
  return (
    <div className="rounded-xl border border-line/70 bg-white/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10.5px] font-bold text-ink-soft" htmlFor={`risk-${label}`}>
          {label}
        </label>
        {!required && <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Optional</span>}
      </div>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink-faint">
          ₹
        </span>
        <input
          id={`risk-${label}`}
          type="number"
          min="0"
          step="1000"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter your assumption"
          className="field h-9 rounded-lg pl-6 text-[11.5px] font-bold"
        />
      </div>
      <p className="mt-1 text-[8.5px] leading-relaxed text-ink-faint">{hint}</p>
    </div>
  )
}

export function RiskAnalysis() {
  const navigate = useNavigate()
  const {
    category,
    categoryId,
    locality,
    localityId,
    radius,
    dataReady,
    metaLoading,
    metaError,
    reloadMeta,
    business,
    isBusinessMode,
    clearBusiness,
  } = useMarket()

  const [form, setForm] = useState({
    monthlyRent: '',
    staffExpenses: '',
    otherMonthlyExpenses: '',
    expectedMonthlyRevenue: '',
  })
  const [appliedInputs, setAppliedInputs] = useState({})
  const [inputError, setInputError] = useState(null)

  const normalizeInputs = () => {
    const next = {}
    const monthlyRent = moneyValue(form.monthlyRent)
    const staffExpenses = moneyValue(form.staffExpenses)
    const otherMonthlyExpenses = moneyValue(form.otherMonthlyExpenses)
    const revenue = moneyValue(form.expectedMonthlyRevenue)
    if (monthlyRent !== undefined) next.monthly_rent = monthlyRent
    if (staffExpenses !== undefined) next.staff_expenses = staffExpenses
    if (otherMonthlyExpenses !== undefined) next.other_monthly_expenses = otherMonthlyExpenses
    if (revenue !== undefined) next.expected_monthly_revenue = revenue
    return next
  }

  const applyInputs = () => {
    const next = normalizeInputs()
    if (next.expected_monthly_revenue !== undefined && next.expected_monthly_revenue <= 0) {
      setInputError('Expected monthly revenue must be greater than zero to apply the financial factor.')
      return
    }
    setInputError(null)
    setAppliedInputs(next)
  }

  const resetInputs = () => {
    setForm({ monthlyRent: '', staffExpenses: '', otherMonthlyExpenses: '', expectedMonthlyRevenue: '' })
    setAppliedInputs({})
    setInputError(null)
  }

  const dirty = JSON.stringify(normalizeInputs()) !== JSON.stringify(appliedInputs)

  const snapshotResult = useApiResource(
    ({ signal }) =>
      isBusinessMode
        ? marketApi.getBusinessContext(
            { osm_id: business.osm_id, category: categoryId, radius_m: radius },
            { signal },
          )
        : marketApi.getLocalityAnalysis(
            { locality: localityId, category: categoryId, radius_m: radius },
            { signal },
          ),
    [isBusinessMode, business?.osm_id, localityId, categoryId, radius],
    { enabled: dataReady },
  )

  const riskResult = useApiResource(
    ({ signal }) => {
      if (isBusinessMode) {
        return marketApi.estimateBusinessRisk(
          { osm_id: business.osm_id, category: categoryId, radius_m: radius, ...appliedInputs },
          { signal },
        )
      }
      return marketApi.estimateRisk(
        { locality: localityId, category: categoryId, radius_m: radius, ...appliedInputs },
        { signal },
      )
    },
    [isBusinessMode, business?.osm_id, localityId, categoryId, radius, appliedInputs],
    { enabled: dataReady },
  )

  const snapshot = snapshotResult.data
  const risk = riskResult.data
  const factors = risk?.factors ?? []
  const availableFactors = factors.filter((factor) => factor.risk_points !== null)
  const primaryFactor = useMemo(
    () =>
      availableFactors
        .slice()
        .sort(
          (a, b) =>
            b.risk_points * (b.applied_weight ?? 0) - a.risk_points * (a.applied_weight ?? 0),
        )[0] ?? null,
    [availableFactors],
  )
  const contributionData = availableFactors.map((factor) => ({
    name: displayFactorLabel(factor.label),
    contribution: Math.round(factor.risk_points * (factor.applied_weight ?? 0) * 100) / 100,
    points: factor.risk_points,
  }))
  const riskScore = risk?.risk_score
  const riskBand = risk?.risk_band ?? 'insufficient_data'
  const riskAccent = bandColors[riskBand] ?? '#667085'
  const financialFactor = factors.find((factor) => factor.key === 'financial')
  const scores = snapshot?.scores ?? {}

  if (metaLoading || snapshotResult.loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Decision support" title="Business risk analysis" location={locality?.name} />
        <LoadingBlock label="Loading catchment signals and risk factors…" />
      </div>
    )
  }

  const pageError = metaError || snapshotResult.error || riskResult.error
  if (pageError) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Decision support" title="Business risk analysis" location={locality?.name} />
        <ErrorBlock
          error={pageError}
          onRetry={() => {
            if (metaError) reloadMeta()
            else if (snapshotResult.error) snapshotResult.reload()
            else riskResult.reload()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Decision support"
        title="Business risk analysis"
        description="A directional risk estimate built from mapped competition, GHMC circle activity, access, and mapped-data completeness. No footfall, sales, closure, or rent benchmark is invented."
        location={`${isBusinessMode ? business.name : locality.name} · ${category.shortName ?? category.name}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={resetInputs}>
              <RefreshCcw className="h-4 w-4 text-ink-mute" />
              Clear assumptions
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4" />
              Ask the assistant
            </button>
          </>
        }
      />

      {isBusinessMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100/70 bg-brand-50/45 px-3.5 py-2.5 text-[10.5px] text-brand-900/80">
          <span>
            Analysis centre: <strong>{business.name}</strong> mapped coordinate · nearest locality{' '}
            <strong>{business.nearest_locality_name}</strong>. The selected business is excluded from its own
            competitor count.
          </span>
          <button type="button" onClick={clearBusiness} className="font-bold text-brand-700">
            Switch to locality centre
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <GlassPanel className="self-start p-5">
          <PanelHeader
            eyebrow="01 · Costs"
            title="Cost assumptions"
            description="Market signals follow the workspace context. Add optional costs only if you want a financial-pressure signal."
            icon={ShieldAlert}
          />

          <div className="mt-4 rounded-xl border border-line bg-surface-subtle p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Current market</p>
            <div className="mt-2 flex items-start gap-2.5">
              <CategoryGlyph icon={category.icon} tint={category.tint} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-bold text-ink">{category.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-medium text-ink-mute">
                  <MapPin className="h-3 w-3 shrink-0 text-brand-500" />
                  <span className="truncate">
                    {isBusinessMode ? business.name : locality.name} · {radius / 1000} km
                  </span>
                </p>
              </div>
            </div>
            <p className="mt-2 text-[8.5px] leading-relaxed text-ink-faint">
              Change the category, locality, or radius from the workspace header.
            </p>
          </div>

          <div className="mt-3 grid gap-2.5">
            <MoneyField
              label="Monthly rent"
              value={form.monthlyRent}
              onChange={(value) => setForm((current) => ({ ...current, monthlyRent: value }))}
              hint="Your own assumption. Available data contains no rent benchmark."
            />
            <MoneyField
              label="Staff expenses / month"
              value={form.staffExpenses}
              onChange={(value) => setForm((current) => ({ ...current, staffExpenses: value }))}
              hint="Monthly employee cost used only for the optional financial factor."
            />
            <MoneyField
              label="Other monthly expenses"
              value={form.otherMonthlyExpenses}
              onChange={(value) => setForm((current) => ({ ...current, otherMonthlyExpenses: value }))}
              hint="Utilities, marketing, and other recurring operating costs."
            />
            <MoneyField
              label="Expected monthly revenue"
              value={form.expectedMonthlyRevenue}
              onChange={(value) => setForm((current) => ({ ...current, expectedMonthlyRevenue: value }))}
              hint="Required to apply user-supplied operating cost pressure. Must be greater than zero."
              required
            />
          </div>

          <div className="mt-3 space-y-2.5">
            {inputError && (
              <p className="rounded-lg border border-coral-200/70 bg-coral-50/60 px-2.5 py-2 text-[10px] font-semibold text-coral-800">
                {inputError}
              </p>
            )}

            <button type="button" className="btn-primary w-full" onClick={applyInputs} disabled={!dirty}>
              <Calculator className="h-4 w-4" />
              {dirty ? 'Recalculate with these inputs' : 'Assumptions applied'}
            </button>

            <div className="flex items-start gap-2 rounded-xl border border-line/60 bg-white/40 p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
              <p className="text-[9px] leading-relaxed text-ink-mute">
                The financial factor is applied only when expected revenue is supplied. The risk score is a
                directional estimate, not a prediction of failure or profit.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/financial-feasibility')}
            className="btn-secondary mt-3 w-full text-[11px]"
          >
            <Calculator className="h-3.5 w-3.5" />
            Test margins in financial feasibility
          </button>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 px-5 py-4">
              <PanelHeader
                eyebrow="02 · Estimate"
                title="Risk profile"
                description="Built from available mapped and user-supplied signals."
                icon={Gauge}
              />
              <div className="flex items-center gap-2">
                <Badge tone="gold">Directional estimate</Badge>
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold"
                  style={{
                    color: riskAccent,
                    borderColor: `${riskAccent}45`,
                    backgroundColor: `${riskAccent}12`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: riskAccent }} />
                  {bandLabels[riskBand] ?? riskBand}
                </span>
              </div>
            </div>

            {riskResult.loading ? (
              <LoadingBlock className="m-5" label="Recalculating risk with these assumptions…" />
            ) : riskScore === null || riskScore === undefined ? (
              <EmptyBlock
                className="m-5"
                title="Insufficient data for a risk score"
                description={risk?.message || 'Mapped catchment or category coverage is too low for a reliable estimate.'}
              />
            ) : (
              <>
                <div className="grid items-center gap-4 px-5 py-4 md:grid-cols-[250px_1fr]">
                  <RiskGauge
                    result={{ score: riskScore, band: bandLabels[riskBand] ?? riskBand }}
                    size={244}
                    subtitle="Directional estimate · not a guarantee"
                    className="mx-auto"
                  />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-ink-faint">
                      Estimated classification
                    </p>
                    <h2
                      className="mt-1 font-display text-[23px] font-extrabold leading-tight tracking-[-0.03em]"
                      style={{ color: riskAccent }}
                    >
                      {bandLabels[riskBand] ?? riskBand} pressure profile
                    </h2>
                    <p className="mt-1.5 max-w-lg text-[11.5px] leading-relaxed text-ink-mute">
                      {risk?.message}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {factors.slice(0, 4).map((factor) => (
                        <div key={factor.key} className="rounded-xl border border-line/60 bg-white/45 p-2.5">
                          <p className="truncate text-[8.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                            {displayFactorLabel(factor.label)}
                          </p>
                          <p className="tabular mt-1 text-[17px] font-extrabold leading-none text-ink">
                            {factor.risk_points ?? '—'}
                            <span className="ml-0.5 text-[9px] font-semibold text-ink-faint">/100</span>
                          </p>
                          <Meter
                            value={factor.risk_points ?? 0}
                            tone={factorTone(factor.risk_points)}
                            height="xs"
                            className="mt-1.5"
                          />
                          <p className="mt-1 truncate text-[8.5px] font-medium text-ink-faint">
                            {factor.applied_weight !== null
                              ? `${Math.round(factor.applied_weight * 100)}% applied weight`
                              : 'Not applied'}
                          </p>
                        </div>
                      ))}
                    </div>

                    {primaryFactor && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-coral-50 text-coral-600">
                          <ShieldAlert className="h-3 w-3" />
                        </div>
                        <p className="text-[9.5px] font-medium text-ink-mute">
                          Largest applied contribution ·{' '}
                          <span className="font-bold text-ink">{displayFactorLabel(primaryFactor.label)}</span>{' '}
                          <span className="text-ink-faint">({primaryFactor.risk_points}/100 signal)</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px border-t border-line/60 bg-line/50 md:grid-cols-4">
                  <div className="bg-white/60 px-4 py-3">
                    <p className="label">Mapped businesses</p>
                    <p className="tabular mt-1 text-[16px] font-extrabold text-ink">
                      {formatNumber(risk?.inputs_used?.mapped_poi_count ?? snapshot?.mapped_poi_count ?? 0)}
                    </p>
                    <p className="text-[8.5px] font-medium text-ink-faint">
                      {isBusinessMode ? 'excluding selected business' : 'within catchment'}
                    </p>
                  </div>
                  <div className="bg-white/60 px-4 py-3">
                    <p className="label">Competition signal</p>
                    <p className="tabular mt-1 text-[16px] font-extrabold text-ink">
                      {scores.competition_index ?? '—'}
                    </p>
                    <p className="text-[8.5px] font-medium text-ink-faint">relative mapped competition</p>
                  </div>
                  <div className="bg-white/60 px-4 py-3">
                    <p className="label">Circle activity</p>
                    <p className="tabular mt-1 text-[16px] font-extrabold text-ink">
                      {risk?.inputs_used?.circle_name ?? 'Not assigned'}
                    </p>
                    <p className="text-[8.5px] font-medium text-ink-faint">GHMC 2022–23 applications context</p>
                  </div>
                  <div className="bg-white/60 px-4 py-3">
                    <p className="label">Financial factor</p>
                    <p className="tabular mt-1 text-[16px] font-extrabold text-ink">
                      {financialFactor?.risk_points ?? 'Not applied'}
                    </p>
                    <p className="text-[8.5px] font-medium text-ink-faint">
                      {financialFactor?.risk_points !== null && financialFactor?.risk_points !== undefined
                        ? 'operating cost / revenue'
                        : 'enter expected revenue to apply'}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-white/30 px-5 py-2.5">
              <p className="flex items-center gap-1.5 text-[9px] font-medium text-ink-faint">
                <Info className="h-3 w-3" />
                Not a factual probability. Category weights differ by business type.
              </p>
              <button
                type="button"
                onClick={() => navigate('/location-comparison')}
                className="text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
              >
                Compare localities
              </button>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <PanelHeader
              eyebrow="03 · Breakdown"
              title="Risk factor breakdown"
              description="Applied weights are rebalanced across factors with available signals."
              icon={Activity}
              action={
                <span className="hidden items-center gap-2 text-[9px] font-semibold text-ink-faint sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                  Higher points = more pressure
                </span>
              }
            />
            <div className="mt-3.5 space-y-2">
              {factors.map((factor) => {
                const Icon = factorIcons[factor.key] ?? Activity
                return (
                  <div
                    key={factor.key}
                    className="flex items-start gap-3 rounded-xl border border-line/60 bg-white/40 p-3"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                        factorTone(factor.risk_points) === 'jade' && 'border-jade-100 bg-jade-50 text-jade-700',
                        factorTone(factor.risk_points) === 'gold' && 'border-gold-100 bg-gold-50 text-gold-700',
                        factorTone(factor.risk_points) === 'coral' && 'border-coral-100 bg-coral-50 text-coral-700',
                        factorTone(factor.risk_points) === 'neutral' && 'border-line bg-white text-ink-faint',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[11px] font-bold text-ink">{displayFactorLabel(factor.label)}</p>
                          <span className="rounded border border-line/70 bg-white/60 px-1 py-0.5 text-[8px] font-bold text-ink-faint">
                            {factor.applied_weight !== null
                              ? `${Math.round(factor.applied_weight * 100)}% applied`
                              : `${Math.round(factor.configured_weight * 100)}% default`}
                          </span>
                        </div>
                        <p className="tabular text-[11px] font-extrabold text-ink">
                          {factor.risk_points ?? '—'}/100
                        </p>
                      </div>
                      <Meter
                        value={factor.risk_points ?? 0}
                        tone={factorTone(factor.risk_points)}
                        height="xs"
                        className="mt-1.5"
                      />
                      <p className="mt-1 text-[9px] leading-relaxed text-ink-faint">{factor.explanation}</p>
                    </div>
                  </div>
                )
              })}
              {!factors.length && (
                <EmptyBlock title="Factor detail unavailable" description="There is not enough mapped detail to break down this estimate." />
              )}
            </div>
          </GlassPanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Contribution"
            title="What drives the estimate"
            description="Risk points multiplied by applied weight. This is not a sensitivity forecast."
            icon={Activity}
          />
          <div className="mt-4 h-[230px]">
            {contributionData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contributionData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 0, left: 4 }}
                  barSize={16}
                >
                  <CartesianGrid strokeDasharray="3 5" stroke="#E5EAF1" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9.5, fill: '#667085', fontWeight: 600 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={154}
                    tick={{ fontSize: 9.5, fill: '#344054', fontWeight: 600 }}
                  />
                  <Tooltip content={<ChartTooltip formatter={(value) => `${value} weighted points`} />} />
                  <Bar dataKey="contribution" name="Weighted risk contribution" radius={[0, 5, 5, 0]}>
                    {contributionData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.points >= 70 ? '#D92D20' : entry.points >= 45 ? '#DC6803' : '#079455'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyBlock className="h-full" title="No contributions" description="Insufficient signals for a weighted breakdown." />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <p className="text-[10px] font-medium text-ink-mute">
              Applied weights sum to 100% across factors with available values.
            </p>
            <span className="chip">Directional estimate</span>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="What would reduce uncertainty"
            title="Evidence checks"
            description="Practical checks tied to the returned factor explanations."
            icon={Info}
          />
          <div className="mt-3.5 space-y-2">
            {[
              {
                icon: UsersRound,
                title: 'Verify the competitor list',
                body: `Review the ${formatNumber(risk?.inputs_used?.mapped_poi_count ?? snapshot?.mapped_poi_count ?? 0)} mapped outlets in the catchment. OpenStreetMap may omit unrecorded or newly opened businesses.`,
              },
              {
                icon: Database,
                title: 'Check mapped-data completeness',
                body: `The mapped-data completeness signal is ${scores.data_completeness ?? '—'}/100. Lower completeness increases uncertainty in the other factors.`,
              },
              {
                icon: Wallet,
                title: 'Replace assumptions with quotes',
                body:
                  financialFactor?.risk_points !== null && financialFactor?.risk_points !== undefined
                    ? 'Your operating cost pressure is included in this estimate. Replace the scenario inputs with actual rent, staffing, and revenue quotes where possible.'
                    : 'No expected revenue was supplied, so the financial factor was not applied. Enter your own revenue and cost assumptions to include it.',
              },
              {
                icon: Store,
                title: 'Run a site-level check',
                body: 'Mapped counts and circular catchments cannot confirm visibility, footfall, access restrictions, or trading conditions at a specific unit.',
              },
            ].map((item, index) => (
              <div key={item.title} className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-white/40 p-2.5">
                <div className="relative">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 bg-white/75 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-brand-600 text-[7px] font-extrabold text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-ink-faint">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-2 px-1 md:grid-cols-3">
        {(risk?.data_notes ?? []).slice(0, 3).map((note) => (
          <SourceNote key={note}>{note}</SourceNote>
        ))}
        {!risk?.data_notes?.length && (
          <SourceNote>Mapped places come from OpenStreetMap. This risk score is a directional estimate.</SourceNote>
        )}
      </div>
    </div>
  )
}
