CREATE TYPE "ShopItemType" AS ENUM ('AVATAR_FRAME', 'AVATAR_WINGS', 'AVATAR_AURA', 'TITLE', 'NAMEPLATE');

CREATE TYPE "ShopItemRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

CREATE TYPE "CtomTransactionType" AS ENUM ('PURCHASE', 'REFUND', 'GRANT');

CREATE TABLE "ShopItem" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "ShopItemType" NOT NULL,
  "rarity" "ShopItemRarity" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priceCtom" INTEGER NOT NULL,
  "visualKey" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserShopItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "purchasedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserShopItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCosmeticEquip" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ShopItemType" NOT NULL,
  "itemId" TEXT NOT NULL,
  "equippedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserCosmeticEquip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CtomTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT,
  "amount" INTEGER NOT NULL,
  "type" "CtomTransactionType" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CtomTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopItem_slug_key" ON "ShopItem"("slug");
CREATE INDEX "ShopItem_type_isActive_sortOrder_idx" ON "ShopItem"("type", "isActive", "sortOrder");

CREATE UNIQUE INDEX "UserShopItem_userId_itemId_key" ON "UserShopItem"("userId", "itemId");
CREATE INDEX "UserShopItem_userId_idx" ON "UserShopItem"("userId");
CREATE INDEX "UserShopItem_itemId_idx" ON "UserShopItem"("itemId");

CREATE UNIQUE INDEX "UserCosmeticEquip_userId_type_key" ON "UserCosmeticEquip"("userId", "type");
CREATE INDEX "UserCosmeticEquip_userId_idx" ON "UserCosmeticEquip"("userId");
CREATE INDEX "UserCosmeticEquip_itemId_idx" ON "UserCosmeticEquip"("itemId");

CREATE INDEX "CtomTransaction_userId_createdAt_idx" ON "CtomTransaction"("userId", "createdAt");
CREATE INDEX "CtomTransaction_itemId_idx" ON "CtomTransaction"("itemId");

ALTER TABLE "UserShopItem"
  ADD CONSTRAINT "UserShopItem_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "UserShopItem"
  ADD CONSTRAINT "UserShopItem_itemId_fkey"
  FOREIGN KEY ("itemId")
  REFERENCES "ShopItem"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "UserCosmeticEquip"
  ADD CONSTRAINT "UserCosmeticEquip_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "UserCosmeticEquip"
  ADD CONSTRAINT "UserCosmeticEquip_itemId_fkey"
  FOREIGN KEY ("itemId")
  REFERENCES "ShopItem"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "CtomTransaction"
  ADD CONSTRAINT "CtomTransaction_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "CtomTransaction"
  ADD CONSTRAINT "CtomTransaction_itemId_fkey"
  FOREIGN KEY ("itemId")
  REFERENCES "ShopItem"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
