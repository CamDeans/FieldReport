import { jsonError, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { documentId } = await context.params;
  try {
    await session.repo.deleteDocument(session.userId, documentId);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not delete document");
  }
}
