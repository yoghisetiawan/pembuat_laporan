"use client";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx";
import { groupSections, type TemplateDef } from "./templates";
import type { Attachment, ReportMeta, UnitProfile } from "./types";

const FONT = "Arial";
const SIZE = 22; // 11pt
const cm = (n: number) => Math.round(n * 567);

function run(text: string, opts: { bold?: boolean; underline?: boolean; size?: number; italics?: boolean } = {}) {
  return new TextRun({
    text,
    bold: opts.bold,
    italics: opts.italics,
    underline: opts.underline ? {} : undefined,
    font: FONT,
    size: opts.size ?? SIZE,
  });
}

function para(
  text: string,
  opts: { bold?: boolean; underline?: boolean; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; indent?: { left: number } } = {},
) {
  return new Paragraph({
    spacing: { after: 60, line: 276 },
    alignment: opts.alignment,
    indent: opts.indent,
    children: [run(text, { bold: opts.bold, underline: opts.underline })],
  });
}

const LIST_RE = /^\s*((\d+|[a-z])[.)]|[-•])\s+/;

/** Ubah isi bagian (paragraf / daftar bernomor) menjadi paragraf DOCX dengan indentasi menggantung. */
function bodyParagraphs(text: string, indent: number): Paragraph[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return [para("-", { indent: { left: indent } })];
  return lines.map((line) => {
    const m = line.match(LIST_RE);
    const isSub = /^\s+/.test(line) || /^\s*[a-z][.)]\s/.test(line);
    const left = indent + (isSub ? cm(0.8) : 0);
    if (m) {
      const marker = m[1];
      const rest = line.slice(m[0].length);
      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 60, line: 276 },
        indent: { left: left + cm(0.7), hanging: cm(0.7) },
        tabStops: [{ type: TabStopType.LEFT, position: left + cm(0.7) }],
        children: [run(`${marker}\t${rest}`)],
      });
    }
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80, line: 276 },
      indent: { left, firstLine: cm(1) },
      children: [run(line.trim())],
    });
  });
}

function fmtTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const SECTION_LETTERS = "ABCDEFGHIJKLMNOP";

