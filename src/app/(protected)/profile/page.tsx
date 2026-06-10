import { PasswordForm, ProfileForm } from "@/components/profile-forms";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

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
        <ProfileForm
          name={user.name}
          department={user.department}
          image={user.image}
        />
        <PasswordForm />
      </div>
    </div>
  );
}
