import { Eye, EyeOff, Hourglass, PlugZap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge, Eyebrow } from '../components/ui/primitives.tsx'
import { navItem, type ModuleId } from '../data/nav.ts'

const PLANNED: Partial<Record<ModuleId, string[]>> = {
  inventory: ['Stock positions from gold.inventory_positions', 'Replenishment drafts', 'Spares reservations from work orders'],
  warehousing: ['Dock scheduling', 'Zone capacity', 'Pick-wave release'],
  manufacturing: ['Line OEE', 'Machinery health', 'Autonomous Triage (preview available)'],
  distribution: ['DC network balance', 'Fill-rate tracking', 'Backorder alerts'],
  crm: ['Customer cases & SLAs', 'Proactive throughput notices', 'Account health'],
  it: ['Integration health', 'Connector credentials (server-side)', 'Platform SLOs'],
}

/** Module enabled for the company but not yet wired to the FastAPI prototype backend. */
export function ComingSoonGate({ module, preview }: { module: ModuleId; preview: ReactNode }) {
  const [show, setShow] = useState(false)
  const item = navItem(module)
  const Icon = item.icon
  return (
    <div>
      <div className="mx-auto max-w-[1680px] px-4 pt-5 sm:px-6">
        <section className="panel scanlines relative overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-[6px] border border-line-strong bg-deck text-slate-300">
              <Icon className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">
                  <Hourglass className="size-3" aria-hidden /> Coming soon
                </Badge>
                <Badge tone="neutral">Enabled for future integration</Badge>
              </div>
              <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-white">{item.label}</h1>
              <p className="mt-1 max-w-2xl text-[14px] text-slate-400">
                This module is switched on for your company, but the FastAPI prototype backend currently implements Transportation and Procurement only. Nothing here is live data.
              </p>
              <Eyebrow className="mb-2 mt-5">Planned capabilities</Eyebrow>
              <ul className="flex flex-wrap gap-2">
                {(PLANNED[module] ?? []).map((p) => (
                  <li key={p} className="flex items-center gap-1.5 rounded-[4px] border border-line bg-deck/70 px-2.5 py-1.5 text-[12.5px] text-slate-300">
                    <PlugZap className="size-3.5 text-slate-500" aria-hidden /> {p}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-expanded={show}
              className="flex items-center gap-2 self-start rounded-[4px] border border-line-strong px-3.5 py-2 text-[13px] font-medium text-slate-200 hover:border-slate-400 hover:text-white"
            >
              {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              {show ? 'Hide preview' : 'Show UI preview (mock data)'}
            </button>
          </div>
        </section>
      </div>
      {show && (
        <div className="relative animate-fade">
          <p className="mx-auto mt-4 max-w-[1680px] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-info sm:px-6">Architecture preview · mock data · not connected</p>
          {preview}
        </div>
      )}
    </div>
  )
}
