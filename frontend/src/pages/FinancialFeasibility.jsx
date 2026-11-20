import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  Check,
  Info,
  Loader2,
  Minus,
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
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { EmptyBlock, InlineError } from '../components/domain/DataState'
import { useMarket } from '../context/MarketContext'
import { marketApi } from '../lib/api'
import { cn, formatCompactINR, formatINR } from '../lib/utils'

const methodOptions = [
  { value: 'revenue', label: 'Revenue estimate' },
  { value: 'customers', label: 'Customers × price' },
]

const scenarioOptions = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'base', label: 'Base' },
  { value: 'optimistic', label: 'Optimistic' },
]

const scenarioMeta = {
  conservative: { label: 'Conservative', note: '−15% revenue', tone: 'coral', icon: TrendingDown },
  base: { label: 'Base', note: 'Your estimate', tone: 'brand', icon: Minus },
  optimistic: { label: 'Optimistic', note: '+15% revenue', tone: 'jade', icon: TrendingUp },
}

const emptyForm = {
  investment: '',
  monthlyRent: '',
  staffExpenses: '',
  otherExpenses: '',
  monthlyRevenue: '',
  dailyCustomers: '',
  averageSellingPrice: '',
  workingDays: '26',
}

function MoneyInput({ label, value, onChange, hint, required = false }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10.5px] font-bold text-ink-soft">{label}</label>
        {!required && <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Optional</span>}
      </div>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink-faint">
          ₹
        </span>
        <input
          type="number"
          min="0"
          step="1000"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter your assumption"
          className="field h-9 rounded-lg pl-6 text-[11.5px] font-bold"
          aria-label={label}
        />
      </div>
      {hint && <p className="mt-1 text-[8.5px] leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  )
}

function compactNumber(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toFixed(value % 1 === 0 ? 0 : 2)
}

