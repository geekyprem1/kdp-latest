import { Suspense } from "react";
import { CreateBookForm } from "@/components/dashboard/create-form";

export const dynamic = "force-dynamic";

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateBookForm />
    </Suspense>
  );
}
