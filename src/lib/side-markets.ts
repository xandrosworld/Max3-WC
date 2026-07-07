import {
  LossTransactionType,
  MatchStatus,
  Prisma,
  RoundType,
  SideMarketPickOutcome,
  SideMarketPickPhase,
  SideMarketType,
  TeamSide,
} from "@prisma/client";
import {
  clampContributionBalance,
  formatCurrency,
  formatVietnamTime,
  MAX_CONTRIBUTION_BALANCE,
} from "./domain";
import { prisma } from "./prisma";

export const CHAMPION_MARKET_SLUG = "world-cup-2026-champion";
export const TOP_SCORER_MARKET_SLUG = "world-cup-2026-top-scorer";

const SIDE_MARKET_SETTLEMENT_REVISION = 1;
const ESTIMATED_KNOCKOUT_END_MINUTES = 150;

type SideMarketDb = Prisma.TransactionClient | typeof prisma;

type ChampionOptionDefinition = {
  slug: string;
  label: string;
  reward: number;
  teamNames: string[];
};

type TopScorerOptionDefinition = {
  slug: string;
  label: string;
  rewardQuarterFinal: number;
  rewardSemiFinal: number;
};

export const CHAMPION_OPTIONS: ChampionOptionDefinition[] = [
  { slug: "france", label: "Pháp", reward: 100_000, teamNames: ["France"] },
  { slug: "morocco", label: "Ma Rốc", reward: 350_000, teamNames: ["Morocco"] },
  { slug: "norway", label: "Na Uy", reward: 350_000, teamNames: ["Norway"] },
  { slug: "argentina", label: "Argentina", reward: 150_000, teamNames: ["Argentina"] },
  { slug: "england", label: "Anh", reward: 200_000, teamNames: ["England"] },
  { slug: "spain", label: "Tây Ban Nha", reward: 200_000, teamNames: ["Spain"] },
  {
    slug: "colombia-switzerland",
    label: "Colombia / Switzerland",
    reward: 350_000,
    teamNames: ["Colombia", "Switzerland"],
  },
  { slug: "belgium", label: "Bỉ", reward: 350_000, teamNames: ["Belgium"] },
];

export const TOP_SCORER_OPTIONS: TopScorerOptionDefinition[] = [
  { slug: "mbappe", label: "Mbappe", rewardQuarterFinal: 200_000, rewardSemiFinal: 100_000 },
  { slug: "messi", label: "Messi", rewardQuarterFinal: 200_000, rewardSemiFinal: 100_000 },
  { slug: "haaland", label: "Haaland", rewardQuarterFinal: 300_000, rewardSemiFinal: 200_000 },
  { slug: "kane", label: "Kane", rewardQuarterFinal: 300_000, rewardSemiFinal: 200_000 },
  { slug: "other", label: "Khác", rewardQuarterFinal: 500_000, rewardSemiFinal: 300_000 },
];

export type SideMarketOptionCard = {
  slug: string;
  label: string;
  rewardAmount: number;
  rewardLabel: string;
  lossAmount: number;
  lossLabel: string;
  detail: string;
};

export type SideMarketPickCard = {
  optionLabel: string;
  phaseLabel: string;
  rewardLabel: string;
  lossLabel: string;
  outcome: SideMarketPickOutcome;
  createdAtLabel: string;
};

export type SideMarketCard = {
  slug: string;
  type: SideMarketType;
  title: string;
  eyebrow: string;
  description: string;
  statusLabel: string;
  isOpen: boolean;
  isSettled: boolean;
  openAtLabel: string | null;
  closeAtLabel: string | null;
  phase: SideMarketPickPhase | null;
  phaseLabel: string | null;
  pick: SideMarketPickCard | null;
  options: SideMarketOptionCard[];
};

export type SideMarketAdminState = {
  cards: SideMarketCard[];
  topScorerOptions: Array<{ slug: string; label: string }>;
  pendingTopScorerPicks: number;
};

type SideMarketAvailability = {
  isOpen: boolean;
  statusLabel: string;
  phase: SideMarketPickPhase | null;
  phaseLabel: string | null;
  openAt: Date | null;
  closeAt: Date | null;
};

type TournamentMilestones = {
  championOpenAt: Date | null;
  championCloseAt: Date | null;
  topScorerOpenAt: Date | null;
  topScorerSemiStartAt: Date | null;
  topScorerCloseAt: Date | null;
};

