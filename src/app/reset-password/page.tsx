import { Suspense } from "react";
import ResetPasswordPage from "./reset-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
