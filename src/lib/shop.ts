import {
  CtomTransactionType,
  ShopItemRarity,
  ShopItemType,
  type ShopItem,
} from "@prisma/client";
import { prisma } from "./prisma";

export const SHOP_TYPE_LABELS: Record<ShopItemType, string> = {
  AVATAR_FRAME: "Khung avatar",
  AVATAR_WINGS: "Cánh avatar",
  AVATAR_AURA: "Hào quang",
  TITLE: "Danh hiệu",
  NAMEPLATE: "Bảng tên",
};

export const SHOP_TYPE_SHORT_LABELS: Record<ShopItemType, string> = {
  AVATAR_FRAME: "Khung",
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
  LEGENDARY: "Huyền thoại",
};

export const SHOP_RARITY_TONES: Record<ShopItemRarity, string> = {
  COMMON: "bg-slate-50 text-slate-700 ring-slate-200",
  RARE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  EPIC: "bg-violet-50 text-violet-800 ring-violet-200",
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
  /* ── Avatar Frames ─────────────────────────────────────── */
  {
    slug: "frame-silver-jade",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.COMMON,
    name: "Khung Bạch Ngọc",
    description: "Viền bạc nhẹ phối ngọc xanh, sang trọng mà kiềm chế.",
    priceCtom: 15_555,
    visualKey: "silver-jade",
    sortOrder: 5,
  },
  {
    slug: "frame-emerald-glory",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.RARE,
    name: "Khung Lục Bảo",
    description: "Viền xanh sạch, sáng rõ trên mọi bảng xếp hạng.",
    priceCtom: 32_000,
    visualKey: "emerald-glory",
    sortOrder: 10,
  },
  {
    slug: "frame-celestial-halo",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.RARE,
    name: "Khung Thiên Giới",
    description: "Vòng hào quang trắng xanh bao quanh, nhẹ nhàng mà linh thiêng.",
    priceCtom: 38_000,
    visualKey: "celestial-halo",
    sortOrder: 15,
  },
  {
    slug: "frame-neon-storm",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.EPIC,
    name: "Khung Sấm Neon",
    description: "Viền điện xanh tím, hợp người thích nổi bật vừa đủ.",
    priceCtom: 48_000,
    visualKey: "neon-storm",
    sortOrder: 20,
  },
  {
    slug: "frame-royal-violet",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.EPIC,
    name: "Khung Hoàng Gia",
    description: "Tông tím vàng, nhìn có khí chất chủ tịch.",
    priceCtom: 52_000,
    visualKey: "royal-violet",
    sortOrder: 30,
  },
  {
    slug: "frame-dragon-crest",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.EPIC,
    name: "Khung Rồng Vương",
    description: "Viền đỏ vàng uy nghi, hoa văn rồng cuộn quanh khung.",
    priceCtom: 58_000,
    visualKey: "dragon-crest",
    sortOrder: 35,
  },
  {
    slug: "frame-sunfire-legend",
    type: ShopItemType.AVATAR_FRAME,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Khung Thái Dương",
    description: "Ánh vàng cam mạnh, dành cho người muốn đứng giữa sân khấu.",
    priceCtom: 168_888,
    visualKey: "sunfire-legend",
    sortOrder: 40,
  },
  /* ── Avatar Wings ──────────────────────────────────────── */
  {
    slug: "wings-frost-crystal",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.RARE,
    name: "Cánh Băng Giá",
    description: "Mảnh pha lê xanh nhạt, shimmer lạnh như gió đông.",
    priceCtom: 25_000,
    visualKey: "frost-crystal",
    sortOrder: 105,
  },
  {
    slug: "wings-emerald-sprint",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.RARE,
    name: "Cánh Thiên Thần",
    description: "Lông trắng xanh vỗ mềm, sáng mà không che mặt.",
    priceCtom: 20_000,
    visualKey: "angel-soft",
    sortOrder: 102,
  },
  {
    slug: "wings-thunder-bolt",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.EPIC,
    name: "Cánh Lôi Điện",
    description: "Tia sét giật từng nhịp, cạnh sắc và mạnh mẽ.",
    priceCtom: 45_000,
    visualKey: "thunder-bolt",
    sortOrder: 115,
  },
  {
    slug: "wings-aurora",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.EPIC,
    name: "Cánh Ác Quỷ",
    description: "Màng tím đỏ, nhịp vỗ gắt và có gai nhọn.",
    priceCtom: 48_000,
    visualKey: "demon-night",
    sortOrder: 120,
  },
  {
    slug: "wings-dragon-scale",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.EPIC,
    name: "Cánh Rồng",
    description: "Màng cánh lớn đỏ đen, vỗ chậm đầy uy lực.",
    priceCtom: 55_000,
    visualKey: "dragon-scale",
    sortOrder: 125,
  },
  {
    slug: "wings-galaxy-nebula",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Cánh Thiên Hà",
    description: "Sao và tinh vân bao quanh, vũ trụ nằm trên đôi cánh.",
    priceCtom: 78_888,
    visualKey: "galaxy-nebula",
    sortOrder: 128,
  },
  {
    slug: "wings-sunburst",
    type: ShopItemType.AVATAR_WINGS,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Cánh Phượng Hoàng",
    description: "Lông lửa bung rộng, có nhịp cháy nhẹ cực nổi.",
    priceCtom: 168_888,
    visualKey: "phoenix-flame",
    sortOrder: 130,
  },
  /* ── Avatar Auras ──────────────────────────────────────── */
  {
    slug: "aura-rune-circle",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.RARE,
    name: "Aura Phép Rune",
    description: "Vòng rune cổ xưa xoay chậm, toả sáng xanh dịu.",
    priceCtom: 28_000,
    visualKey: "rune-circle",
    sortOrder: 205,
  },
  {
    slug: "aura-clean-light",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.COMMON,
    name: "Aura Ánh Nhẹ",
    description: "Hào quang mỏng, đẹp kín đáo cho người thích gọn.",
    priceCtom: 18_000,
    visualKey: "clean-light",
    sortOrder: 202,
  },
  {
    slug: "aura-inferno-ring",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.EPIC,
    name: "Aura Lửa Cháy",
    description: "Lửa cháy quanh avatar, nóng bỏng nhưng không che mặt.",
    priceCtom: 42_000,
    visualKey: "inferno-ring",
    sortOrder: 215,
  },
  {
    slug: "aura-golden-pulse",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.EPIC,
    name: "Aura Nhịp Vàng",
    description: "Ánh vàng nhấp nhẹ quanh avatar, đủ sang mà không lố.",
    priceCtom: 38_000,
    visualKey: "golden-pulse",
    sortOrder: 212,
  },
  {
    slug: "aura-shadow-void",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.EPIC,
    name: "Aura Bóng Tối",
    description: "Bóng đêm tím đen lan toả, bí ẩn và đe doạ.",
    priceCtom: 50_000,
    visualKey: "shadow-void",
    sortOrder: 225,
  },
  {
    slug: "aura-cosmic-orbit",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Aura Quỹ Đạo",
    description: "Vòng sáng xoay quanh avatar, dành cho bộ sưu tập xịn.",
    priceCtom: 78_000,
    visualKey: "cosmic-orbit",
    sortOrder: 230,
  },
  {
    slug: "aura-royal-radiance",
    type: ShopItemType.AVATAR_AURA,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Aura Vương Giả",
    description: "Ánh vàng kim rực rỡ, hạt sáng orbit và beam xoay.",
    priceCtom: 168_888,
    visualKey: "royal-radiance",
    sortOrder: 235,
  },
  /* ── Titles ────────────────────────────────────────────── */
  {
    slug: "title-supporter",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.COMMON,
    name: "Nhà Tài Trợ",
    description: "Danh hiệu dành cho người bắt đầu đóng góp shop.",
    priceCtom: 15_000,
    visualKey: "supporter",
    sortOrder: 305,
  },
  {
    slug: "title-ctom-founder",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.RARE,
    name: "Nhà Sưu Tầm CTOM",
    description: "Danh hiệu nhỏ gọn cho người bắt đầu nâng cấp hồ sơ.",
    priceCtom: 30_000,
    visualKey: "ctom-founder",
    sortOrder: 310,
  },
  {
    slug: "title-big-spender",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.RARE,
    name: "Đại Gia CTOM",
    description: "Gắn lên tên là biết dân chơi CTOM chính hiệu.",
    priceCtom: 35_000,
    visualKey: "big-spender",
    sortOrder: 315,
  },
  {
    slug: "title-ctom-legend",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.EPIC,
    name: "Huyền Thoại CTOM",
    description: "Danh hiệu tím vàng cho người đã chinh phục shop.",
    priceCtom: 52_000,
    visualKey: "ctom-legend",
    sortOrder: 318,
  },
  {
    slug: "title-fortune-god",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.EPIC,
    name: "Thần Tài CTOM",
    description: "Đỏ vàng rực rỡ, xứng danh thần tài của cộng đồng.",
    priceCtom: 58_000,
    visualKey: "fortune-god",
    sortOrder: 319,
  },
  {
    slug: "title-shop-chairman",
    type: ShopItemType.TITLE,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Chủ Tịch Shop",
    description: "Danh hiệu nghe là biết đã đầu tư cho diện mạo.",
    priceCtom: 168_888,
    visualKey: "shop-chairman",
    sortOrder: 320,
  },
  /* ── Nameplates ────────────────────────────────────────── */
  {
    slug: "nameplate-neon-underline",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.COMMON,
    name: "Bảng Tên Neon Glow",
    description: "Gạch chân neon xanh sáng, đơn giản mà nổi bật.",
    priceCtom: 18_000,
    visualKey: "neon-underline",
    sortOrder: 405,
  },
  {
    slug: "nameplate-green-flash",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.RARE,
    name: "Bảng Tên Green Flash",
    description: "Nền tên xanh sáng, dễ đọc trên cả desktop và điện thoại.",
    priceCtom: 25_000,
    visualKey: "green-flash",
    sortOrder: 410,
  },
  {
    slug: "nameplate-cyber-edge",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.RARE,
    name: "Bảng Tên Cyber Edge",
    description: "Viền cyber tím xanh, chữ sáng rõ trên mọi nền.",
    priceCtom: 38_000,
    visualKey: "cyber-edge",
    sortOrder: 415,
  },
  {
    slug: "nameplate-goldline",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.EPIC,
    name: "Bảng Tên Goldline",
    description: "Đường vàng tinh gọn, thêm chất VIP mà không rối mắt.",
    priceCtom: 45_000,
    visualKey: "goldline",
    sortOrder: 420,
  },
  {
    slug: "nameplate-royal-gold",
    type: ShopItemType.NAMEPLATE,
    rarity: ShopItemRarity.LEGENDARY,
    name: "Bảng Tên Royal Gold",
    description: "Nền vàng hoàng gia rực rỡ, viền gold sang trọng kèm hiệu ứng lấp lánh — xứng tầm huyền thoại.",
    priceCtom: 168_888,
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

export async function purchaseShopItem(userId: string, itemId: string) {
  return prisma.$transaction(async (tx) => {
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
      return { item, purchased: false };
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

    return { item, purchased: true };
  });
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
