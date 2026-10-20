"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products, locations } from "@/db/schema";
import { ensurePermission } from "@/server/guard";
import { writeAudit } from "@/server/auth";
import { requireFrom, optionalStr } from "@/lib/money";
import { insertStockMove } from "@/server/services/core";

async function assertProductOfTenant(tenantId: string, productId: string, locationId: string): Promise<{ unit: string; sku: string }> {
  const db = getDb();
  const p = db.select().from(products).where(and(eq(products.id, productId), eq(products.tenantId, tenantId))).get();
  if (!p) throw new Error("Product not found in your organization");
  const loc = db.select().from(locations).where(and(eq(locations.id, locationId), eq(locations.tenantId, tenantId))).get();
  if (!loc) throw new Error("Location not found in your organization");
  return { unit: p.baseUnit, sku: p.sku };
}

export async function adjustStockAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("inventory.adjust");
    const db = getDb();

    const productId = requireFrom(formData, "productId");
    const locationId = requireFrom(formData, "locationId");
    const direction = requireFrom(formData, "direction", ["in", "out"] as const);
    const qty = requireFrom(formData, "qty");
    const lotNo = optionalStr(formData, "lotNo");
    const note = optionalStr(formData, "note");

    const info = await assertProductOfTenant(user.tenantId, productId, locationId);

    const moveId = insertStockMove(db, { tenantId: user.tenantId, userId: user.id }, {
      productId,
      locationId,
      direction,
      qty,
      unit: info.unit,
      lotNo,
      reason: "adjustment",
      refType: "manual",
      note,
    });

    await writeAudit({
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorType: "human",
      action: "stock.adjust",
      entityType: "stock_move",
      entityId: moveId,
      afterJson: { productId, locationId, direction, qty },
      summary: `Stock ${direction === "in" ? "in" : "out"} ${qty} ${info.unit} (${info.sku})`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to adjust stock";
  }
  revalidatePath("/inventory");
  redirect(error ? `/inventory?error=${encodeURIComponent(error)}` : "/inventory?saved=1");
}

export async function transferStockAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("inventory.transfer");
    const db = getDb();

    const productId = requireFrom(formData, "productId");
    const fromLocation = requireFrom(formData, "fromLocationId");
    const toLocation = requireFrom(formData, "toLocationId");
    const qty = requireFrom(formData, "qty");
    const lotNo = optionalStr(formData, "lotNo");
    const note = optionalStr(formData, "note");

    if (fromLocation === toLocation) throw new Error("Source and destination must differ");
    const info = await assertProductOfTenant(user.tenantId, productId, fromLocation);
    await assertProductOfTenant(user.tenantId, productId, toLocation);

    const outId = insertStockMove(db, { tenantId: user.tenantId, userId: user.id }, {
      productId, locationId: fromLocation, direction: "out", qty, unit: info.unit, lotNo,
      reason: "transfer_out", refType: "transfer", note,
    });
    const inId = insertStockMove(db, { tenantId: user.tenantId, userId: user.id }, {
      productId, locationId: toLocation, direction: "in", qty, unit: info.unit, lotNo,
      reason: "transfer_in", refType: "transfer", note,
    });

    await writeAudit({
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorType: "human",
      action: "stock.transfer",
      entityType: "stock_move",
      entityId: `${outId}/${inId}`,
      afterJson: { productId, fromLocation, toLocation, qty },
      summary: `Transferred ${qty} ${info.unit} (${info.sku}) between locations`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to transfer stock";
  }
  revalidatePath("/inventory");
  redirect(error ? `/inventory?error=${encodeURIComponent(error)}` : "/inventory?saved=1");
}

