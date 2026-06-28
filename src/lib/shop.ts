import {
  CtomTransactionType,
  ShopItemRarity,
  ShopItemType,
  type ShopItem,
} from "@prisma/client";
import { prisma } from "./prisma";

export const SHOP_TYPE_LABELS: Record<ShopItemType, string> = {
  AVATAR_FRAME: "Viền BXH",
  AVATAR_WINGS: "Cánh avatar",
  AVATAR_AURA: "Hào quang",
  TITLE: "Danh hiệu",
  NAMEPLATE: "Bảng tên",
};

export const SHOP_TYPE_SHORT_LABELS: Record<ShopItemType, string> = {
  AVATAR_FRAME: "Viền",
  AVATAR_WINGS: "Cánh",
  AVATAR_AURA: "Aura",
  TITLE: "Danh hiệu",
  NAMEPLATE: "Bảng tên",
};

export const SHOP_TYPE_ORDER: ShopItemType[] = [
  ShopItemType.AVATAR_FRAME,
  ShopItemType.AVATAR_WINGS,
  ShopItemType.AVATAR_AURA,
  ShopItemType.TITLE,
  ShopItemType.NAMEPLATE,
];

export const SHOP_RARITY_LABELS: Record<ShopItemRarity, string> = {
  COMMON: "Thường",
  RARE: "Hiếm",
  EPIC: "Sử thi",
  MYTHIC: "Thượng cổ",
  LEGENDARY: "Huyền thoại",
};

export const SHOP_RARITY_TONES: Record<ShopItemRarity, string> = {
  COMMON: "bg-slate-50 text-slate-700 ring-slate-200",
  RARE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  EPIC: "bg-violet-50 text-violet-800 ring-violet-200",
  MYTHIC: "bg-rose-50 text-rose-800 ring-rose-200",
  LEGENDARY: "bg-amber-50 text-amber-800 ring-amber-200",
};

export type CosmeticItem = Pick<
  ShopItem,
  "id" | "slug" | "type" | "rarity" | "name" | "visualKey"
>;

export type EquippedCosmetics = Partial<Record<ShopItemType, CosmeticItem>>;

type CatalogItem = {
  slug: string;
  type: ShopItemType;
  rarity: ShopItemRarity;
  name: string;
  description: string;
  priceCtom: number;
  visualKey: string;
  sortOrder: number;
};

