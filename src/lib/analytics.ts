import { brandNames } from '../data/brandNames'
import { categories, getCategory } from '../data/categories'
import { getLocality, localities } from '../data/localities'
import type {
  Category,
  CompetitorRecord,
  FeasibilityInputs,
  FeasibilityResult,
  Locality,
  Recommendation,
  RiskInputs,
  RiskResult,
} from './types'
import { clamp, formatINR, formatNumber, hashString, seededRandom, signed } from './utils'

export interface MarketSnapshot {
  presence: number
  nearby: number
  density: number
  competition: number
  opportunity: number
  growth: number
  rentBenchmark: number
}

export function getMarketSnapshot(categoryId: string, localityId: string): MarketSnapshot {
  const category = getCategory(categoryId)
  const locality = getLocality(localityId)
  const seed = hashString(`${categoryId}:${localityId}`)
  const presenceJitter = 0.86 + (seed % 29) / 100
  const isAnchor = locality.topCategories.includes(categoryId)
  const presence = Math.max(
    8,
    Math.round(locality.businesses * (category.share / 100) * presenceJitter * (isAnchor ? 1.22 : 0.92)),
  )
  const competition = clamp(
    Math.round(
      locality.competition + (category.avgRisk - 48) * 0.2 + (isAnchor ? 4 : -3) + ((seed % 9) - 4),
    ),
    8,
    97,
  )
  const opportunity = clamp(
    Math.round(
      locality.opportunity - (category.avgRisk - 48) * 0.16 + (isAnchor ? -4 : 3) + (7 - (seed % 13)),
    ),
    6,
    96,
  )
  const growth = Math.round((locality.growth * 0.55 + category.growth * 0.45 + (presenceJitter - 1) * 22) * 10) / 10
  const nearby = Math.max(6, Math.round(presence * (0.06 + locality.density / 20000)))
  const density = Math.round((nearby / 12.6) * 10) / 10
  return {
    presence,
    nearby,
    density,
    competition,
    opportunity,
    growth,
    rentBenchmark: Math.round(locality.rentIndex * 1200),
  }
}

export interface ComparisonMetrics {
  locality: Locality
  snapshot: MarketSnapshot
  risk: number
  suitability: number
  affordability: number
  activity: number
  growth: number
  competition: number
  rentIndex: number
}

export function getComparisonMetrics(categoryId: string, localityId: string): ComparisonMetrics {
  const locality = getLocality(localityId)
  const snapshot = getMarketSnapshot(categoryId, localityId)
  const growthNormalized = clamp(snapshot.growth * 4.2, 0, 100)
  const risk = clamp(
    Math.round(
      snapshot.competition * 0.44 +
        (100 - snapshot.opportunity) * 0.24 +
        Math.max(0, locality.rentIndex - 24) * 1.15 +
        (100 - locality.activity) * 0.1,
    ),
    9,
    96,
  )
  const suitability = clamp(
    Math.round(
      snapshot.opportunity * 0.5 +
        locality.activity * 0.2 +
        growthNormalized * 0.15 +
        (100 - snapshot.competition) * 0.15,
    ),
    10,
    98,
  )
  const affordability = clamp(Math.round(100 - ((locality.rentIndex - 14) / 28) * 72), 12, 96)
  return {
    locality,
    snapshot,
    risk,
    suitability,
    affordability,
    activity: locality.activity,
    growth: snapshot.growth,
    competition: snapshot.competition,
    rentIndex: locality.rentIndex,
  }
}

export function getNearbyLocalities(localityId: string, count = 3): Locality[] {
  const origin = getLocality(localityId)
  return localities
    .filter((locality) => locality.id !== localityId)
    .slice()
    .sort(
      (a, b) =>
        Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y),
    )
    .slice(0, count)
}

export function getLocalityCategoryBreakdown(localityId: string): { category: Category; count: number }[] {
  const locality = getLocality(localityId)
  return categories
    .map((category) => ({
      category,
      count: Math.max(
        4,
        Math.round(
          locality.businesses *
            (category.share / 100) *
            (0.86 + (hashString(`${category.id}:${localityId}:mix`) % 29) / 100),
        ),
      ),
    }))
    .sort((a, b) => b.count - a.count)
}

