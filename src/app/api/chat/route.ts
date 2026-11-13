import { requireUser } from "@/lib/supabase/server";
import { friendlyError, hasAnthropicKey, newUsage, runStructured } from "@/lib/ai/client";
import { systemBlocks } from "@/lib/ai/prompts";
import { ChatReplySchema } from "@/lib/ai/schemas";
import { getTemplate } from "@/lib/templates";
import type { Analysis, ChatTurn } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ChatBody {
  templateId: string;
  fields: Record<string, string>;
  analysis?: Analysis | null;
  history: ChatTurn[];
  message: string;
}

export async function POST(request: Request) {
  const denied = await requireUser();
  if (denied) return denied;
  if (!hasAnthropicKey()) return Response.json({ error: "ANTHROPIC_API_KEY belum diatur." }, { status: 500 });
  const b = (await request.json()) as ChatBody;
  const t = getTemplate(b.templateId);

  const history: Anthropic.Beta.BetaMessageParam[] = b.history.slice(-10).map((h) => ({
    role: h.role,
    content:
      h.role === "assistant" && h.edits?.length
        ? `${h.content}\n\n(Usulan perubahan pada bagian: ${h.edits.map((e) => e.field).join(", ")})`
        : h.content,
  }));
  if (history[0]?.role === "assistant") history.shift();

  const fieldList = t.fields.map((f) => `- ${f.key}: ${f.label}`).join("\n");
  const content = `Anda adalah asisten penyunting yang mendampingi pelapor merevisi laporan "${t.title}".

<laporan_saat_ini>
${JSON.stringify(b.fields, null, 1)}
</laporan_saat_ini>
${b.analysis ? `<analisis_bukti>\n${JSON.stringify({ fakta: b.analysis.fakta, penilaian_risiko: b.analysis.penilaian_risiko, celah_informasi: b.analysis.celah_informasi }, null, 1)}\n</analisis_bukti>\n` : ""}
Key bagian yang valid:
${fieldList}

Pesan pelapor:
<pesan>
${b.message}
</pesan>

Jawab pertanyaannya secara ringkas dan bermanfaat. Bila pelapor meminta perubahan (atau perubahan jelas akan memperbaiki laporan sesuai permintaannya), isi usulan_perubahan dengan isi LENGKAP pengganti untuk tiap bagian yang diubah (gunakan key yang valid). Bila pelapor memberi fakta baru, masukkan ke bagian yang sesuai. Jangan mengarang fakta. Bila hanya bertanya, biarkan usulan_perubahan kosong.`;

  try {
    const reply = await runStructured({
      system: systemBlocks(),
      history,
      content: [{ type: "text", text: content }],
      schema: ChatReplySchema,
      effort: "medium",
      usage: newUsage(),
      signal: request.signal,
      maxTokens: 16000,
    });
    const valid = new Set(t.fields.map((f) => f.key));
    reply.usulan_perubahan = reply.usulan_perubahan.filter((e) => valid.has(e.field));
    return Response.json(reply);
  } catch (e) {
    return Response.json({ error: friendlyError(e) }, { status: 500 });
  }
}
