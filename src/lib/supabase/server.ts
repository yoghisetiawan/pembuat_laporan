import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL, supabaseEnabled } from "./config";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* dipanggil dari konteks yang tidak bisa menulis cookie; proxy menangani refresh */
        }
      },
    },
  });
}

/**
 * Penjaga untuk route handler AI: pastikan pemanggil sudah login.
 * Mengembalikan Response 401 bila tidak berwenang, atau null bila boleh lanjut.
 * Tanpa Supabase, akses anonim hanya diizinkan di mode pengembangan
 * (atau bila ALLOW_ANONYMOUS=true) agar deploy produksi tidak terbuka untuk umum.
 */
export async function requireUser(): Promise<Response | null> {
  if (!supabaseEnabled) {
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_ANONYMOUS === "true") return null;
    return Response.json(
      { error: "Server belum dikonfigurasi: atur NEXT_PUBLIC_SUPABASE_URL dan kunci publik Supabase." },
      { status: 503 },
    );
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return Response.json({ error: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 });
  return null;
}
