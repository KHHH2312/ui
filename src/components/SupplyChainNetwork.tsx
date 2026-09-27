import { useState } from 'react'
import { MODULE_HEALTH } from '../data/fleet.ts'
import { navItem, type ModuleId, type ViewId } from '../data/nav.ts'
import { cx, TONE_HEX, TONE_TEXT } from '../lib/format.ts'
import { StatusDot } from './ui/primitives.tsx'

/** Material-flow order around the ring; IT is the data backbone at the hub. */
const FLOW: ModuleId[] = ['procurement', 'inventory', 'manufacturing', 'warehousing', 'distribution', 'transportation', 'crm']

const W = 800
const H = 430
const CX = 400
const CY = 215
const RX = 300
const RY = 158

const nodes = FLOW.map((id, i) => {
  const a = ((i * 360) / FLOW.length - 90) * (Math.PI / 180)
  return { id, x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) }
})

const health = (id: ModuleId) => MODULE_HEALTH.find((h) => h.id === id)!

export function SupplyChainNetwork({ onOpen }: { onOpen: (v: ViewId) => void }) {
  const [hover, setHover] = useState<ModuleId | null>(null)
  const focus = hover ? health(hover) : null

  return (
    <>
      {/* Diagram (tablet/desktop) */}
      <div className="relative hidden w-full sm:block" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <radialGradient id="hubGlow">
              <stop offset="0%" stopColor="#76b900" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#76b900" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={CX} cy={CY} rx={RX + 34} ry={RY + 26} fill="none" stroke="#1e293b" strokeDasharray="2 6" />
          <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#1e293b" strokeWidth="6" />
          <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#76b900" strokeOpacity="0.75" strokeWidth="1.5" strokeDasharray="6 6" className="animate-dash" />
          {nodes.map((n) => {
            const active = hover === n.id
            const tone = health(n.id).tone
            return (
              <line
                key={n.id}
                x1={CX}
                y1={CY}
                x2={n.x}
                y2={n.y}
                stroke={active ? TONE_HEX[tone] : '#334155'}
                strokeOpacity={active ? 0.95 : 0.55}
                strokeWidth={active ? 1.6 : 1}
                strokeDasharray="3 5"
                className={active ? 'animate-dash' : undefined}
              />
            )
          })}
          <circle cx={CX} cy={CY} r={96} fill="url(#hubGlow)" />
          <g className="animate-spin-slow" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <circle cx={CX} cy={CY} r={70} fill="none" stroke="#76b900" strokeOpacity="0.5" strokeDasharray="1 7" strokeWidth="2" />
          </g>
          <g className="animate-spin-rev" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <circle cx={CX} cy={CY} r={80} fill="none" stroke="#2b3a52" strokeDasharray="40 14" />
          </g>
          <text x={CX} y={CY - RY - 22} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono Variable, monospace" letterSpacing="2">
            MATERIAL FLOW →
          </text>
        </svg>

        <button
          type="button"
          onClick={() => onOpen('it')}
          onPointerEnter={() => setHover('it')}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover('it')}
          onBlur={() => setHover(null)}
          className="absolute flex w-[21%] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-full py-3 text-center"
          style={{ left: '50%', top: '50%' }}
          aria-label="Open Information Technology module — data platform hub"
        >
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-nv">NEXUS core</span>
          <span className="mt-1 text-[13px] font-medium leading-tight text-white">Information Technology</span>
          <span className="mt-0.5 text-[11px] text-slate-400">OT/IT data backbone</span>
        </button>

        {nodes.map((n) => {
          const item = navItem(n.id)
          const h = health(n.id)
          const Icon = item.icon
          const active = hover === n.id
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onOpen(n.id)}
              onPointerEnter={() => setHover(n.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(n.id)}
              onBlur={() => setHover(null)}
              className={cx(
                'absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-[5px] border bg-deck/95 px-2.5 py-2 text-left transition-[border-color,box-shadow,transform] duration-200',
                active ? 'z-10 scale-[1.04] border-nv/70 shadow-[0_0_24px_-6px_rgb(118_185_0/0.7)]' : 'border-line-strong hover:border-slate-500',
              )}
              style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }}
              aria-label={`Open ${item.label} module — ${h.status}, ${h.metric}`}
            >
              <span className={cx('grid size-7 shrink-0 place-items-center rounded-[3px] border', active ? 'border-nv/60 text-nv' : 'border-line text-slate-300')}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-[12.5px] font-medium leading-tight text-white">{item.label.replace(' / CRM', '')}</span>
                <span className={cx('num mt-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] leading-tight', TONE_TEXT[h.tone])}>
                  <StatusDot tone={h.tone} className="size-1.5" /> {h.metric}
                </span>
              </span>
              {n.id === 'manufacturing' && (
                <span className="absolute -right-2 -top-2 rounded-[3px] bg-crit px-1 font-mono text-[9px] font-bold leading-4 text-white shadow-[0_0_10px_rgb(255_77_79/0.7)]">P-204</span>
              )}
            </button>
          )
        })}

        <div className="pointer-events-none absolute bottom-1 left-1 min-h-[42px] max-w-[46%]" aria-live="polite">
          {focus ? (
            <div className="animate-fade">
              <p className="eyebrow text-[10px]">{navItem(focus.id).label}</p>
              <p className="mt-1 text-[12.5px] text-slate-300">
                {navItem(focus.id).hint} · <span className={TONE_TEXT[focus.tone]}>{focus.status}</span>
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-slate-500">Hover a domain to inspect · click to open</p>
          )}
        </div>
      </div>

      {/* Compact fallback (mobile) */}
      <ul className="grid grid-cols-2 gap-2 sm:hidden">
        {[...FLOW, 'it' as const].map((id) => {
          const item = navItem(id)
          const h = health(id)
          const Icon = item.icon
          return (
            <li key={id}>
              <button type="button" onClick={() => onOpen(id)} className="flex w-full items-center gap-2 rounded border border-line bg-deck px-2.5 py-2 text-left">
                <Icon className="size-4 text-slate-300" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px] text-white">{item.label.replace(' / CRM', '')}</span>
                <StatusDot tone={h.tone} className="size-1.5" />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
