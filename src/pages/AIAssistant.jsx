import { useEffect, useMemo, useRef, useState } from 'react'


import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Calculator,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  FileText,
  Info,
  MapPin,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  UsersRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { Select } from '../components/ui/Select'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { Meter } from '../components/ui/Meter'
import { Toast } from '../components/ui/Toast'
import { useMarket } from '../context/MarketContext'
import { categories } from '../data/categories'
import { localities } from '../data/localities'
import {
  answerMarketQuestion,
  buildMarketBrief,
  calculateRisk,
  defaultRiskInputs,
  getMarketSnapshot,
} from '../lib/analytics'

import { cn, formatCompactINR, formatNumber, signed } from '../lib/utils'










const briefTone


 = {
  GO: {
    banner: 'border-jade-200/70 bg-jade-50/60 text-jade-700',
    iconBg: 'bg-jade-600 text-white',
    icon: CheckCircle2,
    meter: 'jade',
    headline: 'Proceed to validation',
  },
  'CONDITIONAL GO': {
    banner: 'border-gold-200/70 bg-gold-50/60 text-gold-700',
    iconBg: 'bg-gold-500 text-white',
    icon: AlertTriangle,
    meter: 'gold',
    headline: 'Proceed with discipline',
  },
  'NO-GO': {
    banner: 'border-coral-200/70 bg-coral-50/60 text-coral-700',
    iconBg: 'bg-coral-500 text-white',
    icon: XCircle,
    meter: 'coral',
    headline: 'Reconsider the setup',
  },
}

const briefTabs = [
  { value: 'signals', label: 'Signals' },
  { value: 'risks', label: 'Risks' },
  { value: 'plan', label: 'Action plan' },
]

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={index}>{part}</span>
  })
}

function RichText({ text }) {
  const lines = text.split('\n').filter((line) => line.trim().length > 0)
  return (
    <div className="space-y-1.5 text-[11.5px] leading-relaxed text-ink-mute">
      {lines.map((line, index) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('• ')) {
          return (
            <div key={index} className="flex gap-1.5">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              <p>{renderInline(trimmed.slice(2))}</p>
            </div>
          )
        }
        const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (numbered) {
          return (
            <div key={index} className="flex gap-1.5">
              <span className="tabular shrink-0 font-bold text-brand-600">{numbered[1]}.</span>
              <p>{renderInline(numbered[2])}</p>
            </div>
          )
        }
        return <p key={index}>{renderInline(trimmed)}</p>
      })}
    </div>
  )
}

function BriefBullet({ text, tone = 'brand' }) {
  const dots = {
    brand: 'bg-brand-400',
    jade: 'bg-jade-500',
    coral: 'bg-coral-500',
    gold: 'bg-gold-500',
  }
  return (
    <div className="flex gap-2">
      <span className={cn('mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full', dots[tone])} />
      <p className="text-[10.5px] leading-relaxed text-ink-mute">{text}</p>
    </div>
  )
}

