import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import type { Job } from "@/lib/types";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  try {
    const patch = await readJson<Partial<Job>>(request);
    const job = await session.repo.updateJob(session.userId, id, patch);
    return jsonOk(job);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Update failed");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  try {
    await session.repo.deleteJob(session.userId, id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Delete failed");
  }
}
