import Image from "next/image";
import { Award, Crown, Flame, Medal, Sparkles, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/domain";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type LeaderboardRow = Awaited<ReturnType<typeof getLeaderboard>>[number];
type RankedRow = LeaderboardRow & { displayRank: number };
type BoardMode = "prediction" | "contribution";

export default async function LeaderboardPage() {
  await requireUser();
  const rows = await getLeaderboard();
  const predictionRows = rows.map((row, index) => ({
    ...row,
    displayRank: index + 1,
  }));
  const contributionRows = [...rows]
    .sort(
      (a, b) =>
        b.loss - a.loss ||
        b.correct - a.correct ||
        b.accuracy - a.accuracy ||
        a.missed - b.missed ||
        a.name.localeCompare(b.name, "vi"),
    )
    .map((row, index) => ({ ...row, displayRank: index + 1 }));

  const totalContribution = rows.reduce((sum, row) => sum + row.loss, 0);
  const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
  const totalMissed = rows.reduce((sum, row) => sum + row.missed, 0);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes wcPulse {
          0%, 100% { transform: scale(1); opacity: 0.52; }
          50% { transform: scale(1.16); opacity: 0.16; }
        }
        @keyframes wcShine {
          0% { transform: translateX(-120%); opacity: 0; }
          35% { opacity: 0.32; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        .elite-row {
          position: relative;
          overflow: hidden;
        }
        .elite-row::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 42%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.72), transparent);
          animation: wcShine 4.8s ease-in-out infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .rank-pulse,
          .elite-row::after {
            animation: none !important;
          }
        }
      `}</style>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            Bảng xếp hạng
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-emerald-950 md:text-4xl">
            Hai đường đua, nhìn là muốn tranh top
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Một bảng vinh danh người đoán đúng nhiều nhất, một bảng ghi nhận người đóng góp nhiều nhất.
            Tất cả dùng đơn vị vui Belly trong phạm vi nội bộ.
          </p>
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
            <Summary label="Lượt đúng" value={String(totalCorrect)} />
            <Summary label="Quên chọn" value={String(totalMissed)} />
            <Summary label="Tổng đóng góp" value={formatCurrency(totalContribution)} />
          </div>
        </div>
      </section>

      <LeaderboardSection
        kicker="Vua dự đoán"
        title="Top đoán đúng nhiều nhất"
        description="Xếp theo số trận đúng, sau đó đến độ chính xác và số lần quên chọn."
        rows={predictionRows}
        mode="prediction"
      />

      <LeaderboardSection
        kicker="Top đóng góp"
        title="Top đóng góp nhiều nhất"
        description="Xếp theo tổng Belly đóng góp sau các trận đã chốt."
        rows={contributionRows}
        mode="contribution"
      />

      {rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-white p-10 text-center">
          <h2 className="text-xl font-extrabold text-emerald-950">
            Chưa có người chơi
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Admin tạo tài khoản hoặc người chơi tự đăng ký thì bảng này sẽ có dữ liệu.
          </p>
        </div>
      )}
    </div>
  );
}

function LeaderboardSection({
  kicker,
  title,
  description,
  rows,
  mode,
}: {
  kicker: string;
  title: string;
  description: string;
  rows: RankedRow[];
  mode: BoardMode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5">
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-4 py-4 sm:px-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            {mode === "prediction" ? <Crown size={15} /> : <Sparkles size={15} />}
            {kicker}
          </p>
          <h2 className="mt-1 text-2xl font-black text-emerald-950">
            {title}
          </h2>
        </div>
        <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">
          {description}
        </p>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) => (
          <MobileCard key={row.id} row={row} mode={mode} />
        ))}
      </div>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-emerald-950 text-left text-white">
            <tr>
              {[
                "Hạng",
                "Người chơi",
                "Đã chọn",
                "Quên",
                "Đúng",
                "Sai",
                "Độ chính xác",
                "Ngôi sao",
                "Ngôi sao sai",
                "Đóng góp",
              ].map((title) => (
                <th key={title} className="px-4 py-3 font-bold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const visual = getRankVisual(row.displayRank, mode);
              const rowBg =
                row.displayRank <= 3
                  ? visual.desktopClass
                  : index % 2
                    ? "bg-slate-50/60"
                    : "bg-white";

              return (
                <tr
                  key={row.id}
                  className={`border-t border-slate-100 transition hover:bg-emerald-50/40 ${
                    row.displayRank <= 3 ? "elite-row" : ""
                  } ${rowBg}`}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={row.displayRank} mode={mode} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar image={row.image} name={row.name} rank={row.displayRank} mode={mode} />
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-emerald-950">
                          {row.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {row.department || "Chưa có đơn vị"}
                        </p>
                        <RankTag rank={row.displayRank} mode={mode} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{row.voted}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-amber-700">{row.missed}</td>
                  <td className="px-4 py-3 font-black tabular-nums text-emerald-700">{row.correct}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-red-700">{row.wrong}</td>
                  <td className="px-4 py-3">
                    <AccuracyCell value={row.accuracy} rank={row.displayRank} mode={mode} />
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{row.hopeStarUsed}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-amber-700">{row.hopeStarWrong}</td>
                  <td className="px-4 py-3 font-black tabular-nums text-red-700">
                    {formatCurrency(row.loss)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getRankVisual(rank: number, mode: BoardMode) {
  if (rank === 1) {
    return {
      Icon: mode === "prediction" ? Crown : Trophy,
      tag: mode === "prediction" ? "Vua dự đoán" : "Dẫn đầu đóng góp",
      badgeClass: "bg-amber-400 text-amber-950 ring-amber-200 shadow-amber-500/25",
      cardClass:
        "border-amber-300 bg-[linear-gradient(135deg,#fff8d7_0%,#ffffff_55%,#fff1a8_100%)] shadow-amber-900/15",
      desktopClass: "bg-[linear-gradient(90deg,#fff7cc_0%,#ffffff_60%,#fff5d6_100%)]",
      tagClass: "bg-amber-500 text-amber-950",
      haloClass: "bg-amber-300/45",
      barClass: "from-amber-400 via-yellow-300 to-amber-500",
      avatarClass:
        "ring-2 ring-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.16),0_0_24px_rgba(245,158,11,0.32)]",
    };
  }

  if (rank === 2) {
    return {
      Icon: Award,
      tag: mode === "prediction" ? "Bám sát" : "Tiếp sức mạnh",
      badgeClass: "bg-slate-200 text-slate-900 ring-slate-100 shadow-slate-400/20",
      cardClass:
        "border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#e8eef6_100%)] shadow-slate-900/10",
      desktopClass: "bg-[linear-gradient(90deg,#f8fafc_0%,#ffffff_62%,#eef2f7_100%)]",
      tagClass: "bg-slate-900 text-white",
      haloClass: "bg-slate-300/45",
      barClass: "from-slate-400 via-slate-200 to-slate-500",
      avatarClass:
        "ring-2 ring-slate-300 shadow-[0_0_0_4px_rgba(148,163,184,0.15),0_0_20px_rgba(100,116,139,0.22)]",
    };
  }

  if (rank === 3) {
    return {
      Icon: Flame,
      tag: mode === "prediction" ? "Phong độ cao" : "Máu lửa",
      badgeClass: "bg-orange-300 text-orange-950 ring-orange-100 shadow-orange-500/18",
      cardClass:
        "border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#ffedd5_100%)] shadow-orange-900/10",
      desktopClass: "bg-[linear-gradient(90deg,#fff7ed_0%,#ffffff_62%,#ffedd5_100%)]",
      tagClass: "bg-orange-500 text-white",
      haloClass: "bg-orange-300/42",
      barClass: "from-orange-400 via-amber-300 to-orange-500",
      avatarClass:
        "ring-2 ring-orange-300 shadow-[0_0_0_4px_rgba(253,186,116,0.14),0_0_20px_rgba(249,115,22,0.24)]",
    };
  }

  return {
    Icon: Medal,
    tag: "",
    badgeClass: "bg-emerald-950 text-white ring-emerald-900/10",
    cardClass: "border-emerald-950/10 bg-white shadow-emerald-950/5",
    desktopClass: "",
    tagClass: "",
    haloClass: "",
    barClass: "from-emerald-500 to-teal-400",
    avatarClass: "ring-1 ring-emerald-200",
  };
}

function RankBadge({
  rank,
  mode,
  compact = false,
}: {
  rank: number;
  mode: BoardMode;
  compact?: boolean;
}) {
  const visual = getRankVisual(rank, mode);
  const Icon = visual.Icon;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden font-black ring-4 ${
        compact ? "h-9 min-w-9 rounded-xl px-2 text-xs" : "h-10 min-w-10 rounded-2xl px-2.5 text-sm"
      } ${visual.badgeClass}`}
    >
      {rank <= 3 && (
        <span
          className={`rank-pulse pointer-events-none absolute inset-[-8px] rounded-2xl ${visual.haloClass}`}
          style={{ animation: "wcPulse 2.9s ease-in-out infinite" }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1">
        {rank <= 3 && !compact && <Icon size={14} strokeWidth={2.5} aria-hidden="true" />}
        #{rank}
      </span>
    </div>
  );
}

function RankTag({
  rank,
  mode,
}: {
  rank: number;
  mode: BoardMode;
}) {
  const visual = getRankVisual(rank, mode);
  const Icon = visual.Icon;
  if (rank > 3) return null;

  return (
    <span className={`mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${visual.tagClass}`}>
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="truncate">{visual.tag}</span>
    </span>
  );
}

function MobileCard({ row, mode }: { row: RankedRow; mode: BoardMode }) {
  const visual = getRankVisual(row.displayRank, mode);
  const primaryLabel = mode === "prediction" ? "Đúng" : "Đóng góp";
  const primaryValue =
    mode === "prediction" ? String(row.correct) : formatCurrency(row.loss);

  return (
    <article className={`relative overflow-hidden rounded-2xl border p-3 shadow-sm active:scale-[0.99] ${visual.cardClass}`}>
      {row.displayRank <= 3 && (
        <span
          className={`rank-pulse pointer-events-none absolute right-2 top-2 h-14 w-14 rounded-full ${visual.haloClass}`}
          style={{ animation: "wcPulse 3.2s ease-in-out infinite" }}
        />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <RankBadge rank={row.displayRank} mode={mode} compact />
          <Avatar image={row.image} name={row.name} rank={row.displayRank} mode={mode} />
          <div className="min-w-0">
            <p className="truncate text-base font-black text-emerald-950">
              {row.name}
            </p>
            <p className="truncate text-xs font-semibold text-slate-500">
              {row.department || "Chưa có đơn vị"}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-slate-400">
              {row.accuracy.toFixed(0)}% chính xác
            </p>
            <RankTag rank={row.displayRank} mode={mode} />
          </div>
        </div>
        <div className="ml-1 w-[7.2rem] shrink-0 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            {primaryLabel}
          </p>
          <p className="mt-0.5 break-words text-[13px] font-black leading-tight text-red-700">
            {primaryValue}
          </p>
        </div>
      </div>

      <div className="relative mt-2">
        <AccuracyBar value={row.accuracy} rank={row.displayRank} mode={mode} />
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

function AccuracyCell({
  value,
  rank,
  mode,
}: {
  value: number;
  rank: number;
  mode: BoardMode;
}) {
  return (
    <div className="min-w-24">
      <p className="font-black tabular-nums text-emerald-950">{value.toFixed(1)}%</p>
      <AccuracyBar value={value} rank={rank} mode={mode} />
    </div>
  );
}

function AccuracyBar({
  value,
  rank,
  mode,
}: {
  value: number;
  rank: number;
  mode: BoardMode;
}) {
  const visual = getRankVisual(rank, mode);
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${visual.barClass}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
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

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-2.5 py-3 text-center">
      <p className="break-words text-base font-black leading-tight text-emerald-950 sm:text-lg">
        {value}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Avatar({
  image,
  name,
  rank,
  mode,
}: {
  image: string | null;
  name: string;
  rank: number;
  mode: BoardMode;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const visual = getRankVisual(rank, mode);
  const avatarClass = `relative z-10 h-10 w-10 rounded-2xl ${visual.avatarClass}`;

  return (
    <span className="relative inline-flex shrink-0">
      {rank <= 3 && (
        <span
          className={`rank-pulse pointer-events-none absolute inset-[-7px] rounded-2xl ${visual.haloClass}`}
          style={{ animation: "wcPulse 3.4s ease-in-out infinite" }}
        />
      )}
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`Ảnh đại diện của ${name}`}
          className={`${avatarClass} object-cover`}
        />
      ) : (
        <span className={`flex ${avatarClass} items-center justify-center bg-emerald-100 text-sm font-black text-emerald-900`}>
          {initial}
        </span>
      )}
    </span>
  );
}