export const DEFAULT_SHOP_ITEMS: CatalogItem[] = [
  /* ── Ranking Row Frames ────────────────────────────────── */
  {
    slug: "frame-silver-jade",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.COMMON,
    name: "Viền Bạch Ngọc",
    description: "Bạc ngọc mỏng, sạch mắt, chạy nhẹ quanh hàng.",
    priceCtom: 11_111,
    visualKey: "silver-jade",
    sortOrder: 5,
  },
  {
    slug: "frame-emerald-glory",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.RARE,
    name: "Viền Lục Bảo",
    description: "Xanh ngọc sáng, nổi bật mà vẫn gọn.",
    priceCtom: 22_222,
    visualKey: "emerald-glory",
    sortOrder: 10,
  },
  {
    slug: "frame-celestial-halo",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.RARE,
    name: "Viền Thiên Giới",
    description: "Sao xanh trắng nhấp nháy quanh dòng xếp hạng.",
    priceCtom: 28_888,
    visualKey: "celestial-halo",
    sortOrder: 15,
  },
  {
    slug: "frame-neon-storm",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.EPIC,
    name: "Viền Sấm Neon",
    description: "Điện tím xanh quét quanh viền, nhìn phát biết sử thi.",
    priceCtom: 39_999,
    visualKey: "neon-storm",
    sortOrder: 20,
  },
  {
    slug: "frame-royal-violet",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.EPIC,
    name: "Viền Hoàng Gia",
    description: "Tím vàng sang, có ánh kim chạy quanh khung.",
    priceCtom: 49_999,
    visualKey: "royal-violet",
    sortOrder: 30,
  },
  {
    slug: "frame-dragon-crest",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.EPIC,
    name: "Viền Rồng Vương",
    description: "Vảy đỏ vàng chạy quanh hàng, khí chất rồng vương.",
    priceCtom: 55_555,
    visualKey: "dragon-crest",
    sortOrder: 35,
  },
  {
    slug: "frame-ancient-divine",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.MYTHIC,
    name: "Viền Cổ Thần",
    description: "Rune đỏ hồng thức tỉnh quanh viền, chất cổ thần rõ rệt.",
    priceCtom: 55_555,
    visualKey: "ancient-divine",
    sortOrder: 37,
  },
  {
    slug: "frame-sunfire-legend",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Viền Thái Dương",
    description: "Lửa mặt trời chạy bốn cạnh, sáng nhất bảng.",
    priceCtom: 99_999,
    visualKey: "sunfire-legend",
    sortOrder: 40,
  },
  /* ── Avatar Wings ──────────────────────────────────────── */
  {
    slug: "wings-frost-crystal",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.RARE,
    name: "Cánh Băng Giá",
    description: "Pha lê lạnh, sáng trong và sắc cạnh.",
    priceCtom: 22_222,
    visualKey: "frost-crystal",
    sortOrder: 105,
  },
  {
    slug: "wings-emerald-sprint",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.RARE,
    name: "Cánh Thiên Thần",
    description: "Cánh trắng xanh mềm, nhẹ mà nổi.",
    priceCtom: 18_888,
    visualKey: "angel-soft",
    sortOrder: 102,
  },
  {
    slug: "wings-thunder-bolt",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.EPIC,
    name: "Cánh Lôi Điện",
    description: "Sét vàng giật nhịp, sắc và mạnh.",
    priceCtom: 39_999,
    visualKey: "thunder-bolt",
    sortOrder: 115,
  },
  {
    slug: "wings-aurora",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.EPIC,
    name: "Cánh Ác Quỷ",
    description: "Màng tím đỏ, vỗ gắt và gai góc.",
    priceCtom: 42_222,
    visualKey: "demon-night",
    sortOrder: 120,
  },
  {
    slug: "wings-dragon-scale",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.EPIC,
    name: "Cánh Rồng",
    description: "Cánh đỏ đen lớn, chậm mà uy lực.",
    priceCtom: 49_999,
    visualKey: "dragon-scale",
    sortOrder: 125,
  },
  {
    slug: "wings-galaxy-nebula",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.MYTHIC,
    name: "Cánh Thiên Hà",
    description: "Tinh vân và sao phủ quanh đôi cánh.",
    priceCtom: 55_555,
    visualKey: "galaxy-nebula",
    sortOrder: 128,
  },
  {
    slug: "wings-sunburst",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Cánh Phượng Hoàng",
    description: "Lửa phượng bung rộng, nhìn là biết huyền thoại.",
    priceCtom: 99_999,
    visualKey: "phoenix-flame",
    sortOrder: 130,
  },
  /* ── Avatar Auras ──────────────────────────────────────── */
  {
    slug: "aura-rune-circle",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.RARE,
    name: "Aura Phép Rune",
    description: "Vòng rune xanh xoay chậm, bí ẩn vừa đủ.",
    priceCtom: 24_999,
    visualKey: "rune-circle",
    sortOrder: 205,
  },
  {
    slug: "aura-clean-light",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.COMMON,
    name: "Aura Ánh Nhẹ",
    description: "Ánh mỏng sạch, hợp người thích tinh tế.",
    priceCtom: 11_111,
    visualKey: "clean-light",
    sortOrder: 202,
  },
  {
    slug: "aura-inferno-ring",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.EPIC,
    name: "Aura Lửa Cháy",
    description: "Vòng lửa nóng quanh avatar, nổi mà không rối.",
    priceCtom: 39_999,
    visualKey: "inferno-ring",
    sortOrder: 215,
  },
  {
    slug: "aura-golden-pulse",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.EPIC,
    name: "Aura Nhịp Vàng",
    description: "Ánh vàng nhấp nhẹ, sang mà gọn.",
    priceCtom: 35_555,
    visualKey: "golden-pulse",
    sortOrder: 212,
  },
  {
    slug: "aura-shadow-void",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.EPIC,
    name: "Aura Bóng Tối",
    description: "Vầng tím đen lan nhẹ, bí ẩn hơn hẳn.",
    priceCtom: 49_999,
    visualKey: "shadow-void",
    sortOrder: 225,
  },
  {
    slug: "aura-cosmic-orbit",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.MYTHIC,
    name: "Aura Quỹ Đạo",
    description: "Vòng sáng xoay quanh, cảm giác sưu tầm xịn.",
    priceCtom: 55_555,
    visualKey: "cosmic-orbit",
    sortOrder: 230,
  },
  {
    slug: "aura-royal-radiance",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Aura Vương Giả",
    description: "Ánh vàng kim orbit, bật chất huyền thoại.",
    priceCtom: 99_999,
    visualKey: "royal-radiance",
    sortOrder: 235,
  },
  /* ── Titles ────────────────────────────────────────────── */
  {
    slug: "title-supporter",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.COMMON,
    name: "Nhà Tài Trợ",
    description: "Dấu mốc đầu tiên của người góp shop.",
    priceCtom: 11_111,
    visualKey: "supporter",
    sortOrder: 305,
  },
  {
    slug: "title-ctom-founder",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.RARE,
    name: "Nhà Sưu Tầm CTOM",
    description: "Badge xanh gọn cho người bắt đầu lên đồ.",
    priceCtom: 22_222,
    visualKey: "ctom-founder",
    sortOrder: 310,
  },
  {
    slug: "title-big-spender",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.RARE,
    name: "Đại Gia CTOM",
    description: "Gắn lên tên là biết dân chơi CTOM chính hiệu.",
    priceCtom: 29_999,
    visualKey: "big-spender",
    sortOrder: 315,
  },
  {
    slug: "title-ctom-legend",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.EPIC,
    name: "Huyền Thoại CTOM",
    description: "Tím vàng nổi bật, đúng chất người chinh phục shop.",
    priceCtom: 39_999,
    visualKey: "ctom-legend",
    sortOrder: 318,
  },
  {
    slug: "title-fortune-god",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.EPIC,
    name: "Thần Tài CTOM",
    description: "Đỏ vàng rực rỡ, gọi may mắn lên tên.",
    priceCtom: 49_999,
    visualKey: "fortune-god",
    sortOrder: 319,
  },
  {
    slug: "title-ancient-master",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.MYTHIC,
    name: "Bậc Thầy CTOM",
    description: "Rune cổ đỏ hồng cho dân sưu tầm cứng.",
    priceCtom: 55_555,
    visualKey: "ancient-master",
    sortOrder: 325,
  },
  {
    slug: "title-shop-chairman",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Chủ Tịch Shop",
    description: "Danh hiệu vàng kim, đứng đâu cũng ra chủ tịch.",
    priceCtom: 99_999,
    visualKey: "shop-chairman",
    sortOrder: 330,
  },
  /* ── Nameplates ────────────────────────────────────────── */
  {
    slug: "nameplate-neon-underline",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.COMMON,
    name: "Bảng Tên Neon Glow",
    description: "Gạch neon xanh, gọn mà sáng.",
    priceCtom: 11_111,
    visualKey: "neon-underline",
    sortOrder: 405,
  },
  {
    slug: "nameplate-green-flash",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.RARE,
    name: "Bảng Tên Green Flash",
    description: "Nền xanh sáng, dễ đọc trên mọi màn hình.",
    priceCtom: 22_222,
    visualKey: "green-flash",
    sortOrder: 410,
  },
  {
    slug: "nameplate-cyber-edge",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.RARE,
    name: "Bảng Tên Cyber Edge",
    description: "Viền cyber tím xanh, sắc hơn rõ rệt.",
    priceCtom: 33_333,
    visualKey: "cyber-edge",
    sortOrder: 415,
  },
  {
    slug: "nameplate-goldline",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.EPIC,
    name: "Bảng Tên Goldline",
    description: "Đường vàng tinh gọn, thêm chất VIP mà không rối mắt.",
    priceCtom: 39_999,
    visualKey: "goldline",
    sortOrder: 420,
  },
  {
    slug: "nameplate-blood-ruby",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.MYTHIC,
    name: "Bảng Tên Huyết Ngọc",
    description: "Đỏ hồng huyền bí, nổi bật kiểu thượng cổ.",
    priceCtom: 55_555,
    visualKey: "blood-ruby",
    sortOrder: 422,
  },
  {
    slug: "nameplate-royal-gold",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Bảng Tên Royal Gold",
    description: "Vàng hoàng gia lấp lánh, khác hẳn phần còn lại.",
    priceCtom: 99_999,
    visualKey: "royal-gold",
    sortOrder: 425,
  },
];

