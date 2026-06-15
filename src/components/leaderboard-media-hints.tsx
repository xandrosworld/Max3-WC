"use client";

import ReactDOM from "react-dom";

export const TOP_WINNER_VIDEO_MP4 =
  "https://media.tenor.com/DtxBiq6VNtcAAAPo/football-world-cup.mp4";
export const TOP_WINNER_POSTER_URL =
  "https://media.tenor.com/DtxBiq6VNtcAAAAe/football-world-cup.png";

export function LeaderboardMediaHints() {
  ReactDOM.prefetchDNS("https://media.tenor.com");
  ReactDOM.preconnect("https://media.tenor.com", { crossOrigin: "anonymous" });
  ReactDOM.preload(TOP_WINNER_POSTER_URL, {
    as: "image",
    fetchPriority: "high",
  });
  ReactDOM.preload(TOP_WINNER_VIDEO_MP4, {
    as: "video",
    crossOrigin: "anonymous",
    type: "video/mp4",
  });

  return null;
}
