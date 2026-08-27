import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import {
  createDemoState,
  createJob,
  createProfile,
  DEMO_EMAIL,
  DEMO_PASSWORD,
} from "../demo-data";
import { normalizeTradePreferences } from "../taxonomy";
import { PLAN_LIMITS, type AppState, type Job, type JobDocument, type Photo, type Plan, type Profile, type Report, type ReportContent } from "../types";
import { applyMonthlyQuotaRollover } from "../billing-quota";
import { uid } from "../utils";
import type {
  AddDocumentInput,
  AuthResult,
  CreateJobInput,
  FieldReportRepository,
  PublicReportSnapshot,
  SendReportOptions,
  SignupInput,
} from "./types";

const ROOT = path.join(process.cwd(), ".fieldreport");
const STORE_PATH = path.join(ROOT, "store.json");
const AUTH_PATH = path.join(ROOT, "auth.json");
const PUBLIC_PATH = path.join(ROOT, "public.json");

interface DemoStoreFile {
  state: AppState;
}

interface DemoAuthFile {
  passwords: Record<string, string>;
}

interface DemoPublicFile {
  snapshots: Record<string, PublicReportSnapshot>;
}

const sessions = new Map<string, { userId: string; email: string }>();

async function ensureRoot() {
  await mkdir(ROOT, { recursive: true });
}

async function readStore(): Promise<DemoStoreFile> {
  await ensureRoot();
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as DemoStoreFile;
    return { state: migrateState(parsed.state) };
  } catch {
    const seeded = createDemoState();
    const file = { state: seeded };
    await writeStore(file);
    await writeAuth({ passwords: {} });
    await writePublic({ snapshots: {} });
    return file;
  }
}

function migrateState(state: AppState): AppState {
  return {
    profiles: (state.profiles ?? []).map((p) => ({
      ...p,
      ...normalizeTradePreferences(p, { demoDefaults: p.email === DEMO_EMAIL }),
    })),
    jobs: state.jobs ?? [],
    photos: state.photos ?? [],
    documents: state.documents ?? [],
    reports: state.reports ?? [],
  };
}

async function writeStore(file: DemoStoreFile) {
  await ensureRoot();
  await writeFile(STORE_PATH, JSON.stringify(file, null, 2), "utf8");
}

async function readAuth(): Promise<DemoAuthFile> {
  await ensureRoot();
  try {
    return JSON.parse(await readFile(AUTH_PATH, "utf8")) as DemoAuthFile;
  } catch {
    return { passwords: {} };
  }
}

async function writeAuth(file: DemoAuthFile) {
  await ensureRoot();
  await writeFile(AUTH_PATH, JSON.stringify(file, null, 2), "utf8");
}

async function readPublic(): Promise<DemoPublicFile> {
  await ensureRoot();
  try {
    return JSON.parse(await readFile(PUBLIC_PATH, "utf8")) as DemoPublicFile;
  } catch {
    return { snapshots: {} };
  }
}

async function writePublic(file: DemoPublicFile) {
  await ensureRoot();
  await writeFile(PUBLIC_PATH, JSON.stringify(file, null, 2), "utf8");
}

function issueSession(userId: string, email: string): AuthResult {
  const token = uid("sess");
  sessions.set(token, { userId, email });
  return { userId, email, token };
}

function profileById(state: AppState, userId: string) {
  const profile = state.profiles.find((p) => p.id === userId);
  if (!profile) throw new Error("Profile not found");
  return profile;
}

export class DemoRepository implements FieldReportRepository {
  mode = "demo" as const;

  async login(email: string, password: string): Promise<AuthResult> {
    const normalized = email.trim().toLowerCase();
    if (normalized === DEMO_EMAIL && password !== DEMO_PASSWORD) {
      throw new Error("Demo password is FieldReport!2026");
    }
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");

    const { state } = await readStore();
    const auth = await readAuth();
    let profile = state.profiles.find((p) => p.email === normalized);
    if (!profile) {
      profile = createProfile({ email: normalized, fullName: normalized.split("@")[0], companyName: "" });
      state.profiles.push(profile);
      auth.passwords[profile.id] = await bcrypt.hash(password, 10);
      await writeStore({ state });
      await writeAuth(auth);
    } else if (normalized !== DEMO_EMAIL) {
      const hash = auth.passwords[profile.id];
      if (!hash || !(await bcrypt.compare(password, hash))) {
        throw new Error("Invalid email or password.");
      }
    }
    return issueSession(profile.id, profile.email);
  }

