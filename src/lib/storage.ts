"use client";
import { del, get, keys, set, getMany } from "idb-keyval";
import type { ReportRecord, UnitProfile } from "./types";

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

const PROFILE_KEY = "pl.profile.v2";

export function loadProfile(): UnitProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<UnitProfile>) };
  } catch {}
  return DEFAULT_PROFILE;
}

export function saveProfile(p: UnitProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {}
}

const PREFIX = "report:";

export async function saveReport(r: ReportRecord) {
  await set(PREFIX + r.id, r);
}

export async function deleteReport(id: string) {
  await del(PREFIX + id);
}

export async function getReport(id: string) {
  return get<ReportRecord>(PREFIX + id);
}

export async function listReports(): Promise<ReportRecord[]> {
  const all = (await keys()).filter((k) => typeof k === "string" && k.startsWith(PREFIX)) as string[];
  const rows = (await getMany<ReportRecord | undefined>(all)).filter((r): r is ReportRecord => Boolean(r));
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
