"use client";
import type { PipelineEvent } from "./types";

/** Membaca stream Server-Sent Events dari respons fetch. */
export async function readEvents(res: Response, onEvent: (e: PipelineEvent) => void) {
  if (!res.body) throw new Error("Respons tanpa body");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            onEvent(JSON.parse(line.slice(6)) as PipelineEvent);
          } catch {}
        }
      }
    }
  }
}

export async function streamTextResponse(res: Response, onText: (full: string) => void) {
  if (!res.body) throw new Error("Respons tanpa body");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    onText(full);
  }
  return full;
}
