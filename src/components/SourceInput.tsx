"use client";
import { FileAudio, FileText, ImagePlus, Loader2, Mic, Square, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fileToAttachment, fmtBytes } from "@/lib/files";
import type { Attachment } from "@/lib/types";
import { Badge, Button, Tabs, cx } from "./ui";

type Tab = "dokumentasi" | "dokumen" | "pdf" | "audio" | "teks";

interface Props {
  attachments: Attachment[];
  setAttachments: (fn: (a: Attachment[]) => Attachment[]) => void;
  text: string;
  setText: (v: string) => void;
  transcript: string;
  setTranscript: (fn: (v: string) => string) => void;
  transcriptionEnabled: boolean;
  notify: (msg: string, error?: boolean) => void;
}

const SOFT_LIMIT = 4.2 * 1024 * 1024; // batas body Vercel ~4.5MB

export default function SourceInput(p: Props) {
  const [tab, setTab] = useState<Tab>("dokumentasi");
  const count = (r: Attachment["role"]) => p.attachments.filter((a) => a.role === r).length;
  const total = p.attachments.reduce((s, a) => s + a.data.length, 0) + p.text.length + p.transcript.length;

  return (
    <div className="space-y-3">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "dokumentasi", label: "Foto Lapangan", icon: "Camera", count: count("dokumentasi") },
          { id: "dokumen", label: "Foto Dokumen", icon: "ScanText", count: count("dokumen") },
          { id: "pdf", label: "PDF", icon: "FileText", count: count("pdf") },
          { id: "audio", label: "Suara", icon: "Mic", count: p.transcript.trim() ? 1 : 0 },
          { id: "teks", label: "Teks", icon: "Type", count: p.text.trim() ? 1 : 0 },
        ]}
      />

      {tab === "dokumentasi" && (
        <ImageDrop role="dokumentasi" {...p} hint="Foto kegiatan/kejadian di lapangan. AI membaca jumlah massa, spanduk, atribut, dan kondisi lokasi." />
      )}
      {tab === "dokumen" && (
        <ImageDrop role="dokumen" {...p} hint="Foto rundown, undangan, surat, atau daftar hadir. AI mengutip nama, jabatan, dan susunan acara persis." />
      )}
      {tab === "pdf" && <PdfDrop {...p} />}
      {tab === "audio" && <AudioInput {...p} />}
      {tab === "teks" && (
        <textarea
          className="input min-h-44 leading-relaxed"
          placeholder="Tempel catatan lapangan, pesan WhatsApp, kronologi, atau informasi dari sumber di sini…"
          value={p.text}
          onChange={(e) => p.setText(e.target.value)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Total muatan: {fmtBytes(total)}</span>
        {total > SOFT_LIMIT && <Badge tone="amber">Melebihi ~4,2 MB — bila di-deploy di Vercel, kurangi berkas</Badge>}
      </div>
    </div>
  );
}

function Dropzone({ accept, onFiles, children }: { accept: string; onFiles: (f: File[]) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cx(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition",
        over ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20",
      )}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}

function ImageDrop({ role, hint, attachments, setAttachments, notify }: Props & { role: "dokumentasi" | "dokumen"; hint: string }) {
  const [busy, setBusy] = useState(false);
  const items = attachments.filter((a) => a.role === role);
  const add = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return notify("Pilih berkas gambar (JPG/PNG/WEBP).", true);
    setBusy(true);
    try {
      const out = await Promise.all(imgs.map((f) => fileToAttachment(f, role)));
      setAttachments((a) => [...a, ...out]);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <Dropzone accept="image/*" onFiles={add}>
        {busy ? <Loader2 className="h-6 w-6 animate-spin text-brand-500" /> : <ImagePlus className="h-6 w-6 text-slate-400" />}
        <div className="text-sm font-medium">{busy ? "Mengompresi gambar…" : "Seret & lepas atau klik untuk memilih gambar"}</div>
        <div className="max-w-md text-xs text-slate-500">{hint}</div>
      </Dropzone>
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {items.map((a, i) => (
            <div key={a.id} className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:${a.mediaType};base64,${a.data}`} alt={a.name} className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {role === "dokumen" ? "Dok" : "Gbr"} {i + 1} · {fmtBytes(a.size)}
              </div>
              <button
                onClick={() => setAttachments((all) => all.filter((x) => x.id !== a.id))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Hapus"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PdfDrop({ attachments, setAttachments, notify }: Props) {
  const items = attachments.filter((a) => a.role === "pdf");
  const add = async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === "application/pdf");
    if (!pdfs.length) return notify("Pilih berkas PDF.", true);
    const big = pdfs.find((f) => f.size > 20 * 1024 * 1024);
    if (big) return notify(`${big.name} terlalu besar (maks. 20 MB).`, true);
    const out = await Promise.all(pdfs.map((f) => fileToAttachment(f, "pdf")));
    setAttachments((a) => [...a, ...out]);
  };
  return (
    <div className="space-y-3">
      <Dropzone accept="application/pdf" onFiles={add}>
        <Upload className="h-6 w-6 text-slate-400" />
        <div className="text-sm font-medium">Unggah guidebook / panduan acara / dokumen PDF</div>
        <div className="text-xs text-slate-500">AI membaca teks, tabel, dan gambar di dalam PDF.</div>
      </Dropzone>
      {items.map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
          <FileText className="h-4 w-4 text-red-500" />
          <span className="flex-1 truncate text-sm">{a.name}</span>
          <span className="text-xs text-slate-500">{fmtBytes(a.size)}</span>
          <button onClick={() => setAttachments((all) => all.filter((x) => x.id !== a.id))} aria-label="Hapus">
            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ===== Audio: dikte langsung (Web Speech API) + transkripsi berkas (server) =====
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function AudioInput({ transcript, setTranscript, transcriptionEnabled, notify }: Props) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const wantRef = useRef(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => {
      wantRef.current = false;
      recRef.current?.stop();
    };
  }, []);

  const start = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return notify("Browser tidak mendukung dikte. Gunakan Chrome/Edge.", true);
    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let fin = "";
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else tmp += r[0].transcript;
      }
      if (fin) setTranscript((t) => (t ? t.trimEnd() + " " : "") + fin.trim());
      setInterim(tmp);
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") notify(`Dikte: ${e.error}`, true);
    };
    // Browser menghentikan sesi setelah hening; mulai ulang otomatis agar bisa merekam lama
    rec.onend = () => {
      if (wantRef.current) {
        try {
          rec.start();
        } catch {}
      } else {
        setRecording(false);
        setInterim("");
      }
    };
    recRef.current = rec;
    wantRef.current = true;
    rec.start();
    setRecording(true);
  };
  const stop = () => {
    wantRef.current = false;
    recRef.current?.stop();
  };

  const upload = async (files: File[]) => {
    const f = files.find((x) => x.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|opus|webm|aac)$/i.test(x.name));
    if (!f) return notify("Pilih berkas audio (MP3, M4A, WAV, OPUS).", true);
    setBusy(f.name);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const j = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !j.text) throw new Error(j.error || "Transkripsi gagal.");
      setTranscript((t) => (t ? t + "\n\n" : "") + `[Rekaman: ${f.name}]\n` + j.text);
      notify("Transkripsi selesai.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 p-5 text-center dark:border-white/10">
          <button
            onClick={recording ? stop : start}
            disabled={!supported}
            className={cx(
              "flex h-14 w-14 items-center justify-center rounded-full text-white transition disabled:opacity-40",
              recording ? "animate-pulse bg-red-600" : "bg-brand-600 hover:bg-brand-700",
            )}
            aria-label={recording ? "Hentikan dikte" : "Mulai dikte"}
          >
            {recording ? <Square className="h-5 w-5" /> : <Mic className="h-6 w-6" />}
          </button>
          <div className="text-sm font-medium">{recording ? "Mendengarkan… klik untuk berhenti" : "Dikte Langsung"}</div>
          <div className="text-xs text-slate-500">
            {supported ? "Bicara dalam Bahasa Indonesia; teks langsung masuk ke transkrip." : "Tidak didukung browser ini (gunakan Chrome/Edge)."}
          </div>
        </div>
        <Dropzone accept="audio/*,.m4a,.opus" onFiles={upload}>
          {busy ? <Loader2 className="h-6 w-6 animate-spin text-brand-500" /> : <FileAudio className="h-6 w-6 text-slate-400" />}
          <div className="text-sm font-medium">{busy ? `Mentranskripsi ${busy}…` : "Unggah rekaman (MP3/M4A/WAV/OPUS)"}</div>
          <div className="text-xs text-slate-500">
            {transcriptionEnabled ? "Transkripsi otomatis dengan penanda pembicara & waktu." : "Butuh GEMINI_API_KEY di server untuk aktif."}
          </div>
        </Dropzone>
      </div>
      <textarea
        className="input min-h-36 leading-relaxed"
        placeholder="Transkrip suara akan muncul di sini dan dapat disunting…"
        value={transcript + (interim ? ` ${interim}` : "")}
        onChange={(e) => setTranscript(() => e.target.value)}
      />
    </div>
  );
}
