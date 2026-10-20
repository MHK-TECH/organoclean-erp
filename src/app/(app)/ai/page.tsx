import { requireUser } from "@/server/auth";
import { PageHeader, Card, Badge, Empty } from "@/components/ui/kit";
import { HugeiconsIcon } from "@hugeicons/react";
import { EnergyIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

export const instant = false;

export default async function AiPage() {
  const user = await requireUser();
  const canSee = user.isPlatformSuperAdmin || user.permissions.has("ai.run") || user.permissions.has("*");

  return (
    <div className="space-y-6">
      <PageHeader title="AI" subtitle="Polish & generate content for descriptions, labels and specs">
        <Badge tone="amber">stub — connect AI keys via Integrations</Badge>
      </PageHeader>

      {canSee ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <HugeiconsIcon icon={EnergyIcon} className="h-4 w-4 text-emerald-600" strokeWidth={2} aria-hidden /> How this works (once enabled)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-600">
            <li>Create a Krutrim/AI key and register it in Settings (integrations registry).</li>
            <li>Run a &quot;polish&quot; job on product descriptions or SOP text — jobs show here with cost, input/output and audit trail.</li>
            <li>Review AI output, then publish. Everything stays human-in-the-loop.</li>
          </ol>
          <p className="mt-3 text-[11px] text-slate-400">
            Placeholder module: no external AI calls are made until a key is configured (honest stub). Jobs will be listed here and audited.
          </p>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">Recent AI jobs</h2></div>
        <div className="p-6"><Empty message="No AI jobs yet." /></div>
      </Card>

      <p className="text-center text-xs text-slate-400">
        Return to <Link href="/" className="text-emerald-700 hover:underline">dashboard</Link>
      </p>
    </div>
  );
}
