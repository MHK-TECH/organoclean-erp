import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import type { NavItem } from "@/lib/nav";

export default function ModulePlaceholder({ item }: { item: NavItem }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <HugeiconsIcon icon={item.icon} className="size-6" strokeWidth={1.6} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{item.title}</h1>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                {item.phase} — planned
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200 sm:p-5">
          <p className="font-medium text-slate-900">This module is on the roadmap.</p>
          <p className="mt-1">
            Per the implementation plan, we ship features as tested vertical slices — not empty screens pretending to
            work. This page reserves the route while the platform foundation (auth, roles, audit, database) is built
            first.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            Back to dashboard
          </Link>
          <a
            href="https://github.com/MHK-TECH/organoclean-erp/blob/main/docs/PLAN_OF_ACTION.md"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Read the plan
          </a>
        </div>
      </div>
    </div>
  );
}
