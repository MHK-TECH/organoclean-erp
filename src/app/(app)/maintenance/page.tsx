import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { equipment, locations, tasks, users } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty, StatCard } from "@/components/ui/kit";
import { dt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { createEquipmentAction, setEquipmentStatusAction } from "@/server/actions/admin-actions";

export const instant = false;

export default async function MaintenancePage(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canWrite = user.isPlatformSuperAdmin || user.permissions.has("maintenance.edit") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const rows = db.select().from(equipment).where(eq(equipment.tenantId, tid)).orderBy(desc(equipment.createdAt)).all();
  const locs = db.select().from(locations).where(eq(locations.tenantId, tid)).all();
  const locName = (id: string | null) => (id ? locs.find((l) => l.id === id)?.name ?? "—" : "—");
  const assignees = db.select({ id: users.id, name: users.fullName }).from(users).where(eq(users.tenantId, tid)).all();
  const openTasks = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.tenantId, tid), inArray(tasks.status, ["open", "in_progress"])))
    .all();

  const dueSoon = Math.floor(
    db
      .select({
        c: sql<number>`coalesce(sum(case when nextServiceAt is not null and nextServiceAt <= unixepoch() * 1000 + ${7 * 86400_000} then 1 else 0 end), 0)`,
      })
      .from(equipment)
      .where(eq(equipment.tenantId, tid))
      .get()?.c ?? 0,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance" subtitle="Equipment register, calibration and preventive maintenance">
        <StatCard label="Operational" value={rows.filter((r) => r.status === "operational").length} />
        <StatCard label="Down / maintenance" value={rows.filter((r) => r.status !== "operational" && r.status !== "retired").length} />
        <StatCard label="Service due ≤7d" value={dueSoon} />
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canWrite ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Register equipment</h2>
          <form action={createEquipmentAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="text-xs font-medium text-slate-600">
              Name * <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Model <input name="model" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Location
              <select name="locationId" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {locs.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Last calibrated <input name="lastCalibratedAt" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Next service <input name="nextServiceAt" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="col-span-2 sm:col-span-5"><SubmitButton>Register equipment</SubmitButton></div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Equipment</h2>
        </div>
        {rows.length === 0 ? (
          <div className="p-6"><Empty message="No equipment registered yet." /></div>
        ) : (
          <Table headers={["Name", "Model", "Location", "Status", "Last calibrated", "Next service", canWrite ? "Set status" : ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <Td className="font-medium text-slate-900">{r.name}</Td>
                <Td className="text-xs">{r.model ?? "—"}</Td>
                <Td className="text-xs">{locName(r.locationId)}</Td>
                <Td><Badge tone={statusTone(r.status)}>{r.status}</Badge></Td>
                <Td className="text-xs">{dt(r.lastCalibratedAt)}</Td>
                <Td className="text-xs">
                  {r.nextServiceAt ? dt(r.nextServiceAt) : "—"}
                </Td>
                {canWrite ? (
                  <Td>
                    <form action={setEquipmentStatusAction} className="flex items-center gap-1">
                      <input type="hidden" name="equipmentId" value={r.id} />
                      <select name="status" defaultValue={r.status} className="rounded border border-slate-300 px-1 py-0.5 text-xs">
                        <option value="operational">operational</option>
                        <option value="maintenance">maintenance</option>
                        <option value="breakdown">breakdown</option>
                        <option value="retired">retired</option>
                      </select>
                      <button type="submit" className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100">set</button>
                    </form>
                  </Td>
                ) : <Td className="text-xs">—</Td>}
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Open maintenance tasks</h2>
        </div>
        {openTasks.length === 0 ? (
          <div className="p-6"><Empty message="No open tasks." /></div>
        ) : (
          <Table headers={["Task", "Priority", "Created",]}>
            {openTasks.map((t) => (
              <tr key={t.id}>
                <Td className="font-medium text-slate-900">{t.title}</Td>
                <Td><Badge tone={t.priority === "urgent" ? "red" : t.priority === "high" ? "amber" : "slate"}>{t.priority}</Badge></Td>
                <Td className="text-xs">{dt(t.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
        <p className="px-4 pb-3 text-[11px] text-slate-400">Assignees available: {assignees.map((a) => a.name).join(", ") || "—"}</p>
      </Card>
    </div>
  );
}
