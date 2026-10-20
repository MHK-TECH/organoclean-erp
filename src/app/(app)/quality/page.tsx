import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { batches, products, qcInspections } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty } from "@/components/ui/kit";
import { dt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { recordQcAction, releaseBatchFromQcAction } from "@/server/actions/manufacturing-actions";

export const instant = false;

export default async function QualityPage(props: { searchParams: Promise<{ error?: string; saved?: string; q?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canRecord = user.isPlatformSuperAdmin || user.permissions.has("quality.record") || user.permissions.has("*");
  const canRelease = user.isPlatformSuperAdmin || user.permissions.has("quality.approve") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const rows = db
    .select({ q: qcInspections, sku: products.sku, productName: products.name })
    .from(qcInspections)
    .innerJoin(products, eq(products.id, qcInspections.productId))
    .where(eq(qcInspections.tenantId, tid))
    .orderBy(desc(qcInspections.createdAt))
    .all();

  const selected = sp.q ? rows.find((r) => r.q.id === sp.q) : undefined;

  const qcPendingBatches = db
    .select({ b: batches, sku: products.sku })
    .from(batches)
    .innerJoin(products, eq(products.id, batches.productId))
    .where(and(eq(batches.tenantId, tid), eq(batches.status, "qc_pending")))
    .all();

  const passForBatch = (batchId: string) =>
    rows.some((r) => r.q.batchId === batchId && r.q.kind === "finished" && r.q.result === "pass");

  const pendingQcOf = (batchId: string) =>
    rows.find((r) => r.q.batchId === batchId && r.q.kind === "finished" && r.q.result === "pending")?.q;

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Control" subtitle="Record QC results; releasing a batch moves output into sellable stock">
        <Badge tone="amber">{rows.filter((r) => r.q.result === "pending").length} pending</Badge>
        <Badge tone="red">{rows.filter((r) => r.q.result === "fail").length} failed</Badge>
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {qcPendingBatches.length > 0 && (canRelease || canRecord) ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Batches awaiting QC</h2>
          <div className="space-y-3">
            {qcPendingBatches.map(({ b, sku }) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                <span className="text-xs text-slate-600">
                  <span className="font-mono font-medium text-slate-900">{b.batchNo}</span> · {sku} · output {b.producedQty} {b.unit}
                  {!passForBatch(b.id) ? <span className="ml-2 text-amber-600">(no passing inspection yet)</span> : null}
                </span>
                <div className="flex gap-2">
                  {canRecord && !passForBatch(b.id) && pendingQcOf(b.id) ? (
                    <Link href={`/quality?q=${pendingQcOf(b.id)!.id}`} className="text-xs text-slate-500 hover:underline">record below ↓</Link>
                  ) : null}
                  {canRelease ? (
                    passForBatch(b.id) ? (
                      <form action={releaseBatchFromQcAction} className="inline">
                        <input type="hidden" name="batchId" value={b.id} />
                        <SubmitButton ghost>Release to stock</SubmitButton>
                      </form>
                    ) : (
                      <span className="text-[11px] italic text-slate-400">record a pass first</span>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {selected ? (
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                Inspection <Badge tone={statusTone(selected.q.result)}>{selected.q.result}</Badge>
                <span className="text-xs font-normal text-slate-400">{selected.q.kind}</span>
              </h2>
              <p className="text-xs text-slate-500">{selected.sku} — {selected.productName} · lot {selected.q.lotNo ?? "—"} · {dt(selected.q.createdAt)}</p>
            </div>
            <Link href="/quality" className="text-xs font-medium text-slate-500 hover:underline">clear</Link>
          </div>

          {canRecord ? (
            <form action={recordQcAction} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <input type="hidden" name="qcId" value={selected.q.id} />
              <label className="text-xs font-medium text-slate-600">
                Result
                <select name="result" required defaultValue="pass" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="pass">pass</option>
                  <option value="fail">fail</option>
                  <option value="conditional">conditional</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">pH <input name="ph" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600">Viscosity <input name="viscosity" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600">Density <input name="density" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600">Appearance <input name="appearance" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
              <div className="flex items-end"><SubmitButton>Record result</SubmitButton></div>
              <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-6">
                Comments <input name="comments" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </form>
          ) : selected.q.result === "pending" ? (
            <p className="text-xs text-slate-500">Awaiting a user with quality.record permission.</p>
          ) : null}
        </Card>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <div className="p-6"><Empty message="No inspections yet. Completing a production batch creates one automatically." /></div>
        ) : (
          <Table headers={["Product", "Lot", "Kind", "Result", "pH", "Recorded", ""]}>
            {rows.map(({ q, sku }) => (
              <tr key={q.id} className="hover:bg-slate-50/60">
                <Td className="text-xs">
                  {q.batchId ? (
                    <Link href={`/production?batch=${q.batchId}`} className="font-mono text-emerald-700 hover:underline">{sku}</Link>
                  ) : (
                    sku
                  )}
                </Td>
                <Td className="text-xs">{q.lotNo ?? "—"}</Td>
                <Td><Badge tone={q.kind === "finished" ? "blue" : "slate"}>{q.kind}</Badge></Td>
                <Td><Badge tone={statusTone(q.result)}>{q.result}</Badge></Td>
                <Td className="text-xs">{q.ph ?? "—"}</Td>
                <Td className="text-xs">{dt(q.inspectedAt)}</Td>
                <Td><Link href={`/quality?q=${q.id}`} className="text-xs text-slate-500 hover:underline">open</Link></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
