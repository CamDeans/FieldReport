import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import { sendReportEmail } from "@/lib/services/email-service";

type SendBody = { to?: string; subject?: string; message?: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  try {
    let body: SendBody = {};
    try {
      body = await readJson<SendBody>(request);
    } catch {
      body = {};
    }
    const { job, report } = await session.repo.sendReport(session.userId, id, body);
    const workspace = await session.repo.getWorkspace(session.userId);
    const profile = workspace.profiles[0];
    const photos = workspace.photos.filter((p) => p.jobId === id);
    const email = await sendReportEmail({
      job,
      report,
      profile,
      photos,
      to: body.to,
      subject: body.subject,
      message: body.message,
    });
    return jsonOk({ job, report, email });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not send report");
  }
}
