import AppShell from "@/components/shell/app-shell";
import { TopBar } from "@/components/shell/topbar";
import { requireUser } from "@/server/auth";
import { bootstrapDemoTenant } from "@/server/bootstrap";
import { logoutAction } from "@/server/actions/auth-actions";

export const instant = false;

bootstrapDemoTenant(); // idempotent, once per process

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <AppShell
      topbar={
        <TopBar
          user={{ name: user.fullName, initials: user.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("") }}
          logout={logoutAction}
        />
      }
    >
      {children}
    </AppShell>
  );
}
