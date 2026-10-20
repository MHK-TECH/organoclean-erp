"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardCircleIcon } from "@hugeicons/core-free-icons";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white">
          <HugeiconsIcon icon={DashboardCircleIcon} className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">OrganoClean ERP</h1>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Chemical Manufacturing Platform</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="owner@organoclean.pk"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      {state?.error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-200">
        Demo account (auto-created):
        <br />
        <code className="text-slate-700">owner@organoclean.pk</code> / <code className="text-slate-700">Owner@12345</code>
      </p>
    </form>
  );
}
