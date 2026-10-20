"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  documents,
  equipment,
  locations,
  roles,
  settings,
  tasks,
  tenants,
  userRoles,
  users,
  sessions,
} from "@/db/schema";
import { ensurePermission } from "@/server/guard";
import { hashPassword, writeAudit } from "@/server/auth";
import { optionalStr, requireFrom } from "@/lib/money";

/* ───────── Equipment & maintenance ───────── */

export async function createEquipmentAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("maintenance.edit");
    const db = getDb();
    const id = crypto.randomUUID();
    const locId = optionalStr(formData, "locationId");
    if (locId) {
      const loc = db.select().from(locations).where(and(eq(locations.id, locId), eq(locations.tenantId, user.tenantId))).get();
      if (!loc) throw new Error("Location not found");
    }
    let nextService: Date | undefined;
    const nsRaw = optionalStr(formData, "nextServiceAt");
    if (nsRaw) {
      const d = new Date(nsRaw);
      if (!Number.isNaN(d.getTime())) nextService = d;
    }
    let lastCal: Date | undefined;
    const lcRaw = optionalStr(formData, "lastCalibratedAt");
    if (lcRaw) {
      const d = new Date(lcRaw);
      if (!Number.isNaN(d.getTime())) lastCal = d;
    }
    db.insert(equipment)
      .values({
        id,
        tenantId: user.tenantId,
        name: requireFrom(formData, "name"),
        model: optionalStr(formData, "model"),
        locationId: locId || null,
        lastCalibratedAt: lastCal ?? null,
        nextServiceAt: nextService ?? null,
      })
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "equipment.create", entityType: "equipment", entityId: id,
      summary: `Equipment registered: ${String(formData.get("name"))}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/maintenance");
  redirect(error ? `/maintenance?error=${encodeURIComponent(error)}` : "/maintenance?saved=1");
}

export async function setEquipmentStatusAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("maintenance.edit");
    const db = getDb();
    const id = requireFrom(formData, "equipmentId");
    const status = requireFrom(formData, "status", ["operational", "maintenance", "breakdown", "retired"] as const);
    const e = db.select().from(equipment).where(and(eq(equipment.id, id), eq(equipment.tenantId, user.tenantId))).get();
    if (!e) throw new Error("Equipment not found");
    db.update(equipment).set({ status }).where(eq(equipment.id, id)).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "equipment.status", entityType: "equipment", entityId: id,
      beforeJson: { status: e.status }, afterJson: { status },
      summary: `${e.name} status → ${status}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/maintenance");
  redirect(error ? `/maintenance?error=${encodeURIComponent(error)}` : "/maintenance?saved=1");
}

/* ───────── Tasks ───────── */

