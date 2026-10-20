import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon, ShieldAlertIcon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

export function Badge({ tone, children }: { tone: "green" | "red" | "amber" | "blue" | "slate"; children: ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  } as const;
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tones[tone]}`}>{children}</span>;
}

export function statusTone(s: string): "green" | "red" | "amber" | "blue" | "slate" {
  if (["active", "approved", "released", "pass", "paid", "completed", "done", "processed"].includes(s)) return "green";
  if (["fail", "rejected", "overdue", "cancelled", "breakdown"].includes(s)) return "red";
  if (["draft", "pending", "invited", "planned", "open"].includes(s)) return "slate";
  if (["qc_pending", "under_review", "conditional", "partial"].includes(s)) return "amber";
  return "blue";
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
export const btnCls =
  "inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700";
export const btnGhostCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`border-b border-slate-200 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${className}`}>
      {children}
    </th>
  );
}
export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-slate-100 px-3 py-2.5 text-sm text-slate-700 ${className}`}>{children}</td>;
}

export function Table({ headers, children, dense }: { headers: string[]; children: ReactNode; dense?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${dense ? "text-[13px]" : ""}`}>
        <thead>
          <tr>
            {headers.map((h) => (
              <Th key={h}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="grid place-items-center rounded-xl bg-slate-50 p-8 text-center ring-1 ring-slate-200">
      <HugeiconsIcon icon={PlusIcon} className="size-6 text-slate-300" strokeWidth={1.6} aria-hidden />
      <p className="mt-2 max-w-md text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function Forbidden() {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <HugeiconsIcon icon={ShieldAlertIcon} className="size-6 text-red-500" strokeWidth={1.6} aria-hidden />
        <div>
          <h2 className="font-semibold text-slate-900">Access denied</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your role does not include the permission needed for this screen. Ask an administrator for access.
          </p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </Card>
  );
}
