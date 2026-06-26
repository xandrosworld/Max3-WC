import { ShopItemType, type ShopItem } from "@prisma/client";
import {
  Check,
  Crown,
  Frame,
  IdCard,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Trophy,
  WandSparkles,
} from "lucide-react";
import {
  equipShopItemAction,
  unequipShopItemAction,
} from "@/app/actions";
import {
  CosmeticAvatar,
  CosmeticTitleBadge,
  cosmeticNameplateClass,
} from "@/components/cosmetic-avatar";
import { ExpandableList } from "@/components/expandable-list";
import { ShopCatalogTabs } from "@/components/shop-catalog-tabs";
import { ShopGuideTour } from "@/components/shop-guide-tour";
import { ShopPurchaseForm } from "@/components/shop-purchase-form";
import {
  ShopTryOnButton,
  ShopTryOnPanel,
  ShopTryOnProvider,
  type ShopTryOnCosmetics,
  type ShopTryOnItem,
} from "@/components/shop-try-on";
import { formatVietnamTime } from "@/lib/domain";
import { requireUser } from "@/lib/session";
import {
  formatCtom,
  getShopPageData,
  SHOP_RARITY_LABELS,
  SHOP_RARITY_TONES,
  SHOP_TYPE_LABELS,
  SHOP_TYPE_ORDER,
  SHOP_TYPE_SHORT_LABELS,
  type EquippedCosmetics,
} from "@/lib/shop";

export const dynamic = "force-dynamic";

type ShopPageData = Awaited<ReturnType<typeof getShopPageData>>;

const SHOP_SECTION_META = {
  [ShopItemType.AVATAR_FRAME]: {
    Icon: Frame,
    headerClass: "border-emerald-100 bg-emerald-50/70",
    iconClass: "bg-white text-emerald-700 ring-emerald-200",
    countClass: "bg-white text-emerald-800 ring-emerald-200 shadow-emerald-950/5",
  },
  [ShopItemType.AVATAR_WINGS]: {
    Icon: WandSparkles,
    headerClass: "border-sky-100 bg-sky-50/80",
    iconClass: "bg-white text-sky-700 ring-sky-200",
    countClass: "bg-white text-sky-800 ring-sky-200 shadow-sky-950/5",
  },
  [ShopItemType.AVATAR_AURA]: {
    Icon: Sparkles,
    headerClass: "border-violet-100 bg-violet-50/75",
    iconClass: "bg-white text-violet-700 ring-violet-200",
    countClass: "bg-white text-violet-800 ring-violet-200 shadow-violet-950/5",
  },
  [ShopItemType.TITLE]: {
    Icon: Crown,
    headerClass: "border-amber-100 bg-amber-50/75",
    iconClass: "bg-white text-amber-700 ring-amber-200",
    countClass: "bg-white text-amber-800 ring-amber-200 shadow-amber-950/5",
  },
  [ShopItemType.NAMEPLATE]: {
    Icon: IdCard,
    headerClass: "border-slate-200 bg-white",
    iconClass: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    countClass: "bg-emerald-50 text-emerald-800 ring-emerald-200 shadow-emerald-950/5",
  },
} satisfies Record<
  ShopItemType,
  {
    Icon: typeof Sparkles;
    headerClass: string;
    iconClass: string;
    countClass: string;
  }
