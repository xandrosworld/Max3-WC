export type LeaderboardMediaMode = "prediction" | "contribution";

export const PREDICTION_TOP_WINNER_GIF_URL =
  "/leaderboard/top-winner-prediction.gif";

export const CONTRIBUTION_TOP_WINNER_GIF_URL =
  "/leaderboard/top-winner-contribution.gif";

export function getTopWinnerMedia(mode: LeaderboardMediaMode) {
  return mode === "contribution"
    ? {
        gif: CONTRIBUTION_TOP_WINNER_GIF_URL,
      }
    : {
        gif: PREDICTION_TOP_WINNER_GIF_URL,
      };
}
