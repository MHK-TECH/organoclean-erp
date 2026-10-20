import "server-only";
import { requireUser, type SessionUser } from "@/server/auth";
import { redirect } from "next/navigation";

/** Requires an authenticated user having the given permission (platform superadmin bypasses). */
export async function ensurePermission(permission: string): Promise<SessionUser> {
  const user = await requireUser();
  if (user.isPlatformSuperAdmin) return user;
  if (user.permissions.has("*")) return user;
  if (!user.permissions.has(permission)) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
  return user;
}

/** Page-level variant: renders an access-denied panel instead of throwing. */
export async function can(permission: string): Promise<SessionUser | null> {
  try {
    return await ensurePermission(permission);
  } catch {
    return null;
  }
}

export async function requireUnauthenticated(): Promise<void> {
  const { getSessionUser } = await import("@/server/auth");
  const user = await getSessionUser();
  if (user) redirect("/");
}
