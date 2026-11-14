import type { Insight } from '../lib/types'

export const insights: Insight[] = [
  {
    id: 'kokapet-retail',
    type: 'opportunity',
    title: 'Kokapet is under-served for everyday retail',
    detail:
      'Only 12 organised grocery outlets per 10,000 residents, compared with a city median of 27. New residential towers are adding demand faster than supply.',
    tag: 'Kokapet · Grocery',
    time: '2h ago',
    metric: '88 opportunity',
    to: '/market-explorer',
  },
  {
    id: 'banjara-cafes',
    type: 'risk',
    title: 'Café density in Banjara Hills is approaching saturation',
    detail:
      'Café registrations grew 12.1% while footfall rose just 2.8%. Three new premium openings within 2 km are chasing the same evening audience.',
    tag: 'Banjara Hills · Cafés',
    time: '5h ago',
    metric: '69 competition',
    to: '/competitor-intelligence',
  },
  {
    id: 'wellness-growth',
    type: 'trend',
    title: 'Health & Wellness is the city’s quiet compounding story',
    detail:
      'The category is up 16.8% year on year and 98% since 2018. Western residential corridors account for 41% of new registrations.',
    tag: 'City-wide · Wellness',
    time: 'Yesterday',
    metric: '+16.8% YoY',
    to: '/market-trends',
  },
  {
    id: 'ameerpet-rent',
    type: 'financial',
    title: 'Ameerpet rent index cooled for a second straight quarter',
    detail:
      'Asking rents softened 4.2% from their Q1 peak. Competition remains the constraint, not occupancy cost.',
    tag: 'Ameerpet · Rental',
    time: 'Yesterday',
    metric: '−4.2% rent',
    to: '/location-comparison',
  },
  {
    id: 'uppal-east',
    type: 'opportunity',
    title: 'Competition is easing along the Uppal corridor',
    detail:
      'Six low-performing outlets exited in the last quarter while new household formation stayed positive. Modest rents improve the downside case.',
    tag: 'Uppal · Retail',
    time: '2d ago',
    metric: '49 opportunity',
    to: '/market-explorer',
  },
]
