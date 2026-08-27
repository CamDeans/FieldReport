import { normalizeTradePreferences } from "./taxonomy";
import { currentReportsMonthKey } from "./billing-quota";
import type { AppState, Job, Photo, Profile, Report } from "./types";
import { uid } from "./utils";
import { generateReportContent } from "./report-engine";

/** Demo account (server-persisted in `.fieldreport/`; not browser localStorage). */
export const DEMO_EMAIL = "cameronmdeans@gmail.com";
export const DEMO_PASSWORD = "FieldReport!2026";

const now = () => new Date().toISOString();

function placeholderPhoto(label: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${color}"/><text x="40" y="320" fill="white" font-size="36" font-family="Arial">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createDemoState(): AppState {
  const created = now();
  const profile: Profile = {
    id: "user_demo_cameron",
    email: DEMO_EMAIL,
    fullName: "Cameron Deans",
    companyName: "Deans Property Inspections",
    phone: "(512) 555-0148",
    logoDataUrl: null,
    plan: "pro",
    reportsUsedThisMonth: 2,
    reportsMonthKey: new Date().toISOString().slice(0, 7),
    createdAt: created,
    ...normalizeTradePreferences(null, { demoDefaults: true }),
    onboardingCompletedAt: created,
  };

  const roofJob: Job = {
    id: "job_demo_roof",
    userId: profile.id,
    customerName: "Sarah Johnson",
    customerEmail: "sarah@example.com",
    address: "247 Maple Grove Drive, Austin, TX",
    jobType: "roofing",
    status: "draft",
    notes: "20-year-old home. Homeowner reports leak near chimney after rain. Prior hail event 3 years ago.",
    createdAt: created,
    updatedAt: created,
    sentAt: null,
  };

  const waterJob: Job = {
    id: "job_demo_water",
    userId: profile.id,
    customerName: "Luis Ortega",
    customerEmail: "luis@example.com",
    address: "88 Harbor Lane, Tampa, FL",
    jobType: "water_damage",
    status: "draft",
    notes: "Supply line burst under kitchen sink while owners were traveling.",
    createdAt: created,
    updatedAt: created,
    sentAt: null,
  };

  const hvacJob: Job = {
    id: "job_demo_hvac",
    userId: profile.id,
    customerName: "Priya Nair",
    customerEmail: "priya@example.com",
    address: "410 Cedar Court, Columbus, OH",
    jobType: "hvac_inspection",
    status: "ready",
    notes: "Rooftop package unit. Weak airflow in bedrooms. Filter overdue. Customer wants a written report before summer.",
    createdAt: created,
    updatedAt: created,
    sentAt: null,
  };

  const photos: Photo[] = [
    {
      id: "photo_roof_1",
      jobId: roofJob.id,
      dataUrl: placeholderPhoto("Front slope", "#1d4ed8"),
      caption: "Front slope — widespread granule loss on architectural shingles",
      transcription:
        "Front slope is showing age. Heavy granule loss, blistering toward the lower third, granules collecting in the gutters.",
      createdAt: created,
    },
    {
      id: "photo_roof_2",
      jobId: roofJob.id,
      dataUrl: placeholderPhoto("Chimney flashing", "#0f766e"),
      caption: "Chimney flashing — visible gap and rust staining",
      transcription:
        "Step flashing pulled away from the mortar joint. Rust staining on the brick. This is likely the leak source.",
      createdAt: created,
    },
    {
      id: "photo_water_1",
      jobId: waterJob.id,
      dataUrl: placeholderPhoto("Kitchen base", "#b45309"),
      caption: "Kitchen base cabinets swollen at the toe kick",
      transcription: "Cabinets are swollen and the vinyl is peeling. Moisture meter was not on site; materials feel damp.",
      createdAt: created,
    },
    {
      id: "photo_hvac_1",
      jobId: hvacJob.id,
      dataUrl: placeholderPhoto("Package unit", "#334155"),
      caption: "Rooftop package unit — dirty coil and clogged filter",
      transcription: "Filter is overdue and the evaporator coil is matted. Airflow at the bedroom registers felt weak.",
      createdAt: created,
    },
  ];

  const hvacPhotos = photos.filter((p) => p.jobId === hvacJob.id);
  const hvacReport: Report = {
    id: "report_demo_hvac",
    jobId: hvacJob.id,
    content: generateReportContent(hvacJob, hvacPhotos, profile),
    version: 1,
    createdAt: created,
    updatedAt: created,
    history: [],
    sentAt: null,
    readAt: null,
  };

  return { profiles: [profile], jobs: [roofJob, waterJob, hvacJob], photos, documents: [], reports: [hvacReport] };
}

export function createProfile(input: {
  email: string;
  fullName: string;
  companyName: string;
  sectorIds?: string[];
  industryIds?: string[];
  defaultJobTypeId?: string | null;
}): Profile {
  const prefs = normalizeTradePreferences({
    sectorIds: input.sectorIds ?? [],
    industryIds: input.industryIds ?? [],
    defaultJobTypeId: input.defaultJobTypeId ?? null,
    onboardingCompletedAt: null,
  });
  return {
    id: uid("user"),
    email: input.email.toLowerCase(),
    fullName: input.fullName,
    companyName: input.companyName,
    phone: "",
    logoDataUrl: null,
    plan: "free",
    reportsUsedThisMonth: 0,
    reportsMonthKey: currentReportsMonthKey(),
    createdAt: now(),
    ...prefs,
  };
}

export function createJob(input: Omit<Job, "id" | "status" | "createdAt" | "updatedAt" | "sentAt">): Job {
  const created = now();
  return {
    ...input,
    id: uid("job"),
    status: "draft",
    createdAt: created,
    updatedAt: created,
    sentAt: null,
  };
}
