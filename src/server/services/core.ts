import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { products, purchaseOrders, salesOrders, stockMoves, batches, invoices } from "@/db/schema";
import { parseQty } from "@/lib/money";

/* ───────── inventory core (single source of truth = ledger) ───────── */

export function stockLevels(db: ReturnType<typeof getDb>, tenantId: string, locationId?: string) {
  const rows = db
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      unit: products.baseUnit,
      kind: products.kind,
      reorderPoint: products.reorderPoint,
      onHand: sql<string>`coalesce(sum(case ${stockMoves.direction} when 'in' then cast(${stockMoves.qty} as real) else -cast(${stockMoves.qty} as real) end), 0)`,
    })
    .from(products)
    .leftJoin(
      stockMoves,
      locationId
        ? and(eq(stockMoves.productId, products.id), eq(stockMoves.tenantId, tenantId), eq(stockMoves.locationId, locationId))
        : and(eq(stockMoves.productId, products.id), eq(stockMoves.tenantId, tenantId)),
    )
    .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")))
    .groupBy(products.id, products.sku, products.name, products.baseUnit, products.kind, products.reorderPoint)
    .all();
  return rows.map((r) => ({ ...r, onHand: Number(r.onHand ?? "0") }));
}

export function insertStockMove(
  db: ReturnType<typeof getDb>,
  ctx: { tenantId: string; userId: string },
  input: {
    productId: string;
    locationId: string;
    direction: "in" | "out";
    qty: string;
    unit: string;
    lotNo?: string | null;
    batchId?: string | null;
    reason: "purchase" | "consumption" | "production_output" | "sale" | "adjustment" | "transfer_in" | "transfer_out";
    refType?: string | null;
    refId?: string | null;
    unitCostMinor?: number;
    note?: string | null;
  },
) {
  const qty = parseQty(input.qty);
  if (qty === null || Number(qty) <= 0) throw new Error("Invalid quantity");
  const id = crypto.randomUUID();
  db.insert(stockMoves)
    .values({
      id,
      tenantId: ctx.tenantId,
      productId: input.productId,
      locationId: input.locationId,
      direction: input.direction,
      qty,
      unit: input.unit,
      lotNo: input.lotNo ?? null,
      batchId: input.batchId ?? null,
      reason: input.reason,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      unitCostMinor: input.unitCostMinor ?? 0,
      note: input.note ?? null,
      createdBy: ctx.userId,
    })
    .run();
  return id;
}

type NumberedTable = typeof purchaseOrders | typeof salesOrders | typeof invoices | typeof batches;

export function nextNumber(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  table: NumberedTable,
  prefix: string,
): string {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .where(eq(table.tenantId, tenantId))
    .get() as { n: number } | undefined;
  const seq = Number(row?.n ?? 0) + 1;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}
