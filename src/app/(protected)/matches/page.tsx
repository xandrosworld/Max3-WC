import { MatchStatus, VoteChoice } from "@prisma/client";
import { voteAction } from "@/app/actions";
import {
  choiceLabel,
  formatCurrency,
  formatHandicap,
  formatVietnamTime,
  isVoteLocked,
  ROUND_LABELS,
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const user = await requireUser();
  const matches = await prisma.match.findMany({
    where: {
      deletedAt: null,
      status: { in: [MatchStatus.OPEN, MatchStatus.CLOSED, MatchStatus.SETTLED] },
    },
    orderBy: { kickoffAt: "asc" },
    include: {
      result: true,
      votes: { include: { user: true }, orderBy: { user: { name: "asc" } } },
    },
  });

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Trận đang mở dự đoán
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-emerald-950">Chọn một trong ba cửa</h1>
        </div>
        <div className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <b>Hòa-sau-chấp</b>: sau khi trừ số bàn chấp khỏi đội bị chấp, nếu hai đội
          bằng bàn thì cửa Hòa-sau-chấp thắng.
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {matches.map((match) => {
          const locked = isVoteLocked(match);
          const myVote = match.votes.find((vote) => vote.userId === user.id);
          return (
            <article
              key={match.id}
              className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5"
            >
              <div className="flex items-center justify-between gap-3 bg-emerald-950 px-5 py-3 text-white">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-200">
                    {ROUND_LABELS[match.round]}
                  </span>
                  <p className="text-sm font-semibold">{formatVietnamTime(match.kickoffAt)} · giờ Việt Nam</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${locked ? "bg-slate-600" : "bg-emerald-500"}`}>
                  {locked ? "ĐÃ KHÓA CHỌN" : "ĐƯỢC CHỌN"}
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                  <h2 className="text-xl font-extrabold text-emerald-950">{match.teamA}</h2>
                  <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800">
                    VS
                  </span>
                  <h2 className="text-xl font-extrabold text-emerald-950">{match.teamB}</h2>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-semibold">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
                    {formatHandicap(match)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    Mức đóng góp {formatCurrency(match.contributionAmount)}
                  </span>
                </div>
                {match.result && (
                  <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-900">
                    Tỷ số 90&apos;: {match.teamA} {match.result.teamAScore}-{match.result.teamBScore} {match.teamB}
                    {" · "}Cửa thắng: {choiceLabel(match.result.winningChoice, match.teamA, match.teamB)}
                  </p>
                )}
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[VoteChoice.TEAM_A, VoteChoice.DRAW, VoteChoice.TEAM_B].map((choice) => {
                    const voters = match.votes.filter((vote) => vote.choice === choice);
                    const selected = myVote?.choice === choice;
                    return (
                      <div
                        key={choice}
                        className={`rounded-2xl border p-3 ${selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                      >
                        <form action={voteAction}>
                          <input type="hidden" name="matchId" value={match.id} />
                          <input type="hidden" name="choice" value={choice} />
                          <button
                            disabled={locked}
                            className={`w-full rounded-xl px-2 py-2 text-sm font-bold ${selected ? "bg-emerald-700 text-white" : "bg-white text-emerald-950 hover:bg-emerald-100"} disabled:cursor-not-allowed disabled:opacity-70`}
                          >
                            {choiceLabel(choice, match.teamA, match.teamB)}
                          </button>
                        </form>
                        <p className="mt-2 text-center text-xs font-bold text-slate-500">
                          {voters.length} người đã chọn
                        </p>
                        <p className="mt-1 min-h-8 text-center text-xs leading-5 text-slate-500">
                          {voters.map((vote) => vote.user.name).join(", ") || "Chưa có ai"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {matches.length === 0 && (
        <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-white p-12 text-center text-slate-500">
          Chưa có trận nào đang mở dự đoán.
        </div>
      )}
    </div>
  );
}
