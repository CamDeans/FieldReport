import { jsonError, jsonOk } from "@/lib/api/http";
import { getRepository } from "@/lib/repositories";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await getRepository().markReportRead(id);
    return jsonOk({ read: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not mark read");
  }
}