export function AIAssistant() {
  const navigate = useNavigate()
  const {
    category,
    categoryId,
    locality,
    localityId,
    setCategoryId,
    setLocalityId,
  } = useMarket()
  const [briefTab, setBriefTab] = useState('signals')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [toast, setToast] = useState(null)
  const scrollRef = useRef(null)
  const timerRef = useRef(null)
  const busyRef = useRef(false)
  const idRef = useRef(0)

  const brief = useMemo(() => buildMarketBrief(categoryId, localityId), [categoryId, localityId])
  const snapshot = useMemo(() => getMarketSnapshot(categoryId, localityId), [categoryId, localityId])
  const risk = useMemo(() => calculateRisk(categoryId, localityId, defaultRiskInputs), [categoryId, localityId])
  const tone = briefTone[brief.recommendation]
  const RecIcon = tone.icon

  const intro = useMemo(
    () =>
      `**${locality.name} · ${category.name}**\n\nWe estimate ${formatNumber(snapshot.presence)} ${category.shortName.toLowerCase()} establishments here, with competition at ${snapshot.competition}/100 and opportunity at ${snapshot.opportunity}/100. The current read is **${brief.recommendation}** at ${brief.confidence}% confidence.\n\nAsk me about saturation, rent, risks, growth, or where else to look in Hyderabad.`,
    [brief, category, locality, snapshot],
  )

  const prompts = useMemo(
    () => [
      {
        label: 'Gauge saturation',
        icon: UsersRound,
        question: `How saturated is ${locality.name} for ${category.shortName.toLowerCase()}?`,
      },
      {
        label: 'Rent & break-even',
        icon: Wallet,
        question: 'What rent should I budget here, and what revenue do I need to break even?',
      },
      {
        label: 'Biggest risks',
        icon: ShieldAlert,
        question: 'What are the biggest risks at this location?',
      },
      {
        label: 'Strongest localities',
        icon: MapPin,
        question: `Which localities fit ${category.shortName.toLowerCase()} best?`,
      },
    ],
    [category.shortName, locality.name],
  )

  const nextId = () => {
    idRef.current += 1
    return `msg-${idRef.current}`
  }

  useEffect(() => {
    busyRef.current = false
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setTyping(false)
    setInput('')
    setMessages([{ id: `intro-${categoryId}-${localityId}`, role: 'assistant', content: intro }])
  }, [categoryId, localityId, intro])

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTo({
      top: messages.length > 1 ? element.scrollHeight : 0,
      behavior: messages.length > 1 ? 'smooth' : 'auto',
    })
  }, [messages, typing])

  const sendQuestion = (raw) => {
    const question = raw.trim()
    if (!question || busyRef.current) return
    busyRef.current = true
    setTyping(true)
    setInput('')
    setMessages((current) => [...current, { id: nextId(), role: 'user', content: question }])

    const answer = answerMarketQuestion(question, categoryId, localityId)
    timerRef.current = window.setTimeout(() => {
      const reply = { id: nextId(), role: 'assistant', content: answer }
      setMessages((current) => [...current, reply])
      setTyping(false)
      busyRef.current = false
      timerRef.current = null
    }, 720)
  }

  const clearChat = () => {
    busyRef.current = false
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setTyping(false)
    setInput('')
    setMessages([{ id: nextId(), role: 'assistant', content: intro }])
  }

  const buildBriefText = () =>
    [
      'MarketMinds — Market Brief',
      `${category.name} · ${locality.name}`,
      '',
      `Recommendation: ${brief.recommendation} (${brief.confidence}% confidence)`,
      `Risk score: ${risk.score}/100 (${risk.band})`,
      '',
      'Summary',
      brief.summary,
      '',
      'Opportunity signals',
      ...brief.opportunities.map((item) => `- ${item}`),
      '',
      'Risks',
      ...brief.risks.map((item) => `- ${item}`),
      '',
      'Competition',
      ...brief.competition.map((item) => `- ${item}`),
      '',
      'Financial context',
      ...brief.financial.map((item) => `- ${item}`),
      '',
      'Next steps',
      ...brief.nextSteps.map((item, index) => `${index + 1}. ${item}`),
      '',
      'Illustrative estimate from mock market data. Not verified business information or financial advice.',
    ].join('\n')

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(buildBriefText())
      setToast('Brief copied to clipboard')
    } catch {
      setToast('Copy is unavailable in this browser')
    }
  }

  const downloadBrief = () => {
    const blob = new Blob([buildBriefText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `marketminds-brief-${localityId}-${categoryId}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setToast('Market brief downloaded')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="AI briefing desk"
        title="Market assistant"
        description="Ask questions in plain language and get a decision brief grounded in the selected category and locality. Answers are generated by a deterministic mock engine."
        location={`${locality.name} · ${category.shortName}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={clearChat}>
              <RotateCcw className="h-4 w-4 text-ink-mute" />
              Clear chat
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/financial-feasibility')}
            >
              <Calculator className="h-4 w-4" />
              Test the numbers
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <GlassPanel className="flex h-[640px] flex-col overflow-hidden sm:h-[680px] xl:h-[calc(100vh-200px)] xl:max-h-[840px] xl:min-h-[640px]">
          <div className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="clay-brand relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                <Sparkles className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-jade-500" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[13px] font-extrabold tracking-[-0.02em] text-ink">
                  Conversation
                </p>
                <p className="truncate text-[9.5px] font-medium text-ink-faint">
                  Grounded in {locality.name} · {category.shortName}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-jade-200/60 bg-jade-50/70 px-2 py-0.5 text-[9px] font-bold text-jade-700">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-jade-500" />
              Model ready
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-line/60 bg-white/30 px-4 py-2.5">
            <div>
              <label className="label mb-1 block text-[8.5px]">Category</label>
              <Select
                value={categoryId}
                onChange={setCategoryId}
                size="sm"
                searchable
                ariaLabel="Assistant category"
                options={categories.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: `${formatNumber(item.businesses)} businesses · ${signed(item.growth)}`,
                  icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
                }))}
              />
            </div>
            <div>
              <label className="label mb-1 block text-[8.5px]">Locality</label>
              <Select
                value={localityId}
                onChange={setLocalityId}
                size="sm"
                searchable
                ariaLabel="Assistant locality"
                searchPlaceholder="Find a locality…"
                options={localities.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: `${item.zone} · ${item.competition}/100 competition`,
                  icon: <MapPin className="h-3.5 w-3.5 text-brand-500" />,
                }))}
              />
            </div>
          </div>

          <div
            ref={scrollRef}
            className="scroll-slim flex-1 space-y-3.5 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.map((message) => {
              const isUser = message.role === 'user'
              return (
                <div
                  key={message.id}
                  className={cn('flex items-start gap-2.5', isUser && 'justify-end')}
                >
                  {!isUser && (
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[88%] rounded-2xl border px-3.5 py-2.5',
                      isUser
                        ? 'rounded-br-md border-brand-500/30 text-white'
                        : 'rounded-bl-md border-line/60 bg-white/75 text-ink-mute',
                    )}
                    style={
                      isUser
                        ? {
                            background: 'linear-gradient(155deg, #5a57d4 0%, #4946b4 60%, #3b3795 100%)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                          }
                        : undefined
                    }
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed">{message.content}</p>
                    ) : (
                      <RichText text={message.content} />
                    )}
                  </div>
                </div>
              )
            })}

            {typing && (
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-line/60 bg-white/75 px-3.5 py-3">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400"
                        style={{ animationDelay: `${dot * 130}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-[9.5px] font-semibold text-ink-faint">
                    Reading local market signals…
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-line/60 bg-white/40 px-3 pb-3 pt-2.5">
            <div className="scroll-slim mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {prompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  disabled={typing}
                  title={prompt.question}
                  onClick={() => sendQuestion(prompt.question)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line/70 bg-white/70 px-2.5 py-1 text-[9.5px] font-semibold text-ink-mute transition-colors hover:border-brand-200 hover:bg-white hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <prompt.icon className="h-3 w-3 text-brand-500" />
                  {prompt.label}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2 rounded-2xl border border-line/80 bg-white/85 p-1.5 pl-3 transition-all focus-within:border-brand-300 focus-within:shadow-[0_0_0_4px_rgba(90,87,212,0.08)]">
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendQuestion(input)
                  }
                }}
                placeholder={`Ask about ${locality.name}…`}
                className="max-h-24 min-h-[34px] flex-1 resize-none bg-transparent py-1.5 text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
                aria-label="Ask the market assistant"
              />
              <button
                type="button"
                onClick={() => sendQuestion(input)}
                disabled={!input.trim() || typing}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-[0_4px_10px_-4px_rgba(59,55,149,0.6)] transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send question"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[8.5px] font-medium text-ink-faint">
              <Info className="h-2.5 w-2.5" />
              Mock analysis for planning only. Not financial advice or verified market data.
            </p>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-line/60 px-5 py-4">
              <PanelHeader
                eyebrow="02 · Decision brief"
                title="What the data says"
                description="Generated from the current category and locality context."
                icon={FileText}
              />
              <button
                type="button"
                title="Copy brief"
                aria-label="Copy brief"
                onClick={() => void copyBrief()}
                className="icon-button h-8 w-8 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className={cn('rounded-2xl border p-4', tone.banner)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm', tone.iconBg)}>
                      <RecIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] opacity-70">
                        Recommendation
                      </p>
                      <p className="mt-0.5 font-display text-[23px] font-extrabold leading-none tracking-[-0.04em]">
                        {brief.recommendation}
                      </p>
                      <p className="mt-1 text-[9.5px] font-semibold opacity-80">{tone.headline}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] opacity-60">Confidence</p>
                    <p className="tabular font-display text-[19px] font-extrabold leading-none">
                      {brief.confidence}%
                    </p>
                  </div>
                </div>
                <Meter
                  value={brief.confidence}
                  tone={tone.meter}
                  height="xs"
                  className="mt-3"
                  trackClassName="bg-white/60"
                />
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Competition</p>
                  <p className="tabular mt-0.5 text-[13px] font-extrabold text-ink">
                    {snapshot.competition}
                    <span className="ml-0.5 text-[8.5px] font-semibold text-ink-faint">/100</span>
                  </p>
                </div>
                <div className="rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Opportunity</p>
                  <p className="tabular mt-0.5 text-[13px] font-extrabold text-ink">
                    {snapshot.opportunity}
                    <span className="ml-0.5 text-[8.5px] font-semibold text-ink-faint">/100</span>
                  </p>
                </div>
                <div className="rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Rent est.</p>
                  <p className="tabular mt-0.5 text-[13px] font-extrabold text-ink">
                    {formatCompactINR(snapshot.rentBenchmark)}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[10.5px] leading-relaxed text-ink-mute">{brief.summary}</p>

              <div className="mt-3.5">
                <SegmentedControl
                  value={briefTab}
                  onChange={(value) => setBriefTab(value )}
                  options={briefTabs}
                  size="sm"
                  className="w-full justify-between"
                />
              </div>

              <div className="mt-3 space-y-2.5">
                {briefTab === 'signals' && (
                  <>
                    <p className="label">Opportunity signals</p>
                    {brief.opportunities.map((item, index) => (
                      <BriefBullet key={`opportunity-${index}`} text={item} tone="jade" />
                    ))}
                    <div className="hairline my-1" />
                    <p className="label">Competitive context</p>
                    {brief.competition.slice(0, 2).map((item, index) => (
                      <BriefBullet key={`competition-${index}`} text={item} tone="brand" />
                    ))}
                  </>
                )}

                {briefTab === 'risks' && (
                  <>
                    <div className="flex items-center justify-between rounded-xl border border-line/60 bg-white/45 px-2.5 py-2">
                      <span className="text-[9.5px] font-semibold text-ink-mute">Estimated risk score</span>
                      <span className="tabular text-[10.5px] font-extrabold text-ink">
                        {risk.score}/100 · {risk.band}
                      </span>
                    </div>
                    <p className="label pt-1">Primary risks</p>
                    {brief.risks.slice(0, 3).map((item, index) => (
                      <BriefBullet key={`risk-${index}`} text={item} tone="coral" />
                    ))}
                    <div className="hairline my-1" />
                    <p className="label">Financial read</p>
                    {brief.financial.slice(0, 2).map((item, index) => (
                      <BriefBullet key={`financial-${index}`} text={item} tone="gold" />
                    ))}
                  </>
                )}

                {briefTab === 'plan' && (
                  <>
                    <p className="label">Recommended next steps</p>
                    {brief.nextSteps.map((step, index) => (
                      <div key={`step-${index}`} className="flex gap-2.5 rounded-xl border border-line/60 bg-white/40 p-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[8.5px] font-extrabold text-white">
                          {index + 1}
                        </span>
                        <p className="text-[10.5px] leading-relaxed text-ink-mute">{step}</p>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => navigate('/financial-feasibility')}
                      className="flex w-full items-center justify-between rounded-xl border border-brand-100 bg-brand-50/50 px-2.5 py-2 text-[10px] font-bold text-brand-700 transition-colors hover:bg-brand-50"
                    >
                      Stress-test these numbers in the feasibility calculator
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-white/30 px-5 py-2.5">
              <p className="max-w-[220px] text-[8.5px] font-medium leading-relaxed text-ink-faint">
                Illustrative estimates from mock market data. Validate before committing capital.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyBrief()}
                  className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
                <span className="h-3 w-px bg-line" />
                <button
                  type="button"
                  onClick={downloadBrief}
                  className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-700 hover:text-brand-900"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelHeader
              eyebrow="Next move"
              title="Continue the analysis"
              description="Move from the brief to a specific decision."
              icon={Compass}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              {[
                {
                  label: 'Model location risk',
                  detail: `${risk.score}/100 estimate`,
                  icon: ShieldAlert,
                  to: '/risk-analysis',
                },
                {
                  label: 'Compare localities',
                  detail: 'Rank fit and rent head-to-head',
                  icon: MapPin,
                  to: '/location-comparison',
                },
                {
                  label: 'Test financial feasibility',
                  detail: 'Stress-test margin and payback',
                  icon: Calculator,
                  to: '/financial-feasibility',
                },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className="group flex items-center gap-2.5 rounded-xl border border-line/60 bg-white/40 px-2.5 py-2 text-left transition-all hover:border-brand-200/70 hover:bg-white/80"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-white/70 text-brand-700">
                    <action.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10.5px] font-bold text-ink">{action.label}</span>
                    <span className="block truncate text-[8.5px] font-medium text-ink-faint">{action.detail}</span>
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </button>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