export async function ensureSideMarkets(db: SideMarketDb = prisma) {
  const existing = await db.sideMarket.findMany({
    where: { slug: { in: [CHAMPION_MARKET_SLUG, TOP_SCORER_MARKET_SLUG] } },
    include: { options: true },
  });

  if (!needsChampionSeed(existing) && !needsTopScorerSeed(existing)) return;

  if (needsChampionSeed(existing)) {
    const market = await db.sideMarket.upsert({
      where: { slug: CHAMPION_MARKET_SLUG },
      create: {
        slug: CHAMPION_MARKET_SLUG,
        type: SideMarketType.CHAMPION,
        title: "Dự đoán đội vô địch",
        description: "Chọn một đội bạn tin sẽ lên ngôi. Chọn xong là chốt, không đổi.",
      },
      update: {
        type: SideMarketType.CHAMPION,
        title: "Dự đoán đội vô địch",
        description: "Chọn một đội bạn tin sẽ lên ngôi. Chọn xong là chốt, không đổi.",
        isActive: true,
      },
    });

    await Promise.all(
      CHAMPION_OPTIONS.map((option, index) =>
        db.sideMarketOption.upsert({
          where: {
            marketId_slug: { marketId: market.id, slug: option.slug },
          },
          create: {
            marketId: market.id,
            slug: option.slug,
            label: option.label,
            rewardChampion: option.reward,
            lossAmount: 200_000,
            sortOrder: index,
            metadata: { teamNames: option.teamNames },
          },
          update: {
            label: option.label,
            rewardChampion: option.reward,
            lossAmount: 200_000,
            sortOrder: index,
            metadata: { teamNames: option.teamNames },
            isActive: true,
          },
        }),
      ),
    );
  }

  if (needsTopScorerSeed(existing)) {
    const market = await db.sideMarket.upsert({
      where: { slug: TOP_SCORER_MARKET_SLUG },
      create: {
        slug: TOP_SCORER_MARKET_SLUG,
        type: SideMarketType.TOP_SCORER,
        title: "Dự đoán Vua phá lưới",
        description: "Chọn một ứng viên ghi bàn nhiều nhất. Mỗi người chỉ chọn một lần.",
      },
      update: {
        type: SideMarketType.TOP_SCORER,
        title: "Dự đoán Vua phá lưới",
        description: "Chọn một ứng viên ghi bàn nhiều nhất. Mỗi người chỉ chọn một lần.",
        isActive: true,
      },
    });

    await Promise.all(
      TOP_SCORER_OPTIONS.map((option, index) =>
        db.sideMarketOption.upsert({
          where: {
            marketId_slug: { marketId: market.id, slug: option.slug },
          },
          create: {
            marketId: market.id,
            slug: option.slug,
            label: option.label,
            rewardQuarterFinal: option.rewardQuarterFinal,
            rewardSemiFinal: option.rewardSemiFinal,
            lossAmount: null,
            sortOrder: index,
          },
          update: {
            label: option.label,
            rewardQuarterFinal: option.rewardQuarterFinal,
            rewardSemiFinal: option.rewardSemiFinal,
            lossAmount: null,
            sortOrder: index,
            isActive: true,
          },
        }),
      ),
    );
  }
}

export async function getSideMarketCardsForUser(
  userId: string,
  now = new Date(),
): Promise<SideMarketCard[]> {
  await ensureSideMarkets();
  const [markets, milestones] = await Promise.all([
    prisma.sideMarket.findMany({
      where: {
        slug: { in: [CHAMPION_MARKET_SLUG, TOP_SCORER_MARKET_SLUG] },
        isActive: true,
      },
      orderBy: { slug: "asc" },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        picks: {
          where: { userId },
          include: { option: true },
          take: 1,
        },
      },
    }),
    getTournamentMilestones(),
  ]);

  return markets
    .sort((a, b) => marketSortOrder(a.type) - marketSortOrder(b.type))
    .map((market) => buildSideMarketCard(market, milestones, now));
}

