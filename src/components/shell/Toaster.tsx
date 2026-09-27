import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cx, TONE_TEXT } from '../../lib/format.ts'
import type { ToastItem } from '../../lib/toast.ts'

export function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[75] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.tone === 'warn' || t.tone === 'crit' ? TriangleAlert : t.tone === 'info' ? Info : CircleCheck
        return (
          <div key={t.id} className="panel pointer-events-auto flex animate-rise items-start gap-3 bg-panel/95 px-4 py-3 shadow-xl shadow-black/50">
            <Icon className={cx('mt-0.5 size-4 shrink-0', TONE_TEXT[t.tone])} aria-hidden />
            <p className="flex-1 text-sm text-slate-200">{t.message}</p>
            <button type="button" onClick={() => onDismiss(t.id)} className="rounded p-0.5 text-slate-500 hover:text-white" aria-label="Dismiss notification">
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