export async function buildDocx(opts: {
  template: TemplateDef;
  fields: Record<string, string>;
  meta: ReportMeta;
  profile: UnitProfile;
  attachments?: Attachment[];
}): Promise<Blob> {
  const { template: t, fields, meta, profile } = opts;
  const children: Paragraph[] = [];

  if (meta.klasifikasi !== "BIASA") {
    children.push(para(meta.klasifikasi, { alignment: AlignmentType.RIGHT, bold: true, underline: true }));
  }
  // Kop surat
  const kop = profile.kopBaris.filter(Boolean);
  kop.forEach((line, i) => {
    const last = i === kop.length - 1;
    children.push(
      new Paragraph({
        spacing: { after: 0 },
        indent: { left: 0 },
        border: last ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000", space: 2 } } : undefined,
        children: [run(line, { bold: true, size: 22 })],
      }),
    );
  });
  children.push(
    new Paragraph({ spacing: { before: 40, after: 240 }, children: profile.alamat ? [run(profile.alamat, { size: 18, italics: true })] : [] }),
  );

  // Judul
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 }, children: [run(t.docTitle, { bold: true, underline: true, size: 24 })] }));
  if (meta.nomor.trim()) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run(`Nomor : ${meta.nomor}`)] }));
  } else {
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  // Bagian-bagian
  // Bagian yang seluruh isinya kosong tidak dicetak (mis. Catatan opsional)
  const groups = groupSections(t).filter((g) => g.fields.some((f) => (fields[f.key] ?? "").trim()));
  groups.forEach((g, gi) => {
    const letter = SECTION_LETTERS[gi] ?? String(gi + 1);
    if (g.section) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          tabStops: [{ type: TabStopType.LEFT, position: cm(0.8) }],
          children: [run(`${letter}.\t${g.section}`, { bold: true })],
        }),
      );
    }
    const single = g.fields.length === 1;
    for (const f of g.fields) {
      const val = (fields[f.key] ?? "").trim();
      if (f.kind === "line" && !single) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            indent: { left: cm(0.8) + cm(6.5), hanging: cm(6.5) },
            tabStops: [
              { type: TabStopType.LEFT, position: cm(0.8) + cm(6) },
              { type: TabStopType.LEFT, position: cm(0.8) + cm(6.5) },
            ],
            children: [run(`${f.label}\t:\t${val || "-"}`)],
          }),
        );
      } else {
        if (!single || !g.section) {
          children.push(new Paragraph({ spacing: { before: 80, after: 40 }, indent: { left: cm(0.8) }, children: [run(f.label, { bold: true })] }));
        }
        children.push(...bodyParagraphs(val, cm(0.8)));
      }
    }
  });

  // Tanda tangan
  const sigIndent = { left: cm(9) };
  children.push(new Paragraph({ spacing: { before: 400 }, indent: sigIndent, children: [run(`${profile.kota}, ${fmtTanggal(meta.tanggal)}`)] }));
  children.push(new Paragraph({ indent: sigIndent, children: [run(profile.penandatanganJabatan || "PELAPOR", { bold: true })] }));
  children.push(new Paragraph({ spacing: { before: 900 }, indent: sigIndent, children: [run(profile.penandatanganNama || "...............................", { bold: true, underline: true })] }));
  children.push(new Paragraph({ indent: sigIndent, children: [run(profile.penandatanganPangkatNrp || "PANGKAT / NRP ..................")] }));

  if (profile.distribusi.filter(Boolean).length) {
    children.push(new Paragraph({ spacing: { before: 300 }, children: [run("Distribusi :", { bold: true, underline: true })] }));
    profile.distribusi.filter(Boolean).forEach((d, i) => {
      children.push(new Paragraph({ indent: { left: cm(0.7), hanging: cm(0.7) }, tabStops: [{ type: TabStopType.LEFT, position: cm(0.7) }], children: [run(`${i + 1}.\t${d}.`)] }));
    });
  }

  // Lampiran dokumentasi
  const imgs = (opts.attachments ?? []).filter((a) => a.mediaType.startsWith("image/"));
  if (imgs.length) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run("LAMPIRAN DOKUMENTASI", { bold: true, underline: true, size: 24 })] }));
    for (const [i, a] of imgs.entries()) {
      const bytes = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0));
      const dim = await imageSize(a);
      const maxW = 450;
      const w = Math.min(maxW, dim.w);
      const h = Math.round((dim.h / dim.w) * w);
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120 },
          children: [new ImageRun({ type: a.mediaType === "image/png" ? "png" : "jpg", data: bytes, transformation: { width: w, height: h } })],
        }),
      );
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run(`Gambar ${i + 1}. ${a.name}`, { italics: true, size: 18 })] }));
    }
  }

  const doc = new Document({
    creator: "Pembuat Laporan AI",
    title: t.docTitle,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [
      {
        properties: { page: { size: { width: cm(21), height: cm(33) }, margin: { top: cm(2), bottom: cm(2), left: cm(3), right: cm(2) } } },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

function imageSize(a: Attachment): Promise<{ w: number; h: number }> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ w: img.width, h: img.height });
    img.onerror = () => res({ w: 400, h: 300 });
    img.src = `data:${a.mediaType};base64,${a.data}`;
  });
}

/** Teks polos untuk disalin (format dokumen ke teks). */
export function toPlainText(t: TemplateDef, fields: Record<string, string>, meta: ReportMeta): string {
  if (t.format === "wa") return fields.teks_wa ?? "";
  const out: string[] = [t.docTitle];
  if (meta.nomor.trim()) out.push(`Nomor: ${meta.nomor}`);
  out.push("");
  groupSections(t)
    .filter((g) => g.fields.some((f) => (fields[f.key] ?? "").trim()))
    .forEach((g, gi) => {
    if (g.section) out.push(`${SECTION_LETTERS[gi]}. ${g.section}`);
    for (const f of g.fields) {
      const v = (fields[f.key] ?? "").trim();
      if (f.kind === "line" && g.fields.length > 1) out.push(`   ${f.label} : ${v}`);
      else {
        if (g.fields.length > 1 || !g.section) out.push(`   ${f.label}`);
        out.push(v.split("\n").map((l) => `   ${l}`).join("\n"));
      }
    }
    out.push("");
  });
  return out.join("\n");
}
