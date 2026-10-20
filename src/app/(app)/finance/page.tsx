import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { customers, invoices, salesOrders, tenants } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty, StatCard } from "@/components/ui/kit";
import { money, dt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { approveInvoiceAction, recordPaymentAction } from "@/server/actions/sales-actions";
import { createInvoiceFromOrder } from "@/server/actions/finance-actions";

export default async function FinancePage(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canApprove = user.isPlatformSuperAdmin || user.permissions.has("invoice.approve") || user.permissions.has("*");
  const canPay = user.isPlatformSuperAdmin || user.permissions.has("finance.write") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;
  const cur = db.select().from(tenants).where(eq(tenants.id, tid)).get();

  const custNames = new Map(
    db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.tenantId, tid)).all().map((c) => [c.id, c.name]),
  );
  const invs = db.select().from(invoices).where(eq(invoices.tenantId, tid)).orderBy(desc(invoices.createdAt)).all();
  const openOrders = db
    .select()
    .from(salesOrders)
    .where(and(eq(salesOrders.tenantId, tid), eq(salesOrders.status, "dispatched")))
    .all();

  const total = invs.reduce((a, r) => a + r.totalMinor, 0);
  const paid = invs.reduce((a, r) => a + r.paidMinor, 0);
  const receivable = invs
    .filter((r) => r.status !== "paid" && r.status !== "cancelled")
    .reduce((a, r) => a + (r.totalMinor - r.paidMinor), 0);
  const c = cur?.currency ?? "PKR";

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" subtitle="Invoices, receivables and payments">
        <StatCard label="Invoiced" value={money(total, c)} />
        <StatCard label="Collected" value={money(paid, c)} />
        <StatCard label="Receivable" value={money(receivable, c)} hint="open invoices" />
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {openOrders.length > 0 && canApprove ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Generate invoices from dispatched orders</h2>
          <ul className="space-y-2">
            {openOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <span className="text-sm text-slate-700">
                  <span className="font-mono text-xs">{o.orderNo}</span> · {custNames.get(o.customerId) ?? "—"} · {money(o.totalMinor, o.currency)}
                </span>
                <form action={createInvoiceFromOrder} className="inline">
                  <input type="hidden" name="orderId" value={o.id} />
                  <SubmitButton ghost>Create invoice</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Invoices</h2>
        </div>
        {invs.length === 0 ? (
          <div className="p-6"><Empty message="No invoices yet — dispatch a sales order, then generate its invoice here." /></div>
        ) : (
          <Table headers={["Invoice", "Customer", "Status", "Total", "Paid", "Balance", "Due", canApprove || canPay ? "Actions" : ""]}>
            {invs.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/60">
                <Td className="font-mono text-xs">{inv.invoiceNo}</Td>
                <Td>{custNames.get(inv.customerId) ?? "—"}</Td>
                <Td><Badge tone={statusTone(inv.status)}>{inv.status}</Badge></Td>
                <Td>{money(inv.totalMinor, inv.currency)}</Td>
                <Td>{money(inv.paidMinor, inv.currency)}</Td>
                <Td className="font-medium">{money(inv.totalMinor - inv.paidMinor, inv.currency)}</Td>
                <Td className="text-xs">{dt(inv.dueAt)}</Td>
                {canApprove || canPay ? (
                  <Td>
                    <div className="flex flex-wrap items-center gap-1">
                      {canApprove && inv.status === "draft" ? (
                        <form action={approveInvoiceAction} className="inline">
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <button className="rounded px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">approve</button>
                        </form>
                      ) : null}
                      {canPay && inv.totalMinor - inv.paidMinor > 0 && ["approved", "partial"].includes(inv.status) ? (
                        <form action={recordPaymentAction} className="flex items-center gap-1">
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <input name="amount" type="number" min="1" placeholder={`max ${inv.totalMinor - inv.paidMinor}`} className="w-28 rounded border border-slate-300 px-1.5 py-0.5 text-[11px]" />
                          <button className="rounded px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50">record</button>
                        </form>
                      ) : null}
                    </div>
                  </Td>
                ) : null}
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
