import { NextResponse, type NextRequest } from "next/server";

// Pengaman sederhana: bila APP_PASSWORD diatur (mis. di Vercel), seluruh aplikasi
// dan API meminta kata sandi (HTTP Basic Auth). Nama pengguna bebas diisi apa saja.
// Tanpa APP_PASSWORD, aplikasi terbuka (cocok untuk dipakai di komputer sendiri).
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (safeEqual(given, password)) return NextResponse.next();
    } catch {
      /* header rusak → minta ulang */
    }
  }
  return new NextResponse("Masukkan kata sandi aplikasi.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Pembuat Laporan AI", charset="UTF-8"' },
  });
}

export const config = {
  // Berkas publik yang dibutuhkan Android/Chrome tanpa login: manifest, ikon, dan
  // assetlinks (verifikasi aplikasi). Isinya tidak sensitif.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|\\.well-known/).*)"],
};
