import { Resend } from "resend";
import { getAppUrl, isResendConfigured } from "../config";
import { buildReportEmailHtml } from "../email-html";
import { formatReportPlainText } from "../report-engine";
import { reportSharePath } from "../public-report";
import type { Job, Profile, Report } from "../types";

export function parseRecipients(raw: string): string[] {
  const found = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const unique: string[] = [];
  for (const email of found.map((e) => e.trim().toLowerCase())) {
    if (!unique.includes(email)) unique.push(email);
  }
  return unique;
}

export async function sendReportEmail(input: {
  job: Job;
  report: Report;
  profile: Profile;
  to?: string;
  subject?: string;
  message?: string;
}) {
  const { job, report, profile } = input;
  const recipients = parseRecipients(input.to || job.customerEmail || "");
  if (!recipients.length) throw new Error("Customer email is required.");

  const shareUrl = `${getAppUrl()}${reportSharePath(report.id)}`;
  const subject =
    input.subject?.trim() || `${profile.companyName || profile.fullName} — ${report.content.title}`;
  const intro = input.message?.trim()
    ? `<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5">${input.message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</p>`
    : "";
  const html = `${intro}${buildReportEmailHtml(job, profile, report.content)}`;
  const text = [input.message?.trim(), formatReportPlainText(job, profile, report.content), `View online: ${shareUrl}`]
    .filter(Boolean)
    .join("\n\n");

  if (!isResendConfigured()) {
    console.info("[demo-email]", { to: recipients, subject, shareUrl, message: input.message?.trim() || null });
    return { queued: true, mode: "demo" as const, to: recipients.join(", "), subject, recipients };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || "FieldReport <reports@fieldreport.app>";
  const { error } = await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message);
  return { queued: true, mode: "live" as const, to: recipients.join(", "), subject, recipients };
}
