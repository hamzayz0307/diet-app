"use client";

import { useT } from "@/lib/i18n/context";

export default function CalorieRing({
  eaten,
  target,
}: {
  eaten: number;
  target: number | null;
}) {
  const { t } = useT();
  const goal = target ?? 2000;
  const pct = Math.min(1, eaten / goal);
  const over = eaten > goal;
  const remaining = Math.abs(goal - eaten);

  const r = 62;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[150px] h-[150px] shrink-0">
        <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
          <circle cx="75" cy="75" r={r} stroke="var(--surface-2)" strokeWidth="12" fill="none" />
          <circle
            cx="75"
            cy="75"
            r={r}
            stroke={over ? "var(--danger)" : "var(--accent)"}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset .4s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-semibold ${over ? "text-danger" : ""}`}>
            {Math.round(remaining)}
          </span>
          <span className="text-xs text-muted">{over ? t.over : t.remaining}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 text-sm">
        <Row label={t.eaten} value={Math.round(eaten)} />
        <Row label={t.target} value={goal} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium">
        {value} <span className="text-muted text-xs">kcal</span>
      </span>
    </div>
  );
}
