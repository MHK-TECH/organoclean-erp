import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { customers, products, salesOrderItems, salesOrders } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty, StatCard } from "@/components/ui/kit";
import { money, dt, qtyFmt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { createSOAction, addSOItemAction, setSOStatusAction } from "@/server/actions/sales-actions";

export default async function SalesPage(props: { searchParams: Promise<{ so?: string; error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canWrite = user.isPlatformSuperAdmin || user.permissions.has("sales.write") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const customers_ = db.select().from(customers).where(eq(customers.tenantId, tid)).orderBy(desc(customers.createdAt)).all();
  const orders = db.select().from(salesOrders).where(eq(salesOrders.tenantId, tid)).orderBy(desc(salesOrders.createdAt)).all();
  const selected = sp.so ? orders.find((o) => o.id === sp.so) : undefined;
  const selectedItems = selected
    ? db
        .select({ it: salesOrderItems, sku: products.sku, name: products.name })
        .from(salesOrderItems)
        .innerJoin(products, eq(products.id, salesOrderItems.productId))
        .where(eq(salesOrderItems.orderId, selected.id))
        .all()
    : [];
  const sellable = db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tid), inArray(products.status, ["active", "draft"])))
    .all();

  const canEdit = selected && canWrite && selected.status === "draft";

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" subtitle="Quotes become orders; confirmed orders dispatch from stock">
        <StatCard label="Orders" value={orders.length} />
        <StatCard label="Awaiting dispatch" value={orders.filter((o) => o.status === "confirmed").length} />
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canWrite && customers_.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">New sales order</h2>
          <form action={createSOAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="col-span-2 text-xs font-medium text-slate-600">
              Customer
              <select name="customerId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select customer…</option>
                {customers_.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>
                ))}
              </select>
            </label>
            <div className="flex items-end"><SubmitButton>Create draft order</SubmitButton></div>
          </form>
        </Card>
      ) : null}

      {selected ? (
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {selected.orderNo} <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
              </h2>
              <p className="text-xs text-slate-500">
                {customers_.find((c) => c.id === selected.customerId)?.name} · total {money(selected.totalMinor, selected.currency)} · channel {selected.channel}
              </p>
            </div>
            <Link href="/sales" className="text-xs font-medium text-slate-500 hover:underline">clear</Link>
          </div>

          <Table headers={["SKU", "Item", "Qty", "Unit", "Price", "Line total"]}>
            {selectedItems.map(({ it, sku, name }) => (
              <tr key={it.id}>
                <Td className="font-mono text-xs">{sku}</Td>
                <Td>{name}</Td>
                <Td>{qtyFmt(it.qty, it.unit)}</Td>
                <Td>{money(it.unitPriceMinor, selected.currency)}</Td>
                <Td>{money(it.unitPriceMinor * Math.round(Number(it.qty)), selected.currency)}</Td>
              </tr>
            ))}
          </Table>

          <div className="mt-4 flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <form action={setSOStatusAction} className="inline">
                  <input type="hidden" name="orderId" value={selected.id} />
                  <input type="hidden" name="status" value="confirmed" />
                  <SubmitButton ghost>Confirm order</SubmitButton>
                </form>
                <form action={setSOStatusAction} className="inline">
                  <input type="hidden" name="orderId" value={selected.id} />
                  <input type="hidden" name="status" value="cancelled" />
                  <button className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Cancel</button>
                </form>
              </>
            ) : null}
            {selected.status === "confirmed" && canWrite ? (
              <form action={setSOStatusAction} className="inline">
                <input type="hidden" name="orderId" value={selected.id} />
                <input type="hidden" name="status" value="dispatched" />
                <SubmitButton>Dispatch → move stock</SubmitButton>
              </form>
            ) : null}
          </div>

          {canEdit ? (
            <form action={addSOItemAction} className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
              <input type="hidden" name="orderId" value={selected.id} />
              <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-2">
                Product
                <select name="productId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select product…</option>
                  {sellable.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Qty <input name="qty" type="number" min="0" step="0.001" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Price <input name="unitPrice" type="number" min="0" step="0.01" placeholder="auto" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <div className="col-span-2 sm:col-span-4"><SubmitButton ghost>Add line</SubmitButton></div>
            </form>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Orders</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-6"><Empty message="No orders yet." /></div>
        ) : (
          <Table headers={["Order #", "Customer", "Status", "Total", "Placed", ""]}>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/60">
                <Td className="font-mono text-xs"><Link href={`/sales?so=${o.id}`} className="font-medium text-emerald-700 hover:underline">{o.orderNo}</Link></Td>
                <Td>{customers_.find((c) => c.id === o.customerId)?.name ?? "—"}</Td>
                <Td><Badge tone={statusTone(o.status)}>{o.status}</Badge></Td>
                <Td>{money(o.totalMinor, o.currency)}</Td>
                <Td className="text-xs">{dt(o.placedAt)}</Td>
                <Td>{<Link href={`/sales?so=${o.id}`} className="text-xs text-slate-500 hover:underline">manage</Link>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
