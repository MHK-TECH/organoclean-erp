import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { integrationEvents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageHeader, Card, Table, Td, Badge, statusTone, Empty, StatCard } from "@/components/ui/kit";
import { dt } from "@/lib/fmt";

export const instant = false;

export default async function IntegrationsPage() {
  const user = await requireUser();
  const canSee = user.isPlatformSuperAdmin || user.permissions.has("integration.read") || user.permissions.has("*");
  const db = getDb();

  const { rows } = canSee
    ? { rows: db.select().from(integrationEvents).where(eq(integrationEvents.tenantId, user.tenantId)).orderBy(desc(integrationEvents.createdAt)).limit(50).all() }
    : { rows: [] };

  const received = rows.filter((r) => r.status === "received").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" subtitle="WooCommerce, webhooks and external event stream (n8n)">
        <StatCard label="Received" value={received} />
        <StatCard label="Failed" value={failed} />
      </PageHeader>

      <Card className="p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Event ingestion model</h2>
        <p className="text-xs text-slate-600">
          External systems POST signed webhook payloads that are persisted as <span className="font-mono text-[10px]">integration_events</span> (idempotent by external event id), then processed into ERP entities in a follow-up step. Failures stay visible here for replay, and nothing is dropped silently.
        </p>
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">
          Planned sources: WooCommerce orders/stock sync · n8n workflow triggers · future REST/CLI access keys (owner-issued).
        </div>
      </Card>

      {canSee ? (
        <Card>
          {rows.length === 0 ? (
            <div className="p-6"><Empty message="No integration events yet." /></div>
          ) : (
            <Table headers={["Received", "Source", "Event", "External ID", "Status", "Processed"]}>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <Td className="text-xs">{dt(r.createdAt)}</Td>
                  <Td><Badge tone="blue">{r.source}</Badge></Td>
                  <Td className="font-mono text-xs">{r.eventType}</Td>
                  <Td className="text-xs">{r.externalEventId ?? "—"}</Td>
                  <Td><Badge tone={statusTone(r.status)}>{r.status}</Badge></Td>
                  <Td className="text-xs">{dt(r.processedAt)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : (
        <Card className="p-4 text-sm text-slate-500">Integration events require the integration.read permission.</Card>
      )}
    </div>
  );
}
