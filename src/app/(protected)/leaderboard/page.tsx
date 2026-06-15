import Image from "next/image";
import { Award, Crown, Flame, Sparkles, Target, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/domain";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireUser();
  const rows = await getLeaderboard();
  const totalLoss = rows.reduce((sum, row) => sum + row.loss, 0);
  const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
  const totalMissed = rows.reduce((sum, row) => sum + row.missed, 0);
  const predictionKings = rows.filter((row) => row.correct > 0).slice(0, 3);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes leaderboardSweep {
          0% { transform: translateX(-120%); opacity: 0; }
          18% { opacity: 0.72; }
          42% { opacity: 0; }
          100% { transform: translateX(140%); opacity: 0; }
        }
        @keyframes rankHalo {
          0%, 100% { transform: scale(1); opacity: 0.62; }
          50% { transform: scale(1.12); opacity: 0.18; }
        }
        @keyframes eliteLift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .leaderboard-row-gold > td {
          background: linear-gradient(90deg, rgba(255,247,205,0.92) 0%, rgba(255,255,255,0.98) 43%, rgba(255,251,235,0.92) 100%);
        }
        .leaderboard-row-silver > td {
          background: linear-gradient(90deg, rgba(248,250,252,0.98) 0%, rgba(255,255,255,0.98) 43%, rgba(226,232,240,0.64) 100%);
        }
        .leaderboard-row-bronze > td {
          background: linear-gradient(90deg, rgba(255,237,213,0.86) 0%, rgba(255,255,255,0.98) 43%, rgba(255,247,237,0.9) 100%);
        }
        .leaderboard-row-gold > td:first-child {
          box-shadow: inset 4px 0 0 #f59e0b;
        }
        .leaderboard-row-silver > td:first-child {
          box-shadow: inset 4px 0 0 #94a3b8;
        }
        .leaderboard-row-bronze > td:first-child {
          box-shadow: inset 4px 0 0 #fb923c;
        }
        .leaderboard-row-gold:hover > td,
        .leaderboard-row-silver:hover > td,
        .leaderboard-row-bronze:hover > td {
          filter: saturate(1.06);
        }
        @media (prefers-reduced-motion: reduce) {
          .leaderboard-sweep,
          .rank-halo,
          .elite-lift {
            animation: none !important;
          }
        }
      `}</style>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div className="space-y-5">
          <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            Bảng xếp hạng
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-emerald-950 md:text-4xl">
            Ai đoán đúng nhiều nhất?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Xếp hạng theo số trận đúng. Nếu bằng nhau, hệ thống xét độ chính xác, số lần quên chọn, số trận sai và điểm quỹ phải nộp.
          </p>
          </div>
          <PredictionKings rows={predictionKings} />
        </div>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/10">
            <Image
              src="/messi-ronaldo-vip.png"
              alt="Không khí World Cup 2026"
              width={1200}
              height={720}
              className="h-40 w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-emerald-950/10 bg-white p-3 shadow-sm shadow-emerald-950/5">
            <Summary label="Tổng lượt đúng" value={String(totalCorrect)} />
            <Summary label="Quên chọn" value={String(totalMissed)} />
            <Summary label="Tổng phải nộp" value={formatCurrency(totalLoss)} />
          </div>
        </div>
      </section>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <LeaderboardMobileCard key={row.id} row={row} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5 md:block">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-emerald-950 text-left text-white">
            <tr>
              {[
                "Hạng",
                "Người chơi",
                "Đã chọn",
                "Quên chọn",
                "Đúng",
                "Sai",
                "Độ chính xác",
                "Ngôi sao",
                "Ngôi sao sai",
                "Phải nộp",
              ].map((title) => (
                <th key={title} className="px-4 py-3 font-bold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const visual = getRankVisual(row.rank);

              return (
                <tr
                  key={row.id}
                  className={`border-t border-slate-100 transition duration-300 ${visual.tableRowClass || (index % 2 ? "bg-slate-50/70" : "bg-white")}`}
                >
                  <td className="relative overflow-hidden px-4 py-3">
                    {visual.elite && (
                      <span
                        className="leaderboard-sweep pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                        style={{ animation: "leaderboardSweep 5.8s ease-in-out infinite" }}
                      />
                    )}
                    <RankBadge rank={row.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar image={row.image} name={row.name} rank={row.rank} />
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-emerald-950">{row.name}</p>
                        <p className="truncate text-xs text-slate-500">{row.department || "Chưa có đơn vị"}</p>
                        <RankTag rank={row.rank} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{row.voted}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-amber-700">{row.missed}</td>
                  <td className="px-4 py-3 font-black tabular-nums text-emerald-700">{row.correct}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-red-700">{row.wrong}</td>
                  <td className="px-4 py-3">
                    <AccuracyCell value={row.accuracy} rank={row.rank} />
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{row.hopeStarUsed}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-amber-700">{row.hopeStarWrong}</td>
                  <td className="px-4 py-3 font-black tabular-nums text-red-700">{formatCurrency(row.loss)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-white p-10 text-center">
          <h2 className="text-xl font-extrabold text-emerald-950">Chưa có người chơi</h2>
          <p className="mt-2 text-sm text-slate-500">Admin tạo tài khoản hoặc người chơi tự đăng ký thì bảng này sẽ có dữ liệu.</p>
        </div>
      )}
    </div>
  );
}

type LeaderboardRow = Awaited<ReturnType<typeof getLeaderboard>>[number];

function getRankVisual(rank: number) {
  if (rank === 1) {
    return {
      elite: true,
      Icon: Crown,
      tableRowClass: "leaderboard-row-gold",
      mobileCardClass:
        "border-amber-300 bg-[linear-gradient(135deg,#fff8d7_0%,#ffffff_52%,#fff1a8_100%)] shadow-amber-900/15",
      mobileHaloClass: "bg-amber-300/45",
      badgeClass:
        "bg-amber-400 text-amber-950 ring-amber-200 shadow-lg shadow-amber-500/25",
      tag: "Vua dự đoán",
      tagClass: "bg-amber-500 text-amber-950 shadow-amber-500/25",
      progressClass: "from-amber-400 via-yellow-300 to-amber-500",
      avatarClass:
        "ring-2 ring-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.16),0_0_24px_rgba(245,158,11,0.35)]",
    };
  }

  if (rank === 2) {
    return {
      elite: true,
      Icon: Award,
      tableRowClass: "leaderboard-row-silver",
      mobileCardClass:
        "border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_50%,#e8eef6_100%)] shadow-slate-900/10",
      mobileHaloClass: "bg-slate-300/45",
      badgeClass:
        "bg-slate-200 text-slate-900 ring-slate-100 shadow-lg shadow-slate-400/20",
      tag: "Bám sát",
      tagClass: "bg-slate-900 text-white shadow-slate-900/15",
      progressClass: "from-slate-400 via-slate-200 to-slate-500",
      avatarClass:
        "ring-2 ring-slate-300 shadow-[0_0_0_4px_rgba(148,163,184,0.15),0_0_20px_rgba(100,116,139,0.22)]",
    };
  }

  if (rank === 3) {
    return {
      elite: true,
      Icon: Flame,
      tableRowClass: "leaderboard-row-bronze",
      mobileCardClass:
        "border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_52%,#ffedd5_100%)] shadow-orange-900/10",
      mobileHaloClass: "bg-orange-300/42",
      badgeClass:
        "bg-orange-300 text-orange-950 ring-orange-100 shadow-lg shadow-orange-500/18",
      tag: "Phong độ cao",
      tagClass: "bg-orange-500 text-white shadow-orange-500/20",
      progressClass: "from-orange-400 via-amber-300 to-orange-500",
      avatarClass:
        "ring-2 ring-orange-300 shadow-[0_0_0_4px_rgba(253,186,116,0.14),0_0_20px_rgba(249,115,22,0.24)]",
    };
  }

  return {
    elite: false,
    Icon: Trophy,
    tableRowClass: "",
    mobileCardClass: "border-emerald-950/10 bg-white shadow-emerald-950/5",
    mobileHaloClass: "",
    badgeClass: "bg-emerald-950 text-white ring-emerald-900/10",
    tag: "",
    tagClass: "",
    progressClass: "from-emerald-500 to-teal-400",
    avatarClass: "ring-1 ring-emerald-200",
  };
}

function RankBadge({ rank, compact = false }: { rank: number; compact?: boolean }) {
  const visual = getRankVisual(rank);
  const Icon = visual.Icon;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden font-black ring-4 ${
        compact ? "h-9 min-w-9 rounded-xl px-2 text-xs" : "h-10 min-w-10 rounded-2xl px-2.5 text-sm"
      } ${visual.badgeClass}`}
    >
      {visual.elite && (
        <span
          className={`rank-halo pointer-events-none absolute inset-[-8px] rounded-2xl ${visual.mobileHaloClass}`}
          style={{ animation: "rankHalo 2.9s ease-in-out infinite" }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1">
        {visual.elite && !compact && <Icon size={14} strokeWidth={2.5} aria-hidden="true" />}
        #{rank}
      </span>
    </div>
  );
}

function RankTag({ rank, compact = false }: { rank: number; compact?: boolean }) {
  const visual = getRankVisual(rank);
  const Icon = visual.Icon;

  if (!visual.elite) {
    return null;
  }

  return (
    <span
      className={`elite-lift mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 font-black uppercase tracking-[0.1em] ${
        compact ? "text-[9px]" : "text-[10px]"
      } ${visual.tagClass}`}
      style={{ animation: "eliteLift 3s ease-in-out infinite" }}
    >
      <Icon size={compact ? 11 : 12} strokeWidth={2.5} aria-hidden="true" />
      <span className="truncate">{visual.tag}</span>
    </span>
  );
}

function AccuracyCell({ value, rank }: { value: number; rank: number }) {
  return (
    <div className="min-w-24">
      <p className="font-black tabular-nums text-emerald-950">{value.toFixed(1)}%</p>
      <AccuracyBar value={value} rank={rank} />
    </div>
  );
}

function AccuracyBar({ value, rank }: { value: number; rank: number }) {
  const visual = getRankVisual(rank);
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${visual.progressClass}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function LeaderboardMobileCard({ row }: { row: LeaderboardRow }) {
  const visual = getRankVisual(row.rank);

  return (
    <article className={`relative overflow-hidden rounded-2xl border p-3 shadow-sm transition duration-300 active:scale-[0.99] ${visual.mobileCardClass}`}>
      {visual.elite && (
        <span
          className={`rank-halo pointer-events-none absolute -right-5 -top-7 h-20 w-20 rounded-full ${visual.mobileHaloClass}`}
          style={{ animation: "rankHalo 3.2s ease-in-out infinite" }}
        />
      )}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <RankBadge rank={row.rank} compact />
          <Avatar image={row.image} name={row.name} rank={row.rank} />
          <div className="min-w-0">
            <p className="truncate text-base font-black text-emerald-950">
              {row.name}
            </p>
            <p className="truncate text-xs font-semibold text-slate-500">
              {row.department || "Chưa có đơn vị"}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
              {row.accuracy.toFixed(0)}% chính xác
              {row.hopeStarUsed > 0 ? ` · ${row.hopeStarUsed} sao` : ""}
            </p>
            <RankTag rank={row.rank} compact />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Nộp
          </p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-red-700">
            {formatCurrency(row.loss)}
          </p>
        </div>
      </div>

      <div className="relative mt-2">
        <AccuracyBar value={row.accuracy} rank={row.rank} />
      </div>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        <MobileStat label="Chọn" value={String(row.voted)} />
        <MobileStat label="Đúng" value={String(row.correct)} tone="good" />
        <MobileStat label="Sai" value={String(row.wrong)} tone="bad" />
        <MobileStat label="Quên" value={String(row.missed)} tone="warn" />
      </div>
    </article>
  );
}

function MobileStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneClass = {
    neutral: "bg-slate-50 text-slate-700 ring-slate-100",
    good: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bad: "bg-red-50 text-red-700 ring-red-100",
    warn: "bg-amber-50 text-amber-700 ring-amber-100",
  }[tone];

  return (
    <div className={`inline-flex min-h-7 items-center gap-1.5 rounded-xl px-2 text-[11px] font-bold ring-1 ${toneClass}`}>
      <span className="font-black tabular-nums">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

function PredictionKings({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
            <Trophy size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-700">
              Vua dự đoán
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Chờ trận đầu tiên được chốt để vinh danh top 3.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="prediction-kings-title"
      className="relative overflow-hidden rounded-[1.75rem] border border-emerald-950/10 bg-[linear-gradient(135deg,#ffffff_0%,#f7fff8_48%,#fff7df_100%)] p-3 shadow-xl shadow-emerald-950/8 sm:p-4"
    >
      <style>{`
        @keyframes kingShine {
          0% { transform: translateX(-130%) rotate(12deg); opacity: 0; }
          22% { opacity: 0.82; }
          48% { opacity: 0; }
          100% { transform: translateX(130%) rotate(12deg); opacity: 0; }
        }
        @keyframes kingFloat {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-5px) rotate(3deg); }
        }
        @keyframes crownPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.28); }
          50% { box-shadow: 0 0 0 9px rgba(245,158,11,0); }
        }
      `}</style>
      <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-emerald-200/45 blur-3xl" />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-amber-700">
            <Crown size={18} aria-hidden="true" />
            Vua dự đoán
          </p>
          <h2 id="prediction-kings-title" className="mt-1 text-xl font-black text-emerald-950">
            Top 3 đoán trúng nhiều nhất
          </h2>
        </div>
        <p className="max-w-[17rem] text-xs font-bold leading-5 text-slate-500 sm:text-right">
          Xếp theo số trận đúng, rồi đến độ chính xác và số lần quên chọn.
        </p>
      </div>

      <div className="relative grid gap-3 md:grid-cols-3">
        {rows.map((row, index) => (
          <PredictionKingCard key={row.id} row={row} index={index} />
        ))}
      </div>
    </section>
  );
}

function PredictionKingCard({
  row,
  index,
}: {
  row: LeaderboardRow;
  index: number;
}) {
  const styles = [
    {
      wrap:
        "border-amber-300 bg-[linear-gradient(135deg,#fff8cf_0%,#ffffff_44%,#fff0a6_100%)] shadow-amber-900/18 md:-translate-y-1",
      badge: "bg-amber-400 text-amber-950 ring-amber-200",
      iconWrap: "bg-amber-100 text-amber-600 ring-amber-200",
      accent: "bg-amber-500 text-amber-950",
      glow: "bg-amber-300/35",
      Icon: Crown,
      LabelIcon: Sparkles,
      label: "Vua sân cỏ",
      subtitle: "Đứng đầu đường đua dự đoán",
      shine: true,
    },
    {
      wrap:
        "border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#e8eef6_100%)] shadow-slate-900/10",
      badge: "bg-slate-200 text-slate-900 ring-slate-100",
      iconWrap: "bg-slate-100 text-slate-500 ring-slate-200",
      accent: "bg-slate-900 text-white",
      glow: "bg-slate-300/40",
      Icon: Award,
      LabelIcon: Target,
      label: "Bám sát",
      subtitle: "Áp sát ngôi đầu",
      shine: false,
    },
    {
      wrap:
        "border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#ffedd5_100%)] shadow-orange-900/10",
      badge: "bg-orange-300 text-orange-950 ring-orange-100",
      iconWrap: "bg-orange-100 text-orange-600 ring-orange-200",
      accent: "bg-orange-500 text-white",
      glow: "bg-orange-300/35",
      Icon: Flame,
      LabelIcon: Flame,
      label: "Phong độ cao",
      subtitle: "Giữ nhịp bám đuổi",
      shine: false,
    },
  ][index];
  const Icon = styles.Icon;
  const LabelIcon = styles.LabelIcon;
  const rankLabel = `#${index + 1}`;

  return (
    <article
      className={`relative overflow-hidden rounded-[1.6rem] border p-4 shadow-lg transition duration-300 hover:-translate-y-1 ${styles.wrap}`}
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl ${styles.glow}`} />
      {styles.shine && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-white/80 to-transparent"
          style={{ animation: "kingShine 3.2s ease-in-out infinite" }}
        />
      )}

      <div
        className={`absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${styles.iconWrap}`}
        style={index === 0 ? { animation: "kingFloat 3s ease-in-out infinite" } : undefined}
      >
        <Icon size={26} strokeWidth={2.4} aria-hidden="true" />
      </div>

      <div className="relative flex min-w-0 items-start gap-3 pr-12">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ring-4 ${styles.badge}`}
          style={index === 0 ? { animation: "crownPulse 2.4s ease-in-out infinite" } : undefined}
        >
          {rankLabel}
        </div>
        <Avatar image={row.image} name={row.name} size={index === 0 ? "lg" : "md"} rank={index + 1} />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-emerald-950">{row.name}</p>
          <p className="truncate text-xs font-semibold text-slate-500">
            {row.department || "Chưa có đơn vị"}
          </p>
          <p className="mt-1 hidden truncate text-[11px] font-bold text-slate-500 sm:block">
            {styles.subtitle}
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Đúng" value={String(row.correct)} tone="good" />
        <MiniStat label="Chính xác" value={`${row.accuracy.toFixed(0)}%`} tone={index === 0 ? "gold" : "neutral"} />
        <MiniStat label="Quên" value={String(row.missed)} tone="muted" />
      </div>
      <div className={`relative mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] shadow-sm ${styles.accent}`}>
        <LabelIcon size={14} aria-hidden="true" />
        {styles.label}
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "gold" | "muted";
}) {
  const toneClass = {
    neutral: "text-emerald-950",
    good: "text-emerald-700",
    gold: "text-amber-700",
    muted: "text-slate-700",
  }[tone];

  return (
    <div className="rounded-2xl bg-white/82 px-2 py-2 ring-1 ring-black/5 shadow-sm shadow-white/40">
      <p className={`text-base font-black tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-lg font-black tabular-nums text-emerald-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Avatar({
  image,
  name,
  size = "md",
  rank,
}: {
  image: string | null;
  name: string;
  size?: "md" | "lg";
  rank?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const sizeClass =
    size === "lg"
      ? "h-12 w-12 rounded-2xl"
      : "h-10 w-10 rounded-2xl";
  const visual = getRankVisual(rank ?? 99);
  const avatarClass = `relative z-10 ${sizeClass} ${visual.avatarClass}`;

  if (image) {
    return (
      <span className="relative inline-flex shrink-0">
        {visual.elite && (
          <span
            className={`rank-halo pointer-events-none absolute inset-[-7px] rounded-2xl ${visual.mobileHaloClass}`}
            style={{ animation: "rankHalo 3.4s ease-in-out infinite" }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={`Ảnh đại diện của ${name}`}
          className={`${avatarClass} object-cover`}
        />
      </span>
    );
  }

  return (
    <span className="relative inline-flex shrink-0">
      {visual.elite && (
        <span
          className={`rank-halo pointer-events-none absolute inset-[-7px] rounded-2xl ${visual.mobileHaloClass}`}
          style={{ animation: "rankHalo 3.4s ease-in-out infinite" }}
        />
      )}
      <div className={`flex ${avatarClass} items-center justify-center bg-emerald-100 text-sm font-black text-emerald-900`}>
        {initial}
      </div>
    </span>
  );
}
