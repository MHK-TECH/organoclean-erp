import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, Empty } from "@/components/ui/kit";
import { dt } from "@/lib/fmt";

export const instant = false;

export default async function AuditPage(props: { searchParams: Promise<{ error?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canSee = user.isPlatformSuperAdmin || user.permissions.has("audit.read") || user.permissions.has("*");
  const db = getDb();

  const rows = canSee
    ? db.select().from(auditEvents).where(eq(auditEvents.tenantId, user.tenantId)).orderBy(desc(auditEvents.createdAt)).limit(100).all()
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Trail" subtitle="Every mutation is recorded with a hash-chained entry (tamper-evident)">
        <Badge tone="blue">{rows.length} latest entries</Badge>
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}

      {canSee ? (
        <Card>
          {rows.length === 0 ? (
            <div className="p-6"><Empty message="No audit entries yet." /></div>
          ) : (
            <Table headers={["When", "Action", "Entity", "Detail", "Chain"]}>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <Td className="whitespace-nowrap text-xs">{dt(r.createdAt)}</Td>
                  <Td className="font-mono text-xs">{r.action}</Td>
                  <Td className="text-xs">
                    {r.entityType}
                    <span className="block font-mono text-[10px] text-slate-400">{r.entityId.slice(0, 8)}</span>
                  </Td>
                  <Td className="max-w-xs text-xs">
                    {r.afterJson ? <span className="font-mono text-[10px]">{r.afterJson}</span> : r.beforeJson ? <span className="font-mono text-[10px]">{r.beforeJson}</span> : "—"}
                  </Td>
                  <Td className="font-mono text-[10px] text-slate-400">
                    {r.messageId.slice(0, 10)}
                    {r.prevMessageId ? <span className="block text-slate-300">← {r.prevMessageId.slice(0, 6)}</span> : <span className="block text-slate-300">genesis</span>}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : (
        <Card className="p-4 text-sm text-slate-500">Audit trail requires the audit.read permission — contact an owner or ERP admin.</Card>
      )}
    </div>
  );
}
