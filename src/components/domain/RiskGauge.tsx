import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { RiskResult } from '../../lib/types'

const bandColors: Record<RiskResult['band'], { main: string; soft: string }> = {
  Low: { main: '#1D9B6A', soft: '#A8E3C6' },
  Moderate: { main: '#D0922B', soft: '#F0D49C' },
  Elevated: { main: '#DC6A5F', soft: '#F3B4AC' },
  High: { main: '#B4433B', soft: '#EFA39B' },
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, radius, startAngle)
  const end = polar(cx, cy, radius, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

interface RiskGaugeProps {
  result: Pick<RiskResult, 'score' | 'band'>
  size?: number
  className?: string
  subtitle?: string
}

export function RiskGauge({ result, size = 236, className, subtitle }: RiskGaugeProps) {
  const cx = 130
  const cy = 122
  const radius = 92
  const startAngle = 225
  const totalSweep = 270
  const valueSweep = totalSweep * (result.score / 100)
  const colors = bandColors[result.band]
  const ticks = Array.from({ length: 28 }, (_, index) => {
    const angle = startAngle + (totalSweep / 27) * index
    const outer = polar(cx, cy, radius + 18, angle)
    const inner = polar(cx, cy, radius + (index % 7 === 0 ? 11 : 14), angle)
    const active = index / 27 <= result.score / 100
    return { outer, inner, active, index }
  })

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg viewBox="0 0 260 250" width={size} height={size * 0.96} aria-hidden="true">
        <defs>
          <linearGradient id="risk-value-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.soft} />
            <stop offset="55%" stopColor={colors.main} />
            <stop offset="100%" stopColor={colors.main} />
          </linearGradient>
          <filter id="risk-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {ticks.map((tick) => (
          <line
            key={tick.index}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke={tick.active ? colors.main : '#E3DCCE'}
            strokeWidth={tick.index % 7 === 0 ? 2 : 1.4}
            strokeLinecap="round"
            opacity={tick.active ? 0.55 : 0.9}
          />
        ))}

        <path
          d={arcPath(cx, cy, radius, startAngle, startAngle + totalSweep)}
          fill="none"
          stroke="#EAE4D8"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <path
          d={arcPath(cx, cy, radius, startAngle, startAngle + totalSweep)}
          fill="none"
          stroke="rgba(255,255,255,0.72)"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <motion.path
          key={`${result.band}-${Math.round(result.score)}`}
          d={arcPath(cx, cy, radius, startAngle, startAngle + Math.max(1.2, valueSweep))}
          fill="none"
          stroke="url(#risk-value-gradient)"
          strokeWidth="17"
          strokeLinecap="round"
          filter="url(#risk-glow)"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />

        <text x="18" y="218" fill="#9AA0B1" fontSize="10" fontWeight="700" letterSpacing="0.08em">
          0
        </text>
        <text x="224" y="218" fill="#9AA0B1" fontSize="10" fontWeight="700" letterSpacing="0.08em">
          100
        </text>

        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fill="#1B1F2F"
          fontSize="56"
          fontWeight="800"
          style={{ fontFamily: 'Manrope Variable, sans-serif', letterSpacing: '-0.05em' }}
        >
          {Math.round(result.score)}
        </text>
        <text
          x={cx}
          y={cy + 34}
          textAnchor="middle"
          fill="#9AA0B1"
          fontSize="11"
          fontWeight="600"
          letterSpacing="0.08em"
        >
          RISK SCORE / 100
        </text>
      </svg>

      <div className="-mt-3 flex flex-col items-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-bold"
          style={{
            backgroundColor: `${colors.main}12`,
            borderColor: `${colors.main}33`,
            color: colors.main,
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.main }} />
          {result.band} risk
        </span>
        {subtitle && <p className="mt-2 text-center text-[11px] font-medium text-ink-faint">{subtitle}</p>}
      </div>
    </div>
  )
}
