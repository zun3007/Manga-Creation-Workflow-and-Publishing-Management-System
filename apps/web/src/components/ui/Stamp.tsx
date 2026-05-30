const tone: Record<string, string> = {
  ok: "bg-ok/15 text-ok",
  info: "bg-info/15 text-info",
  warn: "bg-warn/15 text-warn",
  danger: "bg-danger/15 text-danger",
  muted: "bg-muted/15 text-muted",
};

const map: Record<string, keyof typeof tone> = {
  APPROVED: "ok",
  ACTIVE: "ok",
  PUBLISHED: "ok",
  IN_PROGRESS: "info",
  SUBMITTED: "info",
  REVIEWING: "info",
  REVISION_REQUIRED: "warn",
  AT_RISK: "warn",
  REJECTED: "danger",
  CANCELLED: "danger",
  DRAFT: "muted",
  RAW: "muted",
};

export function Stamp({ status, label }: { status: string; label?: string }) {
  const t = tone[map[status] ?? "muted"];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider ${t}`}>
      {label ?? status}
    </span>
  );
}
