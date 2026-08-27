import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  try {
    const body = await readJson<{ dataUrl: string }>(request);
    const photo = await session.repo.addPhoto(session.userId, id, body.dataUrl);
    return jsonOk(photo);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not add photo");
  }
}
