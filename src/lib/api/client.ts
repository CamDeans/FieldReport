import type { AppMode } from "../config";
import type { AppState, Job, JobDocument, Photo, Plan, Profile, Report, Session } from "../types";

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!body.ok) throw new Error(body.error || "Request failed");
  return body.data;
}

export const api = {
  getConfig: () =>
    request<{
      mode: AppMode;
      openai?: boolean;
      stripe?: boolean;
      resend?: boolean;
      revenuecat?: boolean;
      reportEngine?: "openai" | "taxonomy_fallback";
    }>("/api/config"),
  getSession: () => request<{ session: Session | null; mode: AppMode }>("/api/auth/session"),
  login: (email: string, password: string) =>
    request<{ userId: string; email: string; mode: AppMode }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (input: { email: string; password: string; fullName: string; companyName: string }) =>
    request<{ userId: string; email: string; mode: AppMode }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () => request<{ mode: AppMode }>("/api/auth/session", { method: "POST" }),
  getWorkspace: () => request<AppState>("/api/workspace"),
  updateProfile: (patch: Partial<Profile>) =>
    request<Profile>("/api/profile", { method: "PATCH", body: JSON.stringify(patch) }),
  createJob: (input: {
    customerName: string;
    customerEmail: string;
    address: string;
    jobType: string;
    notes: string;
  }) => request<Job>("/api/jobs", { method: "POST", body: JSON.stringify(input) }),
  updateJob: (id: string, patch: Partial<Job>) =>
    request<Job>(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteJob: (id: string) => request<{ deleted: boolean }>(`/api/jobs/${id}`, { method: "DELETE" }),
  duplicateJob: (id: string) => request<Job>(`/api/jobs/${id}/duplicate`, { method: "POST" }),
  addPhoto: (jobId: string, dataUrl: string) =>
    request<Photo>(`/api/jobs/${jobId}/photos`, { method: "POST", body: JSON.stringify({ dataUrl }) }),
  updatePhoto: (jobId: string, photoId: string, patch: Partial<Photo>) =>
    request<Photo>(`/api/jobs/${jobId}/photos/${photoId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deletePhoto: (jobId: string, photoId: string) =>
    request<{ deleted: boolean }>(`/api/jobs/${jobId}/photos/${photoId}`, { method: "DELETE" }),
  addDocument: (jobId: string, input: { dataUrl: string; fileName: string; mimeType?: string }) =>
    request<JobDocument>(`/api/jobs/${jobId}/documents`, { method: "POST", body: JSON.stringify(input) }),
  deleteDocument: (jobId: string, documentId: string) =>
    request<{ deleted: boolean }>(`/api/jobs/${jobId}/documents/${documentId}`, { method: "DELETE" }),
  generateReport: (jobId: string) =>
    request<{ report: Report; job: Job; profile: Profile }>(`/api/jobs/${jobId}/generate-report`, { method: "POST" }),
  sendReport: (jobId: string, payload?: { to?: string; subject?: string; message?: string }) =>
    request<{ job: Job; report: Report; email: { queued: boolean; mode: AppMode; to?: string; subject?: string } }>(
      `/api/jobs/${jobId}/send-report`,
      { method: "POST", body: JSON.stringify(payload ?? {}) }
    ),
  markReportRead: (reportId: string) => request<{ read: boolean }>(`/api/reports/${reportId}/read`, { method: "POST" }),
  getPublicReport: (reportId: string) =>
    request<{ report: Report; job: Job; profile: Profile }>(`/api/reports/public/${reportId}`),
  checkout: (plan: Plan) =>
    request<{ url: string; mode: AppMode }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ plan }) }),
  syncRevenueCat: (input: { entitlements: string[]; appUserId?: string }) =>
    request<{ profile: Profile; plan: Plan }>("/api/billing/revenuecat/sync", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  redeemPromo: (code: string) =>
    request<{ profile: Profile; plan: Plan; code: string }>("/api/billing/promo", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  resetDemo: () => request<AppState>("/api/demo/reset", { method: "POST" }),
  suggestScope: (input: { notes: string; tradeContext?: string }) =>
    request<{ scope: string; rationale: string }>("/api/jobs/suggest-scope", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
