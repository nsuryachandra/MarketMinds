export type CategoryIcon =
  | 'coffee'
  | 'restaurant'
  | 'grocery'
  | 'fashion'
  | 'wellness'
  | 'fitness'
  | 'education'
  | 'tech'
  | 'salon'
  | 'bakery'
  | 'pharmacy'
  | 'realestate'

export type Tint = 'brand' | 'sea' | 'jade' | 'gold' | 'coral' | 'slate'

export interface Category {
  id: string
  name: string
  shortName: string
  icon: CategoryIcon
  tint: Tint
  businesses: number
  growth: number
  avgRisk: number
  share: number
  trend: number[]
  keywords: string[]
  blurb: string
}

export interface Locality {
  id: string
  name: string
  zone: string
  x: number
  y: number
  businesses: number
  active: number
  newRegs: number
  inactive: number
  growth: number
  competition: number
  opportunity: number
  rentIndex: number
  footfall: number
  activity: number
  density: number
  topCategories: string[]
  note: string
}

export interface MonthlyPoint {
  month: string
  activity: number
  registrations: number
  closures: number
}

export interface YearPoint {
  year: string
  registrations: number
  closures: number
  growth: number
}

export interface Insight {
  id: string
  type: 'opportunity' | 'risk' | 'trend' | 'financial'
  title: string
  detail: string
  tag: string
  time: string
  metric: string
  to: string
}

export interface CompetitorRecord {
  id: string
  name: string
  locality: string
  distance: number
  rating: number
  reviews: number
  established: number
  positioning: 'Premium' | 'Mid-market' | 'Value'
  share: number
}

export interface RiskInputs {
  investment: number
  monthlyRent: number
  monthlyOpex: number
}

export interface RiskFactor {
  key: string
  label: string
  score: number
  weight: number
  tone: 'good' | 'watch' | 'risk'
  detail: string
}

export interface RiskResult {
  score: number
  band: 'Low' | 'Moderate' | 'Elevated' | 'High'
  headline: string
  factors: RiskFactor[]
  financialPressure: number
  locationSuitability: number
  competitionRisk: number
  marketRisk: number
  rentBenchmark: number
}

export interface FeasibilityInputs {
  investment: number
  monthlyRent: number
  employeeExpenses: number
  otherExpenses: number
  monthlyRevenue: number
}

export interface FeasibilityResult {
  totalExpenses: number
  monthlyProfit: number
  margin: number
  breakEvenMonths: number | null
  requiredRevenue: number
  score: number
  verdict: 'Strong' | 'Viable' | 'Fragile' | 'Not viable'
  tone: 'good' | 'watch' | 'risk'
  annualProfit: number
}

export type Recommendation = 'GO' | 'CONDITIONAL GO' | 'NO-GO'
