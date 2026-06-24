"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const GROUPS_SEEN_KEY = "wc2026-groups-tab-seen";
const GROUPS_SEEN_EVENT = "wc2026-groups-tab-seen-change";

function subscribeGroupsSeen(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(GROUPS_SEEN_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(GROUPS_SEEN_EVENT, onStoreChange);
  };
}

function getGroupsSeenSnapshot() {
  try {
    return window.localStorage.getItem(GROUPS_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function getGroupsSeenServerSnapshot() {
  return true;
}

function markGroupsSeen() {
  try {
    window.localStorage.setItem(GROUPS_SEEN_KEY, "1");
    window.dispatchEvent(new Event(GROUPS_SEEN_EVENT));
  } catch {
    // Storage can be unavailable in private browsing; navigation still works.
  }
}

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const groupsSeen = useSyncExternalStore(
    subscribeGroupsSeen,
    getGroupsSeenSnapshot,
    getGroupsSeenServerSnapshot,
  );
  const isGroupsPath = pathname === "/groups" || pathname.startsWith("/groups/");
  const showGroupsNew = !isGroupsPath && !groupsSeen;
  const items = [
    { href: "/matches", label: "Lịch & dự đoán", mobileLabel: "Lịch" },
    { href: "/groups", label: "Bảng đấu", mobileLabel: "Bảng đấu" },
    { href: "/leaderboard", label: "Bảng xếp hạng", mobileLabel: "Xếp hạng" },
    ...(isAdmin ? [{ href: "/admin", label: "Quản trị", mobileLabel: "Quản trị" }] : []),
    { href: "/profile", label: "Hồ sơ", mobileLabel: "Hồ sơ" },
  ];

  useEffect(() => {
    if (isGroupsPath) markGroupsSeen();
  }, [isGroupsPath]);

  return (
    <nav className="flex w-full max-w-full min-w-0 items-center gap-1 overflow-x-auto text-sm font-semibold" aria-label="Điều hướng chính">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 ${
              active
                ? "bg-white text-emerald-950"
                : "text-emerald-50 hover:bg-white/10 hover:text-white"
            }`}
            href={item.href}
            onClick={item.href === "/groups" ? markGroupsSeen : undefined}
          >
            <span className="sm:hidden">{item.mobileLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
            {item.href === "/groups" && showGroupsNew && !active && (
              <span className="inline-flex items-center rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black leading-none text-emerald-950 shadow-sm">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-700 motion-safe:animate-pulse" />
                Mới
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
