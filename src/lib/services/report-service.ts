import { generateReportContent } from "../report-engine";
import { generateReportWithOpenAi } from "./ai-report";
import { ensureReportAnnotations } from "./photo-annotations";
import type { ReportContent } from "../types";
import { getRepository } from "../repositories";
import type { FieldReportRepository } from "../repositories/types";

/**
 * AI-first report build. OpenAI drafts the full report (structure + prose + vision + PDF alignment
 * + photo highlight overlays). Taxonomy rule engine runs only as fail-safe when OpenAI is unset or fails.
 *
 * Evidence channels (all optional except ≥1 photo OR ≥1 PDF):
 * - job.notes (typed trade context + notes attached when no photo exists)
 * - photo captions + transcriptions (voice/typed field notes)
 * - PDF extractedText (reference structure/tone — not mutated by voice notes; OCR used when text empty)
 * - photo pixels via vision (also rendered in the customer report with colored annotation boxes)
 */
export async function buildReportForJob(
  repo: FieldReportRepository,
  userId: string,
  jobId: string
): Promise<{ content: ReportContent; source: "openai" | "taxonomy_fallback" }> {
  const workspace = await repo.getWorkspace(userId);
  const profile = workspace.profiles[0];
  const job = workspace.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("Job not found");
  const photos = workspace.photos.filter((p) => p.jobId === jobId);
  const documents = (workspace.documents ?? []).filter((d) => d.jobId === jobId);
  if (!photos.length && !documents.length) {
    throw new Error("Add at least one photo or PDF before generating a report.");
  }

  const previous = workspace.reports.find((r) => r.jobId === jobId)?.content ?? null;
  const ai = await generateReportWithOpenAi(job, photos, profile, documents, previous);
  if (ai) {
    return {
      content: ensureReportAnnotations(ai, job, photos, "openai"),
      source: "openai",
    };
  }

  const fallback = generateReportContent(job, photos, profile, documents);
  return {
    content: ensureReportAnnotations(fallback, job, photos, "taxonomy_fallback"),
    source: "taxonomy_fallback",
  };
}

export async function generateAndSaveReport(userId: string, jobId: string) {
  const repo = getRepository();
  const { content } = await buildReportForJob(repo, userId, jobId);
  return repo.generateReport(userId, jobId, content);
}
