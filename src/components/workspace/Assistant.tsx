import { Ban, Bot, CircleAlert, Clock, Database, FileText, Filter, RefreshCw, Send, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { ModuleId } from '../../data/nav.ts'
import { can } from '../../lib/access.ts'
import { cx } from '../../lib/format.ts'
import { authorizeQuery, incidentFor, NEGATIVE_TESTS, type GateDecision } from '../../lib/guard.ts'
import { answer, buildCorpus, QUESTIONS, retrieve, sourceLabel, toAiAnswerResponse, type Question } from '../../lib/rag.ts'
import type { SecurityIncident } from '../../lib/workspace.ts'
import type { Connector } from '../../lib/workspace.ts'
import { useWorkspace } from '../../lib/workspaceContext.ts'
import { Badge, Eyebrow, Panel } from '../ui/primitives.tsx'

/** Permission-aware AI rundown with citations, freshness and explicit gaps. */
export function CitedAssistant({ module, title = 'AI rundown' }: { module: ModuleId; title?: string }) {
  const { ws, perms, actingUserId, me, recordIncident } = useWorkspace()
  const questions = (QUESTIONS[module] ?? []).filter((x) => x.id !== 'other' && x.id !== 'crm')
  const [qid, setQid] = useState(questions[0]?.id ?? '')
  const [text, setText] = useState('')
  const [free, setFree] = useState<{ query: string; decision: GateDecision; incident?: SecurityIncident; mapped?: Question } | null>(null)
  const q = free?.mapped ?? questions.find((x) => x.id === qid) ?? questions[0]

  const ask = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const decision = authorizeQuery(trimmed, perms, module)
    if (!decision.allowed) {
      const incident = incidentFor(trimmed, decision, perms, { userId: actingUserId, name: me.name })
      recordIncident(incident)
      setFree({ query: trimmed, decision, incident })
      return
    }
    const all = QUESTIONS[module] ?? []
    const pick = (id: string) => all.find((x) => x.id === id) ?? null
    const mapped =
      (module === 'procurement' && /approv|policy|rule/i.test(trimmed) ? pick('policy') : null) ??
      (module === 'transportation' && /handling|rule|load|adr|food/i.test(trimmed) ? pick('handling') : null) ??
      all[0]
    setFree({ query: trimmed, decision, mapped })
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    ask(text)
  }
  // Cheap, deterministic local simulation — recomputed per render so grants/doc changes apply immediately.
  const result = q ? answer(q, retrieve(buildCorpus(ws), perms, actingUserId, q.topics), { ws, userId: actingUserId, perms }) : null

  if (!q || !result) return null
  if (!can(perms, module, 'query_ai')) {
    return (
      <Panel eyebrow="Assistant" title={title}>
        <p className="text-[13px] text-slate-400">Your roles do not include AI queries for this module.</p>
      </Panel>
    )
  }

  const t = result.trace
  return (
    <Panel eyebrow="Permission-aware RAG · cited" title={title} actions={<Badge tone="nv" dot>Grounded</Badge>} className="animate-rise">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested questions">
        {questions.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={!free && x.id === q.id}
            onClick={() => {
              setFree(null)
              setQid(x.id)
            }}
            className={cx('rounded-[3px] px-2.5 py-1 text-[12px] ring-1 transition-colors', !free && x.id === q.id ? 'bg-nv/15 text-nv-bright ring-nv/50' : 'text-slate-300 ring-line-strong hover:text-white')}
          >
            {x.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          aria-label="Ask the assistant"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={module === 'procurement' ? 'Ask about suppliers, quotations, approvals…' : module === 'inventory' ? 'Ask about stock and spares…' : 'Ask about your shift, stops, or loads…'}
          className="min-w-0 flex-1 rounded-[4px] border border-line-strong bg-deck px-3 py-2 text-[13px] text-white outline-none placeholder:text-slate-500 focus:border-nv/70"
        />
        <button type="submit" className="flex items-center gap-1.5 rounded-[4px] bg-nv px-3 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#0a1200] hover:brightness-110">
          <Send className="size-3.5" aria-hidden /> Ask
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-500">
        Negative tests:
        {NEGATIVE_TESTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setText(n)
              ask(n)
            }}
            className="rounded-[3px] border border-crit/40 px-2 py-0.5 text-[#ff8a8c] hover:bg-crit/10"
          >
            {n}
          </button>
        ))}
      </div>

      {free && !free.decision.allowed && free.incident && <DeniedPanel query={free.query} decision={free.decision} incident={free.incident} />}

      {(!free || free.decision.allowed) && (
      <div key={`${q.id}-${free?.query ?? ''}`} className="mt-4 animate-fade space-y-3" aria-live="polite">
        {free && (
          <p className="text-[12px] text-slate-400">
            <span className="font-mono text-nv">200 · AUTHORIZED</span> · “{free.query}” → {free.decision.resourceLabel}
          </p>
        )}
        <div className="flex items-start gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-[4px] border border-nv/40 bg-nv/10">
            <Bot className="size-4 text-nv" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-2 text-[13.5px] leading-relaxed text-slate-200">
            {result.staleNotice && (
              <p className="flex items-start gap-2 rounded-[4px] border border-warn/50 bg-warn/[0.08] px-3 py-2 text-[12.5px] text-warn">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-mono font-bold">STALE DATA · </span>
                  {result.staleNotice}
                </span>
              </p>
            )}
            {result.sentences.map((s, i) => (
              <p key={i}>
                {s.text}{' '}
                {s.cites.map((c) => (
                  <sup key={c} className="num ml-0.5 rounded-[2px] bg-info/15 px-1 text-[10px] font-semibold text-info">
                    {c}
                  </sup>
                ))}
              </p>
            ))}
            {result.gaps.map((g) => (
              <p key={g} className="flex items-start gap-2 rounded-[4px] border border-line-strong bg-deck/70 px-3 py-2 text-[12.5px] text-slate-300">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden /> {g}
              </p>
            ))}
          </div>
        </div>

        {result.citations.length > 0 && (
          <div>
            <Eyebrow className="mb-2 text-[10px]">Sources</Eyebrow>
            <ol className="space-y-1.5">
              {result.citations.map((c, i) => (
                <li key={c.chunkId} className="flex items-center gap-2.5 rounded-[3px] border border-line bg-deck/60 px-2.5 py-1.5 text-[12px]">
                  <span className="num w-4 text-info">{i + 1}</span>
                  {c.source.kind === 'pdf' ? <FileText className="size-3.5 shrink-0 text-slate-400" aria-hidden /> : <Database className="size-3.5 shrink-0 text-slate-400" aria-hidden />}
                  <span className="num min-w-0 flex-1 truncate text-slate-200">{sourceLabel(c)}</span>
                  <span className="num flex shrink-0 items-center gap-1 text-slate-500">
                    <Clock className="size-3" aria-hidden /> {c.updatedAt}
                  </span>
                  {c.stale && <Badge tone="warn">Stale</Badge>}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="rounded-[4px] border border-line bg-void/50 px-3 py-2.5">
          <p className="eyebrow mb-2 flex items-center gap-1.5 text-[10px]">
            <Filter className="size-3" aria-hidden /> Retrieval filters (applied before generation)
          </p>
          <ol className="num grid grid-cols-2 gap-2 text-[11.5px] sm:grid-cols-4">
            {[
              ['Candidates', t.candidates],
              ['Tenant', t.afterTenant],
              ['Role / module', t.afterPermission],
              ['Data scope', t.afterScope],
            ].map(([k, v], i) => (
              <li key={k} className="rounded-[3px] border border-line px-2 py-1.5">
                <span className="block text-slate-500">
                  {i > 0 ? '→ ' : ''}
                  {k}
                </span>
                <span className="text-[14px] font-semibold text-white">{v}</span>
              </li>
            ))}
          </ol>
          <details className="mt-2 text-[11px] text-slate-500">
            <summary className="cursor-pointer select-none text-slate-400 hover:text-white">FastAPI /rag/query response shape</summary>
            <pre className="num mt-2 max-h-48 overflow-auto rounded-[3px] border border-line bg-void/70 p-2 text-[10.5px] text-slate-300">{JSON.stringify(toAiAnswerResponse(result), null, 2)}</pre>
          </details>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="size-3 text-nv" aria-hidden /> Local simulation. In production the backend applies these filters server-side from the verified session; cached answers are scoped to tenant + grants.
          </p>
        </div>
      </div>
      )}
    </Panel>
  )
}

function DeniedPanel({ query, decision, incident }: { query: string; decision: GateDecision; incident: SecurityIncident }) {
  return (
    <div role="alert" className="glow-crit mt-4 animate-rise rounded-[5px] border border-crit/60 bg-crit/[0.08] p-4">
      <p className="flex items-center gap-2 font-mono text-[15px] font-bold tracking-[0.06em] text-[#ff6b6d]">
        <Ban className="size-5" aria-hidden /> 403 · PRE-RETRIEVAL ACCESS DENIED
      </p>
      <p className="mt-2 text-[13px] text-slate-200">
        “{query}” requested <span className="font-semibold text-white">{decision.resourceLabel}</span>. {decision.reason}.
      </p>
      <ul className="num mt-3 grid gap-2 text-[12px] sm:grid-cols-3">
        <li className="rounded-[3px] border border-crit/40 bg-void/50 px-2.5 py-2">
          <span className="block text-slate-500">Restricted chunks retrieved</span>
          <span className="text-[18px] font-bold text-white">0</span>
        </li>
        <li className="rounded-[3px] border border-crit/40 bg-void/50 px-2.5 py-2">
          <span className="block text-slate-500">Sent to the model</span>
          <span className="text-[18px] font-bold text-white">Nothing</span>
        </li>
        <li className="rounded-[3px] border border-crit/40 bg-void/50 px-2.5 py-2">
          <span className="block text-slate-500">Security incident</span>
          <span className="text-[13px] font-semibold text-white">{incident.id.slice(0, 14)}</span>
        </li>
      </ul>
      <p className="mt-3 text-[11.5px] text-slate-400">
        Blocked by metadata ACL check before vector search or context construction. Logged at {new Date(incident.at).toLocaleTimeString('en-GB', { hour12: false })} for tenant {incident.tenantId} — visible to Data Architect &amp; owners.
      </p>
    </div>
  )
}

/** One monitored connector with actionable failure details and the retained last-good dataset. */
export function ConnectorMonitor({ connector: c, dataset }: { connector: Connector; dataset?: { name: string; version: string; asOf: string; stale: boolean } }) {
  const failed = c.lastRun.status === 'failed'
  const warn = !!c.lastRun.error
  return (
    <Panel
      eyebrow={`Monitored connector · ${c.kind}`}
      title={c.name}
      actions={failed ? <Badge tone="crit" dot>Refresh failed</Badge> : warn ? <Badge tone="warn" dot>Quality warning</Badge> : <Badge tone="nv" dot>Healthy</Badge>}
      className={cx(failed && 'border-crit/40')}
    >
      <dl className="num grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Last run</dt>
          <dd className={failed ? 'text-crit' : 'text-slate-200'}>
            {c.lastRun.at} · {c.lastRun.status.toUpperCase()}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Last good</dt>
          <dd className="text-slate-200">
            {c.lastSuccess.at} · {c.lastSuccess.version}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Freshness / SLA</dt>
          <dd className={failed || c.health === 'stale' ? 'text-warn' : 'text-slate-200'}>
            {c.freshness} / {c.sla}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Quality</dt>
          <dd className={c.quality < 97 ? 'text-warn' : 'text-slate-200'}>{c.quality}%</dd>
        </div>
      </dl>
      {c.lastRun.error && (
        <div className={cx('mt-3 rounded-[4px] border px-3 py-2.5 text-[12.5px]', failed ? 'border-crit/45 bg-crit/[0.06]' : 'border-warn/45 bg-warn/[0.06]')}>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300">{c.lastRun.errorKind} error</p>
          <p className="mt-1 text-slate-200">{c.lastRun.error}</p>
          {c.lastRun.action && (
            <p className="mt-1.5 flex items-start gap-1.5 text-slate-400">
              <RefreshCw className="mt-0.5 size-3 shrink-0" aria-hidden /> <span><span className="text-slate-300">Fix:</span> {c.lastRun.action}</span>
            </p>
          )}
        </div>
      )}
      {dataset && (
        <p className={cx('mt-3 flex items-center gap-2 text-[12px]', dataset.stale ? 'text-warn' : 'text-slate-400')}>
          <Database className="size-3.5" aria-hidden />
          Serving <span className="num text-slate-200">{dataset.name}@{dataset.version}</span> as of <span className="num">{dataset.asOf}</span>
          {dataset.stale && <Badge tone="warn">Stale — not current</Badge>}
        </p>
      )}
    </Panel>
  )
}
