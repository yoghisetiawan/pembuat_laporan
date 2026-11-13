# Pembuat Laporan AI — v2

Generator laporan dinas Intelkam (LI, LHK, Infosus, LHI, Laporan Kegiatan, Laporan Harian Situasi, Rencana Kegiatan, Lapsegera & Lapju WhatsApp) dari bahan mentah lapangan: foto, foto dokumen, PDF, rekaman suara, dan catatan teks.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

| Variabel | Wajib | Fungsi |
|---|---|---|
| `GEMINI_API_KEY` | ya | Semua fitur AI: analisis, draf, verifikasi, revisi, chat, transkripsi audio. Buat di aistudio.google.com → Get API key |
| `GEMINI_MODEL` | tidak | Default `gemini-3.8-flash` |

Deploy ke Vercel: impor repo, isi variabel di atas. Batas body Vercel ±4,5 MB per permintaan — gambar otomatis dikompres di browser; PDF besar sebaiknya dipecah.

## Apa yang lebih baik dari versi lama

**Penalaran AI bertahap (bukan sekali tembak)** — `src/lib/ai/pipeline.ts`
1. **Analisis bukti**: fakta atomik berlabel sumber & tingkat keyakinan, kronologi, entitas, cakupan 5W1H, kontradiksi antarsumber, celah informasi, nilai informasi (kode Admiralty A–F/1–6), penilaian risiko kamtibmas, hipotesis alternatif.
2. **Penyusunan draf** sesuai struktur template.
3. **Verifikasi mutu** oleh "Kanit" AI terhadap sumber asli: klaim tanpa dasar (halusinasi), fakta terlewat, inkonsistensi, bahasa, format, analisis dangkal — dengan skor 0–100.
4. **Revisi terarah** hingga lolos verifikasi (0/1/2 putaran sesuai mode Cepat/Standar/Mendalam).

Seluruh tahap di-*stream* ke UI (progres + ringkasan jejak penalaran Gemini). Sumber selalu diletakkan di awal permintaan agar cache implisit Gemini memangkas biaya tahap 2–4. Keluaran berupa JSON terstruktur tervalidasi (Zod). Kedalaman Cepat/Standar/Mendalam memetakan ke *thinking level* LOW/MEDIUM/HIGH.

**Fitur AI baru**
- **Klarifikasi interaktif**: AI mengajukan pertanyaan atas celah informasi; jawaban Anda dipakai untuk *Perkaya Laporan*.
- **Aksi AI per bagian**: perbaiki bahasa, formalkan, perluas, ringkas, pertajam analisa, jadikan poin, instruksi bebas, atau "perbaiki temuan pemeriksa" — dengan tombol batal.
- **Asisten chat** yang memahami laporan & analisis, mengusulkan revisi yang bisa diterapkan satu klik.
- **Versi WA** dan **Ringkasan Pimpinan** dari laporan dokumen mana pun.
- **Laporan Kemajuan (lapju)** dari riwayat: AI membandingkan dengan laporan sebelumnya.
- Transkripsi audio dengan penanda pembicara & waktu, plus dikte langsung (Web Speech API).

**Struktur yang lebih rapi**
- Template berbasis data (`src/lib/templates.ts`) — satu definisi untuk skema AI, editor, DOCX, dan teks. Menambah template = menambah satu objek.
- **Profil Satuan** dapat diatur (kop, penandatangan, distribusi, wilayah) — tidak lagi hard-code.
- Ekspor **DOCX** di browser (kertas F4, kop bergaris, penomoran bagian, tanda tangan, distribusi, lampiran foto dokumentasi).
- Riwayat tersimpan lokal (IndexedDB), pencarian & filter, skor mutu & risiko per laporan. Klasifikasi BIASA/TERBATAS/RAHASIA.

## Struktur

```
src/
  app/api/{generate,refine,chat,transform,transcribe,health}/route.ts
  lib/ai/{client,prompts,schemas,pipeline}.ts   # lapisan AI Gemini (server-only)
  lib/{templates,types,docx,storage,files,sse}.ts
  components/                                    # UI (React 19 + Tailwind 4)
```
