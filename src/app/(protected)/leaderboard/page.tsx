import Image from "next/image";
import { Award, Crown, Flame, Medal, Sparkles, Trophy, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/domain";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type LeaderboardRow = Awaited<ReturnType<typeof getLeaderboard>>[number];
type RankedRow = LeaderboardRow & { displayRank: number };
type BoardMode = "prediction" | "contribution";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const params = (await searchParams) ?? {};
  const activeBoard =
    typeof params.board === "string" && params.board === "contribution"
      ? "contribution"
      : "prediction";
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
  const activeSection =
    activeBoard === "prediction"
      ? {
          kicker: "Vua dự đoán",
          title: "Top đoán đúng nhiều nhất",
          description:
            "Xếp theo số trận đúng, sau đó đến độ chính xác và số lần quên chọn.",
          rows: predictionRows,
          mode: "prediction" as const,
        }
      : {
          kicker: "Top đóng góp",
          title: "Top đóng góp nhiều nhất",
          description: "Xếp theo tổng Belly đóng góp sau các trận đã chốt.",
          rows: contributionRows,
          mode: "contribution" as const,
        };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes wcPulse {
          0%, 100% { transform: scale(1); opacity: 0.52; }
          50% { transform: scale(1.16); opacity: 0.16; }
        }
        @keyframes wcRingSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes wcSpark {
          0%, 100% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.7); }
          20% { opacity: 1; }
          52% { opacity: 0.72; transform: translate3d(var(--spark-x), var(--spark-y), 0) scale(1); }
          78% { opacity: 0; transform: translate3d(calc(var(--spark-x) * 1.35), calc(var(--spark-y) * 1.35), 0) scale(0.45); }
        }
        @keyframes wcBolt {
          0%, 32%, 100% { opacity: 0; filter: drop-shadow(0 0 0 transparent); transform: translateY(0) rotate(var(--bolt-rotate)) scale(0.9); }
          6%, 10% { opacity: 1; filter: drop-shadow(0 0 10px currentColor); transform: translateY(-1px) rotate(var(--bolt-rotate)) scale(1.08); }
          14% { opacity: 0.42; transform: translateY(1px) rotate(var(--bolt-rotate)) scale(0.96); }
        }
        @keyframes wcStorm {
          0%, 100% { opacity: 0.35; transform: scale(0.98) rotate(0deg); }
          38% { opacity: 0.9; transform: scale(1.08) rotate(7deg); }
          64% { opacity: 0.5; transform: scale(1.02) rotate(-5deg); }
        }
        @keyframes wcBoltStrong {
          0%, 100% { opacity: 0.34; filter: drop-shadow(0 0 7px currentColor); transform: translateY(0) rotate(var(--bolt-rotate)) scale(0.95); }
          9%, 17% { opacity: 1; filter: drop-shadow(0 0 15px currentColor); transform: translateY(-2px) rotate(var(--bolt-rotate)) scale(1.15); }
          29% { opacity: 0.52; transform: translateY(1px) rotate(var(--bolt-rotate)) scale(0.98); }
          48% { opacity: 0.88; filter: drop-shadow(0 0 12px currentColor); }
          70% { opacity: 0.24; }
        }
        @keyframes wcBoltWarm {
          0%, 100% { opacity: 0.18; filter: drop-shadow(0 0 4px currentColor); transform: translateY(0) rotate(var(--bolt-rotate)) scale(0.92); }
          12%, 18% { opacity: 0.9; filter: drop-shadow(0 0 11px currentColor); transform: translateY(-1px) rotate(var(--bolt-rotate)) scale(1.06); }
          38% { opacity: 0.36; }
        }
        @keyframes wcBarSweep {
          0% { transform: translateX(-140%); opacity: 0; }
          35% { opacity: 0.7; }
          100% { transform: translateX(250%); opacity: 0; }
        }
        @keyframes wcBadgePop {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1px) scale(1.04); }
        }
        @keyframes wcShine {
          0% { transform: translateX(-120%); opacity: 0; }
          35% { opacity: 0.32; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        .leaderboard-stage {
          position: relative;
          isolation: isolate;
        }
        .leaderboard-stage::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 18% 18%, rgba(16, 185, 129, 0.13), transparent 30%),
            radial-gradient(circle at 85% 0%, rgba(251, 191, 36, 0.18), transparent 26%),
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92));
        }
        .elite-row {
          position: relative;
          --rank-accent: #10b981;
          --rank-glow: rgba(16, 185, 129, 0.18);
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
        .elite-row td {
          position: relative;
        }
        .elite-row td:first-child {
          box-shadow: inset 4px 0 0 var(--rank-accent);
        }
        .elite-row td:nth-child(2)::before {
          content: "";
          position: absolute;
          left: 0;
          top: 14%;
          bottom: 14%;
          width: 1px;
          background: linear-gradient(180deg, transparent, var(--rank-accent), transparent);
          opacity: 0.55;
        }
        .elite-card {
          isolation: isolate;
          --rank-accent: #10b981;
          --rank-glow: rgba(16, 185, 129, 0.18);
        }
        .elite-card::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 18% 18%, var(--rank-glow), transparent 42%),
            radial-gradient(circle at 88% 8%, rgba(255,255,255,0.9), transparent 24%);
        }
        .elite-card::after {
          content: "";
          position: absolute;
          left: -45%;
          top: -20%;
          height: 140%;
          width: 36%;
          z-index: -1;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.72), transparent);
          animation: wcShine 5.2s ease-in-out infinite;
        }
        .rank-gold {
          --rank-accent: #8b5cf6;
          --rank-accent-2: #c084fc;
          --rank-glow: rgba(139, 92, 246, 0.34);
          --rank-soft: rgba(250, 245, 255, 0.76);
        }
        .rank-silver {
          --rank-accent: #f97316;
          --rank-accent-2: #ef4444;
          --rank-glow: rgba(249, 115, 22, 0.24);
          --rank-soft: rgba(255, 237, 213, 0.72);
        }
        .rank-bronze {
          --rank-accent: #fb923c;
          --rank-accent-2: #fbbf24;
          --rank-glow: rgba(251, 146, 60, 0.2);
          --rank-soft: rgba(255, 237, 213, 0.76);
        }
        .rank-badge-elite {
          animation: wcBadgePop 3.5s ease-in-out infinite;
          box-shadow: 0 12px 28px var(--rank-glow);
        }
        .rank-badge-elite::after {
          content: "";
          position: absolute;
          inset: -40% -65%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.78), transparent);
          transform: translateX(-120%);
          animation: wcShine 4.1s ease-in-out infinite;
        }
        .avatar-shell {
          --rank-accent: #10b981;
          --rank-glow: rgba(16, 185, 129, 0.18);
        }
        .avatar-elite {
          padding: 4px;
        }
        .avatar-ring {
          position: absolute;
          inset: -2px;
          border-radius: 20px;
          background:
            conic-gradient(from 20deg, transparent 0 10%, var(--rank-accent) 18%, #ffffff 26%, var(--rank-accent-2, var(--rank-accent)) 34%, transparent 46% 100%);
          animation: wcRingSpin 3.8s linear infinite;
          opacity: 0.95;
          filter: drop-shadow(0 0 10px var(--rank-glow));
        }
        .rank-gold .avatar-ring {
          inset: -5px;
          border-radius: 26px;
          background:
            conic-gradient(from -40deg, transparent 0 6%, #7c3aed 10%, #ffffff 15%, #c084fc 22%, transparent 30% 43%, #a855f7 50%, #f5d0fe 57%, transparent 66% 100%);
          animation-duration: 2.15s;
          filter: drop-shadow(0 0 14px rgba(139, 92, 246, 0.72));
        }
        .rank-silver .avatar-ring {
          inset: -3px;
          background:
            conic-gradient(from 30deg, transparent 0 12%, #ef4444 19%, #fff7ed 26%, #f97316 34%, transparent 48% 100%);
          animation-duration: 3.05s;
          filter: drop-shadow(0 0 12px rgba(249, 115, 22, 0.55));
        }
        .avatar-glow {
          position: absolute;
          inset: -8px;
          border-radius: 24px;
          background: radial-gradient(circle, var(--rank-glow), transparent 68%);
          animation: wcPulse 3.1s ease-in-out infinite;
        }
        .rank-gold .avatar-glow {
          inset: -15px;
          border-radius: 30px;
          background:
            radial-gradient(circle at 45% 45%, rgba(216, 180, 254, 0.52), transparent 48%),
            radial-gradient(circle, rgba(91, 33, 182, 0.32), transparent 74%);
          animation: wcStorm 2.2s ease-in-out infinite;
        }
        .rank-silver .avatar-glow {
          inset: -11px;
          background:
            radial-gradient(circle at 50% 50%, rgba(253, 186, 116, 0.42), transparent 48%),
            radial-gradient(circle, rgba(239, 68, 68, 0.18), transparent 72%);
          animation-duration: 2.75s;
        }
        .avatar-zap {
          position: absolute;
          z-index: 20;
          color: var(--rank-accent);
          animation: wcBolt 2.6s linear infinite;
        }
        .avatar-zap-a {
          --bolt-rotate: -18deg;
          right: -6px;
          top: -7px;
        }
        .avatar-zap-b {
          --bolt-rotate: 18deg;
          bottom: -6px;
          left: -6px;
          animation-delay: 0.7s;
        }
        .avatar-zap-c,
        .avatar-zap-d {
          display: none;
        }
        .rank-gold .avatar-zap {
          color: #a855f7;
          animation-name: wcBoltStrong;
          animation-duration: 1.75s;
        }
        .rank-gold .avatar-zap-a {
          right: -9px;
          top: -10px;
        }
        .rank-gold .avatar-zap-b {
          bottom: -9px;
          left: -9px;
          animation-delay: 0.34s;
        }
        .rank-gold .avatar-zap-c {
          --bolt-rotate: 34deg;
          display: block;
          right: -11px;
          bottom: 5px;
          animation-delay: 0.68s;
        }
        .rank-gold .avatar-zap-d {
          --bolt-rotate: -38deg;
          display: block;
          left: -9px;
          top: 7px;
          animation-delay: 1.02s;
        }
        .rank-silver .avatar-zap {
          color: #f97316;
          animation-name: wcBoltWarm;
          animation-duration: 2.25s;
        }
        .rank-silver .avatar-zap-a {
          color: #ef4444;
        }
        .rank-silver .avatar-zap-b {
          opacity: 0.78;
        }
        .rank-bronze .avatar-zap {
          animation-duration: 2.9s;
        }
        .avatar-spark {
          position: absolute;
          z-index: 20;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 0 8px 2px var(--rank-accent);
          animation: wcSpark 2.9s ease-out infinite;
        }
        .avatar-spark-a {
          --spark-x: 13px;
          --spark-y: -10px;
          right: 4px;
          top: 1px;
        }
        .avatar-spark-b {
          --spark-x: -12px;
          --spark-y: 11px;
          left: 5px;
          bottom: 1px;
          animation-delay: 0.9s;
        }
        .avatar-spark-c,
        .avatar-spark-d {
          display: none;
        }
        .rank-gold .avatar-spark {
          width: 6px;
          height: 6px;
          box-shadow: 0 0 12px 3px #c084fc;
          animation-duration: 1.9s;
        }
        .rank-gold .avatar-spark-c {
          --spark-x: 18px;
          --spark-y: 12px;
          display: block;
          right: -4px;
          bottom: 10px;
          animation-delay: 0.38s;
        }
        .rank-gold .avatar-spark-d {
          --spark-x: -17px;
          --spark-y: -12px;
          display: block;
          left: -3px;
          top: 10px;
          animation-delay: 0.76s;
        }
        .rank-silver .avatar-spark {
          box-shadow: 0 0 9px 2px #fb923c;
          animation-duration: 2.45s;
        }
        .mobile-primary-badge {
          position: relative;
          isolation: isolate;
        }
        .mobile-primary-badge::before {
          content: "";
          position: absolute;
          inset: -18px;
          z-index: -1;
          border-radius: 999px;
          background: radial-gradient(circle, var(--rank-glow, rgba(16, 185, 129, 0.12)), transparent 68%);
          opacity: 0.9;
        }
        .accuracy-sweep {
          position: relative;
          overflow: hidden;
        }
        .accuracy-sweep::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: 30%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
          animation: wcBarSweep 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .rank-pulse,
          .elite-row::after,
          .elite-card::after,
          .rank-badge-elite,
          .rank-badge-elite::after,
          .avatar-ring,
          .avatar-glow,
          .avatar-zap,
          .avatar-spark,
          .accuracy-sweep::after {
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

      <div className="sticky top-[88px] z-10 rounded-2xl border border-emerald-950/10 bg-white/95 p-2 shadow-lg shadow-emerald-950/5 backdrop-blur">
        <div className="grid grid-cols-2 gap-2">
          <BoardTab
            href="/leaderboard"
            selected={activeBoard === "prediction"}
            title="Top đoán đúng nhiều nhất"
            helper={`${totalCorrect} lượt đúng`}
          />
          <BoardTab
            href="/leaderboard?board=contribution"
            selected={activeBoard === "contribution"}
            title="Top đóng góp nhiều nhất"
            helper={formatCurrency(totalContribution)}
          />
        </div>
      </div>

      <LeaderboardSection
        kicker={activeSection.kicker}
        title={activeSection.title}
        description={activeSection.description}
        rows={activeSection.rows}
        mode={activeSection.mode}
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

function BoardTab({
  href,
  selected,
  title,
  helper,
}: {
  href: string;
  selected: boolean;
  title: string;
  helper: string;
}) {
  return (
    <a
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`rounded-xl px-3 py-3 text-center transition active:scale-[0.99] sm:px-4 ${
        selected
          ? "bg-emerald-900 text-white shadow-lg shadow-emerald-950/15"
          : "bg-slate-50 text-emerald-950 ring-1 ring-slate-200 hover:bg-emerald-50"
      }`}
    >
      <span className="block text-sm font-black leading-tight sm:text-base">
        {title}
      </span>
      <span
        className={`mt-1 block text-[11px] font-bold sm:text-xs ${
          selected ? "text-emerald-100" : "text-slate-500"
        }`}
      >
        {helper}
      </span>
    </a>
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
    <section className="leaderboard-stage overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5">
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
                    row.displayRank <= 3 ? `elite-row ${visual.rankClass}` : ""
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
      rankClass: "rank-gold",
      tagClass: "bg-amber-500 text-amber-950",
      haloClass: "bg-amber-300/45",
      barClass: "from-amber-400 via-yellow-300 to-amber-500",
      avatarClass:
        "ring-2 ring-violet-300 shadow-[0_0_0_4px_rgba(168,85,247,0.18),0_0_28px_rgba(124,58,237,0.42)]",
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
      rankClass: "rank-silver",
      tagClass: "bg-slate-900 text-white",
      haloClass: "bg-slate-300/45",
      barClass: "from-slate-400 via-slate-200 to-slate-500",
      avatarClass:
        "ring-2 ring-orange-300 shadow-[0_0_0_4px_rgba(249,115,22,0.15),0_0_22px_rgba(239,68,68,0.25)]",
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
      rankClass: "rank-bronze",
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
    rankClass: "",
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
      } ${visual.badgeClass} ${rank <= 3 ? `rank-badge-elite ${visual.rankClass}` : ""}`}
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
    <span className={`mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase leading-tight tracking-[0.08em] ${visual.tagClass}`}>
      <Icon className="shrink-0" size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{visual.tag}</span>
    </span>
  );
}

function MobilePrimaryBadge({
  label,
  value,
  rank,
  mode,
}: {
  label: string;
  value: string;
  rank: number;
  mode: BoardMode;
}) {
  const visual = getRankVisual(rank, mode);
  const bellyValue = value.endsWith(" Belly")
    ? value.slice(0, -" Belly".length)
    : null;
  const tone =
    rank === 1
      ? "border-violet-200 bg-violet-50/90 text-violet-950 shadow-violet-900/10"
      : rank === 2
        ? "border-orange-200 bg-orange-50/90 text-orange-950 shadow-orange-900/10"
        : rank === 3
          ? "border-amber-200 bg-amber-50/90 text-amber-950 shadow-amber-900/10"
          : "border-emerald-100 bg-emerald-50 text-emerald-950 shadow-emerald-900/5";

  return (
    <div
      className={`mobile-primary-badge flex min-w-[4.8rem] max-w-[6.9rem] shrink-0 flex-col items-center justify-center rounded-2xl border px-2.5 py-2 text-center shadow-sm ${
        rank <= 3 ? visual.rankClass : ""
      } ${tone}`}
    >
      <span className="text-[9px] font-black uppercase leading-none tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <span
        className={`mt-1 font-black leading-tight tabular-nums ${
          bellyValue ? "text-[11px] text-red-700" : "text-xl text-red-700"
        }`}
      >
        {bellyValue ? (
          <>
            <span className="block whitespace-nowrap">{bellyValue}</span>
            <span className="block text-[10px] text-red-700">Belly</span>
          </>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function MobileCard({ row, mode }: { row: RankedRow; mode: BoardMode }) {
  const visual = getRankVisual(row.displayRank, mode);
  const primaryLabel = mode === "prediction" ? "Đúng" : "Đóng góp";
  const primaryValue =
    mode === "prediction" ? String(row.correct) : formatCurrency(row.loss);

  return (
    <article className={`relative overflow-hidden rounded-2xl border p-3 shadow-sm active:scale-[0.99] ${row.displayRank <= 3 ? `elite-card ${visual.rankClass}` : ""} ${visual.cardClass}`}>
      {row.displayRank <= 3 && (
        <span
          className={`rank-pulse pointer-events-none absolute right-2 top-2 h-14 w-14 rounded-full ${visual.haloClass}`}
          style={{ animation: "wcPulse 3.2s ease-in-out infinite" }}
        />
      )}
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex flex-col items-center gap-2">
          <RankBadge rank={row.displayRank} mode={mode} compact />
          <Avatar image={row.image} name={row.name} rank={row.displayRank} mode={mode} />
        </div>
        <div className="min-w-0 pt-0.5">
            <p className="text-[17px] font-black leading-tight text-emerald-950 [overflow-wrap:anywhere]">
              {row.name}
            </p>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-600 [overflow-wrap:anywhere]">
              {row.department || "Chưa có đơn vị"}
            </p>
            <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-400">
              {row.accuracy.toFixed(0)}% chính xác
            </p>
            <RankTag rank={row.displayRank} mode={mode} />
        </div>
        <MobilePrimaryBadge
          label={primaryLabel}
          value={primaryValue}
          rank={row.displayRank}
          mode={mode}
        />
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
        className={`h-full rounded-full bg-gradient-to-r ${rank <= 3 ? "accuracy-sweep" : ""} ${visual.barClass}`}
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
  const bellyValue = value.endsWith(" Belly")
    ? value.slice(0, -" Belly".length)
    : null;

  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-2.5 py-3 text-center">
      <p className="text-[clamp(0.74rem,3.15vw,1.125rem)] font-black leading-tight text-emerald-950">
        {bellyValue ? (
          <>
            <span className="inline-block whitespace-nowrap">{bellyValue}</span>{" "}
            <span className="inline-block whitespace-nowrap">Belly</span>
          </>
        ) : (
          value
        )}
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
    <span className={`avatar-shell relative inline-flex shrink-0 ${rank <= 3 ? `avatar-elite ${visual.rankClass}` : ""}`}>
      {rank <= 3 && (
        <>
          <span className="avatar-glow pointer-events-none" />
          <span className="avatar-ring pointer-events-none" />
          <Zap className="avatar-zap avatar-zap-a pointer-events-none" size={15} strokeWidth={3} aria-hidden="true" />
          <Zap className="avatar-zap avatar-zap-b pointer-events-none" size={12} strokeWidth={3} aria-hidden="true" />
          {rank === 1 && (
            <>
              <Zap className="avatar-zap avatar-zap-c pointer-events-none" size={14} strokeWidth={3.2} aria-hidden="true" />
              <Zap className="avatar-zap avatar-zap-d pointer-events-none" size={10} strokeWidth={3.2} aria-hidden="true" />
            </>
          )}
          <span className="avatar-spark avatar-spark-a pointer-events-none" />
          <span className="avatar-spark avatar-spark-b pointer-events-none" />
          {rank === 1 && (
            <>
              <span className="avatar-spark avatar-spark-c pointer-events-none" />
              <span className="avatar-spark avatar-spark-d pointer-events-none" />
            </>
          )}
        </>
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
