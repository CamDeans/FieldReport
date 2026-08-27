"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-6">{error.message || "An unexpected error occurred."}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
