import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "accent" | "soft" | "ghost";

const styles: Record<Variant, string> = {
  accent: "bg-accent text-white hover:brightness-95",
  soft: "bg-surface text-ink border border-line hover:bg-bg",
  ghost: "bg-transparent text-ink hover:bg-bg",
};

export function Button({
  variant = "accent",
  className = "",
  loading = false,
  disabled,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[calc(var(--app-radius)*0.66)] px-4 py-2 font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...p}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
