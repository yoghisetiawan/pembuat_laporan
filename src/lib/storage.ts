"use client";
// Lapisan penyimpanan dengan dua backend:
//  - Supabase (Postgres + Storage, per pengguna dengan RLS) bila dikonfigurasi
//  - IndexedDB lokal di browser sebagai mode cadangan/pengembangan
import { del, getMany, keys, set } from "idb-keyval";
import { supabaseBrowser } from "./supabase/browser";
import { DOKUMENTASI_BUCKET, supabaseEnabled } from "./supabase/config";
import type { Attachment, ReportRecord, UnitProfile } from "./types";

export const DEFAULT_PROFILE: UnitProfile = {
  kopBaris: ["KEPOLISIAN NEGARA REPUBLIK INDONESIA", "DAERAH JAWA TENGAH", "RESOR KOTA BESAR SEMARANG", "SEKTOR TEMBALANG"],
  alamat: "Jl. Turus Asri No. 9 Tembalang Semarang",
  kota: "Semarang",
  penandatanganJabatan: "KAPOLSEK TEMBALANG",
  penandatanganNama: "",
  penandatanganPangkatNrp: "",
  pelapor: "",
  kepada: ["Kapolsek Tembalang"],
  distribusi: ["Kapolrestabes Semarang", "Kasat Intelkam Polrestabes Semarang"],
  wilayah: "Kecamatan Tembalang, Kota Semarang, Jawa Tengah",
};

export const storageMode: "supabase" | "lokal" = supabaseEnabled ? "supabase" : "lokal";

const PROFILE_KEY = "pl.profile.v2";
const PREFIX = "report:";

async function userId(): Promise<string> {
  const { data, error } = await supabaseBrowser().auth.getUser();
  if (error || !data.user) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  return data.user.id;
}

export async function currentUserEmail(): Promise<string | null> {
  if (!supabaseEnabled) return null;
  const { data } = await supabaseBrowser().auth.getUser();
  return data.user?.email ?? null;
}

export async function signOut() {
  if (!supabaseEnabled) return;
  await supabaseBrowser().auth.signOut();
  window.location.href = "/login";
}

// ===== Profil satuan =====
function localProfile(): UnitProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<UnitProfile>) };
  } catch {}
  return DEFAULT_PROFILE;
}

export async function loadProfile(): Promise<UnitProfile> {
  if (!supabaseEnabled) return localProfile();
  try {
    const { data, error } = await supabaseBrowser().from("unit_profiles").select("data").maybeSingle();
    if (error) throw error;
    if (data?.data) return { ...DEFAULT_PROFILE, ...(data.data as Partial<UnitProfile>) };
  } catch {}
  return localProfile();
}

export async function saveProfile(p: UnitProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {}
  if (!supabaseEnabled) return;
  const { error } = await supabaseBrowser().from("unit_profiles").upsert({ user_id: await userId(), data: p });
  if (error) throw new Error(`Gagal menyimpan profil: ${error.message}`);
}

// ===== Laporan =====
interface ReportRow {
  id: string;
  template_id: string;
  title: string;
  meta: ReportRecord["meta"];
  fields: ReportRecord["fields"];
  analysis: ReportRecord["analysis"];
  review: ReportRecord["review"];
  sources_summary: string;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

function fromRow(r: ReportRow): ReportRecord {
  return {
    id: r.id,
    templateId: r.template_id,
    title: r.title,
    meta: r.meta,
    fields: r.fields,
    analysis: r.analysis,
    review: r.review,
    sourcesSummary: r.sources_summary,
    attachments: r.attachments ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Lampiran yang sudah diunggah di sesi ini (id → path) agar tidak diunggah ulang saat autosave
const uploaded = new Map<string, string>();

async function uploadAttachments(uid: string, reportId: string, atts: Attachment[]): Promise<Attachment[]> {
  const sb = supabaseBrowser();
  const out: Attachment[] = [];
  for (const a of atts) {
    let path = a.path ?? uploaded.get(a.id);
    if (!path && a.data) {
      const ext = a.mediaType === "image/png" ? "png" : a.mediaType === "image/webp" ? "webp" : "jpg";
      path = `${uid}/${reportId}/${a.id}.${ext}`;
      const bytes = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0));
      const { error } = await sb.storage.from(DOKUMENTASI_BUCKET).upload(path, bytes, { contentType: a.mediaType, upsert: true });
      if (error) throw new Error(`Gagal mengunggah ${a.name}: ${error.message}`);
      uploaded.set(a.id, path);
    }
    if (path) out.push({ id: a.id, name: a.name, mediaType: a.mediaType, size: a.size, role: a.role, data: "", path });
  }
  return out;
}

export async function saveReport(r: ReportRecord) {
  if (!supabaseEnabled) {
    await set(PREFIX + r.id, r);
    return;
  }
  const uid = await userId();
  const attachments = await uploadAttachments(uid, r.id, r.attachments ?? []);
  const { error } = await supabaseBrowser().from("reports").upsert({
    id: r.id,
    user_id: uid,
    template_id: r.templateId,
    title: r.title,
    meta: r.meta,
    fields: r.fields,
    analysis: r.analysis,
    review: r.review,
    sources_summary: r.sourcesSummary,
    attachments,
  });
  if (error) throw new Error(`Gagal menyimpan laporan: ${error.message}`);
}

export async function deleteReport(id: string) {
  if (!supabaseEnabled) {
    await del(PREFIX + id);
    return;
  }
  const sb = supabaseBrowser();
  const uid = await userId();
  const folder = `${uid}/${id}`;
  const { data: files } = await sb.storage.from(DOKUMENTASI_BUCKET).list(folder);
  if (files?.length) await sb.storage.from(DOKUMENTASI_BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
  const { error } = await sb.from("reports").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus: ${error.message}`);
}

export async function listReports(): Promise<ReportRecord[]> {
  if (!supabaseEnabled) {
    const all = (await keys()).filter((k) => typeof k === "string" && k.startsWith(PREFIX)) as string[];
    const rows = (await getMany<ReportRecord | undefined>(all)).filter((r): r is ReportRecord => Boolean(r));
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const { data, error } = await supabaseBrowser()
    .from("reports")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Gagal memuat riwayat: ${error.message}`);
  return (data as ReportRow[]).map(fromRow);
}

/** Unduh isi lampiran yang tersimpan di Supabase Storage (untuk editor & lampiran DOCX). */
export async function hydrateAttachments(atts: Attachment[]): Promise<Attachment[]> {
  if (!supabaseEnabled) return atts;
  const sb = supabaseBrowser();
  return Promise.all(
    atts.map(async (a) => {
      if (a.data || !a.path) return a;
      const { data, error } = await sb.storage.from(DOKUMENTASI_BUCKET).download(a.path);
      if (error || !data) return a;
      const buf = new Uint8Array(await data.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      uploaded.set(a.id, a.path);
      return { ...a, data: btoa(bin) };
    }),
  );
}
