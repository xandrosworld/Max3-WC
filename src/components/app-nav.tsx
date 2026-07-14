"use client";

import { Gem, Sparkles } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const GROUPS_TAB_ANNOUNCEMENT_VERSION = "2026-06-24";
const GROUPS_TAB_FIXED_UNTIL = new Date("2026-06-24T23:59:59.999+07:00").getTime();
const GROUPS_SEEN_EVENT = "wc2026-groups-tab-seen-change";

function groupsSeenKey(viewerId: string) {
  return `wc2026-groups-tab-seen:${GROUPS_TAB_ANNOUNCEMENT_VERSION}:${viewerId}`;
}

function subscribeGroupsSeen(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(GROUPS_SEEN_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(GROUPS_SEEN_EVENT, onStoreChange);
  };
}

function getGroupsSeenSnapshot(viewerId: string) {
  try {
    return window.localStorage.getItem(groupsSeenKey(viewerId)) === "1";
  } catch {
    return true;
  }
}

function getGroupsSeenServerSnapshot() {
  return true;
}

function markGroupsSeen(viewerId: string) {
  if (isGroupsAnnouncementFixed()) return;

  try {
    window.localStorage.setItem(groupsSeenKey(viewerId), "1");
    window.dispatchEvent(new Event(GROUPS_SEEN_EVENT));
  } catch {
    // Storage can be unavailable in private browsing; navigation still works.
  }
}

function isGroupsAnnouncementFixed() {
  return Date.now() <= GROUPS_TAB_FIXED_UNTIL;
}

export function AppNav({
  isAdmin,
  viewerId,
}: {
  isAdmin: boolean;
  viewerId: string;
}) {
  const pathname = usePathname();
  const [pendingNavigation, setPendingNavigation] = useState<{
    href: string;
    fromPath: string;
  } | null>(null);
  const pendingHref =
    pendingNavigation?.fromPath === pathname ? pendingNavigation.href : null;
  const groupsSeen = useSyncExternalStore(
    subscribeGroupsSeen,
    () => getGroupsSeenSnapshot(viewerId),
    getGroupsSeenServerSnapshot,
  );
  const isGroupsPath = pathname === "/groups" || pathname.startsWith("/groups/");
  const showGroupsNew =
    !isGroupsPath && (isGroupsAnnouncementFixed() || !groupsSeen);
  const items = [
    { href: "/matches", label: "Lịch & dự đoán", mobileLabel: "Lịch" },
    { href: "/groups", label: "Bảng đấu", mobileLabel: "Bảng đấu" },
    { href: "/shop", label: "Shop", mobileLabel: "Shop" },
    { href: "/leaderboard", label: "Bảng xếp hạng", mobileLabel: "Xếp hạng" },
    ...(isAdmin ? [{ href: "/admin", label: "Quản trị", mobileLabel: "Quản trị" }] : []),
    { href: "/profile", label: "Hồ sơ", mobileLabel: "Hồ sơ" },
  ];

  useEffect(() => {
    if (isGroupsPath) markGroupsSeen(viewerId);
  }, [isGroupsPath, viewerId]);

  useEffect(() => {
    if (!pendingNavigation) return;

    const timeout = window.setTimeout(() => setPendingNavigation(null), 15_000);
    return () => window.clearTimeout(timeout);
  }, [pendingNavigation]);

  return (
    <nav className="flex w-full max-w-full min-w-0 items-center gap-1 overflow-x-auto text-sm font-semibold" aria-label="Điều hướng chính">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const visuallyActive = pendingHref
          ? pendingHref === item.href
          : active;
        const isShop = item.href === "/shop";
        const showNewBadge = item.href === "/groups" && showGroupsNew && !active;
        return (
          <Link
            key={item.href}
            className={`relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-xl px-3 py-2 ${
              visuallyActive
                ? "bg-white text-emerald-950"
                : "text-emerald-50 hover:bg-white/10 hover:text-white"
            } ${isShop ? "shop-nav-link" : ""} ${isShop && visuallyActive ? "shop-nav-link-active shadow-[0_0_18px_rgba(251,191,36,0.28)] ring-1 ring-amber-200/70" : ""}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (!active) {
                setPendingNavigation({ href: item.href, fromPath: pathname });
              }
              if (item.href === "/groups") markGroupsSeen(viewerId);
            }}
          >
            {isShop && (
              <span className={`shop-nav-gem relative inline-flex shrink-0 ${active ? "shop-nav-gem-active text-amber-500" : "text-amber-200"}`}>
                <Gem size={15} strokeWidth={2.5} aria-hidden="true" />
                <Sparkles
                  className={`shop-nav-sparkle absolute -right-2 -top-2 ${
                    active ? "shop-nav-sparkle-active text-amber-400" : "shop-nav-sparkle-idle text-amber-300/80"
                  }`}
                  size={9}
                  strokeWidth={3}
                  aria-hidden="true"
                />
              </span>
            )}
            <span className="sm:hidden">{item.mobileLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
            {showNewBadge && (
              <span className="pointer-events-none relative inline-flex overflow-hidden rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black leading-none text-emerald-950 shadow-sm ring-1 ring-white/70 before:absolute before:inset-y-0 before:-left-8 before:w-5 before:rotate-12 before:bg-white/80 before:blur-[1px] motion-safe:before:animate-[badge-shine_2.4s_ease-in-out_infinite]">
                Mới
              </span>
            )}
            <NavLinkPending forcePending={pendingHref === item.href} />
          </Link>
        );
      })}
    </nav>
  );
}

function NavLinkPending({ forcePending }: { forcePending: boolean }) {
  const { pending } = useLinkStatus();
  const visible = pending || forcePending;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-2 bottom-0 h-0.5 overflow-hidden rounded-full bg-current/15 transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="absolute inset-y-0 w-1/2 rounded-full bg-current motion-safe:animate-[nav-progress_700ms_ease-in-out_infinite]" />
    </span>
  );
}
