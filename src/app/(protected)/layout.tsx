import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AiChatBot } from "@/components/ai-chat-bot";
import { AutoRefresh } from "@/components/auto-refresh";
import { AppNav } from "@/components/app-nav";
import { CosmeticAvatar } from "@/components/cosmetic-avatar";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/session";
import { getEquippedCosmetics, type EquippedCosmetics } from "@/lib/shop";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/change-password");
  const cosmetics = await getEquippedCosmetics(user.id);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.18),_transparent_30%),linear-gradient(180deg,#f8fafc,#f1f5f9)]">
      <AutoRefresh seconds={45} />
      <header className="sticky top-0 z-20 border-b border-emerald-900/15 bg-emerald-950/95 text-white shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/matches"
            className="inline-flex items-center rounded-xl bg-white/95 px-2.5 py-1.5 shadow-sm ring-1 ring-white/20"
            aria-label="WC 2026 Portal"
          >
            <Image
              src="/logo-ngang.png"
              alt="WC 2026"
              width={160}
              height={40}
              priority
              className="h-7 w-auto"
            />
          </Link>
          <div className="order-3 w-full min-w-0 overflow-hidden md:order-none md:w-auto">
            <AppNav isAdmin={user.role === "admin"} viewerId={user.id} />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ProfileAvatar image={user.image} name={user.name} cosmetics={cosmetics} />
            <div className="hidden text-right text-xs sm:block">
              <p className="font-bold">{user.name}</p>
              <p className="text-emerald-200">{user.department}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="border-b border-emerald-900/10 bg-emerald-50 px-4 py-2 text-center text-xs font-semibold text-emerald-950">
        Dự đoán vui nội bộ, không phải nền tảng cá cược.
      </div>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-7">{children}</main>
      <AiChatBot />
    </div>
  );
}

function ProfileAvatar({
  image,
  name,
  cosmetics,
}: {
  image: string | null;
  name: string;
  cosmetics: EquippedCosmetics;
}) {
  return (
    <CosmeticAvatar
      image={image}
      name={name}
      cosmetics={cosmetics}
      size="sm"
      effectIntensity="compact"
      coreClassName="ring-2 ring-emerald-300/60"
    />
  );
}
