import { Suspense } from "react";
import { CreateWizard } from "@/components/dashboard/create-wizard";

export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // Remount the wizard whenever the deep-link changes (e.g. a generator's ?type=
  // vs. plain Publishing Studio) so its step/selection resets instead of sticking
  // to the previous generator until a manual page refresh.
  const wizardKey = `${sp.type ?? ""}|${sp.theme ?? ""}`;
  return (
    <Suspense fallback={null}>
      <CreateWizard key={wizardKey} />
    </Suspense>
  );
}
