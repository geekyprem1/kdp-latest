import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAdmin } from "@/lib/admin";
import { DashboardNav } from "@/components/dashboard/nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  suspended: { title: "Your account is suspended", body: "Access to KDP Mafia is temporarily paused. Contact support if you believe this is a mistake." },
  banned: { title: "Your account has been banned", body: "Access to KDP Mafia has been revoked. Contact support if you believe this is a mistake." },
  deleted: { title: "Your account has been closed", body: "This account is no longer active." },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let userId: string | null = null;
  let email: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
    email = user.email ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .single();
    const status = profile?.account_status ?? "active";

    if (status !== "active") {
      const copy = STATUS_COPY[status] ?? STATUS_COPY.banned;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF7EE] px-6 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">{copy.title}</h1>
          <p className="mt-2 max-w-md text-sm text-neutral-600">{copy.body}</p>
          <SignOutButton className="mt-6 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700" />
        </div>
      );
    }
  } catch {
    redirect("/login");
  }

  const admin = await resolveAdmin();

  return (
    <div className="flex min-h-screen bg-[#FBF7EE]">
      <Suspense fallback={<div className="w-56 shrink-0 bg-black" />}>
        <DashboardNav email={email} isAdmin={Boolean(admin)} />
      </Suspense>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
