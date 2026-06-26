"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RotateCcw, Sparkles, WandSparkles, X } from "lucide-react";
import { PhoenixFlameWings } from "@/components/phoenix-flame-wings";

type ShopCosmeticType =
  | "AVATAR_FRAME"
  | "AVATAR_WINGS"
  | "AVATAR_AURA"
  | "TITLE"
  | "NAMEPLATE";

export type ShopTryOnItem = {
  id: string;
  slug: string;
  type: ShopCosmeticType;
  rarity: string;
  name: string;
  visualKey: string;
};

export type ShopTryOnCosmetics = Partial<Record<ShopCosmeticType, ShopTryOnItem>>;

type ShopTryOnContextValue = {
  user: {
    image: string | null;
    name: string;
    department: string;
  };
  initialCosmetics: ShopTryOnCosmetics;
  tryOnCosmetics: ShopTryOnCosmetics;
  previewCosmetics: ShopTryOnCosmetics;
  setTryOn: (item: ShopTryOnItem) => void;
  clearType: (type: ShopCosmeticType) => void;
  resetTryOn: () => void;
  isTryingItem: (item: ShopTryOnItem) => boolean;
};

const SHOP_TYPE_LABELS: Record<ShopCosmeticType, string> = {
  AVATAR_FRAME: "Khung",
  AVATAR_WINGS: "Cánh",
  AVATAR_AURA: "Aura",
  TITLE: "Danh hiệu",
  NAMEPLATE: "Bảng tên",
};

const SHOP_TYPE_ORDER: ShopCosmeticType[] = [
  "AVATAR_FRAME",
  "AVATAR_WINGS",
  "AVATAR_AURA",
  "TITLE",
  "NAMEPLATE",
];

const SHOP_TRY_ON_EVENT = "shop:try-on";
const SHOP_TRY_ON_STATE_EVENT = "shop:try-on-state";

const ShopTryOnContext = createContext<ShopTryOnContextValue | null>(null);

function useOptionalShopTryOn() {
  return useContext(ShopTryOnContext);
}

function useShopTryOn() {
  const value = useContext(ShopTryOnContext);
  if (!value) {
    throw new Error("useShopTryOn must be used inside ShopTryOnProvider");
  }
  return value;
}

function scrollToTryOnPanel() {
  const panel = document.getElementById("shop-try-on-panel");
  if (!panel) return;

  const preview = document.getElementById("shop-try-on-preview");
  const target = window.innerWidth < 700 && preview ? preview : panel;
  target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  panel.focus({ preventScroll: true });
}

function emitTryOnRequest(item: ShopTryOnItem) {
  window.dispatchEvent(new CustomEvent<ShopTryOnItem>(SHOP_TRY_ON_EVENT, { detail: item }));
}

export function requestShopTryOn(item: ShopTryOnItem) {
  emitTryOnRequest(item);
}

function emitTryOnState(cosmetics: ShopTryOnCosmetics) {
  window.dispatchEvent(
    new CustomEvent<ShopTryOnCosmetics>(SHOP_TRY_ON_STATE_EVENT, { detail: cosmetics }),
  );
}

