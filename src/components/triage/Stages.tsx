import { Activity, BrainCircuit, ChevronRight, CircleCheck, LoaderCircle, Scale, Send, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Fragment } from 'react'
import { cx } from '../../lib/format.ts'
import { presetMeta } from '../../lib/presets.ts'
import type { PresetId } from '../../lib/types.ts'
import { PIPELINE_STAGES } from '../../lib/useTriage.ts'
import { Eyebrow } from '../ui/primitives.tsx'

const ICONS = [Activity, BrainCircuit, Scale, Send]

/** Sensor telemetry → Neural anomaly engine → Physics & standards gate → Action generator. */
export function PipelineStrip({ stage, gateState }: { stage: number; gateState?: 'validating' | 'authorized' | 'clear' }) {
  return (
    <ol className="panel grid grid-cols-2 gap-px overflow-hidden bg-line p-0 md:flex md:items-stretch md:gap-0 md:bg-panel/70" aria-label="Triage pipeline">
      {PIPELINE_STAGES.map((s, i) => {
        const done = stage > i
        const active = stage === i
        const Icon = ICONS[i]
        const isGate = s.key === 'gate'
        return (
          <Fragment key={s.key}>
            <li
              className={cx('relative flex min-w-0 flex-1 items-center gap-3 bg-panel px-3.5 py-3 md:bg-transparent', active && 'bg-nv/[0.06] md:bg-nv/[0.06]')}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cx(
                  'grid size-9 shrink-0 place-items-center rounded-[4px] border transition-colors duration-300',
                  done ? 'border-nv/60 bg-nv/15 text-nv' : active ? 'border-nv text-nv shadow-[0_0_16px_-2px_rgb(118_185_0/0.7)]' : 'border-line-strong text-slate-500',
                )}
              >
                {active ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Icon className="size-4" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="num block text-[10px] tracking-[0.14em] text-slate-500">STAGE {String(i + 1).padStart(2, '0')}</span>
                <span className={cx('block text-[13px] font-medium leading-snug', done || active ? 'text-white' : 'text-slate-400')}>{s.label}</span>
                <span className="block text-[11px] leading-snug text-slate-500">
                  {isGate && done && gateState ? (gateState === 'validating' ? 'Validating limits…' : gateState === 'authorized' ? 'Intervention authorized' : 'All limits PASS') : s.detail}
                </span>
              </span>
              {done && <CircleCheck className="ml-auto hidden size-4 shrink-0 text-nv min-[1700px]:block" aria-label="complete" />}
              {active && <span className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-nv/20"><span className="block h-full w-1/2 animate-slide bg-nv" /></span>}
            </li>
            {i < PIPELINE_STAGES.length - 1 && (
              <li aria-hidden className="hidden items-center text-slate-600 md:flex">
                <ChevronRight className={cx('size-4', stage > i && 'text-nv')} />
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}

export function EmptyState({ preset }: { preset: PresetId }) {
  const meta = presetMeta(preset)
  return (
    <div className="panel scanlines relative flex flex-col items-center overflow-hidden px-6 py-10 text-center">
      <Reticle />
      <Eyebrow className="mt-8 text-nv">Awaiting telemetry window</Eyebrow>
      <h2 className="mt-3 text-[24px] font-semibold tracking-tight text-white">
        Ready to triage <span className="num text-nv">{meta.assetId}</span> · {meta.label}
      </h2>
      <p className="mt-2 max-w-lg text-[14px] text-slate-400">
        Pick a scenario, tune the threshold, then press <span className="font-mono text-slate-200">RUN ANALYSIS</span>. NEXUS scores the window on the GPU, validates the
        diagnosis against deterministic ISO limits and generates a safe, simulated PLC command plus a work order.
      </p>

      <div className="mt-8 grid w-full max-w-3xl gap-3 text-left md:grid-cols-2">
        <div className="rounded-[5px] border border-line bg-deck/70 p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-warn">
            <TriangleAlert className="size-3.5" aria-hidden /> Traditional monitoring
          </p>
          <p className="mt-2 text-[13.5px] text-slate-300">Threshold alarm fires late → operator trips the machine → production stops and nobody knows the root cause yet.</p>
        </div>
        <div className="rounded-[5px] border border-nv/40 bg-nv/[0.05] p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-nv">
            <ShieldCheck className="size-3.5" aria-hidden /> NEXUS closed loop
          </p>
          <p className="mt-2 text-[13.5px] text-slate-300">Early detection → physics-validated intervention → production keeps running safely while maintenance is scheduled.</p>
        </div>
      </div>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">From passive alerts to active protection</p>
    </div>
  )
}

function Reticle() {
  return (
    <div className="relative size-[200px]" aria-hidden>
      <div className="absolute inset-0 rounded-full border border-line-strong" />
      <div className="absolute inset-4 animate-spin-slow rounded-full border border-dashed border-nv/40" />
      <div className="absolute inset-9 animate-spin-rev rounded-full border-2 border-transparent border-t-nv/80 border-r-nv/20" />
      <div className="absolute inset-[62px] rounded-full border border-nv/50 shadow-[0_0_30px_-4px_rgb(118_185_0/0.6)]" />
      <div className="absolute inset-0 animate-spin-slow rounded-full [background:conic-gradient(from_0deg,rgb(118_185_0/0.22),transparent_18%)]" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-linear-to-b from-transparent via-nv/40 to-transparent" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-linear-to-r from-transparent via-nv/40 to-transparent" />
      <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 animate-pulse-dot rounded-full bg-nv" />
      {[0, 90, 180, 270].map((deg) => (
        <span key={deg} className="absolute left-1/2 top-1/2 h-3 w-px bg-slate-400" style={{ transform: `rotate(${deg}deg) translateY(-104px)` }} />
      ))}
    </div>
  )
}

const LOG = [
  'Opening OPC UA subscription · 4 channels',
  'Uploading 64-min window to brev-a100-01',
  'Temporal transformer forward pass (FP16)',
  'Evaluating ISO 10816-3 / API limits',
  'Composing validated action set',
]

export function AnalyzingState({ stage, preset }: { stage: number; preset: PresetId }) {
  const meta = presetMeta(preset)
  return (
    <div className="panel scanlines relative overflow-hidden px-6 py-10" role="status" aria-live="polite">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-sweep bg-linear-to-b from-transparent via-nv/10 to-transparent" aria-hidden />
      <div className="mx-auto max-w-xl">
        <Eyebrow className="text-nv">Analyzing · {meta.assetId}</Eyebrow>
        <h2 className="mt-3 text-[22px] font-semibold text-white">Running closed-loop triage…</h2>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-nv shadow-[0_0_10px_#76b900] transition-[width] duration-150 ease-linear" style={{ width: `${Math.min(100, ((stage + 1) / PIPELINE_STAGES.length) * 100)}%` }} />
        </div>
        <ol className="mt-5 space-y-2 font-mono text-[12.5px]">
          {LOG.slice(0, Math.min(LOG.length, stage + 2)).map((line, i) => (
            <li key={line} className="flex animate-rise items-center gap-2.5">
              <span className={i <= stage ? 'text-nv' : 'text-slate-500'}>{i <= stage ? '✓' : '›'}</span>
              <span className={i <= stage ? 'text-slate-200' : 'text-slate-400'}>{line}</span>
              {i > stage && <span className="animate-blink text-nv">▍</span>}
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[12px] text-slate-500">Sensor telemetry → Neural anomaly engine → Physics &amp; standards gate → Action generator</p>
      </div>
    </div>
  )
}
