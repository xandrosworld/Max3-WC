export type LeaderboardMediaMode = "prediction" | "contribution";

export const PREDICTION_TOP_WINNER_VIDEO_MP4 =
  "https://media.tenor.com/DtxBiq6VNtcAAAPo/football-world-cup.mp4";
export const PREDICTION_TOP_WINNER_POSTER_URL =
  "https://media.tenor.com/DtxBiq6VNtcAAAAe/football-world-cup.png";

export const CONTRIBUTION_TOP_WINNER_VIDEO_MP4 =
  "https://media.tenor.com/2H42_qGj3pAAAAPo/thanksgiving.mp4";
export const CONTRIBUTION_TOP_WINNER_POSTER_URL =
  "https://media.tenor.com/2H42_qGj3pAAAAAe/thanksgiving.png";

export function getTopWinnerMedia(mode: LeaderboardMediaMode) {
  return mode === "contribution"
    ? {
        poster: CONTRIBUTION_TOP_WINNER_POSTER_URL,
        video: CONTRIBUTION_TOP_WINNER_VIDEO_MP4,
      }
    : {
        poster: PREDICTION_TOP_WINNER_POSTER_URL,
        video: PREDICTION_TOP_WINNER_VIDEO_MP4,
      };
}
