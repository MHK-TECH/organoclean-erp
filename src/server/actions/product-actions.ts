"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products, locations } from "@/db/schema";
import { requireUser, writeAudit } from "@/server/auth";
import { ensurePermission } from "@/server/guard";
import { requireFrom, optionalStr, parseMinor, parseQty } from "@/lib/money";

const KINDS = ["raw", "intermediate", "finished", "packaging"] as const;

export async function createProductAction(_prev: unknown, formData: FormData) {
  try {
    const user = await ensurePermission("products.write");
    if (!_prev) { /* noop, keeps signature from useActionState */ }
    void _prev;

    const db = getDb();
    const sku = requireFrom(formData, "sku");
    const name = requireFrom(formData, "name");
    const kind = requireFrom(formData, "kind", KINDS);
    const baseUnit = requireFrom(formData, "baseUnit");

    const id = crypto.randomUUID();
    db.insert(products)
      .values({
        id,
        tenantId: user.tenantId,
        sku,
        name,
        kind,
        baseUnit,
        category: optionalStr(formData, "category"),
        description: optionalStr(formData, "description"),
        reorderPoint: parseQty(formData.get("reorderPoint")) ?? "0",
        minStock: parseQty(formData.get("minStock")) ?? "0",
        salesPriceMinor: parseMinor(formData.get("salesPrice")) ?? 0,
        costPriceMinor: parseMinor(formData.get("costPrice")) ?? 0,
      })
      .run();

    await writeAudit({
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorType: "human",
      action: "product.create",
      entityType: "product",
      entityId: id,
      summary: `Created product ${sku} — ${name}`,
    });
    revalidatePath("/products");
    revalidatePath("/");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create product" };
  }
}

export async function updateProductStatusAction(formData: FormData) {
  const user = await ensurePermission("products.write");
  const db = getDb();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["active", "draft", "archived"].includes(status)) return;

  const before = db.select().from(products).where(eq(products.id, id)).get();
  if (!before || before.tenantId !== user.tenantId) return;

  db.update(products).set({ status }).where(and(eq(products.id, id), eq(products.tenantId, user.tenantId))).run();

  await writeAudit({
    tenantId: user.tenantId,
    actorUserId: user.id,
    actorType: "human",
    action: "product.status_change",
    entityType: "product",
    entityId: id,
    beforeJson: { status: before.status },
    afterJson: { status },
    summary: `Product ${before.sku} → ${status}`,
  });
  revalidatePath("/products");
}

export async function createLocationAction(formData: FormData) {
  const user = await ensurePermission("settings.manage");
  const db = getDb();
  const name = requireFrom(formData, "name");
  const code = requireFrom(formData, "code");
  const kind = optionalStr(formData, "kind") ?? "warehouse";

  const id = crypto.randomUUID();
  db.insert(locations).values({ id, tenantId: user.tenantId, name, code, kind }).run();

  await writeAudit({
    tenantId: user.tenantId,
    actorUserId: user.id,
    actorType: "human",
    action: "location.create",
    entityType: "location",
    entityId: id,
    summary: `Location ${code} created (${name})`,
  });
  revalidatePath("/organization");
  revalidatePath("/inventory");
}
