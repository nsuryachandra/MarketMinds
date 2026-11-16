import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  Info,
  Plus,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Select } from '../components/ui/Select'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { Toast } from '../components/ui/Toast'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { useMarket } from '../context/MarketContext'
import { categories, getCategory } from '../data/categories'
import {
  decliningCategories,
  growingCategories,
  milestoneNotes,
  trendHeadline,
  trendYears,
  yearlyRegistrations,
  yearlyTable,
} from '../data/trends'
import { cn, formatCompact, formatNumber, signed } from '../lib/utils'

const trajectoryColors = ['#4946B4', '#14958C', '#D0922B']
const sparkNet = yearlyRegistrations.map((year) => year.registrations - year.closures)
const sparkRegistrations = yearlyRegistrations.map((year) => year.registrations)
const sparkClosures = yearlyRegistrations.map((year) => year.closures)

export function MarketTrends() {
  const navigate = useNavigate()
  const { category, categoryId, setCategoryId } = useMarket()
  const [compareIds, setCompareIds] = useState(() => {
    const defaults = [categoryId, 'tech', 'wellness'].filter(
      (id, index, list) => list.indexOf(id) === index,
    )
    return defaults.slice(0, 3)
  })
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const comparisonCategories = compareIds.map((id) => getCategory(id))

  const trajectoryData = useMemo(
    () =>
      trendYears.map((year, index) => {
        const point = { year }
        comparisonCategories.forEach((item) => {
          point[item.id] = item.trend[index]
        })
        return point
      }),
    [comparisonCategories],
  )

  const growthData = yearlyRegistrations.map((year) => ({
    year: year.year,
    growth: year.growth,
  }))

  const availableCategories = categories.filter((item) => !compareIds.includes(item.id))

  const addComparison = (id) => {
    setCompareIds((current) => {
      if (current.includes(id) || current.length >= 3) return current
      return [...current, id]
    })
  }

  const removeComparison = (id) => {
    setCompareIds((current) => (current.length <= 1 ? current : current.filter((entry) => entry !== id)))
  }

  const copyDataset = async () => {
    const header = 'Year,New registrations,Estimated closures,Net additions,YoY growth %,Closure ratio %'
    const rows = yearlyTable.map((year) =>
      [
        year.year,
        year.registrations,
        year.closures,
        year.net,
        year.growth,
        year.closureRatio,
      ].join(','),
    )
    try {
      await navigator.clipboard.writeText([header, ...rows].join('\n'))
      setToast('Yearly registration dataset copied')
    } catch {
      setToast('Clipboard unavailable in this browser')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Historical intelligence"
        title="Market trends that compound"
        description="Eight years of Hyderabad business formation, closure pressure, and category momentum — read as one continuous signal."
        location="Hyderabad · 2018–2025"
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={copyDataset}>
              <Copy className="h-4 w-4 text-ink-mute" />
              Copy dataset
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/market-assistant')}>
              <Sparkles className="h-4 w-4" />
              Generate trend brief
            </button>
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="2025 registrations"
          value={formatNumber(trendHeadline.registrations2025)}
          icon={Store}
          tone="brand"
          delta={trendHeadline.yoyGrowth}
          deltaLabel="vs 2024"
          spark={sparkRegistrations}
        />
        <MetricCard
          label="Net additions"
          value={formatNumber(trendHeadline.netAdditions)}
          icon={TrendingUp}
          tone="jade"
          delta={12.8}
          deltaLabel="vs 2024"
          spark={sparkNet}
        />
        <MetricCard
          label="Estimated closures"
          value={formatNumber(trendHeadline.closures2025)}
          icon={TrendingDown}
          tone="coral"
          delta={7.9}
          deltaGood={false}
          deltaLabel="vs 2024"
          spark={sparkClosures}
        />
        <MetricCard
          label="Five-year CAGR"
          value="12.1%"
          icon={ArrowUpRight}
          tone="gold"
          footnote="Compound annual growth, registrations 2019–2025"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.58fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Formation vs closure"
            title="New business additions by year"
            description="Annual registrations against estimated closures across Hyderabad."
            icon={TrendingUp}
            action={
              <div className="flex items-center gap-3 text-[10px] font-semibold text-ink-mute">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-brand-600" />
                  Registrations
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral-500" />
                  Estimated closures
                </span>
              </div>
            }
          />
          <div className="mt-4 h-[278px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearlyRegistrations} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="trendBarFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5A57D4" />
                    <stop offset="100%" stopColor="#35328C" stopOpacity={0.82} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10.5, fill: '#8B90A2', fontWeight: 600 }}
                  dy={5}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tick={{ fontSize: 10.5, fill: '#8B90A2', fontWeight: 600 }}
                  tickFormatter={(value) => formatCompact(value)}
                />
                <Tooltip content={<ChartTooltip formatter={(value) => formatNumber(value)} />} />
                <Bar
                  dataKey="registrations"
                  name="New registrations"
                  fill="url(#trendBarFill)"
                  radius={[6, 6, 2, 2]}
                  barSize={26}
                />
                <Line
                  type="monotone"
                  dataKey="closures"
                  name="Estimated closures"
                  stroke="#DC6A5F"
                  strokeWidth={2.2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: '#DC6A5F', stroke: '#fff', strokeWidth: 1.5 }}
                  activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2, fill: '#DC6A5F' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-ink-mute">
              <span className="rounded-md bg-jade-50 px-1.5 py-0.5 text-[9.5px] font-bold text-jade-700">
                +{formatNumber(trendHeadline.netAdditions)}
              </span>
              net new businesses in 2025 — the strongest annual gain in the series.
            </p>
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Illustrative historical model
            </span>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Rate of change"
            title="Year-over-year growth"
            description="Registration momentum, with the 2020 contraction preserved."
            icon={TrendingDown}
          />
          <div className="mt-4 h-[218px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 8, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9.5, fill: '#8B90A2', fontWeight: 600 }}
                  dy={5}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tick={{ fontSize: 9.5, fill: '#8B90A2', fontWeight: 600 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<ChartTooltip formatter={(value) => `${value.toFixed(1)}%`} />} />
                <ReferenceLine y={0} stroke="#C9C0AF" strokeWidth={1} />
                <Bar dataKey="growth" name="YoY growth" radius={[4, 4, 0, 0]} barSize={20}>
                  {growthData.map((entry) => (
                    <Cell key={entry.year} fill={entry.growth < 0 ? '#DC6A5F' : '#1D9B6A'} fillOpacity={0.86} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5 border-t border-line/60 pt-3">
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-ink-mute">Five-year CAGR</span>
              <span className="font-bold text-jade-700">{signed(trendHeadline.fiveYearCagr)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-ink-mute">Closure ratio · 2025</span>
              <span className="font-bold text-ink">
                {((trendHeadline.closures2025 / trendHeadline.registrations2025) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-ink-mute">Recovery year</span>
              <span className="font-bold text-ink">2021 · +65.4%</span>
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <GlassPanel className="p-5">
          <PanelHeader
            eyebrow="Category momentum"
            title="Category growth comparison"
            description="Normalised registration index, 2018 = 100. Compare up to three categories."
            icon={TrendingUp}
            action={
              <div className="flex items-center gap-1.5">
                {comparisonCategories.map((item, index) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold"
                    style={{
                      borderColor: `${trajectoryColors[index]}35`,
                      backgroundColor: `${trajectoryColors[index]}12`,
                      color: trajectoryColors[index],
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: trajectoryColors[index] }} />
                    {item.shortName}
                    <button
                      type="button"
                      onClick={() => removeComparison(item.id)}
                      disabled={compareIds.length <= 1}
                      className="ml-0.5 rounded-full p-0.5 transition-opacity hover:opacity-70 disabled:opacity-20"
                      aria-label={`Remove ${item.name}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                {compareIds.length < 3 && (
                  <Select
                    value=""
                    onChange={addComparison}
                    size="sm"
                    searchable
                    placeholder="+ Add"
                    className="w-[92px]"
                    buttonClassName="h-6 min-h-0 rounded-full border-dashed px-2 text-[9.5px]"
                    menuClassName="w-[240px]"
                    ariaLabel="Add category to comparison"
                    options={availableCategories.map((item) => ({
                      value: item.id,
                      label: item.name,
                      hint: `${signed(item.growth)} YoY`,
                      icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
                    }))}
                  />
                )}
              </div>
            }
          />
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryData} margin={{ top: 8, right: 14, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 5" stroke="#EAE3D7" vertical={false} />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10.5, fill: '#8B90A2', fontWeight: 600 }}
                  dy={5}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tick={{ fontSize: 10.5, fill: '#8B90A2', fontWeight: 600 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<ChartTooltip formatter={(value) => `${Math.round(value)} index`} />} />
                <ReferenceLine y={100} stroke="#D5CCBA" strokeDasharray="4 4" />
                {comparisonCategories.map((item, index) => (
                  <Line
                    key={item.id}
                    type="monotone"
                    dataKey={item.id}
                    name={item.shortName}
                    stroke={trajectoryColors[index]}
                    strokeWidth={item.id === categoryId ? 2.8 : 1.9}
                    dot={false}
                    activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <p className="text-[10px] font-medium text-ink-mute">
              {category.name} is indexed at{" "}
              <span className="font-bold text-ink">{category.trend[category.trend.length - 1]}</span> in 2025 —{" "}
              {category.trend[category.trend.length - 1] - 100}% above its 2018 base.
            </p>
            <button
              type="button"
              onClick={() => {
                setCategoryId(categoryId)
                navigate('/market-assistant')
              }}
              className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
            >
              Read the implication
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="p-5">
            <PanelHeader
              eyebrow="Accelerating"
              title="Growing categories"
              description="Registrations expanding faster than the city average."
              icon={ArrowUpRight}
            />
            <div className="mt-3 space-y-1.5">
              {growingCategories.map((item) => {
                const categoryItem = getCategory(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategoryId(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors',
                      categoryId === item.id
                        ? 'border-brand-200 bg-brand-50/55'
                        : 'border-transparent hover:border-line/60 hover:bg-white/50',
                    )}
                  >
                    <CategoryGlyph icon={categoryItem.icon} tint={categoryItem.tint} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-ink">{item.label}</p>
                      <p className="text-[9px] font-medium text-ink-faint">{formatNumber(item.volume)} businesses</p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-jade-200/60 bg-jade-50 px-1.5 py-0.5 text-[9.5px] font-bold text-jade-700">
                      <ArrowUpRight className="h-2.5 w-2.5" />
                      {signed(item.change)}
                    </span>
                  </button>
                )
              })}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <PanelHeader
              eyebrow="Cooling"
              title="Lagging categories"
              description="Growth below Hyderabad’s 11.4% market pace."
              icon={ArrowDownRight}
            />
            <div className="mt-3 space-y-1.5">
              {decliningCategories.map((item) => {
                const categoryItem = getCategory(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategoryId(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors',
                      categoryId === item.id
                        ? 'border-brand-200 bg-brand-50/55'
                        : 'border-transparent hover:border-line/60 hover:bg-white/50',
                    )}
                  >
                    <CategoryGlyph icon={categoryItem.icon} tint={categoryItem.tint} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-ink">{item.label}</p>
                      <p className="text-[9px] font-medium text-ink-faint">{formatNumber(item.volume)} businesses</p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-gold-200/60 bg-gold-50 px-1.5 py-0.5 text-[9.5px] font-bold text-gold-700">
                      {signed(item.change)}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-line/60 bg-white/40 p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
              <p className="text-[9px] leading-relaxed text-ink-mute">
                Lagging growth is not decline. These categories still add businesses — just at a slower rate than
                the city baseline.
              </p>
            </div>
          </GlassPanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <GlassPanel className="overflow-hidden p-5">
          <PanelHeader
            eyebrow="Complete series"
            title="Yearly registration table"
            description="The full 2018–2025 series, including net additions and closure ratio."
            icon={Store}
            action={
              <button type="button" onClick={copyDataset} className="btn-secondary h-8 px-2.5 text-[10.5px]">
                <Copy className="h-3 w-3" />
                Copy CSV
              </button>
            }
          />
          <div className="mt-3 overflow-x-auto scroll-slim">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line/70">
                  {['Year', 'Registrations', 'Closures', 'Net additions', 'YoY growth', 'Closure ratio'].map(
                    (header) => (
                      <th
                        key={header}
                        className="pb-2 pr-3 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint first:pl-1.5"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {yearlyTable.map((year) => (
                  <tr
                    key={year.year}
                    className="border-b border-line/50 transition-colors last:border-0 hover:bg-white/55"
                  >
                    <td className="py-2.5 pl-1.5 pr-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink">
                        {year.year}
                        {year.year === '2025' && (
                          <span className="rounded bg-brand-50 px-1 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.06em] text-brand-700">
                            latest
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="tabular py-2.5 pr-3 text-[10.5px] font-semibold text-ink-soft">
                      {formatNumber(year.registrations)}
                    </td>
                    <td className="tabular py-2.5 pr-3 text-[10.5px] font-semibold text-ink-mute">
                      {formatNumber(year.closures)}
                    </td>
                    <td className="tabular py-2.5 pr-3 text-[10.5px] font-bold text-ink">
                      +{formatNumber(year.net)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold',
                          year.growth < 0
                            ? 'border-coral-200/60 bg-coral-50 text-coral-700'
                            : 'border-jade-200/60 bg-jade-50 text-jade-700',
                        )}
                      >
                        {year.growth >= 0 ? (
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        ) : (
                          <ArrowDownRight className="h-2.5 w-2.5" />
                        )}
                        {signed(year.growth)}
                      </span>
                    </td>
                    <td className="tabular py-2.5 pr-3 text-[10.5px] font-semibold text-ink-mute">
                      {year.closureRatio.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 border-t border-line/60 pt-2.5 text-[9px] font-medium text-ink-faint">
            <Info className="h-3 w-3" />
            Historical values are illustrative. Closures are modelled estimates, not registry-confirmed exits.
          </p>
        </GlassPanel>

        <GlassPanel className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold-500/[0.06] blur-2xl" />
          <PanelHeader
            eyebrow="Reading the series"
            title="Milestones & interpretation"
            description="Three turning points that shaped today’s market."
            icon={Sparkles}
          />
          <div className="relative mt-4">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-brand-300 via-line to-sea-300" />
            <div className="space-y-4">
              {milestoneNotes.map((milestone, index) => (
                <div key={milestone.year} className="relative flex gap-3 pl-0.5">
                  <span
                    className={cn(
                      'relative z-10 mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-white',
                      index === 0 ? 'bg-coral-500' : index === 1 ? 'bg-jade-500' : 'bg-brand-600',
                    )}
                    style={{ boxShadow: '0 0 0 1px rgba(27,31,47,0.08)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tabular text-[10.5px] font-extrabold text-brand-800">{milestone.year}</span>
                      <span className="text-[10.5px] font-bold text-ink">{milestone.label}</span>
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-relaxed text-ink-mute">{milestone.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-brand-100/70 bg-[linear-gradient(150deg,rgba(244,243,253,0.9),rgba(255,255,255,0.6))] p-3.5">
            <p className="serif-accent text-[17px] leading-snug text-brand-900">
              “The market is not just growing — it is rotating toward experience, health, and specialised services.”
            </p>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              MarketMinds trend interpretation · illustrative
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/market-assistant')}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line/70 bg-white/50 py-2 text-[10.5px] font-bold text-brand-700 transition-colors hover:bg-white"
          >
            <Plus className="h-3 w-3" />
            Build a category-specific brief
          </button>
        </GlassPanel>
      </div>

      <Toast message={toast} onClose={closeToast} />
    </div>
  )
}
