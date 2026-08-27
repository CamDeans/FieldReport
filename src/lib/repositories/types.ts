import type { AppState, Job, JobDocument, Photo, Plan, Profile, Report, ReportContent } from "../types";

export interface AuthResult {
  userId: string;
  email: string;
  token: string;
}

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

export interface CreateJobInput {
  customerName: string;
  customerEmail: string;
  address: string;
  jobType: string;
  notes: string;
}

export interface PublicReportSnapshot {
  report: Report;
  job: Job;
  profile: Profile;
  /** Job photos frozen at send/generate time for customer annotated gallery */
  photos?: Photo[];
}

export interface AddDocumentInput {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  extractedText: string;
  extractionSource?: "text" | "ocr" | "empty";
}

export interface SendReportOptions {
  to?: string;
  subject?: string;
  message?: string;
}

export interface FieldReportRepository {
  mode: "demo" | "live";

  login(email: string, password: string): Promise<AuthResult>;
  signup(input: SignupInput): Promise<AuthResult>;
  validateSession(token: string): Promise<{ userId: string; email: string } | null>;
  logout(token: string): Promise<void>;

  getWorkspace(userId: string): Promise<AppState>;
  updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile>;

  createJob(userId: string, input: CreateJobInput): Promise<Job>;
  updateJob(userId: string, jobId: string, patch: Partial<Job>): Promise<Job>;
  deleteJob(userId: string, jobId: string): Promise<void>;
  duplicateJob(userId: string, jobId: string): Promise<Job>;

  addPhoto(userId: string, jobId: string, dataUrl: string): Promise<Photo>;
  updatePhoto(userId: string, photoId: string, patch: Partial<Photo>): Promise<Photo>;
  deletePhoto(userId: string, photoId: string): Promise<void>;

  addDocument(userId: string, jobId: string, input: AddDocumentInput): Promise<JobDocument>;
  deleteDocument(userId: string, documentId: string): Promise<void>;

  generateReport(userId: string, jobId: string, content: ReportContent): Promise<{ report: Report; job: Job; profile: Profile }>;
  sendReport(userId: string, jobId: string, options?: SendReportOptions): Promise<{ job: Job; report: Report }>;
  markReportRead(reportId: string): Promise<void>;

  savePublicSnapshot(snapshot: PublicReportSnapshot): Promise<void>;
  getPublicSnapshot(reportId: string): Promise<PublicReportSnapshot | null>;

  changePlan(userId: string, plan: Plan): Promise<Profile>;
  resetDemo(userId: string): Promise<AppState>;
}
