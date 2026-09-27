import { Eye, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MODULES } from '../../data/modules.ts'
import { isModuleId, isViewId, type ViewId } from '../../data/nav.ts'
import { effectivePermissions, isOwnerLike, landingPage, roleDef, type Member, type RoleId, type UserId } from '../../lib/access.ts'
import type { Tone } from '../../lib/format.ts'
import { ToastContext, type ToastItem } from '../../lib/toast.ts'
import type { PresetId } from '../../lib/types.ts'
import { useDocProcessor } from '../../lib/useDocProcessor.ts'
import { useTriage } from '../../lib/useTriage.ts'
import { auditEvent, type KbDocument, type SecurityIncident, type Workspace } from '../../lib/workspace.ts'
import { WorkspaceContext, type WorkspaceCtx } from '../../lib/workspaceContext.ts'
import { ComingSoonGate } from '../../views/ComingSoon.tsx'
import { InventoryView, TransportationView } from '../../views/Logistics.tsx'
import type { Session } from '../../views/Login.tsx'
import { ModuleView } from '../../views/ModuleView.tsx'
import { ProcurementView } from '../../views/Procurement.tsx'
import { AccessDenied, DataPipelinesView, KnowledgeBaseView, SettingsView, TeamView } from '../../views/WorkspacePages.tsx'
import { CommandPalette } from './CommandPalette.tsx'
import { Sidebar } from './Sidebar.tsx'
import { Toaster } from './Toaster.tsx'
import { TopBar } from './TopBar.tsx'

// Secondary surfaces are code-split so the driver / procurement path loads less.
const Dashboard = lazy(() => import('../../views/Dashboard.tsx').then((m) => ({ default: m.Dashboard })))
const TriageView = lazy(() => import('../../views/TriageView.tsx').then((m) => ({ default: m.TriageView })))

