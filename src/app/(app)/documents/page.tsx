import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty } from "@/components/ui/kit";
import { dt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { createDocumentAction } from "@/server/actions/admin-actions";

export const instant = false;

const KINDS = ["sds", "tds", "sop", "certificate", "report", "other"] as const;

export default async function DocumentsPage(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canWrite = user.isPlatformSuperAdmin || user.permissions.has("docs.manage") || user.permissions.has("*");
  const db = getDb();

  const rows = db.select().from(documents).where(eq(documents.tenantId, user.tenantId)).orderBy(desc(documents.createdAt)).all();

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" subtitle="SDS, TDS, SOPs, certificates and reports — stored as external links (cloud-first)">
        <Badge tone="blue">{rows.length} documents</Badge>
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canWrite ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Register document (external link)</h2>
          <form action={createDocumentAction} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <label className="text-xs font-medium text-slate-600">
              Name * <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Kind
              <select name="kind" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-3">
              URL * <input name="externalUrl" placeholder="https://drive.google.com/..." required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end"><SubmitButton>Register</SubmitButton></div>
          </form>
        </Card>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <div className="p-6"><Empty message="No documents registered yet." /></div>
        ) : (
          <Table headers={["Name", "Kind", "Version", "Status", "Link", "Registered"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <Td className="font-medium text-slate-900">{r.name}</Td>
                <Td><Badge tone={r.kind === "sds" || r.kind === "sop" ? "amber" : "blue"}>{r.kind}</Badge></Td>
                <Td>v{r.version}</Td>
                <Td><Badge tone={statusTone(r.status)}>{r.status}</Badge></Td>
                <Td className="text-xs">
                  <a href={r.externalUrl ?? "#"} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline max-w-[220px] truncate block">{r.externalUrl ?? "—"}</a>
                </Td>
                <Td className="text-xs">{dt(r.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
