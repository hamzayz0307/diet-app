/** Shown instantly while a tab loads, so taps feel immediate. */
export default function Loading() {
  return (
    <main className="px-5 pt-6 space-y-4 animate-pulse" aria-busy>
      <div className="h-4 w-32 rounded bg-surface-2" />
      <div className="h-7 w-48 rounded bg-surface-2" />
      <div className="card h-56" />
      <div className="card h-32" />
      <div className="card h-24" />
    </main>
  );
}
