import { CircleCheck, CloudUpload, FileText, LoaderCircle, Sparkles, Trash, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { MODULE_NAV } from '../../data/nav.ts'
import { cx } from '../../lib/format.ts'
import { DEMO_PDFS, DOC_CATEGORIES, DOC_STAGES, makeDoc, ragState, type DocVisibility, type KbDocument } from '../../lib/workspace.ts'
import { Eyebrow } from '../ui/primitives.tsx'

interface Props {
  docs: KbDocument[]
  setDocs: (fn: (d: KbDocument[]) => KbDocument[]) => void
  readOnly?: boolean
}

export function RagIndicator({ docs, className }: { docs: KbDocument[]; className?: string }) {
  const r = ragState(docs)
  return (
    <div className={cx('flex items-center gap-3 rounded-[4px] border px-3 py-2.5', r.ready ? 'border-nv/50 bg-nv/[0.07]' : 'border-line bg-deck/60', className)} role="status">
      {r.ready ? <CircleCheck className="size-4 shrink-0 text-nv" aria-hidden /> : r.pending ? <LoaderCircle className="size-4 shrink-0 animate-spin text-info" aria-hidden /> : <Sparkles className="size-4 shrink-0 text-slate-500" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white">{r.ready ? 'RAG-ready' : r.pending ? `Indexing ${r.pending} document${r.pending > 1 ? 's' : ''}…` : 'No documents yet'}</p>
        <p className="num text-[11.5px] text-slate-400">
          {r.indexed} indexed · {r.chunks.toLocaleString()} chunks · local simulation
        </p>
      </div>
    </div>
  )
}

function aclLabel(d: KbDocument) {
  if (d.visibility === 'Restricted') return 'roles=[owner,admin]'
  if (d.visibility === 'Module') return `modules=[${d.module ?? '—'}] · roles=*`
  return 'modules=* · roles=*'
}

/** uploaded → extracted/chunked → ACL tagged → indexed, one pip per stage. */
function Lifecycle({ doc }: { doc: KbDocument }) {
  const at = DOC_STAGES.findIndex((s) => s.id === doc.status)
  return (
    <div>
      <ol className="flex items-center gap-1" aria-label={`Lifecycle: ${DOC_STAGES[at].label}`}>
        {DOC_STAGES.map((s, i) => (
          <li key={s.id} title={s.label} className={cx('h-1.5 w-7 rounded-full transition-colors duration-500', i < at || doc.status === 'indexed' ? 'bg-nv' : i === at ? 'animate-pulse bg-info' : 'bg-line')} />
        ))}
      </ol>
      <p className={cx('mt-1 flex items-center gap-1 text-[11.5px]', doc.status === 'indexed' ? 'text-nv' : 'text-info')}>
        {doc.status !== 'indexed' && <LoaderCircle className="size-3 animate-spin" aria-hidden />}
        {DOC_STAGES[at].label}
      </p>
    </div>
  )
}

export function DocumentsPanel({ docs, setDocs, readOnly }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState<string | null>(null)

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files]
    const pdfs = list.filter((f) => f.name.toLowerCase().endsWith('.pdf'))
    setRejected(pdfs.length < list.length ? `${list.length - pdfs.length} non-PDF file(s) skipped — PDF only.` : null)
    setDocs((d) => [...d, ...pdfs.map((f) => makeDoc({ name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)), category: 'SOP / Procedure', visibility: 'Company' }))])
  }

  const addDemo = () => {
    setDocs((d) => {
      const have = new Set(d.map((x) => x.name))
      return [...d, ...DEMO_PDFS.filter((p) => !have.has(p.name)).map((p) => makeDoc(p))]
    })
  }

  const update = (id: string, patch: Partial<KbDocument>) => setDocs((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cx('flex flex-col items-center gap-3 rounded-[5px] border border-dashed px-5 py-6 text-center transition-colors', dragging ? 'border-nv bg-nv/[0.06]' : 'border-line-strong bg-deck/40')}
        >
          <CloudUpload className={cx('size-7', dragging ? 'text-nv' : 'text-slate-400')} aria-hidden />
          <div>
            <p className="text-[14px] font-medium text-white">Drop PDFs to build the knowledge base</p>
            <p className="mt-1 text-[12px] text-slate-400">Demo mode: files stay in this browser tab — extraction, ACL tagging and indexing are simulated locally.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => input.current?.click()} className="rounded-[4px] border border-line-strong px-3 py-2 text-[13px] font-medium text-slate-200 hover:border-slate-400 hover:text-white">
              Browse PDFs
            </button>
            <button type="button" onClick={addDemo} className="flex items-center gap-1.5 rounded-[4px] bg-nv/15 px-3 py-2 text-[13px] font-semibold text-nv-bright ring-1 ring-nv/50 hover:bg-nv/25">
              <Sparkles className="size-3.5" aria-hidden /> Add demo PDFs
            </button>
          </div>
          <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="sr-only" tabIndex={-1} aria-label="Choose PDF files" onChange={(e) => addFiles(e.target.files)} />
          {rejected && (
            <p className="flex items-center gap-2 text-[12px] text-warn">
              {rejected}
              <button type="button" onClick={() => setRejected(null)} aria-label="Dismiss">
                <X className="size-3" />
              </button>
            </p>
          )}
        </div>
      )}

      <RagIndicator docs={docs} />

      {docs.length > 0 && (
        <div className="overflow-x-auto rounded-[5px] border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-deck/60">
                {['Document', 'Category', 'Access (ACL)', 'Lifecycle', ''].map((h) => (
                  <th key={h} scope="col" className="eyebrow px-3 py-2.5 text-[10px] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
                      <div className="min-w-0">
                        <p className="max-w-[280px] truncate text-white">{d.name}</p>
                        <p className="num text-[11px] text-slate-500">
                          {(d.sizeKb / 1024).toFixed(1)} MB{d.status === 'indexed' || d.status === 'tagging' ? ` · ${d.chunks} chunks` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      aria-label={`Category for ${d.name}`}
                      value={d.category}
                      disabled={readOnly}
                      onChange={(e) => update(d.id, { category: e.target.value })}
                      className="rounded-[3px] border border-line-strong bg-deck px-2 py-1 text-[12px] text-slate-200"
                    >
                      {DOC_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      aria-label={`Visibility for ${d.name}`}
                      value={d.visibility === 'Module' ? `Module:${d.module ?? 'manufacturing'}` : d.visibility}
                      disabled={readOnly}
                      onChange={(e) => {
                        const [v, m] = e.target.value.split(':')
                        update(d.id, { visibility: v as DocVisibility, module: m as KbDocument['module'] })
                      }}
                      className="rounded-[3px] border border-line-strong bg-deck px-2 py-1 text-[12px] text-slate-200"
                    >
                      <option value="Company">Company-wide</option>
                      {MODULE_NAV.map((m) => (
                        <option key={m.id} value={`Module:${m.id}`}>
                          Module · {m.label.replace(' / CRM', '')}
                        </option>
                      ))}
                      <option value="Restricted">Restricted (owners)</option>
                    </select>
                    <p className={cx('num mt-1 text-[10.5px]', d.status === 'tagging' || d.status === 'indexed' ? 'text-slate-400' : 'text-slate-600')}>ACL · {aclLabel(d)}</p>
                  </td>
                  <td className="w-[190px] px-3 py-2.5">
                    <Lifecycle doc={d} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {!readOnly && (
                      <button type="button" onClick={() => setDocs((all) => all.filter((x) => x.id !== d.id))} className="rounded p-1 text-slate-500 hover:text-crit" aria-label={`Remove ${d.name}`}>
                        <Trash className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Eyebrow className="text-[10px] normal-case tracking-normal text-slate-500">
        Document path: upload → extraction & validation → permission-tagged chunks → authorized retrieval. Chunks are not Gold tables — Gold holds curated operational records.
      </Eyebrow>
    </div>
  )
}