export interface CompetitorSet {
  records: CompetitorRecord[]
  nearby: number
  total: number
  density: number
  hhi: number
  concentration: 'Fragmented' | 'Moderately concentrated' | 'Concentrated'
}

export function getCompetitors(categoryId: string, localityId: string): CompetitorSet {
  const category = getCategory(categoryId)
  const locality = getLocality(localityId)
  const snapshot = getMarketSnapshot(categoryId, localityId)
  const random = seededRandom(`${categoryId}:${localityId}:competitors`)
  const pool = (brandNames[categoryId] ?? brandNames.cafes).slice()
  const records: CompetitorRecord[] = []

  for (let index = 0; index < 8; index += 1) {
    const pick = Math.floor(random() * pool.length)
    const name = pool.splice(pick, 1)[0] ?? `Local ${category.shortName} Co.`
    const positioningRoll = random()
    const share = Math.max(3.2, 12.4 - index * 0.9 + random() * 1.8)
    records.push({
      id: `${categoryId}-${localityId}-${index}`,
      name,
      locality: locality.name,
      distance: Math.round((0.3 + index * 0.42 + random() * 0.35) * 10) / 10,
      rating: Math.round((4.7 - random() * 1.0) * 10) / 10,
      reviews: Math.round(90 + random() * 2600),
      established: 2013 + Math.floor(random() * 12),
      positioning: positioningRoll > 0.64 ? 'Premium' : positioningRoll > 0.28 ? 'Mid-market' : 'Value',
      share: Math.round(share * 10) / 10,
    })
  }

  records.sort((a, b) => a.distance - b.distance)
  const hhi = Math.round(records.reduce((sum, record) => sum + record.share ** 2, 0) + 155)
  const concentration = hhi < 800 ? 'Fragmented' : hhi < 1500 ? 'Moderately concentrated' : 'Concentrated'

  return {
    records,
    nearby: snapshot.nearby,
    total: snapshot.presence,
    density: snapshot.density,
    hhi,
    concentration,
  }
}

