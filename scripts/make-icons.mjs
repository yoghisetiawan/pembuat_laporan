// Membuat ikon aplikasi (PNG) dari logo ScrollText yang sama dengan header web.
// Jalankan: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const GLYPH = `
  <path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/>
  <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>`;

function svg({ rounded, glyphSize }) {
  const s = glyphSize / 24;
  const off = (512 - glyphSize) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b65f5"/><stop offset="1" stop-color="#1e2dae"/></linearGradient></defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#g)"/>
  <g transform="translate(${off} ${off}) scale(${s})" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPH}</g>
</svg>`);
}

mkdirSync("public/icons", { recursive: true });
const any = svg({ rounded: true, glyphSize: 280 });
const maskable = svg({ rounded: false, glyphSize: 250 }); // zona aman 80% untuk maskable

await sharp(any, { density: 300 }).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(any, { density: 300 }).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(maskable, { density: 300 }).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
await sharp(maskable, { density: 300 }).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
console.log("ikon dibuat di public/icons");
