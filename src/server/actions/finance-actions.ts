"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { invoices, salesOrderItems, salesOrders } from "@/db/schema";
import { ensurePermission } from "@/server/guard";
import { writeAudit } from "@/server/auth";
import { nextNumber } from "@/server/services/core";

export async function createInvoiceFromOrder(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("invoice.approve");
    const db = getDb();
    const orderId = String(formData.get("orderId") ?? "");
    const so = db.select().from(salesOrders).where(and(eq(salesOrders.id, orderId), eq(salesOrders.tenantId, user.tenantId))).get();
    if (!so) throw new Error("Order not found");
    if (so.status !== "dispatched") throw new Error("Only dispatched orders can be invoiced");

    const existing = db.select({ id: invoices.id }).from(invoices).where(eq(invoices.orderId, orderId)).all();
    if (existing.length > 0) throw new Error("Invoice already exists for this order");

    const items = db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, orderId)).all();
    if (items.length === 0) throw new Error("Order has no line items");

    const invoiceNo = nextNumber(db, user.tenantId, invoices, "INV");
    const id = crypto.randomUUID();
    const now = new Date();
    const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    db.insert(invoices)
      .values({
        id,
        tenantId: user.tenantId,
        invoiceNo,
        customerId: so.customerId,
        orderId,
        totalMinor: so.totalMinor,
        status: "draft",
        currency: so.currency,
        issuedAt: now,
        dueAt: due,
      })
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "invoice.create", entityType: "invoice", entityId: id,
      summary: `Invoice ${invoiceNo} drafted from ${so.orderNo}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/finance");
  redirect(error ? `/finance?error=${encodeURIComponent(error)}` : "/finance?saved=1");
}
