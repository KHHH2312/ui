import { ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Logo } from '../components/ui/Logo.tsx'
import { Badge, Eyebrow, StatusDot } from '../components/ui/primitives.tsx'
import { cx, delay } from '../lib/format.ts'
import { prefersReducedMotion } from '../lib/useNow.ts'

export interface Session {
  name: string
  email: string
  role: string
  initials: string
}

const DEMO_CREDENTIALS = { email: 'operator@nexus-demo.io', password: 'brev-a100' }

const DEMO_SESSION: Session = { name: 'Alex Moreno', email: DEMO_CREDENTIALS.email, role: 'Reliability Lead · Plant A', initials: 'AM' }

function sessionFor(email: string): Session {
  if (email.toLowerCase() === DEMO_CREDENTIALS.email) return DEMO_SESSION
  const local = email.split('@')[0] ?? 'operator'
  const parts = local.split(/[._-]+/).filter(Boolean)
  const name = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') || 'Operator'
  const initials = (parts[0]?.[0] ?? 'O').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
  return { name, email, role: 'Operations · Plant A', initials }
}

export function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email)
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password)
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null)

  const enter = async (session: Session, mode: 'form' | 'demo') => {
    setBusy(mode)
    await delay(prefersReducedMotion() ? 0 : 520)
    onLogin(session)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid work email address.')
    if (password.length < 4) return setError('Password must be at least 4 characters.')
    setError(null)
    void enter(sessionFor(email.trim()), 'form')
  }

  return (
    <main className="relative grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Brand / narrative side */}
      <section className="scanlines relative hidden flex-col justify-between overflow-hidden border-r border-line px-12 py-10 lg:flex" aria-label="NEXUS overview">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-mono text-[15px] font-semibold tracking-[0.18em] text-white">NEXUS</p>
            <p className="eyebrow mt-1">Factory Operations Platform</p>
          </div>
        </div>

        <div className="max-w-xl animate-rise">
          <Badge tone="nv" dot className="mb-6">Autonomous triage &amp; mitigation</Badge>
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-tight text-white">
            From passive alerts
            <br />
            to <span className="text-nv">active protection.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-slate-300">
            NEXUS watches every turbine, pump and compressor, validates each AI diagnosis against deterministic ISO limits, then
            issues a safe PLC/SCADA mitigation and a maintenance work order — keeping production running instead of tripping it.
          </p>
          <PlantSchematic />
        </div>

        <dl className="grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
          {[
            ['148', 'assets monitored'],
            ['38 ms', 'inference · A100'],
            ['41.5 h', 'downtime avoided MTD'],
          ].map(([v, l]) => (
            <div key={l} className="bg-void/90 px-4 py-3">
              <dt className="eyebrow">{l}</dt>
              <dd className="num mt-2 text-xl font-semibold text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Auth side */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px] animate-rise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <p className="font-mono text-[15px] font-semibold tracking-[0.18em] text-white">NEXUS</p>
          </div>

          <div className="panel brackets p-7">
            <Eyebrow>Plant A · Secure workspace</Eyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Sign in to the operations cockpit</h2>
            <p className="mt-2 text-sm text-slate-400">Demo environment — authentication is simulated locally.</p>

            <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
              <Field id="email" label="Work email" icon={<Mail className="size-4" aria-hidden />}>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent py-2.5 pr-3 text-[15px] text-white outline-none placeholder:text-slate-500"
                  placeholder="name@company.com"
                  aria-invalid={error?.includes('email') || undefined}
                />
              </Field>
              <Field id="password" label="Password" icon={<Lock className="size-4" aria-hidden />}>
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-slate-500"
                  placeholder="••••••••"
                  aria-invalid={error?.includes('Password') || undefined}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="mr-1 rounded p-1.5 text-slate-400 hover:text-white"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </Field>

              <p role="alert" className={cx('min-h-5 text-sm text-crit', !error && 'invisible')}>
                {error ?? '—'}
              </p>

              <button
                type="submit"
                disabled={busy !== null}
                className="group flex w-full items-center justify-center gap-2 rounded-[4px] border border-line-strong bg-white/[0.04] px-4 py-3 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:border-slate-400 hover:bg-white/[0.07] disabled:opacity-60"
              >
                {busy === 'form' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
                {busy === 'form' ? 'Authenticating…' : 'Sign in'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              <span className="eyebrow text-[10px]">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              onClick={() => void enter(DEMO_SESSION, 'demo')}
              disabled={busy !== null}
              className="glow-nv group flex w-full items-center justify-center gap-2 rounded-[4px] bg-nv px-4 py-3.5 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-[#0a1200] transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:opacity-70"
            >
              {busy === 'demo' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
              {busy === 'demo' ? 'Opening workspace…' : 'Enter demo workspace'}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>

            <div className="mt-6 rounded-[4px] border border-dashed border-line-strong px-3.5 py-3 text-xs text-slate-400">
              <p className="eyebrow mb-2 text-[10px]">Demo credentials</p>
              <p className="num text-slate-300">
                {DEMO_CREDENTIALS.email} <span className="text-slate-500">/</span> {DEMO_CREDENTIALS.password}
              </p>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <StatusDot pulse /> Compute online · NVIDIA Brev A100-80GB
          </p>
        </div>
      </section>
    </main>
  )
}

function Field({ id, label, icon, children }: { id: string; label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block">
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-[4px] border border-line-strong bg-deck/80 pl-3 transition-colors focus-within:border-nv/70 focus-within:shadow-[0_0_0_3px_rgb(118_185_0/0.12)]">
        <span className="text-slate-500">{icon}</span>
        {children}
      </div>
    </div>
  )
}

/** Animated closed-loop schematic: assets → GPU engine → gate → PLC. Decorative. */
function PlantSchematic() {
  const nodes = [
    { x: 40, label: 'SENSORS', sub: 'vib · P · T · τ' },
    { x: 180, label: 'NEURAL', sub: 'Brev A100' },
    { x: 320, label: 'GATE', sub: 'ISO 10816-3' },
    { x: 460, label: 'ACTION', sub: 'PLC · CMMS' },
  ]
  return (
    <svg viewBox="0 0 500 150" className="mt-10 w-full max-w-xl" role="img" aria-label="Closed loop: sensors to neural engine to standards gate to action, feeding back to the asset">
      <defs>
        <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#76b900" />
        </marker>
      </defs>
      {nodes.slice(0, -1).map((n, i) => (
        <line key={n.label} x1={n.x + 34} y1={52} x2={nodes[i + 1].x - 36} y2={52} stroke="#76b900" strokeWidth="1.5" strokeDasharray="4 4" className="animate-dash" markerEnd="url(#arr)" />
      ))}
      <path d="M460 86 V122 H40 V86" fill="none" stroke="#334155" strokeWidth="1.2" strokeDasharray="3 5" className="animate-dash" markerEnd="url(#arr)" />
      <text x="250" y="140" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono Variable, monospace" letterSpacing="2">
        CLOSED-LOOP FEEDBACK · PRODUCTION KEEPS RUNNING
      </text>
      {nodes.map((n, i) => (
        <g key={n.label}>
          <rect x={n.x - 34} y={24} width={68} height={58} rx={4} fill="#0b1018" stroke={i === 2 ? '#76b900' : '#2b3a52'} />
          <text x={n.x} y={50} textAnchor="middle" fill="#e2e8f0" fontSize="10.5" fontWeight="600" fontFamily="JetBrains Mono Variable, monospace" letterSpacing="1.5">
            {n.label}
          </text>
          <text x={n.x} y={67} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono Variable, monospace">
            {n.sub}
          </text>
          <circle cx={n.x + 26} cy={32} r={2.5} fill="#76b900" className="animate-pulse" />
        </g>
      ))}
    </svg>
  )
}
