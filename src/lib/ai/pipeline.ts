import "server-only";
import type { Analysis, Depth, GenerateRequest, PipelineEvent, Review, StageId } from "@/lib/types";
import { getTemplate, type TemplateDef } from "@/lib/templates";
import { newUsage, runStructured, type Effort } from "./client";
import { AnalysisSchema, ReviewSchema, draftSchema } from "./schemas";
import {
  analysisInstruction,
  draftInstruction,
  reviewInstruction,
  revisionInstruction,
  sourceBlocks,
  systemBlocks,
} from "./prompts";

const DEPTH: Record<Depth, { analysis: Effort; draft: Effort; review: Effort; maxRevisions: number }> = {
  cepat: { analysis: "low", draft: "low", review: "low", maxRevisions: 0 },
  standar: { analysis: "medium", draft: "medium", review: "medium", maxRevisions: 1 },
  mendalam: { analysis: "high", draft: "high", review: "high", maxRevisions: 2 },
};

/**
 * Model kadang menulis daftar bernomor dalam satu baris ("1. ... 2. ...").
 * Pecah menjadi satu butir per baris agar editor & DOCX menampilkannya benar.
 */
export function normalizeDraft(t: TemplateDef, draft: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...draft };
  for (const f of t.fields) {
    let v = (out[f.key] ?? "").replace(/\r/g, "").trim();
    if (f.kind === "list" && /^1[.)]\s/.test(v)) {
      // pisahkan sebelum "2. ", "3. ", ... (bukan angka desimal seperti 09.00 atau 15.000)
      v = v.replace(/[ \t]+(?=(?:[2-9]|[1-9]\d)[.)]\s)/g, "\n");
      // sub-butir "a. b. c." yang menempel pada baris yang sama
      v = v.replace(/[ \t]+(?=[a-h][.)]\s+[A-Z])/g, "\n   ");
    }
    out[f.key] = v;
  }
  return out;
}

function avgScore(r: Review) {
  const s = r.skor;
  return (s.akurasi + s.kelengkapan + s.kejelasan + s.kepatuhan_format + s.kedalaman_analisis) / 5;
}

/**
 * Pipeline multi-tahap:
 *  1. Analisis bukti (fakta atomik, 5W1H, kontradiksi, celah, nilai sumber, risiko)
 *  2. Penyusunan draf sesuai template
 *  3. Verifikasi mutu terhadap sumber asli (deteksi halusinasi & fakta terlewat)
 *  4. Revisi terarah (berulang sesuai kedalaman) hingga lolos verifikasi
 */
export async function runPipeline(
  req: GenerateRequest,
  emit: (e: PipelineEvent) => void,
  signal: AbortSignal,
) {
  const t = getTemplate(req.templateId);
  const cfg = DEPTH[req.depth] ?? DEPTH.standar;
  const usage = newUsage();
  const system = systemBlocks();
  const sources = sourceBlocks(req, t);

  const hooks = (stage: StageId) => ({
    onThinking: (text: string) => emit({ type: "thinking", stage, text }),
    onProgress: (chars: number) => emit({ type: "progress", stage, chars }),
    signal,
    usage,
    system,
  });

  // 1. Analisis
  emit({ type: "stage", stage: "analisis", status: "start", label: "Menganalisis bukti & mengekstrak fakta" });
  const analysis = (await runStructured({
    ...hooks("analisis"),
    content: [...sources, analysisInstruction()],
    schema: AnalysisSchema,
    effort: cfg.analysis,
  })) as Analysis;
  emit({ type: "analysis", data: analysis });
  emit({
    type: "stage",
    stage: "analisis",
    status: "done",
    label: "Analisis bukti selesai",
    detail: `${analysis.fakta.length} fakta, ${analysis.celah_informasi.length} celah informasi, risiko ${analysis.penilaian_risiko.tingkat}`,
  });

  // 2. Draf
  emit({ type: "stage", stage: "draf", status: "start", label: `Menyusun draf ${t.title}` });
  const schema = draftSchema(t);
  let draft = (await runStructured({
    ...hooks("draf"),
    content: [...sources, draftInstruction(t, analysis)],
    schema,
    effort: cfg.draft,
  })) as Record<string, string>;
  draft = normalizeDraft(t, draft);
  emit({ type: "draft", fields: draft });
  emit({ type: "stage", stage: "draf", status: "done", label: "Draf tersusun" });

  // 3–4. Verifikasi & revisi
  let review: Review | null = null;
  for (let round = 0; round <= cfg.maxRevisions; round++) {
    emit({
      type: "stage",
      stage: "verifikasi",
      status: "start",
      label: round === 0 ? "Memverifikasi draf terhadap sumber" : `Verifikasi ulang (putaran ${round + 1})`,
    });
    review = (await runStructured({
      ...hooks("verifikasi"),
      content: [...sources, reviewInstruction(t, analysis, draft)],
      schema: ReviewSchema,
      effort: cfg.review,
    })) as Review;
    emit({ type: "review", round, data: review });
    const score = Math.round(avgScore(review));
    emit({
      type: "stage",
      stage: "verifikasi",
      status: "done",
      label: `Skor mutu ${score}/100`,
      detail: `${review.temuan.length} temuan`,
    });

    // Klaim tanpa dasar (isi karangan) selalu direvisi, berapa pun tingkatnya
    const needs =
      review.perlu_revisi || review.temuan.some((f) => f.tingkat !== "minor" || f.jenis === "klaim_tanpa_dasar");
    if (!needs || round === cfg.maxRevisions) break;

    emit({ type: "stage", stage: "revisi", status: "start", label: `Merevisi ${review.temuan.length} temuan` });
    draft = (await runStructured({
      ...hooks("revisi"),
      content: [...sources, revisionInstruction(t, draft, review)],
      schema,
      effort: cfg.draft,
    })) as Record<string, string>;
    draft = normalizeDraft(t, draft);
    emit({ type: "draft", fields: draft });
    emit({ type: "stage", stage: "revisi", status: "done", label: "Revisi diterapkan" });
  }

  emit({ type: "final", fields: draft, review, analysis, usage });
}
