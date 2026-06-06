import { formatCurrency } from "@/lib/domain";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireUser();
  const rows = await getLeaderboard();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
          Vinh danh nhà tài trợ
        </p>
        <h1 className="mt-1 text-3xl font-black text-emerald-950">Leaderboard quỹ chung</h1>
        <p className="mt-2 text-sm text-slate-500">
          Mặc định xếp theo accumulated loss giảm dần.
        </p>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-emerald-950 text-left text-white">
            <tr>
              {["Rank", "Họ tên", "Đơn vị", "Đã vote", "Đúng", "Tỷ lệ đúng", "Phải nộp", "Đã nộp", "Còn thiếu", "Trạng thái"].map((title) => (
                <th key={title} className="px-4 py-3 font-bold">{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className={`border-t border-slate-100 ${index % 2 ? "bg-slate-50/70" : ""}`}>
                <td className="px-4 py-3 text-lg font-black text-emerald-700">#{row.rank}</td>
                <td className="px-4 py-3 font-bold text-emerald-950">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.department}</td>
                <td className="px-4 py-3">{row.voted}</td>
                <td className="px-4 py-3">{row.correct}</td>
                <td className="px-4 py-3">{row.accuracy.toFixed(1)}%</td>
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
    </div>
  );
}
