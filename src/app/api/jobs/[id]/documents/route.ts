import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import { ensurePdfText } from "@/lib/services/pdf-extract";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  try {
    const body = await readJson<{ dataUrl: string; fileName?: string; mimeType?: string }>(request);
    if (!body.dataUrl) return jsonError("Missing PDF data");
    if (body.mimeType && !body.mimeType.includes("pdf") && !body.dataUrl.includes("application/pdf")) {
      return jsonError("Only PDF files are supported");
    }
    // ~8MB decoded upper bound keeps demo/live uploads workable without blocking large text reports.
    const approxBytes = Math.ceil((body.dataUrl.length * 3) / 4);
    if (approxBytes > 8_000_000) {
      return jsonError("PDF is too large (max about 8 MB). Upload a smaller text PDF or split the document.");
    }
    const { text: extractedText, source: extractionSource } = await ensurePdfText(body.dataUrl);
    const document = await session.repo.addDocument(session.userId, id, {
      fileName: body.fileName || "reference.pdf",
      mimeType: body.mimeType || "application/pdf",
      dataUrl: body.dataUrl,
      extractedText,
      extractionSource,
    });
    return jsonOk(document);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not upload PDF");
  }
}
