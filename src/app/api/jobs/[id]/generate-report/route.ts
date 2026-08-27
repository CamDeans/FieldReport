import { jsonError, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import { generateAndSaveReport } from "@/lib/services/report-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  try {
    const result = await generateAndSaveReport(session.userId, id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not generate report");
  }
}
