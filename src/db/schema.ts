/**
 * Phase 1 platform-foundation schema (Cloudflare D1 / SQLite compatible).
 *
 * Conventions:
 * - IDs are text (server-generated UUIDs) — D1 safe, tenant-safe.
 * - Timestamps are integer unix-epoch UTC.
 * - Every business table is tenant-scoped. audit_events carries tenant_id.
 * - Money/decimal columns always live with explicit units in sibling columns.
 */
import { sqliteTable, text, integer, index, uniqueIndex, type TableConfig } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const $id = {
  id: text().notNull().primaryKey(),
};

const $createdAt = {
  createdAt: integer({ mode: "timestamp_ms" }).notNull().default(sql`(unixepoch('subsec') * 1000)`),
};

/** Root isolation boundary: one row per independent company/manufacturer. */
export const tenants = sqliteTable(
  "tenants",
  {
    ...$id,
    name: text().notNull(),
    slug: text().notNull().unique(),
    country: text().notNull().default("PK"),
    currency: text().notNull().default("PKR"),
    timezone: text().notNull().default("Asia/Karachi"),
    decimalDigits: integer().notNull().default(2),
    active: integer({ mode: "boolean" }).notNull().default(true),
    ...$createdAt,
  },
  (t) => [index("tenants_slug_idx").on(t.slug)],
);

/** Human users + service accounts. actor_type distinguishes them in audit. */
export const users = sqliteTable(
  "users",
  {
    ...$id,
    tenantId: text().notNull().references(() => tenants.id),
    email: text().notNull(),
    emailVerifiedAt: integer({ mode: "timestamp_ms" }),
    passwordHash: text().notNull(),
    fullName: text().notNull(),
    employeeCode: text(),
    status: text().notNull().default("active"), // active | disabled | invited
    isServiceAccount: integer({ mode: "boolean" }).notNull().default(false),
    isPlatformSuperAdmin: integer({ mode: "boolean" }).notNull().default(false),
    locale: text().notNull().default("en"),
    ...$createdAt,
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_tenant_idx").on(t.tenantId, t.status),
  ],
);

/** Built-in system roles (tenantId null) and tenant-custom roles. */
export const roles = sqliteTable(
  "roles",
  {
    ...$id,
    tenantId: text().references(() => tenants.id),
    key: text().notNull(), // org_owner | erp_admin | production_manager | ...
    name: text().notNull(),
    isBuiltin: integer({ mode: "boolean" }).notNull().default(false),
    ...$createdAt,
  },
  (t) => [
    // Per-tenant uniqueness. NULL tenantId (builtin roles) stays distinct in SQLite.
    uniqueIndex("roles_tenant_key_unique").on(t.tenantId, t.key),
    index("roles_tenant_idx").on(t.tenantId),
  ],
);

/** Granular permission catalog keys, e.g. inventory.read, production.approve. */
export const permissions = sqliteTable("permissions", {
  key: text().primaryKey(),
  description: text().notNull(),
  module: text().notNull(), // inventory | production | lab | finance | admin ...
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text().notNull().references(() => roles.id),
    permissionKey: text().notNull().references(() => permissions.key),
    ...$createdAt,
  },
  (t) => [
    uniqueIndex("role_permissions_unique").on(t.roleId, t.permissionKey),
    index("role_permissions_perm_idx").on(t.permissionKey),
  ],
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text().notNull().references(() => users.id),
    roleId: text().notNull().references(() => roles.id),
    ...$createdAt,
  },
  (t) => [
    uniqueIndex("user_roles_unique").on(t.userId, t.roleId),
    index("user_roles_role_idx").on(t.roleId),
  ],
);

/** Server-side sessions. Password/session secrets never leave the server. */
export const sessions = sqliteTable(
  "sessions",
  {
    ...$id,
    userId: text().notNull().references(() => users.id),
    tokenHash: text().notNull().unique(),
    expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
    lastActivityAt: integer({ mode: "timestamp_ms" }).notNull().default(sql`(unixepoch('subsec') * 1000)`),
    revokedAt: integer({ mode: "timestamp_ms" }),
    revokedReason: text(),
    ip: text(),
    userAgent: text(),
    ...$createdAt,
  },
  (t) => [index("sessions_user_idx").on(t.userId, t.revokedAt)],
);

/** Brute-force protection record per login attempt. */
export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    ...$id,
    tenantId: text().references(() => tenants.id),
    emailAttempted: text().notNull(),
    success: integer({ mode: "boolean" }).notNull(),
    ip: text(),
    userAgent: text(),
    ...$createdAt,
  },
  (t) => [index("login_attempts_email_idx").on(t.emailAttempted, t.createdAt)],
);

/**
 * Tamper-evident append-only audit trail. Rows are never updated or deleted
 * by application code. actorType distinguishes human | service | ai | job.
 */
export const auditEvents = sqliteTable(
  "audit_events",
  {
    ...$id,
    tenantId: text().references(() => tenants.id),
    actorUserId: text().references(() => users.id),
    actorType: text().notNull().default("human"), // human | service | ai | job
    messageId: text().notNull(), // chain hash: sha256(prevEventHash + payload)
    prevMessageId: text(),
    action: text().notNull(), // login.success | batch.create | stock.adjust ...
    entityType: text().notNull(),
    entityId: text().notNull(),
    requestId: text(),
    source: text().notNull().default("web"), // web | api | mcp | automation
    beforeJson: text(),
    afterJson: text(),
    ip: text(),
    ...$createdAt,
  },
  (t) => [
    index("audit_events_tenant_idx").on(t.tenantId, t.createdAt),
    index("audit_events_entity_idx").on(t.entityType, t.entityId),
    index("audit_events_actor_idx").on(t.actorUserId, t.createdAt),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
