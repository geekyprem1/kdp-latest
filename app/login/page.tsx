"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function client() {
    try {
      return createSupabaseBrowserClient();
    } catch {
      setError("Authentication is not configured yet (missing Supabase env vars).");
      return null;
    }
  }

  async function google() {
    setError(null);
    setBusy("google");
    const supabase = client();
    if (!supabase) return setBusy(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
  }

  async function emailLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    const supabase = client();
    if (!supabase) return setBusy(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="KDP Mafia" className="h-20 w-auto" />
      <h1 className="mt-4 text-2xl font-bold">Sign in to KDP Mafia</h1>
      <p className="mt-1 text-sm text-neutral-600">
        The fastest way to build a KDP business.
      </p>

      <button
        onClick={google}
        disabled={busy !== null}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
      >
        {busy === "google" ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" /> or <div className="h-px flex-1 bg-neutral-200" />
      </div>

      {sent ? (
        <div className="rounded border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Check your inbox — we sent a magic sign-in link to <strong>{email}</strong>.
        </div>
      ) : (
        <form onSubmit={emailLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded border border-neutral-300 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="w-full rounded bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "email" ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
