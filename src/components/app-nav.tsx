"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/matches", label: "Lịch & dự đoán", mobileLabel: "Lịch" },
    { href: "/groups", label: "Bảng đấu", mobileLabel: "Bảng đấu" },
    { href: "/leaderboard", label: "Bảng xếp hạng", mobileLabel: "Xếp hạng" },
    ...(isAdmin ? [{ href: "/admin", label: "Quản trị", mobileLabel: "Quản trị" }] : []),
    { href: "/profile", label: "Hồ sơ", mobileLabel: "Hồ sơ" },
  ];

  return (
    <nav className="flex max-w-full items-center gap-1 overflow-x-auto text-sm font-semibold" aria-label="Điều hướng chính">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            className={`shrink-0 rounded-xl px-3 py-2 ${
              active
                ? "bg-white text-emerald-950"
                : "text-emerald-50 hover:bg-white/10 hover:text-white"
            }`}
            href={item.href}
          >
            <span className="sm:hidden">{item.mobileLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
