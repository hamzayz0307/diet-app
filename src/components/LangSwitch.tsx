"use client";

import { useT } from "@/lib/i18n/context";
import type { Language } from "@/lib/types";

export default function LangSwitch({
  onChange,
}: {
  onChange?: (l: Language) => void;
}) {
  const { lang, setLang } = useT();

  const pick = (l: Language) => {
    setLang(l);
    onChange?.(l);
  };

  return (
    <div className="inline-flex rounded-full border border-border bg-surface-2 p-0.5 text-sm">
      {(["tr", "en"] as Language[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          className={`px-3 py-1 rounded-full font-medium ${
            lang === l ? "bg-accent text-[#06241a]" : "text-muted"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
