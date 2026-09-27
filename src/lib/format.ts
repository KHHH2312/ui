export type Tone = 'nv' | 'warn' | 'crit' | 'info' | 'neutral'

const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })
const usdFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const int = new Intl.NumberFormat('en-US')

export const fmtUsd = (v: number, compact = true) => (compact ? usdCompact : usdFull).format(v)
export const fmtInt = (v: number) => int.format(Math.round(v))
export const fmtPct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`
export const fmtNum = (v: number, digits = 1) => v.toFixed(digits)

export function fmtClock(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

export const TONE_TEXT: Record<Tone, string> = {
  nv: 'text-nv',
  warn: 'text-warn',
  crit: 'text-crit',
  info: 'text-info',
  neutral: 'text-slate-300',
}

export const TONE_BG: Record<Tone, string> = {
  nv: 'bg-nv',
  warn: 'bg-warn',
  crit: 'bg-crit',
  info: 'bg-info',
  neutral: 'bg-slate-400',
}

export const TONE_HEX: Record<Tone, string> = {
  nv: '#76b900',
  warn: '#f5a524',
  crit: '#ff4d4f',
  info: '#5cc8ff',
  neutral: '#94a3b8',
}

export const severityTone = (s: 'low' | 'medium' | 'critical'): Tone => (s === 'critical' ? 'crit' : s === 'medium' ? 'warn' : 'info')

export const healthTone = (score: number): Tone => (score >= 80 ? 'nv' : score >= 60 ? 'warn' : 'crit')

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
