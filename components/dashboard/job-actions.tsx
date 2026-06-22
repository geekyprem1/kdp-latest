"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const btn = "rounded border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50";
const primary = "rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50";

export function JobActions({ jobId, status, bookId }: { jobId: string; status: string; bookId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(method: "POST" | "DELETE", action?: string) {
    setBusy(true);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method,
        headers: action ? { "Content-Type": "application/json" } : undefined,
        body: action ? JSON.stringify({ action }) : undefined,
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "completed" && bookId && (
        <Link href={`/dashboard/books/${bookId}`} className={primary}>View</Link>
      )}
      {(status === "queued" || status === "processing") && (
        <button onClick={() => act("POST", "retry")} disabled={busy} className={btn}>Resume</button>
      )}
      {(status === "failed" || status === "cancelled") && (
        <button onClick={() => act("POST", "retry")} disabled={busy} className={primary}>Retry</button>
      )}
      {(status === "queued" || status === "processing") && (
        <button onClick={() => act("POST", "cancel")} disabled={busy} className={btn}>Cancel</button>
      )}
      <button onClick={() => act("DELETE")} disabled={busy} className={btn}>Delete</button>
    </div>
  );
}
