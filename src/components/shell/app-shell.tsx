"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { XIcon } from "@hugeicons/core-free-icons";
import { navGroups, dashboardIcon } from "@/lib/nav";
import type { NavItem } from "@/lib/nav";

function NavLink({ item, expanded, onNavigate }: { item: NavItem; expanded: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={item.title}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      } ${expanded ? "" : "justify-center px-2"}`}
    >
      <HugeiconsIcon icon={item.icon} className="size-5 shrink-0" strokeWidth={1.6} aria-hidden />
      {expanded ? <span className="truncate">{item.title}</span> : null}
      {expanded ? (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
            active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
          }`}
        >
          {item.phase}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarContent({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate: () => void;
}) {
  return (
    <>
      <Link
        href="/"
        onClick={onNavigate}
        className={`flex h-14 items-center gap-2.5 border-b border-slate-200 px-4 ${
          expanded ? "" : "justify-center px-0"
        }`}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-600 font-bold text-white">
          <HugeiconsIcon icon={dashboardIcon} className="size-5" strokeWidth={2} aria-hidden />
        </span>
        {expanded ? (
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight text-slate-900">OrganoClean</span>
            <span className="block text-[10px] uppercase tracking-wide text-slate-400">ERP Platform</span>
          </span>
        ) : null}
      </Link>

      <nav
        aria-label="Main navigation"
        className={`flex-1 space-y-4 overflow-y-auto px-2 py-4 pb-20 ${expanded ? "" : "px-1.5"}`}
      >
        {navGroups.map((group) => (
          <div key={group.label}>
            {expanded ? (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            ) : (
              <div className="mx-2 mb-1.5 border-t border-slate-200 first:border-t-0" />
            )}
            <div className="space-y-0.5">
              {group.items.map((navItem) => (
                <NavLink key={navItem.href} item={navItem} expanded={expanded} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}

export default function AppShell({
  children,
  topbar,
}: {
  children: React.ReactNode;
  topbar: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("oc:menu:open", handler);
    return () => window.removeEventListener("oc:menu:open", handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop: full expanded sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarContent expanded={true} onNavigate={() => {}} />
      </aside>

      {/* Tablet: icon-only rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-14 flex-col border-r border-slate-200 bg-white md:flex lg:hidden">
        <SidebarContent expanded={false} onNavigate={() => {}} />
      </aside>

      {/* Mobile: drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-3 grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
            >
              <HugeiconsIcon icon={XIcon} className="size-5" strokeWidth={1.8} aria-hidden />
            </button>
            <SidebarContent expanded={true} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex w-full flex-col md:pl-14 lg:pl-60">
        {topbar}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
