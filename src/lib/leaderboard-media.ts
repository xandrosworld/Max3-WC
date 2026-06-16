export type LeaderboardMediaMode = "prediction" | "contribution";

export const PREDICTION_TOP_WINNER_GIF_URL =
  "https://media.tenor.com/DtxBiq6VNtcAAAAe/football-world-cup.png";

export const CONTRIBUTION_TOP_WINNER_GIF_URL =
  "https://media.tenor.com/2H42_qGj3pAAAAAe/thanksgiving.png";

export function getTopWinnerMedia(mode: LeaderboardMediaMode) {
  return mode === "contribution"
    ? {
        gif: CONTRIBUTION_TOP_WINNER_GIF_URL,
      }
    : {
        gif: PREDICTION_TOP_WINNER_GIF_URL,
      };
}
