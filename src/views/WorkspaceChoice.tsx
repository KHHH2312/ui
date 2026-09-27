import { ArrowLeft, ArrowRight, Building, CircleCheck, KeyRound, LogOut, Rocket, Sparkles, Users } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { RoleChips } from '../components/workspace/MembersPanel.tsx'
import { Logo } from '../components/ui/Logo.tsx'
import { Badge, Eyebrow } from '../components/ui/primitives.tsx'
import { navItem } from '../data/nav.ts'
import { roleDef } from '../lib/access.ts'
import { joinWithCode, lookupInvite, membershipsFor, openDemoCompany, openMembership, previewPages } from '../lib/mockDb.ts'
import { DEMO_INVITES, type InviteCode, type Workspace } from '../lib/workspace.ts'
import type { Session } from './Login.tsx'

interface Props {
  session: Session
  onEnter: (ws: Workspace) => void
  onSetup: () => void
  onLogout: () => void
}

export function WorkspaceChoice({ session, onEnter, onSetup, onLogout }: Props) {
  const [mode, setMode] = useState<'choose' | 'join'>('choose')
  const memberships = membershipsFor(session.email)
  return (
    <main className="mx-auto flex min-h-screen max-w-[1180px] flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-mono text-[14px] font-semibold tracking-[0.18em] text-white">NEXUS</p>
            <p className="eyebrow mt-1 text-[10px]">Company workspaces</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-right sm:block">
            <span className="block text-[13px] text-white">{session.name}</span>
            <span className="block text-[11.5px] text-slate-400">{session.email}</span>
          </span>
          <button type="button" onClick={onLogout} className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-[12px] text-slate-300 hover:text-white" aria-label="Sign out">
            <LogOut className="size-3.5" aria-hidden /> Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        {mode === 'choose' ? (
          <div className="animate-rise">
            <Eyebrow>Step 1 · Choose a path</Eyebrow>
            <h1 className="mt-3 text-[32px] font-semibold tracking-tight text-white">Welcome, {session.name.split(' ')[0]}. Where are you working today?</h1>
            <p className="mt-2 max-w-2xl text-[15px] text-slate-400">Each company is an isolated tenant with its own modules, knowledge base, data sources and roles.</p>

            {memberships.length > 0 && (
              <div className="mt-6">
                <Eyebrow className="mb-2">Your companies</Eyebrow>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {memberships.map((m) => (
                    <li key={m.tenantId}>
                      <button
                        type="button"
                        onClick={() => {
                          const w = openMembership(m.tenantId, session.email)
                          if (w) onEnter(w)
                        }}
                        className="panel flex w-full items-center gap-3 px-4 py-3 text-left hover:border-nv/60"
                      >
                        <Building className="size-4 shrink-0 text-nv" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-white">{m.tenantName}</span>
                          <span className="block truncate text-[12px] text-slate-400">{m.roles.map((r) => roleDef(r).label).join(' + ')}</span>
                        </span>
                        <ArrowRight className="size-4 text-slate-500" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <ChoiceCard
                icon={<Users className="size-5" aria-hidden />}
                eyebrow="Invitation"
                title="Join a company"
                body="Enter an invite code or paste an invite link. You'll see the company and the roles you're being granted before you join."
                bullets={['Role-scoped navigation', 'Only the modules you were granted', 'Owner can adjust roles later']}
                cta="Join with invite"
                onClick={() => setMode('join')}
              />
              <ChoiceCard
                primary
                icon={<Building className="size-5" aria-hidden />}
                eyebrow="Owner onboarding"
                title="Set up your company"
                body="Create the workspace: profile, supply-chain scope, knowledge base, data architecture, and team access — in five guided steps."
                bullets={['Pick from 8 supply-chain domains', 'Index PDFs for RAG (simulated)', 'Bronze → Silver → Gold mappings']}
                cta="Start setup"
                onClick={onSetup}
              />
            </div>

            <button type="button" onClick={() => onEnter(openDemoCompany(session.name, session.email))} className="mt-6 flex items-center gap-2 text-[13px] text-slate-400 hover:text-nv">
              <Sparkles className="size-3.5" aria-hidden /> Skip — open the pre-configured demo company (Acme Process Industries, all modules)
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <JoinFlow session={session} onBack={() => setMode('choose')} onEnter={onEnter} />
        )}
      </div>
      <p className="text-center text-[11.5px] text-slate-500">Demo workspace flows run entirely on local mock state — no invitations are sent and no data leaves the browser.</p>
    </main>
  )
}

function ChoiceCard(p: { icon: ReactNode; eyebrow: string; title: string; body: string; bullets: string[]; cta: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={p.onClick}
      className={
        'panel brackets group flex flex-col p-6 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 ' +
        (p.primary ? 'border-nv/40 hover:border-nv/70 hover:shadow-[0_0_40px_-12px_rgb(118_185_0/0.6)]' : 'hover:border-slate-500')
      }
    >
      <span className={'grid size-11 place-items-center rounded-[5px] border ' + (p.primary ? 'border-nv/50 bg-nv/10 text-nv' : 'border-line-strong text-slate-200')}>{p.icon}</span>
      <Eyebrow className="mt-5">{p.eyebrow}</Eyebrow>
      <span className="mt-2 text-[22px] font-semibold tracking-tight text-white">{p.title}</span>
      <span className="mt-2 text-[14px] leading-relaxed text-slate-400">{p.body}</span>
      <ul className="mt-4 space-y-1.5">
        {p.bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-[13px] text-slate-300">
            <CircleCheck className="size-3.5 text-nv" aria-hidden /> {b}
          </li>
        ))}
      </ul>
      <span className={'mt-6 inline-flex items-center gap-2 self-start rounded-[4px] px-4 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] ' + (p.primary ? 'bg-nv text-[#0a1200]' : 'border border-line-strong text-white')}>
        {p.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </button>
  )
}

function JoinFlow({ session, onBack, onEnter }: { session: Session; onBack: () => void; onEnter: (ws: Workspace) => void }) {
  const [code, setCode] = useState('')
  const [found, setFound] = useState<{ invite: InviteCode; ws: Workspace | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const check = (e?: FormEvent, value = code) => {
    e?.preventDefault()
    const f = lookupInvite(value)
    setFound(f)
    setError(f ? null : 'Invite not recognized. Codes are case-insensitive — use a code your owner generated, or a demo code below.')
  }

  const tenantName = found?.ws?.tenant.name ?? 'Acme Process Industries'
  const pages = found ? previewPages(found.ws, found.invite.roles) : []
  const join = () => {
    const r = joinWithCode(code, session.name, session.email)
    if (r) onEnter(r.ws)
    else setError('This invite could not be redeemed.')
  }

  return (
    <div className="mx-auto w-full max-w-2xl animate-rise">
      <button type="button" onClick={onBack} className="mb-5 flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white">
        <ArrowLeft className="size-3.5" aria-hidden /> Back
      </button>
      <div className="panel p-6">
        <Eyebrow>Join a company workspace</Eyebrow>
        <h1 className="mt-2 text-[24px] font-semibold text-white">Enter your invitation code or link</h1>
        <form onSubmit={check} className="mt-5 flex gap-2">
          <div className="flex flex-1 items-center gap-2.5 rounded-[4px] border border-line-strong bg-deck/80 pl-3 focus-within:border-nv/70">
            <KeyRound className="size-4 text-slate-500" aria-hidden />
            <input
              aria-label="Invitation code or link"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ACME-DRV-7K2Q or https://…/join?code=…"
              className="num w-full bg-transparent py-2.5 pr-3 text-[14px] text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <button type="submit" className="rounded-[4px] border border-line-strong px-4 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-slate-400">
            Check
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
          Demo codes:
          {DEMO_INVITES.map((i) => (
            <button
              key={i.code}
              type="button"
              onClick={() => {
                setCode(i.code)
                check(undefined, i.code)
              }}
              className="num rounded-[3px] border border-line px-2 py-0.5 text-slate-300 hover:border-nv/60 hover:text-nv"
            >
              {i.code}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-warn">
            {error}
          </p>
        )}

        {found && (
          <div className="mt-6 animate-rise rounded-[5px] border border-nv/40 bg-nv/[0.05] p-4" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Eyebrow className="text-nv">Invitation found · local mock of POST /invites/accept</Eyebrow>
                <p className="mt-2 text-[19px] font-semibold text-white">{tenantName}</p>
                <p className="text-[13px] text-slate-400">
                  Code <span className="num text-slate-200">{found.invite.code}</span> · issued by {found.invite.createdBy}
                </p>
              </div>
              <Badge tone="nv" dot>
                Valid
              </Badge>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="eyebrow mb-2 text-[10px]">Your roles</p>
                <RoleChips roles={found.invite.roles} />
              </div>
              <div>
                <p className="eyebrow mb-2 text-[10px]">You will see</p>
                <p className="flex flex-wrap gap-1">
                  {pages.map((p) => (
                    <Badge key={p} tone="neutral" className="normal-case tracking-normal">
                      {navItem(p).label}
                    </Badge>
                  ))}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={join}
              className="glow-nv mt-5 flex w-full items-center justify-center gap-2 rounded-[4px] bg-nv px-4 py-3 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-[#0a1200] hover:brightness-110"
            >
              <Rocket className="size-4" aria-hidden /> Join {tenantName}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
