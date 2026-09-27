import { Award, CircleCheck, FileText, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { CitedAssistant } from '../components/workspace/Assistant.tsx'
import { Badge, Eyebrow, KpiCard, Panel, StatusDot } from '../components/ui/primitives.tsx'
import type { Quotation } from '../data/procurement.ts'
import { can } from '../lib/access.ts'
import { cx, fmtUsd, type Tone } from '../lib/format.ts'
import { useNotify } from '../lib/toast.ts'
import { useWorkspace } from '../lib/workspaceContext.ts'

const STATUS_TONE: Record<Quotation['status'], Tone> = { Received: 'info', 'Under review': 'warn', Clarification: 'neutral', Awarded: 'nv' }
const RATING_TONE = { Preferred: 'nv', Approved: 'info', Probation: 'warn' } as const

export function ProcurementView() {
  const { ws, perms, update, log } = useWorkspace()
  const notify = useNotify()
  const manage = can(perms, 'procurement', 'manage')
  const [rfq, setRfq] = useState('RFQ-2291')
  const rfqs = [...new Set(ws.quotations.map((q) => q.rfq))]
  const quotes = ws.quotations.filter((q) => q.rfq === rfq)
  const sup = (id: string) => ws.suppliers.find((s) => s.id === id)
  const indexed = new Set(ws.documents.filter((d) => d.status === 'indexed').map((d) => d.name))
  const kit = quotes.filter((q) => q.item.startsWith('Impeller'))
  const minPrice = Math.min(...kit.map((q) => q.unitPrice))
  const minLead = Math.min(...kit.map((q) => q.leadTimeDays))

  const award = (q: Quotation) => {
    update((w) => ({ ...w, quotations: w.quotations.map((x) => (x.rfq === q.rfq && x.item === q.item ? { ...x, status: x.id === q.id ? 'Awarded' : 'Received' } : x)) }))
    log('Quotation awarded', `${q.id} (${sup(q.supplierId)?.name}) for ${q.rfq} — PO draft created (demo)`, 'nv')
    notify(`Awarded ${q.id} · PO draft PO-90321 created (demo)`, 'nv')
  }

  return (
    <div className="mx-auto max-w-[1680px] space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Supply chain · Sourcing</Eyebrow>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-white">Procurement</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-slate-400">Suppliers and quotations for {ws.tenant.name}. Quotation facts are extracted from uploaded PDFs and cited by the assistant.</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="nv" dot>
            Integrated module
          </Badge>
          <Badge tone={manage ? 'nv' : 'neutral'}>{manage ? 'Can award' : 'View only'}</Badge>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Open RFQs" value={String(rfqs.length)} delta={`${ws.quotations.length} quotations`} deltaTone="info" />
        <KpiCard label="Awaiting decision" value={String(ws.quotations.filter((q) => q.status !== 'Awarded').length)} delta="RFQ-2291 urgent" deltaTone="warn" tone="warn" />
        <KpiCard label="Suppliers" value={String(ws.suppliers.length)} delta={`${ws.suppliers.filter((s) => s.rating === 'Preferred').length} preferred`} deltaTone="nv" />
        <KpiCard label="Avg supplier OTIF" value={String(Math.round(ws.suppliers.reduce((a, s) => a + s.otif, 0) / Math.max(1, ws.suppliers.length)))} unit="%" delta="rolling 90 d" deltaTone="info" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Panel
            eyebrow="Quotation comparison"
            title={quotes[0] ? `${rfq} · ${quotes[0].item.replace(/ IMP.*$/, '')}` : rfq}
            actions={
              <select aria-label="RFQ" value={rfq} onChange={(e) => setRfq(e.target.value)} className="rounded-[3px] border border-line-strong bg-deck px-2 py-1 text-[12px] text-slate-200">
                {rfqs.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            }
            bodyClassName="overflow-x-auto p-0"
          >
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  {['Quote', 'Supplier', 'Unit price', 'Lead time', 'Terms', 'Source PDF', 'Status', ''].map((h) => (
                    <th key={h} scope="col" className="eyebrow px-3 py-2.5 text-[10px] font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const s = sup(q.supplierId)
                  const isKit = q.item.startsWith('Impeller')
                  return (
                    <tr key={q.id} className={cx('border-b border-line/60 last:border-0', q.id === 'Q-7781' && rfq === 'RFQ-2291' && 'bg-nv/[0.04]')}>
                      <td className="num px-3 py-2.5 text-slate-200">
                        {q.id}
                        <p className="max-w-[160px] truncate text-[11px] text-slate-500">{q.item}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-white">{s?.name}</p>
                        {s && (
                          <span className={cx('text-[11px]', s.rating === 'Probation' ? 'text-warn' : 'text-slate-500')}>
                            {s.rating} · OTIF {s.otif}%
                          </span>
                        )}
                      </td>
                      <td className="num px-3 py-2.5">
                        <span className={cx(isKit && q.unitPrice === minPrice ? 'text-nv' : 'text-slate-200')}>{fmtUsd(q.unitPrice, false)}</span>
                        <p className="text-[11px] text-slate-500">× {q.qty} = {fmtUsd(q.unitPrice * q.qty, false)}</p>
                      </td>
                      <td className={cx('num px-3 py-2.5', isKit && q.leadTimeDays === minLead ? 'text-nv' : q.leadTimeDays > 14 ? 'text-warn' : 'text-slate-200')}>{q.leadTimeDays} d</td>
                      <td className="px-3 py-2.5 text-[12px] text-slate-400">{q.terms}</td>
                      <td className="px-3 py-2.5">
                        <span className={cx('inline-flex items-center gap-1 text-[11.5px]', indexed.has(q.document) ? 'text-slate-300' : 'text-slate-600')} title={indexed.has(q.document) ? 'Indexed — citable' : 'Not uploaded — record only'}>
                          <FileText className="size-3.5" aria-hidden />
                          p.{q.page}
                          {indexed.has(q.document) ? <CircleCheck className="size-3 text-nv" aria-label="indexed" /> : null}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={STATUS_TONE[q.status]}>{q.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {manage && q.status !== 'Awarded' && (
                          <button type="button" onClick={() => award(q)} className="inline-flex items-center gap-1 rounded-[3px] px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-nv ring-1 ring-nv/50 hover:bg-nv/10">
                            <Award className="size-3" aria-hidden /> Award
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>

          <Panel eyebrow="Supplier master" title="Suppliers" bodyClassName="p-0">
            <ul className="grid divide-line sm:grid-cols-2 sm:divide-x [&>li]:border-b [&>li]:border-line">
              {ws.suppliers.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <StatusDot tone={RATING_TONE[s.rating]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-white">{s.name}</p>
                    <p className="truncate text-[12px] text-slate-400">
                      {s.category} · {s.contract}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-[14px] font-semibold text-white">{s.otif}%</p>
                    <p className={cx('text-[11px]', s.rating === 'Probation' ? 'text-warn' : 'text-slate-500')}>{s.rating}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          {!indexed.has('Hydraflow_Quotation_Q-7781.pdf') && (
            <p className="flex items-center gap-2 text-[12.5px] text-warn">
              <TriangleAlert className="size-3.5" aria-hidden /> Quotation PDFs are not indexed yet — upload them in the Knowledge Base so the assistant can cite page-level facts.
            </p>
          )}
        </div>
        <CitedAssistant module="procurement" title="AI quotation comparison" />
      </div>
    </div>
  )
}
