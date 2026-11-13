// Definisi template berbasis data. Satu sumber kebenaran untuk:
// skema keluaran AI, editor pratinjau, ekspor DOCX, dan format WhatsApp.

export type FieldKind = "line" | "paragraph" | "list";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  guide: string; // arahan isi untuk AI
  section?: string; // judul bagian (berurutan)
  placeholder?: string;
}

export type TemplateCategory = "Intelijen" | "Harian" | "Perencanaan" | "Pesan Cepat";

export interface TemplateDef {
  id: string;
  title: string;
  short: string;
  category: TemplateCategory;
  icon: string; // nama ikon lucide
  description: string;
  docTitle: string;
  numberFormat: string; // {no} {bulan} {tahun}
  format: "dokumen" | "wa";
  purpose: string; // konteks & aturan khusus template untuk AI
  fields: FieldDef[];
  needsPrevious?: boolean;
}

const FAKTA: FieldDef = {
  key: "fakta_fakta",
  label: "Fakta-Fakta",
  kind: "list",
  section: "FAKTA-FAKTA",
  guide:
    "Daftar bernomor fakta lapangan yang objektif, kronologis, lengkap 5W1H (siapa, apa, kapan, di mana, mengapa, bagaimana). Satu butir = satu fakta. Sertakan angka, nama, waktu, tempat persis seperti di sumber. Tanpa opini.",
};
const ANALISA: FieldDef = {
  key: "analisa",
  label: "Analisa",
  kind: "paragraph",
  section: "ANALISA",
  guide:
    "Analisis intelijen: makna fakta, latar belakang, motif, aktor kunci, keterkaitan dengan situasi kamtibmas wilayah, kerawanan & peluang. Bedakan fakta dan penilaian (gunakan 'diperkirakan', 'diduga', 'berpotensi'). 2–4 paragraf.",
};
const PREDIKSI: FieldDef = {
  key: "prediksi",
  label: "Prediksi / Prognosa",
  kind: "paragraph",
  section: "PREDIKSI",
  guide:
    "Perkiraan perkembangan ke depan (jangka pendek), skenario paling mungkin dan skenario terburuk beserta indikatornya. Realistis dan berbasis analisa.",
};
const LANGKAH: FieldDef = {
  key: "langkah",
  label: "Langkah-Langkah yang Telah Diambil",
  kind: "list",
  section: "LANGKAH-LANGKAH YANG TELAH DIAMBIL",
  guide:
    "Tindakan yang SUDAH dilakukan pelapor/satuan menurut sumber (mis. monitoring, koordinasi, penggalangan). Jika sumber tidak menyebut, tulis langkah standar yang wajar dengan frasa umum (mis. 'Melakukan monitoring dan pendalaman informasi.').",
};
const REKOMENDASI: FieldDef = {
  key: "rekomendasi",
  label: "Rekomendasi / Saran",
  kind: "list",
  section: "REKOMENDASI",
  guide:
    "Saran tindak yang spesifik, dapat dilaksanakan, dan ditujukan kepada fungsi terkait (Intelkam, Sabhara, Binmas, Reskrim, Lantas, Polsek, Pemda/Instansi). Prioritaskan pencegahan.",
};

