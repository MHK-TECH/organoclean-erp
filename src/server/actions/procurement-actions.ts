"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { locations, products, purchaseOrderItems, purchaseOrders, suppliers } from "@/db/schema";
import { ensurePermission } from "@/server/guard";
import { writeAudit } from "@/server/auth";
import { requireFrom, optionalStr, parseMinor, parseQtyPositive } from "@/lib/money";
import { nextNumber, insertStockMove } from "@/server/services/core";

export async function createSupplierAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("procurement.write");
    const db = getDb();
    const id = crypto.randomUUID();
    db.insert(suppliers)
      .values({
        id,
        tenantId: user.tenantId,
        name: requireFrom(formData, "name"),
        contact: optionalStr(formData, "contact"),
        email: optionalStr(formData, "email"),
        phone: optionalStr(formData, "phone"),
        address: optionalStr(formData, "address"),
      })
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "supplier.create", entityType: "supplier", entityId: id,
      summary: `Supplier ${String(formData.get("name"))} added`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/procurement");
  redirect(error ? `/procurement?error=${encodeURIComponent(error)}` : "/procurement?saved=1");
}

export async function createPOAction(formData: FormData) {
  let error: string | null = null;
  let poId = "";
  try {
    const user = await ensurePermission("procurement.write");
    const db = getDb();
    poId = crypto.randomUUID();
    const poNumber = nextNumber(db, user.tenantId, purchaseOrders, "PO");
    db.insert(purchaseOrders)
      .values({
        id: poId,
        tenantId: user.tenantId,
        poNumber,
        supplierId: requireFrom(formData, "supplierId"),
        expectedAt: optionalStr(formData, "expectedAt") ? new Date(String(formData.get("expectedAt"))) : null,
        notes: optionalStr(formData, "notes"),
        createdBy: user.id,
      })
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "po.create", entityType: "purchase_order", entityId: poId,
      summary: `Purchase order ${poNumber} created`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/procurement");
  redirect(error ? `/procurement?error=${encodeURIComponent(error)}&po=${poId}` : `/procurement?saved=1&po=${poId}`);
}

export async function addPOItemAction(formData: FormData) {
  let error: string | null = null;
  const poId = String(formData.get("poId") ?? "");
  try {
    const user = await ensurePermission("procurement.write");
    const db = getDb();
    const po = db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, user.tenantId))).get();
    if (!po) throw new Error("PO not found");
    if (po.status !== "draft") throw new Error("Only draft POs can be edited");

    const product = db.select().from(products).where(and(eq(products.id, requireFrom(formData, "productId")), eq(products.tenantId, user.tenantId))).get();
    if (!product) throw new Error("Product not found");

    const qty = parseQtyPositive(formData.get("qty"));
    if (!qty) throw new Error("Quantity must be a positive number");
    const unitPrice = parseMinor(formData.get("unitPrice")) ?? product.costPriceMinor;

    db.insert(purchaseOrderItems)
      .values({ id: crypto.randomUUID(), tenantId: user.tenantId, poId, productId: product.id, qty, unit: product.baseUnit, unitPriceMinor: unitPrice })
      .run();

    db.update(purchaseOrders)
      .set({ totalMinor: sql`${purchaseOrders.totalMinor} + ${Math.round(Number(qty) * unitPrice)}` })
      .where(eq(purchaseOrders.id, poId))
      .run();

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "po.add_item", entityType: "purchase_order", entityId: poId,
      summary: `Item ${product.sku} × ${qty} added to ${po.poNumber}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/procurement");
  redirect(error ? `/procurement?error=${encodeURIComponent(error)}&po=${poId}` : `/procurement?saved=1&po=${poId}`);
}

export async function setPOStatusAction(formData: FormData) {
  let error: string | null = null;
  const poId = String(formData.get("poId") ?? "");
  try {
    const user = await ensurePermission("procurement.write");
    const permission2 = user.permissions.has("procurement.approve") || user.isPlatformSuperAdmin || user.permissions.has("*");
    const db = getDb();
    const target = String(formData.get("status") ?? "");
    const po = db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, user.tenantId))).get();
    if (!po) throw new Error("PO not found");

    if (target === "submitted" && po.status !== "draft") throw new Error("Invalid transition");
    if (target === "approved") {
      if (!permission2) throw new Error("Forbidden: missing permission purchase approval");
      if (po.status !== "submitted") throw new Error("Submit the PO for approval first");
      db.update(purchaseOrders).set({ status: "approved", approvedBy: user.id }).where(eq(purchaseOrders.id, poId)).run();
    } else if (target === "cancelled") {
      if (["received", "closed"].includes(po.status)) throw new Error("Cannot cancel a received PO");
      db.update(purchaseOrders).set({ status: "cancelled" }).where(eq(purchaseOrders.id, poId)).run();
    } else if (target === "submitted") {
      if (db.select({ n: sql<number>`count(*)` }).from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId)).get()?.n === 0) {
        throw new Error("Add at least one line item first");
      }
      db.update(purchaseOrders).set({ status: "submitted" }).where(eq(purchaseOrders.id, poId)).run();
    } else {
      throw new Error("Unsupported status");
    }

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: `po.${target}`, entityType: "purchase_order", entityId: poId,
      beforeJson: { status: po.status }, afterJson: { status: target },
      summary: `${po.poNumber} → ${target}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/procurement");
  redirect(error ? `/procurement?error=${encodeURIComponent(error)}&po=${poId}` : `/procurement?saved=1&po=${poId}`);
}

export async function receivePOAction(formData: FormData) {
  let error: string | null = null;
  const poId = String(formData.get("poId") ?? "");
  try {
    const user = await ensurePermission("procurement.write");
    const db = getDb();
    const po = db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, user.tenantId))).get();
    if (!po) throw new Error("PO not found");
    if (po.status !== "approved") throw new Error("Only approved POs can be received");

    const items = db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId)).all();
    if (items.length === 0) throw new Error("Nothing to receive");

    const loc = db.select().from(locations).where(and(eq(locations.tenantId, user.tenantId), eq(locations.code, "WH-MAIN"))).get()
      ?? db.select().from(locations).where(eq(locations.tenantId, user.tenantId)).limit(1).all()[0];
    if (!loc) throw new Error("Create a warehouse location first");

    for (const item of items) {
      if (item.receivedQty !== "0") continue;
      const p = db.select().from(products).where(eq(products.id, item.productId)).get();
      insertStockMove(db, { tenantId: user.tenantId, userId: user.id }, {
        productId: item.productId,
        locationId: loc.id,
        direction: "in",
        qty: item.qty,
        unit: item.unit,
        reason: "purchase",
        refType: "purchase_order",
        refId: poId,
        lotNo: optionalStr(formData, "lotNo"),
        unitCostMinor: item.unitPriceMinor,
        note: `PO ${po.poNumber}`,
      });
      db.update(purchaseOrderItems).set({ receivedQty: item.qty }).where(eq(purchaseOrderItems.id, item.id)).run();
    }

    db.update(purchaseOrders).set({ status: "received", receivedAt: new Date() }).where(eq(purchaseOrders.id, poId)).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "po.receive", entityType: "purchase_order", entityId: poId,
      beforeJson: { status: "approved" }, afterJson: { status: "received", items: items.length },
      summary: `Goods received against ${po.poNumber}; stock added to ${loc.code}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/procurement");
  revalidatePath("/inventory");
  redirect(error ? `/procurement?error=${encodeURIComponent(error)}&po=${poId}` : `/procurement?saved=1&po=${poId}`);
}
