import { requireUser } from "@/server/auth";
import { ensurePermission } from "@/server/guard";
import { getDb } from "@/db";
import { products, locations, stockMoves, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty, StatCard } from "@/components/ui/kit";
import { qtyFmt, dt } from "@/lib/fmt";
import { stockLevels } from "@/server/services/core";
import { adjustStockAction, transferStockAction } from "@/server/actions/inventory-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon, ArrowUpDownIcon } from "@hugeicons/core-free-icons";
import { SubmitButton } from "@/components/ui/submit-button";

export const instant = false;

export default async function InventoryPage(props: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canAdjust = user.isPlatformSuperAdmin || user.permissions.has("inventory.adjust") || user.permissions.has("*");
  const canTransfer = user.isPlatformSuperAdmin || user.permissions.has("inventory.transfer") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const levels = stockLevels(db, tid);
  const moves = db
    .select({
      m: stockMoves,
      sku: products.sku,
      productName: products.name,
      locName: locations.name,
      actor: users.fullName,
    })
    .from(stockMoves)
    .innerJoin(products, eq(products.id, stockMoves.productId))
    .innerJoin(locations, eq(locations.id, stockMoves.locationId))
    .leftJoin(users, eq(users.id, stockMoves.createdBy))
    .where(eq(stockMoves.tenantId, tid))
    .orderBy(desc(stockMoves.createdAt))
    .limit(40)
    .all();

  const locs = db.select().from(locations).where(eq(locations.tenantId, tid)).all();
  const lowCount = levels.filter((l) => l.reorderPoint !== "0" && l.onHand < Number(l.reorderPoint)).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Traceable stock ledger — every quantity change is a movement record" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="SKUs tracked" value={levels.length} />
        <StatCard label="Locations" value={locs.length} />
        <StatCard label="Movements" value={moves.length >= 40 ? "40+" : moves.length} hint="latest window" />
        <StatCard label="Low stock" value={lowCount} hint="below reorder point" />
      </div>

      {sp.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {sp.error}
        </p>
      ) : sp.saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved. Ledger updated.</p>
      ) : null}

      {canAdjust || canTransfer ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {canAdjust ? (
            <Card className="p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <HugeiconsIcon icon={PlusIcon} className="size-4 text-emerald-600" strokeWidth={2} aria-hidden /> Stock adjustment
              </h2>
              <form action={adjustStockAction} className="grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-1">
                  Product
                  <select name="productId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select…</option>
                    {levels.map((l) => (
                      <option key={l.productId} value={l.productId}>{l.sku} — {l.name}</option>
                    ))}
                  </select>
                </label>
                <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-1">
                  Location
                  <select name="locationId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select…</option>
                    {locs.map((l) => (
                      <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Direction
                  <select name="direction" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="in">IN (receive/rotate)</option>
                    <option value="out">OUT (issue/shrink)</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Quantity
                  <input name="qty" type="number" min="0" step="0.001" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="col-span-2 text-xs font-medium text-slate-600">
                  Lot / batch no (optional)
                  <input name="lotNo" placeholder="LOT-2026-001" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="col-span-2 text-xs font-medium text-slate-600">
                  Note
                  <input name="note" placeholder="Reason (cycle count, shrinkage…)" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <div className="col-span-2">
                  <SubmitButton>Record movement</SubmitButton>
                </div>
              </form>
            </Card>
          ) : null}

          {canTransfer ? (
            <Card className="p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <HugeiconsIcon icon={ArrowUpDownIcon} className="size-4 text-emerald-600" strokeWidth={2} aria-hidden /> Transfer between locations
              </h2>
              <form action={transferStockAction} className="grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-1">
                  Product
                  <select name="productId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select…</option>
                    {levels.map((l) => (
                      <option key={l.productId} value={l.productId}>{l.sku} — {l.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Quantity
                  <input name="qty" type="number" min="0" step="0.001" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-1">
                  From
                  <select name="fromLocationId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select…</option>
                    {locs.map((l) => (
                      <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                    ))}
                  </select>
                </label>
                <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-1">
                  To
                  <select name="toLocationId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select…</option>
                    {locs.map((l) => (
                      <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                    ))}
                  </select>
                </label>
                <div className="col-span-2">
                  <SubmitButton>Transfer</SubmitButton>
                </div>
              </form>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Stock levels (computed from ledger)</h2>
        </div>
        {levels.length === 0 ? (
          <div className="p-6">
            <Empty message="No active products yet — add products first." />
          </div>
        ) : (
          <Table headers={["SKU", "Product", "Type", "On hand", "Reorder", "State"]}>
            {levels.map((l) => {
              const low = l.reorderPoint !== "0" && l.onHand < Number(l.reorderPoint);
              return (
                <tr key={l.productId} className="hover:bg-slate-50/60">
                  <Td className="font-mono text-xs">{l.sku}</Td>
                  <Td className="max-w-56 font-medium text-slate-900">{l.name}</Td>
                  <Td>
                    <Badge tone={l.kind === "finished" ? "green" : l.kind === "raw" ? "blue" : "slate"}>{l.kind}</Badge>
                  </Td>
                  <Td className={low ? "font-semibold text-red-600" : "font-medium text-slate-900"}>{qtyFmt(l.onHand, l.unit)}</Td>
                  <Td>{l.reorderPoint === "0" ? "—" : `${l.reorderPoint}`}</Td>
                  <Td>
                    <Badge tone={low ? "red" : "green"}>{low ? "low stock" : "healthy"}</Badge>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Movement history</h2>
        </div>
        <Table headers={["When", "SKU", "Dir", "Qty", "Location", "Reason", "Lot", "By"]}>
          {moves.map(({ m, sku, locName, actor }) => (
            <tr key={m.id} className="hover:bg-slate-50/60">
              <Td className="whitespace-nowrap text-xs">{dt(m.createdAt)}</Td>
              <Td className="font-mono text-xs">{sku}</Td>
              <Td>
                <Badge tone={m.direction === "in" || m.reason === "transfer_in" ? "green" : "red"}>
                  {m.reason === "transfer_in" ? "in" : m.reason === "transfer_out" ? "out" : m.direction}
                </Badge>
              </Td>
              <Td className="font-medium">{qtyFmt(m.qty, m.unit)}</Td>
              <Td>{locName}</Td>
              <Td className="text-xs">{m.reason}</Td>
              <Td className="text-xs">{m.lotNo ?? "—"}</Td>
              <Td className="text-xs">{actor ?? "system"}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
