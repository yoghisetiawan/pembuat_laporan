import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { Usage } from "@/lib/types";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// Fallback sisi server: bila model utama menolak (refusal), API otomatis
// menjalankan ulang permintaan di model cadangan dalam panggilan yang sama.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ maxRetries: 3 });
  return _client;
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export type Block = Anthropic.Beta.BetaContentBlockParam;
export type SystemBlock = Anthropic.Beta.BetaTextBlockParam;

export function newUsage(): Usage {
  return { input: 0, output: 0, cacheRead: 0, calls: 0 };
}

function addUsage(u: Usage, m: Anthropic.Beta.BetaMessage) {
  u.calls += 1;
  u.input += (m.usage.input_tokens ?? 0) + (m.usage.cache_creation_input_tokens ?? 0);
  u.cacheRead += m.usage.cache_read_input_tokens ?? 0;
  u.output += m.usage.output_tokens ?? 0;
}

export class AIError extends Error {}

interface RunOpts {
  system: SystemBlock[];
  content: Block[];
  effort: Effort;
  maxTokens?: number;
  usage: Usage;
  onThinking?: (text: string) => void;
  onProgress?: (chars: number) => void;
  signal?: AbortSignal;
  history?: Anthropic.Beta.BetaMessageParam[];
}

async function streamCall(
  opts: RunOpts,
  outputFormat?: Anthropic.Beta.BetaJSONOutputFormat,
): Promise<Anthropic.Beta.BetaMessage> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...(opts.history ?? []),
    { role: "user", content: opts.content },
  ];
  const stream = anthropic().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: opts.maxTokens ?? 32000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: opts.effort, ...(outputFormat ? { format: outputFormat } : {}) },
      system: opts.system,
      messages,
    },
    { signal: opts.signal },
  );

  let chars = 0;
  let lastReport = 0;
  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      if (event.delta.type === "thinking_delta") {
        opts.onThinking?.(event.delta.thinking);
      } else if (event.delta.type === "text_delta") {
        chars += event.delta.text.length;
        if (chars - lastReport > 400) {
          lastReport = chars;
          opts.onProgress?.(chars);
        }
      }
    }
  }
  const msg = await stream.finalMessage();
  addUsage(opts.usage, msg);

  if (msg.stop_reason === "refusal") {
    throw new AIError(
      "AI menolak memproses permintaan ini karena kebijakan keamanan. Periksa kembali isi sumber atau instruksi.",
    );
  }
  if (msg.stop_reason === "max_tokens") {
    throw new AIError("Keluaran AI terpotong (batas token). Kurangi jumlah sumber atau pilih mode yang lebih ringkas.");
  }
  return msg;
}

function textOf(msg: Anthropic.Beta.BetaMessage): string {
  return msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Panggilan berkeluaran JSON terstruktur yang divalidasi dengan Zod. */
export async function runStructured<T>(opts: RunOpts & { schema: z.ZodType<T> }): Promise<T> {
  const format = zodOutputFormat(opts.schema as never);
  const msg = await streamCall(opts, { type: "json_schema", schema: format.schema });
  try {
    return format.parse(textOf(msg)) as T;
  } catch (e) {
    throw new AIError(`Format keluaran AI tidak valid: ${(e as Error).message.slice(0, 300)}`);
  }
}

/** Panggilan teks bebas (mis. konversi WhatsApp). */
export async function runText(opts: RunOpts): Promise<string> {
  const msg = await streamCall(opts);
  return textOf(msg).trim();
}

/** Penanda galat di dalam stream teks (klien memotong teks di penanda ini). */
export const STREAM_ERROR = "\u0000ERR:";

/** Streaming teks mentah ke klien (untuk aksi per-bagian). */
export function streamText(opts: Omit<RunOpts, "usage">): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic().beta.messages.stream(
          {
            model: MODEL,
            max_tokens: opts.maxTokens ?? 8000,
            betas: [FALLBACK_BETA],
            fallbacks: "default",
            thinking: { type: "adaptive" },
            output_config: { effort: opts.effort },
            system: opts.system,
            messages: [...(opts.history ?? []), { role: "user", content: opts.content }],
          },
          { signal: opts.signal },
        );
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            controller.enqueue(enc.encode(ev.delta.text));
          }
        }
        const msg = await stream.finalMessage();
        if (msg.stop_reason === "refusal") {
          controller.enqueue(enc.encode(`${STREAM_ERROR}AI menolak memproses permintaan ini.`));
        }
        controller.close();
      } catch (e) {
        controller.enqueue(enc.encode(`${STREAM_ERROR}${friendlyError(e)}`));
        controller.close();
      }
    },
  });
}

export function friendlyError(e: unknown): string {
  if (e instanceof AIError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return "Kunci API Anthropic tidak valid. Periksa ANTHROPIC_API_KEY.";
  if (e instanceof Anthropic.RateLimitError) return "Batas permintaan API tercapai. Coba lagi beberapa saat lagi.";
  if (e instanceof Anthropic.BadRequestError) return `Permintaan ditolak API: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return "Gagal terhubung ke layanan AI. Periksa koneksi server.";
  if (e instanceof Anthropic.APIError) return `Galat layanan AI (${e.status}): ${e.message}`;
  if (e instanceof Error && e.name === "AbortError") return "Proses dibatalkan.";
  return e instanceof Error ? e.message : String(e);
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
