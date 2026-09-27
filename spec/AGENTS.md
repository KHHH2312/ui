# AGENTS.md — NEXUS Autonomous Supply Chain Copilot & Diagnostic Engine

Operating spec for the hackathon project (team of 5, Sep 27, 2026). Hermes (Discord: "Hackathon project lead") is the project manager.
**Build contract:** `MASTER_SPEC.md` is the single, executable source of truth for the backend, the API and the frontend integration. This file covers who does what and how we work.

## 1. Executive summary

Enterprises lose speed to fragmentation, not to a lack of data:
- Structured telemetry (ERP, WMS, IoT) is locked in databases.
- Unstructured context (SOPs, maintenance logs, contracts, quotes) is stranded in PDFs and email.
- Access barriers mean a disruption can wait days for the data team.
- Compliance rules are enforced after the fact.

**NEXUS** is a modular multi-tenant copilot that pairs:
1. Text-to-SQL over a DuckDB gold layer.
2. Role-scoped RAG over company PDFs, with metadata filters applied **before** ranking.
3. Strict RBAC across both.
4. Intent-driven autonomous auditing: plain-text policy → persistent rule → scheduled evaluation → anomaly banners. This includes the **Perishable Expiry Guard**.
5. Two-hop root-cause reasoning: SQL anomaly → documented cause → verdict.

## 2. Personas and roles

The canonical role ids are the frontend `RoleId`s.

| Persona | Role id | Can do |
|---|---|---|
| Owner (executive) | `owner` | Everything: telemetry, supplier pricing, contract margins, compliance policy, team, settings |
| Driver | `truck_driver` (alias `driver`) | Only their assigned deliveries (`driver_id` scope): status updates, route notes, handling SOPs. Pricing, margins and SLAs → **403 before retrieval** |
| Procurement | `procurement_manager` (alias `procurement`) | Suppliers, quotations, awards, supplier-return proposals. No inventory lots |
| Data Architect | `data_architect` | Sources, pipelines, checks, lineage, security log. **Configure ≠ read**: no business rows |

## 3. Architecture

```
React 19 + Vite + TS SPA (frontend/)  ── /api (Vite proxy) ──▶  FastAPI gateway (backend/main.py)
  persona switcher · role-adaptive tabs · system map          auth.py (JWT) · permissions.py (RBAC + pre-retrieval gate)
  docked copilot · compliance tab · expiry guard                 │
                                                                 ├─▶ agent.py      intent routing, 2-hop root cause, synthesis
                                                                 │     ├─▶ sql_engine.py  DuckDB, PRAGMA recon, SELECT-only guard, RBAC rewrite
                                                                 │     ├─▶ rag_engine.py  PDF ingest, ACL-tagged chunks, filter → rank
                                                                 │     └─▶ llm.py         NVIDIA NIM (OpenAI-compatible) or deterministic fallback
                                                                 ├─▶ audit_engine.py  rules.json registry, compiler, evaluator, scheduler
                                                                 ├─▶ expiry.py        Perishable Expiry Guard
                                                                 ├─▶ snapshot.py      GET /api/workspace (RBAC-projected UI state)
                                                                 └─▶ security_log.py  403 events + audit trail
                                                   DuckDB: demo/supply_chain.duckdb · PDFs: demo/docs · rules: demo/rules.json
```

## 4. Directory layout and ownership

| Owner (Discord) | Scope |
|---|---|
| **a56lp28sh58ck** | `demo/seed.py` (golden dataset, PDFs, rules seed); `backend/config.py`, `db.py`, `schemas.py`, `auth.py`, `permissions.py`, `main.py`, `sql_engine.py`, `snapshot.py`; the workspace, members, transportation and procurement routers |
| **drifter_0** | `backend/rag_engine.py`, the documents router, PDF ingest on startup, the RAG filter tests |
| **amineelbaydaouy** + **the_one_and_only_otter** | `backend/agent.py`, `llm.py`, `audit_engine.py`, `expiry.py`, `demo/rules.json`, the inventory, audit and assistant routers, the scheduler, the golden-path tests |
| **khalid_is_somewhere** | `frontend/`: `src/lib/live.ts` adapter, Vite proxy, the mutation swap, Diagnostics UI, Compliance tab, anomaly banner, `npm run check` |