export function FinancialFeasibility() {
  const navigate = useNavigate()
  const { locality } = useMarket()
  const [method, setMethod] = useState('revenue')
  const [scenario, setScenario] = useState('base')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const updateInput = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setResult(null)
    setError(null)
  }

  const requiredValue = (key, label) => {
    if (form[key] === '' || form[key] === null) {
      throw new Error(`${label} is required.`)
    }
    const value = Number(form[key])
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${label} must be a non-negative number.`)
    }
    return value
  }

  const positiveValue = (key, label) => {
    const value = requiredValue(key, label)
    if (value <= 0) throw new Error(`${label} must be greater than zero.`)
    return value
  }

  const calculate = async (event) => {
    event?.preventDefault()
    setError(null)
    setResult(null)
    let payload
    try {
      payload = {
        method,
        monthly_rent: requiredValue('monthlyRent', 'Monthly rent'),
        staff_expenses: requiredValue('staffExpenses', 'Staff expenses'),
        other_monthly_expenses: requiredValue('otherExpenses', 'Other monthly expenses'),
        initial_investment: requiredValue('investment', 'Initial investment'),
      }
      if (method === 'revenue') {
        payload.expected_monthly_revenue = positiveValue('monthlyRevenue', 'Expected monthly revenue')
      } else {
        payload.daily_customers = positiveValue('dailyCustomers', 'Daily customers')
        payload.average_selling_price = positiveValue('averageSellingPrice', 'Average selling price')
        const workingDays = Number(form.workingDays)
        if (!Number.isInteger(workingDays) || workingDays < 1 || workingDays > 31) {
          throw new Error('Working days must be a whole number from 1 to 31.')
        }
        payload.working_days = workingDays
      }
    } catch (validationError) {
      setError({ message: validationError.message })
      return
    }

    setLoading(true)
    try {
      const data = await marketApi.estimateFinancials(payload)
      setResult(data)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setLoading(false)
    }
  }

  const selected = result?.scenarios?.[scenario]
  const costs = result?.cost_inputs
  const profit = selected?.monthly_profit ?? 0
  const profitable = profit >= 0
  const chartAccent = profitable ? '#079455' : '#D92D20'

  const expenseData = useMemo(
    () =>
      costs
        ? [
            { name: 'Rent', value: costs.monthly_rent, color: '#0A0D12' },
            { name: 'People', value: costs.staff_expenses, color: '#0F9D92' },
            { name: 'Other operating', value: costs.other_monthly_expenses, color: '#DC6803' },
          ]
        : [],
    [costs],
  )

  const cashFlow = selected?.cash_flow_projection ?? []
  const recoveryMonth =
    selected?.investment_payback_months !== null && selected?.investment_payback_months !== undefined
      ? Math.ceil(selected.investment_payback_months)
      : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Scenario workspace"
        title="Financial feasibility"
        description="Build the economics from your own assumptions. The calculator starts blank and never infers rent, sales, or demand from market averages."
        location={`${locality?.name ?? 'Hyderabad'} context · user-supplied numbers`}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setForm(emptyForm)
                setResult(null)
                setError(null)
              }}
            >
              <Calculator className="h-4 w-4 text-ink-mute" />
              Clear inputs
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4" />
              Ask the assistant
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        <GlassPanel className="min-w-0 self-start p-5">
          <PanelHeader
            eyebrow="01 · Inputs"
            title="Your cost assumptions"
            description="Every amount is user-supplied. No market value is prefilled."
            icon={Calculator}
          />

          <div className="mt-4 flex items-center justify-between rounded-xl border border-line/60 bg-white/45 px-2.5 py-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Revenue method</span>
            <SegmentedControl
              value={method}
              onChange={(value) => {
                setMethod(value)
                setResult(null)
                setError(null)
              }}
              options={methodOptions}
              size="sm"
            />
          </div>

          <form className="mt-4 space-y-3.5" onSubmit={calculate}>
            <MoneyInput
              label="Initial investment"
              value={form.investment}
              onChange={(value) => updateInput('investment', value)}
              hint="Fit-out, deposit, and other upfront capital."
            />
            <MoneyInput
              label="Monthly rent"
              value={form.monthlyRent}
              onChange={(value) => updateInput('monthlyRent', value)}
              hint="Use a quoted or planned rent; no market benchmark is applied."
            />
            <MoneyInput
              label="Staff expenses / month"
              value={form.staffExpenses}
              onChange={(value) => updateInput('staffExpenses', value)}
              hint="Salaries and recurring employee costs."
            />
            <MoneyInput
              label="Other operating expenses / month"
              value={form.otherExpenses}
              onChange={(value) => updateInput('otherExpenses', value)}
              hint="Utilities, marketing, maintenance, and other recurring costs."
            />

            {method === 'revenue' ? (
              <div className="rounded-xl border border-brand-100/70 bg-brand-50/45 p-3">
                <MoneyInput
                  label="Expected monthly revenue"
                  value={form.monthlyRevenue}
                  onChange={(value) => updateInput('monthlyRevenue', value)}
                  hint="Your planning estimate. The calculator applies transparent −15% / base / +15% scenarios."
                  required
                />
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-brand-100/70 bg-brand-50/45 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-ink-soft">Daily customers</label>
                    <input
                      type="number"
                      min="1"
                      value={form.dailyCustomers}
                      onChange={(event) => updateInput('dailyCustomers', event.target.value)}
                      placeholder="e.g. 80"
                      className="field mt-1.5 h-9 rounded-lg text-[11.5px] font-bold"
                      aria-label="Daily customers"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-ink-soft">Working days</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      value={form.workingDays}
                      onChange={(event) => updateInput('workingDays', event.target.value)}
                      className="field mt-1.5 h-9 rounded-lg text-[11.5px] font-bold"
                      aria-label="Working days per month"
                    />
                  </div>
                </div>
                <MoneyInput
                  label="Average selling price"
                  value={form.averageSellingPrice}
                  onChange={(value) => updateInput('averageSellingPrice', value)}
                  hint="Average revenue per customer."
                  required
                />
              </div>
            )}

            {error && <InlineError error={error} />}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              {loading ? 'Calculating…' : 'Calculate scenarios'}
            </button>
          </form>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold-100 bg-gold-50/60 p-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
            <p className="text-[9px] leading-relaxed text-gold-700">
              Break-even assumes a flat monthly run-rate with no ramp-up, seasonality, taxes, financing, or
              cost-of-goods changes. Results are planning scenarios, not financial advice.
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

        <div className="min-w-0 space-y-4">
          <GlassPanel className="min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-5 py-4">
              <PanelHeader
                eyebrow="02 · Outcome"
                title="Scenario outcome"
                description="Monthly economics and capital recovery from the applied inputs."
                icon={Wallet}
              />
              <div className="flex items-center gap-2">
                <SegmentedControl value={scenario} onChange={setScenario} options={scenarioOptions} size="sm" />
                <span className="inline-flex items-center gap-1 rounded-full border border-gold-200/70 bg-gold-50 px-2 py-0.5 text-[9px] font-bold text-gold-700">
                  User assumptions
                </span>
              </div>
            </div>

            {loading ? (
              <div className="p-5">
                <div className="flex items-center gap-2 text-[11.5px] font-semibold text-ink-mute">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                  Calculating the three scenarios…
                </div>
              </div>
            ) : !result ? (
              <EmptyBlock
                className="m-5"
                title="Enter your assumptions to calculate"
                description="This workspace starts blank. Provide rent, staffing, other operating costs, initial investment, and a revenue basis."
              />
            ) : (
              <>
                <div className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="label">Estimated monthly {profitable ? 'profit' : 'loss'}</p>
                    <div className="mt-1 flex flex-wrap items-end gap-2.5">
                      <p
                        className="tabular font-display text-[38px] font-extrabold leading-none tracking-[-0.05em]"
                        style={{ color: profitable ? '#067647' : '#B42318' }}
                      >
                        {profitable ? '+' : '−'}
                        {formatINR(Math.abs(profit))}
                      </p>
                      <span
                        className={cn(
                          'mb-1 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10.5px] font-bold',
                          profitable
                            ? 'border-jade-200/60 bg-jade-50 text-jade-700'
                            : 'border-coral-200/60 bg-coral-50 text-coral-700',
                        )}
                      >
                        {profitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {selected.margin_pct === null ? '—' : `${selected.margin_pct.toFixed(1)}% margin`}
                      </span>
                    </div>
                    <p className="mt-2 max-w-lg text-[11px] leading-relaxed text-ink-mute">
                      {profitable
                        ? `At a flat run-rate, the ${formatCompactINR(costs.initial_investment)} initial investment is recovered in about ${compactNumber(selected.investment_payback_months)} months under the ${scenarioMeta[scenario].label.toLowerCase()} scenario.`
                        : `At this revenue basis, the plan runs a monthly shortfall of ${formatCompactINR(Math.abs(profit))}. The break-even monthly revenue is ${formatCompactINR(selected.break_even_revenue)}.`}
                    </p>

                    <div className="mt-3">
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.05]">
                        {expenseData.map((item) => (
                          <div
                            key={item.name}
                            className="h-full border-r border-white/70 last:border-0"
                            style={{
                              width: `${(item.value / Math.max(1, selected.monthly_revenue)) * 100}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        ))}
                        <div
                          className="h-full bg-jade-500/80"
                          style={{
                            width: `${Math.max(0, (Math.max(0, profit) / Math.max(1, selected.monthly_revenue)) * 100)}%`,
                          }}
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
                    <div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full border-8 border-line/60 bg-white/65">
                      <p className="tabular font-display text-[27px] font-extrabold leading-none text-ink">
                        {selected.margin_pct === null ? '—' : `${selected.margin_pct.toFixed(0)}%`}
                      </p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-ink-faint">margin</p>
                    </div>
                    <p className="max-w-[150px] text-center text-[8.5px] font-medium leading-relaxed text-ink-faint">
                      Scenario revenue: {formatINR(selected.monthly_revenue)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px border-t border-line/60 bg-line/50 md:grid-cols-4">
                  <div className="bg-white/60 px-4 py-3">
                    <p className="label">Monthly costs</p>
                    <p className="tabular mt-1 text-[16px] font-extrabold text-ink">
                      {formatINR(selected.monthly_operating_costs)}
                    </p>
                    <p className="text-[8.5px] font-medium text-ink-faint">rent + people + other</p>
                  </div>
                  <div className="bg-white/60 px-4 py-3">
                    <p className="label">Break-even revenue</p>
                    <p className="tabular mt-1 text-[16px] font-extrabold text-ink">
                      {formatINR(selected.break_even_revenue)}
                    </p>
                    <p className="text-[8.5px] font-medium text-ink-faint">to cover monthly costs</p>
                  </div>
                  <div className="bg-white/60 px-4 py-3">
                    <p className="label">Payback</p>
                    <p className="tabular mt-1 text-[16px] font-extrabold text-ink">
                      {selected.investment_payback_months === null
                        ? 'Not reached'
                        : `${compactNumber(selected.investment_payback_months)} mo`}
                    </p>
                    <p className="text-[8.5px] font-medium text-ink-faint">at current monthly profit</p>
                  </div>
                  <div className="bg-white/60 px-4 py-3">
                    <p className="label">Annual profit</p>
                    <p
                      className={cn(
                        'tabular mt-1 text-[16px] font-extrabold',
                        selected.annual_profit >= 0 ? 'text-jade-700' : 'text-coral-600',
                      )}
                    >
                      {selected.annual_profit >= 0 ? '+' : '−'}
                      {formatCompactINR(Math.abs(selected.annual_profit))}
                    </p>
                    <p className="text-[8.5px] font-medium text-ink-faint">flat run-rate projection</p>
                  </div>
                </div>
              </>
            )}
          </GlassPanel>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <GlassPanel className="min-w-0 p-5">
              <PanelHeader
                eyebrow="Capital recovery"
                title="Cumulative cash flow"
                description="Twelve-month cumulative position after initial investment."
                icon={TrendingUp}
                action={
                  result ? (
                    <span className="chip">
                      {recoveryMonth !== null ? `Payback month ${recoveryMonth}` : 'No payback in 12 months'}
                    </span>
                  ) : null
                }
              />
              <div className="mt-3 h-[218px]">
                {result && cashFlow.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlow} margin={{ top: 10, right: 10, bottom: 0, left: -6 }}>
                      <defs>
                        <linearGradient id="cashflowFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartAccent} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={chartAccent} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 5" stroke="#E5EAF1" vertical={false} />
                      <XAxis
                        dataKey="month"
                        type="number"
                        domain={[1, 12]}
                        ticks={[1, 3, 6, 9, 12]}
                        tickFormatter={(value) => `M${value}`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9.5, fill: '#667085', fontWeight: 600 }}
                        dy={5}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={58}
                        tick={{ fontSize: 9, fill: '#667085', fontWeight: 600 }}
                        tickFormatter={(value) => formatCompactINR(value)}
                      />
                      <Tooltip
                        content={
                          <ChartTooltip
                            formatter={(value) => formatCompactINR(value)}
                            labelSuffix="month"
                          />
                        }
                      />
                      <ReferenceLine y={0} stroke="#D0D8E4" strokeWidth={1} />
                      <Area
                        type="monotone"
                        dataKey="cumulative_cash_after_investment"
                        name="Cumulative cash after investment"
                        stroke={chartAccent}
                        strokeWidth={2.3}
                        fill="url(#cashflowFill)"
                        activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: chartAccent }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyBlock
                    className="h-full"
                    title="No cash-flow projection yet"
                    description="Calculate scenarios to see capital recovery over 12 months."
                  />
                )}
              </div>
              <p className="mt-2 border-t border-line/60 pt-2.5 text-[9px] font-medium text-ink-faint">
                Assumes constant monthly profit and no reinvestment. Not a forecast.
              </p>
            </GlassPanel>

            <GlassPanel className="min-w-0 p-5">
              <PanelHeader
                eyebrow="Cost stack"
                title="Monthly cost composition"
                description="Where each rupee of operating cost goes."
                icon={Minus}
              />
              <div className="relative mt-1 h-[168px]">
                {expenseData.length ? (
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
                ) : (
                  <EmptyBlock
                    className="h-full"
                    title="No cost data yet"
                    description="Calculate scenarios to see the monthly cost composition."
                  />
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="tabular font-display text-[18px] font-extrabold leading-none text-ink">
                    {selected ? formatCompactINR(selected.monthly_operating_costs) : '—'}
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
                      {Math.round((entry.value / Math.max(1, costs?.monthly_operating_costs ?? 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
              {result && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-line/60 bg-white/40 px-2 py-1.5">
                  <span className="text-[9px] font-semibold text-ink-mute">Revenue coverage</span>
                  <span
                    className={cn(
                      'tabular text-[10px] font-bold',
                      selected.monthly_profit >= 0 ? 'text-jade-700' : 'text-coral-600',
                    )}
                  >
                    {Math.round(
                      (selected.monthly_revenue / Math.max(1, selected.monthly_operating_costs)) * 100,
                    )}
                    %
                  </span>
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      </div>

      <GlassPanel className="p-5">
        <PanelHeader
          eyebrow="Sensitivity"
          title="Scenario comparison"
          description="The same cost base under conservative, base, and optimistic revenue."
          icon={Calculator}
          action={<span className="chip">Revenue −15% / base / +15%</span>}
        />
        <div className="mt-3.5 grid gap-2.5 md:grid-cols-3">
          {result
            ? Object.entries(result.scenarios).map(([key, entry]) => {
                const meta = scenarioMeta[key]
                const isSelected = key === scenario
                const Icon = meta.icon
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setScenario(key)}
                    className={cn(
                      'relative rounded-2xl border p-3.5 text-left transition-all duration-200',
                      isSelected
                        ? 'border-brand-200 bg-brand-50/45 ring-1 ring-brand-200/60'
                        : 'border-line/70 bg-white/40 hover:border-line-strong hover:bg-white/75',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          className={cn(
                            'h-3.5 w-3.5',
                            key === 'conservative'
                              ? 'text-coral-500'
                              : key === 'optimistic'
                                ? 'text-jade-600'
                                : 'text-brand-600',
                          )}
                        />
                        <p className="text-[11px] font-extrabold text-ink">{meta.label}</p>
                      </div>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[8.5px] font-semibold text-ink-faint">
                      {meta.note} · {formatINR(entry.monthly_revenue)} revenue
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div>
                        <p
                          className={cn(
                            'tabular font-display text-[21px] font-extrabold leading-none tracking-[-0.04em]',
                            entry.monthly_profit >= 0 ? 'text-jade-700' : 'text-coral-600',
                          )}
                        >
                          {entry.monthly_profit >= 0 ? '+' : '−'}
                          {formatCompactINR(Math.abs(entry.monthly_profit))}
                        </p>
                        <p className="mt-0.5 text-[8px] font-semibold text-ink-faint">monthly profit</p>
                      </div>
                      <span className="rounded-full border border-line/70 bg-white/60 px-2 py-0.5 text-[8.5px] font-bold text-ink-mute">
                        {entry.margin_pct === null ? '—' : `${entry.margin_pct.toFixed(1)}%`} margin
                      </span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line/60 pt-2">
                      <div>
                        <p className="text-[7.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">Payback</p>
                        <p className="tabular text-[10.5px] font-bold text-ink-soft">
                          {entry.investment_payback_months === null
                            ? '—'
                            : `${compactNumber(entry.investment_payback_months)} mo`}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                          Break-even
                        </p>
                        <p className="tabular text-[10.5px] font-bold text-ink-soft">
                          {entry.monthly_break_even ? 'Covered' : 'Below cost'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            : [1, 2, 3].map((item) => (
                <div key={item} className="rounded-2xl border border-dashed border-line/70 bg-white/25 p-5">
                  <p className="text-[10.5px] font-bold text-ink-faint">Scenario pending</p>
                  <p className="mt-1 text-[9px] text-ink-faint">Enter assumptions and calculate.</p>
                </div>
              ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
          <p className="flex items-center gap-1.5 text-[9px] font-medium text-ink-faint">
            <Info className="h-3 w-3" />
            Multipliers are planning assumptions, not market forecasts. Taxes and financing are excluded.
          </p>
          <button
            type="button"
            onClick={() => navigate('/market-assistant')}
            className="text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
          >
            Ask the assistant to interpret these scenarios
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
