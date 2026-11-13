"use client";
import { Brain, CheckCircle2, ChevronDown, Circle, Loader2, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StageId } from "@/lib/types";
import { Button, cx } from "./ui";

export interface StageState {
  id: StageId;
  title: string;
  status: "pending" | "running" | "done";
  label?: string;
  detail?: string;
}

export const INITIAL_STAGES: StageState[] = [
  { id: "analisis", title: "Analisis Bukti", status: "pending" },
  { id: "draf", title: "Penyusunan Draf", status: "pending" },
  { id: "verifikasi", title: "Verifikasi Mutu", status: "pending" },
  { id: "revisi", title: "Revisi Terarah", status: "pending" },
];

const DESC: Record<string, string> = {
  analisis: "Ekstraksi fakta atomik, 5W1H, kontradiksi, nilai sumber, penilaian risiko",
  draf: "Menyusun isi sesuai struktur template & bahasa dinas",
  verifikasi: "Memeriksa draf terhadap sumber asli: halusinasi, fakta terlewat, format",
  revisi: "Memperbaiki temuan pemeriksa hingga lolos verifikasi",
};

export default function PipelineView({
  stages,
  thinking,
  chars,
  running,
  startedAt,
  onCancel,
}: {
  stages: StageState[];
  thinking: Partial<Record<StageId, string>>;
  chars: number;
  running: boolean;
  startedAt: number | null;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(Date.now());
  const traceRef = useRef<HTMLDivElement>(null);
  const active = stages.find((s) => s.status === "running");

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const trace = active ? thinking[active.id] ?? "" : "";
  useEffect(() => {
    traceRef.current?.scrollTo({ top: traceRef.current.scrollHeight });
  }, [trace]);

  const elapsed = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          {running ? <Loader2 className="h-4 w-4 animate-spin text-brand-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          <div className="text-sm font-semibold">{running ? "AI sedang bekerja" : "Proses AI selesai"}</div>
          <span className="text-xs tabular-nums text-slate-500">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </div>
        {running && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <Square className="h-3.5 w-3.5" /> Batalkan
          </Button>
        )}
      </div>
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <ol className="space-y-1 p-4">
          {stages.map((s) => (
            <li key={s.id} className={cx("flex gap-3 rounded-xl p-2.5", s.status === "running" && "bg-brand-50/70 dark:bg-brand-500/10")}>
              <div className="pt-0.5">
                {s.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : s.status === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <div className="min-w-0">
                <div className={cx("text-sm font-medium", s.status === "pending" && "text-slate-400")}>{s.title}</div>
                <div className="text-xs text-slate-500">{s.label ?? DESC[s.id]}</div>
                {s.detail && <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{s.detail}</div>}
                {s.status === "running" && chars > 0 && <div className="mt-1 text-[11px] text-brand-600">{chars.toLocaleString("id-ID")} karakter ditulis…</div>}
              </div>
            </li>
          ))}
        </ol>
        <div className="border-t border-slate-100 md:border-l md:border-t-0 dark:border-white/5">
          <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Brain className="h-3.5 w-3.5 text-violet-500" />
            Jejak Penalaran AI {active ? `— ${active.title}` : ""}
            <ChevronDown className={cx("ml-auto h-3.5 w-3.5 transition", !open && "-rotate-90")} />
          </button>
          {open && (
            <div ref={traceRef} className="scroll-thin h-56 overflow-y-auto whitespace-pre-wrap px-4 pb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {trace || (running ? <span className="shimmer block h-4 w-2/3 rounded" /> : "Ringkasan penalaran tiap tahap tersimpan di bawah.")}
              {!running &&
                stages
                  .filter((s) => thinking[s.id])
                  .map((s) => (
                    <details key={s.id} className="mt-2">
                      <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">{s.title}</summary>
                      <div className="mt-1">{thinking[s.id]}</div>
                    </details>
                  ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
