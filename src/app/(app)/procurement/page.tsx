import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { products, purchaseOrderItems, purchaseOrders, suppliers } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty, StatCard, btnCls } from "@/components/ui/kit";
import { money, dt, qtyFmt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createSupplierAction,
  createPOAction,
  addPOItemAction,
  setPOStatusAction,
  receivePOAction,
} from "@/server/actions/procurement-actions";

export default async function ProcurementPage(props: { searchParams: Promise<{ po?: string; error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canWrite = user.isPlatformSuperAdmin || user.permissions.has("procurement.write") || user.permissions.has("*");
  const canApprove = user.isPlatformSuperAdmin || user.permissions.has("procurement.approve") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const supplierRows = db.select().from(suppliers).where(eq(suppliers.tenantId, tid)).orderBy(desc(suppliers.createdAt)).all();
  const pos = db.select().from(purchaseOrders).where(eq(purchaseOrders.tenantId, tid)).orderBy(desc(purchaseOrders.createdAt)).all();

  const selectedId = sp.po;
  const selected = selectedId ? pos.find((p) => p.id === selectedId) : undefined;
  const selectedItems = selected
    ? db
        .select({ it: purchaseOrderItems, sku: products.sku, name: products.name })
        .from(purchaseOrderItems)
        .innerJoin(products, eq(products.id, purchaseOrderItems.productId))
        .where(eq(purchaseOrderItems.poId, selected.id))
        .all()
    : [];
  const canEditSelected = canWrite && selected && selected.status === "draft";
  const activeProducts = db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tid), inArray(products.status, ["active", "draft"])))
    .all();

  return (
    <div className="space-y-6">
      <PageHeader title="Procurement" subtitle="Suppliers, purchase orders and goods receipt">
        <StatCard label="Suppliers" value={supplierRows.length} />
        <StatCard label="Open POs" value={pos.filter((p) => !["received", "closed", "cancelled"].includes(p.status)).length} />
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canWrite ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Add supplier</h2>
            <form action={createSupplierAction} className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-xs font-medium text-slate-600">
                Name <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Contact <input name="contact" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Phone <input name="phone" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <div className="col-span-2"><SubmitButton ghost={false}>Add supplier</SubmitButton></div>
            </form>
          </Card>
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">New purchase order</h2>
            <form action={createPOAction} className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-xs font-medium text-slate-600">
                Supplier
                <select name="supplierId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select supplier…</option>
                  {supplierRows.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Expected <input type="date" name="expectedAt" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="col-span-2 text-xs font-medium text-slate-600">
                Notes <input name="notes" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <div className="col-span-2"><SubmitButton>Create draft PO</SubmitButton></div>
            </form>
          </Card>
        </div>
      ) : null}

      {selected ? (
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {selected.poNumber} <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
              </h2>
              <p className="text-xs text-slate-500">
                {supplierRows.find((s) => s.id === selected.supplierId)?.name} · expected {dt(selected.expectedAt)} · total {money(selected.totalMinor)}
              </p>
            </div>
            <Link href="/procurement" className="text-xs font-medium text-slate-500 hover:underline">clear selection</Link>
          </div>

          <Table headers={["SKU", "Item", "Qty", "Unit", "Unit price", "Received", "Line total"]}>
            {selectedItems.map(({ it, sku, name }) => (
              <tr key={it.id}>
                <Td className="font-mono text-xs">{sku}</Td>
                <Td>{name}</Td>
                <Td>{qtyFmt(it.qty, it.unit)}</Td>
                <Td>{it.unit}</Td>
                <Td>{money(it.unitPriceMinor, selected.currency)}</Td>
                <Td>{qtyFmt(it.receivedQty, it.unit)}</Td>
                <Td>{money(it.unitPriceMinor * Math.round(Number(it.qty)), selected.currency)}</Td>
              </tr>
            ))}
          </Table>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canEditSelected ? (
              <form action={setPOStatusAction} className="inline">
                <input type="hidden" name="poId" value={selected.id} />
                <input type="hidden" name="status" value="submitted" />
                <SubmitButton ghost>Submit for approval</SubmitButton>
              </form>
            ) : null}
            {selected.status === "submitted" && canApprove ? (
              <form action={setPOStatusAction} className="inline">
                <input type="hidden" name="poId" value={selected.id} />
                <input type="hidden" name="status" value="approved" />
                <SubmitButton>Approve PO</SubmitButton>
              </form>
            ) : null}
            {selected.status === "approved" && canWrite ? (
              <form action={receivePOAction} className="inline">
                <input type="hidden" name="poId" value={selected.id} />
                <input type="hidden" name="lotNo" placeholder="" />
                <SubmitButton>Receive goods → stock</SubmitButton>
              </form>
            ) : null}
            {["draft", "submitted"].includes(selected.status) && canWrite ? (
              <form action={setPOStatusAction} className="inline">
                <input type="hidden" name="poId" value={selected.id} />
                <input type="hidden" name="status" value="cancelled" />
                <button className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Cancel PO</button>
              </form>
            ) : null}
          </div>

          {canEditSelected ? (
            <form action={addPOItemAction} className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
              <input type="hidden" name="poId" value={selected.id} />
              <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-2">
                Add line item
                <select name="productId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select product…</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Qty
                <input name="qty" type="number" min="0" step="0.001" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Unit price (PKR)
                <input name="unitPrice" type="number" min="0" step="0.01" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <div className="col-span-2 sm:col-span-4">
                <SubmitButton ghost>Add item line</SubmitButton>
              </div>
            </form>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Purchase orders</h2>
        </div>
        {pos.length === 0 ? (
          <div className="p-6"><Empty message="No purchase orders yet." /></div>
        ) : (
          <Table headers={["PO #", "Supplier", "Status", "Total", "Created", ""]}>
            {pos.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <Td className="font-mono text-xs">
                  <Link href={`/procurement?po=${p.id}`} className="font-medium text-emerald-700 hover:underline">{p.poNumber}</Link>
                </Td>
                <Td>{supplierRows.find((s) => s.id === p.supplierId)?.name ?? "—"}</Td>
                <Td><Badge tone={statusTone(p.status)}>{p.status}</Badge></Td>
                <Td>{money(p.totalMinor, p.currency)}</Td>
                <Td className="text-xs">{dt(p.createdAt)}</Td>
                <Td>{["draft", "submitted", "approved"].includes(p.status) ? <Link href={`/procurement?po=${p.id}`} className="text-xs text-slate-500 hover:underline">manage</Link> : null}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Suppliers</h2>
        </div>
        {supplierRows.length === 0 ? (
          <div className="p-6"><Empty message="No suppliers yet." /></div>
        ) : (
          <Table headers={["Name", "Contact", "Phone", "Lead days", "Status"]}>
            {supplierRows.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60">
                <Td className="font-medium text-slate-900">{s.name}</Td>
                <Td>{s.contact ?? "—"}</Td>
                <Td>{s.phone ?? "—"}</Td>
                <Td>{s.leadTimeDays}d</Td>
                <Td><Badge tone={statusTone(s.status)}>{s.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
