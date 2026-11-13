"use client";
import { AlertTriangle, Loader2, Sparkles, Undo2, Wand2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { streamTextResponse } from "@/lib/sse";
import { groupSections, type FieldDef, type TemplateDef } from "@/lib/templates";
import type { Analysis, ReportMeta, Review, UnitProfile } from "@/lib/types";
import { cx } from "./ui";

const ACTIONS: { id: string; label: string }[] = [
  { id: "perbaiki", label: "Perbaiki bahasa" },
  { id: "formalkan", label: "Formalkan" },
  { id: "perpanjang", label: "Perluas" },
  { id: "ringkas", label: "Ringkas" },
  { id: "pertajam", label: "Pertajam analisa" },
  { id: "poin", label: "Jadikan poin" },
];

const LETTERS = "ABCDEFGHIJKLMNOP";

function AutoText({ value, onChange, className, readOnly, placeholder }: { value: string; onChange: (v: string) => void; className?: string; readOnly?: boolean; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };
    fit();
    // ukur ulang saat lebar berubah (font termuat, panel berubah ukuran)
    let lastW = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== lastW) {
        lastW = el.clientWidth;
        fit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cx("w-full resize-none overflow-hidden bg-transparent outline-none", className)}
    />
  );
}

interface Props {
  template: TemplateDef;
  fields: Record<string, string>;
  setField: (key: string, value: string) => void;
  meta: ReportMeta;
  setMeta: (m: ReportMeta) => void;
  profile: UnitProfile;
  review: Review | null;
  analysis: Analysis | null;
  locked: boolean;
  notify: (m: string, err?: boolean) => void;
}

