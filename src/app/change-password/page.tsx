import { changePasswordAction } from "@/app/actions";
import { requireUser } from "@/lib/session";

export default async function ChangePasswordPage() {
  await requireUser();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        action={changePasswordAction}
        className="w-full max-w-md space-y-4 rounded-3xl bg-white p-7 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-black text-emerald-950">Đổi mật khẩu</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản trị viên vừa cấp hoặc reset mật khẩu của bạn.
          </p>
        </div>
        <input
          name="currentPassword"
          type="password"
          required
          minLength={8}
          placeholder="Mật khẩu hiện tại"
          className="w-full rounded-xl border p-3"
        />
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
          className="w-full rounded-xl border p-3"
        />
        <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white">
          Đổi mật khẩu
        </button>
      </form>
    </main>
  );
}