>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const data = await getShopPageData(user.id);
  const equippedCount = Object.values(data.equipped).filter(Boolean).length;
  const myCtomRank = data.leaderboard.find((row) => row.id === user.id)?.rank;
  const notice = getNotice(params);
  const tryOnUser = {
    image: user.image,
    name: user.name,
    department: user.department,
  };
  const initialTryOnCosmetics = toTryOnCosmetics(data.equipped);
  const guideDemoItem =
    data.items.find(
      (item) =>
        item.slug === "frame-neon-storm" && data.equipped[item.type]?.id !== item.id,
    ) ??
    data.items.find(
      (item) =>
        item.type === ShopItemType.AVATAR_FRAME &&
        item.rarity === "EPIC" &&
        data.equipped[item.type]?.id !== item.id,
    ) ??
    data.items.find(
      (item) =>
        item.type === ShopItemType.AVATAR_FRAME &&
        data.equipped[item.type]?.id !== item.id,
    ) ??
    data.items.find((item) => item.type === ShopItemType.AVATAR_FRAME) ??
    data.items[0];

  return (
    <ShopTryOnProvider user={tryOnUser} initialCosmetics={initialTryOnCosmetics}>
      <div className="space-y-6" data-testid="shop-page">
      <section
        className="relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-slate-950 text-white shadow-xl shadow-emerald-950/15"
        data-guide-target="shop-hero"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(52,211,153,0.28),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(251,191,36,0.2),transparent_26%),linear-gradient(135deg,#052e2b,#08111f_62%,#111827)]" />
        <div className="relative grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:py-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 ring-1 ring-white/15">
                <ShoppingBag size={14} />
                CTOM Shop
              </p>
              {guideDemoItem && (
                <ShopGuideTour
                  demoItem={toTryOnItem(guideDemoItem)}
                  priceCtom={guideDemoItem.priceCtom}
                  priceLabel={formatCtom(guideDemoItem.priceCtom)}
                  currentCtom={data.totalCtom}
                  hintStorageKey={`shop-guide-hint:${user.id}`}
                />
              )}
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-normal sm:text-4xl">
              Nâng cấp diện mạo, lên bảng là thấy chất riêng
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-emerald-50/80">
              CTOM là quỹ trang trí riêng của shop, tách biệt hoàn toàn với Belly trong giải đấu.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeroStat label="Đã góp" value={formatCtom(data.totalCtom)} />
              <HeroStat label="Sở hữu" value={`${data.ownedItems.length} món`} />
              <HeroStat label="Đang đeo" value={`${equippedCount}/5`} />
              <HeroStat
                label="Hạng CTOM"
                value={myCtomRank ? `#${myCtomRank}` : data.totalCtom > 0 ? "Ngoài top" : "Chưa có"}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/12 bg-white/10 p-4 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex items-center gap-4">
              <CosmeticAvatar
                image={user.image}
                name={user.name}
                cosmetics={data.equipped}
                size="xl"
              />
              <div className="min-w-0">
                <p className={`text-xl font-black leading-tight ${cosmeticNameplateClass(data.equipped)}`}>
                  {user.name}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-50/75">
                  {user.department || "Chưa có đơn vị"}
                </p>
                <div className="mt-2">
                  <CosmeticTitleBadge cosmetics={data.equipped} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}

      <CtomLeaderboard rows={data.leaderboard} />

      <ShopTryOnPanel />

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <InventoryPanel data={data} />

          <div data-guide-target="shop-tabs">
            <ShopCatalogTabs
              tabs={SHOP_TYPE_ORDER.map((type) => ({
                key: type,
                label: SHOP_TYPE_SHORT_LABELS[type],
                content: (
                  <CatalogSection
                    type={type}
                    items={data.items.filter((item) => item.type === type)}
                    user={{
                      image: tryOnUser.image,
                      name: tryOnUser.name,
                      department: tryOnUser.department,
                    }}
                    ownedItemIds={data.ownedItemIds}
                    equipped={data.equipped}
                  />
                ),
              }))}
            />
          </div>
        </div>

        <aside className="min-w-0 space-y-5 2xl:sticky 2xl:top-28 2xl:self-start">
          <RecentTransactions rows={data.recentTransactions} />
        </aside>
      </section>
      </div>
    </ShopTryOnProvider>
  );
}

function toTryOnItem(
  item: Pick<ShopItem, "id" | "slug" | "type" | "rarity" | "name" | "visualKey">,
): ShopTryOnItem {
  return {
    id: item.id,
    slug: item.slug,
    type: item.type as ShopTryOnItem["type"],
    rarity: item.rarity,
    name: item.name,
    visualKey: item.visualKey,
  };
}

function toTryOnCosmetics(equipped: EquippedCosmetics): ShopTryOnCosmetics {
  return Object.fromEntries(
    SHOP_TYPE_ORDER.flatMap((type) => {
      const item = equipped[type];
      return item ? [[type, toTryOnItem(item)]] : [];
    }),
  ) as ShopTryOnCosmetics;
}

