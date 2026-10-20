import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { locations, tasks, tenants, users } from "@/db/schema";
import { PageHeader, Card, Table, Td, Badge, Empty, StatCard } from "@/components/ui/kit";
import { dt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTaskAction, saveOrganizationAction } from "@/server/actions/admin-actions";
import { and, desc, eq, inArray } from "drizzle-orm";

export const instant = false;

export default async function OrganizationPage(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canManage = user.isPlatformSuperAdmin || user.permissions.has("org.manage") || user.permissions.has("*");
  const db = getDb();

  const tenant = db.select().from(tenants).where(eq(tenants.id, user.tenantId)).get();
  const locs = db.select().from(locations).where(eq(locations.tenantId, user.tenantId)).all();
  const team = db.select().from(users).where(eq(users.tenantId, user.tenantId)).all();
  const openTasks = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.tenantId, user.tenantId), inArray(tasks.status, ["open", "in_progress"])))
    .orderBy(desc(tasks.createdAt))
    .all();

  return (
    <div className="space-y-6">
      <PageHeader title="Organization" subtitle="Company profile, locations and internal tasks">
        <StatCard label="Team members" value={team.length} />
        <StatCard label="Locations" value={locs.length} />
        <StatCard label="Open tasks" value={openTasks.length} />
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Company profile</h2>
          <form action={saveOrganizationAction} className="space-y-3">
            <label className="block text-xs font-medium text-slate-600">
              Company name
              <input name="name" defaultValue={tenant?.name ?? ""} required disabled={!canManage} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-slate-600">
                Country
                <input name="country" defaultValue={tenant?.country ?? "PK"} disabled={!canManage} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Currency
                <input name="currency" defaultValue={tenant?.currency ?? "PKR"} disabled={!canManage} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
              </label>
            </div>
            <p className="text-xs text-slate-400">Timezone {tenant?.timezone} · tenant slug {tenant?.slug} · joined {dt(tenant?.createdAt)}</p>
            {canManage ? <SubmitButton>Save profile</SubmitButton> : null}
          </form>
        </Card>

        {canManage ? (
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Create internal task</h2>
            <form action={createTaskAction} className="space-y-3">
              <input name="title" required placeholder="Task title" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <textarea name="description" rows={2} placeholder="Details (optional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <SubmitButton ghost>Add task</SubmitButton>
            </form>
          </Card>
        ) : null}
      </div>

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Locations</h2>
        </div>
        {locs.length === 0 ? (
          <div className="p-6"><Empty message="No locations. Create from Products module." /></div>
        ) : (
          <Table headers={["Code", "Name", "Type", "Created"]}>
            {locs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/60">
                <Td className="font-mono text-xs">{l.code}</Td>
                <Td className="font-medium">{l.name}</Td>
                <Td><Badge tone={l.kind === "warehouse" ? "blue" : l.kind === "plant" ? "green" : "slate"}>{l.kind}</Badge></Td>
                <Td className="text-xs">{dt(l.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Open tasks</h2>
        </div>
        {openTasks.length === 0 ? (
          <div className="p-6"><Empty message="No open tasks." /></div>
        ) : (
          <Table headers={["Task", "Priority", "Related", "Created"]}>
            {openTasks.map((t) => (
              <tr key={t.id}>
                <Td className="font-medium text-slate-900">{t.title}</Td>
                <Td><Badge tone={t.priority === "urgent" ? "red" : t.priority === "high" ? "amber" : "slate"}>{t.priority}</Badge></Td>
                <Td className="text-xs">{t.relatedEntityType ?? "—"}</Td>
                <Td className="text-xs">{dt(t.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