export async function createTaskAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("org.manage");
    const db = getDb();
    const id = crypto.randomUUID();
    db.insert(tasks)
      .values({
        id,
        tenantId: user.tenantId,
        title: requireFrom(formData, "title"),
        description: optionalStr(formData, "description"),
        createdBy: user.id,
        priority: "normal",
      })
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "task.create", entityType: "task", entityId: id,
      summary: `Task created: ${String(formData.get("title"))}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/organization");
  redirect(error ? `/organization?error=${encodeURIComponent(error)}` : "/organization?saved=1");
}

/* ───────── Documents ───────── */

export async function createDocumentAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("docs.manage");
    const db = getDb();
    const id = crypto.randomUUID();
    const kind = requireFrom(formData, "kind", ["sds", "tds", "sop", "certificate", "report", "other"] as const);
    const url = optionalStr(formData, "externalUrl");
    if (!url) throw new Error("Provide a document URL (e.g. Google Drive / SharePoint link)");
    db.insert(documents)
      .values({ id, tenantId: user.tenantId, name: requireFrom(formData, "name"), kind, externalUrl: url })
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "document.create", entityType: "document", entityId: id,
      summary: `Document registered: ${String(formData.get("name"))} (${kind})`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/documents");
  redirect(error ? `/documents?error=${encodeURIComponent(error)}` : "/documents?saved=1");
}

/* ───────── Users & roles ───────── */

function randomTempPassword(): string {
  const words = ["Solvent", "Emulsify", "Beaker", "Titrate", "Catalyst", "Distill"];
  return `${words[Math.floor(Math.random() * words.length)]}@${1000 + Math.floor(Math.random() * 9000)}`;
}

export async function inviteUserAction(
  formData: FormData,
): Promise<void> {
  // invite = create user with temp password (returned visually to the admin)
  let error: string | null = null;
  let okUrl: string | null = null;
  try {
    const user = await ensurePermission("user.admin");
    const db = getDb();
    const email = (optionalStr(formData, "email") ?? "").toLowerCase();
    const fullName = requireFrom(formData, "fullName");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Valid email required");
    if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) throw new Error("Email already registered");

    const tempPassword = randomTempPassword();
    const id = crypto.randomUUID();
    db.insert(users)
      .values({ id, tenantId: user.tenantId, email, fullName, passwordHash: hashPassword(tempPassword), status: "invited" })
      .run();

    const roleKey = optionalStr(formData, "roleKey");
    if (roleKey) {
      const role = db.select().from(roles).where(and(eq(roles.tenantId, user.tenantId), eq(roles.key, roleKey))).get();
      if (role) db.insert(userRoles).values({ userId: id, roleId: role.id }).run();
    }
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "user.create", entityType: "user", entityId: id,
      summary: `Invited ${email} as ${fullName} (role: ${roleKey || "none"})`,
    });
    okUrl = `/users?saved=1&invite=${encodeURIComponent(email)}&pass=${encodeURIComponent(tempPassword)}`;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  if (okUrl) redirect(okUrl);
  redirect(`/users?error=${encodeURIComponent(error ?? "Failed")}`);
}

export async function toggleUserStatusAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("user.admin");
    const db = getDb();
    const targetId = requireFrom(formData, "userId");
    const target = db.select().from(users).where(and(eq(users.id, targetId), eq(users.tenantId, user.tenantId))).get();
    if (!target) throw new Error("User not found");
    if (target.id === user.id) throw new Error("You cannot disable your own account");

    const nextStatus = target.status === "disabled" ? "active" : "disabled";
    if (nextStatus === "disabled") {
      db.update(sessions)
        .set({ revokedAt: new Date(), revokedReason: "user disabled" })
        .where(and(eq(sessions.userId, targetId), isNull(sessions.revokedAt)))
        .run();
    }
    db.update(users).set({ status: nextStatus }).where(eq(users.id, targetId)).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "user.status", entityType: "user", entityId: targetId,
      beforeJson: { status: target.status }, afterJson: { status: nextStatus },
      summary: `${target.email} → ${nextStatus}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/users");
  redirect(error ? `/users?error=${encodeURIComponent(error)}` : "/users?saved=1");
}

export async function assignRoleAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("user.admin");
    const db = getDb();
    const targetId = requireFrom(formData, "userId");
    const roleKey = requireFrom(formData, "roleKey");
    const target = db.select().from(users).where(and(eq(users.id, targetId), eq(users.tenantId, user.tenantId))).get();
    if (!target) throw new Error("User not found");
    const role = db.select().from(roles).where(and(eq(roles.tenantId, user.tenantId), eq(roles.key, roleKey))).get();
    if (!role) throw new Error("Role not found");
    if (db.select({ r: userRoles.roleId }).from(userRoles).where(and(eq(userRoles.userId, targetId), eq(userRoles.roleId, role.id))).get()) {
      throw new Error("Role already assigned");
    }
    db.insert(userRoles).values({ userId: targetId, roleId: role.id }).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "user.assign_role", entityType: "user", entityId: targetId,
      afterJson: { role: roleKey },
      summary: `Assigned role ${roleKey} to ${target.email}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/users");
  redirect(error ? `/users?error=${encodeURIComponent(error)}` : "/users?saved=1");
}

/* ───────── Settings & organization ───────── */

export async function saveSettingsAction(formData: FormData) {
  let error: string | null = null;
  let savedKeys = 0;
  try {
    const user = await ensurePermission("settings.manage");
    const db = getDb();
    const settingKeys = formData.getAll("key") as string[];
    for (const key of settingKeys) {
      const value = formData.get(`v_${key}`);
      if (typeof value !== "string" || value === "") continue;
      db.insert(settings)
        .values({ id: crypto.randomUUID(), tenantId: user.tenantId, key, value })
        .run();
      savedKeys++;
    }
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "settings.save", entityType: "settings", entityId: user.tenantId,
      afterJson: { savedKeys },
      summary: `Saved ${savedKeys} settings`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/settings");
  redirect(error ? `/settings?error=${encodeURIComponent(error)}` : "/settings?saved=1");
}

export async function saveOrganizationAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("org.manage");
    const db = getDb();
    const name = requireFrom(formData, "name");
    const currency = optionalStr(formData, "currency") || "PKR";
    const country = optionalStr(formData, "country") || "PK";
    db.update(tenants)
      .set({ name, currency, country })
      .where(eq(tenants.id, user.tenantId))
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "org.save", entityType: "tenant", entityId: user.tenantId,
      afterJson: { name, currency, country },
      summary: `Organization profile updated (${name}, ${currency})`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/organization");
  redirect(error ? `/organization?error=${encodeURIComponent(error)}` : "/organization?saved=1");
}