function getNotice(params: Record<string, string | string[] | undefined>) {
  const notice = typeof params.notice === "string" ? params.notice : "";
  if (notice === "purchased") {
    return {
      tone: "success" as const,
      message: "Đã mua và tự trang bị vật phẩm. CTOM của bạn đã được ghi nhận.",
    };
  }
  if (notice === "equipped") {
    return {
      tone: "success" as const,
      message: "Đã trang bị vật phẩm.",
    };
  }
  if (notice === "unequipped") {
    return {
      tone: "neutral" as const,
      message: "Đã tháo vật phẩm.",
    };
  }
  if (notice === "error") {
    const message =
      typeof params.message === "string"
        ? params.message
        : "Không thực hiện được thao tác.";
    return { tone: "danger" as const, message };
  }
  return null;
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "danger" | "neutral";
}) {
  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    danger: "border-red-200 bg-red-50 text-red-800",
    neutral: "border-slate-200 bg-white text-slate-700",
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm shadow-slate-950/5 ${toneClass}`}>
      {children}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/12">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/70">
        {label}
      </p>
      <p className="mt-1 text-lg font-black leading-tight text-white">{value}</p>
    </div>
  );
}

function InventoryPanel({ data }: { data: ShopPageData }) {
  return (
    <section
      id="shop-inventory"
      className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 sm:p-5"
      data-guide-target="shop-inventory"
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            <PackageCheck size={14} />
            Tủ đồ
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Đang trang bị</h2>
        </div>
        <p className="text-xs font-black text-emerald-800 sm:text-sm">
          {data.ownedItems.length} món
        </p>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pb-0 xl:grid-cols-5">
        {SHOP_TYPE_ORDER.map((type) => {
          const item = data.equipped[type];
          return (
            <div
              key={type}
              className="flex min-w-[120px] shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:min-w-0 sm:rounded-2xl sm:p-3"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
                {SHOP_TYPE_LABELS[type]}
              </p>
              <p className="mt-1 text-xs font-black leading-4 text-slate-950 sm:min-h-10 sm:text-sm sm:leading-5">
                {item?.name ?? "—"}
              </p>
              {item && (
                <form action={unequipShopItemAction} className="mt-auto pt-2">
                  <input type="hidden" name="type" value={type} />
                  <button
                    className="w-full rounded-lg bg-white px-2 py-1.5 text-[10px] font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs"
                    data-testid={`unequip-${type}`}
                  >
                    Tháo
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CatalogSection({
  type,
  items,
  user,
  ownedItemIds,
  equipped,
}: {
  type: ShopItemType;
  items: ShopItem[];
  user: { image: string | null; name: string; department: string };
  ownedItemIds: Set<string>;
  equipped: EquippedCosmetics;
}) {
  const meta = SHOP_SECTION_META[type];
  const Icon = meta.Icon;
  const sortedItems = [...items].sort(compareShopItems);

  return (
    <section id={`shop-${type}`} className="scroll-mt-28">
      <div className={`mb-3 rounded-2xl border px-3 py-3 shadow-sm ${meta.headerClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 shadow-sm ${meta.iconClass}`}>
              <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Shop
              </p>
              <h2 className="truncate text-[1.7rem] font-black leading-tight text-slate-950 sm:text-2xl">
                {SHOP_TYPE_LABELS[type]}
              </h2>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ring-1 shadow-sm ${meta.countClass}`}>
            {sortedItems.length} món
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {sortedItems.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            user={user}
            owned={ownedItemIds.has(item.id)}
            equipped={equipped}
          />
        ))}
      </div>
    </section>
  );
}

const RARITY_SORT_ORDER: Record<string, number> = {
  COMMON: 10,
  RARE: 20,
  EPIC: 30,
  MYTHIC: 40,
  LEGENDARY: 50,
};

function compareShopItems(a: ShopItem, b: ShopItem) {
  return (
    (RARITY_SORT_ORDER[a.rarity] ?? 999) -
      (RARITY_SORT_ORDER[b.rarity] ?? 999) ||
    a.priceCtom - b.priceCtom ||
    a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name, "vi")
  );
}

