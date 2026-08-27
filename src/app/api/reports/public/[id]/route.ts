import { jsonError, jsonOk } from "@/lib/api/http";
import { getRepository } from "@/lib/repositories";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const repo = getRepository();
  const snapshot = await repo.getPublicSnapshot(id);
  if (!snapshot) return jsonError("Report not found", 404);
  return jsonOk(snapshot);
}
