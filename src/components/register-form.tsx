"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/app/actions";

const initialState: RegisterState = { error: "" };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Tên đăng nhập
        </span>
        <input
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Họ tên
        </span>
        <input
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Đơn vị/phòng ban
        </span>
        <input
          name="department"
          maxLength={100}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Mật khẩu
        </span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Nhập lại mật khẩu
        </span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

      <button
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-800 active:translate-y-px disabled:opacity-60"
      >
        {pending ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
      </button>
    </form>
  );
}
