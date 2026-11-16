import { useCallback, useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  Check,
  Info,
  Minus,
  RotateCcw,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Meter } from '../components/ui/Meter'
import { Toast } from '../components/ui/Toast'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { useMarket } from '../context/MarketContext'
import { defaultFeasibilityInputs, calculateFeasibility } from '../lib/analytics'

import { cn, formatCompactINR, formatINR } from '../lib/utils'



const scenarioMeta = {
  conservative: { label: 'Conservative', multiplier: 0.85, note: '−15% revenue' },
  base: { label: 'Base', multiplier: 1, note: 'Your estimate' },
  optimistic: { label: 'Optimistic', multiplier: 1.15, note: '+15% revenue' },
}

const scenarioOptions = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'base', label: 'Base' },
  { value: 'optimistic', label: 'Optimistic' },
]

const storageKey = 'mm.feasibility.scenario'

function readSaved() {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) 
    if (!parsed.inputs || typeof parsed.inputs.monthlyRevenue !== 'number') return null
    return {
      inputs: parsed.inputs,
      scenario: parsed.scenario && parsed.scenario in scenarioMeta ? parsed.scenario : 'base',
    }
  } catch {
    return null
  }
}











function MoneyInput({ label, value, min, max, step, onChange, accent = false }) {
  const progress = ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className={cn('text-[10.5px] font-bold', accent ? 'text-brand-900' : 'text-ink-soft')}>{label}</label>
        <div
          className={cn(
            'flex h-6 items-center gap-0.5 rounded-md border px-1.5',
            accent ? 'border-brand-200/70 bg-white/80' : 'border-line/70 bg-white/60',
          )}
        >
          <span className="text-[9px] font-bold text-ink-faint">₹</span>
          <input
            type="number"
            value={value}
            min={0}
            onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
            onBlur={() => onChange(Math.min(max, Math.max(min, value)))}
            className="tabular w-[74px] border-0 bg-transparent p-0 text-right text-[10.5px] font-extrabold text-ink outline-none"
            aria-label={label}
          />
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2.5 w-full"
        style={{ '--range-progress': `${progress}%` } }
        aria-label={`${label} slider`}
      />
      <div className="mt-1 flex items-center justify-between text-[8px] font-semibold text-ink-faint">
        <span>{formatCompactINR(min)}</span>
        <span>{formatCompactINR(max)}</span>
      </div>
    </div>
  )
}

