"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEMO_EMAIL } from "@/lib/demo-data";

export function OnboardingCard() {
  const { profile, jobs, state } = useStore();
  if (!profile || profile.email === DEMO_EMAIL || !profile.onboardingCompletedAt) return null;

  const mine = jobs.map((j) => j.id);
  const hasPhoto = state.photos.some((p) => mine.includes(p.jobId));
  const hasReport = state.reports.some((r) => mine.includes(r.jobId));
  const hasSent = jobs.some((j) => j.status === "sent");
  const branded = Boolean(profile.companyName.trim());

  const steps = [
    { id: "job", label: "Create a job", done: jobs.length > 0, href: "/dashboard/jobs/new" },
    {
      id: "photo",
      label: "Add a photo and a field note",
      done: hasPhoto,
      href: jobs[0] ? `/dashboard/jobs/${jobs[0].id}` : "/dashboard/jobs/new",
    },
    {
      id: "report",
      label: "Generate a customer report",
      done: hasReport,
      href: jobs[0] ? `/dashboard/jobs/${jobs[0].id}` : "/dashboard/jobs/new",
    },
    {
      id: "send",
      label: "Send or print the report",
      done: hasSent,
      href: jobs[0] ? `/dashboard/jobs/${jobs[0].id}` : "/dashboard/jobs/new",
    },
    { id: "brand", label: "Add your company name", done: branded, href: "/dashboard/settings" },
  ];

  if (steps.every((s) => s.done)) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 animate-in" data-testid="onboarding">
      <h2 className="font-semibold mb-1">Get your first report out</h2>
      <p className="text-sm text-slate-500 mb-4">Four steps. Then you can send a branded report from the driveway.</p>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link href={step.href} className="flex items-center gap-2 text-sm text-slate-700 hover:text-primary">
              {step.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
              <span className={step.done ? "line-through text-slate-400" : ""}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