export async function getSideMarketAdminState(
  now = new Date(),
): Promise<SideMarketAdminState> {
  await ensureSideMarkets();
  const [cards, topScorerMarket] = await Promise.all([
    getSideMarketCardsForUser("__admin_preview__", now),
    prisma.sideMarket.findUnique({
      where: { slug: TOP_SCORER_MARKET_SLUG },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { slug: true, label: true },
        },
        picks: {
          where: { outcome: SideMarketPickOutcome.PENDING },
          select: { id: true },
        },
      },
    }),
  ]);

  return {
    cards,
    topScorerOptions: topScorerMarket?.options ?? [],
    pendingTopScorerPicks: topScorerMarket?.picks.length ?? 0,
  };
}

export async function placeSideMarketPick(input: {
  userId: string;
  marketSlug: string;
  optionSlug: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    await ensureSideMarkets(tx);
    const market = await tx.sideMarket.findUnique({
      where: { slug: input.marketSlug },
      include: {
        options: { where: { slug: input.optionSlug, isActive: true } },
        picks: { where: { userId: input.userId }, select: { id: true } },
      },
    });
    if (!market || !market.isActive) {
      throw new Error("Kèo này chưa mở.");
    }
    if (market.picks.length > 0) {
      throw new Error("Bạn đã chọn kèo này rồi, không thể đổi lại.");
    }

    const option = market.options[0];
    if (!option) throw new Error("Lựa chọn không hợp lệ.");

    const milestones = await getTournamentMilestones(tx);
    const availability = getSideMarketAvailability(market.type, milestones, now);
    if (!availability.isOpen || !availability.phase) {
      throw new Error("Kèo này đang không trong thời gian chọn.");
    }

    const terms = getSideMarketTerms({
      type: market.type,
      option,
      phase: availability.phase,
    });

    return tx.sideMarketPick.create({
      data: {
        userId: input.userId,
        marketId: market.id,
        optionId: option.id,
        phase: availability.phase,
        stakeLoss: terms.lossAmount,
        rewardAmount: terms.rewardAmount,
      },
      include: { market: true, option: true },
    });
  });
}

export async function settleChampionMarketFromMatches(actorId?: string) {
  await ensureSideMarkets();
  return prisma.$transaction(
    async (tx) => {
      const market = await tx.sideMarket.findUnique({
        where: { slug: CHAMPION_MARKET_SLUG },
        select: { id: true, settledAt: true },
      });
      if (!market) return { settled: 0, skipped: "NO_MARKET" as const };

      const pendingPicks = await tx.sideMarketPick.findMany({
        where: {
          marketId: market.id,
          outcome: SideMarketPickOutcome.PENDING,
        },
        include: { option: true },
      });
      if (pendingPicks.length === 0) {
        return { settled: 0 };
      }

      const knockoutState = await getChampionKnockoutState(tx);
      const userIds = [...new Set(pendingPicks.map((pick) => pick.userId))];
      const balances = await getBalances(tx, userIds);
      let settled = 0;

      for (const pick of pendingPicks) {
        const teamNames = getChampionTeamNames(pick.option);
        const outcome = resolveChampionOptionOutcome({
          teamNames,
          eliminatedTeams: knockoutState.eliminatedTeams,
          championTeam: knockoutState.championTeam,
        });
        if (!outcome) continue;

        const rawAmount =
          outcome === SideMarketPickOutcome.WON
            ? -pick.rewardAmount
            : pick.stakeLoss;
        await settleSideMarketPick(tx, {
          pickId: pick.id,
          userId: pick.userId,
          outcome,
          rawAmount,
          balances,
          note:
            outcome === SideMarketPickOutcome.WON
              ? `Kèo vô địch đúng; giảm đóng góp ${formatCurrency(pick.rewardAmount)}`
              : `Đội vô địch đã bị loại; đóng góp +${formatCurrency(pick.stakeLoss)}`,
        });
        settled += 1;
      }

      if (knockoutState.championTeam && !market.settledAt) {
        await tx.sideMarket.update({
          where: { id: market.id },
          data: { settledAt: new Date() },
        });
      }

      if (settled > 0 && actorId) {
        await tx.auditLog.create({
          data: {
            actorId,
            action: "SIDE_MARKET_CHAMPION_SETTLED",
            entityType: "SideMarket",
            entityId: market.id,
            details: {
              settled,
              championTeam: knockoutState.championTeam ?? "",
            },
          },
        });
      }

      return { settled };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 20_000,
    },
  );
}

