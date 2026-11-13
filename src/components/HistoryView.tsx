"use client";
import { Copy, FileX2, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteReport, listReports } from "@/lib/storage";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import type { ReportRecord } from "@/lib/types";
import { Badge, Button, Icon, scoreTone } from "./ui";

export default function HistoryView({ onOpen, onDuplicate }: { onOpen: (r: ReportRecord) => void; onDuplicate: (r: ReportRecord) => void }) {
  const [rows, setRows] = useState<ReportRecord[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("semua");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listReports()
      .then(setRows)
      .catch((e: Error) => {
        setRows([]);
        setLoadError(e.message);
      });
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (cat === "semua" || r.templateId === cat) &&
        (!s || r.title.toLowerCase().includes(s) || Object.values(r.fields).some((v) => v.toLowerCase().includes(s))),
    );
  }, [rows, q, cat]);

  const score = (r: ReportRecord) => {
    if (!r.review) return null;
    const s = r.review.skor;
    return Math.round((s.akurasi + s.kelengkapan + s.kejelasan + s.kepatuhan_format + s.kedalaman_analisis) / 5);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari judul atau isi laporan…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input sm:w-64" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="semua">Semua jenis</option>
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {loadError && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{loadError}</div>}
      {rows === null && <div className="py-10 text-center text-sm text-slate-500">Memuat riwayat…</div>}
      {rows !== null && filtered.length === 0 && (
        <div className="card flex flex-col items-center gap-2 py-14 text-center">
          <FileX2 className="h-8 w-8 text-slate-300" />
          <div className="font-medium">{rows.length ? "Tidak ada yang cocok" : "Belum ada riwayat laporan"}</div>
          <div className="text-sm text-slate-500">Laporan tersimpan otomatis setelah dibuat.</div>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((r) => {
          const t = TEMPLATES.find((x) => x.id === r.templateId) ?? getTemplate("laporan-informasi");
          const sc = score(r);
          return (
            <div key={r.id} className="card group flex flex-col p-4 transition hover:shadow-md">
              <button className="flex flex-1 gap-3 text-left" onClick={() => onOpen(r)}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  <Icon name={t.icon} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold">{r.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge>{t.short}</Badge>
                    {sc !== null && <Badge tone={scoreTone(sc)}>Mutu {sc}</Badge>}
                    {r.analysis && <Badge tone={r.analysis.penilaian_risiko.tingkat === "rendah" ? "green" : "amber"}>Risiko {r.analysis.penilaian_risiko.tingkat}</Badge>}
                    <span className="text-xs text-slate-500">
                      {new Date(r.updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  {r.sourcesSummary && <div className="mt-1.5 text-xs text-slate-500">{r.sourcesSummary}</div>}
                </div>
              </button>
              <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-white/5">
                <Button size="sm" variant="ghost" onClick={() => onDuplicate(r)}>
                  <Copy className="h-3.5 w-3.5" /> Buat lapju
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (!confirm(`Hapus laporan "${r.title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
                    try {
                      await deleteReport(r.id);
                      setRows((all) => (all ?? []).filter((x) => x.id !== r.id));
                    } catch (e) {
                      setLoadError((e as Error).message);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
