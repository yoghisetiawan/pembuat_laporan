import { runPipeline } from "@/lib/ai/pipeline";
import { friendlyError, hasAnthropicKey } from "@/lib/ai/client";
import type { GenerateRequest, PipelineEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!hasAnthropicKey()) {
    return Response.json({ error: "ANTHROPIC_API_KEY belum diatur di server (.env.local)." }, { status: 500 });
  }
  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return Response.json({ error: "Badan permintaan tidak valid atau terlalu besar." }, { status: 400 });
  }
  const hasInput =
    body.attachments?.length || body.text?.trim() || body.transcript?.trim() || body.clarifications?.length;
  if (!hasInput) {
    return Response.json({ error: "Masukkan minimal satu sumber data (gambar, PDF, audio, atau teks)." }, { status: 400 });
  }

  const enc = new TextEncoder();
  const ctrl = new AbortController();
  request.signal.addEventListener("abort", () => ctrl.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: PipelineEvent) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* klien sudah menutup koneksi */
        }
      };
      // detak agar koneksi tidak diputus proxy saat model berpikir lama
      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {}
      }, 15000);
      try {
        await runPipeline(body, emit, ctrl.signal);
      } catch (e) {
        emit({ type: "error", message: friendlyError(e) });
      } finally {
        clearInterval(ping);
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      ctrl.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
