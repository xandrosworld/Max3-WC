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
  syncOddsSuggestionsAction,
  syncWorldCupFixturesAction,
  updateUserAction,
  upsertMatchAction,
  voidPaymentAction,
} from "@/app/actions";
import {
  formatCurrency,
  formatHandicap,
  formatVietnamTime,
  isVoteLocked,
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

type AdminMatchFilter = "all" | "draft" | "open" | "locked" | "needsResult" | "settled";

const adminMatchFilters: Array<{ id: AdminMatchFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "draft", label: "Chưa mở" },
  { id: "open", label: "Đang mở" },
  { id: "locked", label: "Đã khóa" },
  { id: "needsResult", label: "Cần chốt tỷ số" },
  { id: "settled", label: "Đã chốt" },
];

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
  const oddsSyncError =
    typeof params.oddsSyncError === "string" ? params.oddsSyncError : null;
  const oddsEvents = typeof params.oddsEvents === "string" ? params.oddsEvents : null;
  const oddsMatched = typeof params.oddsMatched === "string" ? params.oddsMatched : null;
  const oddsApplied = typeof params.oddsApplied === "string" ? params.oddsApplied : null;
  const oddsUnchanged =
    typeof params.oddsUnchanged === "string" ? params.oddsUnchanged : null;
  const oddsCredits = typeof params.oddsCredits === "string" ? params.oddsCredits : null;
  const createdUsers = typeof params.createdUsers === "string" ? params.createdUsers : null;
  const skippedUsers = typeof params.skippedUsers === "string" ? params.skippedUsers : null;
  const userImportErrors =
    typeof params.userImportErrors === "string" ? params.userImportErrors : null;
  const userImportFirstError =
    typeof params.userImportFirstError === "string" ? params.userImportFirstError : null;
  const rawMatchFilter = typeof params.matchFilter === "string" ? params.matchFilter : "all";
  const matchFilter = adminMatchFilters.some((filter) => filter.id === rawMatchFilter)
    ? (rawMatchFilter as AdminMatchFilter)
    : "all";
  const now = new Date();
  const footballDataConfigured = Boolean(process.env.FOOTBALL_DATA_TOKEN);
  const oddsApiConfigured = Boolean(process.env.THE_ODDS_API_KEY);
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

  const matchRows = matches.map((match) => {
    const hasPlaceholderTeam =
      isPlaceholderTeamName(match.teamA) || isPlaceholderTeamName(match.teamB);
    const locked = isVoteLocked(match, now);
    const matchHasStarted = now.getTime() >= match.kickoffAt.getTime();
    const needsResult =
      matchHasStarted &&
      !match.result &&
      match.status !== MatchStatus.CANCELLED &&
      match.status !== MatchStatus.SETTLED;
    return { match, hasPlaceholderTeam, locked, matchHasStarted, needsResult };
  });
  const displayedMatchRows = matchRows.filter((row) => adminMatchPassesFilter(matchFilter, row));
  const workStats = {
    draft: matchRows.filter((row) => row.match.status === MatchStatus.DRAFT && !row.hasPlaceholderTeam).length,
    open: matchRows.filter((row) => row.match.status === MatchStatus.OPEN && !row.locked).length,
    soonLocking: matchRows.filter((row) => isLockingSoon(row.match, now)).length,
    needsResult: matchRows.filter((row) => row.needsResult).length,
    settled: matchRows.filter((row) => row.match.result || row.match.status === MatchStatus.SETTLED).length,
  };

  return (
    <div className="space-y-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Khu điều hành
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-emerald-950">Quản trị World Cup 2026</h1>
        </div>
        <a
          href="/api/admin/export"
          className="rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Tải bảng Excel
        </a>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <AdminMetric label="Cần mở kèo" value={workStats.draft} href="/admin?matchFilter=draft" />
        <AdminMetric label="Đang mở" value={workStats.open} href="/admin?matchFilter=open" />
        <AdminMetric label="Sắp khóa" value={workStats.soonLocking} href="/admin?matchFilter=open" tone="warn" />
        <AdminMetric label="Cần chốt tỷ số" value={workStats.needsResult} href="/admin?matchFilter=needsResult" tone="danger" />
        <AdminMetric label="Đã chốt" value={workStats.settled} href="/admin?matchFilter=settled" />
      </section>

      <AdminSection id="matches" title="Quản lý trận đấu" description="Chọn trận, đặt kèo, mở dự đoán và chốt tỷ số sau trận.">
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-emerald-950">
                Cập nhật lịch World Cup 2026 tự động
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Hệ thống tự lấy danh sách trận và giờ đá. Trận mới sẽ ở trạng thái chưa mở; các trận đã có người chọn hoặc đã chốt kết quả sẽ không bị ghi đè.
              </p>
            </div>
            <form action={syncWorldCupFixturesAction}>
              <button
                disabled={!footballDataConfigured}
                className={`${buttonClass} disabled:cursor-not-allowed disabled:bg-slate-400`}
              >
                Cập nhật lịch
              </button>
            </form>
          </div>
          {!footballDataConfigured && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Chưa kết nối nguồn dữ liệu tự động nên nút này đang bị khóa.
            </p>
          )}
          {fixtureSyncError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              Cập nhật lịch thất bại: {fixtureSyncError}
            </p>
          )}
          {fixtureCreated && (
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-emerald-900">
              Cập nhật xong: thêm {fixtureCreated} trận, cập nhật {fixtureUpdated ?? 0} trận, giữ nguyên{" "}
              {fixtureProtected ?? 0} trận đã có người chọn hoặc kết quả
              {fixtureSkippedRounds && Number(fixtureSkippedRounds) > 0
                ? `, bỏ qua ${fixtureSkippedRounds} trận chưa thuộc luật chơi hiện tại.`
                : "."}
            </p>
          )}
          {resultSyncError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              Lấy tỷ số thất bại: {resultSyncError}
            </p>
          )}
          {resultSynced && (
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-emerald-900">
              Đã lấy tỷ số 90 phút: {resultScore}.
            </p>
          )}
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-amber-950">
                  Lấy kèo gợi ý cho các trận chưa mở
                </h3>
                <p className="mt-1 text-sm leading-6 text-amber-950/80">
                  Hệ thống lấy kèo tham khảo, làm tròn thành kèo dễ chơi rồi điền vào
                  các trận chưa mở. Trận đã mở, đã có người chọn hoặc đã có kết quả sẽ
                  được giữ nguyên.
                </p>
              </div>
              <form action={syncOddsSuggestionsAction}>
                <button
                  disabled={!oddsApiConfigured}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Lấy kèo gợi ý
                </button>
              </form>
            </div>
            <p className="mt-2 text-xs font-semibold text-amber-900">
              Mỗi lần bấm thường tốn khoảng 2 credit. Hãy dùng trước khi mở dự đoán.
            </p>
            {!oddsApiConfigured && (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-amber-900">
                Chưa có key lấy kèo gợi ý nên nút này đang bị khóa.
              </p>
            )}
            {oddsSyncError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                Lấy kèo gợi ý thất bại: {oddsSyncError}
              </p>
            )}
            {oddsApplied && (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-amber-950">
                Đã đọc {oddsEvents ?? 0} trận từ nguồn kèo, khớp {oddsMatched ?? 0}
                trận trong hệ thống, điền mới {oddsApplied} trận
                {oddsUnchanged ? `, giữ nguyên ${oddsUnchanged} trận đã đúng kèo` : ""}
                {oddsCredits ? `. Lần bấm này dùng ${oddsCredits} credit.` : "."}
              </p>
            )}
          </div>
        </div>

        {importedMatches && (
          <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Đã thêm {importedMatches} trận
            {skippedMatches && Number(skippedMatches) > 0 ? `, bỏ qua ${skippedMatches} dòng trùng.` : "."}
          </p>
        )}

        <details className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <summary className="font-bold text-emerald-950">Bỏ qua mục này: thêm nhiều trận thủ công nếu cần</summary>
          <form action={bulkImportMatchesAction} className="mt-3 space-y-3">
            <textarea
              name="matchesBulk"
              required
              rows={6}
              placeholder={`Đội A,Đội B,Giờ Việt Nam,Vòng,Chấp,Đội bị chấp,Trạng thái
Mexico,South Africa,2026-06-12 02:00,Vòng bảng,0,,Nháp
Brazil,Serbia,2026-06-15 02:00,Vòng bảng,2,Đội A,Mở`}
              className={`${inputClass} min-h-40 w-full font-mono`}
            />
            <p className="text-xs leading-5 text-slate-600">
              Chỉ dùng mục này nếu nguồn tự động thiếu trận. Bình thường không cần nhập ở đây.
            </p>
            <button className={buttonClass}>Thêm danh sách trận</button>
          </form>
        </details>

        <details className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <summary className="font-bold text-amber-950">
            Bỏ qua mục này: chỉ tạo một trận thủ công khi cần
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

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {adminMatchFilters.map((filter) => {
            const selected = filter.id === matchFilter;
            return (
              <a
                key={filter.id}
                href={filter.id === "all" ? "/admin" : `/admin?matchFilter=${filter.id}`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ring-1 ${
                  selected
                    ? "bg-emerald-900 text-white ring-emerald-900"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-900"
                }`}
              >
                {filter.label}
              </a>
            );
          })}
        </div>

        <div className="mt-4 space-y-4">
          {displayedMatchRows.map(({ match, hasPlaceholderTeam, matchHasStarted }) => (
            <article key={match.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-emerald-950">{match.teamA} vs {match.teamB}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {ROUND_LABELS[match.round]} · {formatVietnamTime(match.kickoffAt)} · {formatHandicap(match)} · {formatCurrency(match.contributionAmount)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {matchStatusLabel(match.status)} · {match._count.votes} lượt chọn
                    {match.result && ` · Tỷ số 90': ${match.result.teamAScore}-${match.result.teamBScore}`}
                  </p>
                  {hasPlaceholderTeam && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      Chờ nguồn dữ liệu cập nhật đội trước khi mở dự đoán.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {match.status !== MatchStatus.SETTLED && !match.result && (
                    <form action={deleteMatchAction}>
                      <input type="hidden" name="id" value={match.id} />
                      <button className={dangerClass}>Xóa mềm</button>
                    </form>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                {match.status !== MatchStatus.SETTLED && !match.result && (
                  <section className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                      1. Đặt kèo trước trận
                    </p>
                    <form action={upsertMatchAction} className="mt-3 grid gap-2">
                      <input type="hidden" name="id" value={match.id} />
                      <input type="hidden" name="teamA" value={match.teamA} />
                      <input type="hidden" name="teamB" value={match.teamB} />
                      <input type="hidden" name="kickoffLocal" value={toVietnamDateTimeLocal(match.kickoffAt)} />
                      <input type="hidden" name="round" value={match.round} />
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        Mức chấp
                        <input name="handicap" required type="number" min="0" step="1" defaultValue={match.handicap} className={inputClass} />
                      </label>
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        Đội bị chấp
                        <select name="handicappedTeam" defaultValue={match.handicappedTeam ?? ""} className={inputClass}>
                          <option value="">Không đội nào (kèo 0)</option>
                          <option value={TeamSide.TEAM_A}>{match.teamA} bị chấp</option>
                          <option value={TeamSide.TEAM_B}>{match.teamB} bị chấp</option>
                        </select>
                      </label>
                      <button className={buttonClass}>Lưu kèo</button>
                    </form>
                    <details className="mt-3 text-xs text-slate-600">
                      <summary className="cursor-pointer font-bold text-slate-700">
                        Sửa đội/giờ/vòng nếu dữ liệu sai
                      </summary>
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
                  </section>
                )}

                {match.status !== MatchStatus.SETTLED && (
                  <section className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      2. Mở/đóng dự đoán
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      Mở dự đoán thì trận này mới hiện cho người chơi. Đóng dự đoán thì người chơi không đổi lựa chọn được nữa.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusButton
                        id={match.id}
                        status={MatchStatus.OPEN}
                        label="Mở cho người chơi"
                        disabled={hasPlaceholderTeam}
                      />
                      <StatusButton id={match.id} status={MatchStatus.CLOSED} label="Đóng lựa chọn" />
                    </div>
                  </section>
                )}

                <section className="rounded-xl bg-sky-50 p-3">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-sky-800">
                    3. Sau trận: tính kết quả
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Sau khi có tỷ số 90 phút, bấm lấy tự động trước; chỉ nhập tay nếu hệ thống chưa có dữ liệu.
                  </p>
                  {match.externalSource === FOOTBALL_DATA_SOURCE && match.externalFixtureId && (
                    <form action={settleMatchFromApiAction} className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <input type="hidden" name="matchId" value={match.id} />
                      <span className="text-xs font-semibold text-sky-950">
                        Có thể lấy tỷ số tự động
                      </span>
                      <button
                        disabled={!footballDataConfigured || !matchHasStarted}
                        className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        Lấy tỷ số tự động
                      </button>
                    </form>
                  )}
                  {!matchHasStarted && (
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Chưa đến giờ đá nên chưa lấy được tỷ số.
                    </p>
                  )}
                  <details className="mt-3 text-xs text-slate-600">
                    <summary className="cursor-pointer font-bold text-slate-700">
                      Nhập tay tỷ số nếu cần
                    </summary>
                    <form action={settleMatchAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="matchId" value={match.id} />
                      <input name="teamAScore" required type="number" min="0" defaultValue={match.result?.teamAScore ?? ""} placeholder={`Bàn ${match.teamA}`} className={inputClass} />
                      <input name="teamBScore" required type="number" min="0" defaultValue={match.result?.teamBScore ?? ""} placeholder={`Bàn ${match.teamB}`} className={inputClass} />
                      <button className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700">
                        Tính kết quả
                      </button>
                    </form>
                  </details>
                </section>
              </div>
            </article>
          ))}
          {displayedMatchRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-white p-8 text-center">
              <h3 className="font-extrabold text-emerald-950">Không có trận nào ở mục này</h3>
              <p className="mt-2 text-sm text-slate-500">Đổi bộ lọc hoặc cập nhật lịch nếu bạn cần thêm trận mới.</p>
            </div>
          )}
        </div>
      </AdminSection>

      <AdminSection id="users" title="Người chơi" description="Tạo tài khoản, sửa thông tin, khóa/mở và cấp lại mật khẩu.">
        {createdUsers && (
          <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Đã tạo {createdUsers} tài khoản
            {skippedUsers && Number(skippedUsers) > 0 ? `, bỏ qua ${skippedUsers} tài khoản trùng.` : "."}
          </p>
        )}
        {userImportErrors && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Tạo tài khoản hàng loạt có {userImportErrors} lỗi{userImportFirstError ? `: ${userImportFirstError}` : "."}
          </p>
        )}
        <details className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <summary className="font-bold text-emerald-950">Tạo nhiều tài khoản cùng lúc</summary>
          <form action={bulkImportUsersAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_260px]">
            <textarea
              name="usersBulk"
              required
              rows={6}
              placeholder={`Tên đăng nhập,Họ tên,Đơn vị
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
                Người chơi sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên. Có thể dán thẳng danh sách từ Excel.
              </p>
              <button className={`${buttonClass} w-full`}>Tạo tài khoản</button>
            </div>
          </form>
        </details>
        <form action={createUserAction} className="grid gap-3 rounded-2xl bg-emerald-50 p-4 md:grid-cols-4">
          <input name="username" required placeholder="Tên đăng nhập" className={inputClass} />
          <input name="name" required placeholder="Họ tên" className={inputClass} />
          <input name="department" placeholder="Đơn vị/phòng ban" className={inputClass} />
          <input name="password" required minLength={8} placeholder="Mật khẩu tạm" className={inputClass} />
          <button className={`${buttonClass} md:col-span-4`}>Tạo tài khoản</button>
        </form>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {users.map((user) => (
            <article key={user.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-emerald-950">{user.name}</h3>
                  <p className="text-xs text-slate-500">
                    Tên đăng nhập: {user.username} · {userRoleLabel(user.role)} · {user.banned ? "Đã khóa" : "Đang hoạt động"}
                  </p>
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

      <AdminSection id="payments" title="Tiền nộp quỹ" description="Ghi nhận người đã nộp tiền. Nếu nhập sai thì hủy bản ghi và nhập lại.">
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
                  <td className="px-3 py-2">{payment.voidedAt ? `Đã hủy bởi ${payment.voidedBy?.name}` : "Đã ghi nhận"}</td>
                  <td className="px-3 py-2">
                    {!payment.voidedAt && (
                      <form action={voidPaymentAction} className="flex gap-2">
                        <input type="hidden" name="id" value={payment.id} />
                        <input name="reason" required placeholder="Lý do hủy" className={`${inputClass} w-32`} />
                        <button className={dangerClass}>Hủy</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection id="audit" title="Lịch sử thao tác gần nhất" description="Các thay đổi quan trọng do quản trị viên thực hiện.">
        <div className="space-y-2">
          {audits.map((log) => (
            <div key={log.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span><b>{log.actor.name}</b> · {auditActionLabel(log.action)}</span>
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

function AdminMetric({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-emerald-800";
  return (
    <a
      href={href}
      className="rounded-3xl border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5 hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className={`text-3xl font-black tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-600">{label}</p>
    </a>
  );
}

function adminMatchPassesFilter(
  filter: AdminMatchFilter,
  row: {
    match: { status: MatchStatus; result: unknown };
    locked: boolean;
    needsResult: boolean;
  },
) {
  if (filter === "all") return true;
  if (filter === "draft") return row.match.status === MatchStatus.DRAFT;
  if (filter === "open") return row.match.status === MatchStatus.OPEN && !row.locked;
  if (filter === "locked") return row.locked && !row.match.result;
  if (filter === "needsResult") return row.needsResult;
  return Boolean(row.match.result) || row.match.status === MatchStatus.SETTLED;
}

function isLockingSoon(
  match: { status: MatchStatus; kickoffAt: Date },
  now: Date,
) {
  if (match.status !== MatchStatus.OPEN || isVoteLocked(match, now)) return false;
  const lockAt = match.kickoffAt.getTime() - 5 * 60_000;
  return lockAt > now.getTime() && lockAt - now.getTime() <= 6 * 60 * 60_000;
}

function matchStatusLabel(status: MatchStatus) {
  if (status === MatchStatus.DRAFT) return "Chưa mở";
  if (status === MatchStatus.OPEN) return "Đang mở dự đoán";
  if (status === MatchStatus.CLOSED) return "Đã đóng dự đoán";
  if (status === MatchStatus.SETTLED) return "Đã tính kết quả";
  return "Đã hủy";
}

function userRoleLabel(role: string) {
  return role === "admin" ? "Quản trị viên" : "Người chơi";
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    MATCH_CREATED: "đã tạo trận",
    MATCH_UPDATED: "đã sửa trận hoặc kèo",
    MATCH_OPEN: "đã mở dự đoán",
    MATCH_CLOSED: "đã đóng dự đoán",
    MATCH_SOFT_DELETED: "đã xóa mềm trận",
    MATCH_SETTLED: "đã tính kết quả trận",
    MATCH_RESETTLED: "đã tính lại kết quả trận",
    MATCH_RESULT_IMPORTED: "đã lấy tỷ số tự động",
    MATCHES_BULK_IMPORTED: "đã thêm nhiều trận",
    WORLD_CUP_FIXTURES_SYNCED: "đã cập nhật lịch World Cup",
    USER_CREATED: "đã tạo tài khoản",
    USERS_BULK_IMPORTED: "đã tạo nhiều tài khoản",
    USER_UPDATED: "đã sửa thông tin người chơi",
    USER_LOCKED: "đã khóa tài khoản",
    USER_UNLOCKED: "đã mở khóa tài khoản",
    USER_PASSWORD_RESET: "đã cấp lại mật khẩu",
    PAYMENT_ADDED: "đã ghi nhận tiền nộp",
    PAYMENT_VOIDED: "đã hủy bản ghi tiền nộp",
  };

  return labels[action] ?? "đã thực hiện một thay đổi";
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
