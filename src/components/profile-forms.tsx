"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  updateProfileAction,
  type ChangePasswordState,
  type ProfileState,
} from "@/app/actions";

const initialProfileState: ProfileState = { error: "", success: "" };
const initialPasswordState: ChangePasswordState = { error: "" };

export function ProfileForm({
  name,
  department,
  image,
}: {
  name: string;
  department: string;
  image: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialProfileState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-3xl bg-white p-6 shadow-lg shadow-emerald-950/5">
      <div className="flex items-center gap-4">
        <AvatarPreview image={image} name={name} />
        <div>
          <h2 className="text-xl font-extrabold text-emerald-950">Hồ sơ cá nhân</h2>
          <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin hiển thị với mọi người.</p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Ảnh đại diện
        </span>
        <input
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-bold file:text-emerald-800 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
        <p className="mt-1 text-xs text-slate-500">Dùng ảnh PNG, JPG, WebP hoặc GIF, tối đa 1MB.</p>
      </label>

      {image && (
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input name="removeAvatar" type="checkbox" value="true" className="h-4 w-4 rounded border-slate-300" />
          Xóa ảnh đại diện hiện tại
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">Họ tên</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={name}
          className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">Đơn vị/phòng ban</span>
        <input
          name="department"
          maxLength={100}
          defaultValue={department}
          className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.success}</p>}

      <button
        disabled={pending}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Đang lưu..." : "Lưu hồ sơ"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialPasswordState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-3xl bg-white p-6 shadow-lg shadow-emerald-950/5">
      <div>
        <h2 className="text-xl font-extrabold text-emerald-950">Đổi mật khẩu</h2>
        <p className="mt-1 text-sm text-slate-500">Nên dùng mật khẩu riêng, tối thiểu 8 ký tự.</p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">Mật khẩu hiện tại</span>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          maxLength={128}
          className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">Mật khẩu mới</span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">Nhập lại mật khẩu mới</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.success}</p>}

      <button
        disabled={pending}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}

function AvatarPreview({ image, name }: { image: string | null; name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={`Ảnh đại diện của ${name}`}
        className="h-16 w-16 rounded-full object-cover ring-4 ring-emerald-100"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-700 text-2xl font-extrabold text-white ring-4 ring-emerald-100">
      {initial}
    </div>
  );
}