export function calculateRisk(categoryId: string, localityId: string, inputs: RiskInputs): RiskResult {
  const category = getCategory(categoryId)
  const locality = getLocality(localityId)
  const snapshot = getMarketSnapshot(categoryId, localityId)
  const rentBenchmark = snapshot.rentBenchmark

  const rentPressure = clamp(Math.round((inputs.monthlyRent / Math.max(1, rentBenchmark)) * 48 + 8), 6, 98)
  const opexPressure = clamp(
    Math.round(24 + (inputs.monthlyOpex - 100_000) / 2600),
    8,
    96,
  )
  const coverageMonths =
    inputs.investment / Math.max(1, inputs.monthlyRent + inputs.monthlyOpex)
  const coveragePressure = clamp(Math.round(70 - coverageMonths * 4), 10, 95)
  const financialPressure = clamp(
    Math.round(rentPressure * 0.45 + opexPressure * 0.3 + coveragePressure * 0.25),
    6,
    97,
  )

  const marketRisk = clamp(
    Math.round((100 - snapshot.opportunity) * 0.78 + (snapshot.growth < 5 ? (5 - snapshot.growth) * 2 : 0) + 2),
    6,
    94,
  )

  const locationSuitability = clamp(
    Math.round(
      snapshot.opportunity * 0.5 +
        locality.footfall * 0.18 +
        clamp(snapshot.growth * 4, 0, 100) * 0.2 +
        (100 - snapshot.competition) * 0.12,
    ),
    10,
    98,
  )

  const competitionRisk = snapshot.competition
  const score = clamp(
    Math.round(
      competitionRisk * 0.32 +
        marketRisk * 0.2 +
        financialPressure * 0.28 +
        (100 - locationSuitability) * 0.2,
    ),
    4,
    96,
  )

  const band: RiskResult['band'] = score < 38 ? 'Low' : score < 55 ? 'Moderate' : score < 70 ? 'Elevated' : 'High'
  const headline: Record<RiskResult['band'], string> = {
    Low: 'The fundamentals look balanced. Protect the downside with a disciplined lease.',
    Moderate: 'Viable with discipline. Competition — not demand — is the main constraint.',
    Elevated: 'Proceed cautiously. Several risk factors stack up at this location.',
    High: 'Risk is concentrated. Reconsider the location or the scale of investment.',
  }

  const factorTone = (value: number) => (value < 40 ? 'good' : value < 65 ? 'watch' : 'risk')

  return {
    score,
    band,
    headline: headline[band],
    competitionRisk,
    marketRisk,
    financialPressure,
    locationSuitability,
    rentBenchmark,
    factors: [
      {
        key: 'competition',
        label: 'Competition intensity',
        score: competitionRisk,
        weight: 0.32,
        tone: factorTone(competitionRisk),
        detail: `${formatNumber(snapshot.nearby)} ${category.shortName.toLowerCase()} businesses sit within an estimated 2 km radius of this locality.`,
      },
      {
        key: 'market',
        label: 'Market saturation',
        score: marketRisk,
        weight: 0.2,
        tone: factorTone(marketRisk),
        detail: `Category opportunity is ${snapshot.opportunity}/100, with ${signed(snapshot.growth)} blended growth across the locality and category.`,
      },
      {
        key: 'financial',
        label: 'Financial pressure',
        score: financialPressure,
        weight: 0.28,
        tone: factorTone(financialPressure),
        detail: `Rent is ${Math.round((inputs.monthlyRent / Math.max(1, rentBenchmark)) * 100)}% of the ${formatINR(rentBenchmark)} benchmark; assumed capital covers ${coverageMonths.toFixed(1)} months of rent and operating cost.`,
      },
      {
        key: 'location',
        label: 'Location constraints',
        score: 100 - locationSuitability,
        weight: 0.2,
        tone: factorTone(100 - locationSuitability),
        detail: `Footfall index ${locality.footfall}/100 and market activity ${locality.activity}/100 shape catchment strength.`,
      },
    ],
  }
}

export function calculateFeasibility(inputs: FeasibilityInputs): FeasibilityResult {
  const totalExpenses =
    Math.max(0, inputs.monthlyRent) +
    Math.max(0, inputs.employeeExpenses) +
    Math.max(0, inputs.otherExpenses)
  const monthlyProfit = inputs.monthlyRevenue - totalExpenses
  const margin = inputs.monthlyRevenue > 0 ? (monthlyProfit / inputs.monthlyRevenue) * 100 : 0
  const breakEvenMonths =
    monthlyProfit > 0 ? Math.round((inputs.investment / monthlyProfit) * 10) / 10 : null
  const requiredRevenue = totalExpenses

  let verdict: FeasibilityResult['verdict'] = 'Not viable'
  let tone: FeasibilityResult['tone'] = 'risk'
  if (monthlyProfit <= 0) {
    verdict = 'Not viable'
    tone = 'risk'
  } else if (margin >= 20 && breakEvenMonths !== null && breakEvenMonths <= 18) {
    verdict = 'Strong'
    tone = 'good'
  } else if (margin >= 8 && breakEvenMonths !== null && breakEvenMonths <= 30) {
    verdict = 'Viable'
    tone = 'good'
  } else {
    verdict = 'Fragile'
    tone = 'watch'
  }

  const score = clamp(
    Math.round(
      34 +
        margin * 1.5 +
        (breakEvenMonths !== null ? clamp(24 - breakEvenMonths, 0, 24) : -18) +
        (inputs.monthlyRevenue > 0 ? 6 : 0),
    ),
    0,
    100,
  )

  return {
    totalExpenses,
    monthlyProfit,
    margin: Math.round(margin * 10) / 10,
    breakEvenMonths,
    requiredRevenue,
    score,
    verdict,
    tone,
    annualProfit: monthlyProfit * 12,
  }
}

