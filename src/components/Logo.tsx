export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
        <rect width="512" height="512" rx="112" fill="#0b0f14" />
        <circle cx="256" cy="256" r="150" fill="none" stroke="#263040" strokeWidth="40" />
        <path
          d="M256 106a150 150 0 1 1-106 44"
          fill="none"
          stroke="#34d399"
          strokeWidth="40"
          strokeLinecap="round"
        />
        <circle cx="256" cy="256" r="56" fill="#34d399" />
      </svg>
      <span className="font-semibold text-lg tracking-tight">KaloriTakip</span>
    </div>
  );
}
