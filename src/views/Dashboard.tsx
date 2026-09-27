import { Activity, ArrowRight, ArrowUpRight, Cpu, Fan, Gauge, ShieldCheck, Timer, TrendingUp, Wind, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { NavActions } from '../components/shell/Shell.tsx'
import { SupplyChainNetwork } from '../components/SupplyChainNetwork.tsx'
import { Badge, Eyebrow, HealthRing, KpiCard, Panel, Sparkline, StatusDot } from '../components/ui/primitives.tsx'
import { EVENT_POOL, FLEET_KPIS, FLEET_MIX, INITIAL_EVENTS, MACHINES, MODULE_HEALTH, type FleetEvent, type MachineCard } from '../data/fleet.ts'
import { navItem } from '../data/nav.ts'
import { cx, fmtClock, TONE_TEXT } from '../lib/format.ts'
import { prefersReducedMotion } from '../lib/useNow.ts'
import { useWorkspace } from '../lib/workspaceContext.ts'

const KPI_ICONS = [Cpu, Activity, ShieldCheck, TrendingUp, Timer, Gauge]

export function Dashboard({ navigate, openTriage }: NavActions) {
  const { ws, perms } = useWorkspace()
  const canTriage = perms.pages.has('triage')
  const health = MODULE_HEALTH.filter((h) => ws.tenant.enabledModules.includes(h.id))
  return (
    <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 sm:px-6">
      <PageHeader />

      <section aria-label="Fleet KPIs" className="grid grid-cols-2 gap-3 md:grid-cols-3 min-[1760px]:grid-cols-6">
        {FLEET_KPIS.map((k, i) => {
          const Icon = KPI_ICONS[i]
          return (
            <KpiCard
              key={k.label}
              label={k.label}
              value={k.value}
              unit={k.unit}
              delta={k.delta}
              deltaTone={k.deltaTone}
              tone={k.tone}
              footnote={k.footnote}
              spark={k.spark}
              icon={<Icon className="size-4" aria-hidden />}
              className="animate-rise"
            />
          )
        })}
      </section>

      <section aria-labelledby="machinery-title" className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_0.9fr]">
        <h2 id="machinery-title" className="sr-only">
          Critical machinery
        </h2>
        {MACHINES.map((m) => (
          <MachineTile key={m.id} m={m} onTriage={canTriage ? () => openTriage(m.preset) : undefined} />
        ))}
        <Panel eyebrow="Rest of fleet" title="145 assets nominal" className="md:col-span-2 xl:col-span-1" bodyClassName="px-4 py-2">
          <ul className="divide-y divide-line">
            {FLEET_MIX.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <StatusDot tone={a.tone} />
                <span className="num w-14 text-[13px] font-semibold text-white">{a.id}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-slate-400">{a.label}</span>
                <span className={cx('num text-[13px] font-semibold', TONE_TEXT[a.tone])}>{a.health}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => navigate('manufacturing')} className="mb-2 mt-1 flex items-center gap-1.5 text-[13px] font-medium text-nv hover:text-nv-bright">
            Machinery health in Manufacturing <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </Panel>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          eyebrow="Supply-chain control tower"
          title="Operations network"
          actions={<Badge tone="nv" dot>8 domains linked</Badge>}
          bodyClassName="p-2 sm:p-4"
        >
          <SupplyChainNetwork onOpen={navigate} />
        </Panel>
        <AlertStream onTriage={canTriage ? () => openTriage('pump_cavitation') : undefined} />
      </div>

      <Panel eyebrow="Module health" title="Factory management domains" bodyClassName="p-0">
        <ul className="grid divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4 [&>li]:border-b [&>li]:border-line">
          {health.map((h) => {
            const n = navItem(h.id)
            const Icon = n.icon
            return (
              <li key={h.id}>
                <button type="button" onClick={() => navigate(h.id)} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]">
                  <span className="grid size-9 shrink-0 place-items-center rounded border border-line bg-deck text-slate-300 group-hover:border-nv/50 group-hover:text-nv">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-white">{n.label}</span>
                    <span className="num block truncate text-[12px] text-slate-400">{h.metric}</span>
                  </span>
                  <span className={cx('flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em]', TONE_TEXT[h.tone])}>
                    <StatusDot tone={h.tone} className="size-1.5" />
                    {h.status}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}

function PageHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Eyebrow>Executive overview · Plant A</Eyebrow>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-white">Fleet health &amp; active protection</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-slate-400">
          From passive alerts to active protection — every anomaly is validated against ISO limits before NEXUS adjusts a setpoint.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone="crit" dot>1 critical</Badge>
        <Badge tone="warn">2 warnings</Badge>
        <Badge tone="nv">Gate policy v2.4</Badge>
      </div>
    </div>
  )
}

const TYPE_ICON = { pump: Wind, compressor: Fan, turbine: Zap } as const

function MachineTile({ m, onTriage }: { m: MachineCard; onTriage?: () => void }) {
  const Icon = TYPE_ICON[m.type]
  const crit = m.tone === 'crit'
  return (
    <article
      className={cx('panel brackets relative flex flex-col overflow-hidden p-4 animate-rise', crit && 'glow-crit')}
      style={{ ['--bracket' as string]: crit ? 'rgb(255 77 79 / 0.8)' : m.tone === 'warn' ? 'rgb(245 165 36 / 0.7)' : undefined }}
      aria-labelledby={`m-${m.id}`}
    >
      {crit && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-crit/80" aria-hidden />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={cx('size-4 shrink-0', TONE_TEXT[m.tone])} aria-hidden />
            <h3 id={`m-${m.id}`} className="num whitespace-nowrap text-lg font-semibold text-white">
              {m.id}
            </h3>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-slate-400">
            {m.name} · {m.location}
          </p>
          <Badge tone={m.tone} className="mt-2">{m.status}</Badge>
        </div>
        <HealthRing score={m.health} tone={m.tone} size={72} />
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[12px] text-slate-400">
          <span className="eyebrow text-[10px]">Vibration trend · 6 h</span>
          <span>
            <span className={cx('num text-[15px] font-semibold', TONE_TEXT[m.tone])}>{m.vibration}</span> <span className="num">{m.vibrationUnit}</span>
          </span>
        </div>
        <Sparkline values={m.trend} tone={m.tone} height={40} className="mt-1.5" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[12px] text-slate-400">
          RUL <span className="num font-semibold text-slate-100">{m.rul}</span>
        </span>
        {onTriage ? <button
          type="button"
          onClick={onTriage}
          className={cx(
            'flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors',
            crit ? 'bg-crit/15 text-[#ff8a8c] ring-1 ring-crit/50 hover:bg-crit/25' : 'text-nv ring-1 ring-nv/40 hover:bg-nv/10',
          )}
          aria-label={`Open ${m.id} in Autonomous Triage`}
        >
          {crit ? 'Triage now' : 'Open triage'} <ArrowUpRight className="size-3.5" aria-hidden />
        </button> : <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-500">Triage preview · enable Manufacturing</span>}
      </div>
    </article>
  )
}

function AlertStream({ onTriage }: { onTriage?: () => void }) {
  const [events, setEvents] = useState<FleetEvent[]>(INITIAL_EVENTS)
  const cursor = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = setInterval(() => {
      const next = EVENT_POOL[cursor.current % EVENT_POOL.length]
      cursor.current += 1
      setEvents((ev) => [{ ...next, id: `live-${cursor.current}`, time: fmtClock(new Date()) }, ...ev].slice(0, 7))
    }, 7000)
    return () => clearInterval(id)
  }, [])

  return (
    <Panel eyebrow="Live alert stream" title="Events & interventions" actions={<Badge tone="nv" dot>Live</Badge>} bodyClassName="p-0">
      <ol className="divide-y divide-line" aria-live="polite" aria-relevant="additions">
        {events.map((e) => (
          <li key={e.id} className="flex animate-rise gap-3 px-4 py-3">
            <span className={cx('mt-1.5 h-8 w-[2px] shrink-0 rounded-full', e.tone === 'crit' ? 'bg-crit' : e.tone === 'warn' ? 'bg-warn' : e.tone === 'info' ? 'bg-info' : 'bg-nv')} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="num text-[12px] text-slate-500">{e.time}</span>
                <span className={cx('num text-[12px] font-semibold', TONE_TEXT[e.tone])}>{e.asset}</span>
              </div>
              <p className="mt-0.5 truncate text-[14px] font-medium text-white">{e.title}</p>
              <p className="truncate text-[12.5px] text-slate-400">{e.detail}</p>
            </div>
            {onTriage && e.asset === 'P-204' && e.tone === 'crit' && (
              <button type="button" onClick={onTriage} className="self-center rounded-[3px] px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ff8a8c] ring-1 ring-crit/50 hover:bg-crit/15">
                Triage
              </button>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  )
}
