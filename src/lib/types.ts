// Tipe data bersama antara klien dan server.

export type Depth = "cepat" | "standar" | "mendalam";

export interface Attachment {
  id: string;
  name: string;
  mediaType: string; // image/jpeg, image/png, application/pdf
  data: string; // base64 tanpa prefix data:
  size: number;
  role: "dokumentasi" | "dokumen" | "pdf";
  path?: string; // lokasi di Supabase Storage (bila tersimpan di cloud)
}

export interface UnitProfile {
  kopBaris: string[]; // baris kop surat, dari atas ke bawah
  alamat: string;
  kota: string;
  penandatanganJabatan: string;
  penandatanganNama: string;
  penandatanganPangkatNrp: string;
  pelapor: string; // nama/pangkat pelapor default untuk LI
  kepada: string[]; // tujuan laporan
  distribusi: string[]; // tembusan / distribusi
  wilayah: string; // wilayah hukum, dipakai sebagai konteks AI
}

export interface Clarification {
  pertanyaan: string;
  jawaban: string;
}

export interface GenerateRequest {
  templateId: string;
  attachments: Attachment[];
  text: string;
  transcript: string;
  instruction: string;
  depth: Depth;
  profile: UnitProfile;
  reportDate: string; // ISO date
  clarifications?: Clarification[];
  previousReport?: Record<string, string>; // untuk Laporan Kemajuan / pengayaan
}

// ===== Hasil analisis AI (tahap 1) =====
export type Keyakinan = "tinggi" | "sedang" | "rendah";
export type Cakupan = "lengkap" | "sebagian" | "kosong";

export interface Fakta {
  id: string;
  pernyataan: string;
  dimensi: "siapa" | "apa" | "kapan" | "dimana" | "mengapa" | "bagaimana" | "lainnya";
  sumber: string;
  keyakinan: Keyakinan;
}

export interface Analysis {
  ringkasan: string;
  jenis_peristiwa: string;
  bidang_utama: "Politik" | "Ekonomi" | "Sosial Budaya" | "Keamanan" | "Lainnya";
  fakta: Fakta[];
  kronologi: { waktu: string; peristiwa: string }[];
  entitas: {
    orang: string[];
    organisasi: string[];
    lokasi: string[];
    waktu: string[];
    angka_penting: string[];
  };
  cakupan_5w1h: Record<"siapa" | "apa" | "kapan" | "dimana" | "mengapa" | "bagaimana", Cakupan>;
  kontradiksi: string[];
  celah_informasi: { aspek: string; pertanyaan: string; prioritas: "tinggi" | "sedang" | "rendah" }[];
  penilaian_sumber: {
    keandalan: "A" | "B" | "C" | "D" | "E" | "F";
    kebenaran: "1" | "2" | "3" | "4" | "5" | "6";
    alasan: string;
  };
  penilaian_risiko: {
    tingkat: "rendah" | "sedang" | "tinggi" | "kritis";
    faktor: string[];
    potensi_eskalasi: string;
    indikator_pantau: string[];
  };
  hipotesis_alternatif: string[];
}

// ===== Hasil verifikasi (tahap 3) =====
export interface ReviewFinding {
  field: string;
  jenis: "klaim_tanpa_dasar" | "fakta_terlewat" | "inkonsistensi" | "bahasa" | "format" | "analisis_dangkal";
  tingkat: "kritis" | "mayor" | "minor";
  masalah: string;
  saran: string;
}

export interface Review {
  skor: {
    akurasi: number;
    kelengkapan: number;
    kejelasan: number;
    kepatuhan_format: number;
    kedalaman_analisis: number;
  };
  temuan: ReviewFinding[];
  perlu_revisi: boolean;
  catatan_umum: string;
}

// ===== Event streaming pipeline =====
export type StageId = "analisis" | "draf" | "verifikasi" | "revisi" | "final";

export type PipelineEvent =
  | { type: "stage"; stage: StageId; status: "start" | "done"; label: string; detail?: string }
  | { type: "thinking"; stage: StageId; text: string }
  | { type: "progress"; stage: StageId; chars: number }
  | { type: "analysis"; data: Analysis }
  | { type: "draft"; fields: Record<string, string> }
  | { type: "review"; round: number; data: Review }
  | { type: "final"; fields: Record<string, string>; review: Review | null; analysis: Analysis; usage: Usage }
  | { type: "error"; message: string };

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  calls: number;
}

// ===== Riwayat =====
export interface ReportRecord {
  id: string;
  templateId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  meta: ReportMeta;
  fields: Record<string, string>;
  analysis: Analysis | null;
  review: Review | null;
  sourcesSummary: string;
  attachments?: Attachment[]; // hanya dokumentasi (untuk lampiran DOCX)
}

export interface ReportMeta {
  nomor: string;
  tanggal: string; // ISO
  klasifikasi: "BIASA" | "TERBATAS" | "RAHASIA";
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  edits?: { field: string; nilai_baru: string; alasan: string; applied?: boolean }[];
}
