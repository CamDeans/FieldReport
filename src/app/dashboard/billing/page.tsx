import { Suspense } from "react";
import BillingPage from "./billing-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading billing…</div>}>
      <BillingPage />
    </Suspense>
  );
}