export async function settleTopScorerMarket(input: {
  winningOptionSlug: string;
  adminId: string;
}) {
  await ensureSideMarkets();
  return prisma.$transaction(
    async (tx) => {
      const market = await tx.sideMarket.findUnique({
        where: { slug: TOP_SCORER_MARKET_SLUG },
        include: {
          options: true,
          picks: {
            where: { outcome: SideMarketPickOutcome.PENDING },
            include: { option: true },
          },
        },
      });
      if (!market) throw new Error("Chưa có kèo Vua phá lưới.");
      const winningOption = market.options.find(
        (option) => option.slug === input.winningOptionSlug,
      );
      if (!winningOption) throw new Error("Lựa chọn thắng không hợp lệ.");

      const userIds = [...new Set(market.picks.map((pick) => pick.userId))];
      const balances = await getBalances(tx, userIds);
      let settled = 0;

      for (const pick of market.picks) {
        const outcome =
          pick.optionId === winningOption.id
            ? SideMarketPickOutcome.WON
            : SideMarketPickOutcome.LOST;
        const rawAmount =
          outcome === SideMarketPickOutcome.WON
            ? -pick.rewardAmount
            : pick.stakeLoss;
        await settleSideMarketPick(tx, {
          pickId: pick.id,
          userId: pick.userId,
          outcome,
          rawAmount,
          balances,
          note:
            outcome === SideMarketPickOutcome.WON
              ? `Kèo Vua phá lưới đúng; giảm đóng góp ${formatCurrency(pick.rewardAmount)}`
              : `Kèo Vua phá lưới sai; đóng góp +${formatCurrency(pick.stakeLoss)}`,
        });
        settled += 1;
      }

      await tx.sideMarket.update({
        where: { id: market.id },
        data: { settledAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.adminId,
          action: "SIDE_MARKET_TOP_SCORER_SETTLED",
          entityType: "SideMarket",
          entityId: market.id,
          details: {
            winningOption: winningOption.label,
            settled,
          },
        },
      });

      return { settled, winningOption: winningOption.label };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 20_000,
    },
  );
}

export function getSideMarketContributionChange(
  currentBalance: number,
  rawAmount: number,
) {
  const current = clampContributionBalance(currentBalance);
  if (rawAmount > 0) return Math.min(rawAmount, MAX_CONTRIBUTION_BALANCE - current);
  if (rawAmount < 0) {
    const reward = Math.min(Math.abs(rawAmount), current);
    return reward > 0 ? -reward : 0;
  }
  return 0;
}

export function resolveChampionOptionOutcome(input: {
  teamNames: string[];
  eliminatedTeams: Set<string>;
  championTeam: string | null;
}) {
  const teamKeys = input.teamNames.map(normalizeTeamName);
  if (input.championTeam) {
    return teamKeys.includes(normalizeTeamName(input.championTeam))
      ? SideMarketPickOutcome.WON
      : SideMarketPickOutcome.LOST;
  }
  if (teamKeys.length > 0 && teamKeys.every((team) => input.eliminatedTeams.has(team))) {
    return SideMarketPickOutcome.LOST;
  }
  return null;
}

export function getSideMarketAvailability(
  type: SideMarketType,
  milestones: TournamentMilestones,
  now = new Date(),
): SideMarketAvailability {
  if (type === SideMarketType.CHAMPION) {
    return buildAvailability({
      now,
      openAt: milestones.championOpenAt,
      closeAt: milestones.championCloseAt,
      phase: SideMarketPickPhase.CHAMPION,
      phaseLabel: "Vô địch",
    });
  }

  const phase =
    milestones.topScorerSemiStartAt &&
    now.getTime() >= milestones.topScorerSemiStartAt.getTime()
      ? SideMarketPickPhase.SEMI_FINAL
      : SideMarketPickPhase.QUARTER_FINAL;

  return buildAvailability({
    now,
    openAt: milestones.topScorerOpenAt,
    closeAt: milestones.topScorerCloseAt,
    phase,
    phaseLabel: phase === SideMarketPickPhase.SEMI_FINAL ? "Bán kết" : "Tứ kết",
  });
}

