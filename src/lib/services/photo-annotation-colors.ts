import type { Severity } from "../types";

export const ANNOTATION_COLORS: Record<Severity, { stroke: string; fill: string; badge: string; hex: string }> = {
  Info: { stroke: "rgba(71, 85, 105, 0.95)", fill: "rgba(148, 163, 184, 0.22)", badge: "bg-slate-100 text-slate-700", hex: "#64748b" },
  Advisory: { stroke: "rgba(2, 132, 199, 0.95)", fill: "rgba(56, 189, 248, 0.22)", badge: "bg-sky-100 text-sky-800", hex: "#0284c7" },
  Attention: { stroke: "rgba(217, 119, 6, 0.95)", fill: "rgba(251, 191, 36, 0.25)", badge: "bg-amber-100 text-amber-800", hex: "#d97706" },
  Urgent: { stroke: "rgba(220, 38, 38, 0.95)", fill: "rgba(248, 113, 113, 0.28)", badge: "bg-red-100 text-red-800", hex: "#dc2626" },
};
