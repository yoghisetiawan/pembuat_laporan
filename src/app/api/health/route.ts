import { MODEL, hasAnthropicKey } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    anthropic: hasAnthropicKey(),
    model: MODEL,
    transcription: Boolean(process.env.GEMINI_API_KEY),
  });
}
