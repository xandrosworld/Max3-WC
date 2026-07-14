"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import {
  getRouteLoadingPhase,
  ROUTE_LOADING_PHASE_TIMES,
  ROUTE_LOADING_REVEAL_MS,
} from "@/lib/route-loading";

type LoadingTrackStyle = CSSProperties & {
  "--route-loading-ball-position": string;
};

export function RouteLoadingStatus() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const phase = getRouteLoadingPhase(elapsedMs);
  const revealed = elapsedMs >= ROUTE_LOADING_REVEAL_MS;
  const trackStyle: LoadingTrackStyle = {
    "--route-loading-ball-position": phase.ballPosition,
  };

  useEffect(() => {
    const startedAt = performance.now();
    const thresholds = [ROUTE_LOADING_REVEAL_MS, ...ROUTE_LOADING_PHASE_TIMES];
    const timers = thresholds.map((threshold) =>
      window.setTimeout(() => {
        setElapsedMs(Math.max(threshold, performance.now() - startedAt));
      }, threshold),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <section
      className="route-loading-status"
      data-revealed={revealed ? "true" : "false"}
      aria-label="Trạng thái tải trang"
    >
      <div className="route-loading-status-placeholder" aria-hidden="true">
        <div className="route-loading-placeholder-visual route-loading-block" />
        <div className="route-loading-placeholder-copy">
          <div className="route-loading-block h-7 w-3/5 rounded-full bg-slate-200" />
          <div className="route-loading-block mt-3 h-4 w-4/5 rounded-full bg-slate-200" />
          <div className="route-loading-block mt-8 h-12 w-full rounded-2xl bg-slate-200" />
        </div>
      </div>

      <div className="route-loading-status-content">
        <div className="route-loading-illustration" aria-hidden="true">
          <Image
            src="/loading/preparing-pitch.webp"
            alt=""
            width={640}
            height={320}
            sizes="(max-width: 639px) 82vw, 32vw"
            loading="eager"
          />
        </div>

        <div className="route-loading-status-copy">
          <div className="route-loading-status-message" aria-live="polite">
            <p className="route-loading-status-title">{phase.title}</p>
            <p className="route-loading-status-detail">{phase.detail}</p>
          </div>

          <div
            className="route-loading-track"
            style={trackStyle}
            aria-hidden="true"
          >
            <div className="route-loading-track-line" />
            {[0, 1, 2].map((checkpoint) => (
              <span
                key={checkpoint}
                className="route-loading-checkpoint"
                data-active={
                  checkpoint < phase.activeCheckpoints ? "true" : "false"
                }
              >
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="m5.5 10.2 2.8 2.7 6.2-6.1" />
                </svg>
              </span>
            ))}
            <span className="route-loading-moving-ball">
              <Image
                src="/loading/football.webp"
                alt=""
                width={72}
                height={72}
                loading="eager"
              />
            </span>
            <span className="route-loading-goal" />
          </div>
        </div>
      </div>
    </section>
  );
}
