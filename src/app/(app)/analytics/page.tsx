import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { batches, invoices, products, qcInspections, salesOrders } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, StatCard, Empty } from "@/components/ui/kit";
import { money, qtyFmt } from "@/lib/fmt";
import { stockLevels } from "@/server/services/core";

export const instant = false;

export default async function AnalyticsPage() {
  const user = await requireUser();
  const db = getDb();
  const tid = user.tenantId;

  const paidAgg = db
    .select({
      approved: sql<number>`coalesce(sum(case when status in ('approved','paid') then totalMinor else 0 end), 0)`,
      outstanding: sql<number>`coalesce(sum(case when status = 'approved' then totalMinor - paidMinor else 0 end), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(invoices)
    .where(eq(invoices.tenantId, tid))
    .get();

  const soAgg = db
    .select({
      open: sql<number>`sum(case when status in ('draft','confirmed') then 1 else 0 end)`,
      dispatched: sql<number>`sum(case when status = 'dispatched' then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(salesOrders)
    .where(eq(salesOrders.tenantId, tid))
    .get();

  const batchAgg = db
    .select({
      released: sql<number>`sum(case when status in ('released','closed') then 1 else 0 end)`,
      active: sql<number>`sum(case when status in ('planned','approved','in_production') then 1 else 0 end)`,
      qcHold: sql<number>`sum(case when status = 'qc_pending' then 1 else 0 end)`,
      produced: sql<number>`coalesce(sum(case when status in ('released','closed') then cast(producedQty as real) else 0 end), 0)`,
    })
    .from(batches)
    .where(eq(batches.tenantId, tid))
    .get();

  const qcPass = db
    .select({
      pass: sql<number>`sum(case when result = 'pass' then 1 else 0 end)`,
      fail: sql<number>`sum(case when result = 'fail' then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(qcInspections)
    .where(eq(qcInspections.tenantId, tid))
    .get();

  const levels = stockLevels(db, tid).filter((l) => l.onHand <= Number(l.reorderPoint ?? 0));
  const productRows = db.select().from(products).where(eq(products.tenantId, tid)).all();
  const prodName = new Map(productRows.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Operational KPIs across sales, production and quality" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <StatCard label="Invoiced" value={money(Number(paidAgg?.approved ?? 0))} />
        <StatCard label="Outstanding" value={money(Number(paidAgg?.outstanding ?? 0))} />
        <StatCard label="Sales orders" value={`${Number(soAgg?.dispatched ?? 0)}/${Number(soAgg?.total ?? 0)} dispatched`} />
        <StatCard label="Batches released" value={Number(batchAgg?.released ?? 0)} />
        <StatCard label="QC pass rate" value={Number(qcPass?.total ?? 0) === 0 ? "—" : `${Math.round((Number(qcPass?.pass ?? 0) / Number(qcPass!.total)) * 100)}%`} />
        <StatCard label="Batches on QC hold" value={Number(batchAgg?.qcHold ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">At/below reorder point</h2></div>
          {levels.length === 0 ? (
            <div className="p-6"><Empty message="All positions at or above reorder point." /></div>
          ) : (
            <Table headers={["SKU", "Product", "On hand", "Unit", "Reorder point", "Status"]}>
              {levels.map((l) => (
                <tr key={l.productId}>
                  <Td className="font-mono text-xs">{l.sku}</Td>
                  <Td className="font-medium">{l.name}</Td>
                  <Td>{qtyFmt(String(l.onHand), l.unit)}</Td>
                  <Td className="text-xs">{l.unit}</Td>
                  <Td className="text-xs">{l.reorderPoint ?? "—"}</Td>
                  <Td><Badge tone={l.onHand <= 0 ? "red" : "amber"}>{l.onHand <= 0 ? "out" : "low"}</Badge></Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card className="p-4 text-xs text-slate-500">
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Invoiced includes invoices approved or paid; outstanding = approved − payments received.</li>
            <li>QC pass rate covers all recorded inspections (in-process &amp; finished goods).</li>
            <li>Produced to date: {qtyFmt(String(Math.round(Number(batchAgg?.produced ?? 0) * 1000) / 1000), "")} units combined.</li>
            <li>Catalog size: {productRows.length} products, {prodName.size} tracked.</li>
            <li>WooCommerce &amp; external analytics sync land via the Integrations module.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