const RARITY_CARD_GRADIENT: Record<string, string> = {
  COMMON: "from-slate-300 via-slate-200 to-slate-300",
  RARE: "from-emerald-500 via-teal-400 to-emerald-500",
  EPIC: "from-violet-500 via-fuchsia-400 to-violet-500",
  MYTHIC: "from-rose-500 via-pink-400 to-rose-500",
  LEGENDARY: "from-amber-500 via-yellow-200 to-orange-500",
};

const RARITY_CARD_RING: Record<string, string> = {
  COMMON: "border-slate-200",
  RARE: "border-emerald-300",
  EPIC: "border-violet-300 shop-card-epic",
  MYTHIC: "border-rose-300 shop-card-mythic",
  LEGENDARY: "border-amber-400 shop-card-legendary",
};

const RARITY_CARD_SHADOW: Record<string, string> = {
  COMMON: "hover:shadow-slate-950/8",
  RARE: "shadow-emerald-500/8 hover:shadow-emerald-500/18",
  EPIC: "shadow-violet-500/12 hover:shadow-violet-500/25",
  MYTHIC: "shadow-rose-500/15 hover:shadow-rose-500/28",
  LEGENDARY: "shadow-amber-500/20 hover:shadow-amber-500/35",
};

const RARITY_CARD_BG: Record<string, string> = {
  COMMON: "bg-white",
  RARE: "bg-gradient-to-br from-white via-white to-emerald-50/50",
  EPIC: "bg-gradient-to-br from-white via-violet-50/30 to-fuchsia-50/40",
  MYTHIC: "bg-gradient-to-br from-white via-rose-50/30 to-pink-50/40",
  LEGENDARY: "bg-[radial-gradient(circle_at_18%_0%,rgba(255,247,237,0.96),transparent_34%),radial-gradient(circle_at_88%_15%,rgba(251,191,36,0.34),transparent_32%),linear-gradient(135deg,#fff7ed,#fffbeb_44%,#fef3c7)]",
};

