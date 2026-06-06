"use client";

import { useEffect } from "react";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-red-700">
        Không thực hiện được thao tác
      </p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">
        Dữ liệu chưa được thay đổi
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Hãy kiểm tra dữ liệu nhập và thử lại. Nếu lỗi tiếp diễn, gửi mã lỗi cho quản trị viên:
        {" "}
        <b>{error.digest ?? "không có mã"}</b>.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
      >
        Thử lại
      </button>
    </div>
  );
}
