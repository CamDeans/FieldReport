"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api/client";
import type { AppMode } from "./config";
import type { AppState, Job, JobDocument, JobType, Photo, Plan, Profile, Report, Session } from "./types";

const emptyState = (): AppState => ({ profiles: [], jobs: [], photos: [], documents: [], reports: [] });

interface StoreValue {
  hydrated: boolean;
  ready: boolean;
  appMode: AppMode;
  session: Session | null;
  state: AppState;
  profile: Profile | null;
  jobs: Job[];
  refreshWorkspace: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (input: { email: string; password: string; fullName: string; companyName: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  addJob: (input: { customerName: string; customerEmail: string; address: string; jobType: JobType; notes: string }) => Promise<Job>;
  updateJob: (id: string, patch: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  duplicateJob: (id: string) => Promise<Job | null>;
  addPhoto: (jobId: string, dataUrl: string) => Promise<Photo>;
  updatePhoto: (id: string, patch: Partial<Photo>) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  addDocument: (jobId: string, file: { dataUrl: string; fileName: string; mimeType?: string }) => Promise<JobDocument>;
  deleteDocument: (id: string) => Promise<void>;
  generateReport: (jobId: string) => Promise<{ ok: boolean; error?: string; report?: Report }>;
  sendReport: (
    jobId: string,
    options?: { to?: string; subject?: string; message?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  markRead: (reportId: string) => Promise<void>;
  changePlan: (plan: Plan) => Promise<{ url?: string }>;
  resetDemo: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("demo");
  const [state, setState] = useState<AppState>(emptyState());
  const [session, setSession] = useState<Session | null>(null);

  const refreshWorkspace = useCallback(async () => {
    const workspace = await api.getWorkspace();
    setState(workspace);
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        const config = await api.getConfig();
        setAppMode(config.mode);
        const { session: activeSession, mode } = await api.getSession();
        setAppMode(mode);
        if (activeSession) {
          setSession(activeSession);
          const workspace = await api.getWorkspace();
          setState(workspace);
        }
      } catch {
        setState(emptyState());
        setSession(null);
      } finally {
        setHydrated(true);
      }
    }
    boot();
  }, []);

  const profile = state.profiles[0] ?? null;
  const jobs = useMemo(
    () => [...state.jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.jobs]
  );

  const mergeWorkspace = useCallback((partial: Partial<AppState>) => {
    setState((prev) => ({
      profiles: partial.profiles ?? prev.profiles,
      jobs: partial.jobs ?? prev.jobs,
      photos: partial.photos ?? prev.photos,
      documents: partial.documents ?? prev.documents ?? [],
      reports: partial.reports ?? prev.reports,
    }));
  }, []);

  const value: StoreValue = {
    hydrated,
    ready: hydrated,
    appMode,
    session,
    state,
    profile,
    jobs,
    refreshWorkspace,
    login: async (email, password) => {
      try {
        const result = await api.login(email, password);
        setAppMode(result.mode);
        setSession({ userId: result.userId, email: result.email });
        await refreshWorkspace();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Login failed" };
      }
    },
    signup: async (input) => {
      try {
        const result = await api.signup(input);
        setAppMode(result.mode);
        setSession({ userId: result.userId, email: result.email });
        await refreshWorkspace();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Signup failed" };
      }
    },
    logout: async () => {
      await api.logout();
      setSession(null);
      setState(emptyState());
    },
    signOut: async () => {
      await api.logout();
      setSession(null);
      setState(emptyState());
    },
    updateProfile: async (patch) => {
      const updated = await api.updateProfile(patch);
      setState((prev) => ({ ...prev, profiles: [updated] }));
    },
    addJob: async (input) => {
      const job = await api.createJob(input);
      setState((prev) => ({ ...prev, jobs: [job, ...prev.jobs] }));
      return job;
    },
    updateJob: async (id, patch) => {
      const job = await api.updateJob(id, patch);
      setState((prev) => ({ ...prev, jobs: prev.jobs.map((j) => (j.id === id ? job : j)) }));
    },
    deleteJob: async (id) => {
      await api.deleteJob(id);
      setState((prev) => ({
        ...prev,
        jobs: prev.jobs.filter((j) => j.id !== id),
        photos: prev.photos.filter((p) => p.jobId !== id),
        reports: prev.reports.filter((r) => r.jobId !== id),
      }));
    },
    duplicateJob: async (id) => {
      try {
        const copy = await api.duplicateJob(id);
        await refreshWorkspace();
        return copy;
      } catch {
        return null;
      }
    },
    addPhoto: async (jobId, dataUrl) => {
      const photo = await api.addPhoto(jobId, dataUrl);
      setState((prev) => ({ ...prev, photos: [...prev.photos, photo] }));
      return photo;
    },
    updatePhoto: async (id, patch) => {
      const photo = state.photos.find((p) => p.id === id);
      if (!photo) return;
      const updated = await api.updatePhoto(photo.jobId, id, patch);
      setState((prev) => ({ ...prev, photos: prev.photos.map((p) => (p.id === id ? updated : p)) }));
    },
    deletePhoto: async (id) => {
      const photo = state.photos.find((p) => p.id === id);
      if (!photo) return;
      await api.deletePhoto(photo.jobId, id);
      setState((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }));
    },
    addDocument: async (jobId, file) => {
      const document = await api.addDocument(jobId, file);
      setState((prev) => ({
        ...prev,
        documents: [...(prev.documents ?? []), document],
      }));
      return document;
    },
    deleteDocument: async (id) => {
      const document = (state.documents ?? []).find((d) => d.id === id);
      if (!document) return;
      await api.deleteDocument(document.jobId, id);
      setState((prev) => ({
        ...prev,
        documents: (prev.documents ?? []).filter((d) => d.id !== id),
      }));
    },
    generateReport: async (jobId) => {
      try {
        const result = await api.generateReport(jobId);
        setState((prev) => ({
          ...prev,
          profiles: [result.profile],
          jobs: prev.jobs.map((j) => (j.id === jobId ? result.job : j)),
          reports: [result.report, ...prev.reports.filter((r) => r.jobId !== jobId)],
        }));
        return { ok: true, report: result.report };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Could not generate report" };
      }
    },
    sendReport: async (jobId, options) => {
      try {
        const result = await api.sendReport(jobId, options);
        setState((prev) => ({
          ...prev,
          jobs: prev.jobs.map((j) => (j.id === jobId ? result.job : j)),
          reports: prev.reports.map((r) => (r.jobId === jobId ? result.report : r)),
        }));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Could not send report" };
      }
    },
    markRead: async (reportId) => {
      await api.markReportRead(reportId);
      setState((prev) => ({
        ...prev,
        reports: prev.reports.map((r) => (r.id === reportId ? { ...r, readAt: new Date().toISOString() } : r)),
      }));
    },
    changePlan: async (plan) => {
      const checkout = await api.checkout(plan);
      if (checkout.url.startsWith("http") || checkout.url.startsWith("/")) {
        if (checkout.mode === "demo") {
          await refreshWorkspace();
          return { url: checkout.url };
        }
        window.location.href = checkout.url;
      }
      return { url: checkout.url };
    },
    resetDemo: async () => {
      const workspace = await api.resetDemo();
      mergeWorkspace(workspace);
      if (workspace.profiles[0]) {
        setSession({ userId: workspace.profiles[0].id, email: workspace.profiles[0].email });
      }
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
