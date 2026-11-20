import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

/**
 * AnimatedNumber - OG physics-based count-up component.
 * Uses hardware-accelerated spring interpolation directly updating DOM text
 * for 60/120fps buttery-smooth counter ticks without re-rendering cycles.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) {
  const numericValue = typeof value === 'number'
    ? value
    : parseFloat(String(value ?? 0).replace(/[^0-9.-]+/g, '')) || 0

  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, {
    stiffness: 85,
    damping: 22,
    mass: 0.6,
  })

  const spanRef = useRef(null)

  useEffect(() => {
    motionVal.set(numericValue)
  }, [numericValue, motionVal])

  useEffect(() => {
    const unsubscribe = springVal.on('change', (latest) => {
      if (spanRef.current) {
        let formatted = ''
        if (decimals > 0) {
          formatted = latest.toFixed(decimals)
        } else {
          formatted = Math.round(latest).toLocaleString('en-IN')
        }
        spanRef.current.textContent = `${prefix}${formatted}${suffix}`
      }
    })
    return () => unsubscribe()
  }, [springVal, decimals, prefix, suffix])

  const initialFormatted = decimals > 0
    ? Number(numericValue).toFixed(decimals)
    : Math.round(numericValue).toLocaleString('en-IN')

  return (
    <span ref={spanRef} className={className}>
      {prefix}{initialFormatted}{suffix}
    </span>
  )
}
