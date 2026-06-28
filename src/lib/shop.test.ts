import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CtomTransactionType,
  ShopItemRarity,
  ShopItemType,
} from "@prisma/client";

const mocks = vi.hoisted(() => {
  const tx = {
    shopItem: {
      findFirst: vi.fn(),
    },
    userShopItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    ctomTransaction: {
      create: vi.fn(),
    },
    userCosmeticEquip: {
      upsert: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      $transaction: vi.fn((callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    },
  };
});

const txMock = mocks.tx;

vi.mock("./prisma", () => ({ prisma: mocks.prisma }));

import { equipShopItem, purchaseShopItem } from "./shop";

const item = {
  id: "item-frame",
  slug: "frame-emerald-glory",
  type: ShopItemType.AVATAR_FRAME,
  rarity: ShopItemRarity.RARE,
  name: "Viền Lục Bảo",
  description: "Viền xanh sạch.",
  priceCtom: 32_000,
  visualKey: "emerald-glory",
  sortOrder: 10,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("shop purchases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.shopItem.findFirst.mockResolvedValue(item);
    txMock.userShopItem.findUnique.mockResolvedValue(null);
    txMock.userShopItem.create.mockResolvedValue({});
    txMock.ctomTransaction.create.mockResolvedValue({});
    txMock.userCosmeticEquip.upsert.mockResolvedValue({});
  });

  it("creates inventory, CTOM transaction, and equips on first purchase", async () => {
    const result = await purchaseShopItem("user-1", item.id);

    expect(result).toMatchObject({ purchased: true, item });
    expect(txMock.userShopItem.create).toHaveBeenCalledWith({
      data: { userId: "user-1", itemId: item.id },
    });
    expect(txMock.ctomTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        itemId: item.id,
        amount: 32_000,
        type: CtomTransactionType.PURCHASE,
        note: "Mua Viền Lục Bảo",
      },
    });
    expect(txMock.userCosmeticEquip.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type: {
            userId: "user-1",
            type: ShopItemType.AVATAR_FRAME,
          },
        },
      }),
    );
  });

  it("does not add CTOM again when the item is already owned", async () => {
    txMock.userShopItem.findUnique.mockResolvedValue({ item });

    const result = await purchaseShopItem("user-1", item.id);

    expect(result).toMatchObject({ purchased: false, item });
    expect(txMock.userShopItem.create).not.toHaveBeenCalled();
    expect(txMock.ctomTransaction.create).not.toHaveBeenCalled();
    expect(txMock.userCosmeticEquip.upsert).toHaveBeenCalled();
  });

  it("equips only owned active items", async () => {
    txMock.userShopItem.findUnique.mockResolvedValue({ item });

    await expect(equipShopItem("user-1", item.id)).resolves.toEqual(item);
    expect(txMock.userCosmeticEquip.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          userId: "user-1",
          type: ShopItemType.AVATAR_FRAME,
          itemId: item.id,
        },
      }),
    );
  });
});
