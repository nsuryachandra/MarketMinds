import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Store,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { GlassPanel } from '../components/ui/GlassPanel'
import { PanelHeader } from '../components/ui/PanelHeader'
import { Select } from '../components/ui/Select'
import { CategoryGlyph } from '../components/ui/CategoryGlyph'
import { Meter } from '../components/ui/Meter'
import { ErrorBlock, LoadingBlock, SourceNote } from '../components/domain/DataState'
import { useMarket } from '../context/MarketContext'
import { useApiResource } from '../hooks/useApiResource'
import { marketApi } from '../lib/api'
import { cn, formatNumber } from '../lib/utils'

function RichText({ text }) {
  const lines = text.split('\n').filter((line) => line.trim().length > 0)
  return (
    <div className="space-y-1.5 text-[11.5px] leading-relaxed text-ink-mute">
      {lines.map((line, index) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
          return (
            <div key={index} className="flex gap-1.5">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              <p>{trimmed.slice(2)}</p>
            </div>
          )
        }
        const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (numbered) {
          return (
            <div key={index} className="flex gap-1.5">
              <span className="tabular shrink-0 font-bold text-brand-600">{numbered[1]}.</span>
              <p>{numbered[2]}</p>
            </div>
          )
        }
        return <p key={index}>{trimmed}</p>
      })}
    </div>
  )
}

function promptList(localityName, categoryName) {
  return [
    `How competitive is ${localityName} for ${categoryName.toLowerCase()} according to the mapped data?`,
    `Explain the main risk factors for ${localityName}.`,
    `Compare ${localityName} with other supported localities for this category.`,
    'What limitations should I keep in mind before using this analysis?',
  ]
}

export function AIAssistant() {
  const { categoryId, localityId, radius, business } = useMarket()
  const contextKey = [categoryId, localityId, radius, business?.osm_id ?? 'none'].join('|')
  return <AssistantWorkspace key={contextKey} />
}

