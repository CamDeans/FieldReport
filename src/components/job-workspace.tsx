"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Camera, Copy, ExternalLink, FileText, FileUp, Link2, Printer, Send, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { ReportPreview } from "./report-preview";
import { VoiceNoteButton } from "./voice-note";
import { JobTypeSelect } from "./job-type-select";
import { ContactEmailField } from "./contact-email-field";
import { EmailComposeDialog } from "./email-compose";
import { useStore } from "@/lib/store";
import { STATUS_CONFIG } from "@/lib/job-catalog";
import { fileToDataUrl } from "@/lib/utils";
import { formatReportPlainText } from "@/lib/report-engine";
import { buildReportEmailHtml } from "@/lib/email-html";
import { reportSharePath } from "@/lib/public-report";
import { isNativeApp } from "@/lib/native/platform";
import { shareOrCopyText } from "@/lib/native/shell";

export function JobWorkspace({ jobId }: { jobId: string }) {
  const router = useRouter();
  const store = useStore();

  useEffect(() => {
    void store.refreshWorkspace();
    // Refresh when navigating between jobs — not on every store identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);
  const job = store.jobs.find((item) => item.id === jobId);
  const photos = store.state.photos.filter((photo) => photo.jobId === jobId);
  const documents = (store.state.documents ?? []).filter((doc) => doc.jobId === jobId);
  const report = store.state.reports.find((item) => item.jobId === jobId);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  /** True when photos/notes/PDFs changed after the current report was generated. */
  const [evidenceDirty, setEvidenceDirty] = useState(false);
  /** Photo id to attach notes to, or "job-notes". null = latest photo (or job notes if none). */
  const [noteTargetId, setNoteTargetId] = useState<string | "job-notes" | null>(null);

  if (!job || !store.profile) {
    return (
      <div className="p-8 text-center" data-testid="job-missing">
        <p className="text-slate-600 mb-4">Job not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to jobs</Link>
        </Button>
      </div>
    );
  }

  const currentJob = job;
  const profile = store.profile;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      await store.addPhoto(currentJob.id, dataUrl);
    }
    if (report) setEvidenceDirty(true);
    toast.success(`${files.length} photo${files.length === 1 ? "" : "s"} added`);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Native: Capacitor Camera (camera or library). Web: file input with capture. */
  async function addPhotos() {
    if (isNativeApp()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
        let added = 0;
        for (;;) {
          const photo = await Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: added === 0 ? CameraSource.Prompt : CameraSource.Camera,
            correctOrientation: true,
          });
          if (!photo.dataUrl) break;
          await store.addPhoto(currentJob.id, photo.dataUrl);
          added += 1;
          if (added >= 8) break;
          const again = window.confirm("Photo added. Capture another?");
          if (!again) break;
        }
        if (added) {
          if (report) setEvidenceDirty(true);
          toast.success(`${added} photo${added === 1 ? "" : "s"} added`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/cancel/i.test(message)) return;
        toast.error(message || "Couldn’t open the camera. Try again or use the file picker.");
        fileRef.current?.click();
      }
      return;
    }
    fileRef.current?.click();
  }

  async function onPdfs(files: FileList | null) {
    if (!files?.length) return;
    let emptyExtract = 0;
    let ocrCount = 0;
    for (const file of Array.from(files)) {
      if (file.type && !file.type.includes("pdf")) {
        toast.error(`${file.name} is not a PDF`);
        continue;
      }
      const dataUrl = await fileToDataUrl(file);
      const document = await store.addDocument(currentJob.id, {
        dataUrl,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
      });
      if (document.extractionSource === "ocr") ocrCount += 1;
      else if (!document.extractedText?.trim()) emptyExtract += 1;
    }
    if (report) setEvidenceDirty(true);
    if (emptyExtract) {
      toast.error(
        emptyExtract === 1
          ? "PDF saved, but OCR couldn’t recover text. Paste key headings into job notes."
          : `${emptyExtract} PDF(s) had no recoverable text. Paste key headings into job notes.`
      );
    } else if (ocrCount) {
      toast.success(
        ocrCount === 1
          ? "Scanned PDF recovered via OCR — OpenAI will align the next report to it"
          : `${ocrCount} scanned PDFs recovered via OCR`
      );
    } else {
      toast.success("PDF uploaded — OpenAI will align the next report to this reference");
    }
    if (pdfRef.current) pdfRef.current.value = "";
  }

  /**
   * Voice/typed notes become field evidence for OpenAI on the next generate/regenerate.
   * Target: selected photo, or job notes, or latest photo / job notes fallback.
   */
  async function applyNote(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const explicitPhoto =
      noteTargetId && noteTargetId !== "job-notes" ? photos.find((p) => p.id === noteTargetId) : null;
    const useJobNotes = noteTargetId === "job-notes" || (!explicitPhoto && photos.length === 0);
    const target = explicitPhoto ?? (!useJobNotes ? photos[photos.length - 1] : null);

    if (target) {
      const next = [target.transcription, trimmed].filter(Boolean).join(" ");
      await store.updatePhoto(target.id, { transcription: next });
      setNoteDraft("");
      if (report) setEvidenceDirty(true);
      const label = photos.findIndex((p) => p.id === target.id) + 1;
      toast.success(
        report
          ? `Note on photo ${label} — regenerate (free) so OpenAI updates the report`
          : `Field note attached to photo ${label}`
      );
      return;
    }

    const nextNotes = [currentJob.notes, trimmed].filter(Boolean).join("\n");
    await store.updateJob(currentJob.id, { notes: nextNotes });
    setNoteDraft("");
    if (report) setEvidenceDirty(true);
    toast.success(
      report
        ? "Note saved to job notes — regenerate (free) so OpenAI updates the report"
        : "Note saved to job notes (no photo yet). Add photos when you can."
    );
  }

  async function generate() {
    setBusy(true);
    const wasRegen = Boolean(report);
    const result = await store.generateReport(currentJob.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      if (result.error?.toLowerCase().includes("limit")) setLimitHit(true);
      return;
    }
    setLimitHit(false);
    setEvidenceDirty(false);
    toast.success(
      wasRegen
        ? `Report updated (v${result.report?.version ?? "—"}) — regenerates don’t use report credits`
        : "Report generated"
    );
  }

  function openCompose() {
    if (!report) {
      toast.error("Generate a report first");
      return;
    }
    setComposeOpen(true);
  }

  async function sendComposed(payload: { to: string; subject: string; message: string }) {
    const result = await store.sendReport(currentJob.id, payload);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setComposeOpen(false);
    toast.success(`Report queued to ${payload.to}`);
    setEmailOpen(true);
  }

  async function copyShare() {
    if (!report) return;
    const url = `${window.location.origin}${reportSharePath(report.id)}`;
    try {
      const result = await shareOrCopyText({
        title: report.content.title,
        text: `Field report for ${currentJob.customerName}`,
        url,
      });
      toast.success(result.mode === "share" ? "Share sheet opened" : "Customer link copied");
    } catch {
      toast.error("Couldn’t share the customer link");
    }
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(formatReportPlainText(currentJob, profile, report.content));
    toast.success("Report copied");
  }

  async function duplicate() {
    const copy = await store.duplicateJob(currentJob.id);
    if (copy) {
      toast.success("Job duplicated");
      router.push(`/dashboard/jobs/${copy.id}`);
    }
  }

  async function remove() {
    if (!confirm("Delete this job and its photos/reports?")) return;
    await store.deleteJob(currentJob.id);
    toast.success("Job deleted");
    router.push("/dashboard");
  }

  const status = STATUS_CONFIG[currentJob.status];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div className="flex flex-wrap items-center gap-3 no-print">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4" /> Jobs
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{currentJob.customerName}</h1>
        <Badge className={status.className}>{status.label}</Badge>
        {report?.sentAt && <Badge className="bg-violet-100 text-violet-800">Sent</Badge>}
        {report?.readAt && (
          <Badge className="bg-emerald-100 text-emerald-800" data-testid="read-receipt">
            Customer opened
          </Badge>
        )}
      </div>

      {limitHit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm no-print" data-testid="limit-banner">
          Monthly report limit reached.{" "}
          <Link href="/dashboard/billing" className="font-semibold text-primary">
            Upgrade your plan
          </Link>{" "}
          to keep generating reports.
        </div>
      )}

      {report && evidenceDirty && (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm no-print flex flex-wrap items-center justify-between gap-3"
          data-testid="evidence-dirty-banner"
        >
          <p>
            Photos, notes, or PDFs changed since this report was generated. Regenerate so OpenAI rewrites from the latest
            evidence.
          </p>
          <Button size="sm" onClick={generate} disabled={busy} data-testid="regenerate-from-banner">
            Regenerate now
          </Button>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-5 no-print">
        <h2 className="font-semibold mb-4">Job details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Customer"
            value={currentJob.customerName}
            onChange={(value) => void store.updateJob(currentJob.id, { customerName: value })}
          />
          <ContactEmailField
            email={currentJob.customerEmail ?? ""}
            onEmailChange={(value) => void store.updateJob(currentJob.id, { customerEmail: value || null })}
            onNamePicked={(name) => {
              if (!currentJob.customerName.trim()) void store.updateJob(currentJob.id, { customerName: name });
            }}
            suggestions={store.jobs
              .map((j) => j.customerEmail)
              .filter((e): e is string => Boolean(e?.includes("@")))}
          />
          <Field
            label="Address"
            value={currentJob.address ?? ""}
            onChange={(value) => void store.updateJob(currentJob.id, { address: value || null })}
          />
          <div className="space-y-2">
            <Label htmlFor="jobType">Report scope</Label>
            <JobTypeSelect
              id="jobType"
              value={currentJob.jobType}
              onChange={(value) => void store.updateJob(currentJob.id, { jobType: value })}
              profile={profile}
            />
            {report && <p className="text-xs text-slate-500">Regenerate after changing scope so the AI rewrites sections for this job.</p>}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="notes">Job notes / trade context</Label>
          <Textarea
            id="notes"
            value={currentJob.notes}
            onChange={(event) => {
              void store.updateJob(currentJob.id, { notes: event.target.value });
              if (report) setEvidenceDirty(true);
            }}
            placeholder="Trade, focus areas, weather, customer concerns…"
          />
          <p className="text-xs text-slate-500">
            Job notes and voice/typed field notes are sent to OpenAI with any reference PDFs when you generate.
          </p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 no-print" data-testid="pdf-section">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-semibold">Reference PDFs</h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload a prior report, insurer form, or checklist. OpenAI aligns structure and tone to the extracted text.
              Voice and typed notes update <em>findings</em> — they do not rewrite the PDF file. Regenerate after changes.
            </p>
          </div>
          <Button variant="outline" onClick={() => pdfRef.current?.click()} data-testid="add-pdf-button">
            <FileUp className="w-4 h-4" /> Upload PDF
          </Button>
          <input
            ref={pdfRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            data-testid="pdf-input"
            onChange={(event) => void onPdfs(event.target.files)}
          />
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No PDFs yet. Optional — photos and notes alone also work.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => {
              const hasText = Boolean(doc.extractedText?.trim());
              const source = doc.extractionSource;
              return (
                <li key={doc.id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{doc.fileName}</div>
                    <div className="text-xs text-slate-500">
                      {hasText
                        ? `${doc.extractedText.slice(0, 80)}${doc.extractedText.length > 80 ? "…" : ""}`
                        : "No recoverable text — paste key headings into job notes."}
                    </div>
                    {source === "ocr" && (
                      <Badge className="mt-1 bg-emerald-100 text-emerald-900" data-testid="pdf-ocr-text">
                        OCR recovered
                      </Badge>
                    )}
                    {!hasText && (
                      <Badge className="mt-1 bg-amber-100 text-amber-900" data-testid="pdf-empty-text">
                        Weak alignment
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Delete PDF"
                    data-testid="delete-pdf"
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => {
                      void store.deleteDocument(doc.id);
                      if (report) setEvidenceDirty(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-semibold">Photos & field notes</h2>
          <Button variant="outline" onClick={() => void addPhotos()} data-testid="add-photos-button">
            <Camera className="w-4 h-4" /> Add photos
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            data-testid="photo-input"
            onChange={(event) => onFiles(event.target.files)}
          />
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Add photos when you can. You can still save voice/typed notes to job notes, or generate from a reference PDF
            alone.
          </p>
        ) : (
          <div className="space-y-4">
            {photos.map((photo, index) => {
              const selected =
                noteTargetId === photo.id ||
                (noteTargetId === null && index === photos.length - 1 && noteTargetId !== "job-notes");
              return (
                <div
                  key={photo.id}
                  className={`flex gap-4 border rounded-xl p-3 ${selected ? "border-primary ring-1 ring-primary/30" : "border-slate-100"}`}
                  data-testid={`photo-card-${index}`}
                >
                  <button
                    type="button"
                    className="shrink-0 relative"
                    data-testid={`select-photo-${index}`}
                    aria-pressed={selected}
                    aria-label={`Select photo ${index + 1} for notes`}
                    onClick={() => setNoteTargetId(photo.id)}
                  >
                    {/* Demo photos are data URLs; next/image is unnecessary here */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.dataUrl} alt={`Photo ${index + 1}`} className="w-24 h-24 rounded-lg object-cover" />
                    {selected && (
                      <span className="absolute bottom-1 left-1 right-1 text-[10px] font-semibold bg-primary text-white rounded px-1 py-0.5">
                        Note target
                      </span>
                    )}
                  </button>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold uppercase text-slate-500">Photo {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          void store.deletePhoto(photo.id);
                          if (noteTargetId === photo.id) setNoteTargetId(null);
                          if (report) setEvidenceDirty(true);
                        }}
                        aria-label="Delete photo"
                        data-testid="delete-photo"
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      placeholder="Caption what you see"
                      value={photo.caption}
                      onChange={(event) => {
                        void store.updatePhoto(photo.id, { caption: event.target.value });
                        if (report) setEvidenceDirty(true);
                      }}
                    />
                    <Textarea
                      placeholder="Voice note transcription or typed field note"
                      value={photo.transcription}
                      onChange={(event) => {
                        void store.updatePhoto(photo.id, { transcription: event.target.value });
                        if (report) setEvidenceDirty(true);
                      }}
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500">Attach notes to:</span>
          <Button
            type="button"
            size="sm"
            variant={noteTargetId === "job-notes" || (photos.length === 0 && noteTargetId !== null) ? "default" : "outline"}
            data-testid="note-target-job"
            onClick={() => setNoteTargetId("job-notes")}
          >
            Job notes
          </Button>
          {photos.length > 0 && noteTargetId !== null && noteTargetId !== "job-notes" && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setNoteTargetId(null)}>
              Latest photo (default)
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <Textarea
            id="field-note-draft"
            placeholder="Type a field note (targets selected photo or job notes)"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
          />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={() => applyNote(noteDraft)} data-testid="attach-note">
              Attach note
            </Button>
            <VoiceNoteButton onTranscript={(text) => applyNote(text)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Tap a photo to choose where notes go. Notes do not edit the uploaded PDF. Regenerating is free and keeps
          version history.
        </p>
      </section>

      <div className="flex flex-wrap gap-2 no-print">
        <Button onClick={generate} disabled={busy} data-testid="generate-report">
          <FileText className="w-4 h-4" />{" "}
          {report ? `Regenerate report (v${report.version ?? 1} → free)` : "Generate report"}
        </Button>
        <Button variant="outline" onClick={openCompose} disabled={!report} data-testid="send-report">
          <Send className="w-4 h-4" /> Email to customer
        </Button>
        <Button variant="outline" onClick={() => window.print()} disabled={!report} data-testid="print-report">
          <Printer className="w-4 h-4" /> Print / PDF
        </Button>
        <Button variant="outline" onClick={copyShare} disabled={!report} data-testid="copy-share">
          <Link2 className="w-4 h-4" /> Copy customer link
        </Button>
        <Button variant="outline" onClick={copyReport} disabled={!report} data-testid="copy-report">
          <Copy className="w-4 h-4" /> Copy report
        </Button>
        {report && (
          <Button asChild variant="outline">
            <Link href={reportSharePath(report.id)} data-testid="customer-view">
              <ExternalLink className="w-4 h-4" /> Customer view
            </Link>
          </Button>
        )}
        <Button variant="ghost" onClick={duplicate} data-testid="duplicate-job">
          Duplicate
        </Button>
        <Button variant="destructive" onClick={remove} data-testid="delete-job">
          Delete
        </Button>
      </div>

      {report && <ReportPreview job={currentJob} profile={profile} report={report} />}

      {composeOpen && report && (
        <EmailComposeDialog
          defaultTo={currentJob.customerEmail ?? ""}
          defaultSubject={`${profile.companyName || profile.fullName} — ${report.content.title}`}
          customerName={currentJob.customerName}
          onCancel={() => setComposeOpen(false)}
          onSend={sendComposed}
        />
      )}

      {emailOpen && report && (
        <div
          role="dialog"
          aria-labelledby="email-preview-title"
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 no-print"
          data-testid="email-preview"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 id="email-preview-title" className="font-semibold">
                Email queued to {currentJob.customerEmail}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setEmailOpen(false)}>
                Close
              </Button>
            </div>
            <iframe
              title="Report email preview"
              className="w-full flex-1 min-h-[420px] bg-slate-50"
              srcDoc={buildReportEmailHtml(currentJob, profile, report.content)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
