import { createContext, useContext } from 'react'
import type { EffectivePermissions, Member, UserId } from './access.ts'
import type { Tone } from './format.ts'
import type { SecurityIncident, Workspace } from './workspace.ts'

export interface WorkspaceCtx {
  ws: Workspace
  update: (fn: (w: Workspace) => Workspace) => void
  /** Acting identity (the previewed member when an owner uses "Preview as"). */
  me: Member
  actingUserId: UserId
  /** True when the signed-in user is owner/admin (controls the preview switcher). */
  realOwner: boolean
  perms: EffectivePermissions
  recordIncident: (i: SecurityIncident) => void
  /** Appends a mock audit event (shown in Company Settings → Audit / Alerts). */
  log: (action: string, detail: string, tone?: Tone) => void
}

export const WorkspaceContext = createContext<WorkspaceCtx | null>(null)

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceContext.Provider')
  return ctx
}
