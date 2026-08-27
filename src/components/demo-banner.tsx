"use client";

import { toast } from "sonner";
import { Button } from "./ui/button";
import { useStore } from "@/lib/store";
import { DEMO_EMAIL } from "@/lib/demo-data";

export function DemoBanner() {
  const { profile, resetDemo, appMode } = useStore();
  if (appMode !== "demo" || profile?.email !== DEMO_EMAIL) return null;

  return (
    <div
      className="bg-blue-50 border-b border-blue-100 text-sm text-slate-700 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print"
      data-testid="demo-banner"
    >
      <p>
        Demo mode — same API and flows as production. Set OPENAI_API_KEY for AI-primary reports; without it, the
        taxonomy engine is the fail-safe. Data is stored in{" "}
        <code className="text-xs bg-white/70 px-1 rounded">.fieldreport/</code>.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          await resetDemo();
          toast.success("Sample jobs restored");
        }}
        data-testid="reset-demo"
      >
        Reset sample jobs
      </Button>
    </div>
  );
}
