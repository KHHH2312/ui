import { Ban, Check, Cpu, FileText, Lock, Minus, ShieldAlert, ShieldCheck, Table2 } from 'lucide-react'
import type { ModuleId } from '../../data/nav.ts'
import { navItem } from '../../data/nav.ts'
import { can, roleDef } from '../../lib/access.ts'
import { cx } from '../../lib/format.ts'
import { useNotify } from '../../lib/toast.ts'
import { ragState, type SecurityIncident } from '../../lib/workspace.ts'
import { useWorkspace } from '../../lib/workspaceContext.ts'
import { Badge, Eyebrow, Panel } from '../ui/primitives.tsx'

type Status = 'running' | 'simulated' | 'target'
const STATUS: Record<Status, { label: string; tone: 'nv' | 'info' | 'neutral' }> = {
  running: { label: 'Running', tone: 'nv' },
  simulated: { label: 'Simulated in demo', tone: 'info' },
  target: { label: 'Architecture target', tone: 'neutral' },
}

const NODES: Array<{ name: string; detail: string; status: Status; nvidia?: boolean }> = [
  { name: 'React cockpit', detail: 'This UI · role-aware UX only', status: 'running' },
  { name: 'FastAPI gateway', detail: 'Verified identity · tenant + action + scope authZ on every call', status: 'simulated' },
  { name: 'Metadata ACL filter', detail: 'Tenant/role/module/scope filter BEFORE retrieval — the authorization control', status: 'simulated' },
  { name: 'NVIDIA NIM on Brev', detail: 'Embeddings + LLM inference microservices on Brev GPUs', status: 'target', nvidia: true },
  { name: 'NVIDIA NeMo Guardrails', detail: 'Topical boundaries & safe tool use — complements, never replaces, ACLs', status: 'target', nvidia: true },
  { name: 'PLC/SCADA + CMMS', detail: 'Mitigation writes & work orders', status: 'simulated' },
]

