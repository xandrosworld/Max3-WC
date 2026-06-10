import { MatchStatus, VoteChoice } from "@prisma/client";
import Image from "next/image";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from "lucide-react";
import { voteAction } from "@/app/actions";
import { TeamMark } from "@/components/team-mark";
import {
  canUseHopeStar,
  choiceLabel,
  formatCurrency,
  formatHandicap,
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
  | "scheduled"
  | "open"
  | "picked"
  | "missing"
  | "locked"
  | "settled";

const primaryFilters: Array<{ id: MatchFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "today", label: "Hôm nay" },
  { id: "open", label: "Đang mở" },
  { id: "picked", label: "Đã chọn" },
];

const extraFilters: Array<{ id: MatchFilter; label: string }> = [
  { id: "tomorrow", label: "Ngày mai" },
  { id: "scheduled", label: "Sắp mở" },
  { id: "missing", label: "Chưa chọn" },
  { id: "locked", label: "Đã khóa" },
  { id: "settled", label: "Có kết quả" },
];

const allFilters = [...primaryFilters, ...extraFilters];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const rawFilter = typeof params.filter === "string" ? params.filter : "all";
  const activeFilter = allFilters.some((filter) => filter.id === rawFilter)
    ? (rawFilter as MatchFilter)
    : "all";
  const searchTerm = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const saved = typeof params.saved === "string" ? params.saved : null;
  const now = new Date();

  const matches = await prisma.match.findMany({
    where: {
      deletedAt: null,
      status: {
        in: [
          MatchStatus.DRAFT,
          MatchStatus.OPEN,
          MatchStatus.CLOSED,
          MatchStatus.SETTLED,
        ],
      },
    },
    orderBy: { kickoffAt: "asc" },
    include: {
      result: true,
      votes: {
        select: { userId: true, choice: true, hopeStar: true },
      },
    },
  });

  const rows = matches.map((match) => ({
    match,
    locked: isVoteLocked(match, now),
    myVote: match.votes.find((vote) => vote.userId === user.id) ?? null,
  }));

  const filteredRows = rows.filter(({ match, locked, myVote }) => {
    const matchesSearch =
      !searchTerm ||
      `${match.teamA} ${match.teamB}`
        .toLocaleLowerCase("vi")
        .includes(searchTerm.toLocaleLowerCase("vi"));
    return (
      matchesSearch &&
      matchPassesFilter(activeFilter, match, locked, Boolean(myVote), now)
    );
  });

  const groupedRows = groupMatchesByDay(filteredRows);
  const myRows = rows.filter((row) => row.myVote).slice(-4).reverse();
  const missingOpenRows = rows
    .filter(
      ({ match, locked, myVote }) =>
        match.status === MatchStatus.OPEN && !locked && !myVote,
    )
    .slice(0, 4);
  const totalCount = rows.length;
  const scheduledCount = rows.filter(
    ({ match }) => match.status === MatchStatus.DRAFT,
  ).length;
  const openCount = rows.filter(
    ({ match, locked }) => match.status === MatchStatus.OPEN && !locked,
  ).length;
  const pickedCount = rows.filter(({ myVote }) => Boolean(myVote)).length;

  return (
    <div className="space-y-6">
      <section className="relative min-h-[220px] overflow-hidden rounded-2xl bg-[#061526] text-white shadow-xl shadow-slate-950/15 sm:min-h-[200px]">
        <Image
          src="/world-cup-2026-banner.png"
          alt="Cúp vàng trên sân vận động World Cup 2026"
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-[68%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,17,36,0.98)_0%,rgba(4,17,36,0.82)_42%,rgba(4,17,36,0.08)_78%)]" />
        <div className="relative flex min-h-[220px] max-w-2xl flex-col justify-center px-5 py-5 sm:min-h-[200px] sm:px-8 sm:py-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            Matchday · World Cup 2026
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-balance sm:text-4xl">
            Lịch đấu rõ, dự đoán nhanh
          </h1>
          <p className="mt-2 hidden max-w-lg text-sm leading-6 text-white/70 sm:block">
            Dự đoán vui nội bộ, không phải nền tảng cá cược. Khi dự đoán mở, bạn chọn ngay tại trận.
          </p>
          <div className="mt-4 grid max-w-lg grid-cols-4 gap-2 text-sm sm:mt-5">
            <BannerStat value={totalCount} label="trận" />
            <BannerStat value={scheduledCount} label="sắp mở" />
            <BannerStat value={openCount} label="đang mở" highlight />
            <BannerStat value={pickedCount} label="đã chọn" />
          </div>
        </div>
      </section>

      {saved && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          <CheckCircle2 size={19} aria-hidden="true" />
          {saved === "updated"
            ? "Đã cập nhật lựa chọn của bạn."
            : "Đã lưu lựa chọn của bạn."}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <CalendarDays className="mt-0.5 shrink-0 text-sky-700" size={19} aria-hidden="true" />
              <p className="leading-6">
                Lịch luôn hiển thị đầy đủ. Trận có nhãn <b>Đang mở</b> mới nhận dự đoán.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <nav
                className="flex max-w-full gap-2 overflow-x-auto pb-1"
                aria-label="Lọc lịch thi đấu"
              >
                {primaryFilters.map((filter) => (
                  <FilterLink
                    key={filter.id}
                    filter={filter}
                    selected={filter.id === activeFilter}
                    searchTerm={searchTerm}
                  />
                ))}
              </nav>

              <div className="flex gap-2">
                <form action="/matches" className="relative min-w-0 flex-1 sm:min-w-64">
                  {activeFilter !== "all" && (
                    <input type="hidden" name="filter" value={activeFilter} />
                  )}
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    name="q"
                    defaultValue={searchTerm}
                    placeholder="Tìm đội tuyển"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </form>

                <details className="relative shrink-0">
                  <summary className="flex min-h-11 list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <SlidersHorizontal size={17} aria-hidden="true" />
                    <span className="hidden sm:inline">Bộ lọc</span>
                    <ChevronDown size={15} aria-hidden="true" />
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10">
                    {extraFilters.map((filter) => (
                      <a
                        key={filter.id}
                        href={filterHref(filter.id, searchTerm)}
                        className={`block rounded-lg px-3 py-2 text-sm font-semibold ${
                          activeFilter === filter.id
                            ? "bg-emerald-50 text-emerald-900"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {filter.label}
                      </a>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {(searchTerm || activeFilter !== "all") && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <p>
                  Tìm thấy <b>{filteredRows.length}</b> trận
                  {searchTerm ? ` cho “${searchTerm}”` : ""}.
                </p>
                <a href="/matches" className="font-bold text-emerald-700 hover:text-emerald-900">
                  Xóa bộ lọc
                </a>
              </div>
            )}
          </section>

          {groupedRows.map(([dateKey, dayRows]) => (
            <section key={dateKey} aria-labelledby={`day-${dateKey}`}>
              <div className="mb-2 flex items-center gap-3">
                <h2
                  id={`day-${dateKey}`}
                  className="text-base font-extrabold text-[#082d24]"
                >
                  {formatVietnamDay(dayRows[0].match.kickoffAt)}
                </h2>
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-bold text-slate-500">
                  {dayRows.length} trận
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-emerald-950/5 divide-y divide-slate-100">
                {dayRows.map(({ match, locked, myVote }) => {
                  const isScheduled = match.status === MatchStatus.DRAFT;
                  const canPick = match.status === MatchStatus.OPEN && !locked;
                  const hopeStarAllowed = canUseHopeStar(match.round);
                  const counts = {
                    [VoteChoice.TEAM_A]: match.votes.filter(
                      (vote) => vote.choice === VoteChoice.TEAM_A,
                    ).length,
                    [VoteChoice.DRAW]: match.votes.filter(
                      (vote) => vote.choice === VoteChoice.DRAW,
                    ).length,
                    [VoteChoice.TEAM_B]: match.votes.filter(
                      (vote) => vote.choice === VoteChoice.TEAM_B,
                    ).length,
                  };

                  return (
                    <article key={match.id} className="group">
                      <div className="grid min-h-24 grid-cols-[60px_minmax(0,1fr)] items-center gap-3 px-3 py-4 sm:grid-cols-[76px_minmax(0,1fr)] sm:px-4 md:grid-cols-[76px_minmax(0,1fr)_155px]">
                        <div className="border-r border-slate-100 pr-3 text-center">
                          <p className="text-lg font-black tabular-nums text-[#082d24]">
                            {formatVietnamTimeOnly(match.kickoffAt)}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            {ROUND_LABELS[match.round]}
                          </p>
                        </div>

                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
                          <div className="flex min-w-0 items-center justify-end gap-2">
                            <span className="min-w-0 text-right text-sm font-extrabold leading-5 text-slate-950 sm:text-base">
                              {match.teamA}
                            </span>
                            <TeamMark
                              name={match.teamA}
                              code={match.teamACode}
                              crest={match.teamACrest}
                            />
                          </div>

                          <div className="min-w-10 text-center">
                            {match.result ? (
                              <span className="text-lg font-black tabular-nums text-slate-950">
                                {match.result.teamAScore}-{match.result.teamBScore}
                              </span>
                            ) : (
                              <span className="text-xs font-black text-slate-400">VS</span>
                            )}
                          </div>

                          <div className="flex min-w-0 items-center gap-2">
                            <TeamMark
                              name={match.teamB}
                              code={match.teamBCode}
                              crest={match.teamBCrest}
                            />
                            <span className="min-w-0 text-sm font-extrabold leading-5 text-slate-950 sm:text-base">
                              {match.teamB}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 md:col-span-1 md:block md:border-0 md:pt-0 md:text-right">
                          <StatusBadge
                            match={match}
                            locked={locked}
                            now={now}
                          />
                          {myVote && (
                            <p className="mt-0 text-xs font-bold text-emerald-700 md:mt-2">
                              Bạn đã chọn
                            </p>
                          )}
                        </div>
                      </div>

                      {!isScheduled && (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
                          {match.result ? (
                            <SettledMatchSummary
                              match={match}
                              myVote={myVote}
                            />
                          ) : canPick ? (
                            <form action={voteAction} className="space-y-4">
                              <input type="hidden" name="matchId" value={match.id} />
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2 text-xs font-bold">
                                  <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900 ring-1 ring-amber-100">
                                    {formatHandicap(match)}
                                  </span>
                                  <span className="rounded-lg bg-white px-2.5 py-1.5 text-slate-600 ring-1 ring-slate-200">
                                    Điểm quỹ {formatCurrency(match.contributionAmount)}
                                  </span>
                                </div>
                                <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                  <Clock3 size={15} aria-hidden="true" />
                                  {timeStatusLabel(match, locked, now)}
                                </p>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-3">
                                {[VoteChoice.TEAM_A, VoteChoice.DRAW, VoteChoice.TEAM_B].map(
                                  (choice) => {
                                    const selected = myVote?.choice === choice;
                                    return (
                                      <label key={choice} className="block">
                                        <input
                                          type="radio"
                                          name="choice"
                                          value={choice}
                                          required
                                          defaultChecked={selected}
                                          className="peer sr-only"
                                        />
                                        <span className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-200">
                                          <span className="text-sm font-extrabold text-[#082d24]">
                                            {choiceLabel(choice, match.teamA, match.teamB)}
                                          </span>
                                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold tabular-nums text-slate-500 peer-checked:bg-white">
                                            {counts[choice]}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  },
                                )}
                              </div>

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <label
                                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                                    hopeStarAllowed
                                      ? "border-amber-200 bg-amber-50 text-amber-950"
                                      : "border-slate-200 bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    name="hopeStar"
                                    value="true"
                                    defaultChecked={Boolean(myVote?.hopeStar)}
                                    disabled={!hopeStarAllowed}
                                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  <Sparkles size={17} aria-hidden="true" />
                                  <span className="font-bold">
                                    {hopeStarAllowed
                                      ? "Bật Ngôi sao hy vọng"
                                      : "Ngôi sao mở từ vòng loại trực tiếp"}
                                  </span>
                                </label>

                                <button className="min-h-11 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-extrabold text-white shadow-sm shadow-emerald-950/15 hover:bg-emerald-800 active:translate-y-px">
                                  {myVote ? "Cập nhật lựa chọn" : "Lưu lựa chọn"}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <LockedMatchSummary
                              match={match}
                              myVote={myVote}
                            />
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {filteredRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-white px-6 py-12 text-center">
              <Trophy className="mx-auto text-emerald-700" size={32} aria-hidden="true" />
              <h2 className="mt-3 text-xl font-extrabold text-[#082d24]">
                Chưa có trận phù hợp
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Đổi bộ lọc hoặc tìm bằng tên đội tuyển khác.
              </p>
              <a
                href="/matches"
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                Xem toàn bộ lịch
              </a>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-[#082d24]">Cần bạn chọn</h2>
                <p className="mt-1 text-xs text-slate-500">Những trận đang mở gần nhất</p>
              </div>
              <span className="rounded-lg bg-emerald-100 px-2 py-1 text-sm font-black text-emerald-800">
                {missingOpenRows.length}
              </span>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {missingOpenRows.length > 0 ? (
                missingOpenRows.map(({ match }) => (
                  <a
                    key={match.id}
                    href="/matches?filter=open"
                    className="block py-3 first:pt-1 hover:text-emerald-800"
                  >
                    <p className="text-sm font-extrabold text-slate-900">
                      {match.teamA} <span className="text-slate-400">vs</span> {match.teamB}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatVietnamDayShort(match.kickoffAt)} · {formatVietnamTimeOnly(match.kickoffAt)}
                    </p>
                  </a>
                ))
              ) : (
                <p className="py-5 text-center text-sm leading-6 text-slate-500">
                  Hiện không có trận nào đang chờ bạn chọn.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-emerald-950/5">
            <div>
              <h2 className="font-extrabold text-[#082d24]">Lựa chọn của tôi</h2>
              <p className="mt-1 text-xs text-slate-500">Các lựa chọn gần đây</p>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {myRows.length > 0 ? (
                myRows.map(({ match, myVote }) => (
                  <div key={match.id} className="py-3 first:pt-1">
                    <p className="text-sm font-extrabold text-slate-900">
                      {match.teamA} <span className="text-slate-400">vs</span> {match.teamB}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Bạn chọn:{" "}
                      <b>{choiceLabel(myVote!.choice, match.teamA, match.teamB)}</b>
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-sm leading-6 text-slate-500">
                  Bạn chưa chọn trận nào.
                </p>
              )}
            </div>
            {myRows.length > 0 && (
              <a
                href="/matches?filter=picked"
                className="mt-2 inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-900"
              >
                Xem tất cả lựa chọn
              </a>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function BannerStat({
  value,
  label,
  highlight = false,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <p className={highlight ? "text-emerald-300" : "text-white"}>
      <b className="block text-xl font-black tabular-nums">{value}</b>
      <span className="block text-xs font-semibold text-white/65">{label}</span>
    </p>
  );
}

function FilterLink({
  filter,
  selected,
  searchTerm,
}: {
  filter: { id: MatchFilter; label: string };
  selected: boolean;
  searchTerm: string;
}) {
  return (
    <a
      href={filterHref(filter.id, searchTerm)}
      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition ${
        selected
          ? "bg-emerald-800 text-white ring-emerald-800"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-900"
      }`}
    >
      {filter.label}
    </a>
  );
}

function StatusBadge({
  match,
  locked,
  now,
}: {
  match: { status: MatchStatus; kickoffAt: Date; result: unknown };
  locked: boolean;
  now: Date;
}) {
  const label = timeStatusLabel(match, locked, now);
  const tone =
    match.result || match.status === MatchStatus.SETTLED
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : match.status === MatchStatus.DRAFT
        ? "bg-sky-50 text-sky-800 ring-sky-100"
        : locked
          ? "bg-slate-100 text-slate-700 ring-slate-200"
          : "bg-amber-50 text-amber-900 ring-amber-100";

  return (
    <span className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-extrabold ring-1 ${tone}`}>
      {label}
    </span>
  );
}

function SettledMatchSummary({
  match,
  myVote,
}: {
  match: {
    teamA: string;
    teamB: string;
    contributionAmount: number;
    result: {
      teamAScore: number;
      teamBScore: number;
      winningChoice: VoteChoice;
    } | null;
  };
  myVote: { choice: VoteChoice; hopeStar: boolean } | null;
}) {
  if (!match.result) return null;
  const correct = myVote?.choice === match.result.winningChoice;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-extrabold text-[#082d24]">
          Kết quả 90 phút: {match.teamA} {match.result.teamAScore}-
          {match.result.teamBScore} {match.teamB}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-600">
          Cửa đúng:{" "}
          {choiceLabel(match.result.winningChoice, match.teamA, match.teamB)}
        </p>
      </div>
      {myVote ? (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-bold ${
            correct
              ? "bg-emerald-100 text-emerald-900"
              : "bg-red-50 text-red-800"
          }`}
        >
          Bạn dự đoán {correct ? "đúng" : "sai"}
          {!correct &&
            ` · Điểm quỹ +${formatCurrency(
              match.contributionAmount * (myVote.hopeStar ? 2 : 1),
            )}`}
        </div>
      ) : (
        <p className="text-sm font-semibold text-slate-500">Bạn không chọn trận này</p>
      )}
    </div>
  );
}

