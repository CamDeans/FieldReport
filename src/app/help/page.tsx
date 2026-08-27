import Link from "next/link";
import { Brand } from "@/components/brand";
import { countJobTypes } from "@/lib/taxonomy";

export default function HelpPage() {
  const templateCount = countJobTypes();
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 h-16 flex items-center"><Brand /></header>
      <main id="main" className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold">Help</h1>
        <section>
          <h2 className="text-xl font-semibold mb-2">How a report gets made</h2>
          <ol className="list-decimal pl-5 space-y-1 text-slate-700">
            <li>Create a job with the customer name and any report scope (typed freeform or a catalog shortcut).</li>
            <li>
              Optionally upload a <strong>reference PDF</strong> (prior report, checklist, insurer form). We extract its
              text (and OCR scanned pages with OpenAI when needed) so OpenAI can match headings, tone, and coverage —
              the PDF is a template guide, not the report itself.
            </li>
            <li>
              Add site photos and capture findings with voice (Whisper when OpenAI is set, otherwise on-device speech) or
              typed notes. Tap a photo to choose the note target, or save to job notes.
            </li>
            <li>
              Generate the report. OpenAI combines job notes, photo captions/transcriptions, PDF text, and photo vision.
              Regenerating is free, keeps version history, and incrementally updates from new evidence. Review, then
              email (multi-recipient supported) or print.
            </li>
            <li>
              To update findings later, add more voice/typed notes (or another PDF) and <strong>regenerate</strong>. Notes
              never rewrite the uploaded PDF file — they refresh the generated report.
            </li>
          </ol>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">AI-first (taxonomy is fallback only)</h2>
          <p className="text-slate-700">
            With <code className="text-xs bg-slate-100 px-1 rounded">OPENAI_API_KEY</code> set, FieldReport uses OpenAI for report drafting
            (including photo vision), scope suggestions, and Whisper transcription. The curated trade catalog ({templateCount} templates) is only
            a fail-safe when AI is offline — it never limits which trades or scopes you can write.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Demo vs live</h2>
          <p className="text-slate-700">
            Demo and live modes use the same API routes and UI. Without cloud credentials, data persists in{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">.fieldreport/</code> on the server. With Supabase,
            Stripe, Resend, and OpenAI configured, production services activate automatically.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Trade preferences</h2>
          <p className="text-slate-700">
            Onboarding asks which sectors and industries you work in so shortcut suggestions stay relevant. You can still type any custom
            report scope on every job. Update preferences anytime in Settings.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Any trade</h2>
          <p className="text-slate-700">
            There is no closed list. Describe the job in the report scope field (e.g. “Restaurant hood suppression inspection”) or use{" "}
            <strong>AI suggest</strong>. Catalog shortcuts are optional.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Common questions</h2>
          <div className="space-y-2" data-testid="help-faq">
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="font-medium cursor-pointer">Can I type notes if I can’t record voice?</summary>
              <p className="text-sm text-slate-600 mt-2">
                Yes. Voice is optional. Type a field note and attach it — it goes on the latest photo, or into job notes
                if you haven’t added photos yet.
              </p>
            </details>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="font-medium cursor-pointer">Do voice notes update my uploaded PDF?</summary>
              <p className="text-sm text-slate-600 mt-2">
                No. The PDF is a reference for structure. Voice and typed notes become field evidence. Regenerate the
                report so OpenAI rewrites findings using the PDF style plus your new notes.
              </p>
            </details>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="font-medium cursor-pointer">How does the customer see the report?</summary>
              <p className="text-sm text-slate-600 mt-2">Generate the report, then copy the customer link or send it. Opening the link marks the report as read.</p>
            </details>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="font-medium cursor-pointer">Does branding show on reports?</summary>
              <p className="text-sm text-slate-600 mt-2">Add your company name, phone, and logo in Settings. They appear on the report and the customer view.</p>
            </details>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="font-medium cursor-pointer">Can I email the report from the app?</summary>
              <p className="text-sm text-slate-600 mt-2">Yes. After generating, tap Email to customer, pick a contact or type an address, edit the message, and send. Demo mode queues to the server log; live mode uses Resend.</p>
            </details>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="font-medium cursor-pointer">Can I upload a PDF for OpenAI to follow?</summary>
              <p className="text-sm text-slate-600 mt-2">
                Yes. Upload a PDF on the job. We extract text (up to ~24k characters). If the PDF is a scan and OpenAI
                is configured, we OCR page images. OpenAI then aligns the generated report to that structure.
              </p>
            </details>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="font-medium cursor-pointer">Do regenerates use up my monthly report credits?</summary>
              <p className="text-sm text-slate-600 mt-2">
                No. The first generate on a job counts once. Regenerating the same job is free, updates the report with
                new notes/PDFs, and keeps prior versions in history.
              </p>
            </details>
          </div>
        </section>
        <Link href="/" className="text-primary">Back to home</Link>
      </main>
    </div>
  );
}
