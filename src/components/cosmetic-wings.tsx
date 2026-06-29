import { useId, type ReactNode } from "react";

type CosmeticWingsProps = {
  visualKey: string;
};

type WingSvgProps = {
  visualKey: string;
  defs: ReactNode;
  children: ReactNode;
  center?: ReactNode;
};

function useWingIds<const T extends readonly string[]>(
  prefix: string,
  names: T,
): Record<T[number], string> {
  const reactId = useId().replace(/:/g, "");
  return names.reduce(
    (result, name) => {
      result[name as T[number]] = `${prefix}-${reactId}-${name}`;
      return result;
    },
    {} as Record<T[number], string>,
  );
}

export function CosmeticWings({ visualKey }: CosmeticWingsProps) {
  switch (visualKey) {
    case "angel-soft":
      return <AngelSoftWings />;
    case "frost-crystal":
      return <FrostCrystalWings />;
    case "thunder-bolt":
      return <ThunderBoltWings />;
    case "demon-night":
      return <DemonNightWings />;
    case "dragon-scale":
      return <DragonScaleWings />;
    case "galaxy-nebula":
      return <GalaxyNebulaWings />;
    default:
      return null;
  }
}

function WingSvg({ visualKey, defs, children, center }: WingSvgProps) {
  return (
    <svg
      className={`cosmetic-wings-svg cosmetic-wings-${visualKey}`}
      viewBox="0 0 320 150"
      aria-hidden="true"
      focusable="false"
    >
      <defs>{defs}</defs>
      <ellipse className="cosmetic-wing-ground" cx="160" cy="93" rx="74" ry="28" />
      <g className="cosmetic-wing-side cosmetic-wing-left">{children}</g>
      <g className="cosmetic-wing-side cosmetic-wing-right">
        <g transform="translate(320 0) scale(-1 1)">{children}</g>
      </g>
      {center}
    </svg>
  );
}

function BirdFeatherStack({
  mainId,
  deepId,
  glowId,
  accentId,
}: {
  mainId: string;
  deepId: string;
  glowId: string;
  accentId: string;
}) {
  return (
    <>
      <path
        className="cosmetic-wing-back"
        d="M148 67C112 19 58 2 10 19c42 9 81 29 126 70 10-4 15-11 12-22Z"
        fill={`url(#${glowId})`}
      />
      <path
        className="cosmetic-wing-feather cosmetic-wing-feather-1"
        d="M151 61C119 18 68 2 15 16c44 15 82 34 125 64 9-4 13-11 11-19Z"
        fill={`url(#${mainId})`}
      />
      <path
        className="cosmetic-wing-feather cosmetic-wing-feather-2"
        d="M148 72C107 40 55 31 5 51c45 9 88 25 129 52 10-8 14-19 14-31Z"
        fill={`url(#${deepId})`}
      />
      <path
        className="cosmetic-wing-feather cosmetic-wing-feather-3"
        d="M140 86C98 70 51 75 17 110c43-9 80-9 116-9 8-4 10-10 7-15Z"
        fill={`url(#${mainId})`}
      />
      <path
        className="cosmetic-wing-coverts"
        d="M145 64C121 48 91 43 61 50c24 11 47 23 72 44 10-7 14-17 12-30Z"
        fill={`url(#${accentId})`}
      />
      <path
        className="cosmetic-wing-vein"
        d="M136 60C96 43 58 28 19 17M134 75C91 66 50 58 10 53M127 89C88 86 50 94 20 109"
      />
      <path
        className="cosmetic-wing-shine"
        d="M40 19C74 29 106 46 132 67M30 57C66 62 100 75 127 93M35 104C68 95 101 94 125 97"
      />
    </>
  );
}

