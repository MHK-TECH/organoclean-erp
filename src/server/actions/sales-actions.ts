"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  customers,
  invoices,
  locations,
  payments,
  products,
  salesOrderItems,
  salesOrders,
} from "@/db/schema";
import { ensurePermission } from "@/server/guard";
import { writeAudit } from "@/server/auth";
import { requireFrom, optionalStr, parseMinor, parseQtyPositive } from "@/lib/money";
import { nextNumber, insertStockMove } from "@/server/services/core";

export async function createCustomerAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("sales.write");
    const db = getDb();
    const id = crypto.randomUUID();
    db.insert(customers)
      .values({
        id,
        tenantId: user.tenantId,
        name: requireFrom(formData, "name"),
        kind: (optionalStr(formData, "kind") ?? "retail") as string,
        email: optionalStr(formData, "email"),
        phone: optionalStr(formData, "phone"),
        address: optionalStr(formData, "address"),
        creditLimitMinor: parseMinor(formData.get("creditLimit")) ?? 0,
      })
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "customer.create", entityType: "customer", entityId: id,
      summary: `Customer ${String(formData.get("name"))} added`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/customers");
  revalidatePath("/sales");
  redirect(error ? `/customers?error=${encodeURIComponent(error)}` : `/customers?saved=1`);
}

export async function createSOAction(formData: FormData) {
  let error: string | null = null;
  let orderId = "";
  try {
    const user = await ensurePermission("sales.write");
    const db = getDb();
    orderId = crypto.randomUUID();
    const orderNo = nextNumber(db, user.tenantId, salesOrders, "SO");
    db.insert(salesOrders)
      .values({
        id: orderId,
        tenantId: user.tenantId,
        orderNo,
        customerId: requireFrom(formData, "customerId"),
        channel: (optionalStr(formData, "channel") ?? "direct") as string,
        createdBy: user.id,
      })
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "so.create", entityType: "sales_order", entityId: orderId,
      summary: `Sales order ${orderNo} created`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/sales");
  redirect(error ? `/sales?error=${encodeURIComponent(error)}&so=${orderId}` : `/sales?saved=1&so=${orderId}`);
}

export async function addSOItemAction(formData: FormData) {
  let error: string | null = null;
  const orderId = String(formData.get("orderId") ?? "");
  try {
    const user = await ensurePermission("sales.write");
    const db = getDb();
    const so = db.select().from(salesOrders).where(and(eq(salesOrders.id, orderId), eq(salesOrders.tenantId, user.tenantId))).get();
    if (!so) throw new Error("Order not found");
    if (so.status !== "draft") throw new Error("Only draft orders can be edited");

    const product = db.select().from(products).where(and(eq(products.id, requireFrom(formData, "productId")), eq(products.tenantId, user.tenantId))).get();
    if (!product) throw new Error("Product not found");
    const qty = parseQtyPositive(formData.get("qty"));
    if (!qty) throw new Error("Quantity must be positive");
    const unitPrice = parseMinor(formData.get("unitPrice")) ?? product.salesPriceMinor;

    db.insert(salesOrderItems)
      .values({ id: crypto.randomUUID(), tenantId: user.tenantId, orderId, productId: product.id, qty, unit: product.baseUnit, unitPriceMinor: unitPrice })
      .run();
    db.update(salesOrders)
      .set({ totalMinor: sql`${salesOrders.totalMinor} + ${Math.round(Number(qty) * unitPrice)}` })
      .where(eq(salesOrders.id, orderId))
      .run();

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "so.add_item", entityType: "sales_order", entityId: orderId,
      summary: `${product.sku} × ${qty} added to ${so.orderNo}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/sales");
  redirect(error ? `/sales?error=${encodeURIComponent(error)}&so=${orderId}` : `/sales?saved=1&so=${orderId}`);
}

export async function setSOStatusAction(formData: FormData) {
  let error: string | null = null;
  const orderId = String(formData.get("orderId") ?? "");
  try {
    const user = await ensurePermission("sales.write");
    const db = getDb();
    const target = String(formData.get("status") ?? "");
    const so = db.select().from(salesOrders).where(and(eq(salesOrders.id, orderId), eq(salesOrders.tenantId, user.tenantId))).get();
    if (!so) throw new Error("Order not found");

    if (target === "confirmed" && so.status !== "draft") throw new Error("Invalid transition");
    if (target === "cancelled" && ["dispatched", "completed"].includes(so.status)) throw new Error("Cannot cancel after dispatch");
    if (target === "dispatched" && so.status !== "confirmed") throw new Error("Confirm the order before dispatch");

    if (target === "dispatched") {
      const loc = db.select().from(locations).where(and(eq(locations.tenantId, user.tenantId), eq(locations.code, "WH-MAIN"))).get()
        ?? db.select().from(locations).where(eq(locations.tenantId, user.tenantId)).limit(1).all()[0];
      if (!loc) throw new Error("Create a warehouse location first");
      const items = db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, orderId)).all();
      for (const item of items) {
        insertStockMove(db, { tenantId: user.tenantId, userId: user.id }, {
          productId: item.productId, locationId: loc.id, direction: "out", qty: item.qty, unit: item.unit,
          reason: "sale", refType: "sales_order", refId: orderId, note: `${so.orderNo} dispatch`,
        });
      }
      db.update(salesOrders).set({ status: "dispatched", dispatchedAt: new Date() }).where(eq(salesOrders.id, orderId)).run();
    } else {
      db.update(salesOrders).set({ status: target }).where(eq(salesOrders.id, orderId)).run();
    }

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: `so.${target}`, entityType: "sales_order", entityId: orderId,
      beforeJson: { status: so.status }, afterJson: { status: target },
      summary: `${so.orderNo} → ${target}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/sales");
  revalidatePath("/inventory");
  redirect(error ? `/sales?error=${encodeURIComponent(error)}&so=${orderId}` : `/sales?saved=1&so=${orderId}`);
}

/** Invoice approval + payment receive on /finance. */
export async function approveInvoiceAction(formData: FormData) {
  let error: string | null = null;
  const invoiceId = String(formData.get("invoiceId") ?? "");
  try {
    const user = await ensurePermission("invoice.approve");
    const db = getDb();
    const inv = db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, user.tenantId))).get();
    if (!inv) throw new Error("Invoice not found");
    if (inv.status !== "draft") throw new Error("Only draft invoices can be approved");
    db.update(invoices).set({ status: "approved", approvedBy: user.id, issuedAt: new Date() }).where(eq(invoices.id, invoiceId)).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "invoice.approve", entityType: "invoice", entityId: invoiceId,
      beforeJson: { status: inv.status }, afterJson: { status: "approved" },
      summary: `Invoice ${inv.invoiceNo} approved`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/finance");
  redirect(error ? `/finance?error=${encodeURIComponent(error)}` : "/finance?saved=1");
}

