import Image from "next/image";
import { Crown, Medal, Target, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/domain";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireUser();
  const rows = await getLeaderboard();
  const totalLoss = rows.reduce((sum, row) => sum + row.loss, 0);
  const totalMissed = rows.reduce((sum, row) => sum + row.missed, 0);
  const hopeStarUsed = rows.reduce((sum, row) => sum + row.hopeStarUsed, 0);
  const predictionKings = [...rows]
    .filter((row) => row.correct + row.wrong + row.missed > 0)
    .sort(
      (a, b) =>
        b.correct - a.correct ||
        b.accuracy - a.accuracy ||
        a.missed - b.missed ||
        a.loss - b.loss ||
        a.name.localeCompare(b.name, "vi"),
    )
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div className="space-y-5">
          <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            Bảng xếp hạng
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-emerald-950 md:text-4xl">
            Ai đang phải nộp nhiều nhất?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Theo dõi lựa chọn, độ chính xác và số tiền phải nộp sau các trận đã chốt. Quên chọn cũng tính là thua theo mức của vòng.
          </p>
          </div>
          <PredictionKings rows={predictionKings} />
        </div>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/10">
            <Image
              src="/messi-ronaldo-vip.png"
              alt="Không khí World Cup 2026"
              width={1200}
              height={720}
              className="h-40 w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-emerald-950/10 bg-white p-3 shadow-sm shadow-emerald-950/5">
            <Summary label="Tổng phải nộp" value={formatCurrency(totalLoss)} />
            <Summary label="Quên chọn" value={String(totalMissed)} />
            <Summary label="Ngôi sao" value={String(hopeStarUsed)} />
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-emerald-950 text-left text-white">
            <tr>
              {[
                "Hạng",
                "Người chơi",
                "Đã chọn",
                "Quên chọn",
                "Đúng",
                "Sai",
                "Độ chính xác",
                "Ngôi sao",
                "Ngôi sao sai",
                "Phải nộp",
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
                <td className="px-4 py-3 tabular-nums text-amber-700">{row.missed}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700">{row.correct}</td>
                <td className="px-4 py-3 tabular-nums text-red-700">{row.wrong}</td>
                <td className="px-4 py-3 tabular-nums">{row.accuracy.toFixed(1)}%</td>
                <td className="px-4 py-3 tabular-nums">{row.hopeStarUsed}</td>
                <td className="px-4 py-3 tabular-nums text-amber-700">{row.hopeStarWrong}</td>
                <td className="px-4 py-3 font-black text-red-700">{formatCurrency(row.loss)}</td>
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

type LeaderboardRow = Awaited<ReturnType<typeof getLeaderboard>>[number];

function PredictionKings({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
            <Trophy size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-700">
              Vua dự đoán
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Chờ trận đầu tiên được chốt để vinh danh top 3.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="prediction-kings-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-amber-700">
            <Crown size={18} aria-hidden="true" />
            Vua dự đoán
          </p>
          <h2 id="prediction-kings-title" className="mt-1 text-xl font-black text-emerald-950">
            Top 3 đoán trúng nhiều nhất
          </h2>
        </div>
        <p className="text-xs font-bold text-slate-500">
          Xếp theo số trận đúng, rồi đến độ chính xác.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((row, index) => (
          <PredictionKingCard key={row.id} row={row} index={index} />
        ))}
      </div>
    </section>
  );
}

function PredictionKingCard({
  row,
  index,
}: {
  row: LeaderboardRow;
  index: number;
}) {
  const styles = [
    {
      wrap: "border-amber-200 bg-amber-50 shadow-amber-900/10",
      badge: "bg-amber-400 text-amber-950",
      accent: "text-amber-700",
      label: "Vua sân cỏ",
    },
    {
      wrap: "border-slate-200 bg-white shadow-slate-900/10",
      badge: "bg-slate-200 text-slate-800",
      accent: "text-slate-600",
      label: "Bám sát",
    },
    {
      wrap: "border-orange-200 bg-orange-50 shadow-orange-900/10",
      badge: "bg-orange-300 text-orange-950",
      accent: "text-orange-700",
      label: "Phong độ cao",
    },
  ][index];

  return (
    <article className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg ${styles.wrap}`}>
      <div className="absolute right-3 top-3 opacity-20">
        {index === 0 ? (
          <Crown size={44} aria-hidden="true" />
        ) : (
          <Medal size={42} aria-hidden="true" />
        )}
      </div>
      <div className="relative flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${styles.badge}`}>
          #{index + 1}
        </div>
        <Avatar image={row.image} name={row.name} />
        <div className="min-w-0">
          <p className="truncate font-black text-emerald-950">{row.name}</p>
          <p className="truncate text-xs font-semibold text-slate-500">
            {row.department || "Chưa có đơn vị"}
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Đúng" value={String(row.correct)} strong />
        <MiniStat label="Chính xác" value={`${row.accuracy.toFixed(0)}%`} />
        <MiniStat label="Quên" value={String(row.missed)} />
      </div>
      <div className={`relative mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] ${styles.accent}`}>
        <Target size={15} aria-hidden="true" />
        {styles.label}
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/80 px-2 py-2 ring-1 ring-black/5">
      <p className={`text-base font-black tabular-nums ${strong ? "text-emerald-700" : "text-emerald-950"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-slate-500">{label}</p>
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