function AssistantWorkspace() {
  const navigate = useNavigate()
  const {
    categories,
    localities,
    category,
    categoryId,
    locality,
    localityId,
    setCategoryId,
    setLocalityId,
    radius,
    dataReady,
    metaLoading,
    metaError,
    reloadMeta,
    health,
    business,
    isBusinessMode,
  } = useMarket()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copyStatus, setCopyStatus] = useState('')
  const scrollRef = useRef(null)

  const assistant = health?.assistant
  const configured = Boolean(assistant?.configured)

  const contextResult = useApiResource(
    async ({ signal }) => {
      const snapshotRequest = isBusinessMode
        ? marketApi.getBusinessContext(
            { osm_id: business.osm_id, category: categoryId, radius_m: radius },
            { signal },
          )
        : marketApi.getLocalityAnalysis(
            { locality: localityId, category: categoryId, radius_m: radius },
            { signal },
          )
      const competitorsRequest = isBusinessMode
        ? marketApi.getBusinessCompetitors(
            { osm_id: business.osm_id, category: categoryId, radius_m: radius, limit: 20 },
            { signal },
          )
        : marketApi.getCompetitors(
            { locality: localityId, category: categoryId, radius_m: radius, limit: 20 },
            { signal },
          )
      const riskRequest = isBusinessMode
        ? marketApi.estimateBusinessRisk(
            { osm_id: business.osm_id, category: categoryId, radius_m: radius },
            { signal },
          )
        : marketApi.estimateRisk(
            { locality: localityId, category: categoryId, radius_m: radius },
            { signal },
          )
      const [snapshot, competitors, risk, allLocalities, trends] = await Promise.all([
        snapshotRequest,
        competitorsRequest,
        riskRequest,
        marketApi.getAllLocalityAnalysis({ category: categoryId, radius_m: radius }, { signal }),
        marketApi.getTrends({ category: categoryId }, { signal }),
      ])
      return { snapshot, competitors, risk, allLocalities, trends }
    },
    [isBusinessMode, business?.osm_id, localityId, categoryId, radius],
    { enabled: dataReady },
  )

  const context = contextResult.data
  const snapshot = context?.snapshot
  const risk = context?.risk
  const competitors = context?.competitors
  const scores = snapshot?.scores ?? {}
  const riskBand = risk?.risk_band ?? 'insufficient_data'

  const analysisContext = useMemo(() => {
    if (!context) return null
    const localityRows = (context.allLocalities?.localities ?? [])
      .map((entry) => ({
        locality: entry.locality.name,
        zone: entry.locality.zone,
        mapped_pois: entry.mapped_poi_count,
        density_per_sq_km: entry.density_per_sq_km,
        competition_index: entry.scores.competition_index,
        opportunity_index: entry.scores.opportunity_index,
        activity_index: entry.scores.activity_index,
        access_index: entry.scores.access_index,
        data_completeness: entry.scores.data_completeness,
        data_status: entry.data_status,
      }))
      .filter((entry) => entry.opportunity_index !== null)
      .sort((a, b) => b.opportunity_index - a.opportunity_index)
      .slice(0, 10)

    return {
      selected_scope: {
        category: category?.name,
        locality: isBusinessMode ? business?.nearest_locality_name : locality?.name,
        radius_m: radius,
        business: isBusinessMode
          ? {
              name: business?.name,
              osm_id: business?.osm_id,
              mapped_coordinate: { latitude: business?.latitude, longitude: business?.longitude },
              nearest_locality: business?.nearest_locality_name,
              note: 'Selected business is excluded from its own competitor count.',
            }
          : null,
      },
      market_snapshot: {
        data_status: snapshot?.data_status,
        mapped_poi_count: snapshot?.mapped_poi_count,
        named_poi_count: snapshot?.named_poi_count,
        unnamed_poi_count: snapshot?.unnamed_poi_count,
        density_per_sq_km: snapshot?.density_per_sq_km,
        category_share_of_mapped_pct: snapshot?.category_share_of_mapped_pct,
        all_mapped_poi_count_in_catchment: snapshot?.all_mapped_poi_count_in_catchment,
        category_mix_hhi: snapshot?.category_mix_hhi,
        scores: snapshot?.scores,
        competition_context: snapshot?.competition_context,
        activity_context: snapshot?.activity_context,
        access_counts: snapshot?.access_counts,
        data_quality: snapshot?.data_quality,
        analysis_center: snapshot?.analysis_center,
        data_notes: snapshot?.data_notes,
      },
      directional_risk: risk
        ? {
            risk_score: risk.risk_score,
            risk_band: risk.risk_band,
            data_status: risk.data_status,
            message: risk.message,
            factors: (risk.factors ?? []).map((factor) => ({
              label: factor.label,
              signal_value: factor.signal_value,
              risk_points: factor.risk_points,
              applied_weight: factor.applied_weight,
              explanation: factor.explanation,
            })),
            data_notes: risk.data_notes,
          }
        : null,
      competitor_summary: competitors
        ? {
            competitor_count: competitors.competitor_count,
            unnamed_competitor_count: competitors.unnamed_competitor_count,
            unnamed_competitor_share_pct: competitors.unnamed_competitor_share_pct,
            category_mix: (competitors.category_mix ?? []).slice(0, 6),
            nearest_records: (competitors.competitors ?? []).slice(0, 12).map((item) => ({
              name: item.display_name,
              subtype: item.subtype,
              distance_m: item.distance_m,
              inside_ghmc: item.inside_ghmc,
              name_status: item.name_status,
            })),
            data_notes: competitors.data_notes,
          }
        : null,
      locality_opportunity_ranking: localityRows,
      historical_trends: context.trends
        ? {
            ghmc_annual_totals: context.trends.ghmc_licence_activity?.annual_totals,
            ghmc_yoy_change_2022_to_2023_pct:
              context.trends.ghmc_licence_activity?.yoy_change_2022_to_2023_pct,
            ghmc_circle_count: context.trends.ghmc_licence_activity?.circle_count,
            ghmc_circles: (context.trends.ghmc_licence_activity?.circles ?? []).slice(0, 6),
            ghmc_notes: context.trends.ghmc_licence_activity?.data_notes,
            google_trends_available: context.trends.google_trends_available,
            google_trends: context.trends.google_trends
              ? {
                  term: context.trends.google_trends.term_label,
                  latest_week: context.trends.google_trends.latest_week,
                  latest_interest: context.trends.google_trends.latest_interest,
                  recent_52_week_average: context.trends.google_trends.recent_52_week_average,
                  change_pct:
                    context.trends.google_trends.last_52_weeks_vs_previous_52_weeks_change_pct,
                  note: context.trends.google_trends.note,
                }
              : null,
            google_trends_note: context.trends.google_trends_note,
          }
        : null,
      approved_categories: categories.map((item) => item.name),
      supported_localities: localities.map((item) => item.name),
    }
  }, [business, categories, category, context, isBusinessMode, localities, locality, radius, risk, snapshot, competitors])

  const intro = useMemo(() => {
    if (!snapshot) return ''
    const scope = isBusinessMode
      ? `${business?.name} (nearest locality: ${business?.nearest_locality_name})`
      : `${locality?.name}`
    const mapped = snapshot.mapped_poi_count
    const opportunity = snapshot.scores?.opportunity_index
    const competition = snapshot.scores?.competition_index
    if (snapshot.data_status === 'insufficient_data') {
      return `Selected scope: ${scope}, ${category?.name}, ${radius / 1000} km radius.\n\nThe catchment has ${formatNumber(mapped)} mapped ${category?.name?.toLowerCase()} POIs and does not meet the model's minimum data threshold. I can explain the available mapped counts and limitations, but not score the location.`
    }
    return `Selected scope: ${scope}, ${category?.name}, ${radius / 1000} km radius.\n\nThe catchment contains ${formatNumber(mapped)} mapped ${category?.name?.toLowerCase()} POIs. The opportunity index is ${opportunity ?? '—'}/100 and the competition index is ${competition ?? '—'}/100. The directional risk score is ${risk?.risk_score ?? '—'}/100 (${riskBand.replaceAll('_', ' ')}).\n\nAsk about the mapped supply, risk factors, locality comparisons, or dataset limitations.`
  }, [business, category, isBusinessMode, locality, radius, risk, riskBand, snapshot])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior: messages.length ? 'smooth' : 'auto' })
  }, [messages, busy])

  const sendQuestion = async (raw) => {
    const content = raw.trim()
    if (!content || busy || !configured || !analysisContext) return
    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setBusy(true)
    try {
      const response = await marketApi.chatAssistant({
        messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
        context: analysisContext,
      })
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.content,
          model: response.model,
          generated: response.ai_generated,
          notes: response.notes,
        },
      ])
    } catch (requestError) {
      setError(requestError)
    } finally {
      setBusy(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setInput('')
    setError(null)
  }

  const copyTranscript = async () => {
    const transcript = [
      'MarketMinds assistant transcript',
      intro,
      ...messages.map((message) => `${message.role === 'user' ? 'You' : 'Assistant'}: ${message.content}`),
      '',
      'AI-generated content can be wrong. Deterministic metrics remain the source of record.',
    ].join('\n\n')
    try {
      await navigator.clipboard.writeText(transcript)
      setCopyStatus('Transcript copied')
      window.setTimeout(() => setCopyStatus(''), 2000)
    } catch {
      setCopyStatus('Clipboard unavailable')
    }
  }

  if (metaLoading || contextResult.loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="AI briefing desk" title="Market assistant" location={locality?.name} />
        <LoadingBlock label="Loading grounded analysis context for the assistant…" />
      </div>
    )
  }

  const pageError = metaError || contextResult.error
  if (pageError) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="AI briefing desk" title="Market assistant" location={locality?.name} />
        <ErrorBlock
          error={pageError}
          onRetry={() => {
            if (metaError) reloadMeta()
            else contextResult.reload()
          }}
        />
      </div>
    )
  }

  const prompts = promptList(
    isBusinessMode ? business?.nearest_locality_name ?? locality?.name : locality?.name,
    category?.name ?? '',
  )
  const canSend = configured && analysisContext && !busy

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="AI briefing desk"
        title="Market assistant"
        description="Ask questions about the selected real-data snapshot. The backend sends only the current analysis context to the configured NVIDIA model; deterministic metrics remain the source of record."
        location={`${isBusinessMode ? business?.name : locality?.name} · ${category?.name}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={clearChat}>
              <RotateCcw className="h-4 w-4 text-ink-mute" />
              Clear chat
            </button>
            <button type="button" className="btn-secondary" onClick={copyTranscript}>
              <Copy className="h-4 w-4 text-ink-mute" />
              {copyStatus || 'Copy transcript'}
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-white/55 px-3.5 py-2.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9.5px] font-bold',
            configured
              ? 'border-jade-200/70 bg-jade-50 text-jade-700'
              : 'border-gold-200/70 bg-gold-50 text-gold-700',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', configured ? 'bg-jade-500' : 'bg-gold-500')} />
          {configured ? 'NVIDIA assistant configured' : 'NVIDIA assistant not configured'}
        </span>
        <span className="text-[10px] font-semibold text-ink-mute">
          {assistant?.model ?? 'Model unavailable'}
        </span>
        <span className="h-4 w-px bg-line" />
        <span className="text-[10px] font-medium text-ink-faint">
          {isBusinessMode ? 'Business coordinate context' : 'Locality reference-point context'} ·{' '}
          {radius / 1000} km · {formatNumber(snapshot?.mapped_poi_count ?? 0)} mapped POIs
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="min-w-[160px]">
            <Select
              value={categoryId ?? undefined}
              onChange={setCategoryId}
              size="sm"
              searchable
              ariaLabel="Assistant category"
              options={categories.map((item) => ({
                value: item.id,
                label: item.name,
                icon: <CategoryGlyph icon={item.icon} tint={item.tint} size="sm" />,
              }))}
            />
          </div>
          <div className="min-w-[160px]">
            <Select
              value={localityId ?? undefined}
              onChange={setLocalityId}
              size="sm"
              searchable
              ariaLabel="Assistant locality"
              searchPlaceholder="Find a locality…"
              options={localities.map((item) => ({
                value: item.id,
                label: item.name,
                hint: item.zone,
                icon: <MapPin className="h-3.5 w-3.5 text-brand-500" />,
              }))}
            />
          </div>
        </div>
      </div>

      {!configured && (
        <div className="flex items-start gap-2.5 rounded-xl border border-gold-200/70 bg-gold-50/60 px-3.5 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
          <div>
            <p className="text-[11px] font-bold text-gold-900">Configure the server-side NVIDIA key to enable chat</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-gold-800/80">
              Add <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-[9.5px]">NVIDIA_API_KEY</code> to
              the untracked <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-[9.5px]">backend/.env</code>{' '}
              file and restart FastAPI. The assistant never receives a key from the browser, and deterministic
              metrics remain available.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <GlassPanel className="flex h-[640px] flex-col overflow-hidden sm:h-[680px] xl:h-[calc(100vh-230px)] xl:max-h-[820px] xl:min-h-[620px]">
          <div className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="clay-brand relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                <Sparkles className="h-4 w-4" />
                <span
                  className={cn(
                    'absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-canvas',
                    configured ? 'bg-jade-500' : 'bg-gold-500',
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[13px] font-extrabold tracking-[-0.02em] text-ink">
                  Conversation
                </p>
                <p className="truncate text-[9.5px] font-medium text-ink-faint">
                  Grounded in {isBusinessMode ? business?.name : locality?.name} · {category?.name}
                </p>
              </div>
            </div>
            {configured ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-jade-200/60 bg-jade-50/70 px-2 py-0.5 text-[9px] font-bold text-jade-700">
                <span className="h-1.5 w-1.5 rounded-full bg-jade-500" />
                Ready
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold-200/60 bg-gold-50/70 px-2 py-0.5 text-[9px] font-bold text-gold-700">
                <ShieldAlert className="h-2.5 w-2.5" />
                Disabled
              </span>
            )}
          </div>

          <div ref={scrollRef} className="scroll-slim flex-1 space-y-3.5 overflow-y-auto px-4 py-4" aria-live="polite">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-line/60 bg-white/75 px-3.5 py-2.5">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="text-[8.5px] font-extrabold uppercase tracking-[0.08em] text-brand-700">
                    Deterministic context
                  </span>
                  <span className="rounded bg-jade-50 px-1 py-0.5 text-[7.5px] font-bold text-jade-700">
                    not AI
                  </span>
                </div>
                <RichText text={intro} />
              </div>
            </div>

            {messages.map((message, index) => {
              const isUser = message.role === 'user'
              return (
                <div key={`${message.role}-${index}`} className={cn('flex items-start gap-2.5', isUser && 'justify-end')}>
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
                      <>
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[8.5px] font-extrabold uppercase tracking-[0.08em] text-brand-700">
                            AI-generated
                          </span>
                          {message.model && (
                            <span className="rounded bg-white/70 px-1 py-0.5 text-[7.5px] font-semibold text-ink-faint">
                              {message.model}
                            </span>
                          )}
                        </div>
                        <RichText text={message.content} />
                        {message.notes?.length > 0 && (
                          <p className="mt-2 border-t border-line/50 pt-1.5 text-[8.5px] leading-relaxed text-ink-faint">
                            {message.notes[0]}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {busy && (
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
                  <span className="text-[9.5px] font-semibold text-ink-faint">Reading the supplied context…</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-coral-200/70 bg-coral-50/60 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral-700" />
                <div>
                  <p className="text-[10.5px] font-bold text-coral-800">Assistant request failed</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-coral-800/80">
                    {error.message || 'The assistant could not complete this request.'}
                  </p>
                  {error.code && (
                    <p className="mt-1 font-mono text-[8.5px] text-coral-700/70">Code: {error.code}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-line/60 bg-white/40 px-3 pb-3 pt-2.5">
            <div className="scroll-slim mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={!canSend}
                  onClick={() => sendQuestion(prompt)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line/70 bg-white/70 px-2.5 py-1 text-[9.5px] font-semibold text-ink-mute transition-colors hover:border-brand-200 hover:bg-white hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title={prompt}
                >
                  <MessageSquare className="h-3 w-3 text-brand-500" />
                  {prompt.length > 46 ? `${prompt.slice(0, 44)}…` : prompt}
                </button>
              ))}
            </div>

            <div
              className={cn(
                'flex items-end gap-2 rounded-2xl border border-line/80 bg-white/85 p-1.5 pl-3 transition-all',
                canSend
                  ? 'focus-within:border-brand-300 focus-within:shadow-[0_0_0_4px_rgba(90,87,212,0.08)]'
                  : 'opacity-70',
              )}
            >
              <textarea
                rows={1}
                value={input}
                disabled={!configured}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendQuestion(input)
                  }
                }}
                placeholder={
                  configured
                    ? `Ask about ${isBusinessMode ? business?.name : locality?.name}…`
                    : 'Configure NVIDIA_API_KEY on the backend to enable chat'
                }
                className="max-h-24 min-h-[34px] flex-1 resize-none bg-transparent py-1.5 text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed"
                aria-label="Ask the market assistant"
              />
              <button
                type="button"
                onClick={() => sendQuestion(input)}
                disabled={!canSend || !input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-[0_4px_10px_-4px_rgba(59,55,149,0.6)] transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send question"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[8.5px] font-medium text-ink-faint">
              <Info className="h-2.5 w-2.5" />
              AI can be wrong. Verify mapped counts, historical data limits, and user assumptions before deciding.
            </p>
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="p-5">
            <PanelHeader
              eyebrow="Grounded context"
              title="What the assistant can see"
              description="A compact snapshot of the selected real-data scope."
              icon={Store}
              action={<span className="chip">Read-only</span>}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line/60 bg-white/45 p-2.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Mapped POIs</p>
                <p className="tabular mt-0.5 text-[16px] font-extrabold text-ink">
                  {formatNumber(snapshot?.mapped_poi_count ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-line/60 bg-white/45 p-2.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Nearby mapped</p>
                <p className="tabular mt-0.5 text-[16px] font-extrabold text-ink">
                  {formatNumber(competitors?.competitor_count ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-line/60 bg-white/45 p-2.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Opportunity</p>
                <p className="tabular mt-0.5 text-[16px] font-extrabold text-ink">
                  {scores.opportunity_index ?? '—'}
                  <span className="ml-0.5 text-[8px] text-ink-faint">/100</span>
                </p>
              </div>
              <div className="rounded-xl border border-line/60 bg-white/45 p-2.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-faint">Risk</p>
                <p className="tabular mt-0.5 text-[16px] font-extrabold text-ink">
                  {risk?.risk_score ?? '—'}
                  <span className="ml-0.5 text-[8px] text-ink-faint">/100</span>
                </p>
              </div>
            </div>
            <div className="mt-2.5 space-y-2">
              <div>
                <div className="flex justify-between text-[9.5px] font-semibold text-ink-mute">
                  <span>Competition index</span>
                  <span>{scores.competition_index ?? '—'}/100</span>
                </div>
                <Meter value={scores.competition_index ?? 0} tone="coral" height="xs" className="mt-1" />
              </div>
              <div>
                <div className="flex justify-between text-[9.5px] font-semibold text-ink-mute">
                  <span>Data completeness</span>
                  <span>{scores.data_completeness ?? '—'}/100</span>
                </div>
                <Meter value={scores.data_completeness ?? 0} tone="gold" height="xs" className="mt-1" />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-line/60 bg-white/40 p-2.5 text-[9.5px] leading-relaxed text-ink-mute">
              <p className="font-bold text-ink">Analysis centre</p>
              <p className="mt-0.5">{snapshot?.catchment?.center_label ?? '—'}</p>
              <p className="mt-0.5 text-ink-faint">
                {snapshot?.catchment?.center_kind ?? 'Approximate context'} · {radius / 1000} km circular
                catchment
              </p>
            </div>
            {snapshot?.data_status === 'insufficient_data' && (
              <p className="mt-2 rounded-lg border border-gold-200/60 bg-gold-50/60 px-2.5 py-2 text-[9px] leading-relaxed text-gold-800">
                {snapshot?.data_quality?.message}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate(isBusinessMode ? '/competitor-intelligence' : '/market-explorer')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line/70 bg-white/50 py-2 text-[10.5px] font-bold text-brand-700 transition-colors hover:bg-white"
            >
              <UsersRound className="h-3 w-3" />
              Open the deterministic view
            </button>
          </GlassPanel>

          <GlassPanel className="p-4">
            <PanelHeader
              eyebrow="Data boundaries"
              title="Included limitations"
              description="The assistant is instructed to preserve these boundaries."
              icon={Info}
            />
            <div className="mt-3 space-y-2">
              {(snapshot?.data_notes ?? []).slice(0, 5).map((note) => (
                <SourceNote key={note}>{note}</SourceNote>
              ))}
              {!snapshot?.data_notes?.length && (
                <SourceNote>Mapped POIs come from OpenStreetMap and are not a verified business register.</SourceNote>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[8.5px] font-semibold text-jade-700">
              <CheckCircle2 className="h-3 w-3" />
              Context-loaded: risk, competitors, locality ranking, trends
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
