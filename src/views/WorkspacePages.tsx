import { ArrowLeft, Check, Clock, Lock, Send, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { DocumentsPanel } from '../components/workspace/DocumentsPanel.tsx'
import { ConnectorMonitor } from '../components/workspace/Assistant.tsx'
import { ArchitectureStrip, DataPaths, PermissionSeparation, SecurityIncidentLog } from '../components/workspace/Architecture.tsx'
import { InviteCodesPanel, MembersPanel } from '../components/workspace/MembersPanel.tsx'
import { PipelinePanel } from '../components/workspace/PipelinePanel.tsx'
import { Badge, Eyebrow, KpiCard, Panel, StatusDot } from '../components/ui/primitives.tsx'
import { MODULE_NAV, navItem, type ModuleId, type ViewId } from '../data/nav.ts'
import { IMPLEMENTED_MODULES, isOwnerLike, roleDef, type Member, type RoleId } from '../lib/access.ts'
import { cx, TONE_TEXT } from '../lib/format.ts'
import { useNotify } from '../lib/toast.ts'
import { generateInvite, ragState, type Connector, type GoldDataset, type KbDocument } from '../lib/workspace.ts'
import { useWorkspace } from '../lib/workspaceContext.ts'

function PageHead({ eyebrow, title, desc, right }: { eyebrow: string; title: string; desc: string; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-slate-400">{desc}</p>
      </div>
      {right}
    </header>
  )
}

const Page = ({ children }: { children: ReactNode }) => <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 sm:px-6">{children}</div>

function useSetters() {
  const { update } = useWorkspace()
  return {
    setDocs: useCallback((fn: (d: KbDocument[]) => KbDocument[]) => update((w) => ({ ...w, documents: fn(w.documents) })), [update]),
    setConnectors: useCallback((fn: (c: Connector[]) => Connector[]) => update((w) => ({ ...w, connectors: fn(w.connectors) })), [update]),
    setGold: useCallback((fn: (g: GoldDataset[]) => GoldDataset[]) => update((w) => ({ ...w, gold: fn(w.gold) })), [update]),
    setMembers: useCallback((fn: (m: Member[]) => Member[]) => update((w) => ({ ...w, members: fn(w.members) })), [update]),
  }
}

export function KnowledgeBaseView() {
  const { ws, perms } = useWorkspace()
  const { setDocs } = useSetters()
  const rag = ragState(ws.documents)
  const canEdit = isOwnerLike(perms.roles) || perms.roles.includes('data_architect')
  return (
    <Page>
      <PageHead eyebrow={`${ws.tenant.name} · Retrieval`} title="Knowledge Base" desc="PDF uploaded → extracted & chunked → ACL metadata tagged → indexed (RAG-ready). Chunks are permission-tagged documents — separate from curated Gold tables." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Documents" value={String(ws.documents.length)} delta="PDF only" deltaTone="info" />
        <KpiCard label="Indexed" value={String(rag.indexed)} delta={rag.pending ? `${rag.pending} processing` : 'all complete'} deltaTone={rag.pending ? 'info' : 'nv'} tone="nv" />
        <KpiCard label="Chunks" value={rag.chunks.toLocaleString()} delta="~512 tokens each" deltaTone="info" />
        <KpiCard label="RAG status" value={rag.ready ? 'Ready' : rag.pending ? 'Indexing' : 'Empty'} delta="tenant-scoped index" deltaTone="nv" tone={rag.ready ? 'nv' : 'warn'} />
      </section>
      <Panel eyebrow="Document inventory" title="Indexed sources" actions={!canEdit && <Badge tone="neutral">Read only</Badge>}>
        <DocumentsPanel docs={ws.documents} setDocs={setDocs} readOnly={!canEdit} />
      </Panel>
    </Page>
  )
}

export function DataPipelinesView() {
  const { ws, perms } = useWorkspace()
  const { setConnectors, setGold } = useSetters()
  const canEdit = isOwnerLike(perms.roles) || perms.roles.includes('data_architect')
  const live = ws.connectors.filter((c) => c.connected)
  const issues = live.filter((c) => c.warning).length
  return (
    <Page>
      <PageHead
        eyebrow={`${ws.tenant.name} · Data architecture`}
        title="Pipeline monitor"
        desc="Operational records: raw ingestion → validation & cleaning → curated Gold tables. Documents: upload → extraction → permission-tagged chunks. Plus the live security incident log."
        right={<Badge tone={issues ? 'warn' : 'nv'} dot>{issues ? `${issues} ingestion warnings` : 'All pipelines healthy'}</Badge>}
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Connected sources" value={`${live.length}/${ws.connectors.length}`} delta="mock connectors" deltaTone="info" />
        <KpiCard label="Ingestion health" value={`${Math.round((live.filter((c) => c.health === 'healthy').length / Math.max(1, live.length)) * 100)}`} unit="%" delta={`${issues} need attention`} deltaTone={issues ? 'warn' : 'nv'} tone={issues ? 'warn' : 'nv'} />
        <KpiCard label="Gold datasets" value={String(ws.gold.length)} delta={`${ws.gold.filter((g) => g.modules.length).length} mapped to modules`} deltaTone="nv" />
        <KpiCard label="RAG index" value={ragState(ws.documents).ready ? 'Ready' : 'Indexing'} delta={`${ragState(ws.documents).chunks} chunks`} deltaTone="nv" tone="nv" />
      </section>
      <DataPaths />
      <div className="grid gap-4 2xl:grid-cols-[1.3fr_1fr]">
        <SecurityIncidentLog />
        <PermissionSeparation />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {ws.connectors
          .filter((c) => c.lastRun.error)
          .map((c) => (
            <ConnectorMonitor key={c.id} connector={c} dataset={c.id === 'tms' ? ws.gold.find((g) => g.name === 'gold.shipments_eta') : ws.gold.find((g) => g.name === 'gold.supplier_scorecard')} />
          ))}
      </div>
      <Panel eyebrow="Ingestion" title="Connectors & Gold-layer mappings" actions={!canEdit && <Badge tone="neutral">Read only</Badge>}>
        <PipelinePanel connectors={ws.connectors} gold={ws.gold} enabledModules={ws.tenant.enabledModules} setConnectors={canEdit ? setConnectors : undefined} setGold={canEdit ? setGold : undefined} />
      </Panel>
      <ArchitectureStrip />
    </Page>
  )
}

export function TeamView() {
  const { ws, perms, log, update, me } = useWorkspace()
  const { setMembers } = useSetters()
  const canEdit = isOwnerLike(perms.roles)
  return (
    <Page>
      <PageHead eyebrow={`${ws.tenant.name} · Access`} title="Team & roles" desc="Roles combine per person. Effective access = role defaults ∪ explicit grants ∩ modules enabled for this company." />
      {canEdit && (
        <InviteCodesPanel
          invites={ws.invites}
          onGenerate={(roles: RoleId[]) => {
            const inv = generateInvite(ws, roles, me.name)
            update((w) => ({ ...w, invites: [inv, ...w.invites] }))
            log('Invitation code generated', `${inv.code} → ${roles.map((r) => roleDef(r).label).join(' + ')}`, 'nv')
          }}
        />
      )}
      <Panel eyebrow="Members" title={`${ws.members.length} people`} actions={!canEdit && <Badge tone="neutral">Read only</Badge>}>
        <MembersPanel tenant={ws.tenant} members={ws.members} setMembers={canEdit ? setMembers : undefined} onEvent={(a, d) => log(a, d)} />
      </Panel>
    </Page>
  )
}

const TABS = ['Company Profile', 'Enabled Modules', 'Knowledge Base', 'Data Sources', 'Members & Roles', 'Audit / Alerts'] as const

export function SettingsView() {
  const { ws, update, perms, log } = useWorkspace()
  const { setDocs, setMembers } = useSetters()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Company Profile')
  const canEdit = isOwnerLike(perms.roles)
  const notify = useNotify()

  const toggleModule = (m: ModuleId) => {
    const on = ws.tenant.enabledModules.includes(m)
    update((w) => ({ ...w, tenant: { ...w.tenant, enabledModules: on ? w.tenant.enabledModules.filter((x) => x !== m) : [...w.tenant.enabledModules, m] } }))
    log(on ? 'Module disabled' : 'Module enabled', navItem(m).label, on ? 'warn' : 'nv')
  }

  return (
    <Page>
      <PageHead eyebrow={`${ws.tenant.name} · ${ws.tenant.tenantId}`} title="Company Settings" desc="Workspace configuration. Changes here are local demo state; the backend is the source of truth in production." />
      <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx('-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors', tab === t ? 'border-nv text-white' : 'border-transparent text-slate-400 hover:text-slate-200')}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab} className="animate-fade">
        {tab === 'Company Profile' && (
          <Panel eyebrow="Profile" title={ws.tenant.name}>
            <dl className="grid gap-4 text-[13.5px] sm:grid-cols-2">
              {[
                ['Tenant ID', ws.tenant.tenantId],
                ['Industry', ws.tenant.industry],
                ['Size', ws.tenant.size],
                ['Locations', ws.tenant.locations.join(', ')],
                ['Operational context', ws.tenant.context || '—'],
                ['Created via', ws.origin === 'setup' ? 'Owner setup wizard' : ws.origin === 'join' ? 'Invite' : 'Demo seed'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow text-[10px]">{k}</dt>
                  <dd className={cx('mt-1 text-slate-200', k === 'Tenant ID' && 'num')}>{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}
        {tab === 'Enabled Modules' && (
          <Panel eyebrow="Supply-chain scope" title={`${ws.tenant.enabledModules.length} of 8 modules enabled`} actions={!canEdit && <Badge tone="neutral">Owner/Admin only</Badge>}>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {MODULE_NAV.map((m) => {
                const on = ws.tenant.enabledModules.includes(m.id)
                const Icon = m.icon
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      disabled={!canEdit}
                      onClick={() => toggleModule(m.id)}
                      className={cx('flex w-full items-center gap-3 rounded-[5px] border px-3 py-3 text-left disabled:cursor-not-allowed', on ? 'border-nv/50 bg-nv/[0.06]' : 'border-line bg-deck/50')}
                    >
                      <Icon className={cx('size-4', on ? 'text-nv' : 'text-slate-500')} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] text-white">{m.label}</span>
                        <span className={cx('block font-mono text-[10px] uppercase tracking-[0.08em]', IMPLEMENTED_MODULES.includes(m.id) ? 'text-nv' : 'text-slate-500')}>
                          {IMPLEMENTED_MODULES.includes(m.id) ? 'Integrated' : 'Coming soon'}
                        </span>
                      </span>
                      <span className={cx('font-mono text-[10.5px] font-semibold', on ? 'text-nv' : 'text-slate-500')}>{on ? 'ON' : 'OFF'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
        {tab === 'Knowledge Base' && (
          <Panel eyebrow="Document inventory" title="Knowledge base">
            <DocumentsPanel docs={ws.documents} setDocs={setDocs} readOnly={!canEdit} />
          </Panel>
        )}
        {tab === 'Data Sources' && (
          <Panel eyebrow="Pipeline health" title="Data sources">
            <PipelinePanel connectors={ws.connectors} gold={ws.gold} enabledModules={ws.tenant.enabledModules} compact />
          </Panel>
        )}
        {tab === 'Members & Roles' && (
          <Panel eyebrow="Permissions summary" title="Members & roles">
            <MembersPanel tenant={ws.tenant} members={ws.members} setMembers={canEdit ? setMembers : undefined} onEvent={(a, d) => log(a, d)} />
          </Panel>
        )}
        {tab === 'Audit / Alerts' && (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Panel eyebrow="Security & access events" title="Audit log (mock)" bodyClassName="p-0">
              <ol className="divide-y divide-line">
                {ws.audit.map((e) => (
                  <li key={e.id} className="flex gap-3 px-4 py-3">
                    <StatusDot tone={e.tone} className="mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
                        <span className="font-medium text-white">{e.action}</span>
                        <span className="num text-[11.5px] text-slate-500">
                          {e.time} · {e.actor}
                        </span>
                      </p>
                      <p className="text-[12.5px] text-slate-400">{e.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel eyebrow="Enforcement" title="Security boundaries">
              <ul className="space-y-3 text-[13px] text-slate-300">
                {[
                  'Navigation filtering and "Preview as role" are UX only — they are not access control.',
                  'FastAPI must derive tenant and user from a verified token, never from request bodies or headers set by the client.',
                  'Every API and RAG query is scoped by tenant_id and checked against server-side role/module grants.',
                  'Vector search filters by tenant_id + document visibility before ranking.',
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-nv" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => notify('Alert rules are read-only in the demo workspace.', 'info')} className="mt-4 text-[12.5px] text-nv hover:text-nv-bright">
                Configure alert routing →
              </button>
            </Panel>
          </div>
        )}
      </div>
    </Page>
  )
}

export function AccessDenied({ page, onBack }: { page: ViewId; onBack: () => void }) {
  const { perms, ws, log, recordIncident, me } = useWorkspace()
  const logged = useRef(false)
  useEffect(() => {
    // Direct client-route attempt on an ungranted page → security incident (the backend would return 403 for its data).
    if (logged.current || perms.reason(page) !== 'not_granted') return
    logged.current = true
    recordIncident({
      id: `inc_${Date.now().toString(36)}_rt`,
      at: new Date().toISOString(),
      tenantId: perms.tenantId,
      userId: me.userId,
      userName: me.name,
      roles: perms.roles,
      requestedResource: navItem(page).label,
      query: `GET #/${page}`,
      decision: 'DENY',
      stage: 'route',
      reason: `Route not granted to ${perms.roles.map((r) => roleDef(r).label).join(' + ')}`,
      chunksRetrieved: 0,
      sentToModel: false,
    })
  }, [page, perms, me, recordIncident])
  const notify = useNotify()
  const [requested, setRequested] = useState(false)
  const reason = perms.reason(page)
  const item = navItem(page)
  const Icon = item.icon
  const disabled = reason === 'module_disabled'
  return (
    <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
      <div className="relative">
        <span className="grid size-20 place-items-center rounded-full border border-line-strong bg-panel">
          <Icon className="size-8 text-slate-500" aria-hidden />
        </span>
        <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border border-warn/60 bg-void text-warn">
          <Lock className="size-4" aria-hidden />
        </span>
      </div>
      <Eyebrow className="mt-6 text-warn">{disabled ? 'Module not enabled' : 'Access restricted'}</Eyebrow>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-white">{item.label}</h1>
      <p className="mt-2 text-[14px] text-slate-400">
        {disabled
          ? `${ws.tenant.name} has not enabled this module. An owner can turn it on in Company Settings → Enabled Modules.`
          : `Your role${perms.roles.length > 1 ? 's' : ''} (${perms.roles.map((r) => roleDef(r).label).join(' + ')}) do${perms.roles.length > 1 ? '' : 'es'} not include ${item.label}.`}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-[4px] border border-line-strong px-4 py-2.5 text-[13px] font-medium text-slate-200 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden /> Back to my workspace
        </button>
        {!disabled && (
          <button
            type="button"
            disabled={requested}
            onClick={() => {
              setRequested(true)
              log('Access requested', `${perms.roles.map((r) => roleDef(r).label).join(' + ')} requested ${item.label}`, 'warn')
              notify(`Access request for ${item.label} sent to workspace owners (demo).`, 'info')
            }}
            className="flex items-center gap-2 rounded-[4px] bg-nv px-4 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-[#0a1200] hover:brightness-110 disabled:opacity-60"
          >
            {requested ? <Check className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
            {requested ? 'Request sent' : 'Request access'}
          </button>
        )}
      </div>
      <p className="mt-8 flex items-center gap-2 text-[11.5px] text-slate-500">
        <ShieldAlert className="size-3.5" aria-hidden /> Hidden in the UI and — in production — rejected by the backend (HTTP 403).
      </p>
      <p className="mt-1 flex items-center gap-2 text-[11.5px] text-slate-600">
        <Clock className="size-3" aria-hidden /> Attempt recorded in the audit log.
      </p>
    </div>
  )
}

export const TONE = TONE_TEXT