export function formatCtom(amount: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(amount)} CTOM`;
}

export function toEquippedCosmeticsMap(
  equipped: Array<{ item: CosmeticItem | null }>,
): EquippedCosmetics {
  const result: EquippedCosmetics = {};
  for (const row of equipped) {
    if (!row.item) continue;
    result[row.item.type] = row.item;
  }
  return result;
}

export async function ensureDefaultShopCatalog() {
  await Promise.all(
    DEFAULT_SHOP_ITEMS.map((item) =>
      prisma.shopItem.upsert({
        where: { slug: item.slug },
        update: {
          type: item.type,
          rarity: item.rarity,
          name: item.name,
          description: item.description,
          priceCtom: item.priceCtom,
          visualKey: item.visualKey,
          sortOrder: item.sortOrder,
          isActive: true,
        },
        create: {
          slug: item.slug,
          type: item.type,
          rarity: item.rarity,
          name: item.name,
          description: item.description,
          priceCtom: item.priceCtom,
          visualKey: item.visualKey,
          sortOrder: item.sortOrder,
          isActive: true,
        },
      }),
    ),
  );
}

export async function getEquippedCosmetics(userId: string) {
  const equipped = await prisma.userCosmeticEquip.findMany({
    where: { userId },
    include: { item: true },
  });
  return toEquippedCosmeticsMap(equipped);
}

export async function getCtomTotal(userId: string) {
  const aggregate = await prisma.ctomTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return Math.max(0, aggregate._sum.amount ?? 0);
}

export async function getCtomLeaderboard(take = 12) {
  const users = await prisma.user.findMany({
    where: { role: "user", banned: false },
    orderBy: { name: "asc" },
    include: {
      ctomTransactions: { select: { amount: true } },
      shopInventory: { select: { id: true } },
      equippedCosmetics: { include: { item: true } },
    },
  });

  return users
    .map((user) => ({
      id: user.id,
      name: user.name,
      department: user.department,
      image: user.image,
      totalCtom: Math.max(
        0,
        user.ctomTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      ),
      itemCount: user.shopInventory.length,
      cosmetics: toEquippedCosmeticsMap(user.equippedCosmetics),
    }))
    .filter((row) => row.totalCtom > 0 || row.itemCount > 0)
    .sort(
      (a, b) =>
        b.totalCtom - a.totalCtom ||
        b.itemCount - a.itemCount ||
        a.name.localeCompare(b.name, "vi"),
    )
    .slice(0, take)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getShopPageData(userId: string) {
  await ensureDefaultShopCatalog();

  const [items, owned, equipped, recentTransactions, totalCtom, leaderboard] =
    await Promise.all([
      prisma.shopItem.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.userShopItem.findMany({
        where: { userId },
        include: { item: true },
        orderBy: { purchasedAt: "desc" },
      }),
      prisma.userCosmeticEquip.findMany({
        where: { userId },
        include: { item: true },
      }),
      prisma.ctomTransaction.findMany({
        where: { userId },
        include: { item: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      getCtomTotal(userId),
      getCtomLeaderboard(10),
    ]);

  return {
    items,
    ownedItemIds: new Set(owned.map((row) => row.itemId)),
    ownedItems: owned,
    equipped: toEquippedCosmeticsMap(equipped),
    recentTransactions,
    totalCtom,
    leaderboard,
  };
}

export async function purchaseShopItems(userId: string, itemIds: string[]) {
  const uniqueItemIds = Array.from(new Set(itemIds.filter(Boolean)));
  if (uniqueItemIds.length === 0) return [];

  return prisma.$transaction(async (tx) => {
    const results: Array<{ item: ShopItem; purchased: boolean }> = [];

    for (const itemId of uniqueItemIds) {
      const item = await tx.shopItem.findFirst({
        where: { id: itemId, isActive: true },
      });
      if (!item) throw new Error("Không tìm thấy vật phẩm trong shop.");

      const existing = await tx.userShopItem.findUnique({
        where: { userId_itemId: { userId, itemId } },
        include: { item: true },
      });
      if (existing) {
        await tx.userCosmeticEquip.upsert({
          where: { userId_type: { userId, type: existing.item.type } },
          update: { itemId, equippedAt: new Date() },
          create: { userId, type: existing.item.type, itemId },
        });
        results.push({ item, purchased: false });
        continue;
      }

      await tx.userShopItem.create({
        data: { userId, itemId },
      });
      await tx.ctomTransaction.create({
        data: {
          userId,
          itemId,
          amount: item.priceCtom,
          type: CtomTransactionType.PURCHASE,
          note: `Mua ${item.name}`,
        },
      });
      await tx.userCosmeticEquip.upsert({
        where: { userId_type: { userId, type: item.type } },
        update: { itemId, equippedAt: new Date() },
        create: { userId, type: item.type, itemId },
      });

      results.push({ item, purchased: true });
    }

    return results;
  });
}

export async function purchaseShopItem(userId: string, itemId: string) {
  const [result] = await purchaseShopItems(userId, [itemId]);
  if (!result) throw new Error("Không tìm thấy vật phẩm trong shop.");
  return result;
}

export async function equipShopItem(userId: string, itemId: string) {
  return prisma.$transaction(async (tx) => {
    const owned = await tx.userShopItem.findUnique({
      where: { userId_itemId: { userId, itemId } },
      include: { item: true },
    });
    if (!owned || !owned.item.isActive) {
      throw new Error("Bạn chưa sở hữu vật phẩm này.");
    }

    await tx.userCosmeticEquip.upsert({
      where: { userId_type: { userId, type: owned.item.type } },
      update: { itemId, equippedAt: new Date() },
      create: { userId, type: owned.item.type, itemId },
    });

    return owned.item;
  });
}

export async function unequipShopItem(userId: string, type: ShopItemType) {
  await prisma.userCosmeticEquip.deleteMany({
    where: { userId, type },
  });
}
