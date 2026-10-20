import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty } from "@/components/ui/kit";
import { dt, money } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCustomerAction } from "@/server/actions/sales-actions";

export default async function CustomersPage(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canWrite = user.isPlatformSuperAdmin || user.permissions.has("sales.write") || user.permissions.has("*");
  const db = getDb();
  const rows = db.select().from(customers).where(eq(customers.tenantId, user.tenantId)).orderBy(desc(customers.createdAt)).all();

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle="Retail, wholesale and distributor records">
        <Badge tone="blue">{rows.filter((r) => r.kind === "retail").length} retail</Badge>
        <Badge tone="amber">{rows.filter((r) => r.kind === "wholesale").length} wholesale</Badge>
        <Badge tone="green">{rows.filter((r) => r.kind === "distributor").length} distributor</Badge>
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canWrite ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Add customer</h2>
          <form action={createCustomerAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="col-span-2 text-xs font-medium text-slate-600">
              Name <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Kind
              <select name="kind" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="retail">retail</option>
                <option value="wholesale">wholesale</option>
                <option value="distributor">distributor</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Email <input name="email" type="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Phone <input name="phone" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="col-span-2 sm:col-span-5"><SubmitButton>Add customer</SubmitButton></div>
          </form>
        </Card>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <div className="p-6"><Empty message="No customers yet." /></div>
        ) : (
          <Table headers={["Name", "Kind", "Email", "Phone", "Credit limit", "Since"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <Td className="font-medium text-slate-900">{r.name}</Td>
                <Td><Badge tone={r.kind === "distributor" ? "green" : r.kind === "wholesale" ? "amber" : "blue"}>{r.kind}</Badge></Td>
                <Td className="text-xs">{r.email ?? "—"}</Td>
                <Td className="text-xs">{r.phone ?? "—"}</Td>
                <Td>{money(r.creditLimitMinor)}</Td>
                <Td className="text-xs">{dt(r.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
