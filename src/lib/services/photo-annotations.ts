import type { Job, Photo, PhotoAnnotation, ReportContent, ReportSection, Severity } from "../types";

export { ANNOTATION_COLORS } from "./photo-annotation-colors";
export type { PhotoAnnotation };

const SEVERITIES: Severity[] = ["Info", "Advisory", "Attention", "Urgent"];

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function clampSeverity(value: unknown): Severity {
  return SEVERITIES.includes(value as Severity) ? (value as Severity) : "Advisory";
}

/** Accept AI / loose JSON and produce safe annotations. */
export function normalizePhotoAnnotations(
  raw: unknown,
  photos: Photo[],
  sections: ReportSection[] = []
): PhotoAnnotation[] {
  if (!Array.isArray(raw)) return [];
  const photoIds = new Set(photos.map((p) => p.id));
  const sectionHeadings = sections.map((s) => s.heading);
  const out: PhotoAnnotation[] = [];

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const photoId = String(row.photo_id ?? row.photoId ?? "").trim();
    if (!photoId || !photoIds.has(photoId)) continue;

    const label = String(row.label ?? row.finding ?? row.title ?? "").trim();
    if (!label) continue;

    const boxRaw = (row.box ?? row) as Record<string, unknown>;
    let x = Number(boxRaw.x ?? 0.1);
    let y = Number(boxRaw.y ?? 0.1);
    let width = Number(boxRaw.width ?? boxRaw.w ?? 0.3);
    let height = Number(boxRaw.height ?? boxRaw.h ?? 0.3);

    x = clamp01(x);
    y = clamp01(y);
    width = clamp01(width);
    height = clamp01(height);
    if (width < 0.04) width = 0.12;
    if (height < 0.04) height = 0.12;
    if (x + width > 1) width = Math.max(0.04, 1 - x);
    if (y + height > 1) height = Math.max(0.04, 1 - y);

    const sectionHeadingRaw = String(row.section_heading ?? row.sectionHeading ?? "").trim();
    const sectionHeading =
      sectionHeadingRaw && sectionHeadings.some((h) => h.toLowerCase() === sectionHeadingRaw.toLowerCase())
        ? sectionHeadings.find((h) => h.toLowerCase() === sectionHeadingRaw.toLowerCase())!
        : sectionHeadingRaw || null;

    out.push({
      id: String(row.id ?? `ann-${photoId}-${index}`),
      photoId,
      label: label.slice(0, 120),
      severity: clampSeverity(row.severity),
      sectionHeading,
      box: { x, y, width, height },
    });
  }

  return out.slice(0, 24);
}

/**
 * Heuristic overlays when OpenAI is unavailable — still show photos in the report
 * with labeled regions derived from captions / voice notes / section text.
 */
export function buildFallbackAnnotations(job: Job, photos: Photo[], content: ReportContent): PhotoAnnotation[] {
  const annotations: PhotoAnnotation[] = [];
  const sections = content.sections ?? [];

  photos.forEach((photo, photoIndex) => {
    const note = [photo.caption, photo.transcription].map((s) => s.trim()).filter(Boolean).join(" — ");
    const matchedSection =
      sections.find((s) => {
        const blob = `${s.heading} ${s.body}`.toLowerCase();
        const keys = note
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length > 4);
        return keys.some((k) => blob.includes(k));
      }) ?? sections[Math.min(photoIndex, Math.max(0, sections.length - 1))];

    const label =
      (note && note.slice(0, 100)) ||
      matchedSection?.heading ||
      `Photo ${photoIndex + 1} — site evidence`;

    const severity = matchedSection?.severity ?? "Advisory";
    const offset = (photoIndex % 3) * 0.06;
    annotations.push({
      id: `fallback-${photo.id}`,
      photoId: photo.id,
      label,
      severity,
      sectionHeading: matchedSection?.heading ?? null,
      box: {
        x: 0.08 + offset,
        y: 0.1 + offset * 0.5,
        width: 0.72,
        height: 0.55,
      },
    });

    if (photo.caption.trim() && photo.transcription.trim()) {
      annotations.push({
        id: `fallback-${photo.id}-note`,
        photoId: photo.id,
        label: photo.transcription.trim().slice(0, 100),
        severity,
        sectionHeading: matchedSection?.heading ?? null,
        box: {
          x: 0.15 + offset,
          y: 0.62,
          width: 0.7,
          height: 0.28,
        },
      });
    }
  });

  if (photos[0] && job.notes.trim() && annotations.length < 2) {
    annotations.push({
      id: `fallback-${photos[0].id}-jobnotes`,
      photoId: photos[0].id,
      label: job.notes.trim().slice(0, 100),
      severity: content.sections[0]?.severity ?? "Info",
      sectionHeading: content.sections[0]?.heading ?? null,
      box: { x: 0.12, y: 0.12, width: 0.5, height: 0.35 },
    });
  }

  return annotations.slice(0, 24);
}

export function annotationsForPhoto(annotations: PhotoAnnotation[] | undefined, photoId: string) {
  return (annotations ?? []).filter((a) => a.photoId === photoId);
}

export function ensureReportAnnotations(
  content: ReportContent,
  job: Job,
  photos: Photo[],
  source: "openai" | "taxonomy_fallback"
): ReportContent {
  const existing = content.photo_annotations ?? [];
  if (existing.length > 0 || photos.length === 0) {
    return { ...content, photo_annotations: existing };
  }
  const fallback = buildFallbackAnnotations(job, photos, content);
  return {
    ...content,
    photo_annotations: fallback,
    inspector_notes:
      source === "openai"
        ? content.inspector_notes
        : content.inspector_notes ||
          "Photo highlights were auto-placed from captions and field notes (taxonomy fallback).",
  };
}
