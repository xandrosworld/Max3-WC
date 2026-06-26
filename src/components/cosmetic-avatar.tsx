import { ShopItemType } from "@prisma/client";
import { PhoenixFlameWings } from "@/components/phoenix-flame-wings";
import type { EquippedCosmetics } from "@/lib/shop";

const sizeClass = {
  xs: "cosmetic-avatar-xs",
  sm: "cosmetic-avatar-sm",
  md: "cosmetic-avatar-md",
  lg: "cosmetic-avatar-lg",
  xl: "cosmetic-avatar-xl",
};

export function CosmeticAvatar({
  image,
  name,
  cosmetics,
  size = "md",
  className = "",
  coreClassName = "",
  effectIntensity = "full",
}: {
  image: string | null;
  name: string;
  cosmetics?: EquippedCosmetics;
  size?: keyof typeof sizeClass;
  className?: string;
  coreClassName?: string;
  effectIntensity?: "full" | "compact" | "minimal";
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const frame = cosmetics?.[ShopItemType.AVATAR_FRAME]?.visualKey ?? "none";
  const wings = cosmetics?.[ShopItemType.AVATAR_WINGS]?.visualKey ?? "none";
  const aura = cosmetics?.[ShopItemType.AVATAR_AURA]?.visualKey ?? "none";
  const hasPhoenixWings = wings === "phoenix-flame";

  return (
    <span
      className={`cosmetic-avatar ${sizeClass[size]} ${className}`}
      data-frame={frame}
      data-wings={wings}
      data-aura={aura}
      data-effect-intensity={effectIntensity}
    >
      <span className="cosmetic-avatar-aura" aria-hidden="true" />
      <span className="cosmetic-avatar-wings" aria-hidden="true">
        {hasPhoenixWings ? <PhoenixFlameWings /> : (
          <>
            <span />
            <span />
          </>
        )}
      </span>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`Ảnh đại diện của ${name}`}
          className={`cosmetic-avatar-core object-cover ${coreClassName}`}
        />
      ) : (
        <span className={`cosmetic-avatar-core flex items-center justify-center bg-emerald-100 font-black text-emerald-900 ${coreClassName}`}>
          {initial}
        </span>
      )}
      <span className="cosmetic-avatar-frame" aria-hidden="true" />
    </span>
  );
}

export function CosmeticTitleBadge({
  cosmetics,
  compact = false,
}: {
  cosmetics?: EquippedCosmetics;
  compact?: boolean;
}) {
  const title = cosmetics?.[ShopItemType.TITLE];
  if (!title) return null;

  return (
    <span
      className={`cosmetic-title-badge ${compact ? "cosmetic-title-badge-compact" : ""}`}
      data-title={title.visualKey}
    >
      {title.name}
    </span>
  );
}

export function cosmeticNameplateClass(cosmetics?: EquippedCosmetics) {
  const nameplate = cosmetics?.[ShopItemType.NAMEPLATE];
  return nameplate ? `cosmetic-nameplate cosmetic-nameplate-${nameplate.visualKey}` : "";
}
