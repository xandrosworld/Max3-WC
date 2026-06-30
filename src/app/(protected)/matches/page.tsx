import {
  MatchDecisionMethod,
  MatchStatus,
  RoundType,
  TeamSide,
  VoteChoice,
} from "@prisma/client";
import Image from "next/image";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import { MatchVoteForm } from "@/components/match-vote-form";
import { TeamMark } from "@/components/team-mark";
import {
  canUseHopeStar,
  choiceLabel,
  formatCurrency,
  formatVietnamTime,
  formatHandicap,
  hasDrawChoice,
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
  { id: "open", label: "Đang mở" },
  { id: "scheduled", label: "Sắp mở" },
  { id: "all", label: "Tất cả" },
];

const extraFilters: Array<{ id: MatchFilter; label: string }> = [
  { id: "today", label: "Hôm nay" },
  { id: "tomorrow", label: "Ngày mai" },
  { id: "picked", label: "Đã chọn" },
  { id: "missing", label: "Chưa chọn" },
  { id: "locked", label: "Đã khóa" },
  { id: "settled", label: "Đã xong" },
];

const allFilters = [...primaryFilters, ...extraFilters];

const roundTabOrder: RoundType[] = [
  RoundType.GROUP,
  RoundType.ROUND_OF_32,
  RoundType.ROUND_OF_16,
  RoundType.QUARTER_FINAL,
  RoundType.SEMI_FINAL,
  RoundType.THIRD_PLACE,
  RoundType.FINAL,
];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const rawFilter = typeof params.filter === "string" ? params.filter : "open";
  const activeFilter = allFilters.some((filter) => filter.id === rawFilter)
    ? (rawFilter as MatchFilter)
    : "open";
  const searchTerm = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const saved = typeof params.saved === "string" ? params.saved : null;
  const savedMatchId = typeof params.match === "string" ? params.match : null;
  const now = new Date();
  const activeExtraFilter = extraFilters.find((filter) => filter.id === activeFilter);
  const autoFollowTarget = user.autoFollowUserId
    ? await prisma.user.findUnique({
        where: { id: user.autoFollowUserId },
        select: { name: true, department: true },
      })
    : null;

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
      lossTransactions: {
        where: { userId: user.id },
        select: { amount: true },
        orderBy: { settlementRevision: "desc" },
      },
      votes: {
        select: { userId: true, choice: true, hopeStar: true, createdAt: true, updatedAt: true },
      },
    },
  });

  const rows = matches.map((match) => ({
    match,
    locked: isVoteLocked(match, now),
    myVote: match.votes.find((vote) => vote.userId === user.id) ?? null,
    followedVote: user.autoFollowUserId
      ? match.votes.find((vote) => vote.userId === user.autoFollowUserId) ?? null
      : null,
  }));

  const availableRoundTabs = roundTabOrder
    .map((round) => ({
      id: round,
      label: ROUND_LABELS[round],
      count: rows.filter((row) => row.match.round === round).length,
    }))
    .filter((round) => round.count > 0);
  const rawRound = typeof params.round === "string" ? params.round : "";
  const requestedRound = roundTabOrder.includes(rawRound as RoundType)
    ? (rawRound as RoundType)
    : null;
  const defaultRound = chooseDefaultRound(rows, now);
  const selectedRound =
    activeFilter === "all"
      ? requestedRound ?? defaultRound ?? availableRoundTabs[0]?.id ?? RoundType.GROUP
      : null;

  const filteredRows = rows.filter(({ match, locked, myVote }) => {
    const matchesSearch =
      !searchTerm ||
      `${match.teamA} ${match.teamB}`
        .toLocaleLowerCase("vi")
        .includes(searchTerm.toLocaleLowerCase("vi"));
    return (
      matchesSearch &&
      matchPassesFilter(activeFilter, match, locked, Boolean(myVote), now) &&
      (!selectedRound || match.round === selectedRound)
    );
  });

  const groupedRows = groupMatchesByDay(filteredRows);
  const myRows = rows
    .filter((row) => row.myVote)
    .sort((a, b) => compareMyVoteRows(a, b, now))
    .slice(0, 6);
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <CalendarDays className="mt-0.5 shrink-0 text-sky-700" size={19} aria-hidden="true" />
              <p className="leading-6">
                Màn chính ưu tiên các trận <b>Đang mở</b>. Các mục xem lại nằm trong <b>Bộ lọc</b>.
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
                    selectedRound={selectedRound}
                  />
                ))}
              </nav>

              <div className="flex gap-2">
                <form action="/matches" className="relative min-w-0 flex-1 sm:min-w-64">
                  {activeFilter !== "open" && (
                    <input type="hidden" name="filter" value={activeFilter} />
                  )}
                  {activeFilter === "all" && selectedRound && (
                    <input type="hidden" name="round" value={selectedRound} />
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
                    {activeExtraFilter ? (
                      <span>{activeExtraFilter.label}</span>
                    ) : (
                      <span className="hidden sm:inline">Bộ lọc</span>
                    )}
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

            {activeFilter === "all" && availableRoundTabs.length > 0 && (
              <nav
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
                aria-label="Chá»n vÃ²ng Ä‘áº¥u"
              >
                {availableRoundTabs.map((round) => {
                  const selected = round.id === selectedRound;
                  return (
                    <a
                      key={round.id}
                      href={filterHref("all", searchTerm, round.id)}
                      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-black ring-1 transition sm:px-4 ${
                        selected
                          ? "bg-[#062f25] text-white ring-[#062f25] shadow-md shadow-emerald-950/10"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-900"
                      }`}
                    >
                      <span>{round.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                          selected
                            ? "bg-white/15 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {round.count}
                      </span>
                    </a>
                  );
                })}
              </nav>
            )}

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
                {dayRows.map(({ match, locked, myVote, followedVote }) => {
                  const isScheduled = match.status === MatchStatus.DRAFT;
                  const canPick = match.status === MatchStatus.OPEN && !locked;
                  const hopeStarAllowed = canUseHopeStar(match.round);
                  const availableChoices = hasDrawChoice(match.handicap)
                    ? [VoteChoice.TEAM_A, VoteChoice.DRAW, VoteChoice.TEAM_B]
                    : [VoteChoice.TEAM_A, VoteChoice.TEAM_B];
                  const participantCount = match.votes.length;
                  const justSaved = Boolean(saved && savedMatchId === match.id);

                  return (
                    <article
                      id={`match-${match.id}`}
                      key={match.id}
                      className={`group scroll-mt-28 ${
                        justSaved ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <div className="grid min-h-24 grid-cols-[60px_minmax(0,1fr)] items-center gap-3 px-3 py-4 sm:grid-cols-[76px_minmax(0,1fr)] sm:px-4 md:grid-cols-[76px_minmax(0,1fr)_155px]">
                        <div className="border-r border-slate-100 pr-3 text-center">
                          <p className="text-lg font-black tabular-nums text-[#082d24]">
                            {formatVietnamTimeOnly(match.kickoffAt)}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            {ROUND_LABELS[match.round]}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="space-y-2 sm:hidden">
                            <MobileMatchTeamLine
                              name={match.teamA}
                              code={match.teamACode}
                              crest={match.teamACrest}
                            />
                            <div className="flex items-center gap-2 pl-11">
                              {match.result ? (
                                <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-black tabular-nums text-white shadow-sm">
                                  {match.result.teamAScore}-{match.result.teamBScore}
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                                  VS
                                </span>
                              )}
                              <span className="h-px min-w-4 flex-1 bg-slate-200" />
                            </div>
                            <MobileMatchTeamLine
                              name={match.teamB}
                              code={match.teamBCode}
                              crest={match.teamBCrest}
                            />
                          </div>

                          <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:grid">
                            <div className="flex min-w-0 items-center justify-end gap-2">
                              <span className="min-w-0 whitespace-normal break-words text-left text-sm font-extrabold leading-5 text-slate-950 sm:order-none sm:text-right sm:text-base">
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
                              <span className="min-w-0 whitespace-normal break-words text-sm font-extrabold leading-5 text-slate-950 sm:text-base">
                                {match.teamB}
                              </span>
                            </div>
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
                          {justSaved && (
                            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
                              <CheckCircle2 size={18} aria-hidden="true" />
                              {saved === "updated"
                                ? "Đã cập nhật lựa chọn của bạn."
                                : "Đã lưu lựa chọn của bạn."}
                            </div>
                          )}
                          {match.result ? (
                            <SettledMatchSummary
                              match={match}
                              myVote={myVote}
                              autoFollowTargetName={autoFollowTarget?.name ?? null}
                              followedVote={followedVote}
                            />
                          ) : canPick ? (
                            <MatchVoteForm
                              matchId={match.id}
                              returnFilter={activeFilter}
                              returnRound={selectedRound ?? undefined}
                              returnQ={searchTerm}
                              teamA={match.teamA}
                              teamB={match.teamB}
                              handicapLabel={formatHandicap(match)}
                              contributionLabel={formatCurrency(match.contributionAmount)}
                              participantLabel={
                                participantCount > 0
                                  ? `${participantCount} người đã tham gia`
                                  : "Chưa có người tham gia"
                              }
                              timeStatus={timeStatusLabel(match, locked, now)}
                              choices={availableChoices}
                              selectedChoice={myVote?.choice ?? null}
                              selectedHopeStar={Boolean(myVote?.hopeStar)}
                              hopeStarAllowed={hopeStarAllowed}
                              hasDrawChoice={hasDrawChoice(match.handicap)}
                            />
                          ) : (
                            <LockedMatchSummary
                              match={match}
                              myVote={myVote}
                              autoFollowTargetName={autoFollowTarget?.name ?? null}
                              followedVote={followedVote}
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
                href="/matches?filter=all"
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                Xem toàn bộ lịch
              </a>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
            <div>
              <h2 className="font-extrabold text-[#082d24]">Tự theo khi quên</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Nếu quá giờ mà bạn chưa chọn, hệ thống có thể tự theo một người bạn đã cài trước.
              </p>
            </div>
            {autoFollowTarget ? (
              <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
                Đang theo {autoFollowTarget.name}
                {autoFollowTarget.department ? ` · ${autoFollowTarget.department}` : ""}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                Chưa chọn ai để tự theo.
              </p>
            )}
            <a
              href="/profile"
              className="mt-3 inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-900"
            >
              Cài đặt trong hồ sơ
            </a>
          </section>

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
            <div className="mt-3 divide-y divide-slate-100 lg:max-h-[430px] lg:overflow-y-auto lg:pr-1">
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
              <p className="mt-1 text-xs text-slate-500">
                Tóm tắt trận, giờ đá, lựa chọn và kết quả nếu đã có.
              </p>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {myRows.length > 0 ? (
                myRows.map(({ match, myVote }) => (
                  <MyVoteSummary key={match.id} match={match} myVote={myVote!} now={now} />
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

type MyVoteRowForSort = {
  match: {
    kickoffAt: Date;
    result: { settledAt: Date } | null;
  };
  myVote: { updatedAt: Date } | null;
};

function compareMyVoteRows(
  a: MyVoteRowForSort,
  b: MyVoteRowForSort,
  now: Date,
) {
  const aGroup = getMyVoteSortGroup(a, now);
  const bGroup = getMyVoteSortGroup(b, now);
  if (aGroup !== bGroup) return aGroup - bGroup;

  if (aGroup === 2) {
    const kickoffDiff = a.match.kickoffAt.getTime() - b.match.kickoffAt.getTime();
    if (kickoffDiff !== 0) return kickoffDiff;
  } else {
    const aTime = getMyVoteSortTime(a);
    const bTime = getMyVoteSortTime(b);
    if (aTime !== bTime) return bTime - aTime;
  }

  return (
    (b.myVote?.updatedAt.getTime() ?? 0) -
    (a.myVote?.updatedAt.getTime() ?? 0)
  );
}

function getMyVoteSortGroup(row: MyVoteRowForSort, now: Date) {
  if (row.match.result) return 0;
  if (row.match.kickoffAt.getTime() <= now.getTime()) return 1;
  return 2;
}

function getMyVoteSortTime(row: MyVoteRowForSort) {
  return row.match.result?.settledAt.getTime() ?? row.match.kickoffAt.getTime();
}

function MyVoteSummary({
  match,
  myVote,
  now,
}: {
  match: {
    id: string;
    teamA: string;
    teamB: string;
    kickoffAt: Date;
    result: {
      teamAScore: number;
      teamBScore: number;
      winningChoice: VoteChoice;
      settledAt: Date;
    } | null;
    lossTransactions: Array<{ amount: number }>;
  };
  myVote: { choice: VoteChoice; hopeStar: boolean };
  now: Date;
}) {
  const correct = match.result?.winningChoice === myVote.choice;
  const transactionAmount = match.lossTransactions.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const hasStarted = match.kickoffAt.getTime() <= now.getTime();

  return (
    <a
      href={`/matches?filter=picked#match-${match.id}`}
      className="block py-3 first:pt-1 hover:text-emerald-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-extrabold leading-snug text-slate-900">
            {match.teamA} <span className="text-slate-400">vs</span> {match.teamB}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {formatVietnamDayShort(match.kickoffAt)} · {formatVietnamTimeOnly(match.kickoffAt)}
          </p>
        </div>
        {match.result ? (
          <span className="shrink-0 rounded-lg bg-slate-950 px-2 py-1 text-xs font-black tabular-nums text-white">
            {match.result.teamAScore}-{match.result.teamBScore}
          </span>
        ) : hasStarted ? (
          <span className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">
            Chờ kết quả
          </span>
        ) : (
          <span className="shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-100">
            Chưa đá
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        Bạn chọn:{" "}
        <b>{choiceLabel(myVote.choice, match.teamA, match.teamB)}</b>
        {myVote.hopeStar ? " · Ngôi sao" : ""}
      </p>
      {match.result && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span
            className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-black ${
              correct
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                : "bg-red-50 text-red-700 ring-1 ring-red-100"
            }`}
          >
            {correct ? "Bạn dự đoán đúng" : "Bạn dự đoán sai"}
          </span>
          <span
            className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-black ${
              transactionAmount > 0
                ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                : transactionAmount < 0
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "bg-slate-50 text-slate-600 ring-1 ring-slate-100"
            }`}
          >
            {formatMyVoteContribution(transactionAmount, Boolean(correct))}
          </span>
          <span className="inline-flex rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-100">
            Cửa đúng: {choiceLabel(match.result.winningChoice, match.teamA, match.teamB)}
          </span>
        </div>
      )}
    </a>
  );
}

function formatMyVoteContribution(amount: number, correct: boolean) {
  if (amount > 0) return `Đóng góp +${formatCurrency(amount)}`;
  if (amount < 0) return `Giảm đóng góp ${formatCurrency(Math.abs(amount))}`;
  return correct ? "Không đóng góp" : "Không tăng thêm";
}

function formatSettledScoreLine(match: {
  teamA: string;
  teamB: string;
  result: {
    teamAScore: number;
    teamBScore: number;
    decisionMethod: MatchDecisionMethod;
    teamAFinalScore: number;
    teamBFinalScore: number;
  } | null;
}) {
  if (!match.result) return "";
  const regularScore = `${match.teamA} ${match.result.teamAScore}-${match.result.teamBScore} ${match.teamB}`;
  if (match.result.decisionMethod === MatchDecisionMethod.PENALTY_SHOOTOUT) {
    return `Kết quả 90 phút: ${regularScore} · Pen ${match.result.teamAFinalScore}-${match.result.teamBFinalScore}`;
  }
  if (match.result.decisionMethod === MatchDecisionMethod.EXTRA_TIME) {
    return `Kết quả 90 phút: ${regularScore} · Sau hiệp phụ ${match.result.teamAFinalScore}-${match.result.teamBFinalScore}`;
  }
  return `Kết quả 90 phút: ${regularScore}`;
}

function getAdvancedTeamLabel(match: {
  teamA: string;
  teamB: string;
  result: { advancedTeam: TeamSide | null } | null;
}) {
  if (match.result?.advancedTeam === TeamSide.TEAM_A) return match.teamA;
  if (match.result?.advancedTeam === TeamSide.TEAM_B) return match.teamB;
  return null;
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
  selectedRound,
}: {
  filter: { id: MatchFilter; label: string };
  selected: boolean;
  searchTerm: string;
  selectedRound: RoundType | null;
}) {
  return (
    <a
      href={filterHref(filter.id, searchTerm, filter.id === "all" ? selectedRound : null)}
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

function MobileMatchTeamLine({
  name,
  code,
  crest,
}: {
  name: string;
  code: string | null;
  crest: string | null;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
      <TeamMark name={name} code={code} crest={crest} size="sm" />
      <span className="min-w-0 whitespace-normal break-words text-sm font-extrabold leading-5 text-slate-950">
        {name}
      </span>
    </div>
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
  autoFollowTargetName,
  followedVote,
}: {
  match: {
    teamA: string;
    teamB: string;
    handicap: number;
    handicappedTeam: "TEAM_A" | "TEAM_B" | null;
    contributionAmount: number;
    result: {
      teamAScore: number;
      teamBScore: number;
      decisionMethod: MatchDecisionMethod;
      teamAFinalScore: number;
      teamBFinalScore: number;
      advancedTeam: TeamSide | null;
      winningChoice: VoteChoice;
      settledAt: Date;
    } | null;
  };
  myVote: { choice: VoteChoice; hopeStar: boolean; createdAt: Date } | null;
  autoFollowTargetName: string | null;
  followedVote: { choice: VoteChoice; hopeStar: boolean } | null;
}) {
  if (!match.result) return null;
  const correct = myVote?.choice === match.result.winningChoice;
  const advancedTeamLabel = getAdvancedTeamLabel(match);
  const autoFollowedVoteText = getAutoFollowedVoteText({
    autoFollowTargetName,
    followedVote,
    myVote,
    settledAt: match.result.settledAt,
    teamA: match.teamA,
    teamB: match.teamB,
  });
  const missingVoteText = getMissingVoteText({
    autoFollowTargetName,
    followedVote,
    teamA: match.teamA,
    teamB: match.teamB,
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-extrabold text-[#082d24]">
          {formatSettledScoreLine(match)}
        </p>
        {advancedTeamLabel && (
          <p className="mt-1 text-xs font-black text-emerald-800">
            Đội đi tiếp: {advancedTeamLabel}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900 ring-1 ring-amber-100">
            Chấp: {formatHandicap(match)}
          </span>
          <span className="rounded-lg bg-white px-2.5 py-1.5 text-slate-600 ring-1 ring-slate-200">
            Đóng góp {formatCurrency(match.contributionAmount)}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-600">
          Cửa đúng:{" "}
          {choiceLabel(match.result.winningChoice, match.teamA, match.teamB)}
        </p>
        {myVote && (
          <p
            className={`mt-1 text-xs font-bold ${
              autoFollowedVoteText ? "text-amber-700" : "text-slate-500"
            }`}
          >
            {autoFollowedVoteText ??
              `Bạn đã chọn: ${choiceLabel(myVote.choice, match.teamA, match.teamB)}${
                myVote.hopeStar ? " · Ngôi sao" : ""
              }`}
          </p>
        )}
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
            ` · Đóng góp +${formatCurrency(
              match.contributionAmount * (myVote.hopeStar ? 2 : 1),
            )}`}
        </div>
      ) : (
        <p className="max-w-sm text-sm font-semibold text-slate-500">{missingVoteText}</p>
      )}
    </div>
  );
}

function getAutoFollowedVoteText({
  autoFollowTargetName,
  followedVote,
  myVote,
  settledAt,
  teamA,
  teamB,
}: {
  autoFollowTargetName: string | null;
  followedVote: { choice: VoteChoice } | null;
  myVote: { choice: VoteChoice; createdAt: Date } | null;
  settledAt: Date;
  teamA: string;
  teamB: string;
}) {
  if (!autoFollowTargetName || !followedVote || !myVote) return null;
  if (myVote.choice !== followedVote.choice) return null;

  const copiedDuringSettlement =
    Math.abs(myVote.createdAt.getTime() - settledAt.getTime()) <= 10_000;
  if (!copiedDuringSettlement) return null;

  return `Tự theo ${autoFollowTargetName}: ${choiceLabel(
    myVote.choice,
    teamA,
    teamB,
  )} · lúc ${formatVietnamTime(myVote.createdAt)}`;
}

function LockedMatchSummary({
  match,
  myVote,
  autoFollowTargetName,
  followedVote,
}: {
  match: {
    teamA: string;
    teamB: string;
    handicap: number;
    handicappedTeam: "TEAM_A" | "TEAM_B" | null;
    contributionAmount: number;
  };
  myVote: { choice: VoteChoice; hopeStar: boolean } | null;
  autoFollowTargetName: string | null;
  followedVote: { choice: VoteChoice; hopeStar: boolean } | null;
}) {
  const missingVoteText = getMissingVoteText({
    autoFollowTargetName,
    followedVote,
    teamA: match.teamA,
    teamB: match.teamB,
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900 ring-1 ring-amber-100">
          {formatHandicap(match)}
        </span>
        <span className="rounded-lg bg-white px-2.5 py-1.5 text-slate-600 ring-1 ring-slate-200">
          Đóng góp {formatCurrency(match.contributionAmount)}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-600">
        {myVote
          ? `Bạn đã chọn: ${choiceLabel(myVote.choice, match.teamA, match.teamB)}`
          : missingVoteText}
      </p>
    </div>
  );
}

function getMissingVoteText({
  autoFollowTargetName,
  followedVote,
  teamA,
  teamB,
}: {
  autoFollowTargetName: string | null;
  followedVote: { choice: VoteChoice } | null;
  teamA: string;
  teamB: string;
}) {
  if (!autoFollowTargetName) return "Bạn không chọn trận này";
  if (!followedVote) {
    return `Bạn không chọn trận này; hệ thống không tìm thấy lựa chọn nào trong chuỗi tự theo từ ${autoFollowTargetName}`;
  }
  return `Bạn chưa có lựa chọn; ${autoFollowTargetName} đã chọn ${choiceLabel(
    followedVote.choice,
    teamA,
    teamB,
  )}`;
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

type MatchRowForRound = {
  locked: boolean;
  match: {
    round: RoundType;
    status: MatchStatus;
    kickoffAt: Date;
    result: unknown;
  };
};

function chooseDefaultRound(rows: MatchRowForRound[], now: Date) {
  const byKickoffAsc = [...rows].sort(
    (a, b) => a.match.kickoffAt.getTime() - b.match.kickoffAt.getTime(),
  );
  const openRound = byKickoffAsc.find(
    ({ match, locked }) => match.status === MatchStatus.OPEN && !locked,
  )?.match.round;
  if (openRound) return openRound;

  const lockedRound = byKickoffAsc.find(
    ({ match }) => !match.result && match.kickoffAt.getTime() <= now.getTime(),
  )?.match.round;
  if (lockedRound) return lockedRound;

  const upcomingRound = byKickoffAsc.find(
    ({ match }) => !match.result && match.kickoffAt.getTime() > now.getTime(),
  )?.match.round;
  if (upcomingRound) return upcomingRound;

  return [...rows]
    .filter(({ match }) => match.result)
    .sort((a, b) => b.match.kickoffAt.getTime() - a.match.kickoffAt.getTime())[0]
    ?.match.round ?? null;
}

function filterHref(
  filter: MatchFilter,
  searchTerm: string,
  selectedRound?: RoundType | null,
) {
  const params = new URLSearchParams();
  if (filter !== "open") params.set("filter", filter);
  if (searchTerm) params.set("q", searchTerm);
  if (filter === "all" && selectedRound) params.set("round", selectedRound);
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
  if (match.result || match.status === MatchStatus.SETTLED) return "Đã xong";
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
