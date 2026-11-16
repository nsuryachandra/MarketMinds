
import { categories } from './categories'
import { localities } from './localities'

export const monthlyActivity = [
  { month: 'Dec', activity: 62.4, registrations: 812, closures: 284 },
  { month: 'Jan', activity: 64.1, registrations: 948, closures: 312 },
  { month: 'Feb', activity: 65.8, registrations: 1012, closures: 298 },
  { month: 'Mar', activity: 63.9, registrations: 964, closures: 336 },
  { month: 'Apr', activity: 67.2, registrations: 1088, closures: 322 },
  { month: 'May', activity: 69.8, registrations: 1156, closures: 348 },
  { month: 'Jun', activity: 68.4, registrations: 1024, closures: 362 },
  { month: 'Jul', activity: 71.2, registrations: 1218, closures: 340 },
  { month: 'Aug', activity: 72.6, registrations: 1264, closures: 376 },
  { month: 'Sep', activity: 70.9, registrations: 1180, closures: 358 },
  { month: 'Oct', activity: 73.5, registrations: 1236, closures: 384 },
  { month: 'Nov', activity: 74.2, registrations: 1284, closures: 372 },
]

export const kpiSparks = {
  tracked: [43820, 44210, 44780, 45240, 45810, 46320, 46950, 47480, 47820, 48040, 48160, 48236],
  active: [36260, 36540, 37120, 37580, 38040, 38320, 38690, 39040, 39320, 39560, 39780, 39967],
  registrations: [812, 948, 1012, 964, 1088, 1156, 1024, 1218, 1264, 1180, 1236, 1284],
  inactive: [8520, 8480, 8440, 8410, 8370, 8340, 8300, 8270, 8290, 8260, 8230, 8269],
}

export const categoryDistribution = categories
  .slice()
  .sort((a, b) => b.businesses - a.businesses)
  .map((category) => ({
    name: category.shortName,
    value: category.businesses,
    id: category.id,
  }))

export const topEmergingCategories = categories
  .slice()
  .sort((a, b) => b.growth - a.growth)
  .slice(0, 5)

export const highCompetitionAreas = localities
  .slice()
  .sort((a, b) => b.competition - a.competition)
  .slice(0, 4)

export const marketGapAreas = localities
  .slice()
  .sort((a, b) => b.opportunity - a.opportunity)
  .slice(0, 4)

export const localityActivityRanking = localities
  .slice()
  .sort((a, b) => b.activity - a.activity)
  .slice(0, 6)

export const marketPulseSummary = {
  index: 74.2,
  change: 6.4,
  direction: 'expanding' ,
  activeShare: 82.9,
  newThisMonth: 1284,
  opportunityIndex: 61,
}
