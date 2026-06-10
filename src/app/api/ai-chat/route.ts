import { MatchStatus } from "@prisma/client";
import { z } from "zod";
import { buildWorldCupChatReply } from "@/lib/ai-chat";
import { getLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(request: Request) {
  await requireUser();
  const body = await request.json().catch(() => ({}));
  const parsed = z
    .object({ message: z.string().trim().min(1).max(800) })
    .safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { reply: "Bạn nhập ngắn lại một chút rồi gửi lại nhé." },
      { status: 400 },
    );
  }

  const [matches, leaderboard] = await Promise.all([
    prisma.match.findMany({
      where: { deletedAt: null, status: { not: MatchStatus.CANCELLED } },
      orderBy: { kickoffAt: "asc" },
      take: 130,
      include: {
        result: {
          select: {
            teamAScore: true,
            teamBScore: true,
            winningChoice: true,
          },
        },
        votes: { select: { choice: true, hopeStar: true } },
      },
    }),
    getLeaderboard(),
  ]);

  const reply = buildWorldCupChatReply(parsed.data.message, {
    matches,
    leaderboard: leaderboard.map((row) => ({
      name: row.name,
      loss: row.loss,
      correct: row.correct,
      wrong: row.wrong,
      hopeStarUsed: row.hopeStarUsed,
    })),
    now: new Date(),
  });

  return Response.json({ reply });
}
