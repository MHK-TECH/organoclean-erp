"use server";

import { redirect } from "next/navigation";
import { attemptLogin, logout as authLogout } from "@/server/auth";
import { bootstrapDemoTenant } from "@/server/bootstrap";

export async function loginAction(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  bootstrapDemoTenant(); // idempotent

  const res = await attemptLogin(email, password);
  if (!res.ok) return { error: res.error };
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await authLogout();
  redirect("/login");
}
