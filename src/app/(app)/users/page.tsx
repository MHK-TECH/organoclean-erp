import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { roles, sessions, userRoles, users } from "@/db/schema";
import { desc, eq, isNull, and } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty } from "@/components/ui/kit";
import { dt } from "@/lib/fmt";
import { SubmitButton } from "@/components/ui/submit-button";
import { inviteUserAction, toggleUserStatusAction, assignRoleAction } from "@/server/actions/admin-actions";

export const instant = false;

export default async function UsersPage(props: { searchParams: Promise<{ error?: string; saved?: string; invite?: string; pass?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canAdmin = user.isPlatformSuperAdmin || user.permissions.has("user.admin") || user.permissions.has("*");
  const db = getDb();
  const tid = user.tenantId;

  const roleRows = db.select().from(roles).where(eq(roles.tenantId, tid)).all();
  const userRows = db.select().from(users).where(eq(users.tenantId, tid)).orderBy(desc(users.createdAt)).all();
  const assignments = db
    .select({ userId: userRoles.userId, roleKey: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .all();
  const activeSessions = db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt, lastActivityAt: sessions.lastActivityAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(users.tenantId, tid), isNull(sessions.revokedAt)))
    .all();

  const roleOf = (uid: string) => assignments.filter((a) => a.userId === uid).map((a) => a.roleKey).join(", ") || "—";
  const activeOf = (uid: string) => activeSessions.filter((s) => s.userId === uid).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" subtitle="Invite teammates, assign roles and manage access">
        <Badge tone="green">{userRows.filter((u) => u.status === "active").length} active</Badge>
        <Badge tone="amber">{userRows.filter((u) => u.status === "invited").length} invited</Badge>
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.invite && sp.pass ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          User <strong>{sp.invite}</strong> created. Temporary password: <code className="select-all rounded bg-white px-1.5 py-0.5 font-mono">{sp.pass}</code> — share securely and ask them to change it.
        </p>
      ) : null}
      {sp.saved && !sp.invite ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canAdmin ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Invite user</h2>
          <form action={inviteUserAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="col-span-2 text-xs font-medium text-slate-600">
              Full name * <input name="fullName" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Email * <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Role
              <select name="roleKey" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">none</option>
                {roleRows.map((r) => (
                  <option key={r.id} value={r.key}>{r.name}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end"><SubmitButton>Create user</SubmitButton></div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Team</h2>
        </div>
        {userRows.length === 0 ? (
          <div className="p-6"><Empty message="No users." /></div>
        ) : (
          <Table headers={["Name", "Email", "Status", "Role", "Sessions", "Joined", canAdmin ? "Actions" : ""]}>
            {userRows.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <Td className="font-medium text-slate-900">{u.fullName} {u.isPlatformSuperAdmin ? <Badge tone="blue">staff</Badge> : null}</Td>
                <Td className="text-xs">{u.email}</Td>
                <Td><Badge tone={statusTone(u.status)}>{u.status}</Badge></Td>
                <Td className="text-xs">{roleOf(u.id)}</Td>
                <Td className="text-xs">{activeOf(u.id)} active</Td>
                <Td className="text-xs">{dt(u.createdAt)}</Td>
                {canAdmin ? (
                  <Td>
                    <div className="flex items-center gap-1">
                      <form action={assignRoleAction} className="flex items-center gap-1">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="roleKey" className="rounded border border-slate-300 px-1 py-0.5 text-xs">
                          <option value="">+ role…</option>
                          {roleRows.map((r) => (
                            <option key={r.id} value={r.key}>{r.name}</option>
                          ))}
                        </select>
                        <button type="submit" className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100">assign</button>
                      </form>
                      {u.id === user.id ? null : (
                        <form action={toggleUserStatusAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100">
                            {u.status === "disabled" ? "enable" : "disable"}
                          </button>
                        </form>
                      )}
                    </div>
                  </Td>
                ) : <Td className="text-xs">—</Td>}
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Role keys</p>
        <p className="mt-1">{roleRows.map((r) => `${r.key}`).join(" · ") || "—"}</p>
      </Card>
    </div>
  );
}
