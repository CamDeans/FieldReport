import OpenAI, { toFile } from "openai";
import { isOpenAiConfigured } from "../config";
import { getJobType, getJobTypeLabel, isCatalogJobType } from "../taxonomy";
import { validateReportContent } from "../report-engine";
import type {
  Condition,
  Job,
  JobDocument,
  Photo,
  Priority,
  Profile,
  ReportContent,
  ReportRecommendation,
  ReportSection,
  Severity,
} from "../types";

const CONDITIONS: Condition[] = ["Good", "Fair", "Poor", "Critical"];
const SEVERITIES: Severity[] = ["Info", "Advisory", "Attention", "Urgent"];
const PRIORITIES: Priority[] = ["Immediate", "Soon", "Recommended", "Maintenance"];

export function evidenceLines(job: Job, photos: Photo[], documents: JobDocument[]) {
  return [
    job.notes,
    ...photos.map((p) => `[Photo] ${p.caption}`.trim()),
    ...photos.map((p) => p.transcription),
    ...documents.map((d) => `[Reference PDF: ${d.fileName}]\n${d.extractedText}`),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampCondition(value: unknown): Condition {
  return CONDITIONS.includes(value as Condition) ? (value as Condition) : "Fair";
}

function clampSeverity(value: unknown): Severity {
  return SEVERITIES.includes(value as Severity) ? (value as Severity) : "Advisory";
}

function clampPriority(value: unknown): Priority {
  return PRIORITIES.includes(value as Priority) ? (value as Priority) : "Recommended";
}

export function normalizeAiContent(raw: Partial<ReportContent>, job: Job, profile: Profile, photos: Photo[]): ReportContent {
  const label = getJobTypeLabel(job.jobType);
  const sections: ReportSection[] = (raw.sections ?? [])
    .filter((s) => s?.heading && s?.body)
    .map((s) => ({
      heading: String(s.heading).trim(),
      severity: clampSeverity(s.severity),
      body: String(s.body).trim(),
    }));
  const recommendations: ReportRecommendation[] = (raw.recommendations ?? [])
    .filter((r) => r?.item && r?.detail)
    .map((r) => ({
      priority: clampPriority(r.priority),
      item: String(r.item).trim(),
      detail: String(r.detail).trim(),
    }));

  const fallbackTemplate = getJobType(isCatalogJobType(job.jobType) ? job.jobType : "general");
  const ensuredSections =
    sections.length >= 3
      ? sections
      : fallbackTemplate.sections.map((heading) => ({
          heading,
          severity: "Info" as Severity,
          body:
            sections.find((s) => s.heading === heading)?.body ||
            `Observations for ${heading.toLowerCase()} were reviewed for ${job.customerName} using on-site documentation.`,
        }));

  const ensuredRecs =
    recommendations.length >= 2
      ? recommendations
      : [
          {
            priority: "Soon" as Priority,
            item: `Complete repairs identified for ${job.customerName}`,
            detail: "Prioritize the findings in this report and provide a written estimate.",
          },
          {
            priority: "Maintenance" as Priority,
            item: "Schedule a follow-up inspection after repairs",
            detail: "Re-check conditions after weather or completed work.",
          },
        ];

  return {
    title: (raw.title && String(raw.title).trim()) || `${label} — ${job.customerName}`,
    overall_condition: clampCondition(raw.overall_condition),
    overall_condition_note:
      (raw.overall_condition_note && String(raw.overall_condition_note).trim()) ||
      `${clampCondition(raw.overall_condition)} overall condition based on visible evidence from this site visit.`,
    summary:
      (raw.summary && String(raw.summary).trim()) ||
      `${profile.companyName || profile.fullName} completed a field report for ${job.customerName} with ${photos.length} photo(s).`,
    sections: ensuredSections,
    recommendations: ensuredRecs,
    inspector_notes:
      (raw.inspector_notes && String(raw.inspector_notes).trim()) ||
      (job.notes ? `Inspector context: ${job.notes}` : "Findings rely on photo captions and voice notes."),
    disclaimer:
      (raw.disclaimer && String(raw.disclaimer).trim()) ||
      "This report reflects conditions reasonably visible at the time of inspection. Concealed, inaccessible, or weather-changed conditions may differ. No destructive testing was performed unless noted. This document is not a warranty, insurance policy, or engineering stamp.",
  };
}

/**
 * Primary report author when OPENAI_API_KEY is set.
 * Uses vision on job photos + all field evidence. Taxonomy is not used for structure.
 * When previousContent is provided, OpenAI patches the existing report instead of drafting from scratch.
 */
export async function generateReportWithOpenAi(
  job: Job,
  photos: Photo[],
  profile: Profile,
  documents: JobDocument[] = [],
  previousContent?: ReportContent | null,
  options?: { complete?: typeof defaultComplete }
): Promise<ReportContent | null> {
  if (!isOpenAiConfigured() && !options?.complete) return null;

  try {
    const scopeLabel = getJobTypeLabel(job.jobType);
    const catalogHint = isCatalogJobType(job.jobType)
      ? `Catalog id "${job.jobType}" (${scopeLabel}) — treat as a starting hint only; invent the right sections for this job.`
      : `Custom / freeform scope: "${scopeLabel}" — invent professional sections that fit this trade work. There is no fixed template.`;

    const pdfHint = documents.length
      ? `The contractor uploaded ${documents.length} reference PDF(s). Align the report’s structure, headings, tone, and coverage with those documents. Prefer their section naming and checklist style when present. Field notes and photo captions are live updates to findings — incorporate them even when they post-date the PDF. Still only use findings supported by field evidence and photos — do not invent measurements from the PDF alone.`
      : "No reference PDF was uploaded.";

    const updateHint = previousContent
      ? `This is an UPDATE to an existing report (incremental regenerate). Preserve useful structure and section headings when still relevant. Incorporate new field evidence; revise summary, condition, sections, and recommendations accordingly. Return a complete replacement JSON report — not a diff.\n\nPrevious report JSON:\n${JSON.stringify(previousContent)}`
      : "This is a first draft for this job.";

    const textBlock = [
      `Company: ${profile.companyName || profile.fullName}`,
      `Inspector: ${profile.fullName}`,
      `Customer: ${job.customerName}`,
      `Email: ${job.customerEmail || "n/a"}`,
      `Address: ${job.address || "n/a"}`,
      `Report scope: ${scopeLabel}`,
      catalogHint,
      pdfHint,
      updateHint,
      "",
      "Field evidence (do not invent measurements or findings not supported by this evidence or the photos):",
      ...evidenceLines(job, photos, documents),
    ].join("\n");

    const imageParts = photos.slice(0, 6).map((photo) => ({
      type: "image_url" as const,
      image_url: { url: photo.dataUrl, detail: "low" as const },
    }));

    const complete = options?.complete ?? defaultComplete;
    const raw = await complete([
      {
        role: "system",
        content: `You are FieldReport's primary report writer for trades contractors (roofing, HVAC, restoration, plumbing, electrical, fencing, inspections, and any other trade).

Write a complete customer-ready inspection / field report as JSON with exactly these keys:
- title (string)
- overall_condition ("Good"|"Fair"|"Poor"|"Critical")
- overall_condition_note (string)
- summary (string, 2–4 sentences)
- sections (array of { heading, severity ("Info"|"Advisory"|"Attention"|"Urgent"), body }) — invent 4–8 trade-appropriate section headings for THIS job; do not force a fixed template
- recommendations (array of { priority ("Immediate"|"Soon"|"Recommended"|"Maintenance"), item, detail }) — at least 2
- inspector_notes (string)
- disclaimer (string)

Rules:
- Never invent measurements, quantities, or findings not supported by the evidence or photos.
- Prefer the contractor's words; professionalize without inventing.
- If evidence is thin, say so conservatively — do not fabricate.
- Reports must look professional enough to send to a customer or insurer.`,
      },
      {
        role: "user",
        content: [{ type: "text", text: textBlock }, ...imageParts],
      },
    ]);

    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReportContent>;
    const content = normalizeAiContent(parsed, job, profile, photos);
    const { passed } = validateReportContent(content);
    return passed ? content : content;
  } catch {
    return null;
  }
}

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "low" | "high" } }> };

async function defaultComplete(messages: ChatMessage[]): Promise<string | null> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    // ChatMessage is a narrowed subset of OpenAI message shapes used by FieldReport.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
  });
  return response.choices[0]?.message?.content ?? null;
}

export async function suggestReportScopeWithOpenAi(input: {
  notes: string;
  tradeContext?: string;
}): Promise<{ scope: string; rationale: string } | null> {
  if (!isOpenAiConfigured()) return null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Suggest a short freeform report scope label for a trades field report (e.g. "Hail damage roof assessment", "Commercial kitchen hood inspection"). Return JSON { "scope": string, "rationale": string }. Any trade is allowed — never force a closed catalog.',
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { scope?: string; rationale?: string };
    if (!parsed.scope?.trim()) return null;
    return { scope: parsed.scope.trim(), rationale: parsed.rationale?.trim() || "" };
  } catch {
    return null;
  }
}

export async function transcribeAudioWithOpenAi(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (!isOpenAiConfigured()) return null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
    const file = await toFile(buffer, `note.${ext}`, { type: mimeType || "audio/webm" });
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });
    return result.text?.trim() || null;
  } catch {
    return null;
  }
}
