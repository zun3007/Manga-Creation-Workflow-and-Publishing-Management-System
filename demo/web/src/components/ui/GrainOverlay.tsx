/** Fixed paper-grain texture over the whole viewport. Purely decorative. */
export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="grain pointer-events-none fixed inset-0 z-[60] opacity-[0.05] mix-blend-multiply"
    />
  );
}
