import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { getAppMode } from "@/lib/config";
import { completePasswordReset } from "@/lib/services/password-reset";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ token?: string; password?: string; liveClient?: boolean }>(request);
    if (!body.password) return jsonError("Password is required");

    // Live recovery is completed in the browser with the Supabase session from the email link.
    if (getAppMode() === "live" && body.liveClient) {
      return jsonOk({ mode: "live" as const, updated: true, clientHandled: true });
    }

    const result = await completePasswordReset({ token: body.token, password: body.password });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update password");
  }
}