  async signup(input: SignupInput): Promise<AuthResult> {
    const normalized = input.email.trim().toLowerCase();
    if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");
    const { state } = await readStore();
    const auth = await readAuth();
    if (state.profiles.some((p) => p.email === normalized && p.email !== DEMO_EMAIL)) {
      throw new Error("An account with that email already exists.");
    }
    const profile = createProfile({
      email: normalized,
      fullName: input.fullName,
      companyName: input.companyName,
    });
    state.profiles.push(profile);
    auth.passwords[profile.id] = await bcrypt.hash(input.password, 10);
    await writeStore({ state });
    await writeAuth(auth);
    return issueSession(profile.id, profile.email);
  }

  async validateSession(token: string) {
    return sessions.get(token) ?? null;
  }

  async logout(token: string) {
    sessions.delete(token);
  }

  async getWorkspace(userId: string): Promise<AppState> {
    const { state } = await readStore();
    return {
      profiles: state.profiles.filter((p) => p.id === userId),
      jobs: state.jobs.filter((j) => j.userId === userId),
      photos: state.photos.filter((p) => state.jobs.some((j) => j.id === p.jobId && j.userId === userId)),
      documents: (state.documents ?? []).filter((d) => state.jobs.some((j) => j.id === d.jobId && j.userId === userId)),
      reports: state.reports.filter((r) => state.jobs.some((j) => j.id === r.jobId && j.userId === userId)),
    };
  }

