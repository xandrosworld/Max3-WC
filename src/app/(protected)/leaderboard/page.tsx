import Image from "next/image";
import { Award, Crown, Flame, Medal, Sparkles, Trophy, Zap } from "lucide-react";
import {
  CosmeticAvatar,
  CosmeticTitleBadge,
  cosmeticNameplateClass,
  cosmeticRowFrameClass,
} from "@/components/cosmetic-avatar";
import { AnimationVisibility } from "@/components/animation-visibility";
import { LeaderboardMediaHints } from "@/components/leaderboard-media-hints";
import { formatCurrency } from "@/lib/domain";
import { getLeaderboard } from "@/lib/leaderboard";
import { getTopWinnerMedia } from "@/lib/leaderboard-media";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type LeaderboardRow = Awaited<ReturnType<typeof getLeaderboard>>[number];
type RankedRow = LeaderboardRow & { displayRank: number };
type BoardMode = "prediction" | "contribution";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const params = (await searchParams) ?? {};
  const activeBoard =
    typeof params.board === "string" && params.board === "contribution"
      ? "contribution"
      : "prediction";
  const rows = await getLeaderboard();
  const predictionRows = rows.map((row, index) => ({
    ...row,
    displayRank: index + 1,
  }));
  const contributionRows = [...rows]
    .sort(
      (a, b) =>
        b.loss - a.loss ||
        b.voted - a.voted ||
        a.name.localeCompare(b.name, "vi"),
    )
    .map((row, index) => ({ ...row, displayRank: index + 1 }));

  const totalContribution = rows.reduce((sum, row) => sum + row.loss, 0);
  const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
  const totalVoted = rows.reduce((sum, row) => sum + row.voted, 0);
  const activeSection =
    activeBoard === "prediction"
      ? {
          kicker: "Vua dự đoán",
          title: "Top đoán đúng nhiều nhất",
          description:
            "Xếp theo số trận đúng, sau đó đến độ chính xác và số lần quên chọn.",
          rows: predictionRows,
          mode: "prediction" as const,
        }
      : {
          kicker: "Tiếp sức quỹ",
          title: "Bảng vàng quỹ thưởng",
          description:
            "Vinh danh những người góp Belly nhiều nhất cho quỹ thưởng nội bộ.",
          rows: contributionRows,
          mode: "contribution" as const,
        };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes wcPulse {
          0%, 100% { transform: scale(1); opacity: 0.52; }
          50% { transform: scale(1.16); opacity: 0.16; }
        }
        @keyframes wcRingSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes wcElectricDash {
          to { stroke-dashoffset: -320; }
        }
        @keyframes wcElectricFlicker {
          0%, 100% { opacity: 0.42; }
          8% { opacity: 1; }
          14% { opacity: 0.34; }
          26% { opacity: 0.94; }
          38% { opacity: 0.5; }
          54% { opacity: 1; }
          72% { opacity: 0.38; }
        }
        @keyframes wcElectricJitter {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          22% { transform: translate3d(1px, -1px, 0) scale(1.02); }
          39% { transform: translate3d(-1px, 1px, 0) scale(0.99); }
          61% { transform: translate3d(1px, 1px, 0) scale(1.01); }
          78% { transform: translate3d(-1px, 0, 0) scale(1); }
        }
        @keyframes wcBolt {
          0%, 32%, 100% { opacity: 0; filter: drop-shadow(0 0 0 transparent); transform: translateY(0) rotate(var(--bolt-rotate)) scale(0.9); }
          6%, 10% { opacity: 1; filter: drop-shadow(0 0 10px currentColor); transform: translateY(-1px) rotate(var(--bolt-rotate)) scale(1.08); }
          14% { opacity: 0.42; transform: translateY(1px) rotate(var(--bolt-rotate)) scale(0.96); }
        }
        @keyframes wcStorm {
          0%, 100% { opacity: 0.35; transform: scale(0.98) rotate(0deg); }
          38% { opacity: 0.9; transform: scale(1.08) rotate(7deg); }
          64% { opacity: 0.5; transform: scale(1.02) rotate(-5deg); }
        }
        @keyframes wcBoltStrong {
          0%, 100% { opacity: 0.34; filter: drop-shadow(0 0 7px currentColor); transform: translateY(0) rotate(var(--bolt-rotate)) scale(0.95); }
          9%, 17% { opacity: 1; filter: drop-shadow(0 0 15px currentColor); transform: translateY(-2px) rotate(var(--bolt-rotate)) scale(1.15); }
          29% { opacity: 0.52; transform: translateY(1px) rotate(var(--bolt-rotate)) scale(0.98); }
          48% { opacity: 0.88; filter: drop-shadow(0 0 12px currentColor); }
          70% { opacity: 0.24; }
        }
        @keyframes wcBoltWarm {
          0%, 100% { opacity: 0.18; filter: drop-shadow(0 0 4px currentColor); transform: translateY(0) rotate(var(--bolt-rotate)) scale(0.92); }
          12%, 18% { opacity: 0.9; filter: drop-shadow(0 0 11px currentColor); transform: translateY(-1px) rotate(var(--bolt-rotate)) scale(1.06); }
          38% { opacity: 0.36; }
        }
        @keyframes wcBarSweep {
          0% { transform: translateX(-140%); opacity: 0; }
          35% { opacity: 0.7; }
          100% { transform: translateX(250%); opacity: 0; }
        }
        @keyframes wcBadgePop {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1px) scale(1.04); }
        }
        @keyframes wcTagShine {
          0% { transform: translateX(-145%); opacity: 0; }
          28% { opacity: 0.75; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        @keyframes wcTagPulse {
          0%, 100% { transform: translateY(0); filter: saturate(1); }
          50% { transform: translateY(-1px); filter: saturate(1.18); }
        }
        @keyframes wcShine {
          0% { transform: translateX(-120%); opacity: 0; }
          35% { opacity: 0.32; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        .leaderboard-stage {
          position: relative;
          isolation: isolate;
        }
        .win-streak-badge {
          position: relative;
          overflow: hidden;
          animation: wcTagPulse 3.6s ease-in-out infinite;
        }
        .win-streak-badge::before {
          content: "";
          position: absolute;
          inset: 0;
          width: 42%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.78), transparent);
          transform: translateX(-145%);
          animation: wcTagShine 4.1s ease-in-out infinite;
        }
        .win-streak-badge svg {
          filter: drop-shadow(0 0 5px rgba(255,255,255,0.64));
          animation: wcBadgePop 2.3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .win-streak-badge,
          .win-streak-badge svg,
          .win-streak-badge::before {
            animation: none;
          }
        }
        .leaderboard-stage::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 18% 18%, rgba(16, 185, 129, 0.13), transparent 30%),
            radial-gradient(circle at 85% 0%, rgba(251, 191, 36, 0.18), transparent 26%),
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92));
        }
        .elite-row {
          position: relative;
          --rank-accent: #10b981;
          --rank-glow: rgba(16, 185, 129, 0.18);
        }
        .elite-row:not(.desktop-leaderboard-row)::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 42%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.72), transparent);
          animation: wcShine 4.8s ease-in-out infinite;
          pointer-events: none;
        }
        .elite-row td {
          position: relative;
        }
        .elite-row td:first-child {
          box-shadow: inset 4px 0 0 var(--rank-accent);
        }
        .elite-row td:nth-child(2)::before {
          content: "";
          position: absolute;
          left: 0;
          top: 14%;
          bottom: 14%;
          width: 1px;
          background: linear-gradient(180deg, transparent, var(--rank-accent), transparent);
          opacity: 0.55;
        }
        .elite-card {
          isolation: isolate;
          --rank-accent: #10b981;
          --rank-glow: rgba(16, 185, 129, 0.18);
        }
        .elite-card::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 18% 18%, var(--rank-glow), transparent 42%),
            radial-gradient(circle at 88% 8%, rgba(255,255,255,0.9), transparent 24%);
        }
        .elite-card::after {
          content: "";
          position: absolute;
          left: -45%;
          top: -20%;
          height: 140%;
          width: 36%;
          z-index: -1;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.72), transparent);
          animation: wcShine 5.2s ease-in-out infinite;
        }
        .rank-gold {
          --rank-accent: #8b5cf6;
          --rank-accent-2: #c084fc;
          --rank-glow: rgba(139, 92, 246, 0.34);
          --rank-soft: rgba(250, 245, 255, 0.76);
        }
        .rank-silver {
          --rank-accent: #f97316;
          --rank-accent-2: #ef4444;
          --rank-glow: rgba(249, 115, 22, 0.24);
          --rank-soft: rgba(255, 237, 213, 0.72);
        }
        .rank-bronze {
          --rank-accent: #fb923c;
          --rank-accent-2: #fbbf24;
          --rank-glow: rgba(251, 146, 60, 0.2);
          --rank-soft: rgba(255, 237, 213, 0.76);
        }
        .rank-badge-elite {
          animation: wcBadgePop 3.5s ease-in-out infinite;
          box-shadow: 0 12px 28px var(--rank-glow);
        }
        .rank-badge-elite::after {
          content: "";
          position: absolute;
          inset: -40% -65%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.78), transparent);
          transform: translateX(-120%);
          animation: wcShine 4.1s ease-in-out infinite;
        }
        .rank-tag-elite {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.58);
          box-shadow:
            0 10px 24px var(--rank-glow),
            0 0 0 1px rgba(255, 255, 255, 0.34) inset;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
          animation: wcTagPulse 3.8s ease-in-out infinite;
        }
        .rank-tag-elite::before {
          content: "";
          position: absolute;
          inset: 1px;
          z-index: -1;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.32), transparent 56%);
          pointer-events: none;
        }
        .rank-tag-elite::after {
          content: "";
          position: absolute;
          top: -35%;
          bottom: -35%;
          left: -42%;
          z-index: 0;
          width: 32%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.78), transparent);
          animation: wcTagShine 4.6s ease-in-out infinite;
          pointer-events: none;
        }
        .rank-tag-elite > * {
          position: relative;
          z-index: 1;
        }
        .rank-tag-elite svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.22));
        }
        .rank-tag-elite.rank-gold {
          background: linear-gradient(135deg, #4c1d95 0%, #8b5cf6 38%, #f59e0b 100%) !important;
          color: #fff7ed !important;
          border-color: rgba(251, 191, 36, 0.72);
          box-shadow:
            0 12px 26px rgba(124, 58, 237, 0.24),
            0 0 18px rgba(251, 191, 36, 0.28),
            0 0 0 1px rgba(255, 255, 255, 0.4) inset;
        }
        .rank-tag-elite.rank-silver {
          background: linear-gradient(135deg, #111827 0%, #334155 48%, #f97316 100%) !important;
          color: #ffffff !important;
          border-color: rgba(253, 186, 116, 0.62);
          box-shadow:
            0 12px 24px rgba(15, 23, 42, 0.18),
            0 0 16px rgba(249, 115, 22, 0.22),
            0 0 0 1px rgba(255, 255, 255, 0.36) inset;
        }
        .rank-tag-elite.rank-bronze {
          background: linear-gradient(135deg, #9a3412 0%, #f97316 48%, #fbbf24 100%) !important;
          color: #fff7ed !important;
          border-color: rgba(251, 146, 60, 0.66);
          box-shadow:
            0 12px 24px rgba(194, 65, 12, 0.18),
            0 0 14px rgba(251, 146, 60, 0.24),
            0 0 0 1px rgba(255, 255, 255, 0.34) inset;
        }
        .avatar-shell {
          --rank-accent: #10b981;
          --rank-glow: rgba(16, 185, 129, 0.18);
        }
        .avatar-elite {
          padding: 4px;
        }
        .avatar-ring {
          position: absolute;
          inset: -2px;
          border-radius: 20px;
          background: transparent;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.58),
            0 0 16px var(--rank-glow);
          animation: wcRingSpin 3.8s linear infinite;
          opacity: 0.46;
          filter: blur(0.2px) drop-shadow(0 0 8px var(--rank-glow));
        }
        .rank-gold .avatar-ring {
          inset: -5px;
          border-radius: 26px;
          box-shadow:
            0 0 0 1px rgba(216, 180, 254, 0.48),
            0 0 20px rgba(139, 92, 246, 0.62);
          animation-duration: 3.2s;
          opacity: 0.36;
          filter: blur(0.4px) drop-shadow(0 0 16px rgba(139, 92, 246, 0.72));
        }
        .rank-silver .avatar-ring {
          inset: -3px;
          box-shadow:
            0 0 0 1px rgba(254, 215, 170, 0.52),
            0 0 16px rgba(249, 115, 22, 0.46);
          animation-duration: 3.9s;
          opacity: 0.34;
          filter: blur(0.3px) drop-shadow(0 0 12px rgba(249, 115, 22, 0.52));
        }
        .avatar-lightning-svg {
          position: absolute;
          inset: -12px;
          z-index: 18;
          width: calc(100% + 24px);
          height: calc(100% + 24px);
          overflow: visible;
          color: var(--rank-accent);
          filter: drop-shadow(0 0 10px currentColor);
          animation: wcElectricJitter 0.72s steps(2, end) infinite;
        }
        .electric-base,
        .electric-runner {
          fill: none;
          stroke: currentColor;
          vector-effect: non-scaling-stroke;
        }
        .electric-base {
          stroke-width: 1.5;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          opacity: 0.14;
        }
        .electric-runner {
          stroke-width: 3.4;
          stroke-linecap: round;
          stroke-linejoin: miter;
          stroke-dasharray: 56 264;
          stroke-dashoffset: 0;
          animation:
            wcElectricDash 0.88s linear infinite,
            wcElectricFlicker 0.72s steps(4, end) infinite;
        }
        .electric-runner-hot {
          stroke: rgba(255, 255, 255, 0.92);
          stroke-width: 1;
          stroke-dasharray: 28 292;
          opacity: 0.9;
          animation-duration: 0.58s, 0.48s;
        }
        .electric-runner-secondary {
          stroke: var(--rank-accent-2, currentColor);
          stroke-width: 2.3;
          stroke-dasharray: 38 282;
          opacity: 0.9;
          animation-duration: 1.08s, 0.68s;
          animation-delay: -0.42s;
        }
        .electric-runner-extra {
          display: none;
        }
        .rank-gold .avatar-lightning-svg {
          inset: -15px;
          width: calc(100% + 30px);
          height: calc(100% + 30px);
          color: #8b5cf6;
          filter: drop-shadow(0 0 14px #a855f7) drop-shadow(0 0 4px #ffffff);
          animation-duration: 0.42s;
        }
        .rank-gold .electric-base {
          stroke-width: 1.8;
          opacity: 0.2;
        }
        .rank-gold .electric-runner {
          stroke-width: 4.2;
          stroke-dasharray: 72 248;
          animation-duration: 0.5s, 0.4s;
        }
        .rank-gold .electric-runner-secondary {
          stroke: #d8b4fe;
          stroke-width: 3;
          stroke-dasharray: 48 272;
          animation-duration: 0.68s, 0.44s;
        }
        .rank-gold .electric-runner-extra {
          display: block;
          stroke: #ffffff;
          stroke-width: 1.55;
          stroke-dasharray: 24 296;
          opacity: 0.95;
          animation-duration: 0.36s, 0.32s;
          animation-delay: -0.18s;
        }
        .rank-silver .avatar-lightning-svg {
          inset: -13px;
          width: calc(100% + 26px);
          height: calc(100% + 26px);
          color: #f97316;
          filter: drop-shadow(0 0 11px #fb923c);
          animation-duration: 0.64s;
        }
        .rank-silver .electric-runner {
          stroke-width: 3.2;
          stroke-dasharray: 50 270;
          animation-duration: 0.84s, 0.66s;
        }
        .rank-silver .electric-runner-secondary {
          stroke: #ef4444;
          stroke-dasharray: 32 288;
        }
        .rank-bronze .avatar-lightning-svg {
          color: #fb923c;
          filter: drop-shadow(0 0 8px #fdba74);
          opacity: 0.82;
          animation-duration: 0.9s;
        }
        .rank-bronze .electric-runner {
          stroke-width: 2.7;
          stroke-dasharray: 34 286;
          animation-duration: 1.18s, 0.82s;
        }
        .avatar-glow {
          position: absolute;
          inset: -8px;
          border-radius: 24px;
          background: radial-gradient(circle, var(--rank-glow), transparent 68%);
          animation: wcPulse 3.1s ease-in-out infinite;
        }
        .rank-gold .avatar-glow {
          inset: -15px;
          border-radius: 30px;
          background:
            radial-gradient(circle at 45% 45%, rgba(216, 180, 254, 0.52), transparent 48%),
            radial-gradient(circle, rgba(91, 33, 182, 0.32), transparent 74%);
          animation: wcStorm 2.2s ease-in-out infinite;
        }
        .rank-silver .avatar-glow {
          inset: -11px;
          background:
            radial-gradient(circle at 50% 50%, rgba(253, 186, 116, 0.42), transparent 48%),
            radial-gradient(circle, rgba(239, 68, 68, 0.18), transparent 72%);
          animation-duration: 2.75s;
        }
        .avatar-zap {
          position: absolute;
          z-index: 20;
          color: var(--rank-accent);
          animation: wcBolt 2.6s linear infinite;
        }
        .avatar-zap-a {
          --bolt-rotate: -18deg;
          right: -6px;
          top: -7px;
        }
        .avatar-zap-b {
          --bolt-rotate: 18deg;
          bottom: -6px;
          left: -6px;
          animation-delay: 0.7s;
        }
        .avatar-zap-c,
        .avatar-zap-d {
          display: none;
        }
        .rank-gold .avatar-zap {
          color: #a855f7;
          animation-name: wcBoltStrong;
          animation-duration: 1.75s;
        }
        .rank-gold .avatar-zap-a {
          right: -9px;
          top: -10px;
        }
        .rank-gold .avatar-zap-b {
          bottom: -9px;
          left: -9px;
          animation-delay: 0.34s;
        }
        .rank-gold .avatar-zap-c {
          --bolt-rotate: 34deg;
          display: block;
          right: -11px;
          bottom: 5px;
          animation-delay: 0.68s;
        }
        .rank-gold .avatar-zap-d {
          --bolt-rotate: -38deg;
          display: block;
          left: -9px;
          top: 7px;
          animation-delay: 1.02s;
        }
        .rank-silver .avatar-zap {
          color: #f97316;
          animation-name: wcBoltWarm;
          animation-duration: 2.25s;
        }
        .rank-silver .avatar-zap-a {
          color: #ef4444;
        }
        .rank-silver .avatar-zap-b {
          opacity: 0.78;
        }
        .rank-bronze .avatar-zap {
          animation-duration: 2.9s;
        }
        .mobile-primary-badge {
          position: relative;
          isolation: isolate;
        }
        .mobile-primary-badge::before {
          content: "";
          position: absolute;
          inset: -18px;
          z-index: -1;
          border-radius: 999px;
          background: radial-gradient(circle, var(--rank-glow, rgba(16, 185, 129, 0.12)), transparent 68%);
          opacity: 0.9;
        }
        .top-winner-gif {
          position: absolute;
          right: clamp(1.1rem, 4vw, 1.4rem);
          top: 4.45rem;
          z-index: 8;
          width: clamp(5.8rem, 31vw, 7.15rem);
          aspect-ratio: 1.77857;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(139, 92, 246, 0.22);
          background:
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.92), rgba(237, 233, 254, 0.7));
          box-shadow:
            0 12px 24px rgba(88, 28, 135, 0.12),
            0 0 0 1px rgba(255, 255, 255, 0.72) inset;
          color: transparent;
          font-size: 0;
          line-height: 0;
          pointer-events: none;
        }
        .top-winner-gif::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          box-shadow: 0 0 18px rgba(168, 85, 247, 0.22) inset;
          pointer-events: none;
        }
        .top-winner-gif img,
        .top-winner-gif video {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
          object-fit: cover;
        }
        .top-winner-gif.top-winner-gif-inline {
          position: relative;
          right: auto;
          top: auto;
          z-index: 2;
          width: clamp(5.65rem, 28vw, 6.8rem);
          flex: 0 0 auto;
        }
        @media (max-width: 374px) {
          .top-winner-gif {
            right: 0.95rem;
            top: 4.55rem;
            width: 5.85rem;
            opacity: 0.92;
          }
          .top-winner-gif.top-winner-gif-inline {
            right: auto;
            top: auto;
            width: 5.55rem;
          }
        }
        .desktop-winner-gif {
          position: relative;
          z-index: 3;
          width: 84px;
          aspect-ratio: 1.77857;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(139, 92, 246, 0.2);
          background: rgba(250, 245, 255, 0.78);
          box-shadow:
            0 10px 22px rgba(88, 28, 135, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.75) inset;
          color: transparent;
          font-size: 0;
          line-height: 0;
          pointer-events: none;
        }
        .desktop-winner-gif img,
        .desktop-winner-gif video {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
          object-fit: cover;
        }
        .accuracy-sweep {
          position: relative;
          overflow: hidden;
        }
        .accuracy-sweep::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: 30%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
          animation: wcBarSweep 3.2s ease-in-out infinite;
        }
        @media (max-width: 767px) {
          .leaderboard-animation-visibility[data-in-view="false"],
          .leaderboard-animation-visibility[data-in-view="false"] *,
          .leaderboard-animation-visibility[data-in-view="false"]::before,
          .leaderboard-animation-visibility[data-in-view="false"]::after,
          .leaderboard-animation-visibility[data-in-view="false"] *::before,
          .leaderboard-animation-visibility[data-in-view="false"] *::after {
            animation-play-state: paused !important;
          }
          .leaderboard-stage .elite-card {
            contain: layout paint;
          }
          .leaderboard-stage .elite-card::after,
          .leaderboard-stage .rank-badge-elite::after,
          .leaderboard-stage .accuracy-sweep::after {
            animation-duration: 7.2s;
            opacity: 0.56;
          }
          .leaderboard-stage .rank-pulse {
            animation-duration: 4.8s !important;
            opacity: 0.58;
          }
          .leaderboard-stage .avatar-glow {
            animation-duration: 4.8s;
            opacity: 0.68;
          }
          .leaderboard-stage .avatar-ring {
            animation-duration: 6.8s;
            filter: none;
            opacity: 0.34;
          }
          .leaderboard-stage .avatar-lightning-svg {
            animation-duration: 1.25s;
            filter: drop-shadow(0 0 5px currentColor);
            opacity: 0.72;
          }
          .leaderboard-stage .electric-runner {
            animation-duration: 1.45s, 1.2s;
          }
          .leaderboard-stage .electric-runner-hot,
          .leaderboard-stage .electric-runner-extra,
          .leaderboard-stage .avatar-zap-c,
          .leaderboard-stage .avatar-zap-d {
            display: none;
          }
          .leaderboard-stage .avatar-zap {
            animation-duration: 3.4s;
            filter: none;
          }
          .leaderboard-stage .rank-tag-elite,
          .leaderboard-stage .win-streak-badge {
            animation-duration: 5.8s;
          }
          .leaderboard-stage .rank-tag-elite::after,
          .leaderboard-stage .win-streak-badge::before {
            animation-duration: 7.4s;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rank-pulse,
          .elite-row::after,
          .elite-card::after,
          .rank-badge-elite,
          .rank-badge-elite::after,
          .accuracy-sweep::after {
            animation: none !important;
          }
        }
      `}</style>
      <LeaderboardMediaHints activeBoard={activeBoard} />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            Bảng xếp hạng
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-emerald-950 md:text-4xl">
            Hai đường đua, nhìn là muốn tranh top
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Một bảng vinh danh người đoán đúng nhiều nhất, một bảng ghi nhận người tiếp sức quỹ thưởng.
            Tất cả dùng đơn vị vui Belly trong phạm vi nội bộ.
          </p>
        </div>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/10">
            <Image
              src="/messi-ronaldo-vip.png"
              alt="Không khí World Cup 2026"
              width={1200}
              height={720}
              className="h-40 w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-emerald-950/10 bg-white p-3 shadow-sm shadow-emerald-950/5">
            <Summary label="Lượt đúng" value={String(totalCorrect)} />
            <Summary label="Lượt dự đoán" value={String(totalVoted)} />
            <Summary label="Tổng góp quỹ" value={formatCurrency(totalContribution)} />
          </div>
        </div>
      </section>

      <div className="sticky top-[88px] z-10 rounded-2xl border border-emerald-950/10 bg-white/95 p-2 shadow-lg shadow-emerald-950/5 backdrop-blur">
        <div className="grid grid-cols-2 gap-2">
          <BoardTab
            href="/leaderboard"
            selected={activeBoard === "prediction"}
            title="Top đoán đúng nhiều nhất"
            helper={`${totalCorrect} lượt đúng`}
          />
          <BoardTab
            href="/leaderboard?board=contribution"
            selected={activeBoard === "contribution"}
            title="Bảng vàng quỹ thưởng"
            helper={formatCurrency(totalContribution)}
          />
        </div>
      </div>

      <LeaderboardSection
        kicker={activeSection.kicker}
        title={activeSection.title}
        description={activeSection.description}
        rows={activeSection.rows}
        mode={activeSection.mode}
      />

      {rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-white p-10 text-center">
          <h2 className="text-xl font-extrabold text-emerald-950">
            Chưa có người chơi
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Admin tạo tài khoản hoặc người chơi tự đăng ký thì bảng này sẽ có dữ liệu.
          </p>
        </div>
      )}
    </div>
  );
}

function BoardTab({
  href,
  selected,
  title,
  helper,
}: {
  href: string;
  selected: boolean;
  title: string;
  helper: string;
}) {
  return (
    <a
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`rounded-xl px-3 py-3 text-center transition active:scale-[0.99] sm:px-4 ${
        selected
          ? "bg-emerald-900 text-white shadow-lg shadow-emerald-950/15"
          : "bg-slate-50 text-emerald-950 ring-1 ring-slate-200 hover:bg-emerald-50"
      }`}
    >
      <span className="block text-sm font-black leading-tight sm:text-base">
        {title}
      </span>
      <span
        className={`mt-1 block text-[11px] font-bold sm:text-xs ${
          selected ? "text-emerald-100" : "text-slate-500"
        }`}
      >
        {helper}
      </span>
    </a>
  );
}

function LeaderboardSection({
  kicker,
  title,
  description,
  rows,
  mode,
}: {
  kicker: string;
  title: string;
  description: string;
  rows: RankedRow[];
  mode: BoardMode;
}) {
  const tableHeaders =
    mode === "contribution"
      ? ["Hạng", "Người chơi", "Lượt dự đoán", "Góp quỹ"]
      : [
          "Hạng",
          "Người chơi",
          "Đã chọn",
          "Quên",
          "Đúng",
          "Sai",
          "Độ chính xác",
          "Ngôi sao",
          "Ngôi sao sai",
          "Góp quỹ",
        ];
  const desktopGridStyle =
    mode === "contribution"
      ? { gridTemplateColumns: "4.9rem minmax(14rem,1fr) minmax(6.2rem,0.55fr) minmax(8.8rem,0.65fr)" }
      : {
          gridTemplateColumns:
            "4.9rem minmax(16rem,1.55fr) minmax(3.8rem,0.52fr) minmax(3.3rem,0.46fr) minmax(3.5rem,0.48fr) minmax(3.3rem,0.46fr) minmax(7.1rem,0.78fr) minmax(4.4rem,0.5fr) minmax(5.6rem,0.58fr) minmax(8rem,0.72fr)",
        };
  const desktopCellClass = "px-3 py-3";

  return (
    <section className="leaderboard-stage overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5">
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-4 py-4 sm:px-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            {mode === "prediction" ? <Crown size={15} /> : <Sparkles size={15} />}
            {kicker}
          </p>
          <h2 className="mt-1 text-2xl font-black text-emerald-950">
            {title}
          </h2>
        </div>
        <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">
          {description}
        </p>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) => (
          <AnimationVisibility key={row.id} className="leaderboard-animation-visibility">
            <MobileCard row={row} mode={mode} />
          </AnimationVisibility>
        ))}
      </div>

      <div className="hidden md:block">
        <div role="table" className="text-sm">
          <div
            role="row"
            className="grid items-center bg-emerald-950 text-left text-white"
            style={desktopGridStyle}
          >
            {tableHeaders.map((title) => (
              <div key={title} role="columnheader" className="px-4 py-3 font-bold">
                {title}
              </div>
            ))}
          </div>
          <div role="rowgroup" className="space-y-1.5 p-1.5">
            {rows.map((row, index) => {
              const visual = getRankVisual(row.displayRank, mode);
              const rowBg =
                row.displayRank <= 3
                  ? visual.desktopClass
                  : index % 2
                    ? "bg-slate-50/60"
                    : "bg-white";

              return (
                <div
                  key={row.id}
                  role="row"
                  className={`desktop-leaderboard-row grid min-h-[5.5rem] items-center border border-slate-100 transition hover:bg-emerald-50/40 ${
                    row.displayRank <= 3 ? `elite-row ${visual.rankClass}` : ""
                  } ${rowBg} ${cosmeticRowFrameClass(row.cosmetics)}`}
                  style={desktopGridStyle}
                >
                  <div role="cell" className={desktopCellClass}>
                    <RankBadge rank={row.displayRank} mode={mode} />
                  </div>
                  <div role="cell" className={desktopCellClass}>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        image={row.image}
                        name={row.name}
                        rank={row.displayRank}
                        mode={mode}
                        cosmetics={row.cosmetics}
                      />
                      <div className="min-w-0">
                        <PlayerIdentity row={row} />
                        <PlayerStatusBadges row={row} mode={mode} />
                      </div>
                      {row.displayRank === 1 && <TopWinnerGif variant="desktop" mode={mode} />}
                    </div>
                  </div>
                  {mode === "contribution" ? (
                    <>
                      <div role="cell" className={`${desktopCellClass} font-semibold tabular-nums text-emerald-900`}>
                        {row.voted}
                      </div>
                      <div role="cell" className={desktopCellClass}>
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 font-black tabular-nums text-amber-700 ring-1 ring-amber-100">
                          {formatCurrency(row.loss)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div role="cell" className={`${desktopCellClass} font-semibold tabular-nums`}>{row.voted}</div>
                      <div role="cell" className={`${desktopCellClass} font-semibold tabular-nums text-amber-700`}>{row.missed}</div>
                      <div role="cell" className={`${desktopCellClass} font-black tabular-nums text-emerald-700`}>{row.correct}</div>
                      <div role="cell" className={`${desktopCellClass} font-semibold tabular-nums text-red-700`}>{row.wrong}</div>
                      <div role="cell" className={desktopCellClass}>
                        <AccuracyCell value={row.accuracy} rank={row.displayRank} mode={mode} />
                      </div>
                      <div role="cell" className={`${desktopCellClass} font-semibold tabular-nums`}>{row.hopeStarUsed}</div>
                      <div role="cell" className={`${desktopCellClass} font-semibold tabular-nums text-amber-700`}>{row.hopeStarWrong}</div>
                      <div role="cell" className={`${desktopCellClass} font-black tabular-nums text-amber-700`}>
                        {formatCurrency(row.loss)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function getRankVisual(rank: number, mode: BoardMode) {
  if (rank === 1) {
    return {
      Icon: mode === "prediction" ? Crown : Trophy,
      tag: mode === "prediction" ? "Vua dự đoán" : "Dẫn đầu quỹ thưởng",
      badgeClass: "bg-amber-400 text-amber-950 ring-amber-200 shadow-amber-500/25",
      cardClass:
        "border-amber-300 bg-[linear-gradient(135deg,#fff8d7_0%,#ffffff_55%,#fff1a8_100%)] shadow-amber-900/15",
      desktopClass: "bg-[linear-gradient(90deg,#fff7cc_0%,#ffffff_60%,#fff5d6_100%)]",
      rankClass: "rank-gold",
      tagClass: "bg-amber-500 text-amber-950",
      haloClass: "bg-amber-300/45",
      barClass: "from-amber-400 via-yellow-300 to-amber-500",
      avatarClass:
        "ring-2 ring-violet-300 shadow-[0_0_0_4px_rgba(168,85,247,0.18),0_0_28px_rgba(124,58,237,0.42)]",
    };
  }

  if (rank === 2) {
    return {
      Icon: Award,
      tag: mode === "prediction" ? "Bám sát" : "Tiếp sức quỹ",
      badgeClass: "bg-slate-200 text-slate-900 ring-slate-100 shadow-slate-400/20",
      cardClass:
        "border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#e8eef6_100%)] shadow-slate-900/10",
      desktopClass: "bg-[linear-gradient(90deg,#f8fafc_0%,#ffffff_62%,#eef2f7_100%)]",
      rankClass: "rank-silver",
      tagClass: "bg-slate-900 text-white",
      haloClass: "bg-slate-300/45",
      barClass: "from-slate-400 via-slate-200 to-slate-500",
      avatarClass:
        "ring-2 ring-orange-300 shadow-[0_0_0_4px_rgba(249,115,22,0.15),0_0_22px_rgba(239,68,68,0.25)]",
    };
  }

  if (rank === 3) {
    return {
      Icon: Flame,
      tag: mode === "prediction" ? "Phong độ cao" : "Giữ lửa giải",
      badgeClass: "bg-orange-300 text-orange-950 ring-orange-100 shadow-orange-500/18",
      cardClass:
        "border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#ffedd5_100%)] shadow-orange-900/10",
      desktopClass: "bg-[linear-gradient(90deg,#fff7ed_0%,#ffffff_62%,#ffedd5_100%)]",
      rankClass: "rank-bronze",
      tagClass: "bg-orange-500 text-white",
      haloClass: "bg-orange-300/42",
      barClass: "from-orange-400 via-amber-300 to-orange-500",
      avatarClass:
        "ring-2 ring-orange-300 shadow-[0_0_0_4px_rgba(253,186,116,0.14),0_0_20px_rgba(249,115,22,0.24)]",
    };
  }

  return {
    Icon: Medal,
    tag: "",
    badgeClass: "bg-emerald-950 text-white ring-emerald-900/10",
    cardClass: "border-emerald-950/10 bg-white shadow-emerald-950/5",
    desktopClass: "",
    rankClass: "",
    tagClass: "",
    haloClass: "",
    barClass: "from-emerald-500 to-teal-400",
    avatarClass: "ring-1 ring-emerald-200",
  };
}

function RankBadge({
  rank,
  mode,
  compact = false,
}: {
  rank: number;
  mode: BoardMode;
  compact?: boolean;
}) {
  const visual = getRankVisual(rank, mode);
  const Icon = visual.Icon;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden font-black ring-4 ${
        compact ? "h-9 min-w-9 rounded-xl px-2 text-xs" : "h-10 min-w-10 rounded-2xl px-2.5 text-sm"
      } ${visual.badgeClass} ${rank <= 3 ? `rank-badge-elite ${visual.rankClass}` : ""}`}
    >
      {rank <= 3 && (
        <span
          className={`rank-pulse pointer-events-none absolute inset-[-8px] rounded-2xl ${visual.haloClass}`}
          style={{ animation: "wcPulse 2.9s ease-in-out infinite" }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1">
        {rank <= 3 && !compact && <Icon size={14} strokeWidth={2.5} aria-hidden="true" />}
        #{rank}
      </span>
    </div>
  );
}

function PlayerIdentity({
  row,
  variant = "desktop",
}: {
  row: RankedRow;
  variant?: "desktop" | "mobile";
}) {
  const isMobile = variant === "mobile";

  return (
    <>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-1">
        <p
          className={`min-w-0 max-w-full ${
            isMobile
              ? "text-[17px] font-black leading-tight text-emerald-950 [overflow-wrap:anywhere]"
              : "truncate font-extrabold text-emerald-950"
          } ${cosmeticNameplateClass(row.cosmetics)}`}
        >
          {row.name}
        </p>
        <CosmeticTitleBadge cosmetics={row.cosmetics} compact />
      </div>
      <p
        className={
          isMobile
            ? "mt-0.5 text-xs font-semibold leading-snug text-slate-600 [overflow-wrap:anywhere]"
            : "truncate text-xs text-slate-500"
        }
      >
        {row.department || "Chưa có đơn vị"}
      </p>
    </>
  );
}

function PlayerStatusBadges({
  row,
  mode,
}: {
  row: RankedRow;
  mode: BoardMode;
}) {
  const showRank = row.displayRank <= 3;
  const showStreak = mode === "prediction" && row.currentWinStreak >= 2;

  if (!showRank && !showStreak) return null;

  return (
    <div className="mt-1.5 flex max-w-full flex-wrap items-center gap-1.5">
      {showRank && <RankTag rank={row.displayRank} mode={mode} />}
      {showStreak && <WinStreakBadge streak={row.currentWinStreak} />}
    </div>
  );
}

function RankTag({
  rank,
  mode,
}: {
  rank: number;
  mode: BoardMode;
}) {
  const visual = getRankVisual(rank, mode);
  const Icon = visual.Icon;
  if (rank > 3) return null;

  return (
    <span className={`rank-tag-elite ${visual.rankClass} inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase leading-tight tracking-normal ${visual.tagClass}`}>
      <Icon className="shrink-0" size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{visual.tag}</span>
    </span>
  );
}

function WinStreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null;

  return (
    <span className="win-streak-badge inline-flex max-w-full items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-400 px-2.5 py-1 text-[10px] font-black leading-tight text-white shadow-sm shadow-emerald-900/15 ring-1 ring-white/70">
      <Flame
        className="relative z-10 shrink-0"
        size={12}
        strokeWidth={2.6}
        aria-hidden="true"
      />
      <span className="relative z-10 min-w-0 [overflow-wrap:anywhere]">
        Chuỗi đúng {streak} trận
      </span>
    </span>
  );
}

function MobilePrimaryBadge({
  label,
  value,
  rank,
  mode,
}: {
  label: string;
  value: string;
  rank: number;
  mode: BoardMode;
}) {
  const visual = getRankVisual(rank, mode);
  const bellyValue = value.endsWith(" Belly")
    ? value.slice(0, -" Belly".length)
    : null;
  const tone =
    rank === 1
      ? "border-violet-200 bg-violet-50/90 text-violet-950 shadow-violet-900/10"
      : rank === 2
        ? "border-orange-200 bg-orange-50/90 text-orange-950 shadow-orange-900/10"
        : rank === 3
          ? "border-amber-200 bg-amber-50/90 text-amber-950 shadow-amber-900/10"
          : "border-emerald-100 bg-emerald-50 text-emerald-950 shadow-emerald-900/5";

  return (
    <div
      className={`mobile-primary-badge flex min-w-[4.8rem] max-w-[6.9rem] shrink-0 flex-col items-center justify-center rounded-2xl border px-2.5 py-2 text-center shadow-sm ${
        rank <= 3 ? visual.rankClass : ""
      } ${tone}`}
    >
      <span className="text-[9px] font-black uppercase leading-none tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <span
        className={`mt-1 font-black leading-tight tabular-nums ${
          bellyValue ? "text-[11px] text-amber-700" : "text-xl text-red-700"
        }`}
      >
        {bellyValue ? (
          <>
            <span className="block whitespace-nowrap">{bellyValue}</span>
            <span className="block text-[10px] text-amber-700">Belly</span>
          </>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function MobileCard({ row, mode }: { row: RankedRow; mode: BoardMode }) {
  const visual = getRankVisual(row.displayRank, mode);
  const primaryLabel = mode === "prediction" ? "Đúng" : "Góp quỹ";
  const primaryValue =
    mode === "prediction" ? String(row.correct) : formatCurrency(row.loss);
  const showInlineWinnerGif = row.displayRank === 1;
  const showFloatingWinnerGif = false;
  const rowFrameKey = row.cosmetics?.AVATAR_FRAME?.visualKey;

  return (
    <article className={`relative overflow-hidden rounded-2xl border p-3 shadow-sm active:scale-[0.99] ${row.displayRank <= 3 ? `elite-card ${visual.rankClass}` : ""} ${visual.cardClass} ${rowFrameKey ? `mobile-card-has-cosmetic-frame cosmetic-row-frame-${rowFrameKey}` : ""}`}>
      {rowFrameKey && (
        <span
          className={`mobile-cosmetic-frame-art cosmetic-row-frame-${rowFrameKey}`}
          aria-hidden="true"
        />
      )}
      {row.displayRank <= 3 && (
        <span
          className={`rank-pulse pointer-events-none absolute right-2 top-2 h-14 w-14 rounded-full ${visual.haloClass}`}
          style={{ animation: "wcPulse 3.2s ease-in-out infinite" }}
        />
      )}
      {showFloatingWinnerGif && <TopWinnerGif variant="mobile" mode={mode} />}
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5 pr-1">
          <div className="relative flex min-h-[4.85rem] w-[5.35rem] shrink-0 items-center justify-center pt-5">
            <div className="absolute left-0 top-0 z-30">
              <RankBadge rank={row.displayRank} mode={mode} compact />
            </div>
            <Avatar
              image={row.image}
              name={row.name}
              rank={row.displayRank}
              mode={mode}
              cosmetics={row.cosmetics}
            />
          </div>
          <div className="min-w-0 pt-1">
            <PlayerIdentity row={row} variant="mobile" />
            <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-400">
              {mode === "prediction"
                ? `${row.accuracy.toFixed(0)}% chính xác`
                : `${row.voted} lượt dự đoán`}
            </p>
            {!showInlineWinnerGif && <PlayerStatusBadges row={row} mode={mode} />}
          </div>
        </div>
        <MobilePrimaryBadge
          label={primaryLabel}
          value={primaryValue}
          rank={row.displayRank}
          mode={mode}
        />
      </div>

      {showInlineWinnerGif && (
        <div className="relative z-10 mt-2.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 pl-[4.4rem] max-[390px]:pl-0">
          <div className="min-w-0">
            <RankTag rank={row.displayRank} mode={mode} />
          </div>
          <TopWinnerGif variant="mobileInline" mode={mode} />
        </div>
      )}

      {mode === "prediction" ? (
        <>
          <div className={`relative ${showFloatingWinnerGif ? "mt-12" : row.displayRank === 1 ? "mt-3" : "mt-2"}`}>
            <AccuracyBar value={row.accuracy} rank={row.displayRank} mode={mode} />
          </div>

          <div className="relative mt-3 flex flex-wrap gap-1.5">
            <MobileStat label="Chọn" value={String(row.voted)} />
            <MobileStat label="Đúng" value={String(row.correct)} tone="good" />
            <MobileStat label="Sai" value={String(row.wrong)} tone="bad" />
            <MobileStat label="Quên" value={String(row.missed)} tone="warn" />
          </div>
        </>
      ) : (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          <MobileStat label="Dự đoán" value={String(row.voted)} tone="good" />
        </div>
      )}
    </article>
  );
}

function TopWinnerGif({
  variant,
  mode,
}: {
  variant: "mobile" | "mobileInline" | "desktop";
  mode: BoardMode;
}) {
  const className =
    variant === "desktop"
      ? "desktop-winner-gif"
      : variant === "mobileInline"
        ? "top-winner-gif top-winner-gif-inline"
        : "top-winner-gif";
  const media = getTopWinnerMedia(mode);
  const eager = variant === "desktop";

  return (
    <div className={className} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.gif}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "low"}
      />
    </div>
  );
}

function AccuracyCell({
  value,
  rank,
  mode,
}: {
  value: number;
  rank: number;
  mode: BoardMode;
}) {
  return (
    <div className="min-w-24">
      <p className="font-black tabular-nums text-emerald-950">{value.toFixed(1)}%</p>
      <AccuracyBar value={value} rank={rank} mode={mode} />
    </div>
  );
}

function AccuracyBar({
  value,
  rank,
  mode,
}: {
  value: number;
  rank: number;
  mode: BoardMode;
}) {
  const visual = getRankVisual(rank, mode);
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${rank <= 3 ? "accuracy-sweep" : ""} ${visual.barClass}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function MobileStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneClass = {
    neutral: "bg-slate-50 text-slate-700 ring-slate-100",
    good: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bad: "bg-red-50 text-red-700 ring-red-100",
    warn: "bg-amber-50 text-amber-700 ring-amber-100",
  }[tone];

  return (
    <div className={`inline-flex min-h-7 items-center gap-1.5 rounded-xl px-2 text-[11px] font-bold ring-1 ${toneClass}`}>
      <span className="font-black tabular-nums">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const bellyValue = value.endsWith(" Belly")
    ? value.slice(0, -" Belly".length)
    : null;

  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-2.5 py-3 text-center">
      <p className="text-[clamp(0.74rem,3.15vw,1.125rem)] font-black leading-tight text-emerald-950">
        {bellyValue ? (
          <>
            <span className="inline-block whitespace-nowrap">{bellyValue}</span>{" "}
            <span className="inline-block whitespace-nowrap">Belly</span>
          </>
        ) : (
          value
        )}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Avatar({
  image,
  name,
  rank,
  mode,
  cosmetics,
}: {
  image: string | null;
  name: string;
  rank: number;
  mode: BoardMode;
  cosmetics: RankedRow["cosmetics"];
}) {
  const visual = getRankVisual(rank, mode);
  const avatarClass = `relative z-10 h-10 w-10 rounded-2xl ${visual.avatarClass}`;

  return (
    <span className={`avatar-shell relative inline-flex shrink-0 ${rank <= 3 ? `avatar-elite ${visual.rankClass}` : ""}`}>
      {rank <= 3 && (
        <>
          <span className="avatar-glow pointer-events-none" />
          <span className="avatar-ring pointer-events-none" />
          <svg
            className="avatar-lightning-svg pointer-events-none"
            viewBox="0 0 72 72"
            aria-hidden="true"
          >
            <path
              className="electric-base"
              d="M18 7 L25 13 L32 6 L41 13 L51 8 L64 18 L57 25 L66 33 L58 41 L64 52 L52 64 L42 57 L34 66 L26 58 L15 64 L7 52 L14 43 L6 35 L14 26 L8 17 Z"
            />
            <path
              className="electric-runner"
              d="M18 7 L25 13 L32 6 L41 13 L51 8 L64 18 L57 25 L66 33 L58 41 L64 52 L52 64 L42 57 L34 66 L26 58 L15 64 L7 52 L14 43 L6 35 L14 26 L8 17 Z"
            />
            <path
              className="electric-runner electric-runner-hot"
              d="M18 7 L25 13 L32 6 L41 13 L51 8 L64 18 L57 25 L66 33 L58 41 L64 52 L52 64 L42 57 L34 66 L26 58 L15 64 L7 52 L14 43 L6 35 L14 26 L8 17 Z"
            />
            <path
              className="electric-runner electric-runner-secondary"
              d="M20 13 L31 10 L38 16 L49 12 L59 22 L55 31 L61 39 L53 52 L43 58 L35 53 L25 59 L13 48 L18 37 L12 29 L19 18"
            />
            {rank === 1 && (
              <>
                <path
                  className="electric-runner electric-runner-extra"
                  d="M18 7 L25 13 L32 6 L41 13 L51 8 L64 18 L57 25 L66 33 L58 41 L64 52 L52 64 L42 57 L34 66 L26 58 L15 64 L7 52 L14 43 L6 35 L14 26 L8 17 Z"
                />
                <path
                  className="electric-runner electric-runner-extra electric-runner-secondary"
                  d="M20 13 L31 10 L38 16 L49 12 L59 22 L55 31 L61 39 L53 52 L43 58 L35 53 L25 59 L13 48 L18 37 L12 29 L19 18"
                />
              </>
            )}
          </svg>
          <Zap className="avatar-zap avatar-zap-a pointer-events-none" size={15} strokeWidth={3} aria-hidden="true" />
          <Zap className="avatar-zap avatar-zap-b pointer-events-none" size={12} strokeWidth={3} aria-hidden="true" />
          {rank === 1 && (
            <>
              <Zap className="avatar-zap avatar-zap-c pointer-events-none" size={14} strokeWidth={3.2} aria-hidden="true" />
              <Zap className="avatar-zap avatar-zap-d pointer-events-none" size={10} strokeWidth={3.2} aria-hidden="true" />
            </>
          )}
        </>
      )}
      <CosmeticAvatar
        image={image}
        name={name}
        cosmetics={cosmetics}
        size="md"
        className="relative z-10"
        coreClassName={avatarClass}
        effectIntensity="compact"
        showAvatarFrame={false}
      />
    </span>
  );
}
