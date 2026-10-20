import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/login-form";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <LoginForm />
    </div>
  );
}
