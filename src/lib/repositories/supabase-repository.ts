import { createSupabaseAdmin, createSupabaseServerClient } from "../supabase/server";
import { PLAN_LIMITS, type AppState, type Job, type JobDocument, type Photo, type Plan, type Profile, type Report, type ReportContent, type ReportVersion } from "../types";
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

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name ?? ""),
    companyName: String(row.company_name ?? ""),
    phone: String(row.phone ?? ""),
    logoDataUrl: (row.logo_url as string | null) ?? null,
    plan: (row.plan as Profile["plan"]) ?? "free",
    reportsUsedThisMonth: Number(row.reports_used_this_month ?? 0),
    reportsMonthKey: (row.reports_month_key as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    sectorIds: (row.sector_ids as string[]) ?? [],
    industryIds: (row.industry_ids as string[]) ?? [],
    defaultJobTypeId: (row.default_job_type_id as string | null) ?? null,
    onboardingCompletedAt: (row.onboarding_completed_at as string | null) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
  };
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    customerName: String(row.customer_name),
    customerEmail: (row.customer_email as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    jobType: String(row.job_type),
    status: row.status as Job["status"],
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sentAt: (row.sent_at as string | null) ?? null,
  };
}

function profileToPatch(patch: Partial<Profile>) {
  return {
    full_name: patch.fullName,
    company_name: patch.companyName,
    phone: patch.phone,
    logo_url: patch.logoDataUrl,
    plan: patch.plan,
    reports_used_this_month: patch.reportsUsedThisMonth,
    reports_month_key: patch.reportsMonthKey,
    sector_ids: patch.sectorIds,
    industry_ids: patch.industryIds,
    default_job_type_id: patch.defaultJobTypeId,
    onboarding_completed_at: patch.onboardingCompletedAt,
    stripe_customer_id: patch.stripeCustomerId,
    stripe_subscription_id: patch.stripeSubscriptionId,
    updated_at: new Date().toISOString(),
  };
}

export class SupabaseRepository implements FieldReportRepository {
  mode = "live" as const;

  private admin = createSupabaseAdmin();

