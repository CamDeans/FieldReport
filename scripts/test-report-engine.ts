import { generateReportContent, validateReportContent } from "../src/lib/report-engine";
import { getAllJobTypes } from "../src/lib/taxonomy";
import { createDemoState } from "../src/lib/demo-data";
import type { Job, Photo } from "../src/lib/types";

const state = createDemoState();
const profile = state.profiles[0];
const jobTypes = getAllJobTypes().map((j) => j.id);

let failed = 0;

function run(label: string, job: Job, photos: Photo[]) {
  const content = generateReportContent(job, photos, profile);
  const result = validateReportContent(content);
  console.log(`\n${label}`);
  for (const check of result.checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.name}`);
    if (!check.passed) failed += 1;
  }
  if (!result.passed) failed += 1;
  console.log(`Generated: ${content.title} (${content.overall_condition})`);
}

const roof = state.jobs.find((j) => j.jobType === "roofing") ?? state.jobs[0];
run("Demo roofing job", roof, state.photos.filter((p) => p.jobId === roof.id));

for (const jobType of jobTypes) {
  const job: Job = {
    ...roof,
    id: `job_test_${jobType}`,
    jobType,
    notes: `Inspection notes for ${jobType.replaceAll("_", " ")} with cracked flashing, weak airflow, and moisture at the sill.`,
  };
  const photos: Photo[] = [
    {
      id: `photo_test_${jobType}`,
      jobId: job.id,
      dataUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      caption: "Visible wear at the inspected assembly",
      transcription: "Recommend repair soon. Monitor moisture and safety hardware.",
      createdAt: job.createdAt,
    },
  ];
  run(`Template ${jobType}`, job, photos);
}

if (failed > 0) {
  console.error(`Report engine failed ${failed} checks`);
  process.exit(1);
}
console.log("\nReport engine OK for all job types");
