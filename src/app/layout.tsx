import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pembuat Laporan AI",
  description: "Generator laporan dinas Intelkam berbasis AI dengan analisis bukti, verifikasi mutu, dan revisi otomatis.",
};

const themeScript = `try{var t=localStorage.getItem('pl.theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