function parseHash(): ViewId | null {
  const h = window.location.hash.replace(/^#\/?/, '')
  return isViewId(h) ? h : null
}

export interface NavActions {
  navigate: (v: ViewId) => void
  openTriage: (preset: PresetId, autoRun?: boolean) => void
}

export interface Persona {
  key: string
  label: string
  sub: string
  userId: UserId | null
  roles: RoleId[] | null
}

interface Props {
  session: Session
  ws: Workspace
  setWs: (fn: (w: Workspace) => Workspace) => void
  onLogout: () => void
  onSwitchCompany: () => void
}

export function Shell({ session, ws, setWs, onLogout, onSwitchCompany }: Props) {
  const triage = useTriage()
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const mainRef = useRef<HTMLElement>(null)
  const toastId = useRef(0)

  /* ---------------- identity & permissions (UX only) */
  const realMe: Member = ws.members.find((m) => m.userId === ws.currentUserId) ?? { userId: ws.currentUserId, name: session.name, email: session.email, roles: [], grants: [], status: 'active' }
  const realOwner = isOwnerLike(realMe.roles)
  const previewMember = ws.previewUserId ? ws.members.find((m) => m.userId === ws.previewUserId) : undefined
  // A driver-role preview acts as the seeded driver seat so "assigned deliveries" resolve.
  const seat = ws.members.find((m) => m.userId === 'usr_jlee')
  const presetBase: Member = ws.previewRoles?.includes('truck_driver') ? { ...(seat ?? { ...realMe, name: 'Driver (preview)' }), userId: 'usr_jlee' } : realMe
  const acting: Member = previewMember ?? (ws.previewRoles?.length ? { ...presetBase, roles: ws.previewRoles } : realMe)
  const perms = effectivePermissions(ws.tenant, acting, previewMember ? null : ws.previewRoles)

  const [view, setViewState] = useState<ViewId>(() => parseHash() ?? landingPage(perms))
  useEffect(() => {
    const onHash = () => {
      const v = parseHash()
      if (v) setViewState(v)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const notify = useCallback((message: string, tone: Tone = 'nv') => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const navigate = useCallback((v: ViewId) => {
    if (window.location.hash !== `#/${v}`) window.location.hash = `#/${v}`
    setViewState(v)
    setNavOpen(false)
    window.scrollTo({ top: 0 })
  }, [])

  const actorName = acting.email.split('@')[0] || acting.name
  const log = useCallback(
    (action: string, detail: string, tone: Tone = 'info') => setWs((w) => ({ ...w, audit: [auditEvent(actorName, action, detail, tone), ...w.audit].slice(0, 60) })),
    [setWs, actorName],
  )
  const recordIncident = useCallback(
    (i: SecurityIncident) =>
      setWs((w) => ({
        ...w,
        incidents: [i, ...w.incidents].slice(0, 50),
        audit: [auditEvent(actorName, 'Access denied (403)', `${i.requestedResource} · pre-retrieval · 0 chunks`, 'crit'), ...w.audit].slice(0, 60),
      })),
    [setWs, actorName],
  )

  // Simulated document processing continues across pages.
  const setDocs = useCallback((fn: (d: KbDocument[]) => KbDocument[]) => setWs((w) => ({ ...w, documents: fn(w.documents) })), [setWs])
  useDocProcessor(ws.documents, setDocs)

  const ctx: WorkspaceCtx = { ws, update: setWs, me: acting, actingUserId: acting.userId, realOwner, perms, log, recordIncident }

  /* ---------------- persona preview (owner-only UX) */
  const personas = useMemo<Persona[]>(() => {
    const find = (r: RoleId) => ws.members.find((m) => m.roles.includes(r) && m.userId !== realMe.userId)
    const driver = find('truck_driver')
    const buyer = find('procurement_manager')
    const arch = find('data_architect')
    return [
      { key: 'owner', label: 'Owner', sub: `${realMe.name} · you`, userId: null, roles: null },
      { key: 'driver', label: 'Driver', sub: driver ? `${driver.name}${driver.status === 'invited' ? ' · invited' : ''}` : 'role preset', userId: driver?.userId ?? null, roles: driver ? null : ['truck_driver'] },
      { key: 'procurement', label: 'Procurement', sub: buyer ? `${buyer.name}${buyer.status === 'invited' ? ' · invited' : ''}` : 'role preset', userId: buyer?.userId ?? null, roles: buyer ? null : ['procurement_manager'] },
      { key: 'architect', label: 'Data Architect', sub: arch ? `${arch.name} · optional preview` : 'optional architecture preview', userId: arch?.userId ?? null, roles: arch ? null : ['data_architect'] },
    ]
  }, [ws.members, realMe.userId, realMe.name])
  const activePersona = !ws.previewUserId && !ws.previewRoles ? 'owner' : (personas.find((p) => (p.userId && p.userId === ws.previewUserId) || (!p.userId && p.roles && ws.previewRoles?.join() === p.roles.join()))?.key ?? 'custom')

  const setPersona = (p: Persona) => {
    const next = { ...ws, previewUserId: p.userId, previewRoles: p.userId ? null : p.roles }
    setWs(() => next)
    if (p.key !== 'owner') log('Preview as role', `${realMe.name} previewing ${p.label} (UX only — backend authorizes real sessions)`)
    const m = p.userId ? next.members.find((x) => x.userId === p.userId)! : p.roles ? { ...(p.roles.includes('truck_driver') ? { ...realMe, userId: 'usr_jlee' as UserId } : realMe), roles: p.roles } : realMe
    const np = effectivePermissions(next.tenant, m, p.userId ? null : p.roles)
    navigate(landingPage(np))
  }

  /* ---------------- triage deep links */
  const { setPreset, preset, run, phase } = triage
  const openTriage = useCallback(
    (p: PresetId, runNow = false) => {
      navigate('triage')
      if (runNow) void run(p)
      else if (p !== preset || phase === 'idle') setPreset(p)
    },
    [navigate, setPreset, preset, phase, run],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const actions: NavActions = { navigate, openTriage }
  const allowed = perms.pages.has(view)

  const page = () => {
    if (!allowed) return <AccessDenied page={view} onBack={() => navigate(landingPage(perms))} />
    if (view === 'dashboard') return <Dashboard {...actions} />
    if (view === 'triage') return <TriageView triage={triage} />
    if (view === 'transportation') return <TransportationView />
    if (view === 'procurement') return <ProcurementView />
    if (view === 'knowledge') return <KnowledgeBaseView />
    if (view === 'data') return <DataPipelinesView />
    if (view === 'team') return <TeamView />
    if (view === 'settings') return <SettingsView />
    if (isModuleId(view)) return <ComingSoonGate module={view} preview={view === 'inventory' ? <InventoryView /> : <ModuleView config={MODULES[view]} {...actions} />} />
    return null
  }

  return (
    <WorkspaceContext.Provider value={ctx}>
      <ToastContext.Provider value={notify}>
        <a
          href="#main"
          onClick={(e) => {
            e.preventDefault()
            mainRef.current?.focus()
          }}
          className="sr-only z-[80] rounded bg-nv px-3 py-2 font-mono text-sm font-semibold text-black focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>
        <TopBar
          session={session}
          acting={acting}
          tenantName={ws.tenant.name}
          onLogout={onLogout}
          onSwitchCompany={onSwitchCompany}
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleNav={() => setNavOpen((o) => !o)}
          navOpen={navOpen}
          latencyMs={triage.outcome?.result.telemetry.latency_ms ?? 38}
          mode={triage.useMock ? 'MOCK' : 'LIVE'}
          onNavigate={navigate}
          personas={realOwner ? personas : null}
          activePersona={activePersona}
          onPersona={setPersona}
          incidents={ws.incidents.length}
        />
        {activePersona !== 'owner' && realOwner && (
          <div className="sticky top-[60px] z-30 flex items-center gap-3 border-b border-info/40 bg-[#0b1a26]/95 px-4 py-2 backdrop-blur" role="status">
            <Eye className="size-4 text-info" aria-hidden />
            <p className="min-w-0 flex-1 truncate text-[13px] text-slate-200">
              Previewing as <span className="font-semibold text-white">{acting.name}</span> · {perms.roles.map((r) => roleDef(r).label).join(' + ')} — navigation and data reflect this persona. UX preview only; the backend authorizes real sessions.
            </p>
            <button type="button" onClick={() => setPersona(personas[0])} className="flex items-center gap-1 rounded-[3px] px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-info ring-1 ring-info/40 hover:bg-info/10">
              <X className="size-3" aria-hidden /> Exit preview
            </button>
          </div>
        )}
        <div className="flex">
          <Sidebar view={view} onNavigate={navigate} open={navOpen} onClose={() => setNavOpen(false)} />
          <main id="main" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 outline-none">
            <div key={`${view}-${activePersona}`} className="animate-fade">
              <Suspense fallback={<p className="px-6 py-10 font-mono text-[12px] uppercase tracking-[0.14em] text-slate-500">Loading…</p>}>{page()}</Suspense>
            </div>
          </main>
        </div>
        {paletteOpen && <CommandPalette open onClose={() => setPaletteOpen(false)} allowed={perms.pages} {...actions} />}
        <Toaster toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      </ToastContext.Provider>
    </WorkspaceContext.Provider>
  )
}
