import type { ReactNode } from 'react'
import { cx, TONE_BG, TONE_HEX, TONE_TEXT, type Tone } from '../../lib/format.ts'

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('eyebrow', className)}>{children}</p>
}

interface PanelProps {
  title?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  as?: 'section' | 'div' | 'article'
  labelledBy?: string
}

/** Crisp 1px-bordered surface with an optional compact header. */
export function Panel({ title, eyebrow, actions, children, className, bodyClassName, as: Tag = 'section', labelledBy }: PanelProps) {
  return (
    <Tag className={cx('panel flex min-w-0 flex-col', className)} aria-labelledby={labelledBy}>
      {(title || eyebrow || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
            {title && (
              <h2 id={labelledBy} className="truncate text-[15px] font-semibold tracking-tight text-white">
                {title}
              </h2>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('min-w-0 flex-1', bodyClassName ?? 'p-4')}>{children}</div>
    </Tag>
  )
}

export function StatusDot({ tone = 'nv', pulse = false, className }: { tone?: Tone; pulse?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('inline-block size-2 shrink-0 rounded-full', TONE_BG[tone], pulse && 'animate-pulse-dot', className)}
    />
  )
}

const BADGE_TONE: Record<Tone, string> = {
  nv: 'border-nv/40 bg-nv/10 text-nv-bright',
  warn: 'border-warn/40 bg-warn/10 text-warn',
  crit: 'border-crit/50 bg-crit/12 text-[#ff7a7c]',
  info: 'border-info/35 bg-info/10 text-info',
  neutral: 'border-line-strong bg-white/[0.03] text-slate-300',
}

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] border px-2 py-[3px] font-mono text-[11px] font-medium uppercase leading-none tracking-[0.08em]',
        BADGE_TONE[tone],
        className,
      )}
    >
      {dot && <StatusDot tone={tone} />}
      {children}
    </span>
  )
}

/** Thin horizontal meter. `value` in 0–1. */
export function Meter({ value, tone = 'nv', className, label }: { value: number; tone?: Tone; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', TONE_BG[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Minimal inline sparkline (decorative — values are always shown as text nearby). */
export function Sparkline({ values, tone = 'nv', className, height = 28, fill = true }: { values: number[]; tone?: Tone; className?: string; height?: number; fill?: boolean }) {
  const w = 100
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 2 - ((v - min) / span) * (height - 4)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const color = TONE_HEX[tone]
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cx('w-full', className)} style={{ height }} aria-hidden="true">
      {fill && <path d={`${line} L${w},${height} L0,${height} Z`} fill={color} opacity={0.1} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

interface KpiProps {
  label: string
  value: ReactNode
  unit?: string
  delta?: string
  deltaTone?: Tone
  tone?: Tone
  icon?: ReactNode
  spark?: number[]
  footnote?: ReactNode
  className?: string
}

export function KpiCard({ label, value, unit, delta, deltaTone = 'nv', tone = 'neutral', icon, spark, footnote, className }: KpiProps) {
  return (
    <div className={cx('panel group relative flex min-w-0 flex-col gap-3 p-4 transition-colors hover:border-line-strong', className)}>
      <div className="flex items-center justify-between gap-2">
        <Eyebrow className="truncate">{label}</Eyebrow>
        {icon && <span className={cx('shrink-0', TONE_TEXT[tone === 'neutral' ? 'neutral' : tone])}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cx('num text-[28px] font-semibold leading-none', tone === 'neutral' ? 'text-white' : TONE_TEXT[tone])}>{value}</span>
        {unit && <span className="num text-sm text-slate-400">{unit}</span>}
      </div>
      {spark && <Sparkline values={spark} tone={tone === 'neutral' ? 'info' : tone} height={24} />}
      {(delta || footnote) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
          {delta && <span className={cx('num font-medium', TONE_TEXT[deltaTone])}>{delta}</span>}
          {footnote && <span className="text-slate-400">{footnote}</span>}
        </div>
      )}
    </div>
  )
}

export function Switch({ checked, onChange, label, description, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; id: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={id} id={`${id}-label`} className="block font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-slate-200">
          {label}
        </label>
        {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-nv/60 bg-nv/25' : 'border-line-strong bg-deck',
        )}
      >
        <span
          className={cx(
            'inline-block size-4 rounded-full transition-transform duration-200',
            checked ? 'translate-x-[22px] bg-nv shadow-[0_0_10px_rgb(118_185_0/0.7)]' : 'translate-x-[3px] bg-slate-500',
          )}
        />
      </button>
    </div>
  )
}

/** Circular health gauge (0–100). */
export function HealthRing({ score, tone, size = 92, label = 'Health' }: { score: number; tone: Tone; size?: number; label?: string }) {
  const r = 40
  const c = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label} score ${score} of 100`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx="50" cy="50" r={r + 7} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={TONE_HEX[tone]}
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={`${dash} ${c}`}
          className="transition-[stroke-dasharray] duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${TONE_HEX[tone]}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cx('num text-2xl font-semibold leading-none', TONE_TEXT[tone])}>{score}</span>
        <span className="eyebrow mt-1 text-[10px]">{label}</span>
      </div>
    </div>
  )
}
