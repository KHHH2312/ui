import { Bell, Building, Check, ChevronDown, Cpu, LogOut, Menu, Search, Settings, Timer, User, UserCog, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ViewId } from '../../data/nav.ts'
import type { Member } from '../../lib/access.ts'
import { cx, fmtClock, fmtDate } from '../../lib/format.ts'
import { useNotify } from '../../lib/toast.ts'
import { useNow } from '../../lib/useNow.ts'
import type { Session } from '../../views/Login.tsx'
import type { Persona } from './Shell.tsx'
import { Logo } from '../ui/Logo.tsx'
import { StatusDot } from '../ui/primitives.tsx'

interface Props {
  session: Session
  onLogout: () => void
  onOpenPalette: () => void
  onToggleNav: () => void
  onNavigate: (v: ViewId) => void
  navOpen: boolean
  latencyMs: number
  mode: 'MOCK' | 'LIVE'
  acting: Member
  tenantName: string
  onSwitchCompany: () => void
  personas: Persona[] | null
  activePersona: string
  onPersona: (p: Persona) => void
  incidents: number
}

export function TopBar({ session, onLogout, onOpenPalette, onToggleNav, onNavigate, navOpen, latencyMs, mode, tenantName, onSwitchCompany, personas, activePersona, onPersona, incidents }: Props) {
  const now = useNow()
  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center gap-3 border-b border-line bg-void/85 px-3 backdrop-blur-md sm:px-4">
      <button
        type="button"
        onClick={onToggleNav}
        className="grid size-9 place-items-center rounded border border-line text-slate-300 hover:text-white lg:hidden"
        aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={navOpen}
        aria-controls="primary-nav"
      >
        {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      <button type="button" onClick={() => onNavigate('dashboard')} className="flex min-w-0 items-center gap-3 rounded text-left" aria-label="NEXUS home">
        <Logo />
        <span className="hidden min-w-0 shrink-0 sm:block">
          <span className="block font-mono text-[14px] font-semibold tracking-[0.2em] text-white">
            NEXUS <span className="text-slate-500">//</span> <span className="tracking-[0.12em] text-slate-200">OPS COCKPIT</span>
          </span>
          <span className="mt-0.5 block max-w-[260px] truncate text-[12px] text-slate-400">{tenantName}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={onOpenPalette}
        className="ml-auto flex h-9 items-center gap-2.5 rounded border border-line bg-panel/60 px-3 text-left text-sm text-slate-400 transition-colors hover:border-line-strong hover:text-slate-200 md:ml-4 md:w-[clamp(150px,16vw,300px)]"
        aria-label="Search assets, modules and commands"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="hidden flex-1 truncate md:block">Search assets, modules, commands…</span>
        <kbd className="hidden rounded border border-line-strong px-1.5 py-0.5 font-mono text-[10px] text-slate-400 md:block">⌘K</kbd>
      </button>

      <div className="ml-auto hidden items-center gap-2 xl:flex">
        <span className="flex h-8 items-center gap-2 whitespace-nowrap rounded border border-nv/40 bg-nv/[0.08] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-nv-bright" title="Inference node brev-a100-01">
          <StatusDot pulse /> Compute active · NVIDIA Brev
        </span>
      </div>
      <div className="hidden items-center gap-2 min-[1760px]:flex">
        <span className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded border border-line bg-panel/60 px-2.5 font-mono text-[12px] text-slate-200" title="Last inference latency">
          <Timer className="size-3.5 text-nv" aria-hidden />
          <span className="num font-semibold text-white">{latencyMs} ms</span>
        </span>
        <span className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded border border-line bg-panel/60 px-2.5 font-mono text-[12px] text-slate-200" title="Inference device">
          <Cpu className="size-3.5 text-nv" aria-hidden />A100 · 80GB
        </span>
        <span
          className={cx(
            'hidden h-8 items-center rounded border px-2 font-mono text-[11px] font-semibold tracking-[0.12em] 2xl:flex',
            mode === 'MOCK' ? 'border-info/35 text-info' : 'border-nv/40 text-nv-bright',
          )}
          title={mode === 'MOCK' ? 'USE_MOCK enabled — local demo data' : 'Live backend mode'}
        >
          {mode}
        </span>
      </div>

      <div className="hidden text-right xl:block xl:ml-2" aria-live="off">
        <time className="num block text-[14px] font-semibold leading-tight text-white" dateTime={now.toISOString()}>
          {fmtClock(now)}
        </time>
        <span className="hidden items-center justify-end gap-1.5 whitespace-nowrap text-[11px] text-slate-400 min-[1700px]:flex">
          <StatusDot className="size-1.5" /> {fmtDate(now)}
        </span>
      </div>

      {personas && <PersonaSwitcher personas={personas} active={activePersona} onPick={onPersona} />}
      <NotificationsButton incidents={incidents} />
      <ProfileMenu session={session} onLogout={onLogout} onSwitchCompany={onSwitchCompany} />
    </header>
  )
}

