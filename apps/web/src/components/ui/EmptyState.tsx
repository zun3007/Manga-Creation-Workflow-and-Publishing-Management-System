import { Panel } from "./Panel";

/** Reusable centered empty/placeholder panel (token-themed). */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Panel className="p-10 text-center">
      <p className="text-ink">{title}</p>
      {hint && <p className="mt-2 text-sm text-ink-soft">{hint}</p>}
    </Panel>
  );
}
