import Image from "next/image";
import { getTeamVisualUrl } from "@/lib/team-visuals";

export function TeamMark({
  name,
  code,
  crest,
  size = "md",
}: {
  name: string;
  code: string | null;
  crest: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const source = getTeamVisualUrl({ code, crest });
  const dimensions =
    size === "lg"
      ? "h-11 w-14"
      : size === "sm"
        ? "h-7 w-9"
        : "h-9 w-12";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${dimensions}`}
      title={name}
    >
      {source ? (
        <Image
          src={source}
          alt={`Cờ ${name}`}
          fill
          sizes={size === "lg" ? "56px" : size === "sm" ? "36px" : "48px"}
          className="object-contain p-0.5"
          unoptimized
        />
      ) : (
        <span className="text-xs font-black text-slate-500">
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
