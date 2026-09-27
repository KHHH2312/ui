import { Braces, Check, ChevronUp, Copy, ListTree, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx } from '../../lib/format.ts'
import type { InferenceResult } from '../../lib/types.ts'
import { prefersReducedMotion } from '../../lib/useNow.ts'

type Tab = 'trace' | 'json'

export function ResultDrawer({ result }: { result: InferenceResult }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('trace')
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(result, null, 2)
  const inferMs = result.actions.slice(0, 5).reduce((s, a) => s + a.duration_ms, 0)
  const totalMs = result.actions.reduce((s, a) => s + a.duration_ms, 0)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const selectTab = (t: Tab) => {
    setTab(t)
    setOpen(true)
  }

  return (
    <section className="panel sticky bottom-0 z-20 overflow-hidden rounded-b-none border-b-0 bg-panel/95 shadow-[0_-12px_30px_-12px_rgb(0_0_0/0.8)]" aria-label="Execution details">
      <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3">
        <div role="tablist" aria-label="Execution details" className="flex items-center gap-1">
          {(
            [
              ['trace', 'Agent trace', ListTree],
              ['json', 'Raw JSON', Braces],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={open && tab === id}
              aria-controls="drawer-panel"
              type="button"
              onClick={() => (open && tab === id ? setOpen(false) : selectTab(id))}
              className={cx(
                'flex items-center gap-2 rounded-[3px] px-3 py-2 font-mono text-[11.5px] font-semibold uppercase tracking-[0.1em] transition-colors',
                open && tab === id ? 'bg-nv/12 text-nv-bright' : 'text-slate-400 hover:text-white',
              )}
            >
              <Icon className="size-3.5" aria-hidden /> {label}
            </button>
          ))}
        </div>
        <span className="num ml-auto hidden text-[11.5px] text-slate-400 sm:block">
          {result.actions.length} steps · inference {inferMs} ms · end-to-end {totalMs} ms
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto grid size-8 place-items-center rounded-[3px] text-slate-400 hover:bg-white/5 hover:text-white sm:ml-2"
          aria-expanded={open}
          aria-controls="drawer-panel"
          aria-label={open ? 'Collapse details drawer' : 'Expand details drawer'}
        >
          <ChevronUp className={cx('size-4 transition-transform duration-300', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div id="drawer-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="h-[min(42vh,380px)] animate-fade overflow-auto border-t border-line">
          {tab === 'trace' ? (
            <Trace key={result.telemetry.request_id} result={result} />
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => void copy()}
                className="sticky left-full top-2 z-10 float-right mr-3 mt-2 flex items-center gap-1.5 rounded-[3px] border border-line-strong bg-panel px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:text-white"
              >
                {copied ? <Check className="size-3 text-nv" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <pre className="num p-4 text-[12px] leading-relaxed text-slate-300">
                <JsonHighlight json={json} />
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Trace({ result }: { result: InferenceResult }) {
  const steps = result.actions
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? steps.length : 0))
  useEffect(() => {
    if (shown >= steps.length) return
    const id = setTimeout(() => setShown((s) => s + 1), 260)
    return () => clearTimeout(id)
  }, [shown, steps.length])
  const max = Math.max(...steps.map((s) => s.duration_ms))

  return (
    <ol className="divide-y divide-line/70 px-2 py-1 sm:px-3" aria-live="polite">
      {steps.map((a, i) => {
        const state = i < shown ? 'complete' : i === shown ? 'running' : 'pending'
        return (
          <li key={a.step} className={cx('grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:grid-cols-[28px_180px_minmax(0,1fr)_160px]', state === 'pending' && 'opacity-35')}>
            <span className={cx('num grid size-6 place-items-center rounded-[3px] border text-[11px]', state === 'complete' ? 'border-nv/50 text-nv' : 'border-line-strong text-slate-400')}>
              {state === 'running' ? <LoaderCircle className="size-3 animate-spin text-info" aria-hidden /> : a.step}
            </span>
            <span className="truncate font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-white">{a.agent}</span>
            <span className="col-span-2 row-start-2 truncate text-[12.5px] text-slate-300 sm:col-span-1 sm:row-start-auto">{state === 'pending' ? 'Waiting…' : a.action}</span>
            <span className="col-start-3 row-start-1 flex items-center gap-2 sm:col-start-auto sm:row-start-auto">
              <span className="hidden h-1 flex-1 overflow-hidden rounded-full bg-line sm:block">
                <span className="block h-full rounded-full bg-nv transition-[width] duration-500" style={{ width: state === 'complete' ? `${Math.max(4, (a.duration_ms / max) * 100)}%` : '0%' }} />
              </span>
              <span className="num w-14 text-right text-[12px] text-slate-200">{state === 'complete' ? `${a.duration_ms} ms` : '—'}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Tiny tokenizer-based JSON highlighter (keys / strings / numbers / literals). */
function JsonHighlight({ json }: { json: string }) {
  const parts = json.split(/("(?:\\.|[^"\\])*"(?:\s*:)?|\b-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p
        const cls = p.endsWith(':') ? 'text-info' : p.startsWith('"') ? 'text-[#c3e88d]' : p === 'null' || p === 'true' || p === 'false' ? 'text-warn' : 'text-nv-bright'
        return (
          <span key={i} className={cls}>
            {p}
          </span>
        )
      })}
    </>
  )
}
