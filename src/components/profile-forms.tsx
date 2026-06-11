"use client";

import {
  ChangeEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!file) {
      setPreviewImage(null);
      setSelectedFileName("");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setPreviewImage(nextUrl);
    setSelectedFileName(file.name);
    setRemoveAvatar(false);
  }

  return (
    <form action={formAction} className="space-y-4 rounded-3xl bg-white p-6 shadow-lg shadow-emerald-950/5">
      <div className="flex items-center gap-4">
        <AvatarPreview image={removeAvatar ? null : previewImage ?? image} name={name} />
        <div>
          <h2 className="text-xl font-extrabold text-emerald-950">Hồ sơ cá nhân</h2>
          <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin hiển thị với mọi người.</p>
          {selectedFileName && !removeAvatar && (
            <p className="mt-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              Đang xem trước: {selectedFileName}
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Ảnh đại diện
        </p>
        <input
          id="profile-avatar"
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={changeAvatar}
          className="sr-only"
        />
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-950/15 bg-white px-4 py-3">
          <label
            htmlFor="profile-avatar"
            className="cursor-pointer rounded-xl bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-800 hover:bg-emerald-100"
          >
            Chọn ảnh
          </label>
          <span className="text-sm font-semibold text-slate-600">
            {selectedFileName || "Chưa chọn ảnh mới"}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Chọn xong sẽ hiện ảnh xem trước ở phía trên. Dùng PNG, JPG, WebP hoặc GIF, tối đa 1MB.
        </p>
      </div>

      {image && (
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            name="removeAvatar"
            type="checkbox"
            value="true"
            checked={removeAvatar}
            onChange={(event) => setRemoveAvatar(event.currentTarget.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Xóa ảnh đại diện hiện tại
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Nickname hiển thị
        </span>
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
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">Đơn vị</span>
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
        className="h-20 w-20 rounded-3xl object-cover ring-4 ring-emerald-100"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-700 text-2xl font-extrabold text-white ring-4 ring-emerald-100">
      {initial}
    </div>
  );
}