```
nexus/
├── AGENTS.md · MASTER_SPEC.md · DECISIONS.md · README.md · Makefile · requirements.txt · .env.example
├── backend/
│   ├── main.py config.py db.py schemas.py auth.py permissions.py security_log.py
│   ├── llm.py sql_engine.py rag_engine.py agent.py audit_engine.py expiry.py snapshot.py
│   └── routers/ health auth workspace members documents assistant transportation procurement inventory audit data triage
├── demo/
│   ├── seed.py · rules.json · docs/*.pdf (generated) · uploads/ (runtime, gitignored)
│   └── supply_chain.duckdb (generated, gitignored)
├── tests/ conftest.py test_rbac.py test_sql_guard.py test_rag_filter.py test_agent_golden.py test_audit.py test_api_smoke.py
└── frontend/ (React app)
    └── src/lib/{api.ts, apiContract.ts, live.ts}, src/views/*, src/components/assistant/*
```

## 5. RBAC enforcement (non-negotiable)

- Tenant, user and roles come **only** from the JWT plus the database. `org_id` and `role` in request bodies are ignored.
- **Deny by default.** Every route declares `(resource, action)`. A failure → 403 plus a security event.
- **Structured data:** SQL is a single SELECT on allow-listed tables. The sqlglot rewrite injects `tenant_id` everywhere, and `driver_id = <user>` for drivers.
- **Unstructured data:** chunks are filtered by tenant → role/module ACL → classification, then ranked. Drivers never see `financial` or `restricted` chunks.
- **Pre-retrieval gate:** a question that targets a resource the caller cannot read → 403 with `chunks_retrieved: 0` before any SQL or vector work.

## 6. Key contracts (full list in MASTER_SPEC §7)

- `POST /api/rag/query {question, module}` → `{answer, sources[{document,page}], freshness?, decision?, diagnostics?}`. This is the UI copilot.
- `POST /api/chat {message}` → the AGENTS.md shape `{response, diagnostics{structured_data, retrieved_context, root_cause_verdict}, citations[]}` plus the canonical fields.
- `POST /api/audit/run` → `{status, total_rules_evaluated, violations[{rule_id,label,severity,affected_records[]}]}`.
- `POST /api/audit/rules/compile {text}` → a persistent rule (also written to `demo/rules.json`).
- `GET /api/workspace` → the RBAC-projected UI snapshot. It is how the React app plugs in with minimal changes.

The P0 endpoints are auth, workspace, modules, invites, members, documents, `rag/query`, shipments, procurement and security-events. P1 and P2 are listed in MASTER_SPEC §7.

## 7. Golden seed (MASTER_SPEC §5.4)

- **Inventory:** B-101 Whole Milk (3.1 °C) · **B-104 Greek Yogurt (8.2 °C, max 4.0)** · B-202 Frozen Salmon (−18.5 °C), plus the Expiry Guard lots.
- **Shipments:** SH-901 Casablanca→Rabat (Delivered) · **SH-905 Casablanca→Tangier, TRK-88, Delayed**, plus the Acme delivery board.
- **Telemetry:** TRK-88 spikes to 8.2 °C at 14:15 UTC.
- **Docs:** `workshop_log.pdf` (TRK-88 compressor drive-belt wear, part on backorder, deferred maintenance), `carrier_sop.pdf`, quotations, policies.
- **Demo logins:** `operator@nexus-demo.io` / `brev-a100` (owner). Everyone else uses `demo1234`: `jordan.lee@` (driver), `tess.vos@` (procurement), `priya.shah@` (data architect).

## 8. Delivery sequence (final hour)

| Minutes | Work |
|---|---|
| 0–10 | Scaffold, DDL, seed, auth, permissions, `/health`; the frontend proxy and `live.ts` skeleton |
| 10–30 | Subsystems in parallel: SQL + snapshot + routers · RAG · agent + audit + expiry · frontend mutation swap, Diagnostics, Compliance |
| 30–45 | Integration: golden path (rule → audit alert → root-cause verdict) and security path (driver → financial denial → incident visible to owner) |
| 45–55 | `pytest -q`, `npm run check`, README, screenshots |
| 55–60 | Freeze, tag `v1-demo`, 60 s backup video |

**Never cut:** the RBAC gate, the SQL guard, RAG pre-filtering, the golden root-cause path, the 403 demo.

## 9. Working rules

- Read-only SQL only, validated before execution.
- RBAC filters are non-negotiable: filter before ranking (RAG) and inject WHERE conditions (SQL).
- Commit per subsystem with imperative messages. Never commit secrets, `.env`, the DuckDB file or uploads.
- Every assignment, decision and status change gets posted in Discord to the bot. Undocumented work does not exist.
- The pinned demo data is the contract: end-to-end demos run against `demo/seed.py` output.
- The frontend's TypeScript types define the JSON shapes. When a mismatch appears, fix it on the backend first.
