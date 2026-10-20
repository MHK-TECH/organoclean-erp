import { requireUser } from "@/server/auth";
import { ensurePermission } from "@/server/guard";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { PageHeader, Card, Table, Th, Td, Badge, statusTone, Empty, btnCls, inputCls } from "@/components/ui/kit";
import { money } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { createProductAction, updateProductStatusAction } from "@/server/actions/product-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon } from "@hugeicons/core-free-icons";

export const instant = false;

export default async function ProductsPage() {
  const user = await requireUser();
  const canWrite = user.isPlatformSuperAdmin || user.permissions.has("products.write");
  const db = getDb();

  const rows = db.select().from(products).where(eq(products.tenantId, user.tenantId)).orderBy(desc(products.createdAt)).all();
  const kinds = ["raw", "intermediate", "finished", "packaging"] as const;
  const byKind = (k: string) => rows.filter((r) => r.kind === k && r.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Chemical master data — raw materials, intermediates, finished goods and packaging">
        <Badge tone="green">{byKind("finished")} finished</Badge>
        <Badge tone="blue">{byKind("raw")} raw</Badge>
        <Badge tone="slate">{byKind("packaging")} packaging</Badge>
      </PageHeader>

      {canWrite ? (
        <Card className="p-4 sm:p-5">
          <form action={createProductAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <label className="col-span-2 text-xs font-medium text-slate-600">
              SKU
              <input name="sku" required placeholder="RM-XXXX" className={inputCls + " mt-1"} />
            </label>
            <label className="col-span-2 text-xs font-medium text-slate-600">
              Name
              <input name="name" required placeholder="Sodium Lauryl Ether Sulfate 70%" className={inputCls + " mt-1"} />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Type
              <select name="kind" className={inputCls + " mt-1"} defaultValue="raw">
                {kinds.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Unit
              <input name="baseUnit" required placeholder="kg" className={inputCls + " mt-1"} />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Cost ({/* currency */ ""}PKR)
              <input name="costPrice" type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " mt-1"} />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Price (PKR)
              <input name="salesPrice" type="number" min="0" step="0.01" placeholder="0.00" className={inputCls + " mt-1"} />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Reorder pt
              <input name="reorderPoint" type="number" min="0" step="0.01" placeholder="0" className={inputCls + " mt-1"} />
            </label>
            <div className="col-span-2 flex items-end sm:col-span-4 lg:col-span-8">
              <SubmitButton>
                <HugeiconsIcon icon={PlusIcon} className="size-4" strokeWidth={2} aria-hidden /> Add product
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <div className="p-6">
            <Empty message="No products yet. Add your first raw material above to start the catalog." />
          </div>
        ) : (
          <Table headers={["SKU", "Name", "Type", "Unit", "Cost", "Price", "Reorder", "Status", canWrite ? "" : "hide"]}>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <Td className="font-mono text-xs">{p.sku}</Td>
                <Td className="max-w-64">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  {p.category ? <span className="block text-xs text-slate-400">{p.category}</span> : null}
                </Td>
                <Td>
                  <Badge tone={p.kind === "finished" ? "green" : p.kind === "raw" ? "blue" : "slate"}>{p.kind}</Badge>
                </Td>
                <Td>{p.baseUnit}</Td>
                <Td>{money(p.costPriceMinor)}</Td>
                <Td>{money(p.salesPriceMinor)}</Td>
                <Td>{p.reorderPoint}</Td>
                <Td>
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </Td>
                {canWrite ? (
                  <Td>
                    <form action={updateProductStatusAction} className="flex gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      {p.status === "active" ? (
                        <button name="status" value="archived" className="rounded px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50">
                          archive
                        </button>
                      ) : p.status === "draft" ? (
                        <button name="status" value="active" className="rounded px-2 py-0.5 text-[11px] text-emerald-600 hover:bg-emerald-50">
                          activate
                        </button>
                      ) : (
                        <button name="status" value="active" className="rounded px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100">
                          restore
                        </button>
                      )}
                    </form>
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
