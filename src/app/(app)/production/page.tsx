import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { batchConsumptions, batches, formulas, products, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty, StatCard } from "@/components/ui/kit";
import { dt, qtyFmt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createBatchAction,
  setBatchStatusAction,
  issueMaterialsAction,
  completeBatchAction,
} from "@/server/actions/manufacturing-actions";

export const instant = false;

export default async function ProductionPage(props: { searchParams: Promise<{ batch?: string; error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canCreate = user.isPlatformSuperAdmin || user.permissions.has("production.create") || user.permissions.has("*");
  const canApprove = user.isPlatformSuperAdmin || user.permissions.has("production.approve") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const brows = db
    .select({ b: batches, sku: products.sku, productName: products.name, operatorName: users.fullName })
    .from(batches)
    .innerJoin(products, eq(products.id, batches.productId))
    .leftJoin(users, eq(users.id, batches.operator))
    .where(eq(batches.tenantId, tid))
    .orderBy(desc(batches.createdAt))
    .all();

  const selected = sp.batch ? brows.find((r) => r.b.id === sp.batch) : undefined;
  const consumption = selected
    ? db
        .select({ bc: batchConsumptions, sku: products.sku, name: products.name })
        .from(batchConsumptions)
        .innerJoin(products, eq(products.id, batchConsumptions.productId))
        .where(eq(batchConsumptions.batchId, selected.b.id))
        .all()
    : [];

  const approvedFormulas = db
    .select({ f: formulas, sku: products.sku, name: products.name })
    .from(formulas)
    .innerJoin(products, eq(products.id, formulas.productId))
    .where(and(eq(formulas.tenantId, tid), eq(formulas.status, "approved")))
    .all();

  const active = brows.filter((r) => !["released", "closed", "rejected"].includes(r.b.status));

  return (
    <div className="space-y-6">
      <PageHeader title="Production" subtitle="Batch lifecycle: planned → approved → in production → QC → released">
        <StatCard label="Active" value={active.length} />
        <StatCard label="Released" value={brows.filter((b) => b.b.status === "released").length} />
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canCreate && approvedFormulas.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Plan a new batch (from approved formula versions)</h2>
          <form action={createBatchAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="col-span-2 text-xs font-medium text-slate-600">
              Formula
              <select name="formulaId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select approved formula…</option>
                {approvedFormulas.map(({ f, sku, name }) => (
                  <option key={f.id} value={f.id}>{sku} — {name} (v{f.version})</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Planned qty
              <input name="plannedQty" type="number" min="0" step="0.001" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Lot no (optional)
              <input name="lotNo" placeholder="LOT-2026-XXX" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end"><SubmitButton>Plan batch</SubmitButton></div>
          </form>
        </Card>
      ) : null}

      {selected ? (
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {selected.b.batchNo} <Badge tone={statusTone(selected.b.status)}>{selected.b.status}</Badge>
              </h2>
              <p className="text-xs text-slate-500">
                {selected.sku} · planned {qtyFmt(selected.b.plannedQty, selected.b.unit)} · produced {qtyFmt(selected.b.producedQty, selected.b.unit)} · operator {selected.operatorName ?? "—"}
              </p>
            </div>
            <Link href="/production" className="text-xs font-medium text-slate-500 hover:underline">clear</Link>
          </div>

          <Table headers={["Material", "Planned", "Issued", "Unit"]}>
            {consumption.map(({ bc, sku, name }) => (
              <tr key={bc.id}>
                <Td className="font-medium">{name} <span className="font-mono text-[10px] text-slate-400">{sku}</span></Td>
                <Td>{qtyFmt(bc.qtyPlanned, bc.unit)}</Td>
                <Td>{bc.qtyActual === "0" ? <Badge tone="slate">pending</Badge> : qtyFmt(bc.qtyActual, bc.unit)}</Td>
                <Td>{bc.unit}</Td>
              </tr>
            ))}
          </Table>

          <div className="mt-4 flex flex-wrap gap-2">
            {selected.b.status === "planned" && canApprove ? (
              <form action={setBatchStatusAction} className="inline">
                <input type="hidden" name="batchId" value={selected.b.id} />
                <input type="hidden" name="status" value="approved" />
                <SubmitButton ghost>Approve batch</SubmitButton>
              </form>
            ) : null}
            {selected.b.status === "approved" && canApprove ? (
              <form action={issueMaterialsAction} className="inline">
                <input type="hidden" name="batchId" value={selected.b.id} />
                <SubmitButton>Issue materials → production</SubmitButton>
              </form>
            ) : null}
            {selected.b.status === "in_production" && canApprove ? (
              <form action={completeBatchAction} className="inline flex items-end gap-2">
                <input type="hidden" name="batchId" value={selected.b.id} />
                <label className="text-xs font-medium text-slate-600">
                  Produced
                  <input name="producedQty" type="number" min="0" step="0.001" required className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                </label>
                <SubmitButton>Complete & send to QC</SubmitButton>
              </form>
            ) : null}
            {selected.b.status === "released" && canApprove ? (
              <form action={setBatchStatusAction} className="inline">
                <input type="hidden" name="batchId" value={selected.b.id} />
                <input type="hidden" name="status" value="closed" />
                <SubmitButton ghost>Close batch</SubmitButton>
              </form>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Batches</h2>
        </div>
        {brows.length === 0 ? (
          <div className="p-6"><Empty message="No batches yet. Approve a formula, then plan a batch from it." /></div>
        ) : (
          <Table headers={["Batch", "Product", "Status", "Planned", "Produced", "Operator", "Started", ""]}>
            {brows.map(({ b, sku, operatorName }) => (
              <tr key={b.id} className="hover:bg-slate-50/60">
                <Td className="font-mono text-xs"><Link href={`/production?batch=${b.id}`} className="font-medium text-emerald-700 hover:underline">{b.batchNo}</Link></Td>
                <Td className="text-xs">{sku}</Td>
                <Td><Badge tone={statusTone(b.status)}>{b.status}</Badge></Td>
                <Td>{qtyFmt(b.plannedQty, b.unit)}</Td>
                <Td>{b.producedQty === "0" ? "—" : qtyFmt(b.producedQty, b.unit)}</Td>
                <Td className="text-xs">{operatorName ?? "—"}</Td>
                <Td className="text-xs">{dt(b.startedAt)}</Td>
                <Td><Link href={`/production?batch=${b.id}`} className="text-xs text-slate-500 hover:underline">open</Link></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