export function ShopTryOnProvider({
  children,
  user,
  initialCosmetics,
}: {
  children: ReactNode;
  user: ShopTryOnContextValue["user"];
  initialCosmetics: ShopTryOnCosmetics;
}) {
  const [tryOnCosmetics, setTryOnCosmetics] = useState<ShopTryOnCosmetics>({});
  const previewCosmetics = useMemo(
    () => ({ ...initialCosmetics, ...tryOnCosmetics }),
    [initialCosmetics, tryOnCosmetics],
  );

  const setTryOn = useCallback((item: ShopTryOnItem) => {
    setTryOnCosmetics((current) => ({ ...current, [item.type]: item }));

    window.setTimeout(scrollToTryOnPanel, 30);
  }, []);

  const clearType = useCallback((type: ShopCosmeticType) => {
    setTryOnCosmetics((current) => {
      const next = { ...current };
      delete next[type];
      return next;
    });
  }, []);

  const resetTryOn = useCallback(() => {
    setTryOnCosmetics({});
  }, []);

  const isTryingItem = useCallback(
    (item: ShopTryOnItem) => tryOnCosmetics[item.type]?.id === item.id,
    [tryOnCosmetics],
  );

  useEffect(() => {
    const handleTryOnRequest = (event: Event) => {
      const item = (event as CustomEvent<ShopTryOnItem>).detail;
      if (!item?.id || !item.type) return;
      setTryOn(item);
    };

    window.addEventListener(SHOP_TRY_ON_EVENT, handleTryOnRequest);
    return () => window.removeEventListener(SHOP_TRY_ON_EVENT, handleTryOnRequest);
  }, [setTryOn]);

  useEffect(() => {
    emitTryOnState(tryOnCosmetics);
  }, [tryOnCosmetics]);

  const value = useMemo(
    () => ({
      user,
      initialCosmetics,
      tryOnCosmetics,
      previewCosmetics,
      setTryOn,
      clearType,
      resetTryOn,
      isTryingItem,
    }),
    [
      user,
      initialCosmetics,
      tryOnCosmetics,
      previewCosmetics,
      setTryOn,
      clearType,
      resetTryOn,
      isTryingItem,
    ],
  );

  return <ShopTryOnContext.Provider value={value}>{children}</ShopTryOnContext.Provider>;
}

