import { MatchStatus, RoundType, TeamSide } from "@prisma/client";
import {
  addPaymentAction,
  bulkImportUsersAction,
  bulkImportMatchesAction,
  createUserAction,
  deleteMatchAction,
  resetPasswordAction,
  setMatchStatusAction,
  setUserLockAction,
  settleMatchFromApiAction,
  settleMatchAction,
  syncWorldCupFixturesAction,
  updateUserAction,
  upsertMatchAction,
  voidPaymentAction,
} from "@/app/actions";
import {
  formatCurrency,
  formatHandicap,
  formatVietnamTime,
  isPlaceholderTeamName,
  ROUND_LABELS,
  toVietnamDateTimeLocal,
} from "@/lib/domain";
import { FOOTBALL_DATA_SOURCE } from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const buttonClass =
  "rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800";
const dangerClass =
  "rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = (await searchParams) ?? {};
  const importedMatches = typeof params.importedMatches === "string" ? params.importedMatches : null;
  const skippedMatches = typeof params.skippedMatches === "string" ? params.skippedMatches : null;
  const fixtureCreated = typeof params.fixtureCreated === "string" ? params.fixtureCreated : null;
  const fixtureUpdated = typeof params.fixtureUpdated === "string" ? params.fixtureUpdated : null;
  const fixtureProtected =
    typeof params.fixtureProtected === "string" ? params.fixtureProtected : null;
  const fixtureSkippedRounds =
    typeof params.fixtureSkippedRounds === "string" ? params.fixtureSkippedRounds : null;
  const fixtureSyncError =
    typeof params.fixtureSyncError === "string" ? params.fixtureSyncError : null;
  const resultSynced = typeof params.resultSynced === "string" ? params.resultSynced : null;
  const resultScore = typeof params.resultScore === "string" ? params.resultScore : null;
  const resultSyncError =
    typeof params.resultSyncError === "string" ? params.resultSyncError : null;
  const createdUsers = typeof params.createdUsers === "string" ? params.createdUsers : null;
  const skippedUsers = typeof params.skippedUsers === "string" ? params.skippedUsers : null;
  const userImportErrors =
    typeof params.userImportErrors === "string" ? params.userImportErrors : null;
  const userImportFirstError =
    typeof params.userImportFirstError === "string" ? params.userImportFirstError : null;
  const footballDataConfigured = Boolean(process.env.FOOTBALL_DATA_TOKEN);
  const [matches, users, payments, audits] = await Promise.all([
    prisma.match.findMany({
      where: { deletedAt: null },
      orderBy: { kickoffAt: "asc" },
      include: { result: true, _count: { select: { votes: true } } },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      include: { user: true, confirmedBy: true, voidedBy: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: true },
    }),
  ]);

  return (
    <div className="space-y-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Control room
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-emerald-950">Quản trị MVP</h1>
        </div>
        <a
          href="/api/admin/export"
          className="rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Export Excel
        </a>
      </section>

      <AdminSection id="matches" title="Trận đấu & kết quả" description="Mức đóng góp tự gán theo vòng và được kiểm tra ở server.">
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-emerald-950">
                Đồng bộ lịch World Cup 2026 từ football-data.org
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tự lấy toàn bộ lịch với `competition=WC`, `season=2026`. Trận mới được tạo ở trạng
                thái nháp; kèo và dữ liệu đã có vote/kết quả không bị ghi đè.
              </p>
            </div>
            <form action={syncWorldCupFixturesAction}>
              <button
                disabled={!footballDataConfigured}
                className={`${buttonClass} disabled:cursor-not-allowed disabled:bg-slate-400`}
              >
                Đồng bộ lịch ngay
              </button>
            </form>
          </div>
          {!footballDataConfigured && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Chưa cấu hình `FOOTBALL_DATA_TOKEN` trên Railway nên nút đang bị khóa.
            </p>
          )}
          {fixtureSyncError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              Đồng bộ thất bại: {fixtureSyncError}
            </p>
          )}
          {fixtureCreated && (
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-emerald-900">
              Đồng bộ xong: tạo {fixtureCreated}, cập nhật {fixtureUpdated ?? 0}, giữ nguyên{" "}
              {fixtureProtected ?? 0} trận đã có vote/kết quả
              {fixtureSkippedRounds && Number(fixtureSkippedRounds) > 0
                ? `, bỏ qua ${fixtureSkippedRounds} loại vòng chưa có rule V6.`
                : "."}
            </p>
          )}
          {resultSyncError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              Lấy tỷ số tự động thất bại: {resultSyncError}
            </p>
          )}
          {resultSynced && (
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-emerald-900">
              Đã lấy tỷ số 90 phút từ football-data.org: {resultScore}.
            </p>
          )}
        </div>

        {importedMatches && (
          <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Đã import {importedMatches} trận
            {skippedMatches && Number(skippedMatches) > 0 ? `, bỏ qua ${skippedMatches} dòng trùng.` : "."}
          </p>
        )}

        <details className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <summary className="font-bold text-emerald-950">Import nhiều trận từ Excel/CSV</summary>
          <form action={bulkImportMatchesAction} className="mt-3 space-y-3">
            <textarea
              name="matchesBulk"
              required
              rows={6}
              placeholder={`Đội A,Đội B,Giờ Việt Nam,Vòng,Chấp,Đội bị chấp,Trạng thái
Mexico,South Africa,2026-06-12 02:00,GROUP,0,,DRAFT
Brazil,Serbia,2026-06-15 02:00,GROUP,2,TEAM_A,OPEN`}
              className={`${inputClass} min-h-40 w-full font-mono`}
            />
            <p className="text-xs leading-5 text-slate-600">
              Dán từ Excel cũng được: tab/comma/semicolon đều đọc được. Giờ nhập theo UTC+7.
              Vòng dùng `GROUP`, `ROUND_OF_32`, `ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `FINAL`.
              Trạng thái nên để `DRAFT` để chưa hiện ra màn người chơi.
            </p>
            <button className={buttonClass}>Import danh sách trận</button>
          </form>
        </details>

        <details className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <summary className="font-bold text-amber-950">
            Đường lùi nhập tay từng trận khi API thiếu
          </summary>
          <form action={upsertMatchAction} className="mt-3 grid gap-3 md:grid-cols-4">
            <input name="teamA" required placeholder="Đội A" className={inputClass} />
            <input name="teamB" required placeholder="Đội B" className={inputClass} />
            <input name="kickoffLocal" required type="datetime-local" className={inputClass} />
            <select name="round" className={inputClass}>
              {Object.values(RoundType).map((round) => (
                <option key={round} value={round}>{ROUND_LABELS[round]}</option>
              ))}
            </select>
            <input name="handicap" required type="number" min="0" step="1" defaultValue="0" placeholder="Mức chấp" className={inputClass} />
            <select name="handicappedTeam" className={inputClass}>
              <option value="">Không đội nào (kèo 0)</option>
              <option value={TeamSide.TEAM_A}>Đội A bị chấp</option>
              <option value={TeamSide.TEAM_B}>Đội B bị chấp</option>
            </select>
            <button className={`${buttonClass} md:col-span-2`}>Tạo trận</button>
          </form>
        </details>

        <div className="mt-4 space-y-4">
          {matches.map((match) => {
            const hasPlaceholderTeam =
              isPlaceholderTeamName(match.teamA) || isPlaceholderTeamName(match.teamB);

            return (
            <article key={match.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-emerald-950">{match.teamA} vs {match.teamB}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {ROUND_LABELS[match.round]} · {formatVietnamTime(match.kickoffAt)} · {formatHandicap(match)} · {formatCurrency(match.contributionAmount)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {match.status} · {match._count.votes} vote
                    {match.result && ` · KQ 90': ${match.result.teamAScore}-${match.result.teamBScore} · revision ${match.result.revision}`}
                  </p>
                  {hasPlaceholderTeam && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      Chờ API cập nhật đội trước khi mở kèo.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {match.status !== MatchStatus.SETTLED && (
                    <>
                      <StatusButton
                        id={match.id}
                        status={MatchStatus.OPEN}
                        label="Mở kèo"
                        disabled={hasPlaceholderTeam}
                      />
                      <StatusButton id={match.id} status={MatchStatus.CLOSED} label="Đóng kèo" />
                    </>
                  )}
                  {match.status !== MatchStatus.SETTLED && !match.result && (
                    <form action={deleteMatchAction}>
                      <input type="hidden" name="id" value={match.id} />
                      <button className={dangerClass}>Xóa mềm</button>
                    </form>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {match.status !== MatchStatus.SETTLED && !match.result && (
                  <details className="rounded-xl bg-slate-50 p-3">
                    <summary className="text-sm font-bold text-slate-700">Sửa thông tin trận</summary>
                    <form action={upsertMatchAction} className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input type="hidden" name="id" value={match.id} />
                      <input name="teamA" required defaultValue={match.teamA} className={inputClass} />
                      <input name="teamB" required defaultValue={match.teamB} className={inputClass} />
                      <input name="kickoffLocal" required type="datetime-local" defaultValue={toVietnamDateTimeLocal(match.kickoffAt)} className={inputClass} />
                      <select name="round" defaultValue={match.round} className={inputClass}>
                        {Object.values(RoundType).map((round) => <option key={round} value={round}>{ROUND_LABELS[round]}</option>)}
                      </select>
                      <input name="handicap" required type="number" min="0" step="1" defaultValue={match.handicap} className={inputClass} />
                      <select name="handicappedTeam" defaultValue={match.handicappedTeam ?? ""} className={inputClass}>
                        <option value="">Không đội nào (kèo 0)</option>
                        <option value={TeamSide.TEAM_A}>Đội A bị chấp</option>
                        <option value={TeamSide.TEAM_B}>Đội B bị chấp</option>
                      </select>
                      <button className={`${buttonClass} sm:col-span-2`}>Lưu sửa đổi</button>
                    </form>
                  </details>
                )}
                <form action={settleMatchAction} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl bg-amber-50 p-3">
                  <input type="hidden" name="matchId" value={match.id} />
                  <input name="teamAScore" required type="number" min="0" defaultValue={match.result?.teamAScore ?? ""} placeholder={`Bàn ${match.teamA}`} className={inputClass} />
                  <input name="teamBScore" required type="number" min="0" defaultValue={match.result?.teamBScore ?? ""} placeholder={`Bàn ${match.teamB}`} className={inputClass} />
                  <button className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700">
                    Tính kết quả
                  </button>
                </form>
                {match.externalSource === FOOTBALL_DATA_SOURCE && match.externalFixtureId && (
                  <form action={settleMatchFromApiAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 p-3">
                    <input type="hidden" name="matchId" value={match.id} />
                    <span className="text-sm font-semibold text-sky-950">
                      football-data.org fixture #{match.externalFixtureId}
                    </span>
                    <button
                      disabled={!footballDataConfigured}
                      className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      Lấy tỷ số API
                    </button>
                  </form>
                )}
              </div>
            </article>
            );
          })}
        </div>
      </AdminSection>

      <AdminSection id="users" title="Người dùng" description="Tạo tài khoản nội bộ, sửa hồ sơ, khóa và reset mật khẩu.">
        {createdUsers && (
          <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Đã tạo {createdUsers} user
            {skippedUsers && Number(skippedUsers) > 0 ? `, bỏ qua ${skippedUsers} user trùng.` : "."}
          </p>
        )}
        {userImportErrors && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Import user có {userImportErrors} lỗi{userImportFirstError ? `: ${userImportFirstError}` : "."}
          </p>
        )}
        <details className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <summary className="font-bold text-emerald-950">Import nhiều user từ Excel/CSV</summary>
          <form action={bulkImportUsersAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_260px]">
            <textarea
              name="usersBulk"
              required
              rows={6}
              placeholder={`username,Họ tên,Đơn vị
an.nguyen,An Nguyễn,Sales
binh.tran,Bình Trần,Marketing`}
              className={`${inputClass} min-h-40 w-full font-mono`}
            />
            <div className="space-y-3">
              <input
                name="bulkPassword"
                required
                minLength={8}
                maxLength={128}
                placeholder="Mật khẩu tạm chung"
                className={`${inputClass} w-full`}
              />
              <p className="text-xs leading-5 text-slate-600">
                User sẽ bị buộc đổi mật khẩu ở lần đăng nhập đầu tiên. Dán từ Excel được:
                tab/comma/semicolon đều đọc được.
              </p>
              <button className={`${buttonClass} w-full`}>Import user</button>
            </div>
          </form>
        </details>
        <form action={createUserAction} className="grid gap-3 rounded-2xl bg-emerald-50 p-4 md:grid-cols-4">
          <input name="username" required placeholder="username" className={inputClass} />
          <input name="name" required placeholder="Họ tên" className={inputClass} />
          <input name="department" placeholder="Đơn vị/phòng ban" className={inputClass} />
          <input name="password" required minLength={8} placeholder="Mật khẩu tạm" className={inputClass} />
          <button className={`${buttonClass} md:col-span-4`}>Tạo user</button>
        </form>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {users.map((user) => (
            <article key={user.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-emerald-950">{user.name}</h3>
                  <p className="text-xs text-slate-500">@{user.username} · {user.role} · {user.banned ? "Đã khóa" : "Đang hoạt động"}</p>
                </div>
                <form action={setUserLockAction}>
                  <input type="hidden" name="id" value={user.id} />
                  <input type="hidden" name="banned" value={String(!user.banned)} />
                  <button className={user.banned ? buttonClass : dangerClass}>{user.banned ? "Mở khóa" : "Khóa"}</button>
                </form>
              </div>
              <form action={updateUserAction} className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                <input type="hidden" name="id" value={user.id} />
                <input name="name" required defaultValue={user.name} className={inputClass} />
                <input name="department" defaultValue={user.department} className={inputClass} />
                <button className={buttonClass}>Lưu</button>
              </form>
              <form action={resetPasswordAction} className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <input type="hidden" name="id" value={user.id} />
                <input name="newPassword" required minLength={8} placeholder="Mật khẩu mới" className={inputClass} />
                <button className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white">Reset mật khẩu</button>
              </form>
            </article>
          ))}
        </div>
      </AdminSection>

      <AdminSection id="payments" title="Tiền nộp quỹ" description="Payment là ledger; bản ghi sai được void thay vì xóa.">
        <form action={addPaymentAction} className="grid gap-3 rounded-2xl bg-emerald-50 p-4 md:grid-cols-4">
          <select name="userId" required className={inputClass}>
            <option value="">Chọn người nộp</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.department}</option>)}
          </select>
          <input name="amount" required type="number" min="1" step="1000" placeholder="Số tiền" className={inputClass} />
          <input name="paidAt" required type="datetime-local" defaultValue={toVietnamDateTimeLocal(new Date())} className={inputClass} />
          <input name="note" placeholder="Ghi chú" className={inputClass} />
          <button className={`${buttonClass} md:col-span-4`}>Ghi nhận đã nộp</button>
        </form>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-800 text-left text-white">
              <tr>{["Người nộp", "Số tiền", "Ngày giờ", "Ghi chú", "Xác nhận", "Trạng thái", "Thao tác"].map((x) => <th key={x} className="px-3 py-2">{x}</th>)}</tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-bold">{payment.user.name}</td>
                  <td className="px-3 py-2">{formatCurrency(payment.amount)}</td>
                  <td className="px-3 py-2">{formatVietnamTime(payment.paidAt)}</td>
                  <td className="px-3 py-2">{payment.note || "-"}</td>
                  <td className="px-3 py-2">{payment.confirmedBy.name}</td>
                  <td className="px-3 py-2">{payment.voidedAt ? `Đã void bởi ${payment.voidedBy?.name}` : "Có hiệu lực"}</td>
                  <td className="px-3 py-2">
                    {!payment.voidedAt && (
                      <form action={voidPaymentAction} className="flex gap-2">
                        <input type="hidden" name="id" value={payment.id} />
                        <input name="reason" required placeholder="Lý do void" className={`${inputClass} w-32`} />
                        <button className={dangerClass}>Void</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection id="audit" title="Audit gần nhất" description="Dấu vết thao tác quản trị quan trọng.">
        <div className="space-y-2">
          {audits.map((log) => (
            <div key={log.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span><b>{log.actor.name}</b> · {log.action} · {log.entityType}/{log.entityId}</span>
              <span className="text-slate-500">{formatVietnamTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}

function AdminSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-lg shadow-emerald-950/5">
      <h2 className="text-xl font-extrabold text-emerald-950">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">{description}</p>
      {children}
    </section>
  );
}

function StatusButton({
  id,
  status,
  label,
  disabled = false,
}: {
  id: string;
  status: MatchStatus;
  label: string;
  disabled?: boolean;
}) {
  return (
    <form action={setMatchStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        disabled={disabled}
        className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {label}
      </button>
    </form>
  );
}
