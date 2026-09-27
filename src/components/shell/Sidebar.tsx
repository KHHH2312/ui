import { useEffect, type ReactNode } from 'react'
import { MODULE_HEALTH } from '../../data/fleet.ts'
import { MODULE_NAV, PRIMARY_NAV, WORKSPACE_NAV, type NavItem, type ViewId } from '../../data/nav.ts'
import { IMPLEMENTED_MODULES, roleDef } from '../../lib/access.ts'
import { useWorkspace } from '../../lib/workspaceContext.ts'
import { cx } from '../../lib/format.ts'
import { useMediaQuery } from '../../lib/useNow.ts'
import { Eyebrow, Meter, StatusDot } from '../ui/primitives.tsx'

interface Props {
  view: ViewId
  onNavigate: (v: ViewId) => void
  open: boolean
  onClose: () => void
}

export function Sidebar({ view, onNavigate, open, onClose }: Props) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const { perms, me, ws } = useWorkspace()
  const primary = PRIMARY_NAV.filter((n) => perms.pages.has(n.id))
  const modules = MODULE_NAV.filter((n) => perms.pages.has(n.id)).sort((a, b) => Number(IMPLEMENTED_MODULES.includes(b.id)) - Number(IMPLEMENTED_MODULES.includes(a.id)))
  const workspace = WORKSPACE_NAV.filter((n) => perms.pages.has(n.id))
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={cx('fixed inset-0 top-[60px] z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      <nav
        id="primary-nav"
        aria-label="Primary"
        inert={!desktop && !open}
        className={cx(
          'fixed bottom-0 left-0 top-[60px] z-30 flex w-[260px] flex-col border-r border-line bg-void/95 backdrop-blur-md transition-transform duration-300',
          'lg:sticky lg:z-10 lg:h-[calc(100vh-60px)] lg:w-[256px] lg:translate-x-0 lg:bg-void/60',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 rounded-[4px] border border-line bg-panel/50 px-2.5 py-2">
            <p className="truncate text-[12.5px] font-medium text-white">{me.name}</p>
            <p className="truncate text-[11px] text-slate-400">{perms.roles.map((r) => roleDef(r).label).join(' + ') || 'No role'} · {ws.tenant.name}</p>
          </div>
          {primary.length > 0 && <Eyebrow className="px-2.5 pb-2.5">Command</Eyebrow>}
          <ul className="space-y-0.5">
            {primary.map((item) => (
              <li key={item.id}>
                <NavButton item={item} active={view === item.id} onClick={() => onNavigate(item.id)}>
                  {item.id === 'triage' ? (
                    <span className="rounded-[3px] border border-info/40 px-1 py-0.5 font-mono text-[9.5px] font-semibold text-info">PREVIEW</span>
                  ) : (
                    <span className="num text-[11px] text-slate-500">148</span>
                  )}
                </NavButton>
              </li>
            ))}
          </ul>

          {modules.length > 0 && <Eyebrow className="px-2.5 pb-2.5 pt-6">Supply-chain modules</Eyebrow>}
          <ul className="space-y-0.5">
            {modules.map((item) => {
              const live = IMPLEMENTED_MODULES.includes(item.id)
              const h = MODULE_HEALTH.find((m) => m.id === item.id)
              return (
                <li key={item.id}>
                  <NavButton item={item} active={view === item.id} onClick={() => onNavigate(item.id)}>
                    {live ? h && <StatusDot tone={h.tone} className="size-1.5" /> : <span className="font-mono text-[9.5px] font-semibold text-slate-500">SOON</span>}
                  </NavButton>
                </li>
              )
            })}
          </ul>
          {workspace.length > 0 && <Eyebrow className="px-2.5 pb-2.5 pt-6">Workspace</Eyebrow>}
          <ul className="space-y-0.5">
            {workspace.map((item) => (
              <li key={item.id}>
                <NavButton item={item} active={view === item.id} onClick={() => onNavigate(item.id)}>
                  {item.id === 'data' && ws.incidents.length > 0 && <span className="num rounded-[3px] bg-crit/20 px-1 text-[10px] font-bold text-[#ff8a8c]">{ws.incidents.length}</span>}
                </NavButton>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-line p-3">
          <div className="rounded-[5px] border border-line bg-panel/70 p-3">
            <div className="flex items-center justify-between">
              <Eyebrow className="text-[10px]">Inference node</Eyebrow>
              <StatusDot pulse />
            </div>
            <p className="num mt-2 text-[13px] font-medium text-white">brev-a100-01</p>
            <p className="text-[11px] text-slate-400">NVIDIA A100-SXM4 · 80 GB</p>
            <div className="mt-3 space-y-2">
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                  <span>GPU util</span>
                  <span className="num text-slate-200">63%</span>
                </div>
                <Meter value={0.63} label="GPU utilization" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                  <span>VRAM</span>
                  <span className="num text-slate-200">23.4 / 80 GB</span>
                </div>
                <Meter value={23.4 / 80} tone="info" label="GPU memory used" />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

function NavButton({ item, active, onClick, children }: { item: NavItem; active: boolean; onClick: () => void; children?: ReactNode }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={item.hint}
      className={cx(
        'group relative flex w-full items-center gap-3 rounded-[4px] px-2.5 py-2 text-left text-[13.5px] transition-colors',
        active ? 'bg-nv/[0.09] text-white' : 'text-slate-300 hover:bg-white/[0.04] hover:text-white',
      )}
    >
      <span className={cx('absolute inset-y-1.5 left-0 w-[2px] rounded-full transition-colors', active ? 'bg-nv shadow-[0_0_8px_#76b900]' : 'bg-transparent')} aria-hidden />
      <Icon className={cx('size-[17px] shrink-0', active ? 'text-nv' : 'text-slate-400 group-hover:text-slate-200')} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {children}
    </button>
  )
}
