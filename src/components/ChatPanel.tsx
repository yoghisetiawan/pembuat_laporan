"use client";
import { Check, Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TemplateDef } from "@/lib/templates";
import type { Analysis, ChatTurn } from "@/lib/types";
import { Button, cx } from "./ui";

const SUGGESTIONS = [
  "Apa kelemahan utama laporan ini?",
  "Tambahkan rekomendasi untuk Bhabinkamtibmas",
  "Apakah nilai informasi sudah tepat? Jelaskan",
  "Buat analisa lebih tajam soal potensi eskalasi",
];

export default function ChatPanel({
  template,
  fields,
  analysis,
  history,
  setHistory,
  applyEdit,
}: {
  template: TemplateDef;
  fields: Record<string, string>;
  analysis: Analysis | null;
  history: ChatTurn[];
  setHistory: (fn: (h: ChatTurn[]) => ChatTurn[]) => void;
  applyEdit: (field: string, value: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [history, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const prior = history;
    setHistory((h) => [...h, { role: "user", content: text }]);
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id, fields, analysis, history: prior, message: text }),
      });
      const j = (await res.json()) as { balasan?: string; usulan_perubahan?: ChatTurn["edits"]; error?: string };
      if (!res.ok) throw new Error(j.error || "Gagal");
      setHistory((h) => [...h, { role: "assistant", content: j.balasan ?? "", edits: j.usulan_perubahan ?? [] }]);
    } catch (e) {
      setHistory((h) => [...h, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const label = (k: string) => template.fields.find((f) => f.key === k)?.label ?? k;

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
        {history.length === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Sparkles className="h-4 w-4 shrink-0 text-brand-500" />
              Tanyakan apa saja tentang laporan ini, atau minta perubahan — AI akan mengusulkan revisi yang bisa Anda terapkan satu klik.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((t, i) => (
          <div key={i} className={cx("flex", t.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cx(
                "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                t.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-white/[0.06] dark:text-slate-100",
              )}
            >
              <div className="whitespace-pre-wrap">{t.content.replace(/\*\*(.+?)\*\*/g, "$1")}</div>
              {t.edits?.map((e, j) => (
                <div key={j} className="mt-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                  <div className="mb-1 font-semibold">Usulan: {label(e.field)}</div>
                  <div className="mb-1.5 text-slate-500">{e.alasan}</div>
                  <div className="scroll-thin max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 dark:bg-white/5">{e.nilai_baru}</div>
                  <Button
                    size="sm"
                    variant={e.applied ? "secondary" : "primary"}
                    className="mt-2"
                    disabled={e.applied}
                    onClick={() => {
                      applyEdit(e.field, e.nilai_baru);
                      setHistory((h) =>
                        h.map((turn, ti) =>
                          ti === i ? { ...turn, edits: turn.edits?.map((x, xi) => (xi === j ? { ...x, applied: true } : x)) } : turn,
                        ),
                      );
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> {e.applied ? "Diterapkan" : "Terapkan"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI menimbang jawaban…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(msg);
        }}
        className="flex gap-2 border-t border-slate-100 p-3 dark:border-white/5"
      >
        <input className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tulis pertanyaan atau permintaan revisi…" />
        <Button variant="primary" type="submit" disabled={busy || !msg.trim()} aria-label="Kirim">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
