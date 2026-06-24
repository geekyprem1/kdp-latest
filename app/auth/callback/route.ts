import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Resolve the public base URL for redirects. Behind a reverse proxy (Coolify /
 * Nginx / Traefik) req.url is the *internal* socket URL (e.g. http://localhost:3000),
 * so building absolute redirects from it sends users to localhost. Prefer the
 * configured public site URL; fall back to X-Forwarded-* headers; last resort
 * use req.url for local dev.
 */
function publicBase(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (env) return env;

  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (proto && host) return `${proto}://${host}`;

  return new URL(req.url).origin;
}

/** OAuth / magic-link callback: exchange the code for a session, then redirect. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/dashboard";
  const base = publicBase(req);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth", base));
    }
  }

  return NextResponse.redirect(new URL(next, base));
}
