"use client";

import { ChangeEvent } from "react";
import { Clock3, Sparkles } from "lucide-react";
import { voteAction } from "@/app/actions";

type VoteChoice = "TEAM_A" | "DRAW" | "TEAM_B";

export function MatchVoteForm({
  matchId,
  returnFilter,
  returnRound,
  returnQ,
  teamA,
  teamB,
  handicapLabel,
  contributionLabel,
  participantLabel,
  timeStatus,
  choices,
  selectedChoice,
  selectedHopeStar,
  hopeStarAllowed,
  hasDrawChoice,
}: {
  matchId: string;
  returnFilter: string;
  returnRound?: string;
  returnQ: string;
  teamA: string;
  teamB: string;
  handicapLabel: string;
  contributionLabel: string;
  participantLabel: string;
  timeStatus: string;
  choices: VoteChoice[];
  selectedChoice: VoteChoice | null;
  selectedHopeStar: boolean;
  hopeStarAllowed: boolean;
  hasDrawChoice: boolean;
}) {
  function submitOnChoice(event: ChangeEvent<HTMLInputElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  function submitOnHopeStar(event: ChangeEvent<HTMLInputElement>) {
    const form = event.currentTarget.form;
    const checkedChoice = form?.querySelector<HTMLInputElement>(
      'input[name="choice"]:checked',
    );
    if (form && checkedChoice) form.requestSubmit();
  }

  return (
    <form action={voteAction} className="space-y-4">
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="returnFilter" value={returnFilter} />
      {returnRound && <input type="hidden" name="returnRound" value={returnRound} />}
      {returnQ && <input type="hidden" name="returnQ" value={returnQ} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900 ring-1 ring-amber-100">
            {handicapLabel}
          </span>
          <span className="rounded-lg bg-white px-2.5 py-1.5 text-slate-600 ring-1 ring-slate-200">
            Đóng góp {contributionLabel}
          </span>
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800 ring-1 ring-emerald-100">
            {participantLabel}
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <Clock3 size={15} aria-hidden="true" />
          {timeStatus}
        </p>
      </div>

      <div
        className={`grid gap-2 ${
          choices.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
        }`}
      >
        {choices.map((choice) => {
          const selected = selectedChoice === choice;
          return (
            <label key={choice} className="block">
              <input
                type="radio"
                name="choice"
                value={choice}
                required
                defaultChecked={selected}
                onChange={submitOnChoice}
                className="peer sr-only"
              />
              <span className="flex min-h-20 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/60 peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-200">
                <span className="text-sm font-extrabold text-[#082d24]">
                  {choiceLabel(choice, teamA, teamB)}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {!hasDrawChoice && (
        <p className="text-xs font-semibold text-slate-600">
          Kèo nửa trái không có cửa Hòa-sau-chấp.
        </p>
      )}

      <label
        className={`flex min-h-11 w-fit items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
          hopeStarAllowed
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-slate-200 bg-slate-100 text-slate-500"
        }`}
      >
        <input
          type="checkbox"
          name="hopeStar"
          value="true"
          defaultChecked={selectedHopeStar}
          disabled={!hopeStarAllowed}
          onChange={submitOnHopeStar}
          className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
        />
        <Sparkles size={17} aria-hidden="true" />
        <span className="font-bold">
          {hopeStarAllowed ? "Bật Ngôi sao hy vọng" : "Ngôi sao mở từ vòng 16"}
        </span>
      </label>
    </form>
  );
}

function choiceLabel(choice: VoteChoice, teamA: string, teamB: string) {
  if (choice === "TEAM_A") return teamA;
  if (choice === "TEAM_B") return teamB;
  return "Hòa-sau-chấp";
}