function AngelSoftWings() {
  const ids = useWingIds("angel-soft", ["main", "deep", "accent", "glow"] as const);
  const defs = (
    <>
      <linearGradient id={ids.main} x1="18" y1="8" x2="148" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.42" stopColor="#ecfeff" />
        <stop offset="0.76" stopColor="#bae6fd" />
        <stop offset="1" stopColor="#7dd3fc" />
      </linearGradient>
      <linearGradient id={ids.deep} x1="20" y1="30" x2="146" y2="118" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#f8fafc" />
        <stop offset="0.58" stopColor="#ccfbf1" />
        <stop offset="1" stopColor="#67e8f9" />
      </linearGradient>
      <linearGradient id={ids.accent} x1="70" y1="42" x2="146" y2="98" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#a7f3d0" />
      </linearGradient>
      <radialGradient id={ids.glow} cx="50%" cy="50%" r="62%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="0.5" stopColor="#bae6fd" stopOpacity="0.44" />
        <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
      </radialGradient>
    </>
  );

  return (
    <WingSvg
      visualKey="angel-soft"
      defs={defs}
      center={<circle className="cosmetic-wing-center" cx="160" cy="78" r="24" />}
    >
      <BirdFeatherStack
        mainId={ids.main}
        deepId={ids.deep}
        glowId={ids.glow}
        accentId={ids.accent}
      />
      <circle className="cosmetic-wing-spark cosmetic-wing-spark-a" cx="34" cy="77" r="2.2" />
      <circle className="cosmetic-wing-spark cosmetic-wing-spark-b" cx="78" cy="25" r="1.7" />
    </WingSvg>
  );
}

function FrostCrystalWings() {
  const ids = useWingIds("frost-crystal", ["main", "deep", "accent", "glow"] as const);
  const defs = (
    <>
      <linearGradient id={ids.main} x1="16" y1="8" x2="148" y2="112" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.36" stopColor="#dbeafe" />
        <stop offset="0.66" stopColor="#7dd3fc" />
        <stop offset="1" stopColor="#0ea5e9" />
      </linearGradient>
      <linearGradient id={ids.deep} x1="22" y1="26" x2="146" y2="124" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#f8fafc" />
        <stop offset="0.44" stopColor="#bae6fd" />
        <stop offset="1" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id={ids.accent} x1="72" y1="42" x2="146" y2="102" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#38bdf8" />
      </linearGradient>
      <radialGradient id={ids.glow} cx="50%" cy="50%" r="62%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.88" />
        <stop offset="0.54" stopColor="#7dd3fc" stopOpacity="0.48" />
        <stop offset="1" stopColor="#0284c7" stopOpacity="0" />
      </radialGradient>
    </>
  );

  return (
    <WingSvg
      visualKey="frost-crystal"
      defs={defs}
      center={<circle className="cosmetic-wing-center" cx="160" cy="78" r="25" />}
    >
      <BirdFeatherStack
        mainId={ids.main}
        deepId={ids.deep}
        glowId={ids.glow}
        accentId={ids.accent}
      />
      <path
        className="cosmetic-wing-crystal-line"
        d="M49 26l18 16-14 11 26 13-20 12 29 16"
      />
      <polygon className="cosmetic-wing-crystal-chip" points="24,51 38,43 42,58 30,65" />
      <polygon className="cosmetic-wing-crystal-chip" points="78,18 92,28 82,39 70,32" />
      <circle className="cosmetic-wing-spark cosmetic-wing-spark-a" cx="40" cy="105" r="2" />
      <circle className="cosmetic-wing-spark cosmetic-wing-spark-b" cx="104" cy="38" r="1.8" />
    </WingSvg>
  );
}

function ThunderBoltWings() {
  const ids = useWingIds("thunder-bolt", ["main", "deep", "glow"] as const);
  const defs = (
    <>
      <linearGradient id={ids.main} x1="18" y1="9" x2="150" y2="122" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.23" stopColor="#fef08a" />
        <stop offset="0.56" stopColor="#facc15" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id={ids.deep} x1="22" y1="32" x2="150" y2="122" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fef9c3" />
        <stop offset="0.5" stopColor="#eab308" />
        <stop offset="1" stopColor="#92400e" />
      </linearGradient>
      <radialGradient id={ids.glow} cx="50%" cy="50%" r="66%">
        <stop offset="0" stopColor="#fef08a" stopOpacity="0.92" />
        <stop offset="0.55" stopColor="#facc15" stopOpacity="0.48" />
        <stop offset="1" stopColor="#f97316" stopOpacity="0" />
      </radialGradient>
    </>
  );

  return (
    <WingSvg
      visualKey="thunder-bolt"
      defs={defs}
      center={<circle className="cosmetic-wing-center" cx="160" cy="80" r="27" />}
    >
      <path className="cosmetic-wing-back" d="M148 69C112 27 64 17 20 39c42 6 80 27 118 70 11-7 15-23 10-40Z" fill={`url(#${ids.glow})`} />
      <path
        className="cosmetic-wing-bolt cosmetic-wing-bolt-1"
        d="M145 48 100 74l22 2-50 58 16-45-33 7 46-40-23-1 50-42Z"
        fill={`url(#${ids.main})`}
      />
      <path
        className="cosmetic-wing-bolt cosmetic-wing-bolt-2"
        d="M133 65 86 88l18 4-48 42 18-35-32 4 42-30-23-3 48-31Z"
        fill={`url(#${ids.deep})`}
      />
      <path
        className="cosmetic-wing-bolt cosmetic-wing-bolt-3"
        d="M138 54C104 29 64 22 26 35c36 13 67 27 101 57 9-7 13-21 11-38Z"
        fill={`url(#${ids.main})`}
      />
      <path className="cosmetic-wing-shine" d="M101 28 78 53M103 76 78 104M59 71 30 94" />
      <circle className="cosmetic-wing-spark cosmetic-wing-spark-a" cx="51" cy="119" r="2.5" />
      <circle className="cosmetic-wing-spark cosmetic-wing-spark-b" cx="112" cy="30" r="2" />
    </WingSvg>
  );
}

