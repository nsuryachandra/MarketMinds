import { useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Calculator,
  CircleDollarSign,
  Gauge,
  Info,
  Lightbulb,
  MapPin,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  UsersRound,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { Meter } from '../components/ui/Meter'
import { RiskGauge } from '../components/domain/RiskGauge'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { useMarket } from '../context/MarketContext'
import { categories } from '../data/categories'
import { localities } from '../data/localities'
import {
  calculateRisk,
  defaultRiskInputs,
  getMarketSnapshot,
  riskPill,
} from '../lib/analytics'

import { cn, formatCompactINR, formatINR, formatNumber, signed } from '../lib/utils'

const factorIcons = {
  competition: UsersRound,
  market: Gauge,
  financial: Wallet,
  location: MapPin,
}

const toneMeter = {
  good: 'jade',
  watch: 'gold',
  risk: 'coral',
} 

const toneTile = {
  good: 'bg-jade-50 text-jade-700 border-jade-100',
  watch: 'bg-gold-50 text-gold-700 border-gold-100',
  risk: 'bg-coral-50 text-coral-700 border-coral-100',
}











function CurrencyField({ label, value, min, max, step, onChange, caption }) {
  const progress = ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100
  return (
    <div className="rounded-xl border border-line/70 bg-white/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-bold text-ink-soft">{label}</label>
        <span className="tabular text-[12px] font-extrabold text-ink">{formatINR(value)}</span>
      </div>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink-faint">
          ₹
        </span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
          className="field h-8 rounded-lg pl-6 pr-2 text-[11.5px] font-bold"
          aria-label={label}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full"
        style={{ '--range-progress': `${progress}%` } }
        aria-label={`${label} slider`}
      />
      <div className="mt-1 flex items-center justify-between text-[8.5px] font-semibold text-ink-faint">
        <span>{formatCompactINR(min)}</span>
        <span>{caption}</span>
        <span>{formatCompactINR(max)}</span>
      </div>
    </div>
  )
}

function SignalCard({
  label,
  value,
  suffix,
  tone,
  detail,
}





) {
  const colors = {
    brand: 'text-brand-700',
    sea: 'text-sea-700',
    jade: 'text-jade-700',
    gold: 'text-gold-700',
    coral: 'text-coral-700',
  }
  return (
    <div className="rounded-xl border border-line/60 bg-white/45 p-2.5">
      <p className="text-[8.5px] font-bold uppercase tracking-[0.09em] text-ink-faint">{label}</p>
      <p className={cn('tabular mt-1 text-[17px] font-extrabold leading-none', colors[tone])}>
        {value}
        {suffix && <span className="ml-0.5 text-[9px] font-semibold text-ink-faint">{suffix}</span>}
      </p>
      <Meter value={value} tone={tone} height="xs" className="mt-1.5" />
      <p className="mt-1 truncate text-[8.5px] font-medium text-ink-faint">{detail}</p>
    </div>
  )
}

export function RiskAnalysis() {
  const navigate = useNavigate()
  const { category, categoryId, locality, localityId, setCategoryId, setLocalityId } = useMarket()
  const [inputs, setInputs] = useState(defaultRiskInputs)

  const result = useMemo(
    () => calculateRisk(categoryId, localityId, inputs),
    [categoryId, localityId, inputs],
  )
  const snapshot = useMemo(() => getMarketSnapshot(categoryId, localityId), [categoryId, localityId])
  const pill = riskPill(result.band)

  const primaryFactor = useMemo(
    () =>
      result.factors
        .filter((factor) => factor.key !== 'location')
        .slice()
        .sort((a, b) => b.score * b.weight - a.score * a.weight)[0],
    [result.factors],
  )

  const rentRatio = Math.round((inputs.monthlyRent / Math.max(1, result.rentBenchmark)) * 100)
  const coverageMonths = inputs.investment / Math.max(1, inputs.monthlyRent + inputs.monthlyOpex)

  const sensitivity = useMemo(() => {
    return [0.55, 0.7, 0.85, 1, 1.15, 1.3, 1.5].map((multiplier) => {
      const rent = Math.round(result.rentBenchmark * multiplier)
      const scenario = calculateRisk(categoryId, localityId, { ...inputs, monthlyRent: rent })
      return {
        label: formatCompactINR(rent),
        rent,
        score: scenario.score,
      }
    })
  }, [categoryId, localityId, inputs, result.rentBenchmark])

  const slope = useMemo(() => {
    const base = calculateRisk(categoryId, localityId, inputs).score
    const elevated = calculateRisk(categoryId, localityId, {
      ...inputs,
      monthlyRent: Math.round(inputs.monthlyRent * 1.1),
    }).score
    return Math.max(0, Math.round((elevated - base) * 10) / 10)
  }, [categoryId, localityId, inputs])

  const bufferTarget = (inputs.monthlyRent + inputs.monthlyOpex) * 9
  const bufferGap = Math.max(0, bufferTarget - inputs.investment)

  const updateInput = (key, value) => {
    setInputs((current) => ({ ...current, [key]: value }))
  }

  const riskAccent =
    result.band === 'Low'
      ? '#1D9B6A'
      : result.band === 'Moderate'
        ? '#D0922B'
        : result.band === 'Elevated'
          ? '#DC6A5F'
          : '#B4433B'

  const mitigations = [
    {
      icon: Wallet,
      title: 'Negotiate the fixed rent',
      description:
        rentRatio > 110
          ? 'Your rent assumption is above the local benchmark. Target a 12–18% reduction or a rent-free fit-out period.'
          : 'Your rent is at or below benchmark. Protect it with a longer lock-in and a capped escalation clause.',
      metric: `Potential saving ${formatCompactINR(Math.round(inputs.monthlyRent * 0.15))}/mo`,
    },
    {
      icon: CircleDollarSign,
      title: bufferGap > 0 ? 'Widen the capital buffer' : 'The buffer is healthy',
      description:
        bufferGap > 0
          ? `Aim for nine months of rent and operating cost. The current plan is short by approximately ${formatCompactINR(bufferGap)}.`
          : `The current plan covers ${coverageMonths.toFixed(1)} months of fixed costs — above the nine-month buffer target.`,
      metric:
        bufferGap > 0 ? `Target ${formatCompactINR(bufferTarget)} total` : `${coverageMonths.toFixed(1)} months covered`,
    },
    {
      icon: Target,
      title: `Differentiate against ${formatNumber(snapshot.nearby)} nearby outlets`,
      description: primaryFactor
        ? `${primaryFactor.label} is the dominant constraint. Build a proposition that is measurably different on one axis rather than marginally better on all.`
        : 'Build a proposition that is measurably different on one axis rather than marginally better on all.',
      metric: `${snapshot.competition}/100 competition`,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Decision model"
        title="Business risk analysis"
        description="Combine category, locality, and cost assumptions into a directional risk estimate before committing capital."
        location={`${locality.name} · ${category.shortName}`}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setInputs(defaultRiskInputs)}
            >
              <RotateCcw className="h-4 w-4 text-ink-mute" />
              Reset assumptions
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4" />
              Open AI brief
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[382px_minmax(0,1fr)]">
        <GlassPanel className="self-start p-5">
          <PanelHeader
            eyebrow="01 · Assumptions"
            title="Assessment inputs"
            description="Adjust the scope and cost profile. Results update instantly."
            icon={ShieldAlert}
          />

          <div className="mt-4 space-y-3">
            <div>
              <label className="label mb-1.5 block">Business category</label>
              <Select
                value={categoryId}
                onChange={setCategoryId}
                searchable
                ariaLabel="Risk category"
                options={categories.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: `${formatNumber(item.businesses)} businesses · ${signed(item.growth)}`,
                  icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
                }))}
              />
            </div>
            <div>
              <label className="label mb-1.5 block">Proposed locality</label>
              <Select
                value={localityId}
                onChange={setLocalityId}
                searchable
                ariaLabel="Risk locality"
                searchPlaceholder="Find a locality…"
                options={localities.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: `${item.zone} · ${item.competition}/100 competition`,
                  icon: <MapPin className="h-3.5 w-3.5 text-brand-500" />,
                }))}
              />
            </div>

            <div className="grid gap-2.5">
              <CurrencyField
                label="Approximate investment"
                value={inputs.investment}
                min={300_000}
                max={5_000_000}
                step={50_000}
                onChange={(value) => updateInput('investment', value)}
                caption="fit-out + deposit"
              />
              <CurrencyField
                label="Monthly rent"
                value={inputs.monthlyRent}
                min={10_000}
                max={150_000}
                step={1_000}
                onChange={(value) => updateInput('monthlyRent', value)}
                caption="1,200 sq ft assumption"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/60 bg-white/40 px-2.5 py-2">
                <p className="text-[9px] font-medium text-ink-faint">
                  Local benchmark <span className="font-bold text-ink-soft">{formatINR(result.rentBenchmark)}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 text-[9px] font-bold',
                      rentRatio > 110
                        ? 'border-coral-200/60 bg-coral-50 text-coral-700'
                        : rentRatio > 95
                          ? 'border-gold-200/60 bg-gold-50 text-gold-700'
                          : 'border-jade-200/60 bg-jade-50 text-jade-700',
                    )}
                  >
                    {rentRatio}% of benchmark
                  </span>
                  <button
                    type="button"
                    onClick={() => updateInput('monthlyRent', result.rentBenchmark)}
                    className="text-[9px] font-bold text-brand-700 hover:text-brand-900"
                  >
                    Match
                  </button>
                </div>
              </div>
              <CurrencyField
                label="Monthly operating expenses"
                value={inputs.monthlyOpex}
                min={40_000}
                max={400_000}
                step={5_000}
                onChange={(value) => updateInput('monthlyOpex', value)}
                caption="staff + utilities + misc."
              />
            </div>

            <div className="rounded-xl border border-brand-100/70 bg-brand-50/40 p-2.5">
              <div className="flex items-center justify-between text-[9.5px] font-semibold">
                <span className="text-ink-mute">Capital runway</span>
                <span className="font-bold text-brand-800">{coverageMonths.toFixed(1)} months</span>
              </div>
              <Meter
                value={Math.min(100, (coverageMonths / 12) * 100)}
                tone={coverageMonths >= 9 ? 'jade' : coverageMonths >= 6 ? 'gold' : 'coral'}
                height="xs"
                className="mt-1.5"
              />
              <p className="mt-1 text-[8.5px] font-medium text-ink-faint">
                Investment divided by total monthly rent and operating cost.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-line/60 bg-white/40 p-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
            <p className="text-[9px] leading-relaxed text-ink-mute">
              All figures are user-provided assumptions. The risk score is a directional estimate, not a
              guaranteed prediction or financial advice.
            </p>
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
                description="Weighted from competition, market, financial, and location signals."
                icon={Gauge}
              />
              <div className="flex items-center gap-2">
                <Badge tone="gold">Model estimate</Badge>
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold', pill.className)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {pill.label}
                </span>
              </div>
            </div>

            <div className="grid items-center gap-4 px-5 py-4 md:grid-cols-[250px_1fr]">
              <RiskGauge
                result={result}
                size={244}
                subtitle="Directional estimate · not a guarantee"
                className="mx-auto"
              />
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-ink-faint">
                  Estimated classification
                </p>
                <h2 className="mt-1 font-display text-[23px] font-extrabold leading-tight tracking-[-0.03em]" style={{ color: riskAccent }}>
                  {result.band} risk profile
                </h2>
                <p className="mt-1.5 max-w-lg text-[11.5px] leading-relaxed text-ink-mute">{result.headline}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <SignalCard
                    label="Competition risk"
                    value={result.competitionRisk}
                    suffix="/100"
                    tone="coral"
                    detail={`${formatNumber(snapshot.nearby)} nearby outlets`}
                  />
                  <SignalCard
                    label="Market activity"
                    value={locality.activity}
                    suffix="/100"
                    tone="sea"
                    detail={`${locality.name} activity index`}
                  />
                  <SignalCard
                    label="Location suitability"
                    value={result.locationSuitability}
                    suffix="/100"
                    tone="jade"
                    detail={`Opportunity ${snapshot.opportunity}/100`}
                  />
                  <SignalCard
                    label="Financial pressure"
                    value={result.financialPressure}
                    suffix="/100"
                    tone="gold"
                    detail={`${coverageMonths.toFixed(1)} month runway`}
                  />
                </div>

                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-coral-50 text-coral-600">
                    <ShieldAlert className="h-3 w-3" />
                  </div>
                  <p className="text-[9.5px] font-medium text-ink-mute">
                    Primary constraint ·{" "}
                    <span className="font-bold text-ink">{primaryFactor?.label}</span>{" "}
                    <span className="text-ink-faint">({primaryFactor?.score}/100)</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-white/30 px-5 py-2.5">
              <p className="flex items-center gap-1.5 text-[9px] font-medium text-ink-faint">
                <Info className="h-3 w-3" />
                Estimate only. Actual outcomes depend on execution, demand, and terms beyond this model.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/location-comparison')}
                  className="text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
                >
                  Compare localities
                </button>
                <span className="h-3 w-px bg-line" />
                <button
                  type="button"
                  onClick={() => navigate('/market-assistant')}
                  className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
                >
                  Interpret with AI
                  <Sparkles className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <PanelHeader
              eyebrow="03 · Breakdown"
              title="Risk factor breakdown"
              description="Each signal is scored out of 100 and weighted into the final estimate."
              icon={Activity}
              action={
                <span className="hidden items-center gap-2 text-[9px] font-semibold text-ink-faint sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                  Higher = more risk
                </span>
              }
            />
            <div className="mt-3.5 space-y-2">
              {result.factors.map((factor) => {
                const Icon = factorIcons[factor.key ] ?? Activity
                return (
                  <div
                    key={factor.key}
                    className="flex items-start gap-3 rounded-xl border border-line/60 bg-white/40 p-3"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                        toneTile[factor.tone],
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-bold text-ink">{factor.label}</p>
                          <span className="rounded border border-line/70 bg-white/60 px-1 py-0.5 text-[8px] font-bold text-ink-faint">
                            {Math.round(factor.weight * 100)}% weight
                          </span>
                        </div>
                        <p className="tabular text-[11px] font-extrabold text-ink">{factor.score}/100</p>
                      </div>
                      <Meter value={factor.score} tone={toneMeter[factor.tone]} height="xs" className="mt-1.5" />
                      <p className="mt-1 text-[9px] leading-relaxed text-ink-faint">{factor.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassPanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Sensitivity"
            title="How risk responds to rent"
            description="Score movement as monthly rent changes, holding every other assumption constant."
            icon={Activity}
            action={
              <div className="text-right">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">Current rent</p>
                <p className="tabular text-[11.5px] font-extrabold text-ink">{formatINR(inputs.monthlyRent)}</p>
              </div>
            }
          />
          <div className="mt-4 h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sensitivity} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="sensitivityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={riskAccent} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={riskAccent} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9.5, fill: '#8B90A2', fontWeight: 600 }}
                  dy={5}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tick={{ fontSize: 9.5, fill: '#8B90A2', fontWeight: 600 }}
                />
                <Tooltip content={<ChartTooltip formatter={(value) => `${value}/100`} />} />
                <ReferenceLine y={55} stroke="#D0922B" strokeDasharray="4 4" strokeOpacity={0.6} />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Risk score"
                  stroke={riskAccent}
                  strokeWidth={2.4}
                  fill="url(#sensitivityFill)"
                  activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: riskAccent }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <p className="text-[10px] font-medium text-ink-mute">
              Each 10% increase in rent adds roughly{" "}
              <span className="font-bold text-ink">{slope.toFixed(1)} points</span> to the risk estimate.
            </p>
            <span className="chip">Dashed line · elevated threshold</span>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Mitigation"
            title="What would lower the risk"
            description="Three practical levers, ranked by impact on this assessment."
            icon={Lightbulb}
          />
          <div className="mt-3.5 space-y-2">
            {mitigations.map((mitigation, index) => (
              <div key={mitigation.title} className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-white/40 p-2.5">
                <div className="relative">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 bg-white/75 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <mitigation.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-brand-600 text-[7px] font-extrabold text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-[10.5px] font-bold text-ink">{mitigation.title}</p>
                    <span className="rounded border border-line/70 bg-white/60 px-1.5 py-0.5 text-[8px] font-bold text-ink-mute">
                      {mitigation.metric}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-ink-faint">{mitigation.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-center text-[8.5px] font-medium text-ink-faint">
            Illustrative guidance generated from the current assumptions.
          </p>
        </GlassPanel>
      </div>
    </div>
  )
}
