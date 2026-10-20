"use client";

import { useFormStatus } from "react-dom";
import { btnCls } from "@/components/ui/kit";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { EnergyIcon } from "@hugeicons/core-free-icons";

export function SubmitButton({ children, ghost = false }: { children: ReactNode; ghost?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={ghost ? btnCls : btnCls}>
      {pending ? (
        <>
          <HugeiconsIcon icon={EnergyIcon} className="size-4 animate-spin" strokeWidth={2} aria-hidden /> Saving…
        </>
      ) : (
        children
      )}
    </button>
  );
}
