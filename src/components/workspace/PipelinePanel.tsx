import { Cable, CircleAlert, CircleCheck, Plug, Unplug } from 'lucide-react'
import { navItem, type ModuleId } from '../../data/nav.ts'
import { cx, TONE_TEXT } from '../../lib/format.ts'
import { connect, disconnect, type Connector, type GoldDataset } from '../../lib/workspace.ts'
import { Badge, Eyebrow, StatusDot } from '../ui/primitives.tsx'

interface Props {
  connectors: Connector[]
  gold: GoldDataset[]
  enabledModules: ModuleId[]
  setConnectors?: (fn: (c: Connector[]) => Connector[]) => void
  setGold?: (fn: (g: GoldDataset[]) => GoldDataset[]) => void
  compact?: boolean
}

const HEALTH = {
  healthy: { tone: 'nv', label: 'Healthy' },
  stale: { tone: 'warn', label: 'Stale' },
  schema_mismatch: { tone: 'crit', label: 'Schema mismatch' },
  failed: { tone: 'crit', label: 'Refresh failed' },
  disconnected: { tone: 'neutral', label: 'Not connected' },
} as const

export function PipelinePanel({ connectors, gold, enabledModules, setConnectors, setGold, compact }: Props) {
  const live = connectors.filter((c) => c.connected)
  const warnings = live.filter((c) => c.warning)
  const editable = !!setConnectors

  const toggleMap = (gid: string, m: ModuleId) =>
    setGold?.((all) => all.map((g) => (g.id === gid ? { ...g, modules: g.modules.includes(m) ? g.modules.filter((x) => x !== m) : [...g.modules, m] } : g)))

  return (
    <div className="space-y-5">
      <section aria-label="Source connectors">
        <div className="mb-2.5 flex items-baseline justify-between">
          <Eyebrow>Source connectors</Eyebrow>
          <span className="num text-[12px] text-slate-400">
            {live.length}/{connectors.length} connected · mock
          </span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {connectors.map((c) => {
            const h = HEALTH[c.connected ? c.health : 'disconnected']
            return (
              <li key={c.id} className={cx('rounded-[5px] border bg-deck/60 p-3', c.connected ? 'border-line' : 'border-dashed border-line-strong')}>
                <div className="flex items-start gap-2.5">
                  <span className={cx('grid size-8 shrink-0 place-items-center rounded-[3px] border', c.connected ? 'border-nv/40 text-nv' : 'border-line text-slate-500')}>
                    <Cable className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-slate-400">{c.kind}</span>
                      <span className={cx('flex items-center gap-1 text-[11px]', TONE_TEXT[h.tone])}>
                        <StatusDot tone={h.tone} className="size-1.5" /> {h.label}
                      </span>
                    </p>
                    <p className="truncate text-[13.5px] font-medium text-white">{c.name}</p>
                    <p className="truncate text-[11.5px] text-slate-500">{c.detail}</p>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setConnectors!((all) => all.map((x) => (x.id === c.id ? (x.connected ? disconnect(x) : connect(x)) : x)))}
                      className={cx('shrink-0 rounded-[3px] px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] ring-1', c.connected ? 'text-slate-300 ring-line-strong hover:text-white' : 'text-nv ring-nv/50 hover:bg-nv/10')}
                      aria-label={`${c.connected ? 'Disconnect' : 'Connect'} ${c.name}`}
                    >
                      {c.connected ? <Unplug className="size-3.5" aria-hidden /> : <span className="flex items-center gap-1"><Plug className="size-3" aria-hidden />Connect</span>}
                    </button>
                  )}
                </div>
                {c.connected && !compact && (
                  <dl className="num mt-2.5 grid grid-cols-4 gap-2 border-t border-line pt-2 text-[11px]">
                    <div><dt className="text-slate-500">Fresh</dt><dd className={c.health === 'stale' ? 'text-warn' : 'text-slate-200'}>{c.freshness}</dd></div>
                    <div><dt className="text-slate-500">SLA</dt><dd className="text-slate-200">{c.sla}</dd></div>
                    <div><dt className="text-slate-500">Quality</dt><dd className={c.quality < 95 ? 'text-warn' : 'text-slate-200'}>{c.quality}%</dd></div>
                    <div><dt className="text-slate-500">Errors</dt><dd className={c.errors ? 'text-crit' : 'text-slate-200'}>{c.errors}</dd></div>
                  </dl>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-label="Medallion pipeline" className="rounded-[5px] border border-line bg-deck/40 p-4">
        <Eyebrow className="mb-3">Operational records · raw ingestion → validation &amp; cleaning → curated Gold tables</Eyebrow>
        <ol className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {[
            { name: 'Bronze', color: '#b7793e', desc: 'Raw ingestion · append-only landing', stat: `${live.length} sources · ${live.reduce((s, c) => s + c.errors, 0)} errors` },
            { name: 'Silver', color: '#94a3b8', desc: 'Validation & cleaning · typed, de-duplicated', stat: warnings.some((w) => w.health === 'schema_mismatch') ? '7 rows quarantined' : 'Schema contracts OK' },
            { name: 'Gold', color: '#76b900', desc: 'Curated Gold tables → permission-scoped queries', stat: `${gold.length} datasets · ${gold.filter((g) => g.modules.some((m) => enabledModules.includes(m))).length} mapped` },
          ].map((l, i) => (
            <li key={l.name} className="contents">
              <div className="rounded-[4px] border border-line bg-panel/80 p-3" style={{ borderTopColor: l.color, borderTopWidth: 2 }}>
                <p className="font-mono text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: l.color }}>
                  {l.name}
                </p>
                <p className="mt-1 text-[12.5px] text-slate-300">{l.desc}</p>
                <p className="num mt-2 text-[11.5px] text-slate-400">{l.stat}</p>
              </div>
              {i < 2 && (
                <svg viewBox="0 0 40 12" className="hidden h-3 w-10 self-center md:block" aria-hidden>
                  <line x1="0" y1="6" x2="34" y2="6" stroke="#76b900" strokeDasharray="4 3" className="animate-dash" />
                  <path d="M33 2 L39 6 L33 10" fill="none" stroke="#76b900" />
                </svg>
              )}
            </li>
          ))}
        </ol>
      </section>

      {warnings.length > 0 && (
        <ul className="space-y-2" aria-label="Ingestion warnings">
          {warnings.map((c) => (
            <li key={c.id} className={cx('flex items-start gap-2.5 rounded-[4px] border px-3 py-2.5 text-[13px]', c.health === 'schema_mismatch' ? 'border-crit/45 bg-crit/[0.06]' : 'border-warn/45 bg-warn/[0.06]')}>
              <CircleAlert className={cx('mt-0.5 size-4 shrink-0', c.health === 'schema_mismatch' ? 'text-crit' : 'text-warn')} aria-hidden />
              <span className="text-slate-200">
                <span className="font-mono text-[11px] font-semibold text-slate-400">{c.kind}</span> · {c.warning}
              </span>
            </li>
          ))}
        </ul>
      )}

      <section aria-label="Gold-layer mappings">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <Eyebrow>Gold-layer datasets → modules / tasks</Eyebrow>
          {editable && <span className="text-[11.5px] text-slate-500">Toggle chips to map</span>}
        </div>
        <div className="overflow-x-auto rounded-[5px] border border-line">
          <table className="w-full min-w-[680px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line bg-deck/60">
                {['Dataset', 'Sources', 'Feeds modules', 'Freshness', 'Quality'].map((h) => (
                  <th key={h} scope="col" className="eyebrow px-3 py-2.5 text-[10px] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gold.map((g) => {
                const srcDown = g.sources.some((s) => !connectors.find((c) => c.id === s)?.connected)
                return (
                  <tr key={g.id} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="num text-slate-100">{g.name}</p>
                      <p className="text-[11.5px] text-slate-500">{g.task}</p>
                    </td>
                    <td className="num px-3 py-2.5 text-slate-400">
                      {g.sources.join(' + ')}
                      {srcDown && <span className="ml-1.5 text-warn">(source off)</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(editable ? enabledModules : g.modules).map((m) => {
                          const on = g.modules.includes(m)
                          const label = navItem(m).label.replace(' / CRM', '').replace('Information Technology', 'IT')
                          return editable ? (
                            <button
                              key={m}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleMap(g.id, m)}
                              className={cx('rounded-[3px] px-1.5 py-0.5 text-[11px] ring-1 transition-colors', on ? 'bg-nv/15 text-nv-bright ring-nv/50' : 'text-slate-500 ring-line hover:text-slate-300')}
                            >
                              {label}
                            </button>
                          ) : (
                            <Badge key={m} tone={enabledModules.includes(m) ? 'nv' : 'neutral'} className="normal-case tracking-normal">
                              {label}
                            </Badge>
                          )
                        })}
                        {editable && enabledModules.length === 0 && <span className="text-[11.5px] text-slate-500">Select modules in step 2</span>}
                      </div>
                    </td>
                    <td className={cx('num px-3 py-2.5', g.tone === 'warn' ? 'text-warn' : 'text-slate-300')}>{g.freshness}</td>
                    <td className="num px-3 py-2.5">
                      <span className={cx('inline-flex items-center gap-1', g.quality < 96 ? 'text-warn' : 'text-nv')}>
                        {g.quality >= 96 && <CircleCheck className="size-3" aria-hidden />}
                        {g.quality}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
