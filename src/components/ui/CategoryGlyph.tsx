import {
  Building2,
  Coffee,
  Cookie,
  Cpu,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Pill,
  Scissors,
  Shirt,
  ShoppingBasket,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoryIcon, Tint } from '../../lib/types'
import { cn } from '../../lib/utils'

const icons: Record<CategoryIcon, LucideIcon> = {
  coffee: Coffee,
  restaurant: UtensilsCrossed,
  grocery: ShoppingBasket,
  fashion: Shirt,
  wellness: HeartPulse,
  fitness: Dumbbell,
  education: GraduationCap,
  tech: Cpu,
  salon: Scissors,
  bakery: Cookie,
  pharmacy: Pill,
  realestate: Building2,
}

export const tintStyles: Record<Tint, { text: string; bg: string; border: string }> = {
  brand: { text: 'text-brand-700', bg: 'bg-brand-50', border: 'border-brand-100' },
  sea: { text: 'text-sea-700', bg: 'bg-sea-50', border: 'border-sea-100' },
  jade: { text: 'text-jade-700', bg: 'bg-jade-50', border: 'border-jade-100' },
  gold: { text: 'text-gold-700', bg: 'bg-gold-50', border: 'border-gold-100' },
  coral: { text: 'text-coral-700', bg: 'bg-coral-50', border: 'border-coral-100' },
  slate: { text: 'text-ink-soft', bg: 'bg-ink/[0.045]', border: 'border-line' },
}

export const tintHex: Record<Tint, string> = {
  brand: '#4946B4',
  sea: '#14958C',
  jade: '#1D9B6A',
  gold: '#D0922B',
  coral: '#DC6A5F',
  slate: '#7B8194',
}

interface CategoryGlyphProps {
  icon: CategoryIcon
  tint: Tint
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  clay?: boolean
}

export function CategoryGlyph({ icon, tint, size = 'md', className, clay = false }: CategoryGlyphProps) {
  const Icon = icons[icon]
  const style = tintStyles[tint]
  const sizes = {
    sm: 'h-8 w-8 rounded-[9px]',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-12 w-12 rounded-[14px]',
    xl: 'h-14 w-14 rounded-2xl',
  }
  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-[18px] w-[18px]',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center border',
        sizes[size],
        style.text,
        style.bg,
        style.border,
        clay ? 'clay-tile border-white' : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
        className,
      )}
    >
      <Icon className={iconSizes[size]} strokeWidth={1.9} />
    </span>
  )
}