export function ArchitectureStrip() {
  return (
    <Panel eyebrow="Reference architecture · honest status labels" title="How a request flows" bodyClassName="p-3 sm:p-4">
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {NODES.map((n, i) => {
          const st = STATUS[n.status]
          return (
            <li key={n.name} className={cx('relative rounded-[5px] border p-3', n.nvidia ? 'border-nv/40 bg-nv/[0.04]' : 'border-line bg-deck/60')}>
              <p className="num text-[10px] text-slate-500">{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[13.5px] font-semibold text-white">
                {n.nvidia && <Cpu className="size-3.5 text-nv" aria-hidden />}
                {n.name}
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-slate-400">{n.detail}</p>
              <Badge tone={st.tone} className="mt-2">
                {st.label}
              </Badge>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 flex items-start gap-2 text-[12px] text-slate-400">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-nv" aria-hidden />
        Authorization = server-side tenant isolation + RBAC/ACL metadata filtering before retrieval. NeMo Guardrails adds topical and tool-execution safety on top. Nothing labelled “architecture target” is called by this demo.
      </p>
    </Panel>
  )
}

export function DataPaths() {
  const { ws } = useWorkspace()
  const rag = ragState(ws.documents)
  const stale = ws.gold.filter((g) => g.stale)
  const quarantined = ws.connectors.some((c) => c.lastRun.errorKind === 'quality')
  const failed = ws.connectors.filter((c) => c.lastRun.status === 'failed')
  const lanes = [
    {
      icon: Table2,
      title: 'Operational records',
      steps: [
        { k: 'Raw ingestion', sub: 'Bronze', color: '#b7793e', stat: `${ws.connectors.filter((c) => c.connected).length} sources · ${failed.length} failed run` },
        { k: 'Validation & cleaning', sub: 'Silver', color: '#94a3b8', stat: quarantined ? '7 rows quarantined' : 'contracts OK' },
        { k: 'Curated Gold tables', sub: 'Gold', color: '#76b900', stat: stale.length ? `${stale.map((s) => `${s.name}@${s.version}`).join(', ')} retained · STALE` : `${ws.gold.length} datasets current` },
        { k: 'Permission-scoped queries', sub: 'tenant + action + scope', color: '#5cc8ff', stat: 'row filters per grant' },
      ],
    },
    {
      icon: FileText,
      title: 'PDFs / documents',
      steps: [
        { k: 'Upload', sub: 'tenant storage', color: '#b7793e', stat: `${ws.documents.length} PDFs` },
        { k: 'Extraction & validation', sub: 'text + chunking', color: '#94a3b8', stat: `${rag.chunks} chunks` },
        { k: 'Permission-tagged chunks', sub: 'ACL metadata', color: '#76b900', stat: 'tenant · modules · roles · scope' },
        { k: 'Authorized retrieval', sub: 'NIM embeddings (target)', color: '#5cc8ff', stat: rag.ready ? 'RAG-ready' : `${rag.pending} indexing` },
      ],
    },
  ]
  return (
    <Panel eyebrow="Two connected data paths" title="Records → Gold tables · Documents → permission-tagged chunks">
      <div className="space-y-4">
        {lanes.map((lane) => {
          const Icon = lane.icon
          return (
            <div key={lane.title}>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-white">
                <Icon className="size-4 text-slate-400" aria-hidden /> {lane.title}
              </p>
              <ol className="grid gap-2 md:grid-cols-4">
                {lane.steps.map((s, i) => (
                  <li key={s.k} className="relative rounded-[4px] border border-line bg-deck/70 p-3" style={{ borderTopColor: s.color, borderTopWidth: 2 }}>
                    <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: s.color }}>
                      {s.sub}
                    </p>
                    <p className="mt-1 text-[13px] font-medium text-white">{s.k}</p>
                    <p className={cx('num mt-1 text-[11.5px]', s.stat.includes('STALE') ? 'font-semibold text-warn' : 'text-slate-400')}>{s.stat}</p>
                    {i < 3 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 font-mono text-nv md:block" aria-hidden>›</span>}
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export function SecurityIncidentLog({ limit }: { limit?: number }) {
  const { ws } = useWorkspace()
  const rows = [...ws.incidents].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
  const newest = rows[0]?.id
  return (
    <Panel
      eyebrow="Real-time · shared across personas"
      title="Security incident log"
      actions={<Badge tone={rows.length ? 'crit' : 'nv'} dot>{rows.length} denied</Badge>}
      bodyClassName="overflow-x-auto p-0"
    >
      {rows.length === 0 ? (
        <p className="p-5 text-[13px] text-slate-400">No denied requests yet.</p>
      ) : (
        <table className="w-full min-w-[820px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              {['Time', 'Tenant', 'User / role', 'Requested resource', 'Decision', 'Reason', 'Retrieved'].map((h) => (
                <th key={h} scope="col" className="eyebrow px-3 py-2.5 text-[10px] font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody aria-live="polite">
            {rows.map((r: SecurityIncident) => (
              <tr key={r.id} className={cx('border-b border-line/60 last:border-0', r.id === newest && 'animate-rise bg-crit/[0.06]')}>
                <td className="num whitespace-nowrap px-3 py-2.5 text-slate-300">{new Date(r.at).toLocaleTimeString('en-GB', { hour12: false })}</td>
                <td className="num px-3 py-2.5 text-slate-400">{r.tenantId}</td>
                <td className="px-3 py-2.5">
                  <p className="text-white">{r.userName}</p>
                  <p className="text-[11px] text-slate-500">{r.roles.map((x) => roleDef(x).label).join(' + ')}</p>
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-slate-200">{r.requestedResource}</p>
                  <p className="max-w-[220px] truncate text-[11px] text-slate-500">“{r.query}”</p>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-crit">
                    <Ban className="size-3" aria-hidden /> 403 {r.decision}
                  </span>
                  <p className="text-[10.5px] text-slate-500">{r.stage}</p>
                </td>
                <td className="max-w-[240px] px-3 py-2.5 text-slate-300">{r.reason}</td>
                <td className="num px-3 py-2.5 text-slate-300">
                  {r.chunksRetrieved} chunks
                  <p className="text-[10.5px] text-slate-500">0 sent to model</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

const CONNECTOR_MODULE: Record<string, ModuleId> = { erp: 'procurement', wms: 'inventory', tms: 'transportation', crm: 'crm', scada: 'manufacturing', s3: 'it' }

/** Shows that configuring a connection and reading its business records are separate grants. */
export function PermissionSeparation() {
  const { ws, perms, me } = useWorkspace()
  const notify = useNotify()
  const canConfigure = can(perms, 'data', 'configure')
  return (
    <Panel eyebrow={`Acting as ${me.name}`} title="Configure connection ≠ read business data" bodyClassName="p-0">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-line">
            {['Connector', 'Configure connection', 'Read business records', ''].map((h) => (
              <th key={h} scope="col" className="eyebrow px-3 py-2.5 text-[10px] font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ws.connectors.map((c) => {
            const mod = CONNECTOR_MODULE[c.id]
            const read = can(perms, mod, 'read_records')
            return (
              <tr key={c.id} className="border-b border-line/60 last:border-0">
                <td className="px-3 py-2.5">
                  <p className="text-white">{c.kind}</p>
                  <p className="text-[11px] text-slate-500">→ {navItem(mod).label}</p>
                </td>
                <td className="px-3 py-2.5">{canConfigure ? <Check className="size-4 text-nv" aria-label="allowed" /> : <Minus className="size-4 text-slate-600" aria-label="denied" />}</td>
                <td className="px-3 py-2.5">{read ? <Check className="size-4 text-nv" aria-label="allowed" /> : <Lock className="size-4 text-warn" aria-label="denied" />}</td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => notify(read ? `Previewing 5 ${c.kind} records (mock)` : `403 · read_records on ${navItem(mod).label} not granted — schema & health only`, read ? 'nv' : 'warn')}
                    className={cx('rounded-[3px] px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] ring-1', read ? 'text-nv ring-nv/40 hover:bg-nv/10' : 'text-slate-400 ring-line-strong hover:text-warn')}
                  >
                    Preview rows
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="flex items-start gap-2 border-t border-line px-3 py-2.5 text-[11.5px] text-slate-400">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden />
        Data Architects manage connections, schemas and pipeline health without being able to read the business records flowing through them.
      </p>
    </Panel>
  )
}

export function IncidentsEyebrow() {
  return <Eyebrow>Security</Eyebrow>
}
