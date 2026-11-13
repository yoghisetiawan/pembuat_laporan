"use client";
import { Loader2, LogIn, ScrollText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabaseEnabled } from "@/lib/supabase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let message: string | null = null;
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
      if (error) message = error.message;
    } catch (e) {
      message = (e as Error).message;
    }
    if (message) {
      setError(
        message === "Invalid login credentials"
          ? "Email atau kata sandi salah."
          : /fetch|network/i.test(message)
            ? "Tidak dapat terhubung ke server autentikasi. Periksa koneksi atau konfigurasi Supabase."
            : message,
      );
      setBusy(false);
      return;
    }
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Pembuat Laporan AI</div>
            <div className="text-xs text-slate-500">Masuk untuk melanjutkan</div>
          </div>
        </div>
        {!supabaseEnabled ? (
          <p className="text-sm text-slate-500">Supabase belum dikonfigurasi. Aplikasi berjalan dalam mode lokal — buka halaman utama.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Email</span>
              <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Kata sandi</span>
              <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
            <Button variant="primary" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Masuk
            </Button>
            <p className="pt-2 text-center text-[11px] leading-relaxed text-slate-500">Akun dibuat oleh admin satuan melalui Supabase. Hubungi admin bila belum memiliki akun.</p>
          </form>
        )}
      </div>
    </div>
  );
}
