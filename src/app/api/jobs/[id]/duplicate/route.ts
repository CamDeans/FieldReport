import { jsonError, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  try {
    const job = await session.repo.duplicateJob(session.userId, id);
    return jsonOk(job);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Duplicate failed");
  }
}
