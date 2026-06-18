export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-line bg-bg">
      <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
