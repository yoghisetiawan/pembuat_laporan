import { createPartFromUri, createUserContent } from "@google/genai";
import { MODEL, gemini, hasAIKey } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 300;

const PROMPT = `Transkripsikan rekaman audio berbahasa Indonesia ini secara verbatim dan akurat.
- Tandai pergantian pembicara sebagai "Pembicara 1:", "Pembicara 2:", dst. (gunakan jabatan/nama bila disebut, mis. "Camat:").
- Sisipkan penanda waktu [mm:ss] di awal setiap pergantian pembicara.
- Pertahankan nama orang, instansi, angka, dan istilah persis seperti diucapkan.
- Tulis [tidak jelas] untuk bagian yang tidak terdengar.
Keluarkan hanya transkripnya.`;

export async function POST(request: Request) {
  if (!hasAIKey()) {
    return Response.json({ error: "GEMINI_API_KEY belum diatur di server (.env.local)." }, { status: 500 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) return Response.json({ error: "Berkas audio tidak ditemukan." }, { status: 400 });

  const mimeType = file.type || "audio/mpeg";
  const ai = gemini();
  const model = MODEL;
  try {
    let parts;
    if (file.size > 15 * 1024 * 1024) {
      const uploaded = await ai.files.upload({ file, config: { mimeType } });
      if (!uploaded.uri) throw new Error("Unggah berkas ke layanan transkripsi gagal.");
      parts = [createPartFromUri(uploaded.uri, uploaded.mimeType ?? mimeType), PROMPT];
    } else {
      const data = Buffer.from(await file.arrayBuffer()).toString("base64");
      parts = [{ inlineData: { mimeType, data } }, PROMPT];
    }
    const res = await ai.models.generateContent({ model, contents: createUserContent(parts) });
    return Response.json({ text: (res.text ?? "").trim() });
  } catch (e) {
    return Response.json({ error: `Transkripsi gagal: ${(e as Error).message}` }, { status: 500 });
  }
}