export async function recordPaymentAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("finance.write");
    const db = getDb();
    const invoiceId = String(formData.get("invoiceId") ?? "");
    const amount = parseMinor(formData.get("amount"));
    if (!amount || amount <= 0) throw new Error("Enter a payment amount");
    const inv = db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, user.tenantId))).get();
    if (!inv) throw new Error("Invoice not found");
    if (["paid", "cancelled"].includes(inv.status)) throw new Error("Invoice already settled");

    const newPaid = inv.paidMinor + amount;
    db.insert(payments)
      .values({
        id: crypto.randomUUID(),
        tenantId: user.tenantId,
        customerId: inv.customerId,
        invoiceId,
        amountMinor: amount,
        method: (optionalStr(formData, "method") ?? "bank") as string,
        receivedAt: new Date(),
        createdBy: user.id,
        note: `Against invoice ${inv.invoiceNo}`,
      })
      .run();
    db.update(invoices)
      .set({ paidMinor: newPaid, status: newPaid >= inv.totalMinor ? "paid" : "partial" })
      .where(eq(invoices.id, invoiceId))
      .run();

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "payment.record", entityType: "invoice", entityId: invoiceId,
      afterJson: { amount, invoice: inv.invoiceNo },
      summary: `Payment recorded against ${inv.invoiceNo}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/finance");
  redirect(error ? `/finance?error=${encodeURIComponent(error)}` : "/finance?saved=1");
}