function FeasibilityDial({ score, tone }) {
  const color = tone === 'good' ? '#1D9B6A' : tone === 'watch' ? '#D0922B' : '#DC6A5F'
  const radius = 47
  const circumference = 2 * Math.PI * radius
  const arc = circumference * 0.75
  return (
    <div className="relative h-[142px] w-[142px]">
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#EAE4D8"
          strokeWidth="10"
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
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arc * (score / 100)} ${circumference}`}
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
          {Math.round(score)}
        </text>
        <text x="60" y="72" textAnchor="middle" fill="#9AA0B1" fontSize="6" fontWeight="700" letterSpacing="0.1em">
          FEASIBILITY
        </text>
      </svg>
    </div>
  )
}

const verdictTone = {
  Strong: { badge: 'bg-jade-50 text-jade-700 border-jade-200/70', text: 'text-jade-700' },
  Viable: { badge: 'bg-sea-50 text-sea-700 border-sea-200/70', text: 'text-sea-700' },
  Fragile: { badge: 'bg-gold-50 text-gold-700 border-gold-200/70', text: 'text-gold-700' },
  'Not viable': { badge: 'bg-coral-50 text-coral-700 border-coral-200/70', text: 'text-coral-700' },
}

export function FinancialFeasibility() {
  const navigate = useNavigate()
  const { locality, category } = useMarket()
  const savedScenario = useMemo(() => readSaved(), [])
  const [inputs, setInputs] = useState(
    () => savedScenario?.inputs ?? defaultFeasibilityInputs,
  )
  const [scenario, setScenario] = useState(() => savedScenario?.scenario ?? 'base')
  const [toast, setToast] = useState(null)
  const [saved, setSaved] = useState(false)
  const closeToast = useCallback(() => setToast(null), [])

  const multiplier = scenarioMeta[scenario].multiplier
  const adjustedRevenue = Math.round(inputs.monthlyRevenue * multiplier)
  const result = useMemo(
    () => calculateFeasibility({ ...inputs, monthlyRevenue: adjustedRevenue }),
    [inputs, adjustedRevenue],
  )

  const projection = useMemo(() => {
    return Array.from({ length: 25 }, (_, month) => ({
      month,
      cashflow: -inputs.investment + result.monthlyProfit * month,
    }))
  }, [inputs.investment, result.monthlyProfit])

  const expenseData = [
    { name: 'Rent', value: inputs.monthlyRent, color: '#4946B4' },
    { name: 'People', value: inputs.employeeExpenses, color: '#14958C' },
    { name: 'Other operating', value: inputs.otherExpenses, color: '#D0922B' },
  ]

  const scenarioResults = useMemo(
    () =>
      (Object.keys(scenarioMeta) ).map((key) => {
        const revenue = Math.round(inputs.monthlyRevenue * scenarioMeta[key].multiplier)
        return {
          key,
          revenue,
          result: calculateFeasibility({ ...inputs, monthlyRevenue: revenue }),
        }
      }),
    [inputs],
  )

  const tone = verdictTone[result.verdict]
  const recoveryMonth = result.breakEvenMonths !== null ? Math.ceil(result.breakEvenMonths) : null
  const chartAccent = result.monthlyProfit >= 0 ? '#1D9B6A' : '#DC6A5F'
  const isProfitable = result.monthlyProfit > 0

  const updateInput = (key, value) => {
    setInputs((current) => ({ ...current, [key]: value }))
  }

  const saveScenario = () => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ inputs, scenario }))
      setSaved(true)
      setToast('Scenario saved to this browser')
      window.setTimeout(() => setSaved(false), 2200)
    } catch {
      setToast('Unable to save in this browser')
    }
  }

  const reset = () => {
    setInputs(defaultFeasibilityInputs)
    setScenario('base')
    setToast('Assumptions reset to defaults')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Scenario workspace"
        title="Financial feasibility"
        description="Test the economics of your plan. Every number below is a user-provided assumption or a transparent frontend estimate."
        location={`${locality.name} context · ${category.shortName}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={reset}>
              <RotateCcw className="h-4 w-4 text-ink-mute" />
              Reset
            </button>
            <button type="button" className="btn-primary" onClick={saveScenario}>
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? 'Saved' : 'Save scenario'}
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        <GlassPanel className="self-start p-5">
          <PanelHeader
            eyebrow="01 · Inputs"
            title="Your cost assumptions"
            description="Adjust the plan. Outcomes recalculate instantly."
            icon={Calculator}
          />

          <div className="mt-4 flex items-center justify-between rounded-xl border border-line/60 bg-white/45 px-2.5 py-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Scenario</span>
            <SegmentedControl value={scenario} onChange={(value) => setScenario(value )} options={scenarioOptions} size="sm" />
          </div>

          <div className="mt-4 space-y-4">
            <MoneyInput
              label="Initial investment"
              value={inputs.investment}
              min={300_000}
              max={5_000_000}
              step={50_000}
              onChange={(value) => updateInput('investment', value)}
            />
            <MoneyInput
              label="Monthly rent"
              value={inputs.monthlyRent}
              min={10_000}
              max={150_000}
              step={1_000}
              onChange={(value) => updateInput('monthlyRent', value)}
            />
            <MoneyInput
              label="Employee expenses / month"
              value={inputs.employeeExpenses}
              min={20_000}
              max={300_000}
              step={5_000}
              onChange={(value) => updateInput('employeeExpenses', value)}
            />
            <MoneyInput
              label="Other operating expenses / month"
              value={inputs.otherExpenses}
              min={5_000}
              max={200_000}
              step={2_500}
              onChange={(value) => updateInput('otherExpenses', value)}
            />
            <div className="rounded-xl border border-brand-100/70 bg-brand-50/45 p-3">
              <MoneyInput
                label="Estimated monthly revenue"
                value={inputs.monthlyRevenue}
                min={50_000}
                max={800_000}
                step={5_000}
                onChange={(value) => updateInput('monthlyRevenue', value)}
                accent
              />
              <p className="mt-2 border-t border-brand-100/60 pt-2 text-[8.5px] font-medium leading-relaxed text-brand-900/70">
                Scenario applied: {scenarioMeta[scenario].label} → {formatINR(adjustedRevenue)} monthly revenue
                ({scenarioMeta[scenario].note}).
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold-100 bg-gold-50/60 p-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
            <p className="text-[9px] leading-relaxed text-gold-700">
              These are user-provided assumptions, not verified figures. Break-even assumes a flat monthly
              run-rate with no ramp-up, seasonality, taxes, or financing costs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/risk-analysis')}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line/70 bg-white/50 py-2 text-[10.5px] font-bold text-brand-700 transition-colors hover:bg-white"
          >
            Need the market-risk view instead?
            <Sparkles className="h-3 w-3" />
          </button>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-5 py-4">
              <PanelHeader
                eyebrow="02 · Outcome"
                title="Scenario outcome"
                description="Monthly economics and capital recovery at a flat run-rate."
                icon={Wallet}
              />
              <div className="flex items-center gap-2">
                <span className="chip">{scenarioMeta[scenario].label} · {scenarioMeta[scenario].note}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-gold-200/70 bg-gold-50 px-2 py-0.5 text-[9px] font-bold text-gold-700">
                  Estimate
                </span>
              </div>
            </div>

            <div className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="label">Estimated monthly {isProfitable ? 'profit' : 'loss'}</p>
                <div className="mt-1 flex flex-wrap items-end gap-2.5">
                  <p
                    className="tabular font-display text-[38px] font-extrabold leading-none tracking-[-0.05em]"
                    style={{ color: isProfitable ? '#158258' : '#C64F44' }}
                  >
                    {isProfitable ? '+' : '−'}
                    {formatINR(Math.abs(result.monthlyProfit))}
                  </p>
                  <span
                    className={cn(
                      'mb-1 inline-flex items-center gap-4 rounded-lg border px-2 py-1 text-[10.5px] font-bold',
                      isProfitable
                        ? 'border-jade-200/60 bg-jade-50 text-jade-700'
                        : 'border-coral-200/60 bg-coral-50 text-coral-700',
                    )}
                  >
                    {isProfitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {result.margin.toFixed(1)}% margin
                  </span>
                </div>
                <p className="mt-2 max-w-lg text-[11px] leading-relaxed text-ink-mute">
                  {isProfitable
                    ? `The plan clears monthly costs. At a flat run-rate, the initial ${formatCompactINR(inputs.investment)} is recovered in about ${result.breakEvenMonths} months.`
                    : `At this revenue, the plan runs a monthly shortfall. You need about ${formatINR(Math.max(0, result.requiredRevenue + 1 - adjustedRevenue))} more monthly revenue to break even.`}
                </p>

                <div className="mt-3">
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.05]">
                    {expenseData.map((item) => (
                      <div
                        key={item.name}
                        className="h-full border-r border-white/70 last:border-0"
                        style={{
                          width: `${(item.value / Math.max(1, adjustedRevenue)) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    ))}
                    <div
                      className="h-full bg-jade-500/80"
                      style={{ width: `${Math.max(0, (result.monthlyProfit / Math.max(1, adjustedRevenue)) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[8.5px] font-semibold text-ink-faint">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Rent
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-sea-500" /> People
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> Other
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-jade-500" /> Profit
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 md:pl-4">
                <FeasibilityDial score={result.score} tone={result.tone} />
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10.5px] font-bold',
                    tone.badge,
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {result.verdict}
                </span>
                <p className="max-w-[150px] text-center text-[8.5px] font-medium leading-relaxed text-ink-faint">
                  Directional score from margin, payback, and revenue coverage.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px border-t border-line/60 bg-line/50 md:grid-cols-4">
              <div className="bg-white/60 px-4 py-3">
                <p className="label">Monthly expenses</p>
                <p className="tabular mt-1 text-[16px] font-extrabold text-ink">{formatINR(result.totalExpenses)}</p>
                <p className="text-[8.5px] font-medium text-ink-faint">rent + people + operating</p>
              </div>
              <div className="bg-white/60 px-4 py-3">
                <p className="label">Required revenue</p>
                <p className="tabular mt-1 text-[16px] font-extrabold text-ink">{formatINR(result.requiredRevenue)}</p>
                <p className="text-[8.5px] font-medium text-ink-faint">to cover monthly costs</p>
              </div>
              <div className="bg-white/60 px-4 py-3">
                <p className="label">Break-even</p>
                <p className="tabular mt-1 text-[16px] font-extrabold text-ink">
                  {result.breakEvenMonths !== null ? `${result.breakEvenMonths} mo` : 'Not reached'}
                </p>
                <p className="text-[8.5px] font-medium text-ink-faint">at current monthly profit</p>
              </div>
              <div className="bg-white/60 px-4 py-3">
                <p className="label">Annual profit</p>
                <p
                  className={cn(
                    'tabular mt-1 text-[16px] font-extrabold',
                    result.annualProfit >= 0 ? 'text-jade-700' : 'text-coral-600',
                  )}
                >
                  {result.annualProfit >= 0 ? '+' : '−'}
                  {formatCompactINR(Math.abs(result.annualProfit))}
                </p>
                <p className="text-[8.5px] font-medium text-ink-faint">flat run-rate projection</p>
              </div>
            </div>
          </GlassPanel>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <GlassPanel className="p-5">
              <PanelHeader
                eyebrow="Capital recovery"
                title="Cumulative cash flow"
                description="24-month cumulative position from the initial investment."
                icon={TrendingUp}
                action={
                  <span className="chip">
                    Break-even {result.breakEvenMonths !== null ? `month ${result.breakEvenMonths}` : 'beyond 24 mo'}
                  </span>
                }
              />
              <div className="mt-3 h-[218px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projection} margin={{ top: 10, right: 10, bottom: 0, left: -6 }}>
                    <defs>
                      <linearGradient id="cashflowFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartAccent} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={chartAccent} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                    <XAxis
                      dataKey="month"
                      type="number"
                      domain={[0, 24]}
                      ticks={[0, 6, 12, 18, 24]}
                      tickFormatter={(value) => `M${value}`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9.5, fill: '#8B90A2', fontWeight: 600 }}
                      dy={5}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={58}
                      tick={{ fontSize: 9, fill: '#8B90A2', fontWeight: 600 }}
                      tickFormatter={(value) => formatCompactINR(value)}
                    />
                    <Tooltip
                      content={<ChartTooltip formatter={(value) => formatCompactINR(value)} labelSuffix="months in" />}
                    />
                    <ReferenceLine y={0} stroke="#C9C0AF" strokeWidth={1} />
                    {recoveryMonth !== null && recoveryMonth <= 24 && (
                      <ReferenceLine
                        x={recoveryMonth}
                        stroke={chartAccent}
                        strokeDasharray="4 4"
                        strokeOpacity={0.55}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="cashflow"
                      name="Cumulative cash flow"
                      stroke={chartAccent}
                      strokeWidth={2.3}
                      fill="url(#cashflowFill)"
                      activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: chartAccent }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 border-t border-line/60 pt-2.5 text-[9px] font-medium text-ink-faint">
                Illustrative projection — assumes constant monthly profit and no reinvestment.
              </p>
            </GlassPanel>

            <GlassPanel className="p-5">
              <PanelHeader
                eyebrow="Cost stack"
                title="Monthly cost composition"
                description="Where each rupee of operating cost goes."
                icon={Minus}
              />
              <div className="relative mt-1 h-[168px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltip formatter={(value) => formatINR(value)} />} />
                    <Pie
                      data={expenseData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={2.5}
                      cornerRadius={4}
                      stroke="none"
                    >
                      {expenseData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="tabular font-display text-[18px] font-extrabold leading-none text-ink">
                    {formatCompactINR(result.totalExpenses)}
                  </p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">per month</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {expenseData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="flex-1 text-[10px] font-semibold text-ink-soft">{entry.name}</span>
                    <span className="tabular text-[10px] font-bold text-ink">{formatINR(entry.value)}</span>
                    <span className="tabular w-8 text-right text-[9px] font-semibold text-ink-faint">
                      {Math.round((entry.value / Math.max(1, result.totalExpenses)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-line/60 bg-white/40 px-2 py-1.5">
                <span className="text-[9px] font-semibold text-ink-mute">Revenue coverage</span>
                <span
                  className={cn(
                    'tabular text-[10px] font-bold',
                    result.monthlyProfit >= 0 ? 'text-jade-700' : 'text-coral-600',
                  )}
                >
                  {Math.round((adjustedRevenue / Math.max(1, result.totalExpenses)) * 100)}%
                </span>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>

      <GlassPanel className="p-5">
        <PanelHeader
          eyebrow="Sensitivity"
          title="Scenario comparison"
          description="The same cost base under three revenue assumptions. Select a scenario to apply it."
          icon={Calculator}
          action={<span className="chip">Revenue ±15%</span>}
        />
        <div className="mt-3.5 grid gap-2.5 md:grid-cols-3">
          {scenarioResults.map((entry) => {
            const meta = scenarioMeta[entry.key]
            const entryTone = verdictTone[entry.result.verdict]
            const isSelected = entry.key === scenario
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setScenario(entry.key)}
                className={cn(
                  'relative rounded-2xl border p-3.5 text-left transition-all duration-200',
                  isSelected
                    ? 'border-brand-200 bg-brand-50/45 ring-1 ring-brand-200/60'
                    : 'border-line/70 bg-white/40 hover:border-line-strong hover:bg-white/75',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {entry.key === 'conservative' && <TrendingDown className="h-3.5 w-3.5 text-coral-500" />}
                    {entry.key === 'base' && <Minus className="h-3.5 w-3.5 text-brand-600" />}
                    {entry.key === 'optimistic' && <TrendingUp className="h-3.5 w-3.5 text-jade-600" />}
                    <p className="text-[11px] font-extrabold text-ink">{meta.label}</p>
                  </div>
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[8.5px] font-semibold text-ink-faint">
                  {meta.note} · {formatINR(entry.revenue)} revenue
                </p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div>
                    <p
                      className={cn(
                        'tabular font-display text-[21px] font-extrabold leading-none tracking-[-0.04em]',
                        entry.result.monthlyProfit >= 0 ? 'text-jade-700' : 'text-coral-600',
                      )}
                    >
                      {entry.result.monthlyProfit >= 0 ? '+' : '−'}
                      {formatCompactINR(Math.abs(entry.result.monthlyProfit))}
                    </p>
                    <p className="mt-0.5 text-[8px] font-semibold text-ink-faint">monthly profit</p>
                  </div>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[8.5px] font-bold', entryTone.badge)}>
                    {entry.result.verdict}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line/60 pt-2">
                  <div>
                    <p className="text-[7.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">Margin</p>
                    <p className="tabular text-[10.5px] font-bold text-ink-soft">{entry.result.margin.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[7.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">Payback</p>
                    <p className="tabular text-[10.5px] font-bold text-ink-soft">
                      {entry.result.breakEvenMonths !== null ? `${entry.result.breakEvenMonths} mo` : '—'}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
          <p className="flex items-center gap-1.5 text-[9px] font-medium text-ink-faint">
            <Info className="h-3 w-3" />
            Break-even and payback are estimates based entirely on the assumptions above.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[8.5px] font-semibold text-ink-faint">Revenue coverage</span>
              <Meter value={Math.min(100, (adjustedRevenue / Math.max(1, result.totalExpenses)) * 100)} tone={isProfitable ? 'jade' : 'coral'} height="xs" className="w-20" />
            </div>
            <button
              type="button"
              onClick={() => navigate('/market-assistant')}
              className="text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
            >
              Ask AI to interpret these scenarios
            </button>
          </div>
        </div>
      </GlassPanel>

      <Toast message={toast} onClose={closeToast} />
    </div>
  )
}
