import type { ButtonHTMLAttributes } from "react";

type Variant = "accent" | "soft" | "ghost";

const styles: Record<Variant, string> = {
  accent: "bg-accent text-white hover:brightness-95",
  soft: "bg-surface text-ink border border-line hover:bg-bg",
  ghost: "bg-transparent text-ink hover:bg-bg",
};

export function Button({
  variant = "accent",
  className = "",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[calc(var(--app-radius)*0.66)] px-4 py-2 font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...p}
    />
  );
}
