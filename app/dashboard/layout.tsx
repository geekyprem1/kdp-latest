import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware also guards this, but verify here too (defense in depth).
  let email: string | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    email = user.email ?? null;
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#FBF7EE]">
      <Suspense fallback={<div className="w-56 shrink-0 bg-black" />}>
        <DashboardNav email={email} />
      </Suspense>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