export function ShopTryOnButton({ item }: { item: ShopTryOnItem }) {
  const tryOn = useOptionalShopTryOn();
  const [fallbackActive, setFallbackActive] = useState(false);
  const active = tryOn?.isTryingItem(item) ?? fallbackActive;

  useEffect(() => {
    const handleTryOnState = (event: Event) => {
      const cosmetics = (event as CustomEvent<ShopTryOnCosmetics>).detail ?? {};
      setFallbackActive(cosmetics[item.type]?.id === item.id);
    };

    window.addEventListener(SHOP_TRY_ON_STATE_EVENT, handleTryOnState);
    return () => window.removeEventListener(SHOP_TRY_ON_STATE_EVENT, handleTryOnState);
  }, [item.id, item.type]);

  return (
    <button
      type="button"
      onClick={() => {
        setFallbackActive(true);
        if (tryOn) {
          tryOn.setTryOn(item);
          return;
        }
        emitTryOnRequest(item);
      }}
      aria-pressed={active}
      className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-black shadow-sm ring-1 sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm ${
        active
          ? "bg-amber-50 text-amber-800 ring-amber-300 shadow-amber-950/10"
          : "bg-white text-emerald-800 ring-emerald-200 hover:bg-emerald-50"
      }`}
      data-testid={`try-on-${item.slug}`}
    >
      <WandSparkles size={14} className="sm:h-4 sm:w-4" />
      {active ? "Đang thử" : "Thử"}
    </button>
  );
}

export function ShopTryOnPanel() {
  const {
    user,
    initialCosmetics,
    tryOnCosmetics,
    previewCosmetics,
    clearType,
    resetTryOn,
  } = useShopTryOn();
  const tryOnCount = Object.keys(tryOnCosmetics).length;
  const hasTryOn = tryOnCount > 0;

  return (
    <section
      id="shop-try-on-panel"
      tabIndex={-1}
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5"
      data-testid="shop-try-on-panel"
    >
      <div className="grid gap-4 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,#ecfdf5,#ffffff_58%,#fff7ed)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] sm:p-5">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            <WandSparkles size={15} />
            Phòng thử đồ
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">
            Thử trước, ưng rồi hãy mua
          </h2>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600">
            Bấm <span className="font-black text-emerald-800">Thử</span> trên card vật phẩm
            để xem lên avatar ra sao. Mặc thử không tốn CTOM và không ghi vào tủ đồ.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SHOP_TYPE_ORDER.map((type) => {
              const trying = tryOnCosmetics[type];
              const current = previewCosmetics[type];
              const equipped = initialCosmetics[type];

              return (
                <div
                  key={type}
                  className={`min-w-0 rounded-2xl border p-2.5 ${
                    trying
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : current
                        ? "border-emerald-100 bg-white text-emerald-950"
                        : "border-slate-200 bg-white/75 text-slate-500"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.14em]">
                    {SHOP_TYPE_LABELS[type]}
                  </p>
                  <p className="mt-1 truncate text-xs font-black">
                    {current?.name ?? "Chưa có"}
                  </p>
                  {trying ? (
                    <button
                      type="button"
                      onClick={() => clearType(type)}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black text-amber-800 ring-1 ring-amber-200"
                    >
                      <X size={10} />
                      Bỏ thử
                    </button>
                  ) : equipped ? (
                    <p className="mt-2 text-[10px] font-black text-emerald-700">Đang dùng</p>
                  ) : (
                    <p className="mt-2 text-[10px] font-bold text-slate-400">Trống</p>
                  )}
                </div>
              );
            })}
          </div>

          {hasTryOn && (
            <button
              type="button"
              onClick={resetTryOn}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white shadow-sm hover:bg-slate-800"
            >
              <RotateCcw size={15} />
              Xóa toàn bộ mặc thử
            </button>
          )}
        </div>

        <div
          id="shop-try-on-preview"
          className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-slate-950 p-4 text-white shadow-xl shadow-slate-950/15 sm:p-5"
          data-guide-target="shop-try-on-preview"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.34),transparent_38%),radial-gradient(circle_at_92%_18%,rgba(251,191,36,0.22),transparent_32%)]" />
          <div className="relative flex flex-col items-center text-center">
            <CosmeticPreviewAvatar
              image={user.image}
              name={user.name}
              cosmetics={previewCosmetics}
            />
            <p
              className={`mt-4 max-w-full text-2xl font-black leading-tight ${cosmeticNameplateClass(previewCosmetics)}`}
            >
              {user.name}
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-50/70">
              {user.department || "Chưa có đơn vị"}
            </p>
            <CosmeticPreviewTitle cosmetics={previewCosmetics} />
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-100 ring-1 ring-white/15">
              <Sparkles size={13} />
              {hasTryOn ? `${tryOnCount} món đang thử` : "Diện mạo hiện tại"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CosmeticPreviewAvatar({
  image,
  name,
  cosmetics,
}: {
  image: string | null;
  name: string;
  cosmetics: ShopTryOnCosmetics;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const frame = cosmetics.AVATAR_FRAME?.visualKey ?? "none";
  const wings = cosmetics.AVATAR_WINGS?.visualKey ?? "none";
  const aura = cosmetics.AVATAR_AURA?.visualKey ?? "none";
  const hasPhoenixWings = wings === "phoenix-flame";

  return (
    <span
      className="cosmetic-avatar cosmetic-avatar-xl"
      data-frame={frame}
      data-wings={wings}
      data-aura={aura}
      data-effect-intensity="full"
      data-guide-target="shop-try-on-avatar"
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
          className="cosmetic-avatar-core object-cover"
        />
      ) : (
        <span className="cosmetic-avatar-core flex items-center justify-center bg-emerald-100 font-black text-emerald-900">
          {initial}
        </span>
      )}
      <span className="cosmetic-avatar-frame" aria-hidden="true" />
    </span>
  );
}

function CosmeticPreviewTitle({ cosmetics }: { cosmetics: ShopTryOnCosmetics }) {
  const title = cosmetics.TITLE;
  if (!title) return null;

  return (
    <span className="cosmetic-title-badge mt-2" data-title={title.visualKey}>
      {title.name}
    </span>
  );
}

function cosmeticNameplateClass(cosmetics: ShopTryOnCosmetics) {
  const nameplate = cosmetics.NAMEPLATE;
  return nameplate ? `cosmetic-nameplate cosmetic-nameplate-${nameplate.visualKey}` : "";
}
