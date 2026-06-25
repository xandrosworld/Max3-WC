import { AutoFollowForm, PasswordForm, ProfileForm } from "@/components/profile-forms";
import {
  CosmeticAvatar,
  CosmeticTitleBadge,
  cosmeticNameplateClass,
} from "@/components/cosmetic-avatar";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatCtom, getCtomTotal, getEquippedCosmetics } from "@/lib/shop";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const [cosmetics, totalCtom] = await Promise.all([
    getEquippedCosmetics(user.id),
    getCtomTotal(user.id),
  ]);
  const autoFollowOptions =
    user.role === "user"
      ? await prisma.user.findMany({
          where: {
            role: "user",
            banned: false,
            id: { not: user.id },
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            department: true,
            image: true,
          },
        })
      : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
          Tài khoản
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-emerald-950">Hồ sơ của tôi</h1>
        <p className="mt-2 text-sm text-slate-500">
          Cập nhật ảnh đại diện, thông tin cá nhân và mật khẩu.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileCosmeticsCard
          image={user.image}
          name={user.name}
          department={user.department}
          totalCtom={totalCtom}
          cosmetics={cosmetics}
        />
        <ProfileForm
          name={user.name}
          department={user.department}
          image={user.image}
        />
        <PasswordForm />
      </div>

      {user.role === "user" && (
        <AutoFollowForm
          currentAutoFollowUserId={user.autoFollowUserId}
          options={autoFollowOptions}
        />
      )}
    </div>
  );
}

function ProfileCosmeticsCard({
  image,
  name,
  department,
  totalCtom,
  cosmetics,
}: {
  image: string | null;
  name: string;
  department: string;
  totalCtom: number;
  cosmetics: Awaited<ReturnType<typeof getEquippedCosmetics>>;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-slate-950 p-6 text-white shadow-lg shadow-emerald-950/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.3),transparent_32%),radial-gradient(circle_at_92%_0%,rgba(251,191,36,0.18),transparent_28%)]" />
      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="w-full pt-3 sm:w-auto sm:pt-0">
          <CosmeticAvatar
            image={image}
            name={name}
            cosmetics={cosmetics}
            size="xl"
            className="mx-auto sm:mx-0"
          />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
            Diện mạo
          </p>
          <h2 className={`mt-2 text-2xl font-black leading-tight ${cosmeticNameplateClass(cosmetics)}`}>
            {name}
          </h2>
          <p className="mt-1 text-sm font-semibold text-emerald-50/75">
            {department || "Chưa có đơn vị"}
          </p>
          <div className="mt-2">
            <CosmeticTitleBadge cosmetics={cosmetics} />
          </div>
          <p className="mt-4 text-sm font-black text-amber-200">
            {formatCtom(totalCtom)}
          </p>
        </div>
      </div>
      <Link
        href="/shop"
        className="relative mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-black text-emerald-950 shadow-sm hover:bg-emerald-50"
      >
        Vào Shop
      </Link>
    </section>
  );
}