async function getTournamentMilestones(
  db: SideMarketDb = prisma,
): Promise<TournamentMilestones> {
  const matches = await db.match.findMany({
    where: {
      deletedAt: null,
      status: { not: MatchStatus.CANCELLED },
      round: {
        in: [
          RoundType.ROUND_OF_16,
          RoundType.QUARTER_FINAL,
          RoundType.SEMI_FINAL,
          RoundType.FINAL,
        ],
      },
    },
    orderBy: { kickoffAt: "asc" },
    select: {
      round: true,
      kickoffAt: true,
      result: { select: { settledAt: true } },
    },
  });

  const byRound = (round: RoundType) => matches.filter((match) => match.round === round);
  const r16 = byRound(RoundType.ROUND_OF_16);
  const qf = byRound(RoundType.QUARTER_FINAL);
  const sf = byRound(RoundType.SEMI_FINAL);
  const final = byRound(RoundType.FINAL);

  const championOpenAt =
    r16.length > 0 && r16.every((match) => match.result)
      ? maxDate(r16.map((match) => match.result!.settledAt))
      : null;
  const championCloseAt = qf[0]?.kickoffAt ?? null;
  const topScorerOpenAt = qf[0]?.kickoffAt ?? championCloseAt;
  const topScorerSemiStartAt = sf[0]?.kickoffAt ?? null;
  const topScorerCloseAt =
    sf.length > 0
      ? maxDate(
          sf.map((match) =>
            match.result?.settledAt
              ? match.result.settledAt
              : addMinutes(match.kickoffAt, ESTIMATED_KNOCKOUT_END_MINUTES),
          ),
        )
      : final[0]?.kickoffAt ?? null;

  return {
    championOpenAt,
    championCloseAt,
    topScorerOpenAt,
    topScorerSemiStartAt,
    topScorerCloseAt,
  };
}

function buildSideMarketCard(
  market: Awaited<ReturnType<typeof prisma.sideMarket.findMany>>[number] & {
    options: Array<{
      slug: string;
      label: string;
      rewardChampion: number | null;
      rewardQuarterFinal: number | null;
      rewardSemiFinal: number | null;
      lossAmount: number | null;
      metadata: Prisma.JsonValue | null;
    }>;
    picks: Array<{
      phase: SideMarketPickPhase;
      stakeLoss: number;
      rewardAmount: number;
      outcome: SideMarketPickOutcome;
      createdAt: Date;
      option: { label: string };
    }>;
  },
  milestones: TournamentMilestones,
  now: Date,
): SideMarketCard {
  const availability = getSideMarketAvailability(market.type, milestones, now);
  const pick = market.picks[0] ?? null;
  const termsPhase = pick?.phase ?? availability.phase ?? fallbackPhase(market.type);

  return {
    slug: market.slug,
    type: market.type,
    title: market.title,
    eyebrow: market.type === SideMarketType.CHAMPION ? "Kèo phụ" : "Kèo vui",
    description: market.description,
    statusLabel: pick ? getPickStatusLabel(pick.outcome) : availability.statusLabel,
    isOpen: availability.isOpen && !pick,
    isSettled: Boolean(market.settledAt),
    openAtLabel: availability.openAt ? formatVietnamTime(availability.openAt) : null,
    closeAtLabel: availability.closeAt ? formatVietnamTime(availability.closeAt) : null,
    phase: availability.phase,
    phaseLabel: availability.phaseLabel,
    pick: pick
      ? {
          optionLabel: pick.option.label,
          phaseLabel: phaseLabel(pick.phase),
          rewardLabel: formatCurrency(pick.rewardAmount),
          lossLabel: formatCurrency(pick.stakeLoss),
          outcome: pick.outcome,
          createdAtLabel: formatVietnamTime(pick.createdAt),
        }
      : null,
    options: market.options.map((option) => {
      const terms = getSideMarketTerms({
        type: market.type,
        option,
        phase: termsPhase,
      });
      return {
        slug: option.slug,
        label: option.label,
        rewardAmount: terms.rewardAmount,
        rewardLabel: formatCurrency(terms.rewardAmount),
        lossAmount: terms.lossAmount,
        lossLabel: formatCurrency(terms.lossAmount),
        detail: optionDetail(market.type, option, termsPhase),
      };
    }),
  };
}

