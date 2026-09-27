import { Check, CircleCheck, Clock, MapPin, Package, PackagePlus, ShieldCheck, TriangleAlert, Truck } from 'lucide-react'
import { useState } from 'react'
import { ConnectorMonitor, CitedAssistant } from '../components/workspace/Assistant.tsx'
import { Badge, Eyebrow, KpiCard, Panel, StatusDot } from '../components/ui/primitives.tsx'
import type { Shipment, ShipmentStatus } from '../data/logistics.ts'
import { MODULES } from '../data/modules.ts'
import { can, scopeOf } from '../lib/access.ts'
import { cx, type Tone } from '../lib/format.ts'
import { useNotify } from '../lib/toast.ts'
import { useWorkspace } from '../lib/workspaceContext.ts'

const STATUS_TONE: Record<ShipmentStatus, Tone> = { Scheduled: 'neutral', Loading: 'info', 'In transit': 'info', Arrived: 'nv', Delivered: 'nv', Delayed: 'warn' }
const NEXT: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
  Scheduled: ['Loading', 'In transit'],
  Loading: ['In transit'],
  'In transit': ['Arrived', 'Delayed'],
  Delayed: ['In transit', 'Arrived'],
  Arrived: ['Delivered'],
}

function useShipments() {
  const { ws, update, log, perms, actingUserId } = useWorkspace()
  const notify = useNotify()
  const setStatus = (sh: Shipment, status: ShipmentStatus) => {
    if (!can(perms, 'transportation', 'update_status')) return
    update((w) => ({ ...w, shipments: w.shipments.map((x) => (x.id === sh.id ? { ...x, status } : x)) }))
    log('Shipment status updated', `${sh.id} → ${status} by ${actingUserId}`, status === 'Delayed' ? 'warn' : 'nv')
    notify(`${sh.id} marked ${status}`, status === 'Delayed' ? 'warn' : 'nv')
  }
  const eta = ws.gold.find((g) => g.name === 'gold.shipments_eta')
  return { setStatus, staleEta: !!eta?.stale, etaAsOf: eta?.asOf ?? '—' }
}

function EtaCell({ sh, stale }: { sh: Shipment; stale: boolean }) {
  return (
    <span className="num inline-flex items-center gap-1.5">
      {sh.eta}
      {stale && sh.status !== 'Delivered' && <Badge tone="warn">stale</Badge>}
    </span>
  )
}

export function TransportationView() {
  const { perms } = useWorkspace()
  return scopeOf(perms, 'transportation') === 'assigned' ? <DriverView /> : <DispatchView />
}

function StaleBanner({ asOf }: { asOf: string }) {
  const { ws } = useWorkspace()
  const tms = ws.connectors.find((c) => c.id === 'tms')
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-[5px] border border-warn/60 bg-warn/[0.09] px-4 py-2.5">
      <TriangleAlert className="size-4 shrink-0 text-warn" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px] text-slate-100">
        <span className="font-mono text-[12px] font-bold text-warn">STALE ETAs · </span>
        TMS refresh failed at {tms?.lastRun.at ?? '—'}. Showing last successful snapshot from {asOf} — not current. Confirm times with dispatch.
      </p>
    </div>
  )
}

