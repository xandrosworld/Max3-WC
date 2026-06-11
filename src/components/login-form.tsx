"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions";

const initialState: LoginState = { error: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Tài khoản đăng nhập
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
          Mật khẩu
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          maxLength={128}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>
      {state.error && (
        <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-800 active:translate-y-px disabled:opacity-60"
      >
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