function getSideMarketTerms(input: {
  type: SideMarketType;
  option: {
    rewardChampion: number | null;
    rewardQuarterFinal: number | null;
    rewardSemiFinal: number | null;
    lossAmount: number | null;
  };
  phase: SideMarketPickPhase;
}) {
  if (input.type === SideMarketType.CHAMPION) {
    return {
      rewardAmount: input.option.rewardChampion ?? 0,
      lossAmount: input.option.lossAmount ?? 200_000,
    };
  }

  const rewardAmount =
    input.phase === SideMarketPickPhase.SEMI_FINAL
      ? input.option.rewardSemiFinal
      : input.option.rewardQuarterFinal;
  const lossAmount =
    input.phase === SideMarketPickPhase.SEMI_FINAL ? 250_000 : 150_000;

  return {
    rewardAmount: rewardAmount ?? 0,
    lossAmount,
  };
}

async function getChampionKnockoutState(db: SideMarketDb) {
  const matches = await db.match.findMany({
    where: {
      deletedAt: null,
      round: {
        in: [
          RoundType.ROUND_OF_32,
          RoundType.ROUND_OF_16,
          RoundType.QUARTER_FINAL,
          RoundType.SEMI_FINAL,
          RoundType.FINAL,
        ],
      },
      result: { isNot: null },
    },
    orderBy: { kickoffAt: "asc" },
    select: {
      round: true,
      teamA: true,
      teamB: true,
      result: {
        select: {
          advancedTeam: true,
          teamAFinalScore: true,
          teamBFinalScore: true,
        },
      },
    },
  });

  const eliminatedTeams = new Set<string>();
  let championTeam: string | null = null;

  for (const match of matches) {
    const advancedTeam =
      match.result?.advancedTeam ??
      inferAdvancedTeam(
        match.result?.teamAFinalScore ?? 0,
        match.result?.teamBFinalScore ?? 0,
      );
    if (!advancedTeam) continue;
    const winner = advancedTeam === TeamSide.TEAM_A ? match.teamA : match.teamB;
    const loser = advancedTeam === TeamSide.TEAM_A ? match.teamB : match.teamA;
    eliminatedTeams.add(normalizeTeamName(loser));
    if (match.round === RoundType.FINAL) championTeam = winner;
  }

  return { eliminatedTeams, championTeam };
}

async function settleSideMarketPick(
  tx: Prisma.TransactionClient,
  input: {
    pickId: string;
    userId: string;
    outcome: SideMarketPickOutcome;
    rawAmount: number;
    balances: Map<string, number>;
    note: string;
  },
) {
  const current = input.balances.get(input.userId) ?? 0;
  const amount = getSideMarketContributionChange(current, input.rawAmount);
  input.balances.set(input.userId, clampContributionBalance(current + amount));

  await tx.sideMarketPick.update({
    where: { id: input.pickId },
    data: { outcome: input.outcome, settledAt: new Date() },
  });

  if (amount === 0) return;
  await tx.lossTransaction.create({
    data: {
      userId: input.userId,
      sideMarketPickId: input.pickId,
      amount,
      type: LossTransactionType.LOSS,
      settlementRevision: SIDE_MARKET_SETTLEMENT_REVISION,
      note: input.note,
    },
  });
}

async function getBalances(db: SideMarketDb, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, number>();
  const rows = await db.lossTransaction.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { amount: true },
  });

  return new Map(
    rows.map((row) => [
      row.userId,
      clampContributionBalance(row._sum.amount ?? 0),
    ]),
  );
}

function needsChampionSeed(
  existing: Array<{ slug: string; options: Array<{ slug: string; rewardChampion: number | null; lossAmount: number | null; label: string }> }>,
) {
  const market = existing.find((row) => row.slug === CHAMPION_MARKET_SLUG);
  if (!market) return true;
  return CHAMPION_OPTIONS.some((definition) => {
    const option = market.options.find((row) => row.slug === definition.slug);
    return (
      !option ||
      option.label !== definition.label ||
      option.rewardChampion !== definition.reward ||
      option.lossAmount !== 200_000
    );
  });
}

function needsTopScorerSeed(
  existing: Array<{
    slug: string;
    options: Array<{
      slug: string;
      label: string;
      rewardQuarterFinal: number | null;
      rewardSemiFinal: number | null;
    }>;
  }>,
) {
  const market = existing.find((row) => row.slug === TOP_SCORER_MARKET_SLUG);
  if (!market) return true;
  return TOP_SCORER_OPTIONS.some((definition) => {
    const option = market.options.find((row) => row.slug === definition.slug);
    return (
      !option ||
      option.label !== definition.label ||
      option.rewardQuarterFinal !== definition.rewardQuarterFinal ||
      option.rewardSemiFinal !== definition.rewardSemiFinal
    );
  });
}

