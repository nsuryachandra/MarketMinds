import type { YearPoint } from '../lib/types'

export const trendYears = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']

export const yearlyRegistrations: YearPoint[] = [
  { year: '2018', registrations: 3980, closures: 1410, growth: 0 },
  { year: '2019', registrations: 4380, closures: 1500, growth: 10.1 },
  { year: '2020', registrations: 3210, closures: 1980, growth: -26.7 },
  { year: '2021', registrations: 5310, closures: 1760, growth: 65.4 },
  { year: '2022', registrations: 6120, closures: 1890, growth: 15.3 },
  { year: '2023', registrations: 6890, closures: 2010, growth: 12.6 },
  { year: '2024', registrations: 7740, closures: 2280, growth: 12.3 },
  { year: '2025', registrations: 8620, closures: 2460, growth: 11.4 },
]

export const trendHeadline = {
  registrations2025: 8620,
  closures2025: 2460,
  netAdditions: 6160,
  yoyGrowth: 11.4,
  fiveYearCagr: 12.1,
  activeBase: 39967,
}

export const growingCategories = [
  { id: 'tech', label: 'IT & Tech Services', change: 21.4, volume: 2420 },
  { id: 'fitness', label: 'Gyms & Fitness', change: 18.6, volume: 1760 },
  { id: 'wellness', label: 'Health & Wellness', change: 16.8, volume: 2860 },
  { id: 'bakery', label: 'Bakeries & Desserts', change: 14.2, volume: 1540 },
]

export const decliningCategories = [
  { id: 'realestate', label: 'Real Estate Services', change: 2.2, volume: 1716 },
  { id: 'pharmacy', label: 'Pharmacies', change: 3.1, volume: 3120 },
  { id: 'grocery', label: 'Grocery & Retail', change: 4.8, volume: 9860 },
]

export const milestoneNotes = [
  { year: '2020', label: 'Pandemic contraction', detail: 'Registrations fell 26.7% as commercial leases reset.' },
  { year: '2021', label: 'Recovery surge', detail: 'A 65.4% rebound made it the fastest recovery year on record.' },
  { year: '2025', label: 'Eight-year high', detail: '8,620 new registrations, driven by tech and wellness.' },
]

export const yearlyTable = yearlyRegistrations.map((year, index) => {
  const previous = yearlyRegistrations[index - 1]
  const net = year.registrations - year.closures
  const closureRatio = previous
    ? Math.round((year.closures / year.registrations) * 1000) / 10
    : Math.round((year.closures / year.registrations) * 1000) / 10
  return {
    ...year,
    net,
    closureRatio,
    netChange: previous ? Math.round(((net - (previous.registrations - previous.closures)) / (previous.registrations - previous.closures)) * 1000) / 10 : 0,
  }
})
