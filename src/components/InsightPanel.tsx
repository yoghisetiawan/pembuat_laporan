"use client";
import { AlertTriangle, GitBranch, HelpCircle, RefreshCw, ShieldCheck } from "lucide-react";
import type { Analysis, Clarification, Review } from "@/lib/types";
import { Badge, Button, Tabs, cx, scoreTone, type Tone } from "./ui";
import { useState, type ReactNode } from "react";

export type InsightTab = "mutu" | "fakta" | "risiko" | "klarifikasi" | "asisten";

const RISK_TONE: Record<string, Tone> = { rendah: "green", sedang: "amber", tinggi: "red", kritis: "red" };
const CONF_TONE: Record<string, Tone> = { tinggi: "green", sedang: "amber", rendah: "red" };
const SEV_TONE: Record<string, Tone> = { kritis: "red", mayor: "amber", minor: "slate" };
const JENIS: Record<string, string> = {
  klaim_tanpa_dasar: "Klaim tanpa dasar",
  fakta_terlewat: "Fakta terlewat",
  inkonsistensi: "Inkonsistensi",
  bahasa: "Bahasa",
  format: "Format",
  analisis_dangkal: "Analisis dangkal",
};

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Ring({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tone = scoreTone(v);
  const color = tone === "green" ? "#10b981" : tone === "amber" ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-slate-100 dark:stroke-white/10" />
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" stroke={color} strokeLinecap="round" strokeDasharray={`${(v / 100) * 97.4} 97.4`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{v}</div>
      </div>
      <div className="text-center text-[10px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}

export default function InsightPanel({
  tab,
  setTab,
  analysis,
  review,
  clarifications,
  setClarifications,
  onEnrich,
  running,
  chat,
}: {
  tab: InsightTab;
  setTab: (t: InsightTab) => void;
  analysis: Analysis | null;
  review: Review | null;
  clarifications: Clarification[];
  setClarifications: (c: Clarification[]) => void;
  onEnrich: (c: Clarification[]) => void;
  running: boolean;
  chat: ReactNode;
}) {
  const gaps = analysis?.celah_informasi ?? [];
  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-100 p-3 dark:border-white/5">
        <Tabs
          value={tab}
          onChange={setTab}
          className="flex-wrap"
          items={[
            { id: "mutu", label: "Mutu", icon: "Gauge" },
            { id: "fakta", label: "Fakta", icon: "ListChecks", count: analysis?.fakta.length },
            { id: "risiko", label: "Risiko", icon: "ShieldAlert" },
            { id: "klarifikasi", label: "Klarifikasi", icon: "HelpCircle", count: gaps.length },
            { id: "asisten", label: "Asisten", icon: "MessageSquare" },
          ]}
        />
      </div>
      <div className={cx("scroll-thin min-h-0 flex-1 overflow-y-auto", tab !== "asisten" && "space-y-5 p-4")}>
        {!analysis && tab !== "asisten" && (
          <div className="py-10 text-center text-sm text-slate-500">{running ? "Menunggu hasil analisis AI…" : "Belum ada analisis."}</div>
        )}

        {analysis && tab === "mutu" && (
          <>
            {review ? (
              <>
                <div className="grid grid-cols-5 gap-1">
                  <Ring value={review.skor.akurasi} label="Akurasi" />
                  <Ring value={review.skor.kelengkapan} label="Kelengkapan" />
                  <Ring value={review.skor.kejelasan} label="Kejelasan" />
                  <Ring value={review.skor.kepatuhan_format} label="Format" />
                  <Ring value={review.skor.kedalaman_analisis} label="Kedalaman" />
                </div>
                {review.catatan_umum && <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">{review.catatan_umum}</p>}
                <Section title={`Temuan pemeriksa (${review.temuan.length})`} icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                  {review.temuan.length === 0 && <div className="text-xs text-emerald-600">Tidak ada temuan — laporan siap diteruskan.</div>}
                  {review.temuan.map((f, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 p-3 text-xs dark:border-white/5">
                      <div className="mb-1 flex flex-wrap gap-1.5">
                        <Badge tone={SEV_TONE[f.tingkat]}>{f.tingkat}</Badge>
                        <Badge>{JENIS[f.jenis] ?? f.jenis}</Badge>
                        <Badge tone="blue">{f.field}</Badge>
                      </div>
                      <div className="text-slate-700 dark:text-slate-200">{f.masalah}</div>
                      <div className="mt-1 text-slate-500">→ {f.saran}</div>
                    </div>
                  ))}
                </Section>
              </>
            ) : (
              <div className="text-sm text-slate-500">Verifikasi mutu belum berjalan.</div>
            )}
            <Section title="Cakupan 5W1H">
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(analysis.cakupan_5w1h).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-white/[0.04]">
                    <span className="capitalize">{k === "dimana" ? "di mana" : k}</span>
                    <span className={cx("h-2 w-2 rounded-full", v === "lengkap" ? "bg-emerald-500" : v === "sebagian" ? "bg-amber-500" : "bg-red-500")} title={v} />
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {analysis && tab === "fakta" && (
          <>
            <p className="text-sm leading-relaxed">{analysis.ringkasan}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="blue">{analysis.bidang_utama}</Badge>
              <Badge>{analysis.jenis_peristiwa}</Badge>
            </div>
            <Section title={`Fakta terekstrak (${analysis.fakta.length})`}>
              <div className="space-y-1.5">
                {analysis.fakta.map((f) => (
                  <div key={f.id} className="flex gap-2 rounded-lg border border-slate-100 p-2.5 text-xs dark:border-white/5">
                    <span className="font-mono text-[10px] text-slate-400">{f.id}</span>
                    <div className="min-w-0 flex-1">
                      <div>{f.pernyataan}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone="violet">{f.dimensi}</Badge>
                        <Badge>{f.sumber}</Badge>
                        <Badge tone={CONF_TONE[f.keyakinan]}>keyakinan {f.keyakinan}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
            {analysis.kronologi.length > 0 && (
              <Section title="Kronologi">
                <ol className="relative space-y-2 border-l border-slate-200 pl-4 dark:border-white/10">
                  {analysis.kronologi.map((k, i) => (
                    <li key={i} className="text-xs">
                      <span className="absolute -left-1 mt-1.5 h-2 w-2 rounded-full bg-brand-500" />
                      <div className="font-medium">{k.waktu}</div>
                      <div className="text-slate-600 dark:text-slate-300">{k.peristiwa}</div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
            <Section title="Entitas">
              {(
                [
                  ["Orang", analysis.entitas.orang],
                  ["Organisasi", analysis.entitas.organisasi],
                  ["Lokasi", analysis.entitas.lokasi],
                  ["Waktu", analysis.entitas.waktu],
                  ["Angka penting", analysis.entitas.angka_penting],
                ] as const
              )
                .filter(([, v]) => v.length)
                .map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-slate-500">{k}: </span>
                    {v.join(" · ")}
                  </div>
                ))}
            </Section>
          </>
        )}

        {analysis && tab === "risiko" && (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
              <ShieldCheck className="h-8 w-8 text-slate-400" />
              <div>
                <div className="text-xs text-slate-500">Tingkat kerawanan</div>
                <Badge tone={RISK_TONE[analysis.penilaian_risiko.tingkat]} className="mt-0.5 text-xs uppercase">
                  {analysis.penilaian_risiko.tingkat}
                </Badge>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-slate-500">Nilai informasi</div>
                <div className="text-lg font-bold tabular-nums">
                  {analysis.penilaian_sumber.keandalan} – {analysis.penilaian_sumber.kebenaran}
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">{analysis.penilaian_sumber.alasan}</p>
            <Section title="Faktor risiko">
              <ul className="list-disc space-y-1 pl-4 text-xs">{analysis.penilaian_risiko.faktor.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </Section>
            <Section title="Potensi eskalasi">
              <p className="text-xs leading-relaxed">{analysis.penilaian_risiko.potensi_eskalasi}</p>
            </Section>
            <Section title="Indikator yang perlu dipantau">
              <ul className="list-disc space-y-1 pl-4 text-xs">{analysis.penilaian_risiko.indikator_pantau.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </Section>
            {analysis.hipotesis_alternatif.length > 0 && (
              <Section title="Hipotesis alternatif" icon={<GitBranch className="h-3.5 w-3.5" />}>
                <ul className="list-disc space-y-1 pl-4 text-xs">{analysis.hipotesis_alternatif.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </Section>
            )}
            {analysis.kontradiksi.length > 0 && (
              <Section title="Kontradiksi antarsumber" icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}>
                <ul className="list-disc space-y-1 pl-4 text-xs text-amber-700 dark:text-amber-300">{analysis.kontradiksi.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </Section>
            )}
          </>
        )}

        {analysis && tab === "klarifikasi" && (
          <ClarifyTab gaps={gaps} clarifications={clarifications} setClarifications={setClarifications} onEnrich={onEnrich} running={running} />
        )}

        {tab === "asisten" && chat}
      </div>
    </div>
  );
}

function ClarifyTab({
  gaps,
  clarifications,
  setClarifications,
  onEnrich,
  running,
}: {
  gaps: Analysis["celah_informasi"];
  clarifications: Clarification[];
  setClarifications: (c: Clarification[]) => void;
  onEnrich: (c: Clarification[]) => void;
  running: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(clarifications.map((c) => [c.pertanyaan, c.jawaban])),
  );
  const answered = gaps.filter((g) => draft[g.pertanyaan]?.trim()).length;
  return (
    <>
      <div className="flex gap-2 rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-900 dark:bg-brand-500/10 dark:text-brand-200">
        <HelpCircle className="h-4 w-4 shrink-0" />
        AI menemukan informasi yang belum lengkap. Jawab pertanyaan yang Anda ketahui, lalu klik “Perkaya Laporan” — AI akan menyusun ulang laporan dengan jawaban Anda sebagai sumber tambahan.
      </div>
      {gaps.length === 0 && <div className="text-sm text-emerald-600">Tidak ada celah informasi signifikan.</div>}
      {gaps.map((g, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-start gap-2 text-sm">
            <Badge tone={CONF_TONE[g.prioritas === "tinggi" ? "rendah" : g.prioritas === "rendah" ? "tinggi" : "sedang"]}>{g.prioritas}</Badge>
            <div>
              <div className="font-medium">{g.pertanyaan}</div>
              <div className="text-xs text-slate-500">{g.aspek}</div>
            </div>
          </div>
          <textarea
            className="input min-h-16 text-xs"
            placeholder="Jawaban (kosongkan bila tidak tahu)"
            value={draft[g.pertanyaan] ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, [g.pertanyaan]: e.target.value }))}
          />
        </div>
      ))}
      {gaps.length > 0 && (
        <Button
          variant="primary"
          className="w-full"
          disabled={!answered || running}
          onClick={() => {
            const merged = new Map(clarifications.map((c) => [c.pertanyaan, c.jawaban]));
            for (const [q, a] of Object.entries(draft)) if (a.trim()) merged.set(q, a.trim());
            const next = [...merged].map(([pertanyaan, jawaban]) => ({ pertanyaan, jawaban }));
            setClarifications(next);
            onEnrich(next);
          }}
        >
          <RefreshCw className="h-4 w-4" /> Perkaya Laporan ({answered} jawaban)
        </Button>
      )}
    </>
  );
}
