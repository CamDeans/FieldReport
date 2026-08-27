import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import type { Photo } from "@/lib/types";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; photoId: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { photoId } = await context.params;
  try {
    const patch = await readJson<Partial<Photo>>(request);
    const photo = await session.repo.updatePhoto(session.userId, photoId, patch);
    return jsonOk(photo);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Update failed");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; photoId: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { photoId } = await context.params;
  try {
    await session.repo.deletePhoto(session.userId, photoId);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Delete failed");
  }
}
