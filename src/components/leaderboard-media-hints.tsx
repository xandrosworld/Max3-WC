"use client";

import ReactDOM from "react-dom";
import { getTopWinnerMedia, type LeaderboardMediaMode } from "@/lib/leaderboard-media";

export function LeaderboardMediaHints({
  activeBoard,
}: {
  activeBoard: LeaderboardMediaMode;
}) {
  const media = getTopWinnerMedia(activeBoard);

  ReactDOM.prefetchDNS("https://media.tenor.com");
  ReactDOM.preconnect("https://media.tenor.com", { crossOrigin: "anonymous" });
  ReactDOM.preload(media.gif, {
    as: "image",
    fetchPriority: "high",
  });

  return null;
}
