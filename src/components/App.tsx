"use client";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardCopy,
  FileDown,
  History,
  Loader2,
  MessageCircle,
  Moon,
  RefreshCw,
  ScrollText,
  Settings,
  Sparkles,
  Sun,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildDocx, toPlainText } from "@/lib/docx";
import { download, uid } from "@/lib/files";
import { readEvents } from "@/lib/sse";
import { loadProfile, saveProfile, saveReport } from "@/lib/storage";
import { defaultNumber, getTemplate } from "@/lib/templates";
import type {
  Analysis,
  Attachment,
  ChatTurn,
  Clarification,
  Depth,
  GenerateRequest,
  PipelineEvent,
  ReportMeta,
  ReportRecord,
  Review,
  StageId,
  UnitProfile,
} from "@/lib/types";
import ChatPanel from "./ChatPanel";
import HistoryView from "./HistoryView";
import InsightPanel, { type InsightTab } from "./InsightPanel";
import PipelineView, { INITIAL_STAGES, type StageState } from "./PipelineView";
import ReportEditor from "./ReportEditor";
import SettingsView from "./SettingsView";
import SourceInput from "./SourceInput";
import TemplatePicker from "./TemplatePicker";
import { Badge, Button, Toast, cx, scoreTone } from "./ui";

type View = "generator" | "riwayat" | "pengaturan";
type Health = { anthropic: boolean; model: string; transcription: boolean };

const QUICK_INSTRUCTIONS = [
  "Fokus pada potensi gangguan kamtibmas",
  "Tonjolkan peran Forkopimcam",
  "Sertakan pokok-pokok sambutan pejabat",
  "Gunakan bahasa singkat dan lugas",
  "Tekankan langkah pencegahan",
];

