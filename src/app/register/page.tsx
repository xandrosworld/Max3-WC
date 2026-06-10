import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/matches");

  return (
    <main className="min-h-[100dvh] bg-[#07141d] lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(460px,2fr)]">
      <section className="relative min-h-64 overflow-hidden sm:min-h-80 lg:min-h-[100dvh]">
        <Image
          src="/messi-ronaldo-vip.png"
          alt="Messi và Ronaldo trong không khí sân vận động World Cup"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,12,18,0.12)_25%,rgba(3,12,18,0.9)_100%)] lg:bg-[linear-gradient(90deg,rgba(3,12,18,0.08)_45%,rgba(3,12,18,0.75)_100%),linear-gradient(180deg,rgba(3,12,18,0.06)_40%,rgba(3,12,18,0.9)_100%)]" />
        <Link
          href="/login"
          className="absolute left-5 top-5 inline-flex items-center rounded-xl bg-white/95 px-3 py-2 shadow-lg shadow-black/15 sm:left-8 sm:top-8"
          aria-label="WC 2026 Portal"
        >
          <Image
            src="/logo-ngang.png"
            alt="WC 2026"
            width={180}
            height={45}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8 lg:p-10">
          <p className="text-sm font-bold text-emerald-300">Gia nhập cuộc vui</p>
          <h1 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight text-balance sm:text-4xl lg:text-5xl">
            Một tài khoản, trọn mùa World Cup.
          </h1>
          <p className="mt-3 max-w-xl text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
            Dự đoán vui nội bộ, không phải nền tảng cá cược.
          </p>
        </div>
      </section>

      <section className="bg-[#f7faf8] px-5 py-10 sm:px-10 lg:flex lg:min-h-[100dvh] lg:items-center lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-bold text-emerald-700">Tài khoản mới</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[#082d24]">Tạo hồ sơ dự đoán</h2>
          <p className="mb-7 mt-3 text-sm leading-6 text-slate-600">
            Chọn tên đăng nhập riêng. Sau đó bạn có thể đổi ảnh đại diện và mật khẩu trong hồ sơ.
          </p>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-slate-600">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-bold text-emerald-700 hover:text-emerald-900">
              Đăng nhập
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
