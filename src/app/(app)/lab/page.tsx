import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { experiments, products, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty } from "@/components/ui/kit";
import { dt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { createLabExperimentAction, completeExperimentAction } from "@/server/actions/manufacturing-actions";

export const instant = false;

type ResultsJson = { text?: string } | null;

function parseResults(raw: string | null): string {
  if (!raw) return "—";
  try {
    const parsed = JSON.parse(raw) as ResultsJson;
    return parsed?.text || raw;
  } catch {
    return raw;
  }
}

export default async function LabPage(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canWrite = user.isPlatformSuperAdmin || user.permissions.has("lab.write") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const rows = db
    .select({ e: experiments, authorName: users.fullName })
    .from(experiments)
    .leftJoin(users, eq(users.id, experiments.authorId))
    .where(eq(experiments.tenantId, tid))
    .orderBy(desc(experiments.createdAt))
    .all();

  const productNames = new Map(
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.tenantId, tid)).all().map((p) => [p.id, p.name]),
  );

  const open = rows.filter((r) => r.e.status !== "completed");

  return (
    <div className="space-y-6">
      <PageHeader title="Digital Lab" subtitle="R&D experiment logbook — objectives, hypothesis, results and next steps">
        <Badge tone="blue">{open.length} open</Badge>
        <Badge tone="green">{rows.length - open.length} completed</Badge>
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canWrite ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Start experiment</h2>
          <form action={createLabExperimentAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="text-xs font-medium text-slate-600">
              Title * <input name="title" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Target product
              <select name="productId" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {[...productNames.entries()].map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-xs font-medium text-slate-600">
              Objective <input name="objective" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end"><SubmitButton>Log experiment</SubmitButton></div>
            <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-4">
              Hypothesis <input name="hypothesis" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </form>
        </Card>
      ) : null}

      {open.length > 0 && canWrite ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Complete an open experiment</h2>
          <form action={completeExperimentAction} className="space-y-3">
            <label className="block text-xs font-medium text-slate-600">
              Experiment
              <select name="experimentId" required className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {open.map(({ e }) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-medium text-slate-600">
                Results <textarea name="results" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Conclusion <textarea name="conclusion" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Next steps <textarea name="nextSteps" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <SubmitButton>Complete & review</SubmitButton>
          </form>
        </Card>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <div className="p-6"><Empty message="No experiments logged yet." /></div>
        ) : (
          <Table headers={["Title", "Product", "Status", "Author", "Conclusion", "Logged"]}>
            {rows.map(({ e, authorName }) => (
              <tr key={e.id} className="hover:bg-slate-50/60">
                <Td>
                  <span className="font-medium text-slate-900">{e.title}</span>
                  <span className="block max-w-sm truncate text-[11px] text-slate-400">{e.objective ?? ""}</span>
                </Td>
                <Td className="text-xs">{e.productId ? productNames.get(e.productId) ?? "—" : "—"}</Td>
                <Td><Badge tone={statusTone(e.status)}>{e.status}</Badge></Td>
                <Td className="text-xs">{authorName ?? "—"}</Td>
                <Td className="max-w-xs text-xs">
                  {e.status === "completed" ? (e.conclusion ?? "—") : <span className="italic text-slate-400">{parseResults(e.resultsJson) === "—" ? "in progress" : parseResults(e.resultsJson)}</span>}
                </Td>
                <Td className="text-xs">{dt(e.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
