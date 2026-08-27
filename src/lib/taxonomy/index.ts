import {
  DEFAULT_DEMO_TRADE_PREFERENCES,
  LEGACY_JOB_TYPE_ALIASES,
  TAXONOMY_INDUSTRIES,
  TAXONOMY_JOB_TYPES,
  TAXONOMY_SECTORS,
} from "./data";
import type { JobTypeGroup, TaxonomyIndustry, TaxonomyJobType, TaxonomySector, TradePreferences } from "./types";

const sectorById = new Map(TAXONOMY_SECTORS.map((s) => [s.id, s]));
const industryById = new Map(TAXONOMY_INDUSTRIES.map((i) => [i.id, i]));
const jobTypeById = new Map(TAXONOMY_JOB_TYPES.map((j) => [j.id, j]));

export function getSectors(): TaxonomySector[] {
  return TAXONOMY_SECTORS;
}

export function getSector(id: string): TaxonomySector | undefined {
  return sectorById.get(id);
}

export function getIndustries(): TaxonomyIndustry[] {
  return TAXONOMY_INDUSTRIES;
}

export function getIndustriesForSector(sectorId: string): TaxonomyIndustry[] {
  return TAXONOMY_INDUSTRIES.filter((i) => i.sectorId === sectorId);
}

export function getIndustry(id: string): TaxonomyIndustry | undefined {
  return industryById.get(id);
}

export function getAllJobTypes(): TaxonomyJobType[] {
  return TAXONOMY_JOB_TYPES;
}

/** Map legacy catalog aliases; freeform scopes pass through unchanged. */
export function resolveJobTypeId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return "general";
  const normalized = LEGACY_JOB_TYPE_ALIASES[trimmed] ?? trimmed;
  if (jobTypeById.has(normalized)) return normalized;
  return trimmed;
}

/** Taxonomy template for fallback report engine only. Freeform → general shell. */
export function getJobType(id: string): TaxonomyJobType {
  const resolved = resolveJobTypeId(id);
  return jobTypeById.get(resolved) ?? jobTypeById.get("general")!;
}

export function isCatalogJobType(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) return false;
  const normalized = LEGACY_JOB_TYPE_ALIASES[trimmed] ?? trimmed;
  return jobTypeById.has(normalized);
}

/** Any non-empty scope is valid — catalog ids OR freeform labels. */
export function isValidJobType(id: string): boolean {
  return typeof id === "string" && id.trim().length > 0;
}

