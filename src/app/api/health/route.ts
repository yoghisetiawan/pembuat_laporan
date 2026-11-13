import { MODEL, hasAnthropicKey } from "@/lib/ai/client";
import { supabaseEnabled } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    anthropic: hasAnthropicKey(),
    model: MODEL,
    transcription: Boolean(process.env.GEMINI_API_KEY),
    supabase: supabaseEnabled,
  });
}