const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [view, setView] = useState<View>("generator");
  const [phase, setPhase] = useState<"input" | "workspace">("input");
  const [dark, setDark] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [profile, setProfile] = useState<UnitProfile | null>(null);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  // Input
  const [templateId, setTemplateId] = useState("laporan-informasi");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [instruction, setInstruction] = useState("");
  const [depth, setDepth] = useState<Depth>("standar");
  const [reportDate, setReportDate] = useState(today());
  const [previous, setPrevious] = useState<{ title: string; fields: Record<string, string> } | null>(null);

  // Pipeline
  const [stages, setStages] = useState<StageState[]>(INITIAL_STAGES);
  const [thinking, setThinking] = useState<Partial<Record<StageId, string>>>({});
  const [chars, setChars] = useState(0);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Hasil
  const [fields, setFields] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<ReportMeta>({ nomor: "", tanggal: new Date().toISOString(), klasifikasi: "BIASA" });
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [insightTab, setInsightTab] = useState<InsightTab>("mutu");
  const [transform, setTransform] = useState<{ title: string; text: string | null } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const template = getTemplate(templateId);
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setProfile(loadProfile());
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ anthropic: false, model: "-", transcription: false }));
  }, []);

  const notify = useCallback((msg: string, err?: boolean) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), err ? 5000 : 2500);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("pl.theme", next ? "dark" : "light");
    } catch {}
  };

  // ===== Simpan ke riwayat (debounce saat menyunting) =====
  const persist = useCallback(
    async (id: string, f: Record<string, string>, a: Analysis | null, r: Review | null, m: ReportMeta) => {
      const t = getTemplate(templateId);
      const title =
        f.perihal?.trim() ||
        f.teks_wa?.split("\n").find((l) => l.trim())?.replace(/\*/g, "").slice(0, 90) ||
        `${t.title} ${new Date(m.tanggal).toLocaleDateString("id-ID")}`;
      const parts = [
        attachments.filter((x) => x.role === "dokumentasi").length && `${attachments.filter((x) => x.role === "dokumentasi").length} foto`,
        attachments.filter((x) => x.role === "dokumen").length && `${attachments.filter((x) => x.role === "dokumen").length} foto dokumen`,
        attachments.filter((x) => x.role === "pdf").length && `${attachments.filter((x) => x.role === "pdf").length} PDF`,
        transcript.trim() && "transkrip suara",
        text.trim() && "catatan teks",
      ].filter(Boolean);
      const rec: ReportRecord = {
        id,
        templateId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meta: m,
        fields: f,
        analysis: a,
        review: r,
        sourcesSummary: parts.join(", "),
        attachments: attachments.filter((x) => x.role === "dokumentasi"),
      };
      try {
        await saveReport(rec);
      } catch {
        await saveReport({ ...rec, attachments: [] }).catch(() => {});
      }
    },
    [templateId, attachments, transcript, text],
  );

  useEffect(() => {
    if (!recordId || running || !Object.keys(fields).length) return;
    const h = setTimeout(() => persist(recordId, fields, analysis, review, meta), 800);
    return () => clearTimeout(h);
  }, [fields, meta, recordId, running, analysis, review, persist]);

  // ===== Pipeline =====
  const handleEvent = useCallback(
    (e: PipelineEvent, id: string) => {
      switch (e.type) {
        case "stage":
          setStages((s) =>
            s.map((st) =>
              st.id === e.stage ? { ...st, status: e.status === "start" ? "running" : "done", label: e.label, detail: e.detail ?? (e.status === "start" ? undefined : st.detail) } : st,
            ),
          );
          if (e.status === "start") {
            setChars(0);
            setThinking((t) => (t[e.stage] ? { ...t, [e.stage]: t[e.stage] + "\n\n— — —\n\n" } : t));
          }
          break;
        case "thinking":
          setThinking((t) => ({ ...t, [e.stage]: (t[e.stage] ?? "") + e.text }));
          break;
        case "progress":
          setChars(e.chars);
          break;
        case "analysis":
          setAnalysis(e.data);
          break;
        case "draft":
          setFields(e.fields);
          break;
        case "review":
          setReview(e.data);
          break;
        case "final": {
          setFields(e.fields);
          setReview(e.review);
          setAnalysis(e.analysis);
          setStages((s) => s.map((st) => (st.status === "pending" ? { ...st, status: "done", label: "Tidak diperlukan — draf lolos verifikasi" } : st)));
          setRunning(false);
          persist(id, e.fields, e.analysis, e.review, metaRef.current);
          const cached = e.usage.cacheRead;
          notify(`Laporan selesai • ${e.usage.calls} panggilan AI${cached ? ` • ${Math.round(cached / 1000)}k token dari cache` : ""}`);
          break;
        }
        case "error":
          setRunning(false);
          setLastError(e.message);
          notify(e.message, true);
          break;
      }
    },
    [notify, persist],
  );

  const generate = async (clar: Clarification[] = []) => {
    if (!profile) return;
    if (!attachments.length && !text.trim() && !transcript.trim() && !clar.length && !previous) {
      notify("Masukkan minimal satu sumber data lapangan.", true);
      return;
    }
    const id = clar.length && recordId ? recordId : uid();
    setRecordId(id);
    setPhase("workspace");
    setStages(INITIAL_STAGES);
    setThinking({});
    setChars(0);
    setRunning(true);
    setLastError(null);
    setStartedAt(Date.now());
    if (!clar.length) {
      setFields({});
      setAnalysis(null);
      setReview(null);
      setChat([]);
      const m: ReportMeta = { nomor: defaultNumber(template, reportDate), tanggal: new Date(reportDate).toISOString(), klasifikasi: meta.klasifikasi };
      metaRef.current = m;
      setMeta(m);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });

    const body: GenerateRequest = {
      templateId,
      attachments,
      text,
      transcript,
      instruction,
      depth,
      profile,
      reportDate: new Date(reportDate).toISOString(),
      clarifications: clar,
      previousReport: previous?.fields,
    };
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: res.status === 413 ? "Berkas terlalu besar untuk server." : `Galat ${res.status}` }));
        throw new Error(j.error);
      }
      await readEvents(res, (e) => handleEvent(e, id));
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setLastError((e as Error).message);
        notify((e as Error).message, true);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setRunning(false);
    notify("Proses dibatalkan.");
  };

  // ===== Aksi workspace =====
  const setField = useCallback((k: string, v: string) => setFields((f) => ({ ...f, [k]: v })), []);

  const copyText = async () => {
    await navigator.clipboard.writeText(toPlainText(template, fields, meta));
    notify("Teks laporan disalin.");
  };

  const exportDocx = async () => {
    if (!profile) return;
    setExporting(true);
    try {
      if (template.format === "wa") {
        download(new Blob([fields.teks_wa ?? ""], { type: "text/plain;charset=utf-8" }), `${template.short.replace(/\W+/g, "_")}.txt`);
      } else {
        const blob = await buildDocx({ template, fields, meta, profile, attachments: attachments.filter((a) => a.role === "dokumentasi") });
        const name = (fields.perihal || template.title).replace(/^tentang\s+/i, "").replace(/[^\w\s-]/g, "").trim().slice(0, 60).replace(/\s+/g, "_");
        download(blob, `${template.short.replace(/\W+/g, "")}_${name || "laporan"}.docx`);
      }
    } catch (e) {
      notify(`Ekspor gagal: ${(e as Error).message}`, true);
    } finally {
      setExporting(false);
    }
  };

  const runTransform = async (mode: "wa" | "ringkasan", title: string) => {
    setTransform({ title, text: null });
    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, fields, mode, pengirim: profile?.pelapor }),
      });
      const j = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(j.error);
      setTransform({ title, text: j.text ?? "" });
    } catch (e) {
      setTransform(null);
      notify((e as Error).message, true);
    }
  };

  const openRecord = (r: ReportRecord) => {
    setTemplateId(r.templateId);
    setFields(r.fields);
    setMeta(r.meta);
    setAnalysis(r.analysis);
    setReview(r.review);
    setRecordId(r.id);
    setAttachments(r.attachments ?? []);
    setText("");
    setTranscript("");
    setChat([]);
    setClarifications([]);
    setStages(INITIAL_STAGES.map((s) => ({ ...s, status: "done" })));
    setThinking({});
    setPhase("workspace");
    setView("generator");
  };

  const startLapju = (r: ReportRecord) => {
    const t = getTemplate(r.templateId);
    setPrevious({ title: r.title, fields: Object.fromEntries(t.fields.map((f) => [f.label, r.fields[f.key] ?? ""])) });
    setTemplateId("wa-kemajuan");
    setAttachments([]);
    setText("");
    setTranscript("");
    setInstruction("");
    setPhase("input");
    setView("generator");
    notify("Laporan sebelumnya dimuat. Tambahkan perkembangan terbaru.");
  };

  const avg = review
    ? Math.round((review.skor.akurasi + review.skor.kelengkapan + review.skor.kejelasan + review.skor.kepatuhan_format + review.skor.kedalaman_analisis) / 5)
    : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/5 dark:bg-[#0b0e17]/80">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow">
              <ScrollText className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Pembuat Laporan AI</div>
              <div className="hidden text-[10px] uppercase tracking-wider text-slate-500 sm:block">Analisis · Verifikasi · Revisi</div>
            </div>
          </div>
          <nav className="ml-2 flex gap-1 sm:ml-6">
            {(
              [
                ["generator", "Generator", Sparkles],
                ["riwayat", "Riwayat", History],
                ["pengaturan", "Pengaturan", Settings],
              ] as const
            ).map(([id, label, I]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition",
                  view === id ? "bg-slate-100 font-medium text-slate-900 dark:bg-white/10 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                <I className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {health && !health.anthropic && <Badge tone="red">API key belum diatur</Badge>}
            <button onClick={toggleTheme} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Ganti tema">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6">
        {view === "riwayat" && <HistoryView onOpen={openRecord} onDuplicate={startLapju} />}
        {view === "pengaturan" && profile && (
          <SettingsView
            profile={profile}
            health={health}
            onSave={(p) => {
              setProfile(p);
              saveProfile(p);
              notify("Profil satuan disimpan.");
            }}
          />
        )}

        {view === "generator" && phase === "input" && (
          <div className="mx-auto max-w-5xl space-y-5">
            <div className="py-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buat laporan dinas dari bahan mentah lapangan</h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                AI menganalisis foto, dokumen, PDF, rekaman suara, dan catatan Anda; mengekstrak fakta & menilai risiko; menyusun draf sesuai format; lalu memeriksa dan merevisi sendiri sebelum diserahkan kepada Anda.
              </p>
            </div>

            <section className="card space-y-4 p-5">
              <div className="label-step">1 · Jenis laporan</div>
              <TemplatePicker value={templateId} onChange={setTemplateId} />
            </section>

            <section className="card space-y-4 p-5">
              <div className="label-step">2 · Data fakta lapangan (boleh lebih dari satu jenis)</div>
              {previous && (
                <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
                  <History className="mt-0.5 h-4 w-4 text-brand-600" />
                  <div className="flex-1">
                    <div className="font-medium">Menindaklanjuti laporan sebelumnya</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">{previous.title}</div>
                  </div>
                  <button onClick={() => setPrevious(null)} aria-label="Lepas laporan sebelumnya">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              )}
              {template.needsPrevious && !previous && (
                <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  Tip: buka <b>Riwayat</b> lalu pilih “Buat lapju” pada laporan awal agar AI dapat membandingkan perkembangannya.
                </div>
              )}
              <SourceInput
                attachments={attachments}
                setAttachments={(fn) => setAttachments(fn)}
                text={text}
                setText={setText}
                transcript={transcript}
                setTranscript={(fn) => setTranscript(fn)}
                transcriptionEnabled={!!health?.transcription}
                notify={notify}
              />
            </section>

            <section className="card space-y-4 p-5">
              <div className="label-step">3 · Arahan & preferensi AI (opsional)</div>
              <textarea
                className="input min-h-20"
                placeholder="Mis. fokuskan pada potensi konflik antarwarga dan sebutkan peran Bhabinkamtibmas…"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_INSTRUCTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInstruction((i) => (i.trim() ? `${i.trim()}\n- ${q}` : `- ${q}`))}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    + {q}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <div className="text-sm font-medium">Kedalaman penalaran</div>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                    {(["cepat", "standar", "mendalam"] as Depth[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDepth(d)}
                        className={cx(
                          "rounded-lg py-1.5 text-xs font-medium capitalize transition",
                          depth === d ? "bg-white shadow-sm dark:bg-white/15" : "text-slate-500",
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {depth === "cepat" && "Sekali verifikasi tanpa revisi. ±1 menit."}
                    {depth === "standar" && "Verifikasi + 1 putaran revisi. ±2–3 menit."}
                    {depth === "mendalam" && "Penalaran maksimal + hingga 2 revisi. ±4–6 menit."}
                  </div>
                </div>
                <label className="space-y-1.5">
                  <div className="text-sm font-medium">Tanggal laporan</div>
                  <input type="date" className="input" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <div className="text-sm font-medium">Klasifikasi</div>
                  <select className="input" value={meta.klasifikasi} onChange={(e) => setMeta({ ...meta, klasifikasi: e.target.value as ReportMeta["klasifikasi"] })}>
                    <option>BIASA</option>
                    <option>TERBATAS</option>
                    <option>RAHASIA</option>
                  </select>
                </label>
              </div>
            </section>

            <div className="sticky bottom-4 z-20">
              <Button variant="primary" size="lg" className="w-full shadow-xl" onClick={() => generate()} disabled={running || !health?.anthropic}>
                <Wand2 className="h-5 w-5" />
                <span className="sm:hidden">Mulai Analisis AI</span>
                <span className="hidden sm:inline">Mulai Analisis & Susun {template.title}</span>
              </Button>
            </div>
          </div>
        )}

        {view === "generator" && phase === "workspace" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => setPhase("input")} disabled={running}>
                <ArrowLeft className="h-4 w-4" /> Sumber
              </Button>
              <div className="mr-auto min-w-0">
                <div className="truncate text-sm font-semibold">{template.title}</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  {avg !== null && <Badge tone={scoreTone(avg)}>Mutu {avg}/100</Badge>}
                  {analysis && <Badge tone="violet">Nilai {analysis.penilaian_sumber.keandalan}–{analysis.penilaian_sumber.kebenaran}</Badge>}
                  {recordId && !running && Object.keys(fields).length > 0 && <span>Tersimpan otomatis</span>}
                </div>
              </div>
              <Button size="sm" onClick={() => generate()} disabled={running}>
                <RefreshCw className="h-3.5 w-3.5" /> Generate ulang
              </Button>
              {template.format === "dokumen" && (
                <>
                  <Button size="sm" onClick={() => runTransform("wa", "Format WhatsApp")} disabled={running || !Object.keys(fields).length}>
                    <MessageCircle className="h-3.5 w-3.5" /> Versi WA
                  </Button>
                  <Button size="sm" onClick={() => runTransform("ringkasan", "Ringkasan Pimpinan")} disabled={running || !Object.keys(fields).length}>
                    <Sparkles className="h-3.5 w-3.5" /> Ringkasan Pimpinan
                  </Button>
                </>
              )}
              <Button size="sm" onClick={copyText} disabled={!Object.keys(fields).length}>
                <ClipboardCopy className="h-3.5 w-3.5" /> Salin
              </Button>
              <Button size="sm" variant="primary" onClick={exportDocx} disabled={running || exporting || !Object.keys(fields).length}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                {template.format === "wa" ? "Unduh .txt" : "Unduh .docx"}
              </Button>
            </div>

            {(running || Object.keys(thinking).length > 0) && (
              <PipelineView stages={stages} thinking={thinking} chars={chars} running={running} startedAt={startedAt} onCancel={cancel} />
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0">
                {Object.keys(fields).length ? (
                  <ReportEditor
                    template={template}
                    fields={fields}
                    setField={setField}
                    meta={meta}
                    setMeta={setMeta}
                    profile={profile!}
                    review={review}
                    analysis={analysis}
                    locked={running}
                    notify={notify}
                  />
                ) : lastError && !running ? (
                  <div className="card flex h-96 flex-col items-center justify-center gap-3 px-6 text-center">
                    <AlertCircle className="h-7 w-7 text-red-500" />
                    <div className="text-sm font-medium">Laporan belum berhasil dibuat</div>
                    <div className="max-w-md text-xs text-slate-500">{lastError}</div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => setPhase("input")}>
                        <ArrowLeft className="h-3.5 w-3.5" /> Ubah sumber
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => generate()}>
                        <RefreshCw className="h-3.5 w-3.5" /> Coba lagi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="card flex h-96 flex-col items-center justify-center gap-3 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                    <div className="text-sm font-medium">Draf akan muncul setelah analisis bukti selesai</div>
                    <div className="max-w-sm text-xs text-slate-500">Sementara itu, hasil analisis (fakta, risiko, celah informasi) tampil di panel kanan begitu siap.</div>
                  </div>
                )}
              </div>
              <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
                <InsightPanel
                  tab={insightTab}
                  setTab={setInsightTab}
                  analysis={analysis}
                  review={review}
                  clarifications={clarifications}
                  setClarifications={setClarifications}
                  onEnrich={(c) => generate(c)}
                  running={running}
                  chat={
                    <ChatPanel
                      template={template}
                      fields={fields}
                      analysis={analysis}
                      history={chat}
                      setHistory={(fn) => setChat(fn)}
                      applyEdit={(k, v) => {
                        setField(k, v);
                        notify("Perubahan diterapkan.");
                      }}
                    />
                  }
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {transform && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setTransform(null)}>
          <div className="card w-full max-w-xl bg-white p-5 dark:bg-[#121625]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">{transform.title}</div>
              <button onClick={() => setTransform(null)} aria-label="Tutup">
                <X className="h-4 w-4" />
              </button>
            </div>
            {transform.text === null ? (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> AI sedang menyusun…
              </div>
            ) : (
              <>
                <textarea className="input scroll-thin h-80 font-sans text-sm leading-relaxed" value={transform.text} onChange={(e) => setTransform({ ...transform, text: e.target.value })} />
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(transform.text ?? "");
                      notify("Disalin ke papan klip.");
                    }}
                  >
                    <ClipboardCopy className="h-4 w-4" /> Salin
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Toast msg={toast?.msg ?? null} tone={toast?.err ? "red" : "slate"} />
    </div>
  );
}
