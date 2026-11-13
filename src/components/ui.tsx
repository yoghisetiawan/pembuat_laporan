"use client";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Icon({ name, className }: { name: string; className?: string }) {
  const I = (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.FileText;
  return <I className={className} />;
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary" &&
          "bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 active:bg-brand-800",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]",
        variant === "danger" && "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

const TONES = {
  slate: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  blue: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};
export type Tone = keyof typeof TONES;

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; icon?: string; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cx("flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 scroll-thin dark:bg-white/[0.05]", className)}>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={cx(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === it.id
              ? "bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          {it.icon && <Icon name={it.icon} className="h-3.5 w-3.5" />}
          {it.label}
          {it.count ? (
            <span className="rounded-full bg-brand-600 px-1.5 text-[10px] leading-4 text-white">{it.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function scoreTone(n: number): Tone {
  if (n >= 85) return "green";
  if (n >= 70) return "amber";
  return "red";
}

export function Toast({ msg, tone = "slate" }: { msg: string | null; tone?: Tone }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className={cx("rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg", tone === "red" ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900")}>
        {msg}
      </div>
    </div>
  );
}
