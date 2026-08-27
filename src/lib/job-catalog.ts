import type { JobType } from "./types";
import {
  getAllJobTypes,
  getAudienceTags,
  getJobType,
  getJobTypeBlurb,
  getJobTypeLabel,
  getReportSections,
  getVisibleJobTypes,
  isValidJobType,
  resolveJobTypeId,
} from "./taxonomy";

/** @deprecated Prefer getJobTypeLabel() — built dynamically from taxonomy */
export function jobTypeLabelsRecord(): Record<string, string> {
  return Object.fromEntries(getVisibleJobTypes(null).map((j) => [j.id, j.label]));
}

export function getJobTypeLabelsForProfile(preferences: Pick<TradePreferences, "sectorIds" | "industryIds"> | null): Record<string, string> {
  return Object.fromEntries(getVisibleJobTypes(preferences).map((j) => [j.id, j.label]));
}

export function labelForJobType(id: string): string {
  return getJobTypeLabel(id);
}

export function blurbForJobType(id: string): string {
  return getJobTypeBlurb(id);
}

export function sectionsForJobType(id: string): string[] {
  return getReportSections(id);
}

export function isJobType(value: string): value is JobType {
  return isValidJobType(value);
}

export { resolveJobTypeId };

export { getAudienceTags, getFeaturedJobTypes, getLandingSectors, getSectors, getVisibleJobTypes } from "./taxonomy";
import type { TradePreferences } from "./taxonomy";

export const CONDITION_CONFIG: Record<string, { label: string; className: string; bar: string }> = {
  Good: { label: "Good", className: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
  Fair: { label: "Fair", className: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  Poor: { label: "Poor", className: "bg-orange-100 text-orange-800", bar: "bg-orange-500" },
  Critical: { label: "Critical", className: "bg-red-100 text-red-800", bar: "bg-red-600" },
};

export const SEVERITY_CONFIG: Record<string, { className: string; label: string }> = {
  Info: { className: "bg-slate-100 text-slate-700", label: "Info" },
  Advisory: { className: "bg-sky-100 text-sky-800", label: "Advisory" },
  Attention: { className: "bg-amber-100 text-amber-800", label: "Attention" },
  Urgent: { className: "bg-red-100 text-red-800", label: "Urgent" },
};

export const PRIORITY_CONFIG: Record<string, { className: string; label: string }> = {
  Immediate: { className: "bg-red-600 text-white", label: "Immediate" },
  Soon: { className: "bg-orange-500 text-white", label: "Soon" },
  Recommended: { className: "bg-blue-600 text-white", label: "Recommended" },
  Maintenance: { className: "bg-slate-500 text-white", label: "Maintenance" },
};

export const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  draft: { className: "bg-slate-100 text-slate-700", label: "Draft" },
  generating: { className: "bg-blue-100 text-blue-800", label: "Generating" },
  ready: { className: "bg-emerald-100 text-emerald-800", label: "Ready" },
  sent: { className: "bg-violet-100 text-violet-800", label: "Sent" },
};

/** Backward-compatible accessors for legacy imports */
export const JOB_TYPE_LABELS = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    return getJobType(String(prop)).label;
  },
  ownKeys() {
    return getAllJobTypes().map((j) => j.id);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (isValidJobType(String(prop))) {
      return { enumerable: true, configurable: true, value: getJobTypeLabel(String(prop)) };
    }
    return undefined;
  },
});

export const JOB_TYPE_BLURBS = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    return getJobType(String(prop)).blurb;
  },
});

export const JOB_TYPE_SECTIONS = new Proxy({} as Record<string, string[]>, {
  get(_target, prop: string) {
    return getReportSections(String(prop));
  },
});

export const TARGET_CLIENTS = getAudienceTags();