export function riskPill(band: RiskResult['band'] | 'VOID') {
  if (band === 'Low') return { label: 'Low risk', className: 'bg-jade-50 text-jade-700 border-jade-200' }
  if (band === 'Moderate') return { label: 'Moderate risk', className: 'bg-gold-50 text-gold-700 border-gold-200' }
  if (band === 'Elevated') return { label: 'Elevated risk', className: 'bg-coral-50 text-coral-700 border-coral-200' }
  if (band === 'High') return { label: 'High risk', className: 'bg-coral-100 text-coral-700 border-coral-200' }
  return { label: 'Not assessed', className: 'bg-ink/5 text-ink-mute border-line' }
}

export interface MarketBrief {
  recommendation: Recommendation
  confidence: number
  summary: string
  opportunities: string[]
  risks: string[]
  competition: string[]
  financial: string[]
  nextSteps: string[]
}

export function buildMarketBrief(categoryId: string, localityId: string): MarketBrief {
  const category = getCategory(categoryId)
  const locality = getLocality(localityId)
  const snapshot = getMarketSnapshot(categoryId, localityId)
  const competitors = getCompetitors(categoryId, localityId)
  const risk = calculateRisk(categoryId, localityId, {
    investment: 1_200_000,
    monthlyRent: snapshot.rentBenchmark,
    monthlyOpex: 150_000,
  })

  const inactiveShare = Math.round((locality.inactive / locality.businesses) * 1000) / 10
  const categoriesGap = categories
    .filter((item) => item.id !== categoryId)
    .map((item) => ({
      item,
      presence: getMarketSnapshot(item.id, localityId).presence,
    }))
    .sort((a, b) => a.presence - b.presence)
    .slice(0, 2)

  let recommendation: Recommendation = 'CONDITIONAL GO'
  if (snapshot.opportunity >= 66 && risk.score < 50) recommendation = 'GO'
  else if (snapshot.opportunity < 42 || risk.score >= 66) recommendation = 'NO-GO'

  const confidence = clamp(
    Math.round(68 + snapshot.opportunity * 0.16 - risk.score * 0.12 + snapshot.growth * 0.4),
    58,
    92,
  )

  const summary = `${locality.name} holds ${formatNumber(locality.businesses)} tracked businesses and recorded ${signed(locality.growth)} year-on-year growth. For ${category.name.toLowerCase()}, we estimate ${formatNumber(snapshot.presence)} establishments in the locality, with competition intensity at ${snapshot.competition}/100. ${locality.name} ranks ${locality.activity >= 70 ? 'among the busier' : locality.activity >= 55 ? 'in the middle of' : 'below the median of'} local markets in our activity index.`

  const opportunities = [
    snapshot.opportunity >= 65
      ? `The opportunity score of ${snapshot.opportunity}/100 leaves room for a well-differentiated entrant, particularly in formats that are not yet represented locally.`
      : `At ${snapshot.opportunity}/100, opportunity is selective — a focused niche will outperform a broad, undifferentiated format.`,
    `${category.name} registrations across Hyderabad are ${category.growth >= 0 ? 'up' : 'down'} ${Math.abs(category.growth).toFixed(1)}% year on year, ${category.growth > 12 ? 'well ahead of' : 'broadly in line with'} the city's overall market pace.`,
    `Under-served adjacent categories in ${locality.name} include ${categoriesGap.map((gap) => gap.item.shortName).join(' and ')}, which can strengthen cross-visit frequency.`,
  ]

  const risks = [
    `${competitors.nearby} comparable ${category.shortName.toLowerCase()} establishments are estimated within 2 km, making positioning and service quality decisive.`,
    `About ${inactiveShare}% of tracked businesses in this locality are inactive or dormant — a useful signal of survival difficulty.`,
    `${locality.rentIndex >= 32 ? 'Rental cost is elevated' : locality.rentIndex >= 22 ? 'Rental cost is moderate' : 'Rental cost is relatively contained'}, at an estimated ${formatINR(snapshot.rentBenchmark)} per month for 1,200 sq ft.`,
    snapshot.growth < 5
      ? `Category growth of ${snapshot.growth.toFixed(1)}% is soft; treat demand expansion as a bonus rather than a base case.`
      : `Competition is expanding at ${snapshot.competition}/100 intensity; new supply can compress the demand pool quickly.`,
  ]

  const competition = [
    `Competitive structure is ${competitors.concentration.toLowerCase()} with an estimated concentration index of ${competitors.hhi}.`,
    `The locality's leading categories are ${locality.topCategories.map((id) => getCategory(id).shortName).join(', ')}.`,
    `Category density is approximately ${competitors.density} outlets per sq km within the 2 km trade area.`,
  ]

  const financial = [
    `A 1,200 sq ft unit at the ${formatINR(locality.rentIndex)}/sq ft index implies roughly ${formatINR(snapshot.rentBenchmark)} per month in rent.`,
    `Target occupancy cost below 15% of revenue → a monthly run-rate of about ${formatINR(Math.round(snapshot.rentBenchmark / 0.15))}.`,
    `The estimated risk score is ${risk.score}/100 (${risk.band.toLowerCase()}), with financial pressure at ${risk.financialPressure}/100.`,
  ]

  const nextSteps = [
    'Validate actual rents and footfall with three site visits at different times of day.',
    'Map 8–10 direct competitors in person and record price points, seating, and peak-hour occupancy.',
    'Stress-test the plan with the Financial Feasibility calculator using conservative revenue.',
  ]

  return {
    recommendation,
    confidence,
    summary,
    opportunities,
    risks,
    competition,
    financial,
    nextSteps,
  }
}

