import { escapeHtml } from "./utils";
import type { Job, Profile, ReportContent } from "./types";

export function buildReportEmailHtml(job: Job, profile: Profile, content: ReportContent) {
  const sections = content.sections
    .map(
      (section) => `<tr><td style="padding:16px 0;border-bottom:1px solid #e5e7eb">
        <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#1d4ed8;margin-bottom:6px">${escapeHtml(section.heading)}</div>
        <span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#eff6ff;color:#1e3a8a;margin-bottom:8px">${escapeHtml(section.severity)}</span>
        <p style="margin:8px 0 0;color:#334155;line-height:1.6;font-size:14px">${escapeHtml(section.body)}</p>
      </td></tr>`
    )
    .join("");
  const recs = content.recommendations
    .map(
      (rec) => `<tr><td style="padding:10px 0">
      <strong style="display:inline-block;font-size:11px;padding:3px 8px;border-radius:6px;background:#1d4ed8;color:#fff;margin-right:8px">${escapeHtml(rec.priority)}</strong>
      <strong style="color:#0f172a">${escapeHtml(rec.item)}</strong>
      <div style="color:#475569;font-size:13px;margin-top:4px">${escapeHtml(rec.detail)}</div>
    </td></tr>`
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:640px;width:100%">
        <tr><td style="background:#1d4ed8;color:#fff;padding:28px">
          <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">${escapeHtml(profile.companyName || "FieldReport")}</div>
          <h1 style="margin:8px 0 0;font-size:24px">${escapeHtml(content.title)}</h1>
          <p style="margin:10px 0 0;opacity:.9">${escapeHtml(job.address || "Address on file")} · ${escapeHtml(job.customerName)}</p>
        </td></tr>
        <tr><td style="padding:24px">
          <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:20px">
            <div style="font-size:12px;color:#1d4ed8;font-weight:700">OVERALL CONDITION</div>
            <div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:4px">${escapeHtml(content.overall_condition)}</div>
            <p style="margin:8px 0 0;color:#334155">${escapeHtml(content.overall_condition_note)}</p>
          </div>
          <p style="color:#334155;line-height:1.7">${escapeHtml(content.summary)}</p>
          <table width="100%" cellspacing="0" cellpadding="0">${sections}</table>
          <h2 style="margin:28px 0 8px;font-size:18px;color:#0f172a">Recommended actions</h2>
          <table width="100%" cellspacing="0" cellpadding="0">${recs}</table>
          <p style="margin-top:24px;color:#64748b;font-size:12px;line-height:1.6">${escapeHtml(content.disclaimer)}</p>
          <p style="margin-top:12px;color:#94a3b8;font-size:11px">Prepared with FieldReport · ${escapeHtml(profile.fullName)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
