import { requireUser } from "@/lib/supabase/server";
import { hasAnthropicKey, streamText } from "@/lib/ai/client";
import { REFINE_ACTIONS, systemBlocks } from "@/lib/ai/prompts";
import { getTemplate } from "@/lib/templates";
import type { Analysis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RefineBody {
  templateId: string;
  fieldKey: string;
  value: string;
  action: string;
  instruction?: string;
  fields: Record<string, string>;
  analysis?: Analysis | null;
}

export async function POST(request: Request) {
  const denied = await requireUser();
  if (denied) return denied;
  if (!hasAnthropicKey()) return new Response("ANTHROPIC_API_KEY belum diatur.", { status: 500 });
  const b = (await request.json()) as RefineBody;
  const t = getTemplate(b.templateId);
  const field = t.fields.find((f) => f.key === b.fieldKey);
  if (!field) return new Response("Bagian tidak dikenal.", { status: 400 });

  const task = b.action === "kustom" ? b.instruction?.trim() || "Perbaiki bagian ini." : REFINE_ACTIONS[b.action];
  if (!task) return new Response("Aksi tidak dikenal.", { status: 400 });

  const others = Object.entries(b.fields)
    .filter(([k, v]) => k !== b.fieldKey && v?.trim())
    .map(([k, v]) => `## ${t.fields.find((f) => f.key === k)?.label ?? k}\n${v}`)
    .join("\n\n");
  const facts = b.analysis?.fakta?.map((f) => `${f.id}. ${f.pernyataan} [${f.sumber}]`).join("\n") ?? "";

  const content = `Anda menyunting SATU bagian dari "${t.title}".

<bagian_lain_laporan>
${others || "(kosong)"}
</bagian_lain_laporan>
${facts ? `\n<fakta_terverifikasi>\n${facts}\n</fakta_terverifikasi>\n` : ""}
Bagian yang disunting: "${field.label}" — ketentuan: ${field.guide}
<isi_saat_ini>
${b.value || "(kosong)"}
</isi_saat_ini>

Tugas: ${task}

Jawab HANYA dengan isi baru bagian tersebut, tanpa judul bagian, tanpa pengantar, tanpa penjelasan.${t.format === "wa" ? " Gunakan format WhatsApp (*tebal*)." : " Tanpa Markdown."}`;

  const stream = streamText({
    system: systemBlocks(),
    content: [{ type: "text", text: content }],
    effort: "low",
    signal: request.signal,
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}
