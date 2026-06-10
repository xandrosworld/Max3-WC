import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/matches");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#d1fae5,_transparent_42%),linear-gradient(135deg,#f8fafc,#ecfdf5)] px-4 py-12">
      <div className="mx-auto grid min-h-[75vh] max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <section>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Dự đoán nội bộ
          </p>
          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.12] text-emerald-950 sm:text-5xl">
            World Cup 2026
            <span className="block text-emerald-600">Hòa-sau-chấp mới là nghệ thuật.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-emerald-950/65">
            Một quỹ chung, ba cửa rõ ràng, không chọn thì không phạt. Ai thua nhiều
            nhất được vinh danh trang trọng trên bảng xếp hạng.
          </p>
        </section>
        <section className="rounded-3xl border border-white/80 bg-white/85 p-7 shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <h2 className="text-2xl font-extrabold text-emerald-950">Chào mừng trở lại</h2>
          <p className="mb-6 mt-1 text-sm text-emerald-950/55">
            Đăng nhập bằng tài khoản của bạn để tham gia dự đoán.
          </p>
          <LoginForm />
          <div className="mt-5 border-t border-slate-200 pt-5 text-center">
            <p className="text-sm text-slate-600">Chưa có tài khoản?</p>
            <Link
              href="/register"
              className="mt-2 inline-flex rounded-xl border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              Tạo tài khoản mới
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
