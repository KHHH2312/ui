import { cx } from '../../lib/format.ts'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('grid size-9 place-items-center rounded-[5px] border border-nv/50 bg-nv/10 shadow-[0_0_18px_-4px_rgb(118_185_0/0.6)]', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="size-5">
        <path d="M8 24V8l16 16V8" fill="none" stroke="#76b900" strokeWidth="3" strokeLinecap="square" />
        <circle cx="24" cy="8" r="2" fill="#8fd400" />
      </svg>
    </span>
  )
}
