"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ReportPreview } from "@/components/report-preview";
import { api } from "@/lib/api/client";
import { useStore } from "@/lib/store";
import type { Job, Photo, Profile, Report } from "@/lib/types";

export default function CustomerReportPage() {
  const params = useParams<{ id: string }>();
  const { markRead } = useStore();
  const marked = useRef(false);
  const [snapshot, setSnapshot] = useState<{
    report: Report;
    job: Job;
    profile: Profile;
    photos?: Photo[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [readRecorded, setReadRecorded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.getPublicReport(params.id);
        if (!cancelled) setSnapshot(data);
      } catch {
        if (!cancelled) setSnapshot(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    if (!snapshot || marked.current) return;
    marked.current = true;
    void markRead(snapshot.report.id).then(() => setReadRecorded(true));
  }, [snapshot, markRead]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Loading report…</div>;
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center" data-testid="customer-report-unavailable">
        <div>
          <h1 className="text-2xl font-bold mb-2">Report unavailable</h1>
          <p className="text-slate-600 mb-4">This customer link may have expired or the report was deleted.</p>
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 h-16 flex items-center">
        <Brand />
      </header>
      <main id="main" className="max-w-5xl mx-auto px-4 py-8" data-testid="customer-report">
        {readRecorded && <span data-testid="read-recorded" className="sr-only">Read recorded</span>}
        <p className="text-sm text-slate-500 mb-4">Customer copy of this inspection report.</p>
        <ReportPreview
          job={snapshot.job}
          profile={snapshot.profile}
          report={snapshot.report}
          photos={snapshot.photos ?? []}
        />
      </main>
    </div>
  );
}
