import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  className = "",
  id,
  ...p
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
          {label}
        </span>
      )}
      <input
        id={id}
        className={`w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent ${className}`}
        {...p}
      />
    </label>
  );
}