function ShopItemCard({
  item,
  user,
  owned,
  equipped,
}: {
  item: ShopItem;
  user: { image: string | null; name: string; department: string };
  owned: boolean;
  equipped: EquippedCosmetics;
}) {
  const previewCosmetics: EquippedCosmetics = { [item.type]: item };
  const isEquipped = equipped[item.type]?.id === item.id;
  const tryOnItem = toTryOnItem(item);
  const isLegendary = item.rarity === "LEGENDARY";
  const isWings = item.type === ShopItemType.AVATAR_WINGS;
  const avatarShowcase =
    item.type === ShopItemType.AVATAR_FRAME ||
    isWings ||
    item.type === ShopItemType.AVATAR_AURA;
  const showcaseClass =
    isLegendary && isWings
      ? "shop-wing-stage shop-legendary-wings-showcase flex h-[14.5rem] min-h-[14.5rem] items-center justify-center px-5 py-7 sm:h-[16rem] sm:min-h-[16rem] sm:px-6 sm:py-8 lg:h-full lg:min-h-0 lg:px-5 lg:py-6 xl:px-6"
      : isLegendary
        ? "flex h-[12.5rem] min-h-[12.5rem] items-center justify-center px-4 py-6 sm:h-[14rem] sm:min-h-[14rem] sm:px-5 sm:py-7 lg:h-full lg:min-h-0 lg:px-5 lg:py-6"
        : isWings
      ? "shop-wing-stage flex h-36 min-h-36 items-center justify-center px-4 py-5 sm:h-44 sm:min-h-44 sm:px-5 sm:py-6 lg:h-full lg:min-h-0 lg:px-4 lg:py-4"
      : "flex h-32 min-h-32 items-center justify-center px-3 py-4 sm:h-36 sm:min-h-36 sm:px-4 sm:py-5 lg:h-full lg:min-h-0 lg:px-3 lg:py-4";
  const cardLayoutClass = isLegendary && isWings
    ? "shop-item-card-legendary shop-item-card-wings lg:grid lg:min-h-[300px] lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-6 lg:gap-y-4 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] xl:gap-x-7"
    : isLegendary
    ? "shop-item-card-legendary lg:grid lg:min-h-[260px] lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-6 lg:gap-y-4"
    : isWings
      ? "shop-item-card-wings lg:grid lg:min-h-[230px] lg:grid-cols-[minmax(176px,210px)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-5 lg:gap-y-3"
    : "lg:grid lg:min-h-[210px] lg:grid-cols-[132px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-4 lg:gap-y-3";

  return (
    <article
      id={`item-${item.slug}`}
      data-shop-rarity={item.rarity}
      data-shop-type={item.type}
      data-visual-key={item.visualKey}
      className={`group relative scroll-mt-28 overflow-hidden rounded-2xl border-2 sm:rounded-3xl ${RARITY_CARD_RING[item.rarity] ?? "border-slate-200"} ${RARITY_CARD_BG[item.rarity] ?? "bg-white"} p-3 shadow-md transition hover:-translate-y-1 hover:shadow-xl sm:p-4 ${cardLayoutClass} ${RARITY_CARD_SHADOW[item.rarity] ?? ""} ${isLegendary ? "shop-card-legendary-premium lg:col-span-2" : ""}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 ${
        item.rarity === "LEGENDARY" || item.rarity === "MYTHIC" ? "h-1.5" : item.rarity === "EPIC" ? "h-1.5" : "h-1"
      } bg-gradient-to-r ${RARITY_CARD_GRADIENT[item.rarity] ?? "from-slate-400 to-slate-300"}`} />
      {isLegendary && (
        <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-100" style={{ background: "radial-gradient(circle at 50% 0%, rgba(251,191,36,0.18), transparent 48%)" }} />
      )}
      {item.rarity === "MYTHIC" && (
        <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(circle at 50% 0%, rgba(244,63,94,0.10), transparent 50%)" }} />
      )}
      {item.rarity === "EPIC" && (
        <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.10), transparent 50%)" }} />
      )}
      <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2 lg:col-start-2 lg:row-start-1">
        <span className={`inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${
          isLegendary
            ? "shop-card-legendary-badge bg-gradient-to-r from-amber-200 via-yellow-100 to-orange-200 text-amber-950 ring-amber-400"
            : item.rarity === "MYTHIC"
              ? "bg-gradient-to-r from-rose-100 to-pink-100 text-rose-900 ring-rose-300"
              : item.rarity === "EPIC"
                ? "bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-900 ring-violet-300"
                : SHOP_RARITY_TONES[item.rarity]
        }`}>
          {isLegendary && <Sparkles size={10} className="hidden sm:inline text-amber-700" />}
          {item.rarity === "MYTHIC" && <Sparkles size={10} className="hidden sm:inline text-rose-600" />}
          {item.rarity === "EPIC" && <Sparkles size={10} className="hidden sm:inline text-violet-600" />}
          {SHOP_RARITY_LABELS[item.rarity]}
        </span>
        <span className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black tabular-nums sm:rounded-2xl sm:text-sm ${
          isLegendary
            ? "shop-card-legendary-price bg-gradient-to-r from-amber-700 via-yellow-400 to-orange-600 text-amber-950 shadow-lg shadow-amber-500/30 ring-1 ring-yellow-200/70"
            : item.rarity === "MYTHIC"
              ? "bg-gradient-to-r from-rose-700 via-pink-600 to-rose-700 text-white shadow-lg shadow-rose-500/20 ring-1 ring-rose-400/30"
              : item.rarity === "EPIC"
                ? "bg-gradient-to-r from-violet-700 to-purple-700 text-white shadow-lg shadow-violet-500/20 ring-1 ring-violet-400/30"
                : item.rarity === "RARE"
                  ? "bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-md shadow-emerald-500/15"
                  : "bg-slate-800 text-slate-100"
        }`}>
          {formatCtom(item.priceCtom)}
        </span>
        <h3 className={`basis-full break-words text-base font-black leading-tight sm:text-lg xl:text-[17px] ${
          isLegendary
            ? "shop-card-legendary-title bg-gradient-to-r from-amber-800 via-yellow-600 to-orange-700 bg-clip-text text-transparent"
            : item.rarity === "MYTHIC"
              ? "bg-gradient-to-r from-rose-700 via-pink-600 to-rose-700 bg-clip-text text-transparent"
              : item.rarity === "EPIC"
                ? "text-violet-950"
                : "text-slate-950"
        }`}>
          {item.name}
        </h3>
      </div>

      <div
        className={`relative mt-3 overflow-hidden rounded-xl sm:mt-4 sm:rounded-2xl lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:h-full lg:min-h-0 ${
          avatarShowcase
            ? (isLegendary
                ? "bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_40%),linear-gradient(135deg,#1c1917,#292524_30%,#1c1917)] ring-1 ring-amber-500/20"
                : item.rarity === "MYTHIC"
                  ? "bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.20),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.10),transparent_40%),linear-gradient(135deg,#1c1017,#2a1520_30%,#1c1017)] ring-1 ring-rose-500/20"
                  : item.rarity === "EPIC"
                    ? "bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.20),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.10),transparent_40%),linear-gradient(135deg,#1e1b4b,#0f172a_50%,#1e1b4b)] ring-1 ring-violet-500/20"
                    : item.rarity === "RARE"
                      ? "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_48%),linear-gradient(135deg,#ecfdf5,#f0fdf4_50%,#ecfdf5)] ring-1 ring-emerald-200"
                      : "bg-[linear-gradient(135deg,#f8fafc,#f1f5f9)] ring-1 ring-slate-200")
            : (isLegendary
                ? "bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_50%),linear-gradient(135deg,#fffbeb,#fef3c7_50%,#fffbeb)] ring-1 ring-amber-200"
                : item.rarity === "MYTHIC"
                  ? "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.10),transparent_50%),linear-gradient(135deg,#fff1f2,#ffe4e6_50%,#fff1f2)] ring-1 ring-rose-200"
                  : item.rarity === "EPIC"
                    ? "bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.10),transparent_50%),linear-gradient(135deg,#f5f3ff,#ede9fe_50%,#f5f3ff)] ring-1 ring-violet-200"
                    : item.rarity === "RARE"
                      ? "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_48%),linear-gradient(135deg,#ecfdf5,#f0fdf4_50%,#ecfdf5)] ring-1 ring-emerald-200"
                      : "bg-[linear-gradient(135deg,#f8fafc,#f1f5f9)] ring-1 ring-slate-200")
        } ${avatarShowcase ? showcaseClass : "p-3 sm:p-4 lg:p-3"} ${isLegendary ? "shop-card-legendary-stage" : ""}`}
      >
        {isLegendary && (
          <>
            <span className="shop-legendary-stage-aura" aria-hidden="true" />
            <span className="shop-legendary-stage-beam" aria-hidden="true" />
            <span className="shop-legendary-stage-sparks" aria-hidden="true" />
          </>
        )}
        {isWings && (
          <>
            <span className="shop-wing-depth" aria-hidden="true" />
            <span className="shop-wing-trail" aria-hidden="true" />
            <span className="shop-wing-particles" aria-hidden="true" />
            <span className="shop-wing-flash" aria-hidden="true" />
          </>
        )}
        {avatarShowcase ? (
          <CosmeticAvatar
            image={user.image}
            name={user.name}
            cosmetics={previewCosmetics}
            size={isLegendary ? "xl" : "lg"}
            className={`${isWings ? "shop-wing-avatar" : ""} ${isLegendary ? "shop-legendary-avatar" : ""}`}
          />
        ) : (
          <div className={`relative z-10 flex h-full items-center gap-3 sm:gap-4 xl:flex-col xl:justify-center xl:gap-2 xl:text-center ${isLegendary ? "shop-legendary-profile-preview" : ""}`}>
            <CosmeticAvatar
              image={user.image}
              name={user.name}
              cosmetics={previewCosmetics}
              size={isLegendary ? "lg" : "md"}
              className={`${isLegendary ? "shop-legendary-avatar" : ""} sm:!h-auto sm:!w-auto`}
            />
            <div className="min-w-0">
              <p className={`line-clamp-2 text-sm font-black leading-tight text-slate-950 sm:text-base xl:text-xs ${cosmeticNameplateClass(previewCosmetics)}`}>
                {user.name}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-slate-500 sm:mt-1 sm:text-xs xl:text-[10px]">
                {user.department || "Chưa có đơn vị"}
              </p>
              <div className="mt-1.5 sm:mt-2">
                <CosmeticTitleBadge cosmetics={previewCosmetics} compact />
              </div>
            </div>
          </div>
        )}
      </div>

      <p className={`mt-3 break-words px-14 text-sm font-semibold leading-5 sm:px-0 lg:col-start-2 lg:row-start-2 lg:mt-0 ${
        isLegendary ? "text-amber-950/80" : item.rarity === "MYTHIC" ? "text-rose-900/65" : item.rarity === "EPIC" ? "text-violet-900/60" : "text-slate-600"
      }`}>
        {item.description}
      </p>

      <div className="mt-3 sm:mt-4 lg:col-start-2 lg:row-start-3 lg:mt-0">
        {isEquipped ? (
          <div className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-black text-emerald-800 ring-1 ring-emerald-100 sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm">
            <Check size={14} className="sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Đang dùng</span>
            <span className="sm:hidden">Đang dùng</span>
          </div>
        ) : owned ? (
          <div className="grid grid-cols-2 gap-2">
            <ShopTryOnButton item={tryOnItem} />
            <form action={equipShopItemAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <button
                className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-black text-white shadow-lg shadow-slate-950/10 hover:bg-emerald-800 sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
                data-testid={`equip-${item.slug}`}
              >
                <Sparkles size={14} className="sm:h-4 sm:w-4" />
                Trang bị
              </button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <ShopTryOnButton item={tryOnItem} />
            <ShopPurchaseForm
              itemId={item.id}
              itemSlug={item.slug}
              itemName={item.name}
              priceLabel={formatCtom(item.priceCtom)}
              rarity={item.rarity}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function CtomLeaderboard({ rows }: { rows: ShopPageData["leaderboard"] }) {
  const leaderRows = rows.map((row) => (
    <div
      key={row.id}
      className="grid min-h-[4.5rem] grid-cols-[2rem_5.75rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-3 py-2.5 sm:grid-cols-[2.25rem_6.75rem_minmax(0,1fr)_auto] sm:gap-x-3 sm:px-4 sm:py-3"
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black sm:h-9 sm:w-9 sm:rounded-2xl sm:text-sm ${
          row.rank === 1
            ? "bg-amber-300 text-amber-950"
            : row.rank === 2
              ? "bg-slate-200 text-slate-950"
              : row.rank === 3
                ? "bg-orange-200 text-orange-950"
                : "bg-emerald-950 text-white"
        }`}
      >
        #{row.rank}
      </div>
      <div className="relative flex h-14 min-w-0 items-center justify-center overflow-visible sm:h-16">
        <CosmeticAvatar
          image={row.image}
          name={row.name}
          cosmetics={row.cosmetics}
          size="sm"
          effectIntensity="compact"
        />
      </div>
      <div className="relative z-10 min-w-0">
        <p className={`truncate text-sm font-black text-slate-950 ${cosmeticNameplateClass(row.cosmetics)}`}>
          {row.name}
        </p>
        <p className="truncate text-xs font-semibold text-slate-500">
          {row.itemCount} món
        </p>
      </div>
      <p className="relative z-10 col-span-2 col-start-2 text-xs font-black tabular-nums text-emerald-800 sm:col-auto sm:text-sm">
        {formatCtom(row.totalCtom)}
      </p>
    </div>
  ));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5 sm:rounded-3xl">
      <div className="bg-slate-950 px-3 py-3 text-white sm:px-4 sm:py-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-amber-200">
          <Trophy size={14} />
          BXH CTOM
        </p>
        <h2 className="mt-1 text-xl font-black sm:text-2xl">Top đóng góp shop</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm font-semibold text-slate-500">
            Chưa ai mở hàng CTOM.
          </p>
        ) : (
          <ExpandableList visibleCount={3} totalCount={rows.length}>
            {leaderRows}
          </ExpandableList>
        )}
      </div>
    </section>
  );
}

function RecentTransactions({
  rows,
}: {
  rows: ShopPageData["recentTransactions"];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
        <Crown size={14} />
        Lịch sử CTOM
      </p>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">Chưa có giao dịch.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-black text-slate-950">
                  {row.item?.name ?? row.note ?? "CTOM"}
                </p>
                <p className="text-sm font-black tabular-nums text-emerald-800">
                  +{formatCtom(row.amount)}
                </p>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {formatVietnamTime(row.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
