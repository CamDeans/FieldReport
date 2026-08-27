import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { isOpenAiConfigured } from "@/lib/config";
import { requireSession } from "@/lib/repositories";
import { suggestReportScopeWithOpenAi } from "@/lib/services/ai-report";

export async function POST(request: Request) {
  if (!isOpenAiConfigured()) {
    return jsonError("OpenAI is not configured — type any custom report scope freely.", 503);
  }
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  try {
    const body = await readJson<{ notes?: string; tradeContext?: string }>(request);
    const suggestion = await suggestReportScopeWithOpenAi({
      notes: body.notes ?? "",
      tradeContext: body.tradeContext,
    });
    if (!suggestion) return jsonError("Could not suggest a scope", 502);
    return jsonOk(suggestion);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Suggest failed", 500);
  }
}
