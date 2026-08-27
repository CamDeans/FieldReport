"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OnboardingCard } from "@/components/onboarding";
import { TradeOnboardingWizard } from "@/components/trade-onboarding";
import { useStore } from "@/lib/store";
import { labelForJobType, STATUS_CONFIG } from "@/lib/job-catalog";
import { PLAN_LIMITS } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { jobs, profile, state } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const hay = `${job.customerName} ${job.address ?? ""} ${labelForJobType(job.jobType)}`.toLowerCase();
      const matchesQuery = hay.includes(query.toLowerCase());
      const matchesStatus = status === "all" || job.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [jobs, query, status]);

  const used = profile?.reportsUsedThisMonth ?? 0;
  const limit = profile ? PLAN_LIMITS[profile.plan] : 3;
  const atLimit = Number.isFinite(limit) && used >= limit;

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">
            {used} of {Number.isFinite(limit) ? limit : "∞"} reports used this month · {profile?.plan} plan
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/new" data-testid="new-job">
            <Plus className="w-4 h-4" /> New job
          </Link>
        </Button>
      </div>

      {atLimit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          You’ve used every report on the {profile?.plan} plan this month.{" "}
          <Link href="/dashboard/billing" className="font-semibold text-primary">
            Upgrade to keep writing reports
          </Link>
          .
        </div>
      )}

      <TradeOnboardingWizard />

      <OnboardingCard />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search customers, addresses, report types"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="job-search"
          />
        </div>
        <select
          className="h-11 rounded-lg border border-border bg-white px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          data-testid="status-filter"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed p-12 text-center" data-testid="empty-jobs">
          <h2 className="font-semibold mb-2">No jobs yet</h2>
          <p className="text-sm text-slate-500 mb-4">Create a job, add photos, and generate a customer-ready report.</p>
          <Button asChild>
            <Link href="/dashboard/jobs/new">
              <Plus className="w-4 h-4" /> Create first job
            </Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed p-12 text-center" data-testid="empty-filter">
          <h2 className="font-semibold mb-2">No matching jobs</h2>
          <p className="text-sm text-slate-500">Try a different search or status filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const photoCount = state.photos.filter((p) => p.jobId === job.id).length;
            const st = STATUS_CONFIG[job.status];
            return (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-primary/40 transition-colors"
                data-testid={`job-row-${job.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{job.customerName}</div>
                    <div className="text-sm text-slate-500">{job.address || "No address"}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {labelForJobType(job.jobType)} · {photoCount} photos · {formatDate(job.updatedAt)}
                    </div>
                  </div>
                  <Badge className={st.className}>{st.label}</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
