import { RoundType } from "@prisma/client";
import {
  CalendarDays,
  CheckCircle2,
  CircleEqual,
  ListChecks,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { TeamMark } from "@/components/team-mark";
import { formatVietnamTime } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type GroupMatch = Awaited<ReturnType<typeof getGroupMatches>>[number];
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

const groupAccents = [
  {
    border: "border-emerald-700",
    dot: "bg-emerald-700",
    surface: "bg-emerald-50",
    text: "text-emerald-800",
    pill: "bg-emerald-700 text-white",
  },
  {
    border: "border-sky-700",
    dot: "bg-sky-700",
    surface: "bg-sky-50",
    text: "text-sky-800",
    pill: "bg-sky-700 text-white",
  },
  {
    border: "border-orange-600",
    dot: "bg-orange-600",
    surface: "bg-orange-50",
    text: "text-orange-800",
    pill: "bg-orange-600 text-white",
  },
  {
    border: "border-violet-700",
    dot: "bg-violet-700",
    surface: "bg-violet-50",
    text: "text-violet-800",
    pill: "bg-violet-700 text-white",
  },
  {
    border: "border-rose-700",
    dot: "bg-rose-700",
    surface: "bg-rose-50",
    text: "text-rose-800",
    pill: "bg-rose-700 text-white",
  },
  {
    border: "border-teal-700",
    dot: "bg-teal-700",
    surface: "bg-teal-50",
    text: "text-teal-800",
    pill: "bg-teal-700 text-white",
  },
];

async function getGroupMatches() {
  return prisma.match.findMany({
    where: {
      deletedAt: null,
      round: RoundType.GROUP,
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
  const matches = await getGroupMatches();
  const groups = buildGroupStandings(matches, now);
  const totalTeams = new Set(
    matches.flatMap((match) => [teamKey(match.teamA), teamKey(match.teamB)]),
  ).size;
  const completedMatches = matches.filter((match) => match.result).length;
  const nextMatch =
    matches
      .filter((match) => !match.result && match.kickoffAt.getTime() > now.getTime())
      .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())[0] ?? null;

  if (matches.length === 0) {
    return (
      <div className="space-y-5">
        <PageHero
          groupCount={0}
          totalTeams={0}
          completedMatches={0}
          totalMatches={0}
          nextMatchAt={null}
        />
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            Bảng đấu
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
            Chưa có dữ liệu vòng bảng
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Khi lịch vòng bảng được nhập, bảng xếp hạng từng bảng sẽ tự hiện ở đây.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHero
        groupCount={groups.length}
        totalTeams={totalTeams}
        completedMatches={completedMatches}
        totalMatches={matches.length}
        nextMatchAt={nextMatch?.kickoffAt ?? null}
      />

      <nav
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-2 sm:shadow-sm sm:shadow-slate-950/5"
        aria-label="Chọn nhanh bảng đấu"
      >
        {groups.map((group, index) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-2 bg-white px-3.5 py-2 text-sm font-black text-slate-950 shadow-sm shadow-slate-950/5 hover:-translate-y-0.5 ${groupAccents[index % groupAccents.length].border}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${groupAccents[index % groupAccents.length].dot}`} />
            {group.label}
          </a>
        ))}
      </nav>

      <section className="grid gap-4 xl:grid-cols-2">
        {groups.map((group, index) => (
          <GroupCard key={group.id} group={group} index={index} />
        ))}
      </section>
    </div>
  );
}

function PageHero({
  groupCount,
  totalTeams,
  completedMatches,
  totalMatches,
  nextMatchAt,
}: {
  groupCount: number;
  totalTeams: number;
  completedMatches: number;
  totalMatches: number;
  nextMatchAt: Date | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm shadow-slate-950/5 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)] lg:items-end">
        <div className="min-w-0 max-w-2xl">
          <span className="inline-flex min-h-8 items-center rounded-lg bg-emerald-50 px-3 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
            World Cup 2026
          </span>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-normal text-slate-950 text-balance sm:text-4xl">
            Bảng đấu
          </h1>
          <p className="mt-2 max-w-xl text-base font-semibold leading-7 text-slate-700">
            Theo dõi thứ hạng từng bảng, tự tính từ các kết quả đã chốt.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HeroStat icon={<Trophy size={18} />} label="Bảng" value={groupCount} />
          <HeroStat icon={<Users size={18} />} label="Đội" value={totalTeams} />
          <HeroStat
            icon={<CheckCircle2 size={18} />}
            label="Đã chốt"
            value={`${completedMatches}/${totalMatches}`}
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
    <div className="flex min-h-[78px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-950">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-800">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-extrabold text-slate-600">
          {label}
        </span>
        <span
          className={`mt-0.5 block font-mono font-black text-slate-950 tabular-nums ${
            compact ? "text-sm leading-5" : "text-2xl"
          }`}
        >
          {value}
        </span>
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
      className={`scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5 ${accent.border}`}
    >
      <header className={`border-b border-slate-200 px-4 py-4 ${accent.surface}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-black ${accent.text}`}>Bảng xếp hạng</p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">
              {group.label}
            </h2>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs font-black">
            <span className={`rounded-lg px-3 py-1 ${accent.pill}`}>
              {group.completedMatches}/{group.totalMatches} trận
            </span>
            <span
              className="max-w-44 truncate text-slate-700"
              title={group.nextMatchAt ? formatVietnamTime(group.nextMatchAt) : "Đã đủ kết quả"}
            >
              {group.nextMatchAt ? formatVietnamTime(group.nextMatchAt) : "Đã đủ kết quả"}
            </span>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
          <div
            className={`h-full rounded-full ${accent.dot}`}
            style={{ width: `${completion}%` }}
          />
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] table-fixed border-collapse text-left text-sm sm:min-w-0">
          <colgroup>
            <col className="w-[45%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-950 text-xs font-black text-white">
              <th scope="col" className="px-3 py-3.5">
                Đội
              </th>
              <th scope="col" className="px-1 py-3.5 text-center">
                Tr
              </th>
              <th scope="col" className="px-1 py-3.5 text-center">
                T
              </th>
              <th scope="col" className="px-1 py-3.5 text-center">
                H
              </th>
              <th scope="col" className="px-1 py-3.5 text-center">
                B
              </th>
              <th scope="col" className="px-1 py-3.5 text-center">
                HS
              </th>
              <th scope="col" className="px-2 py-3.5 text-center">
                Đ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {group.teams.map((team, teamIndex) => (
              <tr
                key={team.key}
                className={teamIndex < 2 ? "bg-emerald-50" : "bg-white hover:bg-slate-50"}
              >
                <th scope="row" className="px-3 py-3.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-center font-mono text-xs font-black text-slate-700 tabular-nums">
                      {teamIndex + 1}
                    </span>
                    <TeamMark
                      name={team.name}
                      code={team.code}
                      crest={team.crest}
                      size="sm"
                    />
                    <span
                      className="min-w-0 truncate text-[15px] font-black text-slate-950"
                      title={team.name}
                    >
                      {team.name}
                    </span>
                  </div>
                </th>
                <TableNumber>{team.played}</TableNumber>
                <TableNumber accent="text-emerald-700">{team.won}</TableNumber>
                <TableNumber>{team.drawn}</TableNumber>
                <TableNumber accent="text-rose-700">{team.lost}</TableNumber>
                <TableNumber>{formatGoalDifference(team.goalDifference)}</TableNumber>
                <td className="px-2 py-3.5 text-center">
                  <span className="inline-flex min-w-8 justify-center rounded-lg bg-slate-950 px-2 py-1 font-mono text-base font-black text-white tabular-nums">
                    {team.points}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-700">
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

function TableNumber({
  children,
  accent = "text-slate-700",
}: {
  children: ReactNode;
  accent?: string;
}) {
  return (
    <td className={`px-1 py-3.5 text-center font-mono text-sm font-extrabold tabular-nums ${accent}`}>
      {children}
    </td>
  );
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

function teamKey(name: string) {
  return name.trim().toLocaleLowerCase("vi");
}
