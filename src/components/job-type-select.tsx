"use client";

import { useMemo, useState } from "react";
import type { Profile } from "@/lib/types";
import {
  defaultJobTypeForPreferences,
  getAllJobTypes,
  getIndustriesForSector,
  getJobTypeBlurb,
  getJobTypeLabel,
  getVisibleJobTypes,
  groupJobTypes,
  isCatalogJobType,
} from "@/lib/taxonomy";

interface JobTypeSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  profile: Profile | null;
  allowShowAll?: boolean;
  className?: string;
}

/**
 * Freeform-first report scope. Catalog suggestions are shortcuts only —
 * any trade description is accepted. Taxonomy is never a hard limit.
 */
export function JobTypeSelect({
  id = "jobType",
  value,
  onChange,
  profile,
  allowShowAll = true,
  className,
}: JobTypeSelectProps) {
  const [showCatalog, setShowCatalog] = useState(false);
  const preferences = useMemo(
    () => (profile ? { sectorIds: profile.sectorIds, industryIds: profile.industryIds } : null),
    [profile]
  );

  const suggestions = useMemo(() => {
    if (showCatalog) return getAllJobTypes();
    return getVisibleJobTypes(preferences);
  }, [preferences, showCatalog]);

  const groups = useMemo(() => groupJobTypes(suggestions), [suggestions]);
  const filteredCount = getVisibleJobTypes(preferences).length;
  const totalCount = getAllJobTypes().length;
  const catalogSelected = isCatalogJobType(value);

  return (
    <div className="space-y-2">
      <input
        id={id}
        list={`${id}-suggestions`}
        className={className ?? "w-full h-11 rounded-lg border border-border bg-white px-3 text-sm"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Hail damage roof assessment, commercial hood inspection…"
        data-testid="job-type-input"
        autoComplete="off"
      />
      <datalist id={`${id}-suggestions`}>
        {suggestions.map((jobType) => (
          <option key={jobType.id} value={jobType.id}>
            {jobType.label}
          </option>
        ))}
      </datalist>

      {allowShowAll && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="text-xs text-primary font-medium"
            onClick={() => setShowCatalog((v) => !v)}
            data-testid="job-type-show-all"
          >
            {showCatalog
              ? "Show suggested scopes for my trades"
              : `Browse catalog shortcuts (${totalCount})`}
          </button>
          {showCatalog && (
            <select
              className="h-9 rounded-lg border border-border bg-white px-2 text-xs max-w-full"
              value={catalogSelected ? value : ""}
              onChange={(e) => {
                if (e.target.value) onChange(e.target.value);
              }}
              data-testid="job-type-catalog"
              aria-label="Catalog report templates"
            >
              <option value="">Pick a catalog shortcut…</option>
              {groups.map((group) => (
                <optgroup key={group.industryId} label={`${group.sectorLabel} · ${group.industryLabel}`}>
                  {group.jobTypes.map((jobType) => (
                    <option key={jobType.id} value={jobType.id}>
                      {jobType.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {catalogSelected
          ? getJobTypeBlurb(value)
          : value.trim()
            ? `Custom scope “${getJobTypeLabel(value)}” — AI drafts the full report. Catalog templates are only a fallback if AI is offline.`
            : `Type any report scope. ${filteredCount} suggestions match your trades; OpenAI writes the report structure.`}
      </p>
    </div>
  );
}

export function defaultJobTypeForProfile(profile: Profile | null): string {
  if (!profile) return "general";
  return defaultJobTypeForPreferences({
    industryIds: profile.industryIds,
    defaultJobTypeId: profile.defaultJobTypeId,
  });
}

export { getIndustriesForSector };
