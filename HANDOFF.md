# WC 2026 Portal - Handoff

## Muc tieu

Xay dung MVP web app noi bo cho khoang 70 nguoi theo dung URD V6 slim:

- Mot quy chung.
- European Handicap 3 cua, chi handicap nguyen.
- Thua keo cong don tien phai nop; thang khong thay doi tien.
- Khong vote thi khong tinh, khong phat.
- Nhap tay tran, keo va ty so 90 phut trong MVP.
- Polling 30-60 giay, khong WebSocket.
- Luu thoi gian UTC, hien thi theo UTC+7.
- Deploy app va PostgreSQL tren Railway.

## Nguyen tac bat bien

- Server la nguon su that cho khoa vote, phan quyen, settlement va tinh tien.
- Vote bi khoa khi `serverNow >= kickoffAt - 5 phut`.
- Moi user chi co mot vote tren moi tran, duoc doi truoc khi khoa.
- Ket qua chi dung ty so 90 phut, khong tinh hiep phu hoac luan luu.
- Settlement phai idempotent; tinh lai khong duoc cong tien trung.
- Sua ket qua phai giu lich su va tao giao dich dieu chinh, khong xoa dau vet.
- Khong them auto-thua, clawback, tran 0d, NSHV, vote vo dich, auto-bracket hay API bong da trong MVP.

## Milestone va Definition of Done

### M0 - Nen tang va handoff

- [x] Next.js + TypeScript chay local.
- [x] PostgreSQL + Prisma schema, migration va seed.
- [x] Cau hinh Railway-ready, health check va README.
- [x] Test va build co the chay bang mot lenh ro rang.

### M1 - Authentication va user

- [x] Dang nhap username/password.
- [x] Session luu trong PostgreSQL, cookie an toan.
- [x] Phan quyen `USER` va `ADMIN`.
- [x] User bi khoa khong dang nhap/ghi du lieu duoc.
- [x] Admin tao user, sua ho ten/don vi, khoa/mo va reset mat khau.
- [x] Co script bootstrap admin dau tien cho production.
- [x] Khong co dang ky cong khai.

### M2 - Man nguoi choi

- [x] Danh sach tran dang mo keo.
- [x] Hien thi doi A/B, gio Viet Nam, vong, muc bet va line handicap ro rang.
- [x] Vote dung mot trong ba cua: Doi A / Hoa-sau-chap / Doi B.
- [x] Doi vote truoc khi khoa.
- [x] Server khoa vote dung 5 phut truoc gio bong lan.
- [x] Cong khai so nguoi va danh sach nguoi vote tung cua.
- [x] Co giai thich ngan ve Hoa-sau-chap.
- [x] Polling 30-60 giay.

### M3 - Settlement va leaderboard

- [x] Admin nhap ty so 90 phut va bam tinh ket qua.
- [x] Engine European Handicap xac dinh dung mot cua thang.
- [x] Thang khong doi tien; thua cong muc bet; khong vote khong tinh.
- [x] Settlement idempotent va tinh lai co giao dich dao.
- [x] Leaderboard co rank, ho ten, don vi, da vote, dung, ty le dung.
- [x] Co accumulated loss, da nop, con thieu va trang thai thanh toan.
- [x] Sort mac dinh accumulated loss giam dan.

### M4 - Admin va quy

- [x] CRUD tran va mo/dong keo.
- [x] Bulk import tran tu Excel/CSV de giam thao tac tao tay.
- [x] Muc bet theo vong dung V6.
- [x] Handicap chi la so nguyen khong am, chon doi bi chap.
- [x] Khong cho sua thong tin keo nguy hiem sau khi da co vote.
- [x] Ghi nhan payment: so tien, ghi chu, thoi gian, nguoi xac nhan.
- [x] Payment sai duoc void, khong hard-delete.
- [x] Audit log cho thao tac admin quan trong.

### M5 - Export, van hanh va kiem thu

- [x] Export Excel leaderboard va danh sach phai nop/da nop/con thieu.
- [x] Seed co admin, user, tran va vote mau.
- [x] Unit test engine handicap, khoa vote, settlement va payment status.
- [x] README huong dan local, env, migrate, seed va Railway deploy.
- [x] Railway pre-deploy chay migration.
- [ ] PostgreSQL co backup daily/weekly trong Railway.

## Trang thai production 2026-06-06

- Railway project: `virtuous-grace`
- Web service: `Max3-WC`
- Production URL: `https://max3-wc-production.up.railway.app`
- PostgreSQL migration: da ap dung, schema up to date.
- Production deploy: `SUCCESS`, health check `/api/health` tra `200`.
- Smoke test: login tao session, ep doi mat khau lan dau, route admin chan user chua login.
- Production chi bootstrap admin dau tien; khong seed tai khoan demo co mat khau cong khai.
- Kiem tra code: typecheck, lint, production build va 8 unit test deu pass.
## Doi chieu URD V6 slim

- [x] 2 man nguoi choi: matches/vote va leaderboard.
- [x] 1 man admin gom tran, user, payment, export va audit.
- [x] Mot quy chung; accumulated loss chi tang khi thua.
- [x] European Handicap 3 cua, handicap nguyen, ty so 90 phut.
- [x] Khong vote thi khong tinh, khong phat.
- [x] Polling 45 giay, khong WebSocket.
- [x] Nhap tay tran/keo/ty so theo yeu cau MVP hien tai.
- [x] API lich/ty so duoc de ngoai MVP theo chi dao sau URD.
- [x] NSHV, vote vo dich, auto-bracket va ngan hang tu dong de ngoai MVP.

## Viec con lai truoc khi dung that

- [ ] Dang nhap admin production va doi mat khau tam: `Max3@2026!Admin`.
- [ ] Bat Daily/Weekly backup cho PostgreSQL trong Railway dashboard.
- [ ] Tao danh sach user that va khoa/mo/reset mat khau thu voi 1 user mau.
- [ ] Tao 1 tran test, mo keo, vote bang 2 user, dong keo, nhap ty so va export Excel de acceptance test end-to-end.
- [ ] Xoa du lieu test/seed neu co truoc khi mo cho ca phong ban.

## Ngoai scope MVP

- WebSocket/realtime subscription.
- API lich/ty so, auto-bracket.
- Casso/check ngan hang/AI doc bien lai.
- Auto-thua khi khong vote.
- Thang giam no, clawback, tran 0d.
- Ngoi sao hy vong va vote doi vo dich.

## Quyet dinh ky thuat

- App: Next.js App Router + TypeScript.
- Database: Railway PostgreSQL.
- ORM/migration: Prisma.
- Auth: Better Auth, username/password, admin plugin.
- Validation: Zod.
- Export: ExcelJS.
- Test: Vitest.
- Deploy: mot Railway web service + mot Railway PostgreSQL service.

## Tai khoan seed du kien

- Admin: `admin` / `Admin@123456`
- User: `an.nguyen`, `binh.tran`, `chi.le` / `User@123456`

Tat ca tai khoan seed chi dung cho local/demo va phai doi mat khau khi dua len production.
