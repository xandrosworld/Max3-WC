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
import { ShopPurchaseForm } from "@/components/shop-purchase-form";
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

  return (
    <div className="space-y-6" data-testid="shop-page">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-slate-950 text-white shadow-xl shadow-emerald-950/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(52,211,153,0.28),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(251,191,36,0.2),transparent_26%),linear-gradient(135deg,#052e2b,#08111f_62%,#111827)]" />
        <div className="relative grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:py-7">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 ring-1 ring-white/15">
              <ShoppingBag size={14} />
              CTOM Shop
            </p>
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

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <InventoryPanel data={data} />

          <nav
            className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-2 sm:shadow-sm sm:shadow-slate-950/5"
            aria-label="Danh mục shop"
          >
            {SHOP_TYPE_ORDER.map((type) => (
              <a
                key={type}
                href={`#shop-${type}`}
                className="inline-flex min-h-11 shrink-0 items-center rounded-xl border-2 border-emerald-800 bg-white px-3.5 py-2 text-sm font-black text-slate-950 shadow-sm shadow-slate-950/5 hover:-translate-y-0.5"
              >
                {SHOP_TYPE_SHORT_LABELS[type]}
              </a>
            ))}
          </nav>

          {SHOP_TYPE_ORDER.map((type) => (
            <CatalogSection
              key={type}
              type={type}
              items={data.items.filter((item) => item.type === type)}
              user={{
                image: user.image,
                name: user.name,
                department: user.department,
              }}
              ownedItemIds={data.ownedItemIds}
              equipped={data.equipped}
            />
          ))}
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-28 lg:self-start">
          <CtomLeaderboard rows={data.leaderboard} />
          <RecentTransactions rows={data.recentTransactions} />
        </aside>
      </section>
    </div>
  );
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
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            <PackageCheck size={14} />
            Tủ đồ
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Đang trang bị</h2>
        </div>
        <p className="text-sm font-black text-emerald-800">
          {data.ownedItems.length} vật phẩm đã sở hữu
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {SHOP_TYPE_ORDER.map((type) => {
          const item = data.equipped[type];
          return (
            <div
              key={type}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                {SHOP_TYPE_LABELS[type]}
              </p>
              <p className="mt-1 min-h-10 text-sm font-black leading-5 text-slate-950">
                {item?.name ?? "Chưa trang bị"}
              </p>
              {item && (
                <form action={unequipShopItemAction} className="mt-3">
                  <input type="hidden" name="type" value={type} />
                  <button
                    className="w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
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
            {items.length} món
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
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

const RARITY_CARD_GRADIENT: Record<string, string> = {
  COMMON: "from-slate-400 via-slate-300 to-slate-400",
  RARE: "from-emerald-500 via-teal-400 to-emerald-500",
  EPIC: "from-violet-500 via-fuchsia-400 to-violet-500",
  LEGENDARY: "from-amber-400 via-yellow-300 to-orange-400",
};

const RARITY_CARD_RING: Record<string, string> = {
  COMMON: "border-slate-200",
  RARE: "border-emerald-200",
  EPIC: "border-violet-200",
  LEGENDARY: "border-amber-200",
};

const RARITY_CARD_SHADOW: Record<string, string> = {
  COMMON: "hover:shadow-slate-950/8",
  RARE: "hover:shadow-emerald-950/10",
  EPIC: "hover:shadow-violet-950/12",
  LEGENDARY: "hover:shadow-amber-950/15",
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
  const avatarShowcase =
    item.type === ShopItemType.AVATAR_FRAME ||
    item.type === ShopItemType.AVATAR_WINGS ||
    item.type === ShopItemType.AVATAR_AURA;
  const showcaseClass =
    item.type === ShopItemType.AVATAR_WINGS
      ? "flex min-h-48 items-center justify-center px-4 py-7"
      : "flex min-h-36 items-center justify-center px-4 py-5";

  return (
    <article
      id={`item-${item.slug}`}
      className={`group relative scroll-mt-28 overflow-hidden rounded-3xl border ${RARITY_CARD_RING[item.rarity] ?? "border-slate-200"} bg-white p-4 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:shadow-lg ${RARITY_CARD_SHADOW[item.rarity] ?? ""}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${RARITY_CARD_GRADIENT[item.rarity] ?? "from-slate-400 to-slate-300"}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${SHOP_RARITY_TONES[item.rarity]}`}>
            {SHOP_RARITY_LABELS[item.rarity]}
          </span>
          <h3 className="mt-2 text-lg font-black leading-tight text-slate-950">
            {item.name}
          </h3>
        </div>
        <span className={`rounded-2xl px-3 py-2 text-sm font-black tabular-nums ${
          item.rarity === "LEGENDARY"
            ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-amber-950 shadow-lg shadow-amber-500/20"
            : item.rarity === "EPIC"
              ? "bg-gradient-to-r from-violet-700 to-purple-700 text-white shadow-lg shadow-violet-500/15"
              : "bg-slate-950 text-white"
        }`}>
          {formatCtom(item.priceCtom)}
        </span>
      </div>

      <div
        className={`mt-4 rounded-2xl ${
          item.rarity === "LEGENDARY"
            ? "bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_48%),linear-gradient(135deg,#1c1917,#1e1b4b_50%,#1c1917)]"
            : item.rarity === "EPIC"
              ? "bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.16),transparent_48%),linear-gradient(135deg,#1e1b4b,#0f172a_50%,#1e1b4b)]"
              : "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_48%),linear-gradient(135deg,#f8fafc,#fff7ed)]"
        } ${avatarShowcase ? showcaseClass : "p-4"}`}
      >
        {avatarShowcase ? (
          <CosmeticAvatar
            image={user.image}
            name={user.name}
            cosmetics={previewCosmetics}
            size={item.type === ShopItemType.AVATAR_WINGS ? "xl" : "lg"}
          />
        ) : (
          <div className="flex items-center gap-4">
            <CosmeticAvatar
              image={user.image}
              name={user.name}
              cosmetics={previewCosmetics}
              size="lg"
            />
            <div className="min-w-0">
              <p className={`font-black leading-tight text-slate-950 ${cosmeticNameplateClass(previewCosmetics)}`}>
                {user.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {user.department || "Chưa có đơn vị"}
              </p>
              <div className="mt-2">
                <CosmeticTitleBadge cosmetics={previewCosmetics} compact />
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 min-h-10 text-sm font-semibold leading-5 text-slate-600">
        {item.description}
      </p>

      <div className="mt-4">
        {isEquipped ? (
          <div className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
            <Check size={16} />
            Đang dùng
          </div>
        ) : owned ? (
          <form action={equipShopItemAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 hover:bg-emerald-800"
              data-testid={`equip-${item.slug}`}
            >
              <Sparkles size={16} />
              Trang bị
            </button>
          </form>
        ) : (
          <ShopPurchaseForm
            itemId={item.id}
            itemSlug={item.slug}
            itemName={item.name}
            priceLabel={formatCtom(item.priceCtom)}
          />
        )}
      </div>
    </article>
  );
}

function CtomLeaderboard({ rows }: { rows: ShopPageData["leaderboard"] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="bg-slate-950 px-4 py-4 text-white">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-amber-200">
          <Trophy size={14} />
          BXH CTOM
        </p>
        <h2 className="mt-1 text-2xl font-black">Top đóng góp shop</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm font-semibold text-slate-500">
            Chưa ai mở hàng CTOM.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className={`flex h-9 min-w-9 items-center justify-center rounded-2xl text-sm font-black ${
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
              <CosmeticAvatar
                image={row.image}
                name={row.name}
                cosmetics={row.cosmetics}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-black text-slate-950 ${cosmeticNameplateClass(row.cosmetics)}`}>
                  {row.name}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {row.itemCount} món
                </p>
              </div>
              <p className="text-sm font-black tabular-nums text-emerald-800">
                {formatCtom(row.totalCtom)}
              </p>
            </div>
          ))
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
