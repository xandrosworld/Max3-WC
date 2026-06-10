import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/change-password");

  return (
    <div className="min-h-screen">
      <AutoRefresh seconds={45} />
      <header className="sticky top-0 z-20 border-b border-emerald-900/15 bg-emerald-950/95 text-white shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/matches" className="font-extrabold tracking-tight">
            WC <span className="text-emerald-300">2026</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/matches">
              Dự đoán
            </Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/leaderboard">
              Bảng xếp hạng
            </Link>
            {user.role === "admin" && (
              <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/admin">
                Quản trị
              </Link>
            )}
            <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/profile">
              Hồ sơ
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ProfileAvatar image={user.image} name={user.name} />
            <div className="hidden text-right text-xs sm:block">
              <p className="font-bold">{user.name}</p>
              <p className="text-emerald-200">{user.department}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7">{children}</main>
    </div>
  );
}

function ProfileAvatar({ image, name }: { image: string | null; name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={`Ảnh đại diện của ${name}`}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-300/60"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-extrabold text-white ring-2 ring-emerald-300/60">
      {initial}
    </div>
  );
}
