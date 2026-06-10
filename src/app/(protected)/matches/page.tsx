import { MatchStatus, VoteChoice } from "@prisma/client";
import { voteAction } from "@/app/actions";
import {
  canUseHopeStar,
  choiceLabel,
  formatCurrency,
  formatHandicap,
  formatVietnamTime,
  isVoteLocked,
  LOCK_MINUTES,
  ROUND_LABELS,
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type MatchFilter =
  | "all"
  | "today"
  | "tomorrow"
  | "soon"
  | "open"
  | "picked"
  | "missing"
  | "locked"
  | "settled";

const filters: Array<{ id: MatchFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "today", label: "Hôm nay" },
  { id: "tomorrow", label: "Ngày mai" },
  { id: "soon", label: "Sắp diễn ra" },
  { id: "open", label: "Đang mở" },
  { id: "picked", label: "Đã chọn" },
  { id: "missing", label: "Chưa chọn" },
  { id: "locked", label: "Đã khóa" },
  { id: "settled", label: "Đã có kết quả" },
];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const rawFilter = typeof params.filter === "string" ? params.filter : "all";
  const activeFilter = filters.some((filter) => filter.id === rawFilter)
    ? (rawFilter as MatchFilter)
    : "all";
  const saved = typeof params.saved === "string" ? params.saved : null;
  const now = new Date();

  const matches = await prisma.match.findMany({
    where: {
      deletedAt: null,
      status: { in: [MatchStatus.OPEN, MatchStatus.CLOSED, MatchStatus.SETTLED] },
    },
    orderBy: { kickoffAt: "asc" },
    include: {
      result: true,
      votes: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  const rows = matches.map((match) => ({
    match,
    locked: isVoteLocked(match, now),
    myVote: match.votes.find((vote) => vote.userId === user.id) ?? null,
  }));

  const filteredRows = rows.filter(({ match, locked, myVote }) =>
    matchPassesFilter(activeFilter, match, locked, Boolean(myVote), now),
  );
  const myRows = rows.filter((row) => row.myVote).slice(0, 4);
  const openCount = rows.filter(({ match, locked }) => match.status === MatchStatus.OPEN && !locked).length;
  const missingOpenCount = rows.filter(
    ({ match, locked, myVote }) => match.status === MatchStatus.OPEN && !locked && !myVote,
  ).length;
  const settledCount = rows.filter(({ match }) => Boolean(match.result)).length;

  return (
    <div className="space-y-7">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            Dự đoán đang mở
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-emerald-950 md:text-4xl">
            Chọn kèo rõ ràng, xem lại dễ dàng
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Mỗi trận chọn một cửa. Từ vòng loại trực tiếp có thể bật Ngôi sao hy vọng:
            nếu đoán sai thì khoản phải góp của trận đó nhân đôi.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-3xl border border-emerald-950/10 bg-white p-3 shadow-sm shadow-emerald-950/5">
          <Stat label="Đang mở" value={openCount} />
          <Stat label="Chưa chọn" value={missingOpenCount} tone={missingOpenCount > 0 ? "warn" : "ok"} />
          <Stat label="Có kết quả" value={settledCount} />
        </div>
      </section>

      {saved && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          {saved === "updated" ? "Đã cập nhật lựa chọn." : "Đã lưu lựa chọn."}
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Lọc trận đấu">
        {filters.map((filter) => {
          const selected = filter.id === activeFilter;
          return (
            <a
              key={filter.id}
              href={filter.id === "all" ? "/matches" : `/matches?filter=${filter.id}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ring-1 transition ${
                selected
                  ? "bg-emerald-900 text-white ring-emerald-900"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-900"
              }`}
            >
              {filter.label}
            </a>
          );
        })}
      </nav>

      {myRows.length > 0 && (
        <section className="rounded-3xl border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-emerald-950">Lựa chọn của tôi</h2>
              <p className="text-sm text-slate-500">Những trận gần nhất bạn đã chọn.</p>
            </div>
            <a href="/matches?filter=picked" className="text-sm font-bold text-emerald-800 hover:text-emerald-950">
              Xem tất cả
            </a>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {myRows.map(({ match, myVote, locked }) => (
              <div key={match.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500">{formatVietnamTime(match.kickoffAt)}</p>
                <p className="mt-1 font-extrabold text-emerald-950">
                  {match.teamA} vs {match.teamB}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Bạn chọn: <b>{choiceLabel(myVote!.choice, match.teamA, match.teamB)}</b>
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {myVote!.hopeStar ? "Có Ngôi sao hy vọng" : "Không dùng Ngôi sao"} ·{" "}
                  {match.result ? voteResultLabel(myVote!.choice, match.result.winningChoice) : locked ? "Đã khóa" : "Còn đổi được"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {filteredRows.map(({ match, locked, myVote }) => {
          const hopeStarAllowed = canUseHopeStar(match.round);
          return (
            <article
              key={match.id}
              className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-950/10 bg-emerald-950 px-5 py-4 text-white">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-200">
                    {ROUND_LABELS[match.round]}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{formatVietnamTime(match.kickoffAt)} · giờ Việt Nam</p>
                </div>
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-extrabold text-emerald-50 ring-1 ring-white/15">
                  {timeStatusLabel(match, locked, now)}
                </span>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                  <h2 className="text-xl font-black leading-tight text-emerald-950">{match.teamA}</h2>
                  <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
                    VS
                  </span>
                  <h2 className="text-xl font-black leading-tight text-emerald-950">{match.teamB}</h2>
                </div>

                <div className="flex flex-wrap justify-center gap-2 text-sm font-semibold">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900 ring-1 ring-amber-100">
                    {formatHandicap(match)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    Mức góp {formatCurrency(match.contributionAmount)}
                  </span>
                </div>

                {match.result && (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-950 ring-1 ring-emerald-100">
                    Tỷ số 90 phút: {match.teamA} {match.result.teamAScore}-{match.result.teamBScore} {match.teamB}
                    <br />
                    Cửa thắng: {choiceLabel(match.result.winningChoice, match.teamA, match.teamB)}
                  </div>
                )}

                <form action={voteAction} className="space-y-4">
                  <input type="hidden" name="matchId" value={match.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[VoteChoice.TEAM_A, VoteChoice.DRAW, VoteChoice.TEAM_B].map((choice) => {
                      const voters = match.votes.filter((vote) => vote.choice === choice);
                      const selected = myVote?.choice === choice;
                      return (
                        <label key={choice} className="block">
                          <input
                            type="radio"
                            name="choice"
                            value={choice}
                            required
                            disabled={locked}
                            defaultChecked={selected}
                            className="peer sr-only"
                          />
                          <span className="block min-h-36 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-200">
                            <span className="block text-sm font-extrabold text-emerald-950">
                              {choiceLabel(choice, match.teamA, match.teamB)}
                            </span>
                            <span className="mt-2 block text-xs font-bold text-slate-500">
                              {voters.length} người đã chọn
                            </span>
                            <span className="mt-2 block min-h-10 text-xs leading-5 text-slate-500">
                              {formatVoterNames(voters.map((vote) => vote.user.name))}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <label
                    className={`flex items-start gap-3 rounded-2xl border p-3 ${
                      hopeStarAllowed
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="hopeStar"
                      value="true"
                      defaultChecked={Boolean(myVote?.hopeStar)}
                      disabled={!hopeStarAllowed || locked}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>
                      <span className="block font-extrabold">Ngôi sao hy vọng</span>
                      <span className="mt-1 block text-sm leading-5">
                        {hopeStarAllowed
                          ? "Bật nếu bạn muốn chơi lớn: đoán sai thì khoản góp trận này nhân đôi."
                          : "Chỉ dùng từ vòng loại trực tiếp."}
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500">
                      {myVote
                        ? `Đang chọn: ${choiceLabel(myVote.choice, match.teamA, match.teamB)}`
                        : locked
                          ? "Trận này đã khóa lựa chọn."
                          : "Bạn chưa chọn trận này."}
                    </p>
                    <button
                      disabled={locked}
                      className="min-h-11 rounded-2xl bg-emerald-800 px-5 py-2 text-sm font-extrabold text-white shadow-sm shadow-emerald-950/20 hover:bg-emerald-900 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {myVote ? "Cập nhật lựa chọn" : "Lưu lựa chọn"}
                    </button>
                  </div>
                </form>
              </div>
            </article>
          );
        })}
      </div>

      {filteredRows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-white p-10 text-center">
          <h2 className="text-xl font-extrabold text-emerald-950">Chưa có trận phù hợp</h2>
          <p className="mt-2 text-sm text-slate-500">
            Hãy đổi bộ lọc hoặc quay lại khi admin mở thêm trận cho người chơi.
          </p>
          <a
            href="/matches"
            className="mt-4 inline-flex rounded-2xl bg-emerald-800 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-900"
          >
            Xem tất cả trận
          </a>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "warn";
}) {
  const toneClass =
    tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-emerald-950";
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
      <p className={`text-2xl font-black tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function matchPassesFilter(
  filter: MatchFilter,
  match: { status: MatchStatus; kickoffAt: Date; result: unknown },
  locked: boolean,
  picked: boolean,
  now: Date,
) {
  if (filter === "all") return true;
  if (filter === "today") return vietnamDateKey(match.kickoffAt) === vietnamDateKey(now);
  if (filter === "tomorrow") return vietnamDateKey(match.kickoffAt) === offsetVietnamDateKey(now, 1);
  if (filter === "soon") return match.kickoffAt.getTime() > now.getTime() && match.status !== MatchStatus.SETTLED;
  if (filter === "open") return match.status === MatchStatus.OPEN && !locked;
  if (filter === "picked") return picked;
  if (filter === "missing") return !picked && match.status !== MatchStatus.SETTLED;
  if (filter === "locked") return locked && !match.result;
  return Boolean(match.result);
}

function timeStatusLabel(
  match: { status: MatchStatus; kickoffAt: Date; result: unknown },
  locked: boolean,
  now: Date,
) {
  if (match.result || match.status === MatchStatus.SETTLED) return "Đã có kết quả";
  if (locked) return "Đã khóa";

  const lockAt = new Date(match.kickoffAt.getTime() - LOCK_MINUTES * 60_000);
  const remainingMs = lockAt.getTime() - now.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  if (remainingMs <= hour) return `Còn ${Math.max(1, Math.ceil(remainingMs / minute))} phút để chọn`;
  if (remainingMs <= 24 * hour) return `Còn ${Math.ceil(remainingMs / hour)} giờ để chọn`;
  return `Khóa lúc ${formatVietnamTime(lockAt)}`;
}

function voteResultLabel(choice: VoteChoice, winningChoice: VoteChoice) {
  return choice === winningChoice ? "Đúng" : "Sai";
}

function formatVoterNames(names: string[]) {
  if (names.length === 0) return "Chưa có ai";
  const shown = names.slice(0, 4).join(", ");
  return names.length > 4 ? `${shown} và ${names.length - 4} người nữa` : shown;
}

function vietnamDateKey(value: Date) {
  return new Date(value.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function offsetVietnamDateKey(value: Date, days: number) {
  return new Date(value.getTime() + (7 + days * 24) * 60 * 60 * 1000).toISOString().slice(0, 10);
}
