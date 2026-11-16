import { useId } from 'react'
import { cn } from '../../lib/utils'

const palette = {
  brand: '#4946B4',
  sea: '#14958C',
  jade: '#1D9B6A',
  gold: '#D0922B',
  coral: '#DC6A5F',
  slate: '#7B8194',
}










export function Sparkline({
  data,
  tone = 'brand',
  className,
  strokeWidth = 1.8,
  area = true,
  showDot = true,
}) {
  const gradientId = useId().replace(/:/g, '')
  const width = 100
  const height = 34
  const padding = 3
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((value, index) => {
    const x = padding + (index / Math.max(1, data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return [x, y] 
  })
  const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = `${path} L${points[points.length - 1][0].toFixed(2)},${height} L${points[0][0].toFixed(2)},${height} Z`
  const last = points[points.length - 1]
  const color = palette[tone]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('overflow-visible', className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <>
          <circle cx={last[0]} cy={last[1]} r="4" fill={color} opacity="0.14" />
          <circle cx={last[0]} cy={last[1]} r="1.8" fill={color} stroke="white" strokeWidth="1.2" />
        </>
      )}
    </svg>
  )
}
