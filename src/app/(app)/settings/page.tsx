import { requireUser } from "@/server/auth";
import { getDb } from "@/db";
import { settings, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader, Card, Badge } from "@/components/ui/kit";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveSettingsAction } from "@/server/actions/admin-actions";

export const instant = false;

const SETTING_FIELDS = [
  { key: "finance.currency_display", label: "Display currency", default: "PKR" },
  { key: "finance.tax_default_pct", label: "Default tax %", default: "18" },
  { key: "quality.default_ph_range", label: "Default pH range", default: "6.5 – 7.5" },
  { key: "quality.required_tests", label: "Required QC tests", default: "pH, viscosity, appearance" },
  { key: "inventory.low_stock_days", label: "Low-stock horizon (days)", default: "14" },
  { key: "ops.default_batch_scale", label: "Default batch scale", default: "1" },
] as const;

export default async function SettingsPage(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const canWrite = user.isPlatformSuperAdmin || user.permissions.has("settings.manage") || user.permissions.has("*");
  const db = getDb();

  const stored = db.select().from(settings).where(eq(settings.tenantId, user.tenantId)).all();
  const valueOf = (key: string, fallback: string) => stored.find((s) => s.key === key)?.value ?? fallback;
  const tenant = db.select().from(tenants).where(eq(tenants.id, user.tenantId)).get();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Tenant preferences. Organization profile & locations live in the Organization module.">
        <Badge tone="blue">{tenant?.currency ?? "PKR"} · {tenant?.timezone ?? "Asia/Karachi"}</Badge>
      </PageHeader>

      {sp.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{sp.error}</p> : null}
      {sp.saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</p> : null}

      {canWrite ? (
        <Card className="p-4 sm:p-5">
          <form action={saveSettingsAction} className="space-y-4">
            {SETTING_FIELDS.map((f) => (
              <div key={f.key} className="grid grid-cols-1 items-center gap-2 border-b border-slate-100 pb-3 last:border-0 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-medium text-slate-700">{f.label}</p>
                  <p className="font-mono text-[10px] text-slate-400">{f.key}</p>
                </div>
                <input type="hidden" name="key" value={f.key} />
                <input
                  name={`v_${f.key}`}
                  defaultValue={valueOf(f.key, f.default)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-64"
                />
              </div>
            ))}
            <SubmitButton>Save settings</SubmitButton>
          </form>
        </Card>
      ) : (
        <Card className="p-4 text-sm text-slate-500">Settings require the settings.manage permission.</Card>
      )}

      <Card className="p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">AI configuration note</p>
        <p className="mt-1">
          The org_owner (CEO) manages AI-team and integration configuration from opencode&apos;s own dashboard. Inside this ERP, AI polish jobs appear in the AI module once wired.
        </p>
      </Card>
    </div>
  );
}
