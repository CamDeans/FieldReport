"use client";

import { useState } from "react";
import { AnnotatedPhotoGallery } from "@/components/annotated-photo";
import { CONDITION_CONFIG, PRIORITY_CONFIG, SEVERITY_CONFIG } from "@/lib/job-catalog";
import type { Job, Photo, Profile, Report, ReportContent } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function ReportPreview({
  job,
  profile,
  report,
  photos = [],
}: {
  job: Job;
  profile: Profile;
  report: Report;
  photos?: Photo[];
}) {
  const [viewing, setViewing] = useState<"current" | number>("current");
  const history = report.history ?? [];
  const content: ReportContent =
    viewing === "current" ? report.content : history[viewing]?.content ?? report.content;
  const condition = CONDITION_CONFIG[content.overall_condition];
  const versionLabel = viewing === "current" ? report.version ?? 1 : history[viewing]?.version;
  const annotations = content.photo_annotations ?? [];

  return (
    <article id="report-preview" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm" data-testid="report-preview">
      <div className="bg-primary text-white p-6 sm:p-8">
        {profile.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.logoDataUrl} alt={`${profile.companyName || "Company"} logo`} className="h-12 w-auto mb-4 rounded bg-white p-1" />
        )}
        <div className="text-xs uppercase tracking-[0.2em] text-blue-100">{profile.companyName || "FieldReport"}</div>
        <h2 className="text-2xl font-bold mt-2">{content.title}</h2>
        <p className="text-blue-100 mt-2">
          {job.address || "Address on file"} · {job.customerName}
        </p>
        {profile.phone && <p className="text-blue-100 text-sm mt-1">{profile.phone}</p>}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Badge className="bg-white/20 text-white border-0" data-testid="report-version">
            Version {versionLabel}
          </Badge>
          {viewing !== "current" && (
            <Button type="button" size="sm" variant="outline" onClick={() => setViewing("current")}>
              Back to current
            </Button>
          )}
        </div>
      </div>
      {history.length > 0 && (
        <div className="px-6 pt-4 no-print border-b border-slate-100 pb-3" data-testid="report-history">
          <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Previous versions</p>
          <div className="flex flex-wrap gap-2">
            {history.map((entry, index) => (
              <Button
                key={`${entry.version}-${entry.savedAt}`}
                type="button"
                size="sm"
                variant={viewing === index ? "default" : "outline"}
                data-testid={`report-history-${entry.version}`}
                onClick={() => setViewing(index)}
              >
                v{entry.version}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="rounded-xl bg-blue-50 p-4">
          <div className="text-xs font-bold text-primary uppercase">Overall condition</div>
          <div className="mt-2">
            <Badge className={condition.className}>{content.overall_condition}</Badge>
          </div>
          <p className="text-sm text-slate-700 mt-2">{content.overall_condition_note}</p>
        </div>
        <p className="text-slate-700 leading-relaxed">{content.summary}</p>
        <div className="space-y-5">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-slate-900">{section.heading}</h3>
                <Badge className={SEVERITY_CONFIG[section.severity].className}>{section.severity}</Badge>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
        {photos.length > 0 ? <AnnotatedPhotoGallery photos={photos} annotations={annotations} /> : null}
        <div>
          <h3 className="font-semibold mb-3">Recommended actions</h3>
          <ul className="space-y-3">
            {content.recommendations.map((rec) => (
              <li key={rec.item} className="flex gap-3">
                <Badge className={PRIORITY_CONFIG[rec.priority].className}>{rec.priority}</Badge>
                <div>
                  <div className="font-medium text-sm">{rec.item}</div>
                  <p className="text-sm text-slate-600 mt-1">{rec.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-slate-600 italic">{content.inspector_notes}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{content.disclaimer}</p>
        <p className="text-xs text-slate-400">
          Prepared by {profile.fullName}
          {profile.phone ? ` · ${profile.phone}` : ""} · FieldReport
        </p>
      </div>
    </article>
  );
}
