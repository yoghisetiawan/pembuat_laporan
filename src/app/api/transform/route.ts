import { friendlyError, hasAIKey, newUsage, runText } from "@/lib/ai/client";
import { systemBlocks } from "@/lib/ai/prompts";
import { getTemplate } from "@/lib/templates";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODES: Record<string, string> = {
  wa: "Ubah laporan menjadi pesan WhatsApp/Telegram yang ringkas untuk dikirim ke grup pimpinan. Gunakan *tebal* untuk judul dan label, butir bernomor, tanpa Markdown lain. Pertahankan semua fakta kunci (waktu, tempat, pihak, jumlah, tindakan). Awali dengan 'Mohon izin melaporkan,' dan akhiri dengan 'Demikian dilaporkan.'",
  ringkasan:
    "Buat RINGKASAN PIMPINAN (executive brief) maksimal 6 butir: inti peristiwa, tingkat kerawanan, implikasi, dan keputusan/tindakan yang direkomendasikan untuk pimpinan. Bahasa dinas, padat, tanpa Markdown kecuali tanda '-' untuk butir.",
  telegram_singkat:
    "Buat versi SANGAT SINGKAT (maks. 400 karakter) untuk notifikasi cepat: apa, di mana, kapan, situasi terakhir.",
};

export async function POST(request: Request) {
  if (!hasAIKey()) return Response.json({ error: "GEMINI_API_KEY belum diatur." }, { status: 500 });
  const b = (await request.json()) as { templateId: string; fields: Record<string, string>; mode: string; pengirim?: string };
  const t = getTemplate(b.templateId);
  const task = MODES[b.mode];
  if (!task) return Response.json({ error: "Mode tidak dikenal." }, { status: 400 });

  const report = t.fields
    .filter((f) => b.fields[f.key]?.trim())
    .map((f) => `## ${f.label}\n${b.fields[f.key]}`)
    .join("\n\n");
  try {
    const text = await runText({
      system: systemBlocks(),
      content: [
        {
          text: `<laporan jenis="${t.title}">\n${report}\n</laporan>\n${b.pengirim ? `Pengirim: ${b.pengirim}\n` : ""}\nTugas: ${task}\nJawab hanya dengan hasilnya.`,
        },
      ],
      effort: "low",
      usage: newUsage(),
      signal: request.signal,
      maxTokens: 8000,
    });
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: friendlyError(e) }, { status: 500 });
  }
}
