import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requestPasswordReset } from "@/lib/services/password-reset";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email?: string }>(request);
    if (!body.email?.trim()) return jsonError("Email is required");
    const result = await requestPasswordReset(body.email);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not start password reset");
  }
}
