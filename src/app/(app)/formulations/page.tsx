import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { formulaItems, formulas, products, users } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty } from "@/components/ui/kit";
import { dt, qtyFmt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { createFormulaAction, addFormulaItemAction, submitFormulaAction, approveFormulaAction } from "@/server/actions/manufacturing-actions";

export const instant = false;

export default async function FormulationsPage(props: { searchParams: Promise<{ error?: string; saved?: string; f?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canEdit = user.isPlatformSuperAdmin || user.permissions.has("formulation.edit") || user.permissions.has("*");
  const canApprove = user.isPlatformSuperAdmin || user.permissions.has("formulation.approve") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const frows = db
    .select({ f: formulas, sku: products.sku, productName: products.name })
    .from(formulas)
    .innerJoin(products, eq(products.id, formulas.productId))
    .where(eq(formulas.tenantId, tid))
    .orderBy(desc(formulas.createdAt))
    .all();

  const selected = sp.f ? frows.find((r) => r.f.id === sp.f) : undefined;
  const items = selected ? db.select({ it: formulaItems, sku: products.sku, name: products.name }).from(formulaItems).innerJoin(products, eq(products.id, formulaItems.ingredientId)).where(eq(formulaItems.formulaId, selected.f.id)).all() : [];
  const canEditSelected = selected && canEdit && selected.f.status === "draft";
  const rawProducts = db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tid), eq(products.status, "active"), inArray(products.kind, ["raw", "packaging"])))
    .all();
  const approvedUsers = db.select({ id: users.id, name: users.fullName }).from(users).all();
  const canSeeConfidential = canEdit || canApprove;

  return (
    <div className="space-y-6">
      <PageHeader title="Formulations" subtitle="Versioned BOMs — approved versions are the only source for production batches">
        <Badge tone="green">{frows.filter((r) => r.f.status === "approved").length} approved</Badge>
        <Badge tone="amber">{frows.filter((r) => r.f.status === "under_review").length} in review</Badge>
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canEdit ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">New formulation (auto-versioned per product)</h2>
          <form action={createFormulaAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="col-span-2 text-xs font-medium text-slate-600">
             Product
              <select name="productId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select product…</option>
                {db.select().from(products).where(and(eq(products.tenantId, tid), eq(products.status, "active"))).all().map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Batch size
              <input name="batchSize" defaultValue="1" min="0" step="0.001" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Expected yield%
              <input name="yieldPct" defaultValue="95" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end"><SubmitButton>Draft formula</SubmitButton></div>
          </form>
        </Card>
      ) : null}

      {selected ? (
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {selected.f.name}
                <Badge tone={statusTone(selected.f.status)}>{selected.f.status}</Badge>
                <span className="text-xs font-normal text-slate-400">v{selected.f.version}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {selected.sku} · batch scale {qtyFmt(selected.f.batchSize, selected.f.batchUnit)} · approved by{" "}
                {approvedUsers.find((u) => u.id === selected.f.approvedBy)?.name ?? "—"}
              </p>
            </div>
            <Link href="/formulations" className="text-xs font-medium text-slate-500 hover:underline">clear</Link>
          </div>

          <Table headers={["#", "Ingredient", "Qty", "Unit", "Note"]}>
            {items.map(({ it, sku, name }) => (
              <tr key={it.id}>
                <Td className="text-xs">{it.sortOrder}</Td>
                <Td className="font-medium">{name} <span className="font-mono text-[10px] text-slate-400">{sku}</span></Td>
                <Td>{qtyFmt(it.qty, it.unit)}</Td>
                <Td>{it.unit}</Td>
                <Td className="text-xs">{it.note ?? "—"}</Td>
              </tr>
            ))}
          </Table>

          <div className="mt-4 flex flex-wrap gap-2">
            {canEditSelected ? (
              <form action={submitFormulaAction} className="inline">
                <input type="hidden" name="formulaId" value={selected.f.id} />
                <SubmitButton ghost>Submit for review</SubmitButton>
              </form>
            ) : null}
            {selected.f.status === "under_review" && canApprove ? (
              <form action={approveFormulaAction} className="inline">
                <input type="hidden" name="formulaId" value={selected.f.id} />
                <SubmitButton>Approve & release</SubmitButton>
              </form>
            ) : null}
          </div>

          {canEditSelected ? (
            <form action={addFormulaItemAction} className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
              <input type="hidden" name="formulaId" value={selected.f.id} />
              <label className="col-span-2 text-xs font-medium text-slate-600">
                Ingredient
                <select name="ingredientId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select raw material…</option>
                  {rawProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Qty
                <input name="qty" type="number" min="0" step="0.001" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <div className="flex items-end"><SubmitButton ghost>Add ingredient</SubmitButton></div>
            </form>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">All formulation versions {canSeeConfidential ? "" : "(names hidden)"}</h2>
        </div>
        {frows.length === 0 ? (
          <div className="p-6"><Empty message="No formulas yet. Draft one from a product above." /></div>
        ) : (
          <Table headers={["Formula", "Product", "Ver", "Status", "Scale", "Updated", ""]}>
            {frows.map(({ f, sku, productName }) => (
              <tr key={f.id} className="hover:bg-slate-50/60">
                <Td className="font-medium text-slate-900">{canSeeConfidential ? f.name : "••• confidential"}</Td>
                <Td className="text-xs">{canSeeConfidential ? `${sku} — ${productName}` : productName}</Td>
                <Td>{f.version}</Td>
                <Td><Badge tone={statusTone(f.status)}>{f.status}</Badge></Td>
                <Td>{qtyFmt(f.batchSize, f.batchUnit)}</Td>
                <Td className="text-xs">{dt(f.createdAt)}</Td>
                <Td><Link href={`/formulations?f=${f.id}`} className="text-xs text-slate-500 hover:underline">open</Link></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
