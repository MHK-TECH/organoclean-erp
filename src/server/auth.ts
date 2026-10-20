import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, desc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditEvents,
  loginAttempts,
  permissions,
  rolePermissions,
  roles,
  sessions,
  userRoles,
  users,
} from "@/db/schema";
import { PERMISSIONS } from "@/db/permissions";

const SESSION_COOKIE = "oc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h idle-reset window

/* ───────── password hashing (scrypt, no native deps) ───────── */

export function hashPassword(password: string): string {
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/* ───────── sessions ───────── */

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionFor(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const db = getDb();
  const h = await headers();
  const now = Date.now();
  db.insert(sessionsTable())
    .values({
      id: crypto.randomUUID(),
      userId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(now + SESSION_TTL_MS),
      ip: h.get("x-forwarded-for") ?? "local",
      userAgent: h.get("user-agent") ?? "unknown",
    })
    .run();
  return token;
}

// keep a local alias to avoid circular naming import
function sessionsTable() {
  return sessions;
}

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  tenantId: string;
  isPlatformSuperAdmin: boolean;
  permissions: Set<string>;
  roles: { id: string; key: string; name: string }[];
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();

  const row = db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, sql`(unixepoch('subsec') * 1000)`)))
    .get();

  if (!row || row.user.status !== "active") return null;

  // role check on every request (revocation-safe)
  const roleRows = db
    .select({ id: roles.id, key: roles.key, name: roles.name })
    .from(roles)
    .innerJoin(userRoles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, row.user.id))
    .all();

  const permKeys = resolvePermissionsForUser(db, row.user.id);

  return {
    id: row.user.id,
    email: row.user.email,
    fullName: row.user.fullName,
    tenantId: row.user.tenantId,
    isPlatformSuperAdmin: row.user.isPlatformSuperAdmin,
    permissions: new Set(permKeys.map((p: { key: string }) => p.key)),
    roles: roleRows,
  };
}

type DrizzleDb = ReturnType<typeof getDb>;

export function resolvePermissionsForUser(db: DrizzleDb, userId: string): { key: string }[] {
  const rows = db
    .selectDistinct({ key: rolePermissions.permissionKey })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
    .all();
  return rows;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isPlatformSuperAdmin && !user.permissions.has(permission)) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
  return user;
}

/* ───────── login/logout ───────── */

export async function attemptLogin(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "local";
  const userAgent = h.get("user-agent") ?? "unknown";

  // light brute-force gate: 5 fails per email in 15 minutes
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const fails = db
    .select({ n: loginAttempts.id })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.emailAttempted, email.toLowerCase()), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)))
    .all();
  if (fails.length >= 5) {
    return { ok: false, error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  if (!user || user.isServiceAccount || user.status !== "active" || !verifyPassword(password, user.passwordHash)) {
    recordLoginAttempt(db, user?.tenantId ?? null, email.toLowerCase(), false, ip, userAgent);
    return { ok: false, error: "Invalid email or password." };
  }

  recordLoginAttempt(db, user.tenantId, email.toLowerCase(), true, ip, userAgent);

  const token = await createSessionFor(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  await writeAudit({
    tenantId: user.tenantId,
    actorUserId: user.id,
    actorType: "human",
    action: "login.success",
    entityType: "user",
    entityId: user.id,
    source: "web",
    ip,
    summary: null,
  });

  return { ok: true };
}

function recordLoginAttempt(
  db: DrizzleDb,
  tenantId: string | null,
  email: string,
  success: boolean,
  ip: string,
  userAgent: string,
) {
  db.insert(loginAttempts)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      emailAttempted: email,
      success,
      ip,
      userAgent,
    })
    .run();
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const db = getDb();
  const th = tokenHash(token);
  const session = db.select().from(sessions).where(eq(sessions.tokenHash, th)).get();
  if (session) {
    db.update(sessions).set({ revokedAt: new Date(), revokedReason: "logout" }).where(eq(sessions.id, session.id)).run();
    await writeAudit({
      tenantId: null,
      actorUserId: session.userId,
      actorType: "human",
      action: "login.logout",
      entityType: "user",
      entityId: session.userId,
      source: "web",
      ip: session.ip,
      summary: null,
    });
  }
  store.delete(SESSION_COOKIE);
}

/* ───────── audit trail (hash-chained) ───────── */

export type AuditInput = {
  tenantId: string | null;
  actorUserId: string | null;
  actorType: "human" | "service" | "ai" | "job";
  action: string;
  entityType: string;
  entityId: string;
  requestId?: string;
  source?: "web" | "api" | "mcp" | "automation";
  beforeJson?: unknown;
  afterJson?: unknown;
  ip?: string | null;
  summary: string | null;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  const db = getDb();
  const prev = db
    .select({ messageId: auditEvents.messageId })
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(1)
    .get();

  const payload = JSON.stringify({
    t: input.tenantId ?? "",
    a: input.action,
    e: `${input.entityType}:${input.entityId}`,
    u: input.actorUserId ?? "",
    s: input.summary ?? "",
    d: Date.now(),
    r: Math.random().toString(36).slice(2, 8),
  });
  const messageId = createHash("sha256").update((prev?.messageId ?? "GENESIS") + payload).digest("hex");

  db.insert(auditEvents)
    .values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: input.actorType,
      messageId,
      prevMessageId: prev?.messageId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      requestId: input.requestId ?? null,
      source: input.source ?? "web",
      beforeJson: input.beforeJson ? JSON.stringify(input.beforeJson) : null,
      afterJson: input.afterJson ? JSON.stringify(input.afterJson) : null,
      ip: input.ip ?? null,
    })
    .run();
}

/* ───────── bootstrap helpers (seed service) ───────── */

export function ensurePermissionCatalog(): void {
  const db = getDb();
  for (const p of PERMISSIONS) {
    db.insert(permissions).values(p).onConflictDoNothing().run();
  }
}

export const SECURE_COOKIE_NAME = SESSION_COOKIE;
