import {
  MatchDecisionMethod,
  MatchStatus,
  RoundType,
  TeamSide,
} from "@prisma/client";
import {
  CalendarDays,
  CheckCircle2,
  CircleEqual,
  Flag,
  ListChecks,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { TeamMark } from "@/components/team-mark";
import { formatVietnamTime, ROUND_LABELS } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type TournamentMatch = Awaited<ReturnType<typeof getTournamentMatches>>[number];
type GroupMatch = TournamentMatch;
type ResultForm = "W" | "D" | "L";

type TeamInfo = {
  key: string;
  name: string;
  code: string | null;
  crest: string | null;
  earliestKickoffAt: Date;
};

type TeamStanding = TeamInfo & {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ResultForm[];
};

type GroupStanding = {
  id: string;
  label: string;
  teams: TeamStanding[];
  completedMatches: number;
  totalMatches: number;
  nextMatchAt: Date | null;
};

type KnockoutRound = {
  round: RoundType;
  label: string;
  matches: TournamentMatch[];
  completedMatches: number;
  totalMatches: number;
  nextMatchAt: Date | null;
};

const roundOrder: RoundType[] = [
  RoundType.GROUP,
  RoundType.ROUND_OF_32,
  RoundType.ROUND_OF_16,
  RoundType.QUARTER_FINAL,
  RoundType.SEMI_FINAL,
  RoundType.THIRD_PLACE,
  RoundType.FINAL,
];

const knockoutRoundOrder = roundOrder.filter((round) => round !== RoundType.GROUP);

const groupAccents = [
  {
    border: "border-emerald-700",
    dot: "bg-emerald-700",
    surface: "bg-emerald-50",
    text: "text-emerald-800",
  },
  {
    border: "border-sky-700",
    dot: "bg-sky-700",
    surface: "bg-sky-50",
    text: "text-sky-800",
  },
  {
    border: "border-orange-600",
    dot: "bg-orange-600",
    surface: "bg-orange-50",
    text: "text-orange-800",
  },
  {
    border: "border-violet-700",
    dot: "bg-violet-700",
    surface: "bg-violet-50",
    text: "text-violet-800",
  },
  {
    border: "border-rose-700",
    dot: "bg-rose-700",
    surface: "bg-rose-50",
    text: "text-rose-800",
  },
  {
    border: "border-teal-700",
    dot: "bg-teal-700",
    surface: "bg-teal-50",
    text: "text-teal-800",
  },
];

async function getTournamentMatches() {
  return prisma.match.findMany({
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
    orderBy: [{ kickoffAt: "asc" }, { teamA: "asc" }],
    include: {
      result: true,
    },
  });
}

export default async function GroupsPage() {
  await requireUser();

  const now = new Date();
  const matches = await getTournamentMatches();
  const groupMatches = matches.filter((match) => match.round === RoundType.GROUP);
  const knockoutMatches = matches.filter((match) => match.round !== RoundType.GROUP);
  const groups = buildGroupStandings(groupMatches, now);
  const knockoutRounds = buildKnockoutRounds(knockoutMatches, now);
  const totalTeams = new Set(
    matches
      .filter((match) => match.round === RoundType.GROUP)
      .flatMap((match) => [teamKey(match.teamA), teamKey(match.teamB)]),
  ).size;
  const completedMatches = matches.filter((match) => match.result).length;
  const currentRound = chooseCurrentRound(matches, now);
  const nextMatch =
    matches
      .filter((match) => !match.result && match.kickoffAt.getTime() > now.getTime())
      .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())[0] ?? null;

  if (matches.length === 0) {
    return (
      <div className="space-y-5">
        <PageHero
          groupCount={0}
          knockoutRoundCount={0}
          totalTeams={0}
          completedMatches={0}
          totalMatches={0}
          nextMatchAt={null}
          currentRound={null}
        />
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            Bảng đấu
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
            Chưa có dữ liệu lịch đấu
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Khi lịch World Cup được nhập, vòng bảng và nhánh knock-out sẽ tự hiện ở đây.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHero
        groupCount={groups.length}
        knockoutRoundCount={knockoutRounds.length}
        totalTeams={totalTeams}
        completedMatches={completedMatches}
        totalMatches={matches.length}
        nextMatchAt={nextMatch?.kickoffAt ?? null}
        currentRound={currentRound}
      />

      <nav
        className={`-mx-4 grid gap-3 px-4 pb-1 sm:mx-0 sm:rounded-3xl sm:border sm:border-emerald-950/10 sm:bg-white/90 sm:p-3 sm:shadow-xl sm:shadow-emerald-950/10 ${
          knockoutRounds.length > 0 && groups.length > 0
            ? "sm:grid-cols-2"
            : "sm:grid-cols-1"
        }`}
        aria-label="Chọn nhanh khu vực bảng đấu"
      >
        {knockoutRounds.length > 0 && (
          <a
            href="#knockout"
            className="group relative inline-flex min-h-16 items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-950 bg-slate-950 px-4 py-3 text-left text-white shadow-lg shadow-slate-950/20 ring-1 ring-white/50 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/25"
          >
            <span className="pointer-events-none absolute inset-y-0 -left-16 w-12 rotate-12 bg-white/20 blur-sm transition duration-700 group-hover:left-full" />
            <span className="relative flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Swords size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black leading-tight">
                  Knock-out
                </span>
                <span className="mt-0.5 block text-xs font-bold text-white/70">
                  Nhánh loại trực tiếp
                </span>
              </span>
            </span>
            <span className="relative shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950 shadow-sm">
              {knockoutRounds.length} vòng
            </span>
          </a>
        )}
        {groups.length > 0 && (
          <a
            href="#group-stage"
            className="group relative inline-flex min-h-16 items-center justify-between gap-3 overflow-hidden rounded-2xl border border-emerald-700 bg-[linear-gradient(135deg,#ffffff_0%,#ecfdf5_48%,#fff7ed_100%)] px-4 py-3 text-left text-slate-950 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-100 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/15"
          >
            <span className="pointer-events-none absolute inset-y-0 -left-16 w-12 rotate-12 bg-emerald-200/60 blur-sm transition duration-700 group-hover:left-full" />
            <span className="relative flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm shadow-emerald-900/20">
                <Trophy size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black leading-tight">
                  Vòng bảng
                </span>
                <span className="mt-0.5 block text-xs font-bold text-slate-600">
                  Xếp hạng từng bảng
                </span>
              </span>
            </span>
            <span className="relative shrink-0 rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white shadow-sm shadow-emerald-900/15">
              {groups.length} bảng
            </span>
          </a>
        )}
      </nav>

      {knockoutRounds.length > 0 && (
        <KnockoutSection rounds={knockoutRounds} now={now} />
      )}

      {groups.length > 0 && (
        <section id="group-stage" className="space-y-3">
          <SectionHeading
            eyebrow="Vòng bảng"
            title="Bảng xếp hạng từng bảng"
            description="Thắng 3 điểm, hòa 1 điểm. Top 2 mỗi bảng đi tiếp."
          />
          <div className="grid w-full gap-4 xl:grid-cols-2">
            {groups.map((group, index) => (
              <GroupCard key={group.id} group={group} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PageHero({
  groupCount,
  knockoutRoundCount,
  totalTeams,
  completedMatches,
  totalMatches,
  nextMatchAt,
  currentRound,
}: {
  groupCount: number;
  knockoutRoundCount: number;
  totalTeams: number;
  completedMatches: number;
  totalMatches: number;
  nextMatchAt: Date | null;
  currentRound: RoundType | null;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm shadow-slate-950/5">
      <div className="grid gap-5 bg-[linear-gradient(135deg,#f8fffc_0%,#ffffff_45%,#fff8eb_100%)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)] lg:items-end">
        <div className="min-w-0 max-w-2xl">
          <span className="inline-flex min-h-8 items-center rounded-lg bg-emerald-50 px-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-800 ring-1 ring-emerald-200">
            World Cup 2026
          </span>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-normal text-slate-950 text-balance sm:text-4xl">
            Bảng đấu & nhánh knock-out
          </h1>
          <p className="mt-2 max-w-xl text-base font-semibold leading-7 text-slate-700">
            Theo dõi thứ hạng vòng bảng, lịch loại trực tiếp và đội đi tiếp sau 90 phút, hiệp phụ hoặc luân lưu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          <HeroStat icon={<Trophy size={18} />} label="Bảng" value={groupCount} />
          <HeroStat
            icon={<Swords size={18} />}
            label="Vòng KO"
            value={knockoutRoundCount}
          />
          <HeroStat icon={<Users size={18} />} label="Đội" value={totalTeams || "—"} />
          <HeroStat
            icon={<CheckCircle2 size={18} />}
            label="Đã chốt"
            value={`${completedMatches}/${totalMatches}`}
          />
          <HeroStat
            icon={<Flag size={18} />}
            label="Đang xem"
            value={currentRound ? ROUND_LABELS[currentRound] : "Chưa có"}
            compact
          />
          <HeroStat
            icon={<CalendarDays size={18} />}
            label="Trận tới"
            value={nextMatchAt ? formatVietnamTime(nextMatchAt) : "Chưa có"}
            compact
          />
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="flex min-h-[78px] items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-slate-950 shadow-sm shadow-slate-950/5">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
        <span
          className={`mt-0.5 block max-w-full whitespace-nowrap font-mono font-black text-slate-950 tabular-nums ${
            compact ? "truncate text-xs leading-5 sm:text-sm" : "text-xl sm:text-2xl"
          }`}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-950/5 sm:px-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
        {eyebrow}
      </p>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </header>
  );
}

function KnockoutSection({
  rounds,
  now,
}: {
  rounds: KnockoutRound[];
  now: Date;
}) {
  const totalMatches = rounds.reduce((sum, round) => sum + round.totalMatches, 0);
  const completedMatches = rounds.reduce(
    (sum, round) => sum + round.completedMatches,
    0,
  );

  return (
    <section id="knockout" className="space-y-3">
      <SectionHeading
        eyebrow="Loại trực tiếp"
        title="Nhánh knock-out"
        description={`${completedMatches}/${totalMatches} trận đã chốt. Kèo Belly vẫn tính theo 90 phút; đội đi tiếp theo kết quả cuối cùng.`}
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {rounds.map((round) => (
          <RoundCard key={round.round} round={round} now={now} />
        ))}
      </div>
    </section>
  );
}

function RoundCard({ round, now }: { round: KnockoutRound; now: Date }) {
  const completion = round.totalMatches
    ? Math.round((round.completedMatches / round.totalMatches) * 100)
    : 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <header className="border-b border-slate-200 bg-slate-950 px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
              Knock-out
            </p>
            <h3 className="mt-1 text-2xl font-black leading-tight">
              {round.label}
            </h3>
          </div>
          <span className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black ring-1 ring-white/15">
            {round.completedMatches}/{round.totalMatches}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-emerald-300"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-white/70">
          {round.nextMatchAt
            ? `Trận tới: ${formatVietnamTime(round.nextMatchAt)}`
            : round.completedMatches === round.totalMatches
              ? "Đã đủ kết quả"
              : "Chờ xác định lịch"}
        </p>
      </header>

      <div className="divide-y divide-slate-100">
        {round.matches.map((match) => (
          <KnockoutMatchCard key={match.id} match={match} now={now} />
        ))}
      </div>
    </article>
  );
}

function KnockoutMatchCard({
  match,
  now,
}: {
  match: TournamentMatch;
  now: Date;
}) {
  const winner = getAdvancedSide(match);
  const matchStatus = getKnockoutStatus(match, now);

  return (
    <article className="bg-white px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-black tabular-nums text-slate-950">
            {formatVietnamTimeCompact(match.kickoffAt)}
          </p>
          <p className="text-[11px] font-bold text-slate-500">
            {ROUND_LABELS[match.round]}
          </p>
        </div>
        <span
          className={`rounded-lg px-2.5 py-1 text-[11px] font-black ring-1 ${matchStatus.className}`}
        >
          {matchStatus.label}
        </span>
      </div>

      <div className="space-y-1.5">
        <KnockoutTeamRow
          name={match.teamA}
          code={match.teamACode}
          crest={match.teamACrest}
          score={match.result?.teamAScore ?? null}
          finalScore={match.result?.teamAFinalScore ?? null}
          side={TeamSide.TEAM_A}
          winner={winner}
          decisionMethod={match.result?.decisionMethod ?? null}
        />
        <KnockoutTeamRow
          name={match.teamB}
          code={match.teamBCode}
          crest={match.teamBCrest}
          score={match.result?.teamBScore ?? null}
          finalScore={match.result?.teamBFinalScore ?? null}
          side={TeamSide.TEAM_B}
          winner={winner}
          decisionMethod={match.result?.decisionMethod ?? null}
        />
      </div>

      {match.result && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black">
          <span className="rounded-lg bg-slate-50 px-2 py-1 text-slate-600 ring-1 ring-slate-200">
            90 phút {match.result.teamAScore}-{match.result.teamBScore}
          </span>
          {match.result.decisionMethod !== MatchDecisionMethod.REGULAR && (
            <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-800 ring-1 ring-amber-100">
              {match.result.decisionMethod === MatchDecisionMethod.PENALTY_SHOOTOUT
                ? "Pen"
                : "Hiệp phụ"}{" "}
              {match.result.teamAFinalScore}-{match.result.teamBFinalScore}
            </span>
          )}
          {winner && (
            <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-800 ring-1 ring-emerald-100">
              Đi tiếp: {winner === TeamSide.TEAM_A ? match.teamA : match.teamB}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function KnockoutTeamRow({
  name,
  code,
  crest,
  score,
  finalScore,
  side,
  winner,
  decisionMethod,
}: {
  name: string;
  code: string | null;
  crest: string | null;
  score: number | null;
  finalScore: number | null;
  side: TeamSide;
  winner: TeamSide | null;
  decisionMethod: MatchDecisionMethod | null;
}) {
  const isWinner = winner === side;
  const isPlaceholder = isPlaceholderName(name);
  const showFinalScore =
    decisionMethod && decisionMethod !== MatchDecisionMethod.REGULAR && finalScore !== null;

  return (
    <div
      className={`grid min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-2 py-2 ${
        isWinner
          ? "border-emerald-200 bg-emerald-50 text-slate-950"
          : isPlaceholder
            ? "border-slate-200 bg-slate-50 text-slate-500"
            : "border-slate-200 bg-white text-slate-950"
      }`}
    >
      <TeamMark name={name} code={code} crest={crest} size="xs" />
      <span
        className={`min-w-0 truncate text-sm font-black ${
          isPlaceholder ? "text-slate-500" : "text-slate-950"
        }`}
        title={name}
      >
        {name}
      </span>
      <span className="flex items-center gap-1">
        {score !== null ? (
          <span
            className={`inline-flex min-w-7 justify-center rounded-lg px-2 py-1 font-mono text-sm font-black tabular-nums ${
              isWinner ? "bg-emerald-800 text-white" : "bg-slate-950 text-white"
            }`}
          >
            {score}
          </span>
        ) : (
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">
            vs
          </span>
        )}
        {showFinalScore && (
          <span className="rounded-lg bg-amber-100 px-1.5 py-1 font-mono text-[11px] font-black text-amber-900">
            {finalScore}
          </span>
        )}
      </span>
    </div>
  );
}

function GroupCard({ group, index }: { group: GroupStanding; index: number }) {
  const accent = groupAccents[index % groupAccents.length];
  const completion = group.totalMatches
    ? Math.round((group.completedMatches / group.totalMatches) * 100)
    : 0;

  return (
    <article
      id={group.id}
      className={`w-full scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5 ${accent.border}`}
    >
      <header className={`border-b border-slate-200 px-4 py-3 ${accent.surface}`}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-black ${accent.text}`}>Bảng xếp hạng</p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950 sm:text-[1.7rem]">
              {group.label}
            </h2>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs font-black">
            <span className="inline-flex min-h-7 items-center whitespace-nowrap rounded-lg bg-slate-950 px-3 text-white shadow-sm shadow-slate-950/10">
              {group.completedMatches}/{group.totalMatches} trận
            </span>
            <span
              className="max-w-44 truncate font-mono text-[13px] font-black text-slate-700 tabular-nums"
              title={group.nextMatchAt ? formatVietnamTime(group.nextMatchAt) : "Đã đủ kết quả"}
            >
              {group.nextMatchAt ? formatVietnamTime(group.nextMatchAt) : "Đã đủ kết quả"}
            </span>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
          <div
            className={`h-full rounded-full ${accent.dot}`}
            style={{ width: `${completion}%` }}
          />
        </div>
      </header>

      <GroupTable group={group} compact />
      <div className="hidden sm:block">
        <GroupTable group={group} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-2.5 text-xs font-bold text-slate-700">
        <span className="inline-flex items-center gap-1">
          <CircleEqual size={14} />
          Thắng 3 điểm, hòa 1 điểm
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-800">
          <ListChecks size={14} />
          Top 2 đi tiếp
        </span>
      </footer>
    </article>
  );
}

function GroupTable({
  group,
  compact = false,
}: {
  group: GroupStanding;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "sm:hidden" : "hidden sm:block"}>
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className={compact ? "w-[45%]" : "w-[45%]"} />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[10%]" />
          <col className="w-[13%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-950 text-[11px] font-black text-white sm:text-xs">
            <th scope="col" className={compact ? "px-2 py-3" : "px-3 py-3"}>
              Đội
            </th>
            <TableHead compact={compact}>Tr</TableHead>
            <TableHead compact={compact}>T</TableHead>
            <TableHead compact={compact}>H</TableHead>
            <TableHead compact={compact}>B</TableHead>
            <TableHead compact={compact}>HS</TableHead>
            <TableHead compact={compact}>Đ</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {group.teams.map((team, teamIndex) => (
            <tr
              key={team.key}
              className={teamIndex < 2 ? "bg-emerald-50" : "bg-white hover:bg-slate-50"}
            >
              <th scope="row" className={compact ? "px-2 py-3" : "px-3 py-2.5"}>
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <span className="w-4 shrink-0 text-center font-mono text-[11px] font-black text-slate-700 tabular-nums sm:w-5 sm:text-xs">
                    {teamIndex + 1}
                  </span>
                  <TeamMark
                    name={team.name}
                    code={team.code}
                    crest={team.crest}
                    size={compact ? "xs" : "sm"}
                  />
                  <span
                    className="min-w-0 truncate text-[13px] font-black leading-4 text-slate-950 sm:text-[15px]"
                    title={team.name}
                  >
                    {team.name}
                  </span>
                </div>
              </th>
              <TableNumber compact={compact}>{team.played}</TableNumber>
              <TableNumber compact={compact} accent="text-emerald-700">
                {team.won}
              </TableNumber>
              <TableNumber compact={compact}>{team.drawn}</TableNumber>
              <TableNumber compact={compact} accent="text-rose-700">
                {team.lost}
              </TableNumber>
              <TableNumber compact={compact}>
                {formatGoalDifference(team.goalDifference)}
              </TableNumber>
              <td className={compact ? "px-1 py-3 text-center" : "px-2 py-2.5 text-center"}>
                <span className="inline-flex min-w-7 justify-center rounded-md bg-slate-950 px-1.5 py-1 font-mono text-sm font-black text-white tabular-nums sm:min-w-8 sm:rounded-lg sm:px-2 sm:text-[15px]">
                  {team.points}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHead({
  children,
  compact,
}: {
  children: ReactNode;
  compact: boolean;
}) {
  return (
    <th scope="col" className={compact ? "px-0.5 py-3 text-center" : "px-1 py-3 text-center"}>
      {children}
    </th>
  );
}

function TableNumber({
  children,
  accent = "text-slate-700",
  compact = false,
}: {
  children: ReactNode;
  accent?: string;
  compact?: boolean;
}) {
  return (
    <td
      className={`text-center font-mono font-black tabular-nums ${accent} ${
        compact ? "px-0.5 py-3 text-xs" : "px-1 py-2.5 text-sm"
      }`}
    >
      {children}
    </td>
  );
}

function buildKnockoutRounds(matches: TournamentMatch[], now: Date) {
  return knockoutRoundOrder
    .map((round) => {
      const roundMatches = matches
        .filter((match) => match.round === round)
        .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
      const nextMatchAt =
        roundMatches
          .filter((match) => !match.result && match.kickoffAt.getTime() > now.getTime())
          .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())[0]?.kickoffAt ??
        null;

      return {
        round,
        label: ROUND_LABELS[round],
        matches: roundMatches,
        completedMatches: roundMatches.filter((match) => match.result).length,
        totalMatches: roundMatches.length,
        nextMatchAt,
      };
    })
    .filter((round) => round.totalMatches > 0);
}

function buildGroupStandings(matches: GroupMatch[], now: Date) {
  const teams = new Map<string, TeamInfo>();
  const adjacency = new Map<string, Set<string>>();

  for (const match of matches) {
    const teamA = upsertTeam(teams, {
      name: match.teamA,
      code: match.teamACode,
      crest: match.teamACrest,
      kickoffAt: match.kickoffAt,
    });
    const teamB = upsertTeam(teams, {
      name: match.teamB,
      code: match.teamBCode,
      crest: match.teamBCrest,
      kickoffAt: match.kickoffAt,
    });

    addEdge(adjacency, teamA.key, teamB.key);
  }

  const components = connectedComponents([...teams.keys()], adjacency).sort(
    (a, b) => earliestKickoffFor(a, teams) - earliestKickoffFor(b, teams),
  );

  return components.map((teamKeys, index) => {
    const keySet = new Set(teamKeys);
    const groupMatches = matches.filter(
      (match) => keySet.has(teamKey(match.teamA)) && keySet.has(teamKey(match.teamB)),
    );
    const standings = createBlankStandings(teamKeys, teams);

    for (const match of groupMatches) {
      if (!match.result) continue;

      const teamA = standings.get(teamKey(match.teamA));
      const teamB = standings.get(teamKey(match.teamB));
      if (!teamA || !teamB) continue;

      applyResult(teamA, teamB, match.result.teamAScore, match.result.teamBScore);
    }

    const sortedTeams = [...standings.values()].sort(compareStandings);
    const label = `Bảng ${String.fromCharCode(65 + index)}`;
    const nextMatchAt =
      groupMatches
        .filter((match) => !match.result && match.kickoffAt.getTime() > now.getTime())
        .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())[0]?.kickoffAt ??
      null;

    return {
      id: `group-${String.fromCharCode(97 + index)}`,
      label,
      teams: sortedTeams,
      completedMatches: groupMatches.filter((match) => match.result).length,
      totalMatches: groupMatches.length,
      nextMatchAt,
    };
  });
}

function chooseCurrentRound(matches: TournamentMatch[], now: Date) {
  const ordered = [...matches].sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
  const openRound = ordered.find(
    (match) => match.status === MatchStatus.OPEN && !match.result,
  )?.round;
  if (openRound) return openRound;

  const liveOrLockedRound = ordered.find(
    (match) => !match.result && match.kickoffAt.getTime() <= now.getTime(),
  )?.round;
  if (liveOrLockedRound) return liveOrLockedRound;

  const upcomingRound = ordered.find(
    (match) => !match.result && match.kickoffAt.getTime() > now.getTime(),
  )?.round;
  if (upcomingRound) return upcomingRound;

  return ordered.reverse().find((match) => match.result)?.round ?? null;
}

function getAdvancedSide(match: TournamentMatch) {
  if (match.result?.advancedTeam) return match.result.advancedTeam;
  if (!match.result || match.round === RoundType.GROUP) return null;
  if (match.result.teamAFinalScore > match.result.teamBFinalScore) {
    return TeamSide.TEAM_A;
  }
  if (match.result.teamAFinalScore < match.result.teamBFinalScore) {
    return TeamSide.TEAM_B;
  }
  return null;
}

function getKnockoutStatus(match: TournamentMatch, now: Date) {
  if (match.result || match.status === MatchStatus.SETTLED) {
    return {
      label: "Đã xong",
      className: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    };
  }
  if (match.status === MatchStatus.DRAFT) {
    return {
      label: "Sắp mở",
      className: "bg-sky-50 text-sky-800 ring-sky-100",
    };
  }
  if (match.kickoffAt.getTime() <= now.getTime()) {
    return {
      label: "Đã khóa",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    };
  }
  return {
    label: match.status === MatchStatus.OPEN ? "Đang mở" : "Sắp đá",
    className: "bg-amber-50 text-amber-900 ring-amber-100",
  };
}

function upsertTeam(
  teams: Map<string, TeamInfo>,
  input: {
    name: string;
    code: string | null;
    crest: string | null;
    kickoffAt: Date;
  },
) {
  const key = teamKey(input.name);
  const existing = teams.get(key);

  if (!existing) {
    const team = {
      key,
      name: input.name,
      code: input.code,
      crest: input.crest,
      earliestKickoffAt: input.kickoffAt,
    };
    teams.set(key, team);
    return team;
  }

  const updated = {
    ...existing,
    name: existing.name || input.name,
    code: existing.code ?? input.code,
    crest: existing.crest ?? input.crest,
    earliestKickoffAt:
      input.kickoffAt.getTime() < existing.earliestKickoffAt.getTime()
        ? input.kickoffAt
        : existing.earliestKickoffAt,
  };
  teams.set(key, updated);
  return updated;
}

function addEdge(adjacency: Map<string, Set<string>>, from: string, to: string) {
  if (!adjacency.has(from)) adjacency.set(from, new Set());
  if (!adjacency.has(to)) adjacency.set(to, new Set());
  adjacency.get(from)?.add(to);
  adjacency.get(to)?.add(from);
}

function connectedComponents(
  teamKeys: string[],
  adjacency: Map<string, Set<string>>,
) {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const key of teamKeys) {
    if (visited.has(key)) continue;

    const component: string[] = [];
    const stack = [key];
    visited.add(key);

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;

      component.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        stack.push(next);
      }
    }

    components.push(component);
  }

  return components;
}

function createBlankStandings(
  teamKeys: string[],
  teams: Map<string, TeamInfo>,
) {
  const standings = new Map<string, TeamStanding>();

  for (const key of teamKeys) {
    const team = teams.get(key);
    if (!team) continue;

    standings.set(key, {
      ...team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  }

  return standings;
}

function applyResult(
  teamA: TeamStanding,
  teamB: TeamStanding,
  teamAScore: number,
  teamBScore: number,
) {
  teamA.played += 1;
  teamB.played += 1;
  teamA.goalsFor += teamAScore;
  teamA.goalsAgainst += teamBScore;
  teamB.goalsFor += teamBScore;
  teamB.goalsAgainst += teamAScore;
  teamA.goalDifference = teamA.goalsFor - teamA.goalsAgainst;
  teamB.goalDifference = teamB.goalsFor - teamB.goalsAgainst;

  if (teamAScore > teamBScore) {
    teamA.won += 1;
    teamB.lost += 1;
    teamA.points += 3;
    teamA.form.push("W");
    teamB.form.push("L");
    return;
  }

  if (teamAScore < teamBScore) {
    teamB.won += 1;
    teamA.lost += 1;
    teamB.points += 3;
    teamB.form.push("W");
    teamA.form.push("L");
    return;
  }

  teamA.drawn += 1;
  teamB.drawn += 1;
  teamA.points += 1;
  teamB.points += 1;
  teamA.form.push("D");
  teamB.form.push("D");
}

function compareStandings(a: TeamStanding, b: TeamStanding) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.name.localeCompare(b.name, "vi")
  );
}

function earliestKickoffFor(teamKeys: string[], teams: Map<string, TeamInfo>) {
  return Math.min(
    ...teamKeys.map((key) => teams.get(key)?.earliestKickoffAt.getTime() ?? Infinity),
  );
}

function formatGoalDifference(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatVietnamTimeCompact(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function isPlaceholderName(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
  return normalized === "tbd" || normalized.startsWith("chua xac dinh");
}

function teamKey(name: string) {
  return name.trim().toLocaleLowerCase("vi");
}
