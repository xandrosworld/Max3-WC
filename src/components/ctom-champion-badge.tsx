import { Crown, Gem, Sparkles } from "lucide-react";

export function CtomChampionBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`relative isolate inline-flex max-w-full items-center overflow-hidden rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 via-yellow-50 to-emerald-50 font-black uppercase text-amber-900 shadow-sm shadow-amber-500/20 ${
        compact
          ? "gap-1 px-2 py-0.5 text-[10px]"
          : "gap-1.5 px-2.5 py-1 text-[11px]"
      }`}
      title="Top 1 BXH CTOM"
    >
      <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.85)_42%,transparent_68%)] opacity-70 [animation:ctomChampionShine_2.8s_ease-in-out_infinite]" />
      <Crown
        className="shrink-0 text-amber-600 drop-shadow-sm"
        size={compact ? 11 : 13}
        strokeWidth={2.7}
        aria-hidden="true"
      />
      <span className="min-w-0 truncate">Chủ tịch CTOM</span>
      <span className="relative shrink-0">
        <Gem
          className="text-emerald-700"
          size={compact ? 10 : 12}
          strokeWidth={2.7}
          aria-hidden="true"
        />
        <Sparkles
          className="absolute -right-1 -top-1 text-amber-500 [animation:ctomChampionTwinkle_1.6s_ease-in-out_infinite]"
          size={compact ? 7 : 8}
          strokeWidth={3}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}
