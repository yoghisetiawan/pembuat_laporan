# Pembuat Laporan AI — v2

Generator laporan dinas Intelkam (LI, LHK, Infosus, LHI, Laporan Kegiatan, Laporan Harian Situasi, Rencana Kegiatan, Lapsegera & Lapju WhatsApp) dari bahan mentah lapangan: foto, foto dokumen, PDF, rekaman suara, dan catatan teks.

## Menjalankan di komputer

```bash
npm install
cp .env.example .env.local   # isi minimal ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Tanpa variabel Supabase, aplikasi berjalan **mode lokal**: tanpa login, riwayat disimpan di browser (IndexedDB). Mode ini hanya untuk pengembangan — di produksi API AI otomatis menolak akses tanpa login.

| Variabel | Wajib | Fungsi |
|---|---|---|
| `ANTHROPIC_API_KEY` | ya | Seluruh penalaran AI (Claude) |
| `NEXT_PUBLIC_SUPABASE_URL` | produksi | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | produksi | Publishable/anon key Supabase |
| `ANTHROPIC_MODEL` | tidak | Default `claude-opus-5-5` |
| `GEMINI_API_KEY` | tidak | Transkripsi **berkas** audio (dikte langsung tetap jalan tanpa ini) |

## Deploy: GitHub → Vercel + Supabase

### 1. Supabase (database, login, penyimpanan foto)
1. Buat proyek di supabase.com — pilih region **Southeast Asia (Singapore)**.
2. **SQL Editor** → tempel isi `supabase/migrations/0001_init.sql` → **Run**. Ini membuat tabel `reports` & `unit_profiles`, bucket privat `dokumentasi`, dan kebijakan RLS (setiap akun hanya melihat datanya sendiri).
3. **Authentication → Sign In / Providers → Email**: matikan *Allow new users to sign up* (akun hanya dibuat admin).
4. **Authentication → Users → Add user → Create new user**: buat akun untuk tiap personel (centang *Auto Confirm User*).
5. **Project Settings → API**: salin *Project URL* dan *Publishable key*.
6. Setelah domain Vercel ada: **Authentication → URL Configuration → Site URL** = `https://<proyek>.vercel.app`.

### 2. GitHub
Buat repositori **privat** kosong di github.com/new, lalu:
```bash
git remote add origin https://github.com/<akun>/<repo>.git
git push -u origin main
```

### 3. Vercel
1. vercel.com/new → **Import** repositori GitHub tadi.
2. **Environment Variables**: isi `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (opsional `GEMINI_API_KEY`).
3. **Deploy**. Setiap `git push` ke `main` otomatis men-deploy ulang. Fungsi berjalan di region Singapura (`vercel.json`).

Catatan Vercel: batas body ±4,5 MB per permintaan — gambar otomatis dikompres di browser; PDF besar sebaiknya dipecah. Durasi fungsi hingga 300 detik dipakai oleh pipeline mode Mendalam.

## Apa yang lebih baik dari versi lama

**Penalaran AI bertahap (bukan sekali tembak)** — `src/lib/ai/pipeline.ts`
1. **Analisis bukti**: fakta atomik berlabel sumber & tingkat keyakinan, kronologi, entitas, cakupan 5W1H, kontradiksi antarsumber, celah informasi, nilai informasi (kode Admiralty A–F/1–6), penilaian risiko kamtibmas, hipotesis alternatif.
2. **Penyusunan draf** sesuai struktur template.
3. **Verifikasi mutu** oleh "Kanit" AI terhadap sumber asli: klaim tanpa dasar (halusinasi), fakta terlewat, inkonsistensi, bahasa, format, analisis dangkal — dengan skor 0–100.
4. **Revisi terarah** hingga lolos verifikasi (0/1/2 putaran sesuai mode Cepat/Standar/Mendalam).

Seluruh tahap di-*stream* ke UI (progres + ringkasan jejak penalaran). Sumber di-*cache* (prompt caching) sehingga tahap 2–4 jauh lebih murah. Keluaran berupa JSON terstruktur tervalidasi (Zod), dengan fallback model otomatis bila permintaan ditolak.

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
- Login per personel (Supabase Auth); riwayat, profil satuan, dan foto dokumentasi tersimpan di Supabase dengan RLS — tersinkron antarperangkat. Pencarian & filter, skor mutu & risiko per laporan. Klasifikasi BIASA/TERBATAS/RAHASIA.
- Semua endpoint AI hanya bisa dipanggil pengguna yang login, sehingga kuota API tidak bisa dipakai orang lain.

## Struktur

```
supabase/migrations/0001_init.sql                # skema, RLS, bucket storage
src/
  app/login/page.tsx
  app/api/{generate,refine,chat,transform,transcribe,health}/route.ts
  lib/ai/{client,prompts,schemas,pipeline}.ts   # lapisan AI (server-only)
  lib/supabase/{config,browser,server}.ts       # klien Supabase + penjaga login
  lib/{templates,types,docx,storage,files,sse}.ts
  proxy.ts                                       # refresh sesi & redirect ke /login
  components/                                    # UI (React 19 + Tailwind 4)
```