function buildAvailability(input: {
  now: Date;
  openAt: Date | null;
  closeAt: Date | null;
  phase: SideMarketPickPhase;
  phaseLabel: string;
}): SideMarketAvailability {
  if (!input.openAt || !input.closeAt) {
    return {
      isOpen: false,
      statusLabel: "Đang chờ lịch đấu đầy đủ",
      phase: input.phase,
      phaseLabel: input.phaseLabel,
      openAt: input.openAt,
      closeAt: input.closeAt,
    };
  }

  if (input.now.getTime() < input.openAt.getTime()) {
    return {
      isOpen: false,
      statusLabel: `Sắp mở lúc ${formatVietnamTime(input.openAt)}`,
      phase: input.phase,
      phaseLabel: input.phaseLabel,
      openAt: input.openAt,
      closeAt: input.closeAt,
    };
  }

  if (input.now.getTime() >= input.closeAt.getTime()) {
    return {
      isOpen: false,
      statusLabel: `Đã đóng lúc ${formatVietnamTime(input.closeAt)}`,
      phase: input.phase,
      phaseLabel: input.phaseLabel,
      openAt: input.openAt,
      closeAt: input.closeAt,
    };
  }

  return {
    isOpen: true,
    statusLabel: `Đang mở đến ${formatVietnamTime(input.closeAt)}`,
    phase: input.phase,
    phaseLabel: input.phaseLabel,
    openAt: input.openAt,
    closeAt: input.closeAt,
  };
}

function getPickStatusLabel(outcome: SideMarketPickOutcome) {
  if (outcome === SideMarketPickOutcome.WON) return "Đã tính: Thắng";
  if (outcome === SideMarketPickOutcome.LOST) return "Đã tính: Thua";
  return "Đã chọn, đang chờ kết quả";
}

function optionDetail(
  type: SideMarketType,
  option: { label: string; metadata: Prisma.JsonValue | null },
  phase: SideMarketPickPhase,
) {
  if (type === SideMarketType.CHAMPION) {
    const teamNames = getChampionTeamNames(option);
    return teamNames.length > 1
      ? `Thắng nếu ${teamNames.join(" hoặc ")} vô địch.`
      : `Thắng nếu ${teamNames[0] ?? option.label} vô địch.`;
  }

  return phase === SideMarketPickPhase.SEMI_FINAL
    ? "Đang ở mốc bán kết: thưởng thấp hơn, thua trừ nhiều hơn."
    : "Đang ở mốc tứ kết: thưởng cao hơn, thua trừ nhẹ hơn.";
}

function getChampionTeamNames(option: { metadata: Prisma.JsonValue | null; label: string }) {
  const metadata = option.metadata;
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    "teamNames" in metadata &&
    Array.isArray((metadata as { teamNames?: unknown }).teamNames)
  ) {
    return (metadata as { teamNames: unknown[] }).teamNames
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());
  }
  return [option.label];
}

function fallbackPhase(type: SideMarketType) {
  return type === SideMarketType.CHAMPION
    ? SideMarketPickPhase.CHAMPION
    : SideMarketPickPhase.QUARTER_FINAL;
}

function phaseLabel(phase: SideMarketPickPhase) {
  if (phase === SideMarketPickPhase.SEMI_FINAL) return "Bán kết";
  if (phase === SideMarketPickPhase.QUARTER_FINAL) return "Tứ kết";
  return "Vô địch";
}

function marketSortOrder(type: SideMarketType) {
  return type === SideMarketType.CHAMPION ? 0 : 1;
}

function inferAdvancedTeam(teamAFinalScore: number, teamBFinalScore: number) {
  if (teamAFinalScore > teamBFinalScore) return TeamSide.TEAM_A;
  if (teamBFinalScore > teamAFinalScore) return TeamSide.TEAM_B;
  return null;
}

function normalizeTeamName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

function maxDate(values: Date[]) {
  return new Date(Math.max(...values.map((value) => value.getTime())));
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}
