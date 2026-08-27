import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import type { Profile } from "@/lib/types";

const ALLOWED_PROFILE_KEYS = new Set([
  "fullName",
  "companyName",
  "phone",
  "logoDataUrl",
  "sectorIds",
  "industryIds",
  "defaultJobTypeId",
  "onboardingCompletedAt",
]);

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  try {
    const raw = await readJson<Partial<Profile>>(request);
    const patch = Object.fromEntries(
      Object.entries(raw).filter(([key]) => ALLOWED_PROFILE_KEYS.has(key))
    ) as Partial<Profile>;
    const profile = await session.repo.updateProfile(session.userId, patch);
    return jsonOk(profile);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Update failed");
  }
}
