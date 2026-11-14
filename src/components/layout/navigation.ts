import {
  Calculator,
  Compass,
  GitCompareArrows,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  badge?: string
  description: string
}

export const navigation: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      {
        label: 'Overview',
        to: '/dashboard',
        icon: LayoutDashboard,
        description: 'Market pulse, activity, and recent insights',
      },
      {
        label: 'Market Explorer',
        to: '/market-explorer',
        icon: Compass,
        description: 'Explore localities, density, and opportunity',
      },
      {
        label: 'Competitor Intelligence',
        to: '/competitor-intelligence',
        icon: UsersRound,
        description: 'Nearby players, concentration, and positioning',
      },
      {
        label: 'Market Trends',
        to: '/market-trends',
        icon: TrendingUp,
        description: 'Registration history and category momentum',
      },
    ],
  },
  {
    title: 'Decision tools',
    items: [
      {
        label: 'Risk Analysis',
        to: '/risk-analysis',
        icon: ShieldAlert,
        description: 'Assess location and financial risk',
      },
      {
        label: 'Location Comparison',
        to: '/location-comparison',
        icon: GitCompareArrows,
        description: 'Compare localities side by side',
      },
      {
        label: 'Financial Feasibility',
        to: '/financial-feasibility',
        icon: Calculator,
        description: 'Test margins and break-even',
      },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        label: 'AI Market Assistant',
        to: '/market-assistant',
        icon: Sparkles,
        badge: 'BETA',
        description: 'Synthesised briefs and market Q&A',
      },
    ],
  },
]

export const allNavItems = navigation.flatMap((group) => group.items)
