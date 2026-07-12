"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveVoteInstantAction } from "@/app/actions";

type VoteChoice = "TEAM_A" | "DRAW" | "TEAM_B";

export function MatchVoteForm({
  matchId,
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
  const router = useRouter();
  const [choice, setChoice] = useState<VoteChoice | null>(selectedChoice);
  const [hopeStar, setHopeStar] = useState(selectedHopeStar);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    selectedChoice ? "saved" : "idle",
  );
  const latestRef = useRef({ choice: selectedChoice, hopeStar: selectedHopeStar });
  const persistedRef = useRef({ choice: selectedChoice, hopeStar: selectedHopeStar });
  const savingRef = useRef(false);

  async function flushLatestVote() {
    if (savingRef.current || !latestRef.current.choice) return;
    savingRef.current = true;
    setSaveState("saving");

    try {
      while (latestRef.current.choice) {
        const snapshot = { ...latestRef.current };
        const result = await saveVoteInstantAction({
          matchId,
          choice: snapshot.choice,
          hopeStar: snapshot.hopeStar,
        });
        persistedRef.current = {
          choice: result.choice,
          hopeStar: result.hopeStar,
        };

        if (
          latestRef.current.choice === persistedRef.current.choice &&
          latestRef.current.hopeStar === persistedRef.current.hopeStar
        ) {
          break;
        }
      }

      setSaveState("saved");
      router.refresh();
    } catch {
      setSaveState("error");
    } finally {
      savingRef.current = false;
    }
  }

  function saveNext(nextChoice: VoteChoice | null, nextHopeStar: boolean) {
    latestRef.current = { choice: nextChoice, hopeStar: nextHopeStar };
    setChoice(nextChoice);
    setHopeStar(nextHopeStar);

    if (
      nextChoice === persistedRef.current.choice &&
      nextHopeStar === persistedRef.current.hopeStar
    ) {
      setSaveState(nextChoice ? "saved" : "idle");
      return;
    }

    void flushLatestVote();
  }

  return (
    <div className="space-y-4">
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
        {choices.map((option) => {
          const selected = choice === option;
          return (
            <label key={option} className="block">
              <input
                type="radio"
                name="choice"
                value={option}
                required
                checked={selected}
                onChange={() => saveNext(option, hopeStar)}
                className="peer sr-only"
              />
              <span className="flex min-h-20 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/60 peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-200">
                <span className="text-sm font-extrabold text-[#082d24]">
                  {choiceLabel(option, teamA, teamB)}
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
          checked={hopeStar}
          disabled={!hopeStarAllowed}
          onChange={(event) => saveNext(choice, event.currentTarget.checked)}
          className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
        />
        <Sparkles size={17} aria-hidden="true" />
        <span className="font-bold">
          {hopeStarAllowed ? "Bật Ngôi sao hy vọng" : "Ngôi sao mở từ vòng 16"}
        </span>
      </label>

      <VoteSaveState state={saveState} />
    </div>
  );
}

function VoteSaveState({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;

  return (
    <p
      aria-live="polite"
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ${
        state === "error"
          ? "bg-red-50 text-red-700 ring-1 ring-red-100"
          : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
      }`}
    >
      {state === "saving" ? (
        <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />
      ) : state === "error" ? (
        <TriangleAlert size={14} aria-hidden="true" />
      ) : (
        <CheckCircle2 size={14} aria-hidden="true" />
      )}
      {state === "saving"
        ? "Đang lưu..."
        : state === "error"
          ? "Chưa lưu được, hãy chọn lại"
          : "Đã lưu"}
    </p>
  );
}

function choiceLabel(choice: VoteChoice, teamA: string, teamB: string) {
  if (choice === "TEAM_A") return teamA;
  if (choice === "TEAM_B") return teamB;
  return "Hòa-sau-chấp";
}
