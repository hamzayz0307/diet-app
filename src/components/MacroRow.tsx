"use client";

import { useT } from "@/lib/i18n/context";

interface Props {
  protein: number;
  carbs: number;
  fat: number;
  /** Optional targets: shows progress bars when provided. */
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
}

export default function MacroRow({
  protein,
  carbs,
  fat,
  targetProtein,
  targetCarbs,
  targetFat,
}: Props) {
  const { t } = useT();
  const items = [
    { label: t.protein, value: protein, target: targetProtein, color: "bg-protein" },
    { label: t.carbs, value: carbs, target: targetCarbs, color: "bg-carbs" },
    { label: t.fat, value: fat, target: targetFat, color: "bg-fat" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((m) => {
        const pct = m.target ? Math.min(100, (m.value / m.target) * 100) : 0;
        return (
          <div key={m.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">{m.label}</span>
              <span className="text-sm font-medium">
                {Math.round(m.value)}
                {m.target ? <span className="text-muted"> / {m.target}</span> : null}
                <span className="text-muted text-xs"> g</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-2 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${m.color}`}
                style={{ width: `${m.target ? pct : 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