function NotificationsButton({ incidents }: { incidents: number }) {
  const notify = useNotify()
  return (
    <button
      type="button"
      onClick={() => notify(`${incidents} denied request(s) in the security incident log · 1 critical machinery alert (P-204).`, 'warn')}
      className="relative grid size-9 shrink-0 place-items-center rounded border border-line text-slate-300 hover:border-line-strong hover:text-white"
      aria-label={`Notifications: ${incidents} security incidents`}
    >
      <Bell className="size-4" aria-hidden />
      {incidents > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-crit font-mono text-[9px] font-bold text-white">{incidents}</span>}
    </button>
  )
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

/** Owner-only "Preview as" control — instantly switches persona for the demo (UX only). */
function PersonaSwitcher({ personas, active, onPick }: { personas: Persona[]; active: string; onPick: (p: Persona) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const current = personas.find((p) => p.key === active)
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx('flex h-9 items-center gap-2 rounded border px-2.5 text-[12.5px] font-medium', active === 'owner' ? 'border-line text-slate-200 hover:border-line-strong' : 'border-info/60 bg-info/10 text-info')}
      >
        <UserCog className="size-4" aria-hidden />
        <span className="hidden md:inline">View as:</span> {current?.label ?? 'Custom'}
        <ChevronDown className={cx('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="menu" aria-label="Preview as role" className="panel absolute right-0 top-11 w-72 animate-rise bg-panel p-1.5 shadow-2xl shadow-black/60">
          <p className="eyebrow px-3 pb-2 pt-2 text-[10px]">Owner-only · preview as persona</p>
          {personas.map((p) => (
            <button
              key={p.key}
              role="menuitemradio"
              aria-checked={p.key === active}
              type="button"
              onClick={() => {
                setOpen(false)
                onPick(p)
              }}
              className={cx('flex w-full items-center gap-3 rounded px-3 py-2 text-left', p.key === active ? 'bg-nv/10' : 'hover:bg-white/[0.05]')}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-white">{p.label}</span>
                <span className="block truncate text-[11.5px] text-slate-400">{p.sub}</span>
              </span>
              {p.key === active && <Check className="size-4 text-nv" aria-hidden />}
            </button>
          ))}
          <p className="px-3 pb-1 pt-2 text-[11px] text-slate-500">Changes what this browser shows. Real authorization happens in FastAPI.</p>
        </div>
      )}
    </div>
  )
}

function ProfileMenu({ session, onLogout, onSwitchCompany }: { session: Session; onLogout: () => void; onSwitchCompany: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const notify = useNotify()

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded border border-line pl-1 pr-2 hover:border-line-strong"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${session.name}`}
      >
        <span className="grid size-7 place-items-center rounded-[3px] bg-linear-to-br from-slate-600 to-slate-800 font-mono text-[11px] font-bold text-white">{session.initials}</span>
        <span className="hidden text-left 2xl:block">
          <span className="block text-[13px] font-medium leading-tight text-white">{session.name}</span>
          <span className="block text-[11px] leading-tight text-slate-400">{session.role}</span>
        </span>
        <ChevronDown className={cx('size-3.5 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="panel absolute right-0 top-11 w-64 animate-rise bg-panel p-1.5 shadow-2xl shadow-black/60">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="text-sm font-semibold text-white">{session.name}</p>
            <p className="text-xs text-slate-400">{session.email}</p>
            <p className="eyebrow mt-2 text-[10px] text-nv">{session.role}</p>
          </div>
          {[
            { icon: User, label: 'Profile & shift', msg: `${session.name} · Day shift 06:00–18:00 · on call for Loop 2` },
            { icon: Settings, label: 'Workspace settings', msg: 'Workspace: Plant A · 148 assets · gate policy v2.4 (read-only in demo)' },
          ].map(({ icon: Icon, label, msg }) => (
            <button
              key={label}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                notify(msg, 'info')
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.05]"
            >
              <Icon className="size-4 text-slate-400" aria-hidden /> {label}
            </button>
          ))}
          <button role="menuitem" type="button" onClick={onSwitchCompany} className="mt-1 flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.05]">
            <Building className="size-4 text-slate-400" aria-hidden /> Switch / join company
          </button>
          <button role="menuitem" type="button" onClick={onLogout} className="mt-1 flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-crit/10 hover:text-white">
            <LogOut className="size-4 text-slate-400" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
