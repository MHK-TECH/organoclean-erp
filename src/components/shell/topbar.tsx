"use client";

import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { MenuIcon, BellIcon, PlusIcon, PowerIcon } from "@hugeicons/core-free-icons";

export function TopBar({
  user,
  logout,
}: {
  user: { name: string; initials: string };
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const title = pathname === "/" ? "Dashboard" : pathname.replace("/", "").replaceAll("/", " / ");
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-4">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => window.dispatchEvent(new Event("oc:menu:open"))}
        className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
      >
        <HugeiconsIcon icon={MenuIcon} className="size-5" strokeWidth={1.8} aria-hidden />
      </button>

      <p className="truncate text-sm font-medium text-slate-700">{title}</p>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Create new record (coming soon)"
          className="hidden size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 sm:grid"
        >
          <HugeiconsIcon icon={PlusIcon} className="size-5" strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <HugeiconsIcon icon={BellIcon} className="size-5" strokeWidth={1.8} aria-hidden />
        </button>
        <span
          title={user.name}
          className="hidden sm:grid size-9 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white"
        >
          {user.initials}
        </span>
        <form action={logout}>
          <button
            type="submit"
            title={`Log out (${user.name})`}
            aria-label="Log out"
            className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <HugeiconsIcon icon={PowerIcon} className="size-5" strokeWidth={1.8} aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}