function DemonNightWings() {
  const ids = useWingIds("demon-night", ["main", "rib", "glow"] as const);
  const defs = (
    <>
      <linearGradient id={ids.main} x1="10" y1="18" x2="150" y2="128" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#111827" />
        <stop offset="0.32" stopColor="#5b21b6" />
        <stop offset="0.68" stopColor="#be123c" />
        <stop offset="1" stopColor="#2e1065" />
      </linearGradient>
      <linearGradient id={ids.rib} x1="30" y1="18" x2="148" y2="126" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#f0abfc" />
        <stop offset="0.45" stopColor="#a855f7" />
        <stop offset="1" stopColor="#7f1d1d" />
      </linearGradient>
      <radialGradient id={ids.glow} cx="50%" cy="50%" r="64%">
        <stop offset="0" stopColor="#e879f9" stopOpacity="0.66" />
        <stop offset="0.52" stopColor="#a855f7" stopOpacity="0.38" />
        <stop offset="1" stopColor="#7f1d1d" stopOpacity="0" />
      </radialGradient>
    </>
  );

  return (
    <WingSvg
      visualKey="demon-night"
      defs={defs}
      center={<circle className="cosmetic-wing-center" cx="160" cy="81" r="27" />}
    >
      <path className="cosmetic-wing-back" d="M149 73C114 35 61 28 21 52c37 6 78 29 113 68 12-10 17-28 15-47Z" fill={`url(#${ids.glow})`} />
      <path
        className="cosmetic-wing-membrane"
        d="M148 44C118 53 97 68 82 91 62 74 40 65 12 66c15 17 22 32 23 48-15 4-25 13-31 28 32-9 58-8 82 5 12-25 32-45 59-57 4-17 5-32 3-46Z"
        fill={`url(#${ids.main})`}
      />
      <path className="cosmetic-wing-bone" d="M146 43C119 67 99 99 86 147M83 91C61 93 37 109 4 142M83 91C62 78 39 68 12 66" />
      <path className="cosmetic-wing-claw" d="M147 39l25 11-24 15M12 65 5 35l31 24M4 142l-12 21 36-16" fill={`url(#${ids.rib})`} />
      <circle className="cosmetic-wing-orb cosmetic-wing-orb-a" cx="63" cy="113" r="7.5" />
      <circle className="cosmetic-wing-orb cosmetic-wing-orb-b" cx="118" cy="64" r="4.8" />
    </WingSvg>
  );
}

