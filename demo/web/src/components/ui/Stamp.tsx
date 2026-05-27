const TONES: Record<string, string> = {
  // success / live
  APPROVED: '#3C7A52', ACTIVE: '#3C7A52', PUBLISHED: '#3C7A52',
  EDITOR_APPROVED: '#3C7A52', FINAL: '#3C7A52', COMPLETED: '#3C7A52',
  CLOSED: '#3C7A52', RESOLVED: '#3C7A52', LOW: '#3C7A52',
  // in-flight
  IN_PROGRESS: '#243044', SUBMITTED: '#243044', REVIEWING: '#243044',
  UNDER_REVIEW: '#243044', READY_FOR_EDITOR_REVIEW: '#243044',
  SCHEDULED: '#243044', OPEN: '#243044', PENDING: '#243044', ASSIGNED: '#243044',
  // warning
  REVISION_REQUIRED: '#C8861E', AT_RISK: '#C8861E', HIATUS: '#C8861E', MEDIUM: '#C8861E',
  // danger
  REJECTED: '#E0271C', CANCELLED: '#E0271C', HIGH: '#E0271C',
  // neutral
  DRAFT: '#6B645B', RAW: '#6B645B',
};

export function statusTone(status: string): string {
  return TONES[status?.toUpperCase?.()] ?? '#3A352F';
}

export function Stamp({ status, label }: { status: string; label?: string }) {
  const color = statusTone(status);
  const text = (label ?? status ?? '').replace(/_/g, ' ');
  return (
    <span className="stamp" style={{ color }}>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {text}
    </span>
  );
}
