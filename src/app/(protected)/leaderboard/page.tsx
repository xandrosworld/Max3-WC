import Image from "next/image";
import { formatCurrency } from "@/lib/domain";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireUser();
  const rows = await getLeaderboard();
  const totalLoss = rows.reduce((sum, row) => sum + row.loss, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paid, 0);
  const hopeStarUsed = rows.reduce((sum, row) => sum + row.hopeStarUsed, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            Bảng xếp hạng
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-emerald-950 md:text-4xl">
            Ai đang góp quỹ nhiều nhất?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Xếp hạng theo tổng tiền phải góp. Các chỉ số đúng, sai và Ngôi sao hy vọng giúp mọi người xem lại phong độ dự đoán.
          </p>
        </div>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/10">
            <Image
              src="/world-cup-hero.svg"
              alt="Không khí World Cup 2026"
              width={1200}
              height={720}
              className="h-40 w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-emerald-950/10 bg-white p-3 shadow-sm shadow-emerald-950/5">
            <Summary label="Tổng quỹ" value={formatCurrency(totalLoss)} />
            <Summary label="Đã nộp" value={formatCurrency(totalPaid)} />
            <Summary label="Ngôi sao" value={String(hopeStarUsed)} />
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5">
        <table className="w-full min-w-[1220px] text-sm">
          <thead className="bg-emerald-950 text-left text-white">
            <tr>
              {[
                "Hạng",
                "Người chơi",
                "Đã chọn",
                "Đúng",
                "Sai",
                "Tỷ lệ đúng",
                "Ngôi sao",
                "Ngôi sao sai",
                "Phải góp",
                "Đã nộp",
                "Còn thiếu",
                "Trạng thái",
              ].map((title) => (
                <th key={title} className="px-4 py-3 font-bold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className={`border-t border-slate-100 ${index % 2 ? "bg-slate-50/70" : ""}`}>
                <td className="px-4 py-3 text-lg font-black text-emerald-700">#{row.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar image={row.image} name={row.name} />
                    <div>
                      <p className="font-extrabold text-emerald-950">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.department || "Chưa có đơn vị"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{row.voted}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700">{row.correct}</td>
                <td className="px-4 py-3 tabular-nums text-red-700">{row.wrong}</td>
                <td className="px-4 py-3 tabular-nums">{row.accuracy.toFixed(1)}%</td>
                <td className="px-4 py-3 tabular-nums">{row.hopeStarUsed}</td>
                <td className="px-4 py-3 tabular-nums text-amber-700">{row.hopeStarWrong}</td>
                <td className="px-4 py-3 font-black text-red-700">{formatCurrency(row.loss)}</td>
                <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(row.paid)}</td>
                <td className={`px-4 py-3 font-bold ${row.outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {formatCurrency(row.outstanding)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {row.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-white p-10 text-center">
          <h2 className="text-xl font-extrabold text-emerald-950">Chưa có người chơi</h2>
          <p className="mt-2 text-sm text-slate-500">Admin tạo tài khoản hoặc người chơi tự đăng ký thì bảng này sẽ có dữ liệu.</p>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-lg font-black tabular-nums text-emerald-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Avatar({ image, name }: { image: string | null; name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={`Ảnh đại diện của ${name}`} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-emerald-200" />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-black text-emerald-900">
      {initial}
    </div>
  );
}
