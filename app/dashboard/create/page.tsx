import { Suspense } from "react";
import { CreateWizard } from "@/components/dashboard/create-wizard";

export const dynamic = "force-dynamic";

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateWizard />
    </Suspense>
  );
}