function LockedMatchSummary({
  match,
  myVote,
}: {
  match: {
    teamA: string;
    teamB: string;
    handicap: number;
    handicappedTeam: "TEAM_A" | "TEAM_B" | null;
    contributionAmount: number;
  };
  myVote: { choice: VoteChoice; hopeStar: boolean } | null;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900 ring-1 ring-amber-100">
          {formatHandicap(match)}
        </span>
        <span className="rounded-lg bg-white px-2.5 py-1.5 text-slate-600 ring-1 ring-slate-200">
          Điểm quỹ {formatCurrency(match.contributionAmount)}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-600">
        {myVote
          ? `Bạn đã chọn: ${choiceLabel(myVote.choice, match.teamA, match.teamB)}`
          : "Bạn không chọn trận này"}
      </p>
    </div>
  );
}

function groupMatchesByDay<
  T extends { match: { kickoffAt: Date } },
>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = vietnamDateKey(row.match.kickoffAt);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }
  return [...groups.entries()];
}

function filterHref(filter: MatchFilter, searchTerm: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (searchTerm) params.set("q", searchTerm);
  const query = params.toString();
  return query ? `/matches?${query}` : "/matches";
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
  if (filter === "tomorrow") {
    return vietnamDateKey(match.kickoffAt) === offsetVietnamDateKey(now, 1);
  }
  if (filter === "scheduled") return match.status === MatchStatus.DRAFT;
  if (filter === "open") return match.status === MatchStatus.OPEN && !locked;
  if (filter === "picked") return picked;
  if (filter === "missing") {
    return !picked && match.status === MatchStatus.OPEN && !locked;
  }
  if (filter === "locked") {
    return locked && match.status !== MatchStatus.DRAFT && !match.result;
  }
  return Boolean(match.result);
}

function timeStatusLabel(
  match: { status: MatchStatus; kickoffAt: Date; result: unknown },
  locked: boolean,
  now: Date,
) {
  if (match.result || match.status === MatchStatus.SETTLED) return "Có kết quả";
  if (match.status === MatchStatus.DRAFT) return "Sắp mở dự đoán";
  if (locked) return "Đã khóa";

  const lockAt = new Date(match.kickoffAt.getTime() - LOCK_MINUTES * 60_000);
  const remainingMs = lockAt.getTime() - now.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  if (remainingMs <= hour) {
    return `Còn ${Math.max(1, Math.ceil(remainingMs / minute))} phút`;
  }
  if (remainingMs <= 24 * hour) return `Còn ${Math.ceil(remainingMs / hour)} giờ`;
  return "Đang mở";
}

function vietnamDateKey(value: Date) {
  return new Date(value.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function offsetVietnamDateKey(value: Date, days: number) {
  return new Date(value.getTime() + (7 + days * 24) * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function formatVietnamTimeOnly(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatVietnamDay(value: Date) {
  const formatted = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatVietnamDayShort(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}