export default function ReportEditor(p: Props) {
  const { template: t } = p;
  const [busy, setBusy] = useState<string | null>(null);
  const [undo, setUndo] = useState<Record<string, string>>({});

  const refine = async (f: FieldDef, action: string, instruction?: string) => {
    if (busy) return;
    setBusy(f.key);
    const before = p.fields[f.key] ?? "";
    setUndo((u) => ({ ...u, [f.key]: before }));
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: t.id, fieldKey: f.key, value: before, action, instruction, fields: p.fields, analysis: p.analysis }),
      });
      if (!res.ok) throw new Error(await res.text());
      const ERR = "\u0000ERR:";
      const full = await streamTextResponse(res, (txt) => p.setField(f.key, txt.split(ERR)[0]));
      const [content, err] = full.split(ERR);
      if (err !== undefined) throw new Error(err);
      p.setField(f.key, content.trim());
    } catch (e) {
      p.setField(f.key, before);
      setUndo((u) => {
        const n = { ...u };
        delete n[f.key];
        return n;
      });
      p.notify((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  const findings = (key: string) => p.review?.temuan.filter((x) => x.field === key) ?? [];

  if (t.format === "wa") {
    const f = t.fields[0];
    return (
      <div className="card p-5">
        <div className="mx-auto max-w-xl rounded-2xl bg-[#e7ffdb] p-4 shadow-inner dark:bg-[#1f2c24]">
          <AutoText
            value={p.fields[f.key] ?? ""}
            onChange={(v) => p.setField(f.key, v)}
            readOnly={p.locked}
            className="min-h-60 font-sans text-[14px] leading-relaxed text-slate-900 dark:text-slate-100"
          />
        </div>
        <FieldTools f={f} busy={busy} undo={undo} setUndo={setUndo} refine={refine} setField={p.setField} locked={p.locked} findings={findings(f.key)} />
      </div>
    );
  }

  const groups = groupSections(t);
  return (
    <div className="doc-paper mx-auto w-full max-w-[820px] rounded-sm bg-white px-6 py-8 text-[14px] leading-relaxed text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,.08),0_8px_32px_rgba(0,0,0,.08)] sm:px-14 sm:py-12 dark:bg-[#fbfbf8]">
      {p.meta.klasifikasi !== "BIASA" && <div className="mb-2 text-right font-bold underline">{p.meta.klasifikasi}</div>}
      <div className="inline-block">
        {p.profile.kopBaris.filter(Boolean).map((l, i, arr) => (
          <div key={i} className={cx("text-[13px] font-bold uppercase", i === arr.length - 1 && "border-b-2 border-neutral-900 pb-0.5")}>
            {l}
          </div>
        ))}
        {p.profile.alamat && <div className="mt-1 text-[11px] italic text-neutral-600">{p.profile.alamat}</div>}
      </div>

      <div className="mt-6 text-center">
        <div className="text-[15px] font-bold underline">{t.docTitle}</div>
        {t.numberFormat && (
          <div className="mt-0.5 flex items-center justify-center gap-1">
            <span>Nomor :</span>
            <input
              value={p.meta.nomor}
              onChange={(e) => p.setMeta({ ...p.meta, nomor: e.target.value })}
              className="w-[22rem] max-w-full rounded bg-transparent px-1 text-center outline-none hover:bg-neutral-100 focus:bg-neutral-100"
            />
          </div>
        )}
      </div>

      <div className="mt-6 space-y-5">
        {groups.map((g, gi) => (
          <section key={gi}>
            {g.section && (
              <h3 className="mb-1.5 flex gap-3 font-bold">
                <span className="w-5">{LETTERS[gi]}.</span>
                {g.section}
              </h3>
            )}
            <div className="space-y-2 pl-8">
              {g.fields.map((f) => {
                const showLabel = g.fields.length > 1 || !g.section;
                const fs = findings(f.key);
                const inline = f.kind === "line" && g.fields.length > 1;
                return (
                  <div
                    key={f.key}
                    className={cx(
                      "group relative -mx-2 rounded-md px-2 py-1 transition",
                      busy === f.key ? "bg-brand-50 ring-1 ring-brand-300" : "hover:bg-neutral-50",
                      fs.some((x) => x.tingkat !== "minor") && "ring-1 ring-amber-300",
                    )}
                  >
                    {inline ? (
                      <div className="grid grid-cols-[minmax(0,15rem)_0.75rem_minmax(0,1fr)] gap-1">
                        <span>{f.label}</span>
                        <span>:</span>
                        <AutoText value={p.fields[f.key] ?? ""} onChange={(v) => p.setField(f.key, v)} readOnly={p.locked} placeholder="…" />
                      </div>
                    ) : (
                      <>
                        {showLabel && <div className="font-semibold">{f.label}</div>}
                        <AutoText
                          value={p.fields[f.key] ?? ""}
                          onChange={(v) => p.setField(f.key, v)}
                          readOnly={p.locked}
                          placeholder="…"
                          className="text-justify"
                        />
                      </>
                    )}
                    <FieldTools f={f} busy={busy} undo={undo} setUndo={setUndo} refine={refine} setField={p.setField} locked={p.locked} findings={fs} floating />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 flex justify-end">
        <div className="w-72 text-center">
          <div>
            {p.profile.kota}, {new Date(p.meta.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="font-bold uppercase">{p.profile.penandatanganJabatan || "PELAPOR"}</div>
          <div className="mt-16 font-bold underline">{p.profile.penandatanganNama || "……………………………"}</div>
          <div>{p.profile.penandatanganPangkatNrp || "PANGKAT / NRP ……………"}</div>
        </div>
      </div>
      {p.profile.distribusi.filter(Boolean).length > 0 && (
        <div className="mt-8 text-[13px]">
          <div className="font-bold underline">Distribusi :</div>
          {p.profile.distribusi.filter(Boolean).map((d, i) => (
            <div key={i}>
              {i + 1}. {d}.
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldTools({
  f,
  busy,
  undo,
  setUndo,
  refine,
  setField,
  locked,
  findings,
  floating,
}: {
  f: FieldDef;
  busy: string | null;
  undo: Record<string, string>;
  setUndo: (fn: (u: Record<string, string>) => Record<string, string>) => void;
  refine: (f: FieldDef, action: string, instruction?: string) => void;
  setField: (k: string, v: string) => void;
  locked: boolean;
  findings: Review["temuan"];
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  if (locked) return null;
  const isBusy = busy === f.key;

  return (
    <div
      ref={boxRef}
      className={cx(
        "font-sans",
        floating ? "absolute -top-3 right-1 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100" : "mt-3 flex justify-center gap-2",
        (open || isBusy || findings.length > 0) && "opacity-100",
      )}
    >
      {findings.length > 0 && (
        <span
          title={findings.map((x) => `• [${x.tingkat}] ${x.masalah} → ${x.saran}`).join("\n")}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-amber-100 px-2 text-[11px] font-medium text-amber-800"
        >
          <AlertTriangle className="h-3 w-3" /> {findings.length}
        </span>
      )}
      {undo[f.key] !== undefined && !isBusy && (
        <button
          onClick={() => {
            setField(f.key, undo[f.key]);
            setUndo((u) => {
              const n = { ...u };
              delete n[f.key];
              return n;
            });
          }}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-white px-2 text-[11px] font-medium text-neutral-600 shadow ring-1 ring-neutral-200 hover:bg-neutral-50"
        >
          <Undo2 className="h-3 w-3" /> Batal
        </button>
      )}
      <div className="relative">
        <button
          disabled={!!busy}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-600 px-2.5 text-[11px] font-medium text-white shadow hover:bg-brand-700 disabled:opacity-60"
        >
          {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {isBusy ? "Menulis…" : "AI"}
        </button>
        {open && (
          <div className="absolute right-0 top-8 z-20 w-64 rounded-xl border border-neutral-200 bg-white p-1.5 text-neutral-800 shadow-xl">
            {findings.length > 0 && (
              <button
                onClick={() => {
                  setOpen(false);
                  refine(f, "kustom", `Perbaiki temuan pemeriksa berikut: ${findings.map((x) => `${x.masalah} (saran: ${x.saran})`).join("; ")}`);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-amber-700 hover:bg-amber-50"
              >
                <Wand2 className="h-3.5 w-3.5" /> Perbaiki {findings.length} temuan
              </button>
            )}
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setOpen(false);
                  refine(f, a.id);
                }}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-neutral-100"
              >
                {a.label}
              </button>
            ))}
            <form
              className="mt-1 border-t border-neutral-100 p-1 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!custom.trim()) return;
                setOpen(false);
                refine(f, "kustom", custom);
                setCustom("");
              }}
            >
              <input
                autoFocus
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Instruksi bebas, mis. 'tambahkan jumlah massa'"
                className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-brand-400"
              />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