function DragonScaleWings() {
  const ids = useWingIds("dragon-scale", ["main", "rib", "glow"] as const);

  const defs = (
    <>
      <linearGradient id={ids.main} x1="8" y1="14" x2="150" y2="132" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#431407" />
        <stop offset="0.3" stopColor="#991b1b" />
        <stop offset="0.62" stopColor="#dc2626" />
        <stop offset="1" stopColor="#f97316" />
      </linearGradient>
      <linearGradient id={ids.rib} x1="28" y1="16" x2="148" y2="130" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fdba74" />
        <stop offset="0.45" stopColor="#ef4444" />
        <stop offset="1" stopColor="#7f1d1d" />
      </linearGradient>
      <radialGradient id={ids.glow} cx="50%" cy="50%" r="66%">
        <stop offset="0" stopColor="#fb923c" stopOpacity="0.84" />
        <stop offset="0.54" stopColor="#ef4444" stopOpacity="0.44" />
        <stop offset="1" stopColor="#7f1d1d" stopOpacity="0" />
      </radialGradient>
    </>
  );

  return (
    <WingSvg
      visualKey="dragon-scale"
      defs={defs}
      center={<circle className="cosmetic-wing-center" cx="160" cy="82" r="28" />}
    >
      <path className="cosmetic-wing-back" d="M150 76C113 31 61 19 14 50c41 11 78 36 118 79 13-11 20-33 18-53Z" fill={`url(#${ids.glow})`} />
      <path
        className="cosmetic-wing-membrane"
        d="M149 36C118 45 93 62 77 91 57 74 34 64 7 63c13 20 20 39 22 58-15 5-25 14-31 30 33-11 60-9 86 7 12-28 33-52 62-66 5-19 6-39 3-56Z"
        fill={`url(#${ids.main})`}
      />
      <path className="cosmetic-wing-bone" d="M147 37C118 64 98 100 84 158M78 91C56 95 31 113-2 151M78 91C58 78 34 66 7 63" />
      <path className="cosmetic-wing-scale" d="M35 72c15-10 31-9 47 1M29 96c18-9 35-6 51 6M31 123c18-6 36-2 54 9M88 66c15-11 31-13 47-5M84 93c18-9 36-8 54 1" />
      <path className="cosmetic-wing-claw" d="M148 31l27 12-26 16M7 62 0 30l33 25M-2 151l-12 23 39-18" fill={`url(#${ids.rib})`} />
      <circle className="cosmetic-wing-spark cosmetic-wing-spark-a" cx="111" cy="58" r="2" />
      <circle className="cosmetic-wing-spark cosmetic-wing-spark-b" cx="35" cy="139" r="2.2" />
    </WingSvg>
  );
}

function GalaxyNebulaWings() {
  const ids = useWingIds("galaxy-nebula", ["main", "deep", "accent", "glow", "star"] as const);

  const defs = (
    <>
      <linearGradient id={ids.main} x1="14" y1="8" x2="148" y2="116" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#1e1b4b" />
        <stop offset="0.3" stopColor="#7c3aed" />
        <stop offset="0.58" stopColor="#2563eb" />
        <stop offset="0.78" stopColor="#14b8a6" />
        <stop offset="1" stopColor="#581c87" />
      </linearGradient>
      <linearGradient id={ids.deep} x1="20" y1="30" x2="146" y2="122" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#312e81" />
        <stop offset="0.5" stopColor="#4f46e5" />
        <stop offset="1" stopColor="#0f766e" />
      </linearGradient>
      <linearGradient id={ids.accent} x1="70" y1="42" x2="146" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#f5d0fe" />
        <stop offset="1" stopColor="#67e8f9" />
      </linearGradient>
      <radialGradient id={ids.glow} cx="50%" cy="50%" r="64%">
        <stop offset="0" stopColor="#f5d0fe" stopOpacity="0.82" />
        <stop offset="0.5" stopColor="#8b5cf6" stopOpacity="0.42" />
        <stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={ids.star} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.45" stopColor="#f5d0fe" />
        <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
      </radialGradient>
    </>
  );

  return (
    <WingSvg
      visualKey="galaxy-nebula"
      defs={defs}
      center={<circle className="cosmetic-wing-center" cx="160" cy="80" r="28" />}
    >
      <BirdFeatherStack
        mainId={ids.main}
        deepId={ids.deep}
        glowId={ids.glow}
        accentId={ids.accent}
      />
      <circle className="cosmetic-wing-star cosmetic-wing-star-a" cx="42" cy="39" r="4" fill={`url(#${ids.star})`} />
      <circle className="cosmetic-wing-star cosmetic-wing-star-b" cx="93" cy="61" r="6" fill={`url(#${ids.star})`} />
      <circle className="cosmetic-wing-star cosmetic-wing-star-c" cx="60" cy="102" r="3.5" fill={`url(#${ids.star})`} />
      <circle className="cosmetic-wing-star cosmetic-wing-star-d" cx="115" cy="33" r="2.8" fill={`url(#${ids.star})`} />
    </WingSvg>
  );
}