export function answerMarketQuestion(question: string, categoryId: string, localityId: string): string {
  const query = question.toLowerCase()
  const category = getCategory(categoryId)
  const locality = getLocality(localityId)
  const snapshot = getMarketSnapshot(categoryId, localityId)
  const competitors = getCompetitors(categoryId, localityId)
  const brief = buildMarketBrief(categoryId, localityId)

  if (/(saturat|crowded|competition|competitor|rival)/.test(query)) {
    return `${snapshot.competition >= 70 ? 'Competition is genuinely intense' : snapshot.competition >= 50 ? 'The market is competitive but not closed' : 'Competition is still relatively thin'} in ${locality.name} for ${category.name.toLowerCase()}.\n\n**The signal:** We estimate ${formatNumber(snapshot.presence)} ${category.shortName.toLowerCase()} businesses locally and roughly ${competitors.nearby} within a 2 km trade area. The concentration index of ${competitors.hhi} puts the market in ${competitors.concentration.toLowerCase()} territory.\n\n**What it means:** ${snapshot.competition >= 70 ? 'A me-too entrant will struggle. You need a clearly differentiated reason to exist — format, price tier, or audience.' : 'There is room for a well-positioned entrant, but generic offers will still get lost.'}\n\n**Suggested move:** Audit the ten closest competitors for pricing, rating, and peak-hour occupancy before committing to a format.`
  }

  if (/(rent|budget|cost|financ|invest|break.?even)/.test(query)) {
    return `For a 1,200 sq ft unit, the local rent index of ${formatINR(locality.rentIndex)}/sq ft implies about **${formatINR(snapshot.rentBenchmark)} per month** before fit-out and deposits.\n\n**Planning range:** Keep total occupancy cost under 15% of expected revenue. At this rent, that calls for a monthly revenue run-rate of roughly ${formatINR(Math.round(snapshot.rentBenchmark / 0.15))}.\n\n**Risk note:** Financial pressure for a default 1.2 Cr plan with rent at benchmark and ₹1.5 L monthly operating cost scores around ${calculateRisk(categoryId, localityId, { investment: 1_200_000, monthlyRent: snapshot.rentBenchmark, monthlyOpex: 150_000 }).financialPressure}/100.\n\n**Suggested move:** Use the Financial Feasibility workspace with a conservative revenue estimate and confirm the security deposit and fit-out terms before signing.`
  }

  if (/(risk|danger|worry|concern|downside|fail)/.test(query)) {
    return `${brief.recommendation === 'NO-GO' ? 'The downside case is the dominant case here.' : 'The risks are manageable if you plan for them explicitly.'}\n\n**Primary risks:**\n• ${brief.risks[0]}\n• ${brief.risks[1]}\n• ${brief.risks[2]}\n\n**Overall estimate:** ${brief.risks[3]}\n\n**Suggested move:** ${brief.nextSteps[1]}`
  }

  if (/(opportunit|gap|differenti|niche|underserved|untapped)/.test(query)) {
    return `The most defensible opening in ${locality.name} is not a generic ${category.shortName.toLowerCase()} unit.\n\n**Where room exists:** ${brief.opportunities[0]}\n\n**Adjacent demand:** ${brief.opportunities[2]}\n\n**Constraint:** ${brief.risks[0]}\n\n**Suggested move:** Position around an unmet need — convenience, experience, or a specific audience — and test pricing with 20–30 target customers before lease commitment.`
  }

  if (/(outlook|growth|trend|next|future|year|forecast)/.test(query)) {
    return `${locality.name} is running at a ${snapshot.growth.toFixed(1)}% blended growth rate for ${category.name.toLowerCase()}.\n\n**Demand context:** Locality-wide registrations are ${locality.growth >= 8 ? 'expanding firmly' : locality.growth >= 4 ? 'growing steadily' : 'growing slowly'} at ${signed(locality.growth)} year on year. ${category.name} is ${category.growth > 12 ? 'one of the faster-expanding categories' : category.growth > 6 ? 'tracking close to the city average' : 'maturing, with slower category-level expansion'} at ${signed(category.growth)}.\n\n**Read:** ${snapshot.growth >= 10 ? 'The next 12 months should expand the addressable market, but new supply will arrive too.' : 'Expect modest demand expansion; competitive share, not market growth, will drive your outcome.'}\n\n**Suggested move:** Revisit the local supply pipeline in 90 days before locking a multi-year escalation clause.`
  }

  if (/(where|locality|location|area|compare|best)/.test(query)) {
    const ranked = localities
      .map((item) => ({ locality: item, metrics: getComparisonMetrics(categoryId, item.id) }))
      .sort((a, b) => b.metrics.suitability - a.metrics.suitability)
      .slice(0, 3)
    return `For ${category.name.toLowerCase()}, the strongest locality fit in our current model is **${ranked[0].locality.name}**, with a suitability score of ${ranked[0].metrics.suitability}/100.\n\n**Shortlist:**\n${ranked.map((entry, index) => `${index + 1}. ${entry.locality.name} — suitability ${entry.metrics.suitability}/100 · risk ${entry.metrics.risk}/100 · competition ${entry.metrics.competition}/100`).join('\n')}\n\n**Trade-off:** Higher-suitability areas often carry either higher rents or lighter current supply. Run a side-by-side comparison before selecting.\n\n**Suggested move:** Add your top three to Location Comparison and pressure-test rent assumptions for each.`
  }

  return `Here is how ${locality.name} reads for ${category.name.toLowerCase()} right now.\n\n**Market:** ${formatNumber(locality.businesses)} tracked businesses, ${signed(locality.growth)} locality growth, and an activity score of ${locality.activity}/100.\n\n**Category fit:** ${formatNumber(snapshot.presence)} estimated ${category.shortName.toLowerCase()} establishments · competition ${snapshot.competition}/100 · opportunity ${snapshot.opportunity}/100.\n\n**Verdict:** ${brief.recommendation} at ${brief.confidence}% confidence. ${brief.summary.split('. ')[1] ?? ''}\n\nAsk me about saturation, rent, risks, growth, or the strongest localities for this category.`
}

export const defaultRiskInputs: RiskInputs = {
  investment: 1_200_000,
  monthlyRent: 45_000,
  monthlyOpex: 155_000,
}

export const defaultFeasibilityInputs: FeasibilityInputs = {
  investment: 1_200_000,
  monthlyRent: 45_000,
  employeeExpenses: 120_000,
  otherExpenses: 35_000,
  monthlyRevenue: 260_000,
}