export const TEMPLATES: TemplateDef[] = [
  {
    id: "laporan-informasi",
    title: "Laporan Informasi",
    short: "LI",
    category: "Intelijen",
    icon: "FileText",
    description: "Format LI resmi dengan pendahuluan, nilai informasi (A–F/1–6), fakta, analisa, prediksi, dan rekomendasi.",
    docTitle: "LAPORAN INFORMASI",
    numberFormat: "R / LI / {no} / {bulan} / {tahun} / Intelkam",
    format: "dokumen",
    purpose:
      "Laporan Informasi (LI) fungsi Intelkam Polri. Nilai informasi menggunakan kode Admiralty (keandalan sumber A–F, kebenaran informasi 1–6), sesuaikan dengan penilaian sumber hasil analisis.",
    fields: [
      { key: "bidang", label: "Bidang", kind: "line", section: "IDENTITAS", guide: "Bidang IPOLEKSOSBUDKAM dalam huruf kapital, mis. 'POLITIK', 'KEAMANAN', 'SOSIAL BUDAYA'." },
      { key: "pendahuluan_sumber", label: "1. Sumber Informasi", kind: "line", section: "PENDAHULUAN", guide: "Biasanya 'Ada pada pelapor.' kecuali sumber menyebut lain." },
      { key: "pendahuluan_hubungan", label: "2. Hubungan Sumber dengan Sasaran", kind: "line", section: "PENDAHULUAN", guide: "Mis. 'Langsung, sumber merupakan warga sekitar lokasi.' / 'Tidak langsung'." },
      { key: "pendahuluan_cara", label: "3. Cara Mendapatkan Informasi", kind: "line", section: "PENDAHULUAN", guide: "Mis. 'Pengamatan langsung (observasi) dan wawancara (elisitasi).'" },
      { key: "pendahuluan_waktu", label: "4. Waktu Mendapatkan Informasi", kind: "line", section: "PENDAHULUAN", guide: "Hari, tanggal, pukul WIB. Jika tidak ada di sumber, gunakan tanggal laporan." },
      { key: "pendahuluan_nilai", label: "5. Nilai Informasi", kind: "line", section: "PENDAHULUAN", guide: "Format 'X – N' (mis. 'B – 2') sesuai penilaian sumber." },
      { key: "perihal", label: "Perihal", kind: "line", section: "PERIHAL", guide: "Satu kalimat padat dimulai 'Tentang ...' yang menggambarkan inti informasi, termasuk lokasi." },
      FAKTA,
      ANALISA,
      PREDIKSI,
      LANGKAH,
      REKOMENDASI,
      { key: "catatan", label: "Catatan", kind: "paragraph", section: "CATATAN", guide: "Catatan pelapor bila ada (keterbatasan informasi, hal yang masih didalami). Kosongkan string bila tidak relevan." },
    ],
  },
  {
    id: "laporan-kegiatan",
    title: "Laporan Kegiatan",
    short: "Lap. Giat",
    category: "Harian",
    icon: "Activity",
    description: "Laporan pelaksanaan kegiatan/pengamanan: dasar, waktu, lokasi, jalannya kegiatan, situasi, kesimpulan dan saran.",
    docTitle: "LAPORAN KEGIATAN",
    numberFormat: "R / LAPGIAT / {no} / {bulan} / {tahun} / Intelkam",
    format: "dokumen",
    purpose:
      "Laporan pelaksanaan kegiatan (pengamanan acara, monitoring, sambang, rapat koordinasi). Rundown/guidebook/sambutan menjadi sumber utama jalannya kegiatan; rangkum sambutan pejabat menjadi poin-poin isi pesan.",
    fields: [
      { key: "perihal", label: "Perihal", kind: "line", section: "PERIHAL", guide: "Nama kegiatan secara lengkap dan resmi, termasuk penyelenggara." },
      { key: "dasar", label: "Dasar", kind: "list", section: "DASAR", guide: "Dasar pelaksanaan (surat perintah, undangan, rencana kegiatan). Jika tidak disebut: 'Rencana kegiatan dan tugas pokok fungsi Intelkam.'" },
      { key: "hari_tanggal", label: "Hari / Tanggal / Waktu", kind: "line", section: "WAKTU DAN TEMPAT", guide: "Hari, tanggal, pukul mulai s.d. selesai WIB." },
      { key: "lokasi", label: "Tempat", kind: "line", section: "WAKTU DAN TEMPAT", guide: "Nama tempat dan alamat selengkap mungkin." },
      { key: "peserta", label: "Yang Hadir", kind: "list", section: "YANG HADIR", guide: "Pejabat/tokoh/unsur yang hadir dan perkiraan jumlah peserta." },
      { key: "jalannya_kegiatan", label: "Jalannya Kegiatan", kind: "list", section: "JALANNYA KEGIATAN", guide: "Urutan acara kronologis dengan pukul; isi pokok sambutan/arahan diringkas sebagai sub-poin." },
      { key: "situasi", label: "Situasi Kamtibmas", kind: "paragraph", section: "SITUASI", guide: "Kondisi keamanan selama kegiatan, arus lalu lintas, kejadian menonjol (atau 'berjalan aman, tertib, dan lancar' bila memang demikian)." },
      ANALISA,
      { key: "kesimpulan", label: "Kesimpulan", kind: "paragraph", section: "KESIMPULAN", guide: "Kesimpulan singkat hasil kegiatan." },
      { ...REKOMENDASI, label: "Saran", section: "SARAN" },
    ],
  },
  {
    id: "laporan-harian",
    title: "Laporan Harian Situasi",
    short: "Lapharsit",
    category: "Harian",
    icon: "Radar",
    description: "Situasi kamtibmas harian per bidang (Ipoleksosbud-Kam), kriminalitas, laka lantas, bencana, tahanan, VVIP.",
    docTitle: "LAPORAN HARIAN SITUASI KAMTIBMAS",
    numberFormat: "R / LAPHARSIT / {no} / {bulan} / {tahun} / Intelkam",
    format: "dokumen",
    purpose:
      "Laporan situasi harian wilayah. Setiap bidang diisi berdasarkan sumber; bila sumber tidak memuat informasi untuk suatu bidang, tulis 'Nihil.' (jangan mengarang).",
    fields: [
      { key: "periode", label: "Periode Laporan", kind: "line", section: "PERIODE", guide: "Mis. 'Rabu, 12 November 2026 pukul 07.00 WIB s.d. Kamis, 13 November 2026 pukul 07.00 WIB'." },
      { key: "bidang_politik", label: "Bidang Politik", kind: "paragraph", section: "SITUASI PER BIDANG", guide: "Kegiatan parpol, ormas, pemerintahan, pemilu/pilkada." },
      { key: "bidang_ekonomi", label: "Bidang Ekonomi", kind: "paragraph", section: "SITUASI PER BIDANG", guide: "Harga bahan pokok, ketersediaan BBM/LPG, ketenagakerjaan, investasi." },
      { key: "bidang_sosbud", label: "Bidang Sosial Budaya", kind: "paragraph", section: "SITUASI PER BIDANG", guide: "Kegiatan keagamaan, adat, pendidikan, kemasyarakatan." },
      { key: "bidang_keamanan", label: "Bidang Keamanan", kind: "paragraph", section: "SITUASI PER BIDANG", guide: "Unjuk rasa, konflik sosial, gangguan kamtibmas umum." },
      { key: "kriminalitas", label: "Kriminalitas", kind: "list", section: "KEJADIAN MENONJOL", guide: "Kejadian kriminal: jenis, waktu, TKP, korban, kerugian, penanganan." },
      { key: "laka_lantas", label: "Laka Lantas", kind: "list", section: "KEJADIAN MENONJOL", guide: "Kecelakaan lalu lintas: waktu, lokasi, kendaraan, korban." },
      { key: "bencana_alam", label: "Bencana Alam", kind: "list", section: "KEJADIAN MENONJOL", guide: "Banjir, longsor, kebakaran, pohon tumbang, dll." },
      { key: "tahanan", label: "Tahanan", kind: "line", section: "KEJADIAN MENONJOL", guide: "Jumlah dan kondisi tahanan, atau 'Nihil.'" },
      { key: "vvip", label: "Pengamanan VVIP/VIP", kind: "list", section: "KEJADIAN MENONJOL", guide: "Kunjungan pejabat dan pengamanannya." },
      { key: "lain_lain", label: "Lain-lain", kind: "paragraph", section: "LAIN-LAIN", guide: "Informasi lain yang relevan." },
      { key: "kesimpulan", label: "Kesimpulan Situasi", kind: "paragraph", section: "KESIMPULAN", guide: "Penilaian situasi umum wilayah (mis. aman dan terkendali / perlu atensi) beserta alasan." },
      REKOMENDASI,
    ],
  },
  {
    id: "laporan-harian-khusus",
    title: "Laporan Harian Khusus",
    short: "LHK",
    category: "Intelijen",
    icon: "ShieldAlert",
    description: "LHK untuk peristiwa yang memerlukan atensi khusus pimpinan, dengan analisa dan prediksi.",
    docTitle: "LAPORAN HARIAN KHUSUS",
    numberFormat: "R / LHK / {no} / {bulan} / {tahun} / Intelkam",
    format: "dokumen",
    purpose: "Laporan Harian Khusus (LHK): satu peristiwa/isu menonjol yang perlu atensi pimpinan. Fokus, tajam, dan berorientasi tindakan.",
    fields: [
      { key: "perihal", label: "Perihal", kind: "line", section: "PERIHAL", guide: "Inti peristiwa dalam satu kalimat ('Tentang ...')." },
      FAKTA,
      ANALISA,
      PREDIKSI,
      LANGKAH,
      REKOMENDASI,
    ],
  },
  {
    id: "infosus",
    title: "Informasi Khusus",
    short: "Infosus",
    category: "Intelijen",
    icon: "Eye",
    description: "Infosus berklasifikasi untuk isu strategis: pokok masalah, fakta, analisa mendalam, prediksi, rekomendasi.",
    docTitle: "INFORMASI KHUSUS",
    numberFormat: "R / INFOSUS / {no} / {bulan} / {tahun} / Ren.4.1.1. / Intelkam",
    format: "dokumen",
    purpose:
      "Informasi Khusus (Infosus): isu strategis/potensi konflik. Analisa harus mendalam: aktor, kepentingan, dinamika, potensi eskalasi, dan dampak terhadap kamtibmas.",
    fields: [
      { key: "perihal", label: "Perihal", kind: "line", section: "PERIHAL", guide: "Inti isu strategis ('Tentang ...')." },
      { key: "pokok_masalah", label: "Pokok Permasalahan", kind: "paragraph", section: "POKOK PERMASALAHAN", guide: "Rumusan masalah inti dan latar belakangnya dalam 1–2 paragraf." },
      FAKTA,
      { ...ANALISA, guide: ANALISA.guide + " Uraikan per aspek: aktor & kepentingan, dinamika, kerawanan, peluang penyelesaian." },
      PREDIKSI,
      REKOMENDASI,
    ],
  },
  {
    id: "laporan-harian-intelijen",
    title: "Laporan Harian Intelijen",
    short: "LHI",
    category: "Harian",
    icon: "Landmark",
    description: "LHI per aspek sosial politik, ekonomi (harga pasar), sosial budaya, keamanan umum & khusus.",
    docTitle: "LAPORAN HARIAN INTELIJEN",
    numberFormat: "R / LHI / {no} / {bulan} / {tahun} / Intelkam",
    format: "dokumen",
    purpose:
      "Laporan Harian Intelijen (LHI). Aspek tanpa informasi diisi 'Nihil.'. Pada sosial ekonomi, bila ada data harga, sajikan sebagai daftar 'Nama barang: Rp ... (naik/turun/stabil)'.",
    fields: [
      { key: "sosial_politik", label: "1. Sosial Politik", kind: "paragraph", section: "SITUASI", guide: "Dinamika politik, kegiatan parpol/ormas/pemerintahan." },
      { key: "sosial_ekonomi", label: "2. Sosial Ekonomi", kind: "list", section: "SITUASI", guide: "Harga & ketersediaan bahan pokok, aktivitas ekonomi." },
      { key: "sosial_budaya", label: "3. Sosial Budaya", kind: "paragraph", section: "SITUASI", guide: "Kegiatan keagamaan, kemasyarakatan, pendidikan." },
      { key: "keamanan_umum", label: "4. Keamanan Umum", kind: "list", section: "SITUASI", guide: "Gangguan kamtibmas, kriminalitas, laka lantas." },
      { key: "keamanan_khusus", label: "5. Keamanan Khusus", kind: "paragraph", section: "SITUASI", guide: "Isu radikalisme, aliran, orang asing, separatisme — atau 'Nihil.'" },
      { key: "bencana_alam", label: "6. Bencana Alam", kind: "paragraph", section: "SITUASI", guide: "Kejadian bencana atau 'Nihil.'" },
      { key: "vvip", label: "7. Pengamanan VVIP/VIP", kind: "paragraph", section: "SITUASI", guide: "Kunjungan pejabat atau 'Nihil.'" },
      { key: "lain_lain", label: "8. Lain-lain", kind: "paragraph", section: "SITUASI", guide: "Informasi lain, atau 'Nihil.'" },
      { ...ANALISA, label: "Analisa Umum" },
      PREDIKSI,
      REKOMENDASI,
    ],
  },
  {
    id: "rencana-kegiatan",
    title: "Rencana Kegiatan",
    short: "Rengiat",
    category: "Perencanaan",
    icon: "CalendarClock",
    description: "Rencana kegiatan anggota unit Intelkam esok hari: personel, sasaran, agenda politik/masyarakat, unras.",
    docTitle: "RENCANA KEGIATAN ANGGOTA UNIT INTELKAM",
    numberFormat: "R / RENGIAT / {no} / {bulan} / {tahun} / Intelkam",
    format: "dokumen",
    purpose:
      "Rencana kegiatan untuk hari berikutnya. Turunkan rencana dari agenda/undangan/informasi di sumber; setiap rencana memuat waktu, tempat, sasaran, dan personel bila diketahui.",
    fields: [
      { key: "hari_tanggal", label: "Hari / Tanggal Rencana", kind: "line", section: "WAKTU", guide: "Hari dan tanggal pelaksanaan rencana (umumnya esok hari dari tanggal laporan)." },
      { key: "rencana_personel", label: "Rencana Kegiatan Personel", kind: "list", section: "RENCANA KEGIATAN", guide: "Penugasan per personel/tim: kegiatan, sasaran, waktu, lokasi." },
      { key: "rencana_politik", label: "Rencana Kegiatan Politik", kind: "list", section: "RENCANA KEGIATAN", guide: "Agenda parpol/pemerintahan yang akan dimonitor, atau 'Nihil.'" },
      { key: "rencana_kemasyarakatan", label: "Rencana Giat Kemasyarakatan", kind: "list", section: "RENCANA KEGIATAN", guide: "Kegiatan keagamaan/budaya/masyarakat yang akan dimonitor." },
      { key: "rencana_unras", label: "Rencana Unras", kind: "list", section: "RENCANA KEGIATAN", guide: "Rencana unjuk rasa: kelompok, tuntutan, jumlah massa, lokasi — atau 'Nihil.'" },
      { key: "rencana_menonjol", label: "Rencana Kegiatan Menonjol", kind: "list", section: "RENCANA KEGIATAN", guide: "Kegiatan berskala besar/berisiko yang butuh atensi." },
      { key: "hasil_dicapai", label: "Hasil yang Ingin Dicapai", kind: "list", section: "HASIL YANG INGIN DICAPAI", guide: "Sasaran output intelijen yang terukur." },
    ],
  },
  {
    id: "wa-segera",
    title: "Laporan Segera Gangguan Kamtibmas",
    short: "Lapsegera (WA)",
    category: "Pesan Cepat",
    icon: "Zap",
    description: "Pesan cepat WhatsApp/Telegram untuk kejadian menonjol yang harus segera dilaporkan ke pimpinan.",
    docTitle: "LAPORAN SEGERA",
    numberFormat: "",
    format: "wa",
    purpose:
      "Pesan WhatsApp laporan segera. Gunakan *tebal* WhatsApp untuk judul dan label. Struktur: salam pembuka singkat (Mohon izin melaporkan ...), lalu butir bernomor: 1. Waktu kejadian, 2. Tempat kejadian, 3. Jenis kejadian, 4. Kronologis singkat, 5. Korban/kerugian, 6. Pelaku/terduga, 7. Barang bukti, 8. Tindakan yang telah diambil, 9. Situasi saat ini. Akhiri 'Demikian dilaporkan.' dan nama pengirim. Ringkas, tanpa basa-basi.",
    fields: [{ key: "teks_wa", label: "Teks WhatsApp", kind: "paragraph", guide: "Seluruh pesan WhatsApp siap kirim." }],
  },
  {
    id: "wa-kemajuan",
    title: "Laporan Kemajuan",
    short: "Lapju (WA)",
    category: "Pesan Cepat",
    icon: "TrendingUp",
    description: "Update perkembangan dari laporan sebelumnya dalam format WhatsApp ringkas.",
    docTitle: "LAPORAN KEMAJUAN",
    numberFormat: "",
    format: "wa",
    needsPrevious: true,
    purpose:
      "Pesan WhatsApp laporan kemajuan (lapju) yang menindaklanjuti laporan sebelumnya. Struktur: *LAPORAN KEMAJUAN*, rujukan laporan sebelumnya (bila ada), 1. Perkembangan terbaru, 2. Tindakan yang telah dilakukan, 3. Situasi saat ini, 4. Rencana tindak lanjut. Tonjolkan apa yang BERUBAH dibanding laporan sebelumnya.",
    fields: [{ key: "teks_wa", label: "Teks WhatsApp", kind: "paragraph", guide: "Seluruh pesan WhatsApp siap kirim." }],
  },
];

export function getTemplate(id: string): TemplateDef {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Template tidak dikenal: ${id}`);
  return t;
}

const BULAN_ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function defaultNumber(t: TemplateDef, iso: string): string {
  if (!t.numberFormat) return "";
  const d = new Date(iso);
  return t.numberFormat
    .replace("{no}", "     ")
    .replace("{bulan}", BULAN_ROMAWI[d.getMonth()])
    .replace("{tahun}", String(d.getFullYear()));
}

export function groupSections(t: TemplateDef): { section: string; fields: FieldDef[] }[] {
  const out: { section: string; fields: FieldDef[] }[] = [];
  for (const f of t.fields) {
    const s = f.section ?? "";
    const last = out[out.length - 1];
    if (last && last.section === s) last.fields.push(f);
    else out.push({ section: s, fields: [f] });
  }
  return out;
}
