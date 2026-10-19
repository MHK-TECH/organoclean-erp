# DATABASE_SCHEMA.md — Phase 1 Foundation

> Status: **implemented (schema + migration)**. Runtime wiring and seeding are the next slice.

## Target database

- **Primary target:** Cloudflare D1 (SQLite). Migration: `drizzle/0000_phase1_foundation.sql`.
- **Architecture rule:** portable schema; PostgreSQL can be a supported backend later without renaming concepts.

## Conventions

| Rule | Detail |
|---|---|
| IDs | `text` UUIDs, generated server-side (D1-safe) |
| Timestamps | integer epoch **UTC** (`timestamp_ms`); display via tenant timezone |
| Tenancy | every business table carries `tenant_id`; cross-tenant reads must be tested |
| Money | integer minor units or decimal strings — **never JS floats** (enforced from Phase 2 schemas) |
| Units | every quantity column carries an explicit sibling unit column |
| Audit | `audit_events` is append-only (hash-chained `message_id` / `prev_message_id`) |

## Tables

| Table | Purpose | Key relationships |
|---|---|---|
| `tenants` | One row per company (OrganoClean is the first) | root of everything |
| `users` | Human accounts **and** service accounts (`is_service_account`) | FK tenants |
| `roles` | Built-in system roles (tenantId null) + per-tenant custom roles | unique (tenantId, key) |
| `permissions` | Catalog keys: `inventory.read`, `production.approve`, … (source: `src/db/permissions.ts`) | |
| `role_permissions` | Role → permission grants | FK roles, permissions |
| `user_roles` | User → role assignments | FK users, roles |
| `sessions` | Server-side sessions: `token_hash` unique, expiry, revocation, last activity | FK users |
| `login_attempts` | Brute-force evidence per email/IP | FK tenants |
| `audit_events` | append-only audit: actor, action, entity, before/after, source (`web|api|mcp|automation`) | FK tenants, users |

## Roles (initial builtin set)

`org_owner`, `erp_admin`, `production_manager`, `production_operator`, `lab_scientist`,
`qa_manager`, `inventory_manager`, `warehouse_operator`, `procurement_officer`,
`sales_manager`, `sales_rep`, `finance_manager`, `accountant`, `support_agent`,
`auditor_readonly`, `distributor_portal`, `integration_service`.

Role seeds + permission matrix are introduced with the auth slice (docs/AUTHORIZATION.md).

## Honest limitations

- D1 has no partial indexes, CHECK constraints are SQLite-only, and serializable multi-write transactions are limited — document per workflow when those patterns appear.
- No row is ever hard-deleted from audit events; retention policy documented later in docs/SECURITY.md.
