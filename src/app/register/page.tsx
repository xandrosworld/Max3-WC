import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/matches");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#bfdbfe,_transparent_34%),radial-gradient(circle_at_bottom_right,_#fde68a,_transparent_32%),linear-gradient(135deg,#f8fafc,#ecfdf5)] px-4 py-12">
      <div className="mx-auto flex min-h-[75vh] max-w-xl items-center">
        <section className="w-full overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <Image
            src="/messi-ronaldo-vip.png"
            alt="Không khí World Cup 2026"
            width={1200}
            height={720}
            className="h-40 w-full object-cover"
          />
          <div className="p-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            WC 2026
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-emerald-950">
            Tạo tài khoản dự đoán
          </h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-emerald-950/60">
            Tạo tài khoản bằng tên đăng nhập riêng của bạn. Sau khi tạo xong, bạn có thể vào hồ sơ để đổi ảnh đại diện.
          </p>
          <RegisterForm />
          <p className="mt-5 text-center text-sm text-slate-600">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-bold text-emerald-700 hover:text-emerald-900">
              Đăng nhập
            </Link>
          </p>
          </div>
        </section>
      </div>
    </main>
  );
}
