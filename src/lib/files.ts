"use client";
import type { Attachment } from "./types";

export const uid = () => crypto.randomUUID();

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

/** Kompres gambar di browser (maks. sisi 1600px, JPEG) agar muat batas unggah server. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<{ data: string; mediaType: string; size: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`Gagal membaca gambar ${file.name}`));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const data = dataUrl.split(",")[1];
    return { data, mediaType: "image/jpeg", size: Math.round((data.length * 3) / 4) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fileToAttachment(file: File, role: Attachment["role"]): Promise<Attachment> {
  if (file.type === "application/pdf") {
    const dataUrl = await readAsDataURL(file);
    return { id: uid(), name: file.name, mediaType: "application/pdf", data: dataUrl.split(",")[1], size: file.size, role: "pdf" };
  }
  // Foto dokumen dikompres lebih ringan agar teks tetap terbaca
  const c = await compressImage(file, role === "dokumen" ? 2000 : 1600, role === "dokumen" ? 0.88 : 0.8);
  return { id: uid(), name: file.name, mediaType: c.mediaType, data: c.data, size: c.size, role };
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
