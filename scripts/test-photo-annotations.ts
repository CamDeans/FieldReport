/**
 * Photo annotation normalize / fallback tests.
 * Run: npx tsx scripts/test-photo-annotations.ts
 */
import assert from "node:assert/strict";
import {
  buildFallbackAnnotations,
  ensureReportAnnotations,
  normalizePhotoAnnotations,
} from "../src/lib/services/photo-annotations";
import { normalizeAiContent } from "../src/lib/services/ai-report";
import type { Job, Photo, Profile, ReportContent } from "../src/lib/types";

const profile: Profile = {
  id: "u1",
  email: "a@b.co",
  fullName: "Ada",
  companyName: "Ada Co",
  phone: "",
  logoDataUrl: null,
  plan: "pro",
  reportsUsedThisMonth: 0,
  reportsMonthKey: "2026-08",
  createdAt: new Date().toISOString(),
  sectorIds: [],
  industryIds: [],
  defaultJobTypeId: null,
  onboardingCompletedAt: new Date().toISOString(),
};

const job: Job = {
  id: "j1",
  userId: "u1",
  customerName: "Pat",
  customerEmail: "pat@x.com",
  address: "1 Main",
  jobType: "Hail damage roof assessment",
  status: "draft",
  notes: "Drip after storm near chimney.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sentAt: null,
};

const photos: Photo[] = [
  {
    id: "photo-north",
    jobId: "j1",
    dataUrl: "data:image/png;base64,aaa",
    caption: "North slope",
    transcription: "Active leak at chimney flashing.",
    createdAt: new Date().toISOString(),
  },
];

function pass(name: string) {
  console.log(`PASS ${name}`);
}

{
  const anns = normalizePhotoAnnotations(
    [
      {
        photo_id: "photo-north",
        label: "Chimney leak",
        severity: "Urgent",
        section_heading: "Flashings",
        x: 0.2,
        y: 0.3,
        width: 0.25,
        height: 0.2,
      },
      { photo_id: "missing", label: "skip", x: 0, y: 0, width: 1, height: 1 },
      { photo_id: "photo-north", label: "", x: 0, y: 0, width: 1, height: 1 },
    ],
    photos,
    [{ heading: "Flashings", severity: "Urgent", body: "Leak at chimney flashing was observed on site during the walk." }]
  );
  assert.equal(anns.length, 1);
  assert.equal(anns[0].photoId, "photo-north");
  assert.equal(anns[0].severity, "Urgent");
  assert.equal(anns[0].sectionHeading, "Flashings");
  assert.ok(anns[0].box.width <= 1);
  pass("normalizePhotoAnnotations clamps + filters");
}

{
  const rawInput = {
    title: "Hail Report",
    overall_condition: "Poor",
    overall_condition_note: "Storm damage visible across the inspected slope.",
    summary:
      "Inspection complete with documented leaks on the north slope and chimney flashing after the recent hail event.",
    sections: [
      { heading: "Roof covering", severity: "Attention", body: "Granule loss was visible across the north slope after hail." },
      { heading: "Flashings", severity: "Urgent", body: "Active leak observed at the chimney flashing during the walk." },
      { heading: "Gutters", severity: "Advisory", body: "Debris is present in the north gutter run near the downspout." },
      { heading: "Attic", severity: "Info", body: "No staining was observed from the attic hatch at the time of visit." },
    ],
    recommendations: [
      { priority: "Immediate", item: "Seal chimney flashing", detail: "Stop active intrusion before the next rain event." },
      { priority: "Soon", item: "Estimate shingle repair", detail: "Provide a written north slope repair estimate." },
    ],
    inspector_notes: "Customer on site.",
    disclaimer: "This report reflects conditions reasonably visible at the time of inspection only.",
    photo_annotations: [
      {
        photo_id: "photo-north",
        label: "Active leak",
        severity: "Urgent",
        section_heading: "Flashings",
        x: -0.2,
        y: 1.5,
        width: 2,
        height: 0.01,
      },
    ],
  };
  const content = normalizeAiContent(rawInput as Parameters<typeof normalizeAiContent>[0], job, profile, photos);
  assert.equal(content.photo_annotations?.length, 1);
  const box = content.photo_annotations![0].box;
  assert.ok(box.x >= 0 && box.x <= 1);
  assert.ok(box.y >= 0 && box.y <= 1);
  assert.ok(box.width >= 0.04);
  assert.ok(box.height >= 0.04);
  pass("normalizeAiContent includes clamped photo_annotations");
}

{
  const base: ReportContent = {
    title: "Taxonomy report",
    overall_condition: "Poor",
    overall_condition_note: "Poor overall from notes.",
    summary: "A".repeat(90),
    sections: [
      { heading: "Flashings", severity: "Urgent", body: "B".repeat(50) },
      { heading: "Roof covering", severity: "Attention", body: "C".repeat(50) },
      { heading: "Gutters", severity: "Advisory", body: "D".repeat(50) },
      { heading: "Attic", severity: "Info", body: "E".repeat(50) },
    ],
    recommendations: [
      { priority: "Soon", item: "Fix", detail: "Detail here." },
      { priority: "Maintenance", item: "Watch", detail: "Detail here." },
    ],
    inspector_notes: "n",
    disclaimer: "D".repeat(50),
  };
  const withFallback = ensureReportAnnotations(base, job, photos, "taxonomy_fallback");
  assert.ok((withFallback.photo_annotations?.length ?? 0) >= 1);
  assert.equal(withFallback.photo_annotations![0].photoId, "photo-north");
  pass("ensureReportAnnotations adds fallback overlays");

  const already = ensureReportAnnotations(
    { ...base, photo_annotations: buildFallbackAnnotations(job, photos, base) },
    job,
    photos,
    "openai"
  );
  assert.ok((already.photo_annotations?.length ?? 0) >= 1);
  pass("ensureReportAnnotations keeps existing overlays");
}

console.log("Photo annotations OK");
