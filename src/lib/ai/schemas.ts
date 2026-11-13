import { z } from "zod";
import type { TemplateDef } from "@/lib/templates";

const lvl = z.enum(["tinggi", "sedang", "rendah"]);
const cak = z.enum(["lengkap", "sebagian", "kosong"]);

export const AnalysisSchema = z.object({
  ringkasan: z.string().describe("Ringkasan situasi 2-3 kalimat"),
  jenis_peristiwa: z.string(),
  bidang_utama: z.enum(["Politik", "Ekonomi", "Sosial Budaya", "Keamanan", "Lainnya"]),
  fakta: z.array(
    z.object({
      id: z.string().describe("F1, F2, ..."),
      pernyataan: z.string(),
      dimensi: z.enum(["siapa", "apa", "kapan", "dimana", "mengapa", "bagaimana", "lainnya"]),
      sumber: z.string().describe("Label sumber persis, mis. 'Gambar 2' atau 'Catatan Teks'"),
      keyakinan: lvl,
    }),
  ),
  kronologi: z.array(z.object({ waktu: z.string(), peristiwa: z.string() })),
  entitas: z.object({
    orang: z.array(z.string()),
    organisasi: z.array(z.string()),
    lokasi: z.array(z.string()),
    waktu: z.array(z.string()),
    angka_penting: z.array(z.string()),
  }),
  cakupan_5w1h: z.object({
    siapa: cak,
    apa: cak,
    kapan: cak,
    dimana: cak,
    mengapa: cak,
    bagaimana: cak,
  }),
  kontradiksi: z.array(z.string()),
  celah_informasi: z.array(z.object({ aspek: z.string(), pertanyaan: z.string(), prioritas: lvl })),
  penilaian_sumber: z.object({
    keandalan: z.enum(["A", "B", "C", "D", "E", "F"]),
    kebenaran: z.enum(["1", "2", "3", "4", "5", "6"]),
    alasan: z.string(),
  }),
  penilaian_risiko: z.object({
    tingkat: z.enum(["rendah", "sedang", "tinggi", "kritis"]),
    faktor: z.array(z.string()),
    potensi_eskalasi: z.string(),
    indikator_pantau: z.array(z.string()),
  }),
  hipotesis_alternatif: z.array(z.string()),
});

export function draftSchema(t: TemplateDef) {
  const shape: Record<string, z.ZodString> = {};
  for (const f of t.fields) shape[f.key] = z.string().describe(f.label);
  return z.object(shape);
}

export const ReviewSchema = z.object({
  skor: z.object({
    akurasi: z.number().describe("0-100"),
    kelengkapan: z.number().describe("0-100"),
    kejelasan: z.number().describe("0-100"),
    kepatuhan_format: z.number().describe("0-100"),
    kedalaman_analisis: z.number().describe("0-100"),
  }),
  temuan: z.array(
    z.object({
      field: z.string().describe("key bagian laporan"),
      jenis: z.enum(["klaim_tanpa_dasar", "fakta_terlewat", "inkonsistensi", "bahasa", "format", "analisis_dangkal"]),
      tingkat: z.enum(["kritis", "mayor", "minor"]),
      masalah: z.string(),
      saran: z.string(),
    }),
  ),
  perlu_revisi: z.boolean(),
  catatan_umum: z.string(),
});

export const ChatReplySchema = z.object({
  balasan: z.string().describe("Jawaban untuk pengguna, Markdown ringan"),
  usulan_perubahan: z.array(
    z.object({
      field: z.string().describe("key bagian laporan yang diubah"),
      nilai_baru: z.string().describe("Isi lengkap pengganti untuk bagian tersebut"),
      alasan: z.string(),
    }),
  ),
});
