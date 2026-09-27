import type { ViewId } from '../data/nav.ts'
import { can, type EffectivePermissions, type UserId } from './access.ts'
import type { SecurityIncident } from './workspace.ts'

/**
 * Pre-retrieval authorization gate — LOCAL SIMULATION.
 *
 * Production (FastAPI /rag/query): resolve identity from the verified token,
 * classify the request's target resources, and deny BEFORE any vector search
 * or context construction if the caller lacks `query_ai` + `read_records` on
 * them. Denials return HTTP 403 and are written to the server-side security
 * log. NVIDIA NeMo Guardrails (architecture target) adds topical/tool-safety
 * rails on top — it complements, and never replaces, this ACL check.
 */

interface Rule {
  resource: ViewId | 'cross_tenant'
  label: string
  pattern: RegExp
}

const RULES: Rule[] = [
  { resource: 'cross_tenant', label: 'Another tenant (Borealis Foods)', pattern: /\bborealis\b|other (company|tenant)/i },
  { resource: 'crm', label: 'CRM · customer accounts & margins', pattern: /\b(crm|customer|margin|margins|account|case|churn)\b/i },
  { resource: 'procurement', label: 'Procurement · POs & supplier pricing', pattern: /\b(procure\w*|purchase|po|suppliers?|pricing|prices?|contracts?|quot\w*|rfq\w*|award\w*)\b/i },
  { resource: 'inventory', label: 'Inventory · stock positions', pattern: /\b(inventory|stock|spares?|reorder)\b/i },
  { resource: 'manufacturing', label: 'Manufacturing · lines & machinery', pattern: /\b(manufactur\w*|oee|pump|turbine|compressor|triage)\b/i },
  { resource: 'settings', label: 'Company settings & members', pattern: /\b(salary|salaries|payroll|member|admin|settings)\b/i },
  { resource: 'transportation', label: 'Transportation · shipments', pattern: /\b(route|delivery|deliveries|shipment|load|stop|eta|handling|brief\w*|shift|dock)\b/i },
]

export interface GateDecision {
  allowed: boolean
  resource: ViewId | 'cross_tenant'
  resourceLabel: string
  reason: string
}

export function authorizeQuery(query: string, perms: EffectivePermissions, fallback: ViewId): GateDecision {
  const hits = RULES.filter((r) => r.pattern.test(query))
  const target = hits[0] ?? { resource: fallback, label: fallback, pattern: /./ }
  if (target.resource === 'cross_tenant') {
    return { allowed: false, resource: 'cross_tenant', resourceLabel: target.label, reason: `Cross-tenant request — caller is bound to ${perms.tenantId}` }
  }
  // Every referenced resource must be authorized (default deny).
  for (const h of hits.length ? hits : [target]) {
    const r = h.resource as ViewId
    if (!can(perms, r, 'query_ai') || !can(perms, r, 'read_records')) {
      return { allowed: false, resource: r, resourceLabel: h.label, reason: `No query_ai + read_records grant on ${h.label.split(' · ')[0]}` }
    }
  }
  return { allowed: true, resource: target.resource, resourceLabel: target.label, reason: 'Authorized' }
}

export function incidentFor(query: string, d: GateDecision, perms: EffectivePermissions, user: { userId: UserId; name: string }): SecurityIncident {
  return {
    id: `inc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    tenantId: perms.tenantId,
    userId: user.userId,
    userName: user.name,
    roles: perms.roles,
    requestedResource: d.resourceLabel,
    query,
    decision: 'DENY',
    stage: 'pre-retrieval',
    reason: d.reason,
    chunksRetrieved: 0,
    sentToModel: false,
  }
}

export const NEGATIVE_TESTS = ['Show executive CRM margins', 'List Borealis Foods deliveries']