  async updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
    const file = await readStore();
    const idx = file.state.profiles.findIndex((p) => p.id === userId);
    if (idx < 0) throw new Error("Profile not found");
    file.state.profiles[idx] = { ...file.state.profiles[idx], ...patch };
    await writeStore(file);
    return file.state.profiles[idx];
  }

  async createJob(userId: string, input: CreateJobInput): Promise<Job> {
    const file = await readStore();
    const job = createJob({
      userId,
      customerName: input.customerName,
      customerEmail: input.customerEmail || null,
      address: input.address || null,
      jobType: input.jobType,
      notes: input.notes,
    });
    file.state.jobs.unshift(job);
    await writeStore(file);
    return job;
  }

  async updateJob(userId: string, jobId: string, patch: Partial<Job>): Promise<Job> {
    const file = await readStore();
    const idx = file.state.jobs.findIndex((j) => j.id === jobId && j.userId === userId);
    if (idx < 0) throw new Error("Job not found");
    file.state.jobs[idx] = { ...file.state.jobs[idx], ...patch, updatedAt: new Date().toISOString() };
    await writeStore(file);
    return file.state.jobs[idx];
  }

  async deleteJob(userId: string, jobId: string): Promise<void> {
    const file = await readStore();
    file.state.jobs = file.state.jobs.filter((j) => !(j.id === jobId && j.userId === userId));
    file.state.photos = file.state.photos.filter((p) => p.jobId !== jobId);
    file.state.documents = (file.state.documents ?? []).filter((d) => d.jobId !== jobId);
    file.state.reports = file.state.reports.filter((r) => r.jobId !== jobId);
    await writeStore(file);
  }

  async duplicateJob(userId: string, jobId: string): Promise<Job> {
    const file = await readStore();
    const job = file.state.jobs.find((j) => j.id === jobId && j.userId === userId);
    if (!job) throw new Error("Job not found");
    const copy = createJob({
      userId,
      customerName: `${job.customerName} (copy)`,
      customerEmail: job.customerEmail,
      address: job.address,
      jobType: job.jobType,
      notes: job.notes,
    });
    file.state.jobs.unshift(copy);
    file.state.photos.unshift(
      ...file.state.photos
        .filter((p) => p.jobId === jobId)
        .map((p) => ({ ...p, id: uid("photo"), jobId: copy.id, createdAt: new Date().toISOString() }))
    );
    file.state.documents = file.state.documents ?? [];
    const sourceDocs = file.state.documents.filter((d) => d.jobId === jobId);
    file.state.documents.unshift(
      ...sourceDocs.map((d) => ({ ...d, id: uid("doc"), jobId: copy.id, createdAt: new Date().toISOString() }))
    );
    await writeStore(file);
    return copy;
  }

  async addPhoto(userId: string, jobId: string, dataUrl: string): Promise<Photo> {
    const file = await readStore();
    const job = file.state.jobs.find((j) => j.id === jobId && j.userId === userId);
    if (!job) throw new Error("Job not found");
    const photo: Photo = {
      id: uid("photo"),
      jobId,
      dataUrl,
      caption: "",
      transcription: "",
      createdAt: new Date().toISOString(),
    };
    file.state.photos.push(photo);
    await writeStore(file);
    return photo;
  }

  async updatePhoto(userId: string, photoId: string, patch: Partial<Photo>): Promise<Photo> {
    const file = await readStore();
    const photo = file.state.photos.find((p) => p.id === photoId);
    if (!photo) throw new Error("Photo not found");
    const job = file.state.jobs.find((j) => j.id === photo.jobId && j.userId === userId);
    if (!job) throw new Error("Job not found");
    const idx = file.state.photos.findIndex((p) => p.id === photoId);
    file.state.photos[idx] = { ...file.state.photos[idx], ...patch };
    await writeStore(file);
    return file.state.photos[idx];
  }

  async deletePhoto(userId: string, photoId: string): Promise<void> {
    const file = await readStore();
    const photo = file.state.photos.find((p) => p.id === photoId);
    if (!photo) return;
    const job = file.state.jobs.find((j) => j.id === photo.jobId && j.userId === userId);
    if (!job) throw new Error("Job not found");
    file.state.photos = file.state.photos.filter((p) => p.id !== photoId);
    await writeStore(file);
  }

  async addDocument(userId: string, jobId: string, input: AddDocumentInput): Promise<JobDocument> {
    const file = await readStore();
    const job = file.state.jobs.find((j) => j.id === jobId && j.userId === userId);
    if (!job) throw new Error("Job not found");
    file.state.documents = file.state.documents ?? [];
    const doc: JobDocument = {
      id: uid("doc"),
      jobId,
      fileName: input.fileName,
      mimeType: input.mimeType || "application/pdf",
      dataUrl: input.dataUrl,
      extractedText: input.extractedText || "",
      extractionSource: input.extractionSource ?? (input.extractedText?.trim() ? "text" : "empty"),
      createdAt: new Date().toISOString(),
    };
    file.state.documents.push(doc);
    await writeStore(file);
    return doc;
  }

  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const file = await readStore();
    file.state.documents = file.state.documents ?? [];
    const doc = file.state.documents.find((d) => d.id === documentId);
    if (!doc) return;
    const job = file.state.jobs.find((j) => j.id === doc.jobId && j.userId === userId);
    if (!job) throw new Error("Job not found");
    file.state.documents = file.state.documents.filter((d) => d.id !== documentId);
    await writeStore(file);
  }

  async generateReport(userId: string, jobId: string, content: ReportContent) {
    const file = await readStore();
    const profile = applyMonthlyQuotaRollover(profileById(file.state, userId));
    const jobIdx = file.state.jobs.findIndex((j) => j.id === jobId && j.userId === userId);
    if (jobIdx < 0) throw new Error("Job not found");
    const job = file.state.jobs[jobIdx];
    const existing = file.state.reports.find((r) => r.jobId === jobId);
    const limit = PLAN_LIMITS[profile.plan];
    if (!existing && Number.isFinite(limit) && profile.reportsUsedThisMonth >= limit) {
      throw new Error("Monthly report limit reached. Upgrade your plan to continue.");
    }
    const nowIso = new Date().toISOString();
    const priorHistory = existing
      ? [
          {
            version: existing.version ?? 1,
            content: existing.content,
            savedAt: existing.updatedAt ?? existing.createdAt,
          },
          ...(existing.history ?? []),
        ].slice(0, 10)
      : [];
    const report: Report = {
      id: existing?.id ?? uid("report"),
      jobId,
      content,
      version: existing ? (existing.version ?? 1) + 1 : 1,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
      history: priorHistory,
      sentAt: existing?.sentAt ?? null,
      readAt: existing?.readAt ?? null,
    };
    const nextStatus = job.status === "sent" ? "sent" : ("ready" as const);
    file.state.reports = [report, ...file.state.reports.filter((r) => r.jobId !== jobId)];
    file.state.jobs[jobIdx] = { ...job, status: nextStatus, updatedAt: nowIso };
    const profileIdx = file.state.profiles.findIndex((p) => p.id === userId);
    file.state.profiles[profileIdx] = {
      ...profile,
      reportsUsedThisMonth: existing ? profile.reportsUsedThisMonth : profile.reportsUsedThisMonth + 1,
      reportsMonthKey: profile.reportsMonthKey,
    };
    await writeStore(file);
    const updatedJob = file.state.jobs[jobIdx];
    const updatedProfile = file.state.profiles[profileIdx];
    const photos = file.state.photos.filter((p) => p.jobId === jobId);
    await this.savePublicSnapshot({ report, job: updatedJob, profile: updatedProfile, photos });
    return { report, job: updatedJob, profile: updatedProfile };
  }

  async sendReport(userId: string, jobId: string, options?: SendReportOptions) {
    const file = await readStore();
    const jobIdx = file.state.jobs.findIndex((j) => j.id === jobId && j.userId === userId);
    const reportIdx = file.state.reports.findIndex((r) => r.jobId === jobId);
    if (jobIdx < 0 || reportIdx < 0) throw new Error("Generate a report first.");
    const job = file.state.jobs[jobIdx];
    const to = (options?.to || job.customerEmail || "").trim();
    if (!to) throw new Error("Add a customer email before sending.");
    const sentAt = new Date().toISOString();
    file.state.jobs[jobIdx] = {
      ...job,
      customerEmail: to,
      status: "sent",
      sentAt,
      updatedAt: sentAt,
    };
    file.state.reports[reportIdx] = { ...file.state.reports[reportIdx], sentAt };
    await writeStore(file);
    const profile = profileById(file.state, userId);
    await this.savePublicSnapshot({
      report: file.state.reports[reportIdx],
      job: file.state.jobs[jobIdx],
      profile,
      photos: file.state.photos.filter((p) => p.jobId === jobId),
    });
    return { job: file.state.jobs[jobIdx], report: file.state.reports[reportIdx] };
  }

  async markReportRead(reportId: string) {
    const file = await readStore();
    const idx = file.state.reports.findIndex((r) => r.id === reportId);
    if (idx < 0) {
      const pub = await readPublic();
      const snap = pub.snapshots[reportId];
      if (!snap) return;
      const jobId = snap.job.id;
      const rIdx = file.state.reports.findIndex((r) => r.jobId === jobId);
      if (rIdx >= 0) file.state.reports[rIdx] = { ...file.state.reports[rIdx], readAt: new Date().toISOString() };
    } else {
      file.state.reports[idx] = { ...file.state.reports[idx], readAt: new Date().toISOString() };
    }
    await writeStore(file);
  }

  async savePublicSnapshot(snapshot: PublicReportSnapshot) {
    const pub = await readPublic();
    pub.snapshots[snapshot.report.id] = snapshot;
    await writePublic(pub);
  }

  async getPublicSnapshot(reportId: string) {
    const pub = await readPublic();
    return pub.snapshots[reportId] ?? null;
  }

  async changePlan(userId: string, plan: Plan): Promise<Profile> {
    return this.updateProfile(userId, { plan });
  }

  async resetDemo(userId: string): Promise<AppState> {
    const seeded = createDemoState();
    await writeStore({ state: seeded });
    const pub = await readPublic();
    pub.snapshots = {};
    await writePublic(pub);
    return this.getWorkspace(seeded.profiles[0]?.id ?? userId);
  }
}

let demoSingleton: DemoRepository | null = null;
export function getDemoRepository() {
  if (!demoSingleton) demoSingleton = new DemoRepository();
  return demoSingleton;
}
