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

  // Auth redirect base. Prefer the public env (works in OAuth/magic-link emails
  // even if the user starts the flow from localhost or a preview domain); fall
  // back to the browser origin when unset (dev / unconfigured).
  const authBase =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const callback = `${authBase}/auth/callback?next=/dashboard`;

  async function google() {
    setError(null);
    setBusy("google");
    const supabase = client();
    if (!supabase) return setBusy(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback },
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
      options: { emailRedirectTo: callback },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel — black ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-black p-12">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="KDP Mafia" className="h-20 w-auto" />
        </div>

        <div>
          <div className="inline-block rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">
            The Publishing OS
          </div>

          <h2 className="mt-4 text-3xl font-bold leading-tight text-white">
            Build a KDP Business.<br />
            Not Just a Book.
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-white/50">
            One platform to research niches, create books, generate covers,
            and package everything for Amazon KDP — faster than ever.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: "◆", label: "Market Intelligence™", desc: "Discover profitable niches before you build" },
              { icon: "◆", label: "Publishing Studio", desc: "Word Search, Sudoku, Maze, Coloring & Ebooks" },
              { icon: "◆", label: "Cover Studio", desc: "AI-generated, genre-aware, KDP-ready covers" },
              { icon: "◆", label: "Launch Kit™", desc: "Metadata, keywords & checklist in one ZIP" },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="mt-0.5 text-[10px] text-[#C9A84C]">{f.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{f.label}</div>
                  <div className="text-xs text-white/40">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/20">
          KDP Mafia is an independent publishing software platform and is not affiliated with Amazon.
        </p>
      </div>

      {/* ── Right panel — cream ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#FBF7EE] px-8 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="KDP Mafia" className="h-16 w-auto" />
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in to continue building your KDP business.
          </p>

          {/* Google */}
          <button
            onClick={google}
            disabled={busy !== null}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.2-.4-4.7H24v9h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.5z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.6v6.2C6.5 42.6 14.7 48 24 48z"/>
              <path fill="#FBBC05" d="M10.8 28.8A14.5 14.5 0 0 1 10 24c0-1.7.3-3.3.8-4.8v-6.2H2.6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8.2-6z"/>
              <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.6 30.5.5 24 .5 14.7.5 6.5 5.9 2.6 13.2l8.2 6.2C12.7 13.6 17.9 9.5 24 9.5z"/>
            </svg>
            {busy === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs text-neutral-400">or</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          {sent ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Check your inbox — we sent a magic sign-in link to <strong>{email}</strong>.
            </div>
          ) : (
            <form onSubmit={emailLink} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={busy !== null}
                className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {busy === "email" ? "Sending…" : "Send me a sign-in link"}
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <p className="mt-8 text-center text-xs text-neutral-400">
            No password required. We&apos;ll email you a secure link.
          </p>
        </div>
      </div>

    </div>
  );
}
