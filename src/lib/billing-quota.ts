import type { Profile } from "./types";

/** UTC YYYY-MM key used to reset monthly report counters. */
export function currentReportsMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * If the profile’s quota month rolled over, zero the counter.
 * Regenerating an existing job report never increments usage — only first generate per job does.
 */
export function applyMonthlyQuotaRollover(profile: Profile, date = new Date()): Profile {
  const key = currentReportsMonthKey(date);
  if (profile.reportsMonthKey === key) return profile;
  return {
    ...profile,
    reportsMonthKey: key,
    reportsUsedThisMonth: 0,
  };
}
