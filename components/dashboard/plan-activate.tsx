"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanActivate({ planKey, label }: { planKey: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function activate() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={activate} disabled={busy} className="mt-3 w-full rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
      {busy ? "Activating…" : label}
    </button>
  );
}
