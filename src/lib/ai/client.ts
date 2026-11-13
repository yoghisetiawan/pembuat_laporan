import "server-only";
import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";
import { z } from "zod";
import type { Usage } from "@/lib/types";

// Satu kunci (GEMINI_API_KEY) untuk seluruh fitur AI: analisis, draf, verifikasi,
// revisi, chat, aksi per-bagian, dan transkripsi audio.
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

let _client: GoogleGenAI | null = null;
export function gemini(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _client;
}

export function hasAIKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export type Effort = "low" | "medium" | "high";
export type Block = Part;
export type History = Content[];

const LEVEL: Record<Effort, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

export function newUsage(): Usage {
  return { input: 0, output: 0, cacheRead: 0, calls: 0 };
}

export class AIError extends Error {}

interface RunOpts {
  system: string;
  content: Block[];
  effort: Effort;
  maxTokens?: number;
  usage: Usage;
  onThinking?: (text: string) => void;
  onProgress?: (chars: number) => void;
  onText?: (delta: string) => void;
  signal?: AbortSignal;
  history?: History;
}

const BLOCKED = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
  FinishReason.IMAGE_SAFETY,
  FinishReason.IMAGE_PROHIBITED_CONTENT,
]);

async function streamCall(opts: RunOpts, jsonSchema?: unknown): Promise<string> {
  const stream = await gemini().models.generateContentStream({
    model: MODEL,
    contents: [...(opts.history ?? []), { role: "user", parts: opts.content }],
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxTokens ?? 32768,
      thinkingConfig: { includeThoughts: true, thinkingLevel: LEVEL[opts.effort] },
      abortSignal: opts.signal,
      ...(jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: jsonSchema } : {}),
    },
  });

  let text = "";
  let lastReport = 0;
  let finish: string | undefined;
  let blockReason: string | undefined;
  let usageMeta: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number } | undefined;

  for await (const chunk of stream) {
    const cand = chunk.candidates?.[0];
    for (const part of cand?.content?.parts ?? []) {
      if (!part.text) continue;
      if (part.thought) {
        opts.onThinking?.(part.text);
      } else {
        text += part.text;
        opts.onText?.(part.text);
        if (text.length - lastReport > 400) {
          lastReport = text.length;
          opts.onProgress?.(text.length);
        }
      }
    }
    if (cand?.finishReason) finish = cand.finishReason;
    if (chunk.promptFeedback?.blockReason) blockReason = chunk.promptFeedback.blockReason;
    if (chunk.usageMetadata) usageMeta = chunk.usageMetadata;
  }

  const u = opts.usage;
  u.calls += 1;
  u.input += usageMeta?.promptTokenCount ?? 0;
  u.cacheRead += usageMeta?.cachedContentTokenCount ?? 0;
  u.output += (usageMeta?.candidatesTokenCount ?? 0) + (usageMeta?.thoughtsTokenCount ?? 0);

  if (blockReason || (finish && BLOCKED.has(finish))) {
    throw new AIError("AI menolak memproses permintaan ini karena filter keamanan. Periksa kembali isi sumber atau instruksi.");
  }
  if (finish === FinishReason.MAX_TOKENS) {
    throw new AIError("Keluaran AI terpotong (batas token). Kurangi jumlah sumber atau pilih mode yang lebih ringkas.");
  }
  if (!text.trim()) throw new AIError("AI tidak mengembalikan jawaban. Coba lagi.");
  return text;
}

function toJsonSchema(schema: z.ZodType): unknown {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

/** Panggilan berkeluaran JSON terstruktur yang divalidasi dengan Zod. */
export async function runStructured<T>(opts: RunOpts & { schema: z.ZodType<T> }): Promise<T> {
  const raw = await streamCall(opts, toJsonSchema(opts.schema));
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AIError("Keluaran AI bukan JSON yang valid. Coba lagi.");
  }
  const out = opts.schema.safeParse(parsed);
  if (!out.success) {
    const issues = out.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new AIError(`Format keluaran AI tidak sesuai skema (${issues}). Coba lagi.`);
  }
  return out.data;
}

/** Panggilan teks bebas (mis. konversi WhatsApp). */
export async function runText(opts: RunOpts): Promise<string> {
  return (await streamCall(opts)).trim();
}

/** Penanda galat di dalam stream teks (klien memotong teks di penanda ini). */
export const STREAM_ERROR = "\u0000ERR:";

/** Streaming teks mentah ke klien (untuk aksi per-bagian). */
export function streamText(opts: Omit<RunOpts, "usage">): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        await streamCall({
          ...opts,
          usage: newUsage(),
          onText: (delta) => controller.enqueue(enc.encode(delta)),
        });
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
  if (e instanceof ApiError) {
    if (e.status === 400 && /api key/i.test(e.message)) return "Kunci API Gemini tidak valid. Periksa GEMINI_API_KEY.";
    if (e.status === 401 || e.status === 403) return "Kunci API Gemini tidak valid atau tidak punya akses ke model ini. Periksa GEMINI_API_KEY.";
    if (e.status === 404) return `Model "${MODEL}" tidak ditemukan. Atur GEMINI_MODEL ke model yang tersedia.`;
    if (e.status === 429) return "Batas kuota/permintaan Gemini tercapai. Coba lagi beberapa saat lagi atau periksa kuota di Google AI Studio.";
    if (e.status >= 500) return "Layanan Gemini sedang bermasalah. Coba lagi beberapa saat lagi.";
    return `Galat layanan AI (${e.status}): ${e.message.slice(0, 300)}`;
  }
  if (e instanceof Error && e.name === "AbortError") return "Proses dibatalkan.";
  if (e instanceof Error && /fetch failed|ENOTFOUND|ECONNRESET/i.test(e.message)) return "Gagal terhubung ke layanan AI. Periksa koneksi internet server.";
  return e instanceof Error ? e.message : String(e);
}
