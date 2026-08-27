/**
 * CI-safe OpenAI path tests (mocked completion — no live API key required).
 * Run: npx tsx scripts/test-ai-report.ts
 */
import assert from "node:assert/strict";
import {
  evidenceLines,
  generateReportWithOpenAi,
  normalizeAiContent,
} from "../src/lib/services/ai-report";
import { parseRecipients } from "../src/lib/services/email-service";
import { applyMonthlyQuotaRollover, currentReportsMonthKey } from "../src/lib/billing-quota";
import { validateReportContent } from "../src/lib/report-engine";
import type { Job, JobDocument, Photo, Profile, ReportContent } from "../src/lib/types";

async function main() {
  const profile: Profile = {
    id: "u1",
    email: "a@b.co",
    fullName: "Ada Inspector",
    companyName: "Ada Co",
    phone: "",
    logoDataUrl: null,
    plan: "pro",
    reportsUsedThisMonth: 1,
    reportsMonthKey: currentReportsMonthKey(),
    createdAt: new Date().toISOString(),
    sectorIds: [],
    industryIds: [],
    defaultJobTypeId: null,
    onboardingCompletedAt: new Date().toISOString(),
  };

  const job: Job = {
    id: "j1",
    userId: "u1",
    customerName: "Pat Customer",
    customerEmail: "pat@example.com",
    address: "1 Main",
    jobType: "Hail damage roof assessment",
    status: "draft",
    notes: "Homeowner reported drip after storm.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sentAt: null,
  };

  const photos: Photo[] = [
    {
      id: "p1",
      jobId: "j1",
      dataUrl: "data:image/png;base64,aaa",
      caption: "North slope",
      transcription: "Active leak at chimney flashing.",
      createdAt: new Date().toISOString(),
    },
  ];

  const documents: JobDocument[] = [
    {
      id: "d1",
      jobId: "j1",
      fileName: "prior.pdf",
      mimeType: "application/pdf",
      dataUrl: "data:application/pdf;base64,aa",
      extractedText: "SECTION: Roof covering\nSECTION: Flashings\nChecklist: gutters",
      extractionSource: "text",
      createdAt: new Date().toISOString(),
    },
  ];

  function pass(name: string) {
    console.log(`PASS ${name}`);
  }

  {
    const lines = evidenceLines(job, photos, documents);
    assert.ok(lines.some((l) => l.includes("Active leak")));
    assert.ok(lines.some((l) => l.includes("Reference PDF: prior.pdf")));
    assert.ok(lines.some((l) => l.includes("Homeowner reported")));
    assert.ok(lines.some((l) => l.includes("photo id=p1") || l.includes("[Photo id=p1]")));
    pass("evidenceLines includes notes, transcription, PDF, photo id");
  }

  {
    const content = normalizeAiContent(
      {
        title: "Hail Report",
        overall_condition: "Poor",
        overall_condition_note: "Storm damage visible.",
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
      },
      job,
      profile,
      photos
    );
    const { passed } = validateReportContent(content);
    assert.equal(passed, true);
    assert.equal(content.overall_condition, "Poor");
    pass("normalizeAiContent validates");
  }

  {
    const previous: ReportContent = normalizeAiContent(
      {
        title: "Old title",
        overall_condition: "Fair",
        summary: "Prior draft.",
        sections: [
          { heading: "Roof covering", severity: "Info", body: "Prior body." },
          { heading: "Flashings", severity: "Info", body: "Prior flashing." },
          { heading: "Gutters", severity: "Info", body: "Prior gutters." },
        ],
        recommendations: [
          { priority: "Soon", item: "Watch flashings", detail: "Monitor." },
          { priority: "Maintenance", item: "Clean gutters", detail: "Seasonal." },
        ],
      },
      job,
      profile,
      photos
    );

    let sawUpdateHint = false;
    const content = await generateReportWithOpenAi(job, photos, profile, documents, previous, {
      complete: async (messages) => {
        const blob = JSON.stringify(messages);
        sawUpdateHint = blob.includes("UPDATE") || blob.includes("Previous report JSON");
        assert.ok(blob.includes("Active leak"));
        assert.ok(blob.includes("prior.pdf"));
        return JSON.stringify({
          title: "Updated Hail Report",
          overall_condition: "Poor",
          overall_condition_note: "Leak confirmed.",
          summary: "Updated after new voice note evidence with photo highlights for chimney flashing.",
          sections: [
            { heading: "Roof covering", severity: "Attention", body: "Granule loss." },
            { heading: "Flashings", severity: "Urgent", body: "Active leak at chimney flashing." },
            { heading: "Gutters", severity: "Advisory", body: "Debris." },
            { heading: "Attic", severity: "Info", body: "Dry from hatch." },
          ],
          recommendations: [
            { priority: "Immediate", item: "Seal chimney", detail: "Stop leak." },
            { priority: "Soon", item: "Repair north slope", detail: "Estimate." },
          ],
          inspector_notes: "Voice note incorporated.",
          disclaimer: "Visible only.",
          photo_annotations: [
            {
              photo_id: "p1",
              label: "Chimney flashing leak",
              severity: "Urgent",
              section_heading: "Flashings",
              x: 0.35,
              y: 0.2,
              width: 0.3,
              height: 0.25,
            },
          ],
        });
      },
    });
    assert.ok(content);
    assert.equal(sawUpdateHint, true);
    assert.equal(content!.title, "Updated Hail Report");
    assert.match(content!.sections[1].body, /Active leak/i);
    assert.equal(content!.photo_annotations?.length, 1);
    assert.equal(content!.photo_annotations![0].photoId, "p1");
    pass("mocked OpenAI incremental update path");
  }

  {
    const rolled = applyMonthlyQuotaRollover({
      ...profile,
      reportsMonthKey: "2020-01",
      reportsUsedThisMonth: 3,
    });
    assert.equal(rolled.reportsUsedThisMonth, 0);
    assert.equal(rolled.reportsMonthKey, currentReportsMonthKey());
    pass("monthly quota rollover");
  }

  {
    assert.deepEqual(parseRecipients("a@x.com, b@y.com; c@z.co"), ["a@x.com", "b@y.com", "c@z.co"]);
    pass("multi-recipient parse");
  }

  console.log("AI report path OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
