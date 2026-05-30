import type { ReactNode } from "react";

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`bg-surface border border-line rounded-[var(--app-radius)] ${className}`}
      style={{ boxShadow: "var(--app-shadow)" }}
    >
      {children}
    </div>
  );
}
