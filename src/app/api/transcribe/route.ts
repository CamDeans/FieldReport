import { jsonError, jsonOk } from "@/lib/api/http";
import { isOpenAiConfigured } from "@/lib/config";
import { requireSession } from "@/lib/repositories";
import { transcribeAudioWithOpenAi } from "@/lib/services/ai-report";

export async function POST(request: Request) {
  if (!isOpenAiConfigured()) {
    return jsonError("OpenAI is not configured. Type a field note or use on-device speech.", 503);
  }
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob)) return jsonError("Missing audio file");
    const buffer = Buffer.from(await audio.arrayBuffer());
    const text = await transcribeAudioWithOpenAi(buffer, audio.type || "audio/webm");
    if (!text) return jsonError("Could not transcribe audio", 502);
    return jsonOk({ text });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Transcription failed", 500);
  }
}
