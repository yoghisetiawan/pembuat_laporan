export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Supabase aktif bila URL & kunci publik diatur. Tanpa itu, aplikasi berjalan mode lokal (IndexedDB). */
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const DOKUMENTASI_BUCKET = "dokumentasi";
