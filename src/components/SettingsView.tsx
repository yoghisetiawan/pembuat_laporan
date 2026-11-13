"use client";
import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { DEFAULT_PROFILE } from "@/lib/storage";
import type { UnitProfile } from "@/lib/types";
import { Button } from "./ui";

function Lines({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <textarea className="input min-h-24" value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function SettingsView({ profile, onSave, health }: { profile: UnitProfile; onSave: (p: UnitProfile) => void; health: { anthropic: boolean; model: string; transcription: boolean } | null }) {
  const [p, setP] = useState(profile);
  const up = <K extends keyof UnitProfile>(k: K, v: UnitProfile[K]) => setP((x) => ({ ...x, [k]: v }));
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="card space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold">Profil Satuan</h2>
          <p className="text-sm text-slate-500">Dipakai untuk kop surat, tanda tangan, distribusi, dan sebagai konteks wilayah bagi AI. Tersimpan di perangkat ini.</p>
        </div>
        <Lines label="Baris kop surat" value={p.kopBaris} onChange={(v) => up("kopBaris", v)} hint="Satu baris per tingkat, dari atas ke bawah." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Alamat kantor" value={p.alamat} onChange={(v) => up("alamat", v)} />
          <Field label="Kota (untuk tanggal surat)" value={p.kota} onChange={(v) => up("kota", v)} />
        </div>
        <Field label="Wilayah hukum (konteks AI)" value={p.wilayah} onChange={(v) => up("wilayah", v)} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Jabatan penandatangan" value={p.penandatanganJabatan} onChange={(v) => up("penandatanganJabatan", v)} />
          <Field label="Nama penandatangan" value={p.penandatanganNama} onChange={(v) => up("penandatanganNama", v)} placeholder="NAMA LENGKAP" />
          <Field label="Pangkat / NRP" value={p.penandatanganPangkatNrp} onChange={(v) => up("penandatanganPangkatNrp", v)} placeholder="AKP NRP 12345678" />
        </div>
        <Field label="Pelapor default (untuk pesan WA)" value={p.pelapor} onChange={(v) => up("pelapor", v)} placeholder="Bripka ... / Kanit Intelkam" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Lines label="Kepada" value={p.kepada} onChange={(v) => up("kepada", v)} />
          <Lines label="Distribusi / tembusan" value={p.distribusi} onChange={(v) => up("distribusi", v)} />
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() =>
              onSave({ ...p, kopBaris: p.kopBaris.filter((x) => x.trim()), kepada: p.kepada.filter((x) => x.trim()), distribusi: p.distribusi.filter((x) => x.trim()) })
            }
          >
            <Save className="h-4 w-4" /> Simpan profil
          </Button>
          <Button variant="ghost" onClick={() => setP(DEFAULT_PROFILE)}>
            <RotateCcw className="h-4 w-4" /> Kembalikan bawaan
          </Button>
        </div>
      </div>
      <div className="card h-fit space-y-3 p-5 text-sm">
        <div className="font-semibold">Status Mesin AI</div>
        <Row ok={!!health?.anthropic} label="Penalaran (Claude)" detail={health?.model ?? "…"} />
        <Row ok={!!health?.transcription} label="Transkripsi berkas audio" detail={health?.transcription ? "Aktif" : "Opsional — atur GEMINI_API_KEY"} />
        <Row ok label="Dikte langsung" detail="Browser (Chrome/Edge)" />
        <p className="text-xs leading-relaxed text-slate-500">Kunci API diatur di server pada berkas <code>.env.local</code>, tidak pernah dikirim ke browser.</p>
      </div>
    </div>
  );
}

function Row({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      <div>
        <div>{label}</div>
        <div className="text-xs text-slate-500">{detail}</div>
      </div>
    </div>
  );
}
