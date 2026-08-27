import type {
  Condition,
  Job,
  JobDocument,
  Photo,
  Profile,
  ReportContent,
  ReportRecommendation,
  ReportSection,
  Severity,
} from "./types";
import { getJobType, getJobTypeLabel } from "./taxonomy";

function evidenceFrom(job: Job, photos: Photo[], documents: JobDocument[] = []) {
  return [
    job.notes,
    ...photos.map((p) => p.caption),
    ...photos.map((p) => p.transcription),
    ...documents.map((d) => d.extractedText),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
}

function detectCondition(text: string): Condition {
  const t = text.toLowerCase();
  if (/(collapse|structural failure|active leak|electrical hazard|unsafe|critical|emergency)/.test(t)) {
    return "Critical";
  }
  if (/(rot|leak|mold|failed|broken|missing|hazard|severe|poor)/.test(t)) {
    return "Poor";
  }
  if (/(wear|aged|stained|cracked|sagging|needs|recommend|fair)/.test(t)) {
    return "Fair";
  }
  return text.length < 40 ? "Fair" : "Good";
}

function severityFor(body: string, index: number): Severity {
  const t = body.toLowerCase();
  if (/(unsafe|active leak|immediate|hazard|structural)/.test(t)) return "Urgent";
  if (/(repair|replace|damage|moisture|failed)/.test(t)) return "Attention";
  if (/(monitor|maintenance|clean|service)/.test(t)) return "Advisory";
  return index === 0 ? "Info" : "Advisory";
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function synthesizeBody(heading: string, job: Job, notes: string[], typeKeywords: string[]) {
  const words = [
    ...heading.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4),
    ...typeKeywords.map((k) => k.toLowerCase()),
  ];
  const relevant = notes.filter((n) => words.some((w) => n.toLowerCase().includes(w)));
  const source = relevant.length ? relevant : notes;
  const where = job.address ? ` at ${job.address}` : "";
  const label = getJobTypeLabel(job.jobType);
  if (source.length) {
    const observed = source
      .slice(0, 3)
      .map((n) => sentenceCase(n.replace(/[.]+$/, "")))
      .join(". ");
    return `${observed}. These observations were recorded on site for ${job.customerName}${where}. This section covers ${heading.toLowerCase()} for a ${label.toLowerCase()} based on visible conditions at the time of inspection.`;
  }
  return `${heading} was reviewed as part of this ${label.toLowerCase()} for ${job.customerName}${where}. No additional inspector narration was captured for this section, so findings stay limited to the job setup and related photos.`;
}

function recommendationsFor(
  condition: Condition,
  job: Job,
  notes: string[],
  hints: string[]
): ReportRecommendation[] {
  const recs: ReportRecommendation[] = [];
  const blob = notes.join(" ").toLowerCase();
  const hintBlob = hints.join(" ").toLowerCase();

  if (condition === "Critical" || /leak|unsafe|hazard/.test(blob)) {
    recs.push({
      priority: "Immediate",
      item: "Address active risk items before the next weather event",
      detail:
        "Based on field notes, at least one issue may allow water intrusion or create a safety risk. Temporary protection and a qualified repair should be scheduled now.",
    });
  }
  if (/flashing|gutter|moisture|filter|railing|rot/.test(blob + hintBlob) || condition === "Poor" || condition === "Fair") {
    recs.push({
      priority: "Soon",
      item: hints[0]
        ? `Complete ${hints[0]} identified in this report`
        : "Complete targeted repairs identified in this report",
      detail:
        "Repair the specific assemblies called out in the findings rather than waiting for a full replacement cycle, unless replacement is already justified.",
    });
  }
  recs.push({
    priority: "Recommended",
    item: `Provide ${job.customerName} with a written estimate for the recommended scope`,
    detail:
      "A clear estimate attached to this report helps the customer approve work quickly and documents what was visible on this visit.",
  });
  recs.push({
    priority: "Maintenance",
    item: hints[1]
      ? `Schedule follow-up: ${hints[1]}`
      : "Schedule a follow-up inspection after repairs or seasonal weather",
    detail:
      "Conditions change after storms, occupancy, or completed repairs. A short re-inspection protects the customer and the contractor.",
  });
  return recs;
}

export function generateReportContent(
  job: Job,
  photos: Photo[],
  profile: Profile,
  documents: JobDocument[] = []
): ReportContent {
  const template = getJobType(job.jobType);
  const notes = evidenceFrom(job, photos, documents);
  const blob = notes.join(" \n ");
  const overall_condition = detectCondition(blob || job.notes);
  const headings = template.sections;
  const location = job.address ? ` at ${job.address}` : "";
  const evidenceLine = [
    photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : null,
    documents.length ? `${documents.length} reference PDF${documents.length === 1 ? "" : "s"}` : null,
    notes.length ? "inspector notes" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const sections: ReportSection[] = headings.map((heading, index) => {
    const body = synthesizeBody(heading, job, notes, template.evidenceKeywords);
    return { heading, severity: severityFor(body + blob, index), body };
  });

  const label = getJobTypeLabel(job.jobType);

  return {
    title: `${label} — ${job.customerName}`,
    overall_condition,
    overall_condition_note: `${overall_condition} overall condition based on visible evidence from this site visit${location}.`,
    summary: `${profile.companyName || profile.fullName} completed a ${label.toLowerCase()} for ${job.customerName}${location} on ${new Date(job.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Field documentation includes ${evidenceLine || "job setup details"}. This report is written for the property owner and may also be shared with an insurer or follow-on trades. It records what was observed; it is not a code-compliance certificate or a warranty.`,
    sections,
    recommendations: recommendationsFor(overall_condition, job, notes, template.recommendationHints),
    inspector_notes: job.notes
      ? `Inspector context: ${job.notes}`
      : documents.length
        ? `Reference PDF(s) provided: ${documents.map((d) => d.fileName).join(", ")}.`
        : "No extra job-level context was entered. Findings rely on photo captions and voice notes.",
    disclaimer:
      "This report reflects conditions reasonably visible at the time of inspection. Concealed, inaccessible, or weather-changed conditions may differ. No destructive testing was performed unless noted. This document is not a warranty, insurance policy, or engineering stamp.",
  };
}

export function formatReportPlainText(job: Job, profile: Profile, content: ReportContent) {
  const recs = content.recommendations
    .map((rec) => `${rec.priority}: ${rec.item} — ${rec.detail}`)
    .join("\n");
  const sections = content.sections.map((section) => `${section.heading} (${section.severity})\n${section.body}`).join("\n\n");
  return [
    content.title,
    profile.companyName || profile.fullName,
    profile.phone,
    job.address || "Address on file",
    `Prepared for ${job.customerName}`,
    `Overall condition: ${content.overall_condition}`,
    content.overall_condition_note,
    content.summary,
    sections,
    "Recommended actions",
    recs,
    content.inspector_notes,
    content.disclaimer,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function validateReportContent(content: ReportContent) {
  const checks: Array<{ name: string; passed: boolean }> = [
    { name: "title", passed: content.title.length > 8 },
    { name: "condition", passed: ["Good", "Fair", "Poor", "Critical"].includes(content.overall_condition) },
    { name: "summary", passed: content.summary.length > 80 },
    { name: "sections", passed: content.sections.length >= 4 },
    { name: "section bodies", passed: content.sections.every((s) => s.body.length > 40) },
    { name: "recommendations", passed: content.recommendations.length >= 2 },
    { name: "disclaimer", passed: content.disclaimer.length > 40 },
  ];
  return { passed: checks.every((c) => c.passed), checks };
}
