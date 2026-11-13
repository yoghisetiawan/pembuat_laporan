"use client";
import { CheckCircle2 } from "lucide-react";
import { TEMPLATES, type TemplateCategory } from "@/lib/templates";
import { Badge, Icon, cx } from "./ui";

const CATS: TemplateCategory[] = ["Intelijen", "Harian", "Perencanaan", "Pesan Cepat"];

export default function TemplatePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="space-y-4">
      {CATS.map((cat) => {
        const items = TEMPLATES.filter((t) => t.category === cat);
        return (
          <div key={cat}>
            <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{cat}</div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((t) => {
                const active = t.id === value;
                return (
                  <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    className={cx(
                      "group relative flex gap-3 rounded-xl border p-3.5 text-left transition",
                      active
                        ? "border-brand-500 bg-brand-50/70 ring-4 ring-brand-500/10 dark:border-brand-400 dark:bg-brand-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20",
                    )}
                  >
                    <div
                      className={cx(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
                      )}
                    >
                      <Icon name={t.icon} className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{t.title}</span>
                        <Badge tone={t.format === "wa" ? "green" : "slate"}>{t.short}</Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t.description}</p>
                    </div>
                    {active && <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-brand-600 dark:text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