  async login(email: string, password: string): Promise<AuthResult> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.session) throw new Error(error?.message ?? "Invalid email or password.");
    return { userId: data.user.id, email: data.user.email ?? email, token: data.session.access_token };
  }

  async signup(input: SignupInput): Promise<AuthResult> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: { data: { full_name: input.fullName, company_name: input.companyName } },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Could not create account.");
    await this.admin.from("profiles").update({
      full_name: input.fullName,
      company_name: input.companyName,
    }).eq("id", data.user.id);
    if (!data.session) throw new Error("Check your email to confirm your account, then sign in.");
    return { userId: data.user.id, email: data.user.email ?? input.email, token: data.session.access_token };
  }

  async validateSession(token: string) {
    const { data, error } = await this.admin.auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id, email: data.user.email ?? "" };
  }

  async logout(_token: string) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  async getProfile(userId: string) {
    const { data, error } = await this.admin.from("profiles").select("*").eq("id", userId).single();
    if (error || !data) throw new Error("Profile not found");
    return rowToProfile(data);
  }

  async getWorkspace(userId: string): Promise<AppState> {
    const profile = await this.getProfile(userId);
    const { data: jobs } = await this.admin.from("jobs").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    const jobIds = (jobs ?? []).map((j) => j.id);
    const { data: photos } = jobIds.length
      ? await this.admin.from("photos").select("*").in("job_id", jobIds)
      : { data: [] as Record<string, unknown>[] };
    const { data: reports } = jobIds.length
      ? await this.admin.from("reports").select("*").in("job_id", jobIds)
      : { data: [] as Record<string, unknown>[] };

    const photoRows = await Promise.all(
      (photos ?? []).map(async (row) => {
        const signed = await this.admin.storage.from("job-photos").createSignedUrl(String(row.storage_path), 3600);
        return {
          id: String(row.id),
          jobId: String(row.job_id),
          dataUrl: signed.data?.signedUrl ?? "",
          caption: String(row.caption ?? ""),
          transcription: String(row.transcription ?? ""),
          createdAt: String(row.created_at),
        } satisfies Photo;
      })
    );

    const { data: documents } = jobIds.length
      ? await this.admin.from("job_documents").select("*").in("job_id", jobIds)
      : { data: [] as Record<string, unknown>[] };

    const docRows = await Promise.all(
      (documents ?? []).map(async (row) => {
        const signed = await this.admin.storage.from("job-documents").createSignedUrl(String(row.storage_path), 3600);
        return {
          id: String(row.id),
          jobId: String(row.job_id),
          fileName: String(row.file_name ?? "document.pdf"),
          mimeType: String(row.mime_type ?? "application/pdf"),
          dataUrl: signed.data?.signedUrl ?? "",
          extractedText: String(row.extracted_text ?? ""),
          extractionSource: (row.extraction_source as JobDocument["extractionSource"]) ?? undefined,
          createdAt: String(row.created_at),
        } satisfies JobDocument;
      })
    );

    return {
      profiles: [profile],
      jobs: (jobs ?? []).map(rowToJob),
      photos: photoRows,
      documents: docRows,
      reports: (reports ?? []).map((row) => ({
        id: String(row.id),
        jobId: String(row.job_id),
        content: row.content as Report["content"],
        version: Number(row.version ?? 1),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at ?? row.created_at),
        history: (row.history as ReportVersion[]) ?? [],
        sentAt: (row.sent_at as string | null) ?? null,
        readAt: (row.read_at as string | null) ?? null,
      })),
    };
  }

  async updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
    const payload = Object.fromEntries(Object.entries(profileToPatch(patch)).filter(([, v]) => v !== undefined));
    const { data, error } = await this.admin.from("profiles").update(payload).eq("id", userId).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "Could not update profile");
    return rowToProfile(data);
  }

  async createJob(userId: string, input: CreateJobInput): Promise<Job> {
    const { data, error } = await this.admin
      .from("jobs")
      .insert({
        user_id: userId,
        customer_name: input.customerName,
        customer_email: input.customerEmail || null,
        address: input.address || null,
        job_type: input.jobType,
        notes: input.notes,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not create job");
    return rowToJob(data);
  }

  async updateJob(userId: string, jobId: string, patch: Partial<Job>): Promise<Job> {
    const { data, error } = await this.admin
      .from("jobs")
      .update({
        customer_name: patch.customerName,
        customer_email: patch.customerEmail,
        address: patch.address,
        job_type: patch.jobType,
        status: patch.status,
        notes: patch.notes,
        sent_at: patch.sentAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Job not found");
    return rowToJob(data);
  }

  async deleteJob(userId: string, jobId: string) {
    const { error } = await this.admin.from("jobs").delete().eq("id", jobId).eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  async duplicateJob(userId: string, jobId: string): Promise<Job> {
    const workspace = await this.getWorkspace(userId);
    const job = workspace.jobs.find((j) => j.id === jobId);
    if (!job) throw new Error("Job not found");
    const copy = await this.createJob(userId, {
      customerName: `${job.customerName} (copy)`,
      customerEmail: job.customerEmail ?? "",
      address: job.address ?? "",
      jobType: job.jobType,
      notes: job.notes,
    });
    for (const photo of workspace.photos.filter((p) => p.jobId === jobId)) {
      await this.addPhoto(userId, copy.id, photo.dataUrl);
    }
    return copy;
  }

  async addPhoto(userId: string, jobId: string, dataUrl: string): Promise<Photo> {
    const job = await this.admin.from("jobs").select("id").eq("id", jobId).eq("user_id", userId).single();
    if (job.error) throw new Error("Job not found");
    const photoId = uid("photo");
    const path = `${userId}/${jobId}/${photoId}.jpg`;
    const base64 = dataUrl.split(",")[1] ?? "";
    const buffer = Buffer.from(base64, "base64");
    const { error: uploadError } = await this.admin.storage.from("job-photos").upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (uploadError) throw new Error(uploadError.message);
    const { data, error } = await this.admin
      .from("photos")
      .insert({ id: photoId, job_id: jobId, storage_path: path })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not save photo");
    const signed = await this.admin.storage.from("job-photos").createSignedUrl(path, 3600);
    return {
      id: photoId,
      jobId,
      dataUrl: signed.data?.signedUrl ?? dataUrl,
      caption: "",
      transcription: "",
      createdAt: String(data.created_at),
    };
  }

  async updatePhoto(userId: string, photoId: string, patch: Partial<Photo>): Promise<Photo> {
    const { data: existing, error: findError } = await this.admin.from("photos").select("*").eq("id", photoId).single();
    if (findError || !existing) throw new Error("Photo not found");
    const { data: jobRow } = await this.admin.from("jobs").select("user_id").eq("id", existing.job_id).single();
    if (!jobRow || jobRow.user_id !== userId) throw new Error("Photo not found");
    const { data, error } = await this.admin
      .from("photos")
      .update({ caption: patch.caption, transcription: patch.transcription })
      .eq("id", photoId)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not update photo");
    const signed = await this.admin.storage.from("job-photos").createSignedUrl(String(data.storage_path), 3600);
    return {
      id: String(data.id),
      jobId: String(data.job_id),
      dataUrl: signed.data?.signedUrl ?? "",
      caption: String(data.caption ?? ""),
      transcription: String(data.transcription ?? ""),
      createdAt: String(data.created_at),
    };
  }

  async deletePhoto(userId: string, photoId: string) {
    const { data: existing } = await this.admin.from("photos").select("*").eq("id", photoId).single();
    if (!existing) return;
    const { data: jobRow } = await this.admin.from("jobs").select("user_id").eq("id", existing.job_id).single();
    if (!jobRow || jobRow.user_id !== userId) throw new Error("Photo not found");
    await this.admin.storage.from("job-photos").remove([String(existing.storage_path)]);
    await this.admin.from("photos").delete().eq("id", photoId);
  }

  async addDocument(userId: string, jobId: string, input: AddDocumentInput): Promise<JobDocument> {
    const job = await this.admin.from("jobs").select("id").eq("id", jobId).eq("user_id", userId).single();
    if (job.error) throw new Error("Job not found");
    const documentId = uid("doc");
    const path = `${userId}/${jobId}/${documentId}.pdf`;
    const base64 = input.dataUrl.split(",")[1] ?? "";
    const buffer = Buffer.from(base64, "base64");
    const { error: uploadError } = await this.admin.storage.from("job-documents").upload(path, buffer, {
      contentType: input.mimeType || "application/pdf",
      upsert: true,
    });
    if (uploadError) throw new Error(uploadError.message);
    const { data, error } = await this.admin
      .from("job_documents")
      .insert({
        id: documentId,
        job_id: jobId,
        storage_path: path,
        file_name: input.fileName,
        mime_type: input.mimeType || "application/pdf",
        extracted_text: input.extractedText,
        extraction_source: input.extractionSource ?? (input.extractedText?.trim() ? "text" : "empty"),
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not save document");
    const signed = await this.admin.storage.from("job-documents").createSignedUrl(path, 3600);
    return {
      id: documentId,
      jobId,
      fileName: input.fileName,
      mimeType: input.mimeType || "application/pdf",
      dataUrl: signed.data?.signedUrl ?? input.dataUrl,
      extractedText: input.extractedText,
      extractionSource: input.extractionSource ?? (input.extractedText?.trim() ? "text" : "empty"),
      createdAt: String(data.created_at),
    };
  }

  async deleteDocument(userId: string, documentId: string) {
    const { data: existing } = await this.admin.from("job_documents").select("*").eq("id", documentId).single();
    if (!existing) return;
    const { data: jobRow } = await this.admin.from("jobs").select("user_id").eq("id", existing.job_id).single();
    if (!jobRow || jobRow.user_id !== userId) throw new Error("Document not found");
    await this.admin.storage.from("job-documents").remove([String(existing.storage_path)]);
    await this.admin.from("job_documents").delete().eq("id", documentId);
  }

  async generateReport(userId: string, jobId: string, content: ReportContent) {
    const fresh = await this.getProfile(userId);
    const profile = applyMonthlyQuotaRollover(fresh);
    if (
      profile.reportsMonthKey !== fresh.reportsMonthKey ||
      profile.reportsUsedThisMonth !== fresh.reportsUsedThisMonth
    ) {
      await this.admin
        .from("profiles")
        .update({
          reports_used_this_month: profile.reportsUsedThisMonth,
          reports_month_key: profile.reportsMonthKey,
        })
        .eq("id", userId);
    }
    const { data: jobRow, error: jobError } = await this.admin.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
    if (jobError || !jobRow) throw new Error("Job not found");
    const { data: existing } = await this.admin.from("reports").select("*").eq("job_id", jobId).maybeSingle();
    const limit = PLAN_LIMITS[profile.plan];
    if (!existing && Number.isFinite(limit) && profile.reportsUsedThisMonth >= limit) {
      throw new Error("Monthly report limit reached. Upgrade your plan to continue.");
    }
    const nowIso = new Date().toISOString();
    const existingHistory = ((existing?.history as ReportVersion[]) ?? []) as ReportVersion[];
    const priorHistory: ReportVersion[] = existing
      ? [
          {
            version: Number(existing.version ?? 1),
            content: existing.content as ReportContent,
            savedAt: String(existing.updated_at ?? existing.created_at),
          },
          ...existingHistory,
        ].slice(0, 10)
      : [];
    const nextVersion = existing ? Number(existing.version ?? 1) + 1 : 1;
    const reportPayload = {
      job_id: jobId,
      user_id: userId,
      content,
      version: nextVersion,
      history: priorHistory,
      updated_at: nowIso,
      sent_at: existing?.sent_at ?? null,
      read_at: existing?.read_at ?? null,
    };
    const { data: reportRow, error } = existing
      ? await this.admin
          .from("reports")
          .update({
            content,
            version: nextVersion,
            history: priorHistory,
            updated_at: nowIso,
          })
          .eq("job_id", jobId)
          .select("*")
          .single()
      : await this.admin.from("reports").insert(reportPayload).select("*").single();
    if (error || !reportRow) throw new Error(error?.message ?? "Could not save report");
    const nextStatus = jobRow.status === "sent" ? "sent" : "ready";
    await this.admin.from("jobs").update({ status: nextStatus, updated_at: nowIso }).eq("id", jobId);
    if (!existing) {
      await this.admin
        .from("profiles")
        .update({
          reports_used_this_month: profile.reportsUsedThisMonth + 1,
          reports_month_key: profile.reportsMonthKey,
        })
        .eq("id", userId);
    }
    const job = rowToJob({ ...jobRow, status: nextStatus });
    const updatedProfile = await this.getProfile(userId);
    const report: Report = {
      id: String(reportRow.id),
      jobId,
      content,
      version: nextVersion,
      createdAt: String(reportRow.created_at),
      updatedAt: String(reportRow.updated_at ?? nowIso),
      history: priorHistory,
      sentAt: (reportRow.sent_at as string | null) ?? null,
      readAt: (reportRow.read_at as string | null) ?? null,
    };
    await this.savePublicSnapshot({ report, job, profile: updatedProfile });
    return { report, job, profile: updatedProfile };
  }

  async sendReport(userId: string, jobId: string, options?: SendReportOptions) {
    const { data: jobRow } = await this.admin.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
    const { data: reportRow } = await this.admin.from("reports").select("*").eq("job_id", jobId).single();
    if (!jobRow || !reportRow) throw new Error("Generate a report first.");
    const to = (options?.to || (jobRow.customer_email as string | null) || "").trim();
    if (!to) throw new Error("Add a customer email before sending.");
    const sentAt = new Date().toISOString();
    await this.admin
      .from("jobs")
      .update({ status: "sent", sent_at: sentAt, updated_at: sentAt, customer_email: to })
      .eq("id", jobId);
    await this.admin.from("reports").update({ sent_at: sentAt }).eq("job_id", jobId);
    const profile = await this.getProfile(userId);
    const job = rowToJob({ ...jobRow, status: "sent", sent_at: sentAt, updated_at: sentAt, customer_email: to });
    const report: Report = {
      id: String(reportRow.id),
      jobId,
      content: reportRow.content as ReportContent,
      version: Number(reportRow.version ?? 1),
      createdAt: String(reportRow.created_at),
      updatedAt: String(reportRow.updated_at ?? reportRow.created_at),
      history: (reportRow.history as ReportVersion[]) ?? [],
      sentAt,
      readAt: (reportRow.read_at as string | null) ?? null,
    };
    await this.savePublicSnapshot({ report, job, profile });
    return { job, report };
  }

  async markReportRead(reportId: string) {
    await this.admin.from("reports").update({ read_at: new Date().toISOString() }).eq("id", reportId);
  }

  async savePublicSnapshot(snapshot: PublicReportSnapshot) {
    await this.admin.from("public_report_snapshots").upsert({
      report_id: snapshot.report.id,
      payload: snapshot,
      updated_at: new Date().toISOString(),
    });
  }

  async getPublicSnapshot(reportId: string) {
    const { data } = await this.admin.from("public_report_snapshots").select("payload").eq("report_id", reportId).maybeSingle();
    return (data?.payload as PublicReportSnapshot | undefined) ?? null;
  }

  async changePlan(userId: string, plan: Plan) {
    return this.updateProfile(userId, { plan });
  }

  async resetDemo(_userId: string): Promise<AppState> {
    throw new Error("Demo reset is not available in live mode.");
  }
}