function humanizeScope(id: string): string {
  const trimmed = id.trim();
  if (/\s/.test(trimmed) || /[A-Z]/.test(trimmed)) return trimmed;
  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getJobTypeLabel(id: string): string {
  const resolved = resolveJobTypeId(id);
  if (jobTypeById.has(resolved)) return jobTypeById.get(resolved)!.label;
  return humanizeScope(id);
}

export function getJobTypeBlurb(id: string): string {
  if (isCatalogJobType(id)) return getJobType(id).blurb;
  return "Custom report scope — OpenAI drafts sections for this job; taxonomy is only used if AI is unavailable.";
}

export function getReportSections(id: string): string[] {
  return getJobType(id).sections;
}

export function getUniversalJobTypes(): TaxonomyJobType[] {
  return TAXONOMY_JOB_TYPES.filter((j) => j.universal);
}

export function getFeaturedJobTypes(): TaxonomyJobType[] {
  return TAXONOMY_JOB_TYPES.filter((j) => j.featured);
}

export function getJobTypesForIndustries(industryIds: string[]): TaxonomyJobType[] {
  const set = new Set(industryIds);
  return TAXONOMY_JOB_TYPES.filter((j) => j.universal || set.has(j.industryId));
}

export function getJobTypesForSectors(sectorIds: string[]): TaxonomyJobType[] {
  const industries = TAXONOMY_INDUSTRIES.filter((i) => sectorIds.includes(i.sectorId)).map((i) => i.id);
  return getJobTypesForIndustries(industries);
}

export function getVisibleJobTypes(preferences: Pick<TradePreferences, "sectorIds" | "industryIds"> | null | undefined): TaxonomyJobType[] {
  if (!preferences?.industryIds?.length && !preferences?.sectorIds?.length) {
    return getUniversalJobTypes();
  }
  if (preferences.industryIds.length) {
    return getJobTypesForIndustries(preferences.industryIds);
  }
  return getJobTypesForSectors(preferences.sectorIds);
}

export function groupJobTypes(jobTypes: TaxonomyJobType[]): JobTypeGroup[] {
  const groups = new Map<string, JobTypeGroup>();
  for (const jobType of jobTypes) {
    const industry = getIndustry(jobType.industryId);
    const sector = industry ? getSector(industry.sectorId) : undefined;
    const key = jobType.industryId;
    const existing = groups.get(key);
    if (existing) {
      existing.jobTypes.push(jobType);
      continue;
    }
    groups.set(key, {
      industryId: key,
      industryLabel: industry?.label ?? "Other",
      sectorLabel: sector?.label ?? "General",
      jobTypes: [jobType],
    });
  }
  return [...groups.values()].sort((a, b) => a.sectorLabel.localeCompare(b.sectorLabel) || a.industryLabel.localeCompare(b.industryLabel));
}

export function getAudienceTags(): string[] {
  const tags = new Set<string>();
  for (const industry of TAXONOMY_INDUSTRIES) {
    for (const tag of industry.audienceTags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function getLandingSectors(): Array<{ sector: TaxonomySector; industries: TaxonomyIndustry[]; sampleJobTypes: TaxonomyJobType[] }> {
  return TAXONOMY_SECTORS.map((sector) => {
    const industries = getIndustriesForSector(sector.id);
    const sampleJobTypes = TAXONOMY_JOB_TYPES.filter(
      (j) => industries.some((i) => i.id === j.industryId) && (j.featured || j.universal)
    ).slice(0, 4);
    return { sector, industries, sampleJobTypes };
  });
}

export function defaultJobTypeForPreferences(preferences: Pick<TradePreferences, "industryIds" | "defaultJobTypeId">): string {
  if (preferences.defaultJobTypeId && isValidJobType(preferences.defaultJobTypeId)) {
    const visible = getJobTypesForIndustries(preferences.industryIds);
    if (visible.some((j) => j.id === preferences.defaultJobTypeId)) {
      return preferences.defaultJobTypeId;
    }
  }
  const visible = getJobTypesForIndustries(preferences.industryIds);
  const featured = visible.find((j) => j.featured && !j.universal);
  return featured?.id ?? visible.find((j) => !j.universal)?.id ?? "general";
}

export function normalizeTradePreferences(
  input: Partial<TradePreferences> | null | undefined,
  options?: { demoDefaults?: boolean }
): TradePreferences {
  const demoDefaults = options?.demoDefaults ?? false;
  const sectorIds = input?.sectorIds?.length
    ? input.sectorIds.filter((id) => sectorById.has(id))
    : demoDefaults
      ? [...DEFAULT_DEMO_TRADE_PREFERENCES.sectorIds]
      : [];
  const industryIds = input?.industryIds?.length
    ? input.industryIds.filter((id) => industryById.has(id))
    : demoDefaults
      ? [...DEFAULT_DEMO_TRADE_PREFERENCES.industryIds]
      : sectorIds.length
        ? TAXONOMY_INDUSTRIES.filter((i) => sectorIds.includes(i.sectorId)).map((i) => i.id)
        : [];
  const defaultJobTypeId = input?.defaultJobTypeId
    ? resolveJobTypeId(input.defaultJobTypeId)
    : demoDefaults
      ? DEFAULT_DEMO_TRADE_PREFERENCES.defaultJobTypeId
      : industryIds.length
        ? defaultJobTypeForPreferences({ industryIds, defaultJobTypeId: null })
        : "general";
  return {
    sectorIds,
    industryIds,
    defaultJobTypeId,
    onboardingCompletedAt: input?.onboardingCompletedAt ?? (demoDefaults ? new Date(0).toISOString() : null),
  };
}

export function countJobTypes(): number {
  return TAXONOMY_JOB_TYPES.length;
}

export function countIndustries(): number {
  return TAXONOMY_INDUSTRIES.length;
}

export function countSectors(): number {
  return TAXONOMY_SECTORS.length;
}

export * from "./types";
export {
  DEFAULT_DEMO_TRADE_PREFERENCES,
  LEGACY_JOB_TYPE_ALIASES,
  TAXONOMY_INDUSTRIES,
  TAXONOMY_JOB_TYPES,
  TAXONOMY_SECTORS,
} from "./data";
