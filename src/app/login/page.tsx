import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/matches");

  const now = new Date();
  const nextMatch = await prisma.match
    .findFirst({
      where: {
        deletedAt: null,
        kickoffAt: { gte: now },
      },
      orderBy: { kickoffAt: "asc" },
      select: { teamA: true, teamB: true, kickoffAt: true },
    })
    .catch(() => null);

  return (
    <main className="min-h-[100dvh] bg-[#07141d] lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(420px,2fr)]">
      <section className="relative min-h-[43dvh] overflow-hidden lg:min-h-[100dvh]">
        <Image
          src="/messi-ronaldo-vip.png"
          alt="Messi và Ronaldo trong không khí sân vận động World Cup"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 62vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,12,18,0.12)_25%,rgba(3,12,18,0.92)_100%)] lg:bg-[linear-gradient(90deg,rgba(3,12,18,0.12)_40%,rgba(3,12,18,0.72)_100%),linear-gradient(180deg,rgba(3,12,18,0.08)_35%,rgba(3,12,18,0.92)_100%)]" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 text-white sm:px-8 lg:px-10">
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl bg-white/95 px-3 py-2 shadow-lg shadow-black/15"
            aria-label="WC 2026 Portal"
          >
            <Image
              src="/logo-ngang.png"
              alt="WC 2026"
              width={180}
              height={45}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <span className="hidden text-xs font-bold uppercase tracking-[0.16em] text-white/70 sm:block">
            Cổng dự đoán nội bộ
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8 lg:p-10">
          <p className="text-sm font-bold text-emerald-300">WC 2026 Portal</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight text-balance sm:text-4xl lg:text-5xl">
            Cùng xem bóng đá, cùng dự đoán vui.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Hòa-sau-chấp mới là nghệ thuật. Chọn rõ ràng, theo dõi dễ dàng và xem thứ hạng sau mỗi trận.
          </p>

          {nextMatch && (
            <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-xl border border-white/15 bg-[#07141d]/70 px-4 py-3 shadow-xl backdrop-blur-md">
              <CalendarDays className="shrink-0 text-emerald-300" size={20} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/60">Trận sắp tới</p>
                <p className="truncate text-sm font-extrabold">
                  {nextMatch.teamA} <span className="text-white/50">vs</span> {nextMatch.teamB}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-200">
                  {formatLoginMatchTime(nextMatch.kickoffAt)}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-[57dvh] items-center bg-[#f7faf8] px-5 py-10 sm:px-10 lg:min-h-[100dvh] lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-bold text-emerald-700">Chào mừng trở lại</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[#082d24] sm:text-4xl">
            Đăng nhập để vào sân
          </h2>
          <p className="mb-8 mt-3 text-sm leading-6 text-slate-600">
            Dùng tài khoản của bạn để xem lịch, chọn dự đoán và theo dõi bảng xếp hạng.
          </p>

          <LoginForm />

          <div className="mt-7 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-600">Bạn chưa có tài khoản?</p>
            <Link
              href="/register"
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-700 px-5 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 active:translate-y-px"
            >
              Tạo tài khoản mới
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatLoginMatchTime(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}
