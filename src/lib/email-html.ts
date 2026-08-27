import { escapeHtml } from "./utils";
import { ANNOTATION_COLORS } from "./services/photo-annotation-colors";
import type { Job, Photo, Profile, ReportContent } from "./types";

export function buildReportEmailHtml(
  job: Job,
  profile: Profile,
  content: ReportContent,
  photos: Photo[] = []
) {
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

  const annotations = content.photo_annotations ?? [];
  const photoRows = photos
    .slice(0, 8)
    .map((photo, index) => {
      const boxes = annotations.filter((a) => a.photoId === photo.id);
      const caption = [photo.caption, photo.transcription].map((s) => s.trim()).filter(Boolean).join(" · ");
      const legend = boxes
        .map((a) => {
          const color = ANNOTATION_COLORS[a.severity].hex;
          return `<div style="font-size:12px;color:#475569;margin-top:4px"><span style="color:${color}">■</span> ${escapeHtml(a.label)}${a.sectionHeading ? ` · ${escapeHtml(a.sectionHeading)}` : ""}</div>`;
        })
        .join("");
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px">Photo ${index + 1}</div>
        <img src="${escapeHtml(photo.dataUrl)}" alt="${escapeHtml(caption || `Photo ${index + 1}`)}" style="display:block;width:100%;max-width:560px;border-radius:12px;border:1px solid #e2e8f0" />
        ${caption ? `<p style="margin:8px 0 0;color:#334155;font-size:13px">${escapeHtml(caption)}</p>` : ""}
        ${legend || `<p style="margin:6px 0 0;color:#94a3b8;font-size:12px">Site photo — open the online report for colored highlight overlays.</p>`}
      </td></tr>`;
    })
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
          ${
            photoRows
              ? `<h2 style="margin:28px 0 8px;font-size:18px;color:#0f172a">Photo evidence</h2>
          <p style="color:#64748b;font-size:13px;margin:0 0 12px">Colored highlight boxes appear on the online report link. Legend of findings:</p>
          <table width="100%" cellspacing="0" cellpadding="0">${photoRows}</table>`
              : ""
          }
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
