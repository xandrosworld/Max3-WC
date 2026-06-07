# WC 2026 Portal - V6 Slim

Web app nội bộ dự đoán World Cup 2026 cho khoảng 70 người. MVP bám theo
`URD_WC-2026_v6_slim.md.pdf`, ưu tiên đồng bộ lịch từ football-data.org, tự lấy tỷ
số 90 phút khi API đã có kết quả và vẫn giữ nhập tay làm đường lùi vận hành.

## Chức năng

- Đăng nhập username/password; phân quyền user/admin.
- Admin tạo user, sửa hồ sơ, khóa/mở và reset mật khẩu.
- Người chơi vote một trong ba cửa European Handicap và đổi vote trước khi khóa.
- Server khóa vote đúng 5 phút trước giờ bóng lăn.
- Công khai số lượng và danh sách người vote từng cửa.
- Admin CRUD trận, mở/đóng kèo, lấy/nhập tỷ số 90 phút và tính/tính lại kết quả.
- Admin có bulk import trận từ Excel/CSV để không phải tạo từng trận.
- Admin có nút đồng bộ lịch World Cup 2026 từ football-data.org.
- Loss ledger bất biến: thua cộng mức đóng góp, thắng không đổi, không vote không tính.
- Payment ledger: đã nộp, void bản ghi sai, còn thiếu và trạng thái thanh toán.
- Leaderboard sort accumulated loss giảm dần.
- Export Excel leaderboard và payments.
- Polling giao diện 45 giây, không WebSocket.

Danh sách milestone và Definition of Done nằm trong [HANDOFF.md](HANDOFF.md).

## Deployment hiện tại

- URL: `https://max3-wc-production.up.railway.app`
- Railway project: `virtuous-grace`
- Services: `Max3-WC` và `Postgres`
- Health check: `GET /api/health`

Production chỉ có admin bootstrap đầu tiên và không chạy demo seed để tránh lộ các mật khẩu
mẫu. Dùng `npm run db:seed` cho local/demo.

## Stack

- Next.js 16 App Router + TypeScript + Tailwind CSS
- Railway PostgreSQL
- Prisma ORM
- Better Auth
- Zod
- ExcelJS
- Vitest

## Chạy local

Yêu cầu: Node.js 20+ và PostgreSQL.

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`.

### Tài khoản seed

| Vai trò | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@123456` |
| User | `an.nguyen` | `User@123456` |
| User | `binh.tran` | `User@123456` |
| User | `chi.le` | `User@123456` |

Không dùng mật khẩu seed trên production.

## Lệnh thường dùng

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run db:migrate
npm run db:seed
npm run db:bootstrap-admin
npm run db:studio
```

## Luật settlement

Ví dụ Brazil -2 vs Serbia, tỷ số 90 phút 2-0:

```text
Brazil sau chấp = 2 - 2 = 0
Serbia sau chấp = 0
Cửa thắng = Hòa-sau-chấp
```

- Mỗi lần tính kết quả tạo một `ResultRevision`.
- Vote sai tạo `LossTransaction` dương bằng mức đóng góp.
- Khi sửa tỷ số, hệ thống tạo transaction âm đảo các loss cũ rồi tạo loss mới.
- Cùng một tỷ số/cửa thắng bấm lại sẽ không cộng tiền trùng.
- Tỷ lệ đúng chỉ tính trên các vote của trận đã có kết quả.

## Deploy Railway

Tạo một Railway Project gồm:

1. Một PostgreSQL service.
2. Một web service kết nối GitHub repository này.

Trong web service:

- Add Reference Variable `DATABASE_URL` từ PostgreSQL service.
- Thêm `BETTER_AUTH_SECRET` tối thiểu 32 ký tự ngẫu nhiên.
- Thêm `BETTER_AUTH_URL` bằng public URL của app, ví dụ
  `https://max3-wc-production.up.railway.app`.

Repository có sẵn [railway.json](railway.json):

- Build: `npm run build`
- Pre-deploy migration: `npm run db:deploy`
- Start: `npm run start`
- Health check: `/api/health`

Sau deploy đầu tiên, seed demo nếu thực sự cần:

```bash
railway run npm run db:seed
```

Không chạy seed demo trên production sau khi đã có dữ liệu thật.

Để tạo duy nhất tài khoản admin đầu tiên trên production, đặt tạm
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_DEPARTMENT`, rồi chạy:

```bash
railway run npm run db:bootstrap-admin
```

Script không ghi đè admin đã tồn tại. Xóa `ADMIN_PASSWORD` khỏi biến môi trường sau khi
bootstrap và đổi mật khẩu ngay ở lần đăng nhập đầu tiên.

### Backup

Trong PostgreSQL service của Railway:

- Bật Daily backup.
- Bật Weekly backup.
- Tạo manual backup trước migration lớn hoặc thao tác dữ liệu hàng loạt.

## Biến môi trường

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="at-least-32-random-characters"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="WC 2026 Portal"
FOOTBALL_DATA_TOKEN="football-data-org-token"

# Chỉ dùng tạm khi bootstrap admin đầu tiên
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="at-least-12-characters"
ADMIN_NAME="Quản trị viên"
ADMIN_DEPARTMENT="Ban tổ chức"
```

## Kiểm soát an toàn

- Tất cả thao tác vote, admin, settlement và payment đều xác thực ở server.
- Mức đóng góp luôn được server suy ra từ vòng đấu.
- Kèo có vote không được sửa đội, giờ, vòng hoặc handicap.
- Trận bị xóa là soft-delete.
- Payment sai được void, không hard-delete.
- Thời gian lưu UTC với PostgreSQL `timestamptz`, hiển thị UTC+7.

### Đồng bộ lịch và tỷ số World Cup

Tạo token tại football-data.org rồi đặt `FOOTBALL_DATA_TOKEN` trong Railway. Ở màn Admin,
bấm **Đồng bộ lịch ngay** để lấy lịch World Cup 2026. Trận mới được tạo ở trạng thái
`DRAFT`; app không ghi đè thông tin trận đã có vote hoặc kết quả.

football-data.org dùng:

```text
GET https://api.football-data.org/v4/competitions/WC/matches?season=2026
GET https://api.football-data.org/v4/matches/{fixture_id}
Header: X-Auth-Token: <FOOTBALL_DATA_TOKEN>
```

Khi trận đã kết thúc, admin có thể bấm **Lấy tỷ số API**. App ưu tiên `score.regularTime`;
nếu trận kết thúc trong 90 phút và API chỉ có `score.fullTime`, app dùng `fullTime` như tỷ số
90 phút. Nhập tay vẫn là đường lùi khi API thiếu hoặc lỗi.

Trận tranh hạng ba hiện được bỏ qua vì V6 slim chưa quy định mức đóng góp cho vòng này.

## Ngoài scope MVP

Không có WebSocket, auto-bracket, auto-thua khi không vote, thắng giảm nợ, trần 0đ, NSHV,
vote đội vô địch hoặc kiểm tra ngân hàng tự động.
