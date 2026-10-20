import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, FlaskConicalOffIcon } from "@hugeicons/core-free-icons";
import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import {
  customers,
  invoices,
  products,
  purchaseOrders,
  qcInspections,
  salesOrders,
  tasks,
  users,
  auditEvents,
  batches,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { Card, StatCard, Badge, statusTone, Table, Td, Empty } from "@/components/ui/kit";
import { money } from "@/lib/fmt";
import { stockLevels } from "@/server/services/core";

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getDb();
  const tid = user.tenantId;

  const [prodN, custN, openPO, soOpen, invStats, openQc, openBatches] = [
    db.select({ n: sql<number>`count(*)` }).from(products).where(eq(products.tenantId, tid)).get(),
    db.select({ n: sql<number>`count(*)` }).from(customers).where(eq(customers.tenantId, tid)).get(),
    db
      .select({ n: sql<number>`count(*)` })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.tenantId, tid), sql`${purchaseOrders.status} not in ('closed','cancelled')`))
      .get(),
    db
      .select({ n: sql<number>`count(*)` })
      .from(salesOrders)
      .where(and(eq(salesOrders.tenantId, tid), sql`${salesOrders.status} not in ('completed','cancelled')`))
      .get(),
    db
      .select({
        total: sql<number>`coalesce(sum(${invoices.totalMinor}),0)`,
        paid: sql<number>`coalesce(sum(${invoices.paidMinor}),0)`,
        cnt: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(and(eq(invoices.tenantId, tid), sql`${invoices.status} <> 'cancelled'`))
      .get(),

    db
      .select({ n: sql<number>`count(*)` })
      .from(qcInspections)
      .where(and(eq(qcInspections.tenantId, tid), eq(qcInspections.result, "pending")))
      .get(),
    db
      .select({ n: sql<number>`count(*)` })
      .from(batches)
      .where(and(eq(batches.tenantId, tid), sql`${batches.status} in ('planned','approved','in_production','qc_pending')`))
      .get(),
  ];

  const recentBatches = db
    .select()
    .from(batches)
    .where(eq(batches.tenantId, tid))
    .orderBy(desc(batches.createdAt))
    .limit(5)
    .all();

  const recentAudit = db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      actorType: auditEvents.actorType,
      createdAt: auditEvents.createdAt,
      actorName: users.fullName,
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorUserId))
    .where(eq(auditEvents.tenantId, tid))
    .orderBy(desc(auditEvents.createdAt))
    .limit(6)
    .all();

  const myTasks = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.tenantId, tid), eq(tasks.assignedTo, user.id), sql`${tasks.status} in ('open','in_progress')`))
    .limit(5)
    .all();

  const lowN = stockLevels(db, tid).filter((l) => l.reorderPoint !== "0" && l.onHand < Number(l.reorderPoint)).length;
  const i = invStats ?? { total: 0, paid: 0, cnt: 0 };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">OrganoClean ERP</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {user.fullName.split(" ")[0]}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
          Live view of your chemical manufacturing operations — {Number(prodN?.n ?? 0)} products, {Number(custN?.n ?? 0)} customers,{" "}
          {Number(openBatches?.n ?? 0)} batches in flight.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products" value={Number(prodN?.n ?? 0)} hint="active catalog" />
        <StatCard label="Open purchases" value={Number(openPO?.n ?? 0)} hint="POs in flight" />
        <StatCard label="Sales awaiting" value={Number(soOpen?.n ?? 0)} hint="orders to fulfill" />
        <StatCard
          label="Receivables"
          value={money(Number(i.total ?? 0) - Number(i.paid ?? 0))}
          hint={`${Number(i.cnt ?? 0)} invoices issued`}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/inventory" className="group">
          <Card className="flex items-center gap-3 p-4 transition-colors hover:border-amber-300 hover:bg-amber-50/40">
            <Badge tone={lowN > 0 ? "amber" : "green"}>{lowN > 0 ? `${lowN} below reorder` : "all healthy"}</Badge>
            <p className="text-sm font-medium text-slate-700">Stock alerts</p>
            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-auto size-4 text-slate-300 group-hover:text-amber-600" strokeWidth={2} aria-hidden />
          </Card>
        </Link>
        <Link href="/quality" className="group">
          <Card className="flex items-center gap-3 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
            <Badge tone={Number(openQc?.n ?? 0) > 0 ? "amber" : "green"}>{Number(openQc?.n ?? 0)} pending</Badge>
            <p className="text-sm font-medium text-slate-700">QC inspections</p>
            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-auto size-4 text-slate-300 group-hover:text-blue-600" strokeWidth={2} aria-hidden />
          </Card>
        </Link>
        <Link href="/production" className="group">
          <Card className="flex items-center gap-3 p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40">
            <Badge tone="green">{Number(openBatches?.n ?? 0)} active</Badge>
            <p className="text-sm font-medium text-slate-700">Production batches</p>
            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-auto size-4 text-slate-300 group-hover:text-emerald-600" strokeWidth={2} aria-hidden />
          </Card>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent batches</h2>
            <Link href="/production" className="text-xs font-medium text-emerald-700 hover:underline">
              All batches
            </Link>
          </div>
          {recentBatches.length === 0 ? (
            <div className="p-4">
              <Empty message="No production batches yet. Create a formula first, then start a batch from it." />
            </div>
          ) : (
            <Table headers={["Batch", "Status", "Planned"]}>
              {recentBatches.map((b) => (
                <tr key={b.id}>
                  <Td>
                    <span className="font-medium text-slate-900">{b.batchNo}</span>
                    <span className="block text-xs text-slate-400">{b.unit}</span>
                  </Td>
                  <Td>
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                  </Td>
                  <Td>
                    {b.plannedQty} {b.unit}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Audit trail (latest)</h2>
          </div>
          {recentAudit.length === 0 ? (
            <div className="p-4">
              <Empty message="Actions you take will appear here with hash-chained audit entries." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentAudit.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Badge tone={ev.actorType === "human" ? "slate" : "amber"}>{ev.actorType}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">
                      <span className="font-medium">{ev.actorName ?? "system"}</span> — {ev.action}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {ev.entityType}:{ev.entityId.slice(0, 8)}… · {ev.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {myTasks.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">My open tasks</h2>
          <Card>
            <Table headers={["Task", "Priority", "Due"]}>
              {myTasks.map((t) => (
                <tr key={t.id}>
                  <Td>{t.title}</Td>
                  <Td>
                    <Badge tone={t.priority === "urgent" ? "red" : t.priority === "high" ? "amber" : "slate"}>{t.priority}</Badge>
                  </Td>
                  <Td>{t.dueAt ? t.dueAt.toISOString().slice(0, 10) : "—"}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
