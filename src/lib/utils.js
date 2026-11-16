import { clsx, } from 'clsx'

export function cn(...inputs) {
  return clsx(inputs)
}

const numberFormatter = new Intl.NumberFormat('en-IN')

export function formatNumber(value) {
  return numberFormatter.format(Math.round(value))
}

export function formatINR(value) {
  return `₹${formatNumber(value)}`
}

export function formatCompactINR(value) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1)} L`
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`
  return `${sign}₹${Math.round(abs)}`
}

export function formatCompact(value) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 10_00_000) return `${sign}${(abs / 1_00_000).toFixed(1)}L`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${Math.round(abs)}`
}

export function signed(value, digits = 1) {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function hashString(value) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

export function seededRandom(seed) {
  let state = hashString(seed) || 1
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export function marketCap(value) {
  return value < 10 ? value.toFixed(1) : `${Math.round(value)}`
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
