import { Check, ChevronDown, Copy, KeyRound, Minus, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { navItem, type ViewId } from '../../data/nav.ts'
import { effectivePermissions, newUserId, roleDef, ROLES, type Member, type RoleId, type Tenant } from '../../lib/access.ts'
import { cx } from '../../lib/format.ts'
import type { InviteCode } from '../../lib/workspace.ts'
import { Badge, Eyebrow } from '../ui/primitives.tsx'

export function RoleChips({ roles }: { roles: RoleId[] }) {
  if (!roles.length) return <span className="text-[12px] italic text-slate-500">No role assigned</span>
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <Badge key={r} tone={r === 'owner' || r === 'admin' ? 'nv' : 'info'} className="normal-case tracking-normal">
          {roleDef(r).label}
        </Badge>
      ))}
    </span>
  )
}

/** Multi-select role popover. Roles can be combined per user. */
export function RolePicker({ value, onChange, label, exclude = [] }: { value: RoleId[]; onChange: (r: RoleId[]) => void; label: string; exclude?: RoleId[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const toggle = (r: RoleId) => onChange(value.includes(r) ? value.filter((x) => x !== r) : [...value, r])
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex items-center gap-1.5 rounded-[3px] border border-line-strong px-2 py-1 text-[12px] text-slate-200 hover:border-slate-400"
      >
        Roles <span className="num text-slate-400">({value.length})</span>
        <ChevronDown className={cx('size-3 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="panel absolute right-0 top-8 z-30 w-72 animate-rise bg-panel p-1.5 shadow-2xl shadow-black/60" role="listbox" aria-multiselectable="true" aria-label={label}>
          {ROLES.filter((r) => !exclude.includes(r.id)).map((r) => {
            const on = value.includes(r.id)
            return (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => toggle(r.id)}
                className={cx('flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-left', on ? 'bg-nv/10' : 'hover:bg-white/[0.04]')}
              >
                <span className={cx('mt-0.5 grid size-4 shrink-0 place-items-center rounded-[3px] border', on ? 'border-nv bg-nv text-black' : 'border-line-strong')}>{on && <Check className="size-3" aria-hidden />}</span>
                <span>
                  <span className="block text-[13px] font-medium text-white">{r.label}</span>
                  <span className="block text-[11.5px] text-slate-400">{r.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface Props {
  tenant: Tenant
  members: Member[]
  setMembers?: (fn: (m: Member[]) => Member[]) => void
  onEvent?: (action: string, detail: string) => void
}

export function MembersPanel({ tenant, members, setMembers, onEvent }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<RoleId[]>([])
  const [error, setError] = useState<string | null>(null)
  const editable = !!setMembers

  const invite = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a name and a valid email.')
    if (!roles.length) return setError('Assign at least one role.')
    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) return setError('That person is already a member.')
    setMembers!((m) => [...m, { userId: newUserId(), name: name.trim(), email: email.trim(), roles, grants: [], status: 'invited' }])
    onEvent?.('Invite drafted', `${email.trim()} as ${roles.map((r) => roleDef(r).label).join(' + ')} (not sent — demo)`)
    setName('')
    setEmail('')
    setRoles([])
    setError(null)
  }

  const setMemberRoles = (m: Member, r: RoleId[]) => {
    setMembers!((all) => all.map((x) => (x.userId === m.userId ? { ...x, roles: r } : x)))
    onEvent?.('Role changed', `${m.name}: ${r.map((x) => roleDef(x).label).join(' + ') || 'no roles'}`)
  }

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-[5px] border border-line">
        <table className="w-full min-w-[620px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-deck/60">
              {['Member', 'Roles', 'Status', ''].map((h) => (
                <th key={h} scope="col" className="eyebrow px-3 py-2.5 text-[10px] font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-line/60 last:border-0">
                {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- cell text is in nested elements */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[3px] bg-slate-700 font-mono text-[11px] font-bold text-white">
                      {m.name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{m.name}</p>
                      <p className="truncate text-[11.5px] text-slate-500">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <RoleChips roles={m.roles} />
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={m.status === 'active' ? 'nv' : 'warn'}>{m.status}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {editable && !m.roles.includes('owner') && <RolePicker value={m.roles} onChange={(r) => setMemberRoles(m, r)} label={`Roles for ${m.name}`} exclude={['owner']} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <form onSubmit={invite} className="rounded-[5px] border border-line bg-deck/50 p-3" noValidate>
          <Eyebrow className="mb-2.5 flex items-center gap-1.5">
            <UserPlus className="size-3.5" aria-hidden /> Invite member · UI only, nothing is sent
          </Eyebrow>
          <div className="grid gap-2 md:grid-cols-[1fr_1.2fr_auto_auto]">
            <input aria-label="Invitee name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-[4px] border border-line-strong bg-deck px-3 py-2 text-[13px] text-white outline-none focus:border-nv/70" />
            <input aria-label="Invitee email" placeholder="name@company.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-[4px] border border-line-strong bg-deck px-3 py-2 text-[13px] text-white outline-none focus:border-nv/70" />
            <div className="flex items-center">
              <RolePicker value={roles} onChange={setRoles} label="Roles for new member" exclude={['owner']} />
            </div>
            <button type="submit" className="rounded-[4px] bg-nv px-3 py-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#0a1200] hover:brightness-110">
              Add invite
            </button>
          </div>
          {roles.length > 0 && (
            <div className="mt-2">
              <RoleChips roles={roles} />
            </div>
          )}
          {error && (
            <p role="alert" className="mt-2 text-[12px] text-crit">
              {error}
            </p>
          )}
        </form>
      )}

      <PermissionMatrix tenant={tenant} members={members} />
    </div>
  )
}

/** Members × pages, derived from roles ∪ grants ∩ enabled modules. Preview only — backend decides. */
export function PermissionMatrix({ tenant, members }: { tenant: Tenant; members: Member[] }) {
  const cols: ViewId[] = ['dashboard', ...tenant.enabledModules, ...(tenant.enabledModules.includes('manufacturing') ? (['triage'] as ViewId[]) : []), 'knowledge', 'data', 'team', 'settings']
  const short = (v: ViewId) =>
    ({ dashboard: 'Dash', triage: 'Triage', manufacturing: 'Mfg', inventory: 'Inv', procurement: 'Proc', warehousing: 'Whse', distribution: 'Dist', transportation: 'Trans', crm: 'CRM', it: 'IT', knowledge: 'KB', data: 'Data', team: 'Team', settings: 'Settings' })[v]
  return (
    <section aria-label="Module permission matrix">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <Eyebrow>Module permission matrix</Eyebrow>
        <span className="text-[11.5px] text-slate-500">UX preview — enforced server-side</span>
      </div>
      <div className="overflow-x-auto rounded-[5px] border border-line">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-line bg-deck/60">
              <th scope="col" className="eyebrow sticky left-0 bg-deck px-3 py-2 text-left text-[10px] font-medium">
                Member
              </th>
              {cols.map((c) => (
                <th key={c} scope="col" title={navItem(c).label} className="px-2 py-2 text-center font-mono text-[10.5px] font-medium text-slate-400">
                  {short(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const p = effectivePermissions({ ...tenant }, m)
              return (
                <tr key={m.userId} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="sticky left-0 whitespace-nowrap bg-panel px-3 py-2 text-left font-medium text-slate-200">
                    {m.name}
                  </th>
                  {cols.map((c) => (
                    <td key={c} className="px-2 py-2 text-center">
                      {p.pages.has(c) ? <Check className="mx-auto size-3.5 text-nv" aria-label="allowed" /> : <Minus className="mx-auto size-3.5 text-slate-700" aria-label="no access" />}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Owner generates invitation codes (mock of POST /invites). Codes are redeemable after signing in as another user. */
export function InviteCodesPanel({ invites, onGenerate }: { invites: InviteCode[]; onGenerate: (roles: RoleId[]) => void }) {
  const [roles, setRoles] = useState<RoleId[]>(['truck_driver'])
  const [copied, setCopied] = useState<string | null>(null)
  const presets: Array<{ label: string; roles: RoleId[] }> = [
    { label: 'Driver', roles: ['truck_driver'] },
    { label: 'Procurement', roles: ['procurement_manager'] },
  ]
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1400)
    } catch {
      setCopied(null)
    }
  }
  return (
    <section className="rounded-[5px] border border-nv/35 bg-nv/[0.04] p-4" aria-label="Invitation codes">
      <Eyebrow className="mb-3 flex items-center gap-1.5 text-nv">
        <KeyRound className="size-3.5" aria-hidden /> Invitation codes
      </Eyebrow>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => {
          const on = p.roles.join() === roles.join()
          return (
            <button key={p.label} type="button" aria-pressed={on} onClick={() => setRoles(p.roles)} className={cx('rounded-[3px] px-2.5 py-1 text-[12.5px] ring-1', on ? 'bg-nv/15 text-nv-bright ring-nv/50' : 'text-slate-300 ring-line-strong hover:text-white')}>
              {p.label}
            </button>
          )
        })}
        <RolePicker value={roles} onChange={setRoles} label="Roles for invitation code" exclude={['owner']} />
        <button
          type="button"
          disabled={!roles.length}
          onClick={() => onGenerate(roles)}
          className="ml-auto rounded-[4px] bg-nv px-3 py-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#0a1200] hover:brightness-110 disabled:opacity-40"
        >
          Generate code
        </button>
      </div>
      {invites.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {invites.map((i) => (
            <li key={i.code} className="flex flex-wrap items-center gap-3 rounded-[4px] border border-line bg-deck/70 px-3 py-2">
              <span className="num text-[15px] font-semibold tracking-[0.06em] text-white">{i.code}</span>
              <RoleChips roles={i.roles} />
              <span className="ml-auto text-[11.5px] text-slate-500">{i.usedBy ? `redeemed by ${i.usedBy}` : 'unused'}</span>
              <button type="button" onClick={() => void copy(i.code)} className="flex items-center gap-1 rounded-[3px] px-2 py-1 text-[11.5px] text-slate-300 ring-1 ring-line-strong hover:text-white" aria-label={`Copy ${i.code}`}>
                {copied === i.code ? <Check className="size-3 text-nv" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                {copied === i.code ? 'Copied' : 'Copy'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11.5px] text-slate-500">Demo: codes live in this browser's local mock store. Sign out, sign in as another email, choose “Join a company”, and paste the code.</p>
    </section>
  )
}
