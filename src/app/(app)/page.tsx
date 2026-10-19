import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";import { navGroups } from "@/lib/nav";

const foundationTasks = [
  { label: "Database schema + migrations", phase: "Phase 1", status: "next" },
  { label: "Authentication & sessions", phase: "Phase 1", status: "planned" },
  { label: "Roles, permissions (RBAC)", phase: "Phase 1", status: "planned" },
  { label: "Audit log & CEO oversight", phase: "Phase 1", status: "planned" },
  { label: "Responsive app shell", phase: "Phase 0", status: "done" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
          OrganoClean AI ERP
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome to your chemical manufacturing platform
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
          Research &rarr; Formulation &rarr; Procurement &rarr; Inventory &rarr; Production &rarr; Quality &rarr;
          Sales &rarr; Finance. The shell is live and responsive; modules ship as tested vertical slices per the
          phased plan.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Platform foundation</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {foundationTasks.map((task) => (
            <div
              key={task.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    task.status === "done"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : task.status === "next"
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {task.status}
                </span>
                <span className="text-[10px] font-medium text-slate-400">{task.phase}</span>
              </div>
              <p className="mt-2 text-sm font-medium leading-5 text-slate-800">{task.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Modules</h2>
        <p className="mt-1 text-sm text-slate-500">
          {navGroups.flatMap((g) => g.items).length} planned modules across four business streams.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {navGroups.flatMap((group) =>
            group.items.map((navItem) => (
              <Link
                key={navItem.href}
                href={navItem.href}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                    <HugeiconsIcon icon={navItem.icon} className="size-5" strokeWidth={1.6} aria-hidden />
                  </span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-slate-300 transition-colors group-hover:text-emerald-600" strokeWidth={2} aria-hidden />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{navItem.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {navItem.phase}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{navItem.description}</p>
              </Link>
            )),
          )}
        </div>
      </section>
    </div>
  );
}
