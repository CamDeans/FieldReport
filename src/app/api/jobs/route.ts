import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  try {
    const body = await readJson<{
      customerName: string;
      customerEmail: string;
      address: string;
      jobType: string;
      notes: string;
    }>(request);
    const job = await session.repo.createJob(session.userId, body);
    return jsonOk(job);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create job");
  }
}
