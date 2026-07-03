import { Prisma } from "@prisma/client";
import { getContributionAmount, isPlaceholderTeamName } from "./domain";
import {
  fetchFootballDataWorldCupFixtures,
  FOOTBALL_DATA_SOURCE,
  type FootballDataFixture,
} from "./football-data";
import { prisma } from "./prisma";

type ExistingMatch = Awaited<ReturnType<typeof getExistingMatches>>[number];

export type FixtureSyncSummary = {
  checked: number;
  created: number;
  updated: number;
  protectedMatches: number;
  skippedRounds: string[];
  skippedReason?: string;
};

function externalMatchKey(source: string, fixtureId: string) {
  return `${source}|${fixtureId}`;
}

function scheduledMatchKey(input: {
  teamA: string;
  teamB: string;
  kickoffAt: Date;
}) {
  return [
    input.teamA.trim().toLowerCase(),
    input.teamB.trim().toLowerCase(),
    input.kickoffAt.getTime(),
  ].join("|");
}

async function getExistingMatches() {
  return prisma.match.findMany({
    where: { deletedAt: null },
    include: { result: true, _count: { select: { votes: true } } },
  });
}

function hasProtectedData(match: ExistingMatch) {
  return match._count.votes > 0 || Boolean(match.result);
}

function buildProtectedUpdateData(
  existing: ExistingMatch,
  fixture: FootballDataFixture,
  syncedAt: Date,
) {
  const data: Prisma.MatchUpdateInput = {
    externalSource: fixture.externalSource,
    externalFixtureId: fixture.externalFixtureId,
    teamACode: fixture.teamACode,
    teamBCode: fixture.teamBCode,
    teamACrest: fixture.teamACrest,
    teamBCrest: fixture.teamBCrest,
    lastSyncedAt: syncedAt,
  };

  if (isPlaceholderTeamName(existing.teamA) && !isPlaceholderTeamName(fixture.teamA)) {
    data.teamA = fixture.teamA;
  }
  if (isPlaceholderTeamName(existing.teamB) && !isPlaceholderTeamName(fixture.teamB)) {
    data.teamB = fixture.teamB;
  }

  return data;
}

export async function syncWorldCupFixturesFromFootballData(options?: {
  apiToken?: string;
  fetcher?: typeof fetch;
  auditActorId?: string | null;
}): Promise<FixtureSyncSummary> {
  const apiToken = options?.apiToken ?? process.env.FOOTBALL_DATA_TOKEN ?? "";
  if (!apiToken.trim()) {
    return {
      checked: 0,
      created: 0,
      updated: 0,
      protectedMatches: 0,
      skippedRounds: [],
      skippedReason: "NO_API_TOKEN",
    };
  }

  const fetched = await fetchFootballDataWorldCupFixtures(
    apiToken,
    options?.fetcher,
  );
  const existingMatches = await getExistingMatches();
  const byExternalId = new Map(
    existingMatches
      .filter((match) => match.externalSource && match.externalFixtureId)
      .map((match) => [
        externalMatchKey(match.externalSource!, match.externalFixtureId!),
        match,
      ]),
  );
  const bySchedule = new Map(
    existingMatches.map((match) => [scheduledMatchKey(match), match]),
  );

  let created = 0;
  let updated = 0;
  let protectedMatches = 0;
  const syncedAt = new Date();

  const syncJobs = fetched.fixtures.map((fixture) => async () => {
    const externalKey = externalMatchKey(
      fixture.externalSource,
      fixture.externalFixtureId,
    );
    const existing =
      byExternalId.get(externalKey) ?? bySchedule.get(scheduledMatchKey(fixture));

    if (!existing) {
      const createdMatch = await prisma.match.create({
        data: {
          ...fixture,
          contributionAmount: getContributionAmount(fixture.round),
          status: "DRAFT",
          handicap: 0,
          handicappedTeam: null,
          lastSyncedAt: syncedAt,
        },
      });
      created += 1;
      byExternalId.set(externalKey, {
        ...createdMatch,
        result: null,
        _count: { votes: 0 },
      });
      bySchedule.set(scheduledMatchKey(fixture), {
        ...createdMatch,
        result: null,
        _count: { votes: 0 },
      });
      return;
    }

    if (hasProtectedData(existing)) {
      await prisma.match.update({
        where: { id: existing.id },
        data: buildProtectedUpdateData(existing, fixture, syncedAt),
      });
      protectedMatches += 1;
      return;
    }

    await prisma.match.update({
      where: { id: existing.id },
      data: {
        teamA: fixture.teamA,
        teamB: fixture.teamB,
        teamACode: fixture.teamACode,
        teamBCode: fixture.teamBCode,
        teamACrest: fixture.teamACrest,
        teamBCrest: fixture.teamBCrest,
        kickoffAt: fixture.kickoffAt,
        round: fixture.round,
        contributionAmount: getContributionAmount(fixture.round),
        externalSource: fixture.externalSource,
        externalFixtureId: fixture.externalFixtureId,
        lastSyncedAt: syncedAt,
      },
    });
    updated += 1;
  });

  for (let index = 0; index < syncJobs.length; index += 8) {
    await Promise.all(
      syncJobs.slice(index, index + 8).map((runSyncJob) => runSyncJob()),
    );
  }

  if (options?.auditActorId) {
    await prisma.auditLog.create({
      data: {
        actorId: options.auditActorId,
        action: "WORLD_CUP_FIXTURES_SYNCED",
        entityType: "Match",
        entityId: FOOTBALL_DATA_SOURCE,
        details: {
          created,
          updated,
          protectedMatches,
          skippedRounds: fetched.skippedRounds,
        },
      },
    });
  }

  return {
    checked: fetched.fixtures.length,
    created,
    updated,
    protectedMatches,
    skippedRounds: fetched.skippedRounds,
  };
}
