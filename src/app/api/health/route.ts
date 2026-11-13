import { MODEL, hasAIKey } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function GET() {
  const ok = hasAIKey();
  return Response.json({ ai: ok, model: MODEL, transcription: ok });
}
