/**
 * Typed request/response contracts for the FastAPI + SQLite prototype backend.
 * Route names live in ONE place (`ENDPOINTS` in api.ts) so they can be mapped
 * to the backend team's final names without touching components.
 *
 * Every response is computed server-side for the caller identified by the
 * bearer token. Fields such as tenant_id / roles are informational echoes —
 * the client never sends them as authority.
 */

export type ApiRole = 'owner' | 'driver' | 'procurement'

/* ---------- auth & company selection */
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { access_token: string; token_type: 'bearer'; expires_in: number; user: { id: string; name: string; email: string } }

export interface MembershipDto { company_id: string; company_name: string; roles: ApiRole[] }
/** GET /auth/session → who am I + which companies can I enter. */
export interface SessionResponse { user: { id: string; name: string; email: string }; memberships: MembershipDto[]; current_company_id: string | null }
/** POST /auth/company — switch current company (server re-derives grants). */
export interface SelectCompanyRequest { company_id: string }

/* ---------- workspaces, invites, members, modules */
export interface CreateCompanyRequest { name: string; industry: string; size: string; locations: string[]; context?: string; enabled_modules: string[] }
export interface CompanyDto { id: string; name: string; industry: string; enabled_modules: string[]; created_at: string }
export interface CreateInviteRequest { roles: ApiRole[] }
export interface InviteDto { code: string; company_id: string; roles: ApiRole[]; expires_at: string; used_by?: string | null }
export interface JoinCompanyRequest { code: string }
export interface MemberDto { user_id: string; name: string; email: string; roles: ApiRole[]; status: 'active' | 'invited' }
export interface UpdateMemberRolesRequest { roles: ApiRole[] }
export interface ModuleDto { id: string; label: string; enabled: boolean; implemented: boolean }
export interface GrantDto { module: string; actions: Array<'view' | 'read_records' | 'update_status' | 'manage' | 'configure' | 'query_ai'>; scope: 'tenant' | 'assigned' }

/* ---------- documents / RAG */
export interface DocumentDto {
  id: string
  name: string
  status: 'uploaded' | 'extracting' | 'tagging' | 'indexed' | 'failed'
  chunks: number
  acl: { modules: string[]; roles: ApiRole[] | '*' }
  index_version?: string
  updated_at: string
  error?: string
}
export interface RagQueryRequest { question: string; module: string }
/** Canonical AI answer — `answer` + `sources` are required; the rest is optional metadata. */
export interface RagAnswer {
  answer: string
  sources: Array<{ document: string; page: number }>
  freshness?: Array<{ source: string; as_of: string; stale: boolean }>
  decision?: { status: 'allowed' | 'denied'; stage: 'pre-retrieval' | 'retrieval'; reason?: string }
}

/* ---------- transportation & procurement */
export interface ShipmentDto {
  id: string
  customer: string
  destination: string
  window: string
  eta: string
  eta_as_of: string
  eta_stale: boolean
  driver_id: string | null
  pallets: number
  weight_kg: number
  handling: string
  status: 'Scheduled' | 'Loading' | 'In transit' | 'Arrived' | 'Delivered' | 'Delayed'
}
export interface UpdateShipmentStatusRequest { status: ShipmentDto['status'] }
export interface SupplierDto { id: string; name: string; category: string; otif: number; rating: 'Preferred' | 'Approved' | 'Probation' }
export interface QuotationDto { id: string; rfq: string; supplier_id: string; item: string; qty: number; unit_price: number; currency: string; lead_time_days: number; terms: string; status: string; document?: { name: string; page: number } }

/* ---------- sources, pipelines, audit */
export interface SourceDto { id: string; kind: string; name: string; health: 'healthy' | 'stale' | 'failed' | 'schema_mismatch'; last_run: { at: string; status: 'ok' | 'failed'; error?: string }; last_success: { at: string; version: string } }
export interface SecurityEventDto { id: string; at: string; company_id: string; user_id: string; roles: ApiRole[]; resource: string; decision: 'DENY'; stage: 'pre-retrieval' | 'route' | 'api'; reason: string; chunks_retrieved: 0 }
