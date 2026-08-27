/** Report scope — catalog id OR freeform label. Taxonomy is fallback only. */
export type JobType = string;

export type JobStatus = "draft" | "generating" | "ready" | "sent";
export type Plan = "free" | "starter" | "pro" | "team";
export type Condition = "Good" | "Fair" | "Poor" | "Critical";
export type Severity = "Info" | "Advisory" | "Attention" | "Urgent";
export type Priority = "Immediate" | "Soon" | "Recommended" | "Maintenance";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  phone: string;
  /** Company logo as data URL (demo) or remote/signed URL (live `logo_url` column). */
  logoDataUrl: string | null;
  plan: Plan;
  reportsUsedThisMonth: number;
  /** UTC YYYY-MM for reportsUsedThisMonth; rolls over automatically */
  reportsMonthKey: string | null;
  createdAt: string;
  /** Primary sectors selected during onboarding (taxonomy sector ids) */
  sectorIds: string[];
  /** Industries the contractor works in (taxonomy industry ids) */
  industryIds: string[];
  /** Preferred default report template when creating jobs */
  defaultJobTypeId: string | null;
  /** ISO timestamp when trade onboarding was completed; null means show setup wizard */
  onboardingCompletedAt: string | null;
  /** Stripe customer id when web billing is live (maps to `stripe_customer_id`) */
  stripeCustomerId?: string | null;
  /** Stripe subscription id when web billing is live (maps to `stripe_subscription_id`) */
  stripeSubscriptionId?: string | null;
}

export interface Photo {
  id: string;
  jobId: string;
  dataUrl: string;
  caption: string;
  transcription: string;
  createdAt: string;
}

/** Reference PDF uploaded by the contractor — AI aligns the generated report to this template/content. */
export interface JobDocument {
  id: string;
  jobId: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  /** Extracted text used as evidence / alignment reference (may be truncated) */
  extractedText: string;
  /** How extractedText was produced */
  extractionSource?: "text" | "ocr" | "empty";
  createdAt: string;
}

export interface Job {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string | null;
  address: string | null;
  jobType: JobType;
  status: JobStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
}

export interface ReportSection {
  heading: string;
  severity: Severity;
  body: string;
}

export interface ReportRecommendation {
  priority: Priority;
  item: string;
  detail: string;
}

/** Colored rectangle overlay on a job photo — coords are normalized 0–1. */
export interface PhotoAnnotationBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoAnnotation {
  id: string;
  photoId: string;
  label: string;
  severity: Severity;
  sectionHeading: string | null;
  box: PhotoAnnotationBox;
}

export interface ReportContent {
  title: string;
  overall_condition: Condition;
  overall_condition_note: string;
  summary: string;
  sections: ReportSection[];
  recommendations: ReportRecommendation[];
  inspector_notes: string;
  disclaimer: string;
  /**
   * Vision-derived (or fallback) highlight boxes drawn on job photos in the
   * customer report. Empty when the job has no photos.
   */
  photo_annotations?: PhotoAnnotation[];
}

export interface ReportVersion {
  version: number;
  content: ReportContent;
  savedAt: string;
}

export interface Report {
  id: string;
  jobId: string;
  content: ReportContent;
  /** Starts at 1; increments on each regenerate */
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Prior versions (newest first), capped at 10 — share URL stays on current report id */
  history: ReportVersion[];
  sentAt: string | null;
  readAt: string | null;
}

export interface Session {
  userId: string;
  email: string;
}

export interface AppState {
  profiles: Profile[];
  jobs: Job[];
  photos: Photo[];
  documents: JobDocument[];
  reports: Report[];
}

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 3,
  starter: 30,
  pro: Infinity,
  team: Infinity,
};

export const PLAN_PRICES: Record<Plan, { monthly: number; label: string; limit: string; features: string[] }> = {
  free: {
    monthly: 0,
    label: "Free",
    limit: "3 reports/month",
    features: ["3 reports per month", "Unlimited regenerates on a job", "AI report drafting", "Any trade / freeform scopes", "Email delivery", "Photo + voice notes"],
  },
  starter: {
    monthly: 29,
    label: "Starter",
    limit: "30 reports/month",
    features: ["30 reports per month", "Unlimited regenerates on a job", "Company branding", "AI + Whisper voice", "Read receipts", "Priority support"],
  },
  pro: {
    monthly: 59,
    label: "Pro",
    limit: "Unlimited reports",
    features: ["Unlimited reports", "AI vision + PDF OCR", "Photo highlight overlays", "Any custom scope", "Branded reports", "Version history", "Customer-ready PDF/print"],
  },
  team: {
    monthly: 99,
    label: "Team",
    limit: "Unlimited reports",
    features: [
      "Everything in Pro",
      "Unlimited reports for this account",
      "Company branding",
      "Best for crews sharing one login (multi-seat invites coming soon)",
    ],
  },
};