function DriverView() {
  const { ws, me, actingUserId, perms } = useWorkspace()
  const { setStatus, staleEta, etaAsOf } = useShipments()
  const mine = ws.shipments.filter((s) => s.driverId === actingUserId).sort((a, b) => a.stopOrder - b.stopOrder)
  const [tasks, setTasks] = useState<Record<string, boolean>>({ inspect: true })
  const TASKS = [
    { id: 'inspect', label: 'Pre-trip vehicle inspection (TRK-14)' },
    { id: 'seals', label: 'Verify seal numbers on ADR load' },
    { id: 'docs', label: 'Carry wash-out certificate for Atlas Foods' },
    { id: 'fuel', label: 'Log fuel & odometer at end of shift' },
  ]
  const canUpdate = can(perms, 'transportation', 'update_status')

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Transportation · Driver workspace</Eyebrow>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-white">Today's route · {me.name}</h1>
          <p className="mt-1 text-[14px] text-slate-400">
            {mine[0]?.vehicle ?? 'No vehicle'} · shift 06:00–16:00 · {mine.filter((s) => s.status !== 'Delivered').length} open stops
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">Scope: assigned deliveries only</Badge>
          <Badge tone="nv" dot>
            Can update status
          </Badge>
        </div>
      </header>

      {staleEta && <StaleBanner asOf={etaAsOf} />}

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <div className="space-y-4">
          <Panel eyebrow="Assigned deliveries" title={`${mine.length} stops`} bodyClassName="p-0">
            {mine.length === 0 ? (
              <p className="p-5 text-[13.5px] text-slate-400">No deliveries are assigned to you right now.</p>
            ) : (
              <ol className="divide-y divide-line">
                {mine.map((sh) => (
                  <li key={sh.id} className={cx('p-4', sh.status === 'In transit' && 'bg-nv/[0.04]')}>
                    <div className="flex items-start gap-3">
                      <span className={cx('num grid size-8 shrink-0 place-items-center rounded-[4px] border text-[13px] font-bold', sh.status === 'Delivered' ? 'border-nv/50 bg-nv/15 text-nv' : 'border-line-strong text-white')}>
                        {sh.status === 'Delivered' ? <Check className="size-4" aria-hidden /> : sh.stopOrder}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-semibold text-white">{sh.customer}</p>
                          <Badge tone={STATUS_TONE[sh.status]}>{sh.status}</Badge>
                          <span className="num text-[11.5px] text-slate-500">{sh.id}</span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-300">
                          <MapPin className="size-3.5 text-slate-500" aria-hidden /> {sh.destination} · {sh.address}
                        </p>
                        <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" aria-hidden /> window {sh.window}
                          </span>
                          <span>
                            ETA <EtaCell sh={sh} stale={staleEta} />
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="size-3.5" aria-hidden /> {sh.pallets} plt · {(sh.weightKg / 1000).toFixed(1)} t
                          </span>
                        </div>
                        <p className="mt-2 rounded-[3px] border border-line bg-deck/70 px-2.5 py-1.5 text-[12.5px] text-slate-200">{sh.handling}</p>
                        {canUpdate && NEXT[sh.status] && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {NEXT[sh.status]!.map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setStatus(sh, st)}
                                className={cx(
                                  'rounded-[4px] px-3 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.08em] ring-1',
                                  st === 'Delayed' ? 'text-warn ring-warn/50 hover:bg-warn/10' : 'text-nv ring-nv/50 hover:bg-nv/10',
                                )}
                              >
                                Mark {st}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel eyebrow="Shift tasks" title={`${Object.values(tasks).filter(Boolean).length}/${TASKS.length} done`}>
            <ul className="space-y-2">
              {TASKS.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-[4px] border border-line bg-deck/50 px-3 py-2.5 text-[13.5px] text-slate-200 hover:border-line-strong">
                    <input type="checkbox" checked={!!tasks[t.id]} onChange={(e) => setTasks((x) => ({ ...x, [t.id]: e.target.checked }))} className="size-4 accent-[#76b900]" />
                    <span className={cx(tasks[t.id] && 'text-slate-500 line-through')}>{t.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <CitedAssistant module="transportation" title="AI shift briefing" />
          <div className="flex items-start gap-3 rounded-[5px] border border-line bg-panel/60 px-4 py-3 text-[12.5px] text-slate-400">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-nv" aria-hidden />
            Your navigation shows Transportation only. CRM, Procurement, company settings and other companies' data are outside your grants — the backend rejects them with HTTP 403.
          </div>
        </div>
      </div>
    </div>
  )
}

function DispatchView() {
  const { ws, perms, update, log } = useWorkspace()
  const { setStatus, staleEta, etaAsOf } = useShipments()
  const notify = useNotify()
  const manage = can(perms, 'transportation', 'manage')
  const canUpdate = can(perms, 'transportation', 'update_status')
  const drivers = ws.members.filter((m) => m.roles.includes('truck_driver'))
  const tms = ws.connectors.find((c) => c.id === 'tms')!
  const eta = ws.gold.find((g) => g.name === 'gold.shipments_eta')
  const cfg = MODULES.transportation

  const assign = (sh: Shipment, driverId: string) => {
    const d = drivers.find((x) => x.userId === driverId)
    update((w) => ({ ...w, shipments: w.shipments.map((x) => (x.id === sh.id ? { ...x, driverId: d?.userId ?? null, driverName: d?.name ?? 'Unassigned' } : x)) }))
    log('Shipment reassigned', `${sh.id} → ${d?.name ?? 'Unassigned'}`)
    notify(`${sh.id} assigned to ${d?.name ?? 'nobody'}`, 'info')
  }

  return (
    <div className="mx-auto max-w-[1680px] space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Transportation · Dispatch</Eyebrow>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-white">Shipments & drivers</h1>
          <p className="mt-1 text-[14px] text-slate-400">All shipments in {ws.tenant.name}. Drivers only ever see the stops assigned to them.</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="info">Scope: all shipments</Badge>
          <Badge tone={manage ? 'nv' : 'neutral'}>{manage ? 'Manage' : 'View only'}</Badge>
        </div>
      </header>
      {staleEta && <StaleBanner asOf={etaAsOf} />}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cfg.kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} unit={k.unit} delta={k.delta} deltaTone={k.deltaTone} tone={k.tone ?? 'neutral'} />
        ))}
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel eyebrow="Gold · gold.shipments_eta" title="Shipment board" bodyClassName="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line">
                {['Shipment', 'Customer / lane', 'Driver', 'ETA', 'Status'].map((h) => (
                  <th key={h} scope="col" className="eyebrow px-3 py-2.5 text-[10px] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.shipments.map((sh) => (
                <tr key={sh.id} className="border-b border-line/60 last:border-0">
                  <td className="num px-3 py-2.5 text-slate-200">{sh.id}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-white">{sh.customer}</p>
                    <p className="text-[11.5px] text-slate-500">
                      {sh.origin} → {sh.destination}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    {manage ? (
                      <select
                        aria-label={`Driver for ${sh.id}`}
                        value={sh.driverId ?? ''}
                        onChange={(e) => assign(sh, e.target.value)}
                        className="rounded-[3px] border border-line-strong bg-deck px-2 py-1 text-[12px] text-slate-200"
                      >
                        <option value="">Unassigned</option>
                        {drivers.map((d) => (
                          <option key={d.userId} value={d.userId}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-300">{sh.driverName}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">
                    <EtaCell sh={sh} stale={staleEta} />
                  </td>
                  <td className="px-3 py-2.5">
                    {canUpdate ? (
                      <select
                        aria-label={`Status for ${sh.id}`}
                        value={sh.status}
                        onChange={(e) => setStatus(sh, e.target.value as ShipmentStatus)}
                        className="rounded-[3px] border border-line-strong bg-deck px-2 py-1 text-[12px] text-slate-200"
                      >
                        {(Object.keys(STATUS_TONE) as ShipmentStatus[]).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge tone={STATUS_TONE[sh.status]}>{sh.status}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="space-y-4">
          <ConnectorMonitor connector={tms} dataset={eta} />
          <CitedAssistant module="transportation" title="AI dispatch rundown" />
        </div>
      </div>
    </div>
  )
}

export function InventoryView() {
  const { ws, perms, log } = useWorkspace()
  const notify = useNotify()
  const manage = can(perms, 'inventory', 'manage')
  const cfg = MODULES.inventory
  const wms = ws.connectors.find((c) => c.id === 'wms')!
  const gold = ws.gold.find((g) => g.name === 'gold.inventory_positions')
  const [ordered, setOrdered] = useState<Record<string, boolean>>({})

  return (
    <div className="mx-auto max-w-[1680px] space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Supply chain · Materials</Eyebrow>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-white">Inventory</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-slate-400">{cfg.description}</p>
        </div>
        <Badge tone={manage ? 'nv' : 'neutral'}>{manage ? 'Planner · can replenish' : 'View only'}</Badge>
      </header>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cfg.kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} unit={k.unit} delta={k.delta} deltaTone={k.deltaTone} tone={k.tone ?? 'neutral'} />
        ))}
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel eyebrow={`Gold · gold.inventory_positions@${gold?.version ?? '—'} · as of ${gold?.asOf ?? '—'}`} title="Stock positions" bodyClassName="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line">
                {['SKU', 'Description', 'Available', 'ROP', 'Coverage', 'Status', ''].map((h) => (
                  <th key={h} scope="col" className="eyebrow px-3 py-2.5 text-[10px] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.stock.map((it) => {
                const avail = it.onHand - it.reserved
                const low = avail < it.reorderPoint
                const tone: Tone = avail <= 0 ? 'crit' : low ? 'warn' : 'nv'
                return (
                  <tr key={it.sku} className="border-b border-line/60 last:border-0">
                    <td className="num px-3 py-2.5 text-slate-200">{it.sku}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-white">{it.description}</p>
                      <p className="text-[11.5px] text-slate-500">
                        {it.location} · {it.supplier}
                      </p>
                    </td>
                    <td className="num px-3 py-2.5 text-slate-200">
                      {avail} <span className="text-slate-500">/ {it.onHand}</span>
                      {it.reservedFor && <p className="text-[11px] text-warn">1 → {it.reservedFor}</p>}
                    </td>
                    <td className="num px-3 py-2.5 text-slate-300">{it.reorderPoint}</td>
                    <td className="num px-3 py-2.5 text-slate-300">{it.coverageDays} d</td>
                    <td className="px-3 py-2.5">
                      <span className={cx('flex items-center gap-1.5 text-[12.5px]', tone === 'crit' ? 'text-crit' : tone === 'warn' ? 'text-warn' : 'text-nv')}>
                        <StatusDot tone={tone} className="size-1.5" />
                        {avail <= 0 ? 'Out (reserved)' : low ? 'Below ROP' : 'OK'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {manage && low && (
                        <button
                          type="button"
                          disabled={ordered[it.sku]}
                          onClick={() => {
                            setOrdered((o) => ({ ...o, [it.sku]: true }))
                            log('Replenishment drafted', `${it.sku} · ${it.reorderPoint * 2 - avail} units from ${it.supplier}`, 'nv')
                            notify(`Replenishment drafted for ${it.sku} (demo)`, 'nv')
                          }}
                          className="inline-flex items-center gap-1 rounded-[3px] px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-nv ring-1 ring-nv/50 hover:bg-nv/10 disabled:text-slate-500 disabled:ring-line"
                        >
                          {ordered[it.sku] ? <CircleCheck className="size-3" aria-hidden /> : <PackagePlus className="size-3" aria-hidden />}
                          {ordered[it.sku] ? 'Drafted' : 'Replenish'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Panel>
        <div className="space-y-4">
          <ConnectorMonitor connector={wms} dataset={gold} />
          <CitedAssistant module="inventory" title="AI stock briefing" />
        </div>
      </div>
      <p className="flex items-center gap-2 text-[12px] text-slate-500">
        <Truck className="size-3.5" aria-hidden /> Inbound spares are tracked in Transportation — readable only with a Transportation grant.
      </p>
    </div>
  )
}
