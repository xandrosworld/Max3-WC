import ExcelJS from "exceljs";
import { formatVietnamTime } from "@/lib/domain";
import { getLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();
  const [leaderboard, payments] = await Promise.all([
    getLeaderboard(),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      include: { user: true, confirmedBy: true },
    }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WC 2026 Portal";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Bảng xếp hạng");
  sheet.columns = [
    { header: "Hạng", key: "rank", width: 10 },
    { header: "Họ tên", key: "name", width: 28 },
    { header: "Đơn vị", key: "department", width: 22 },
    { header: "Số trận đã chọn", key: "voted", width: 18 },
    { header: "Quên chọn", key: "missed", width: 16 },
    { header: "Số trận đúng", key: "correct", width: 16 },
    { header: "Số trận sai", key: "wrong", width: 16 },
    { header: "Độ chính xác (%)", key: "accuracy", width: 16 },
    { header: "Ngôi sao đã dùng", key: "hopeStarUsed", width: 18 },
    { header: "Ngôi sao sai", key: "hopeStarWrong", width: 16 },
    { header: "Đóng góp", key: "loss", width: 20 },
  ];
  leaderboard.forEach((row) => sheet.addRow({ ...row, accuracy: Number(row.accuracy.toFixed(2)) }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E3B" } };
  sheet.getColumn("K").numFmt = '#,##0" Belly"';

  const paymentSheet = workbook.addWorksheet("Đóng góp nội bộ");
  paymentSheet.columns = [
    { header: "Họ tên", key: "name", width: 28 },
    { header: "Đóng góp", key: "amount", width: 18 },
    { header: "Ngày giờ", key: "paidAt", width: 24 },
    { header: "Ghi chú", key: "note", width: 30 },
    { header: "Người xác nhận", key: "confirmedBy", width: 26 },
    { header: "Trạng thái", key: "status", width: 16 },
  ];
  payments.forEach((payment) =>
    paymentSheet.addRow({
      name: payment.user.name,
      amount: payment.amount,
      paidAt: formatVietnamTime(payment.paidAt),
      note: payment.note ?? "",
      confirmedBy: payment.confirmedBy.name,
      status: payment.voidedAt ? "Đã hủy" : "Đã ghi nhận",
    }),
  );
  paymentSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  paymentSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E3B" } };
  paymentSheet.getColumn("B").numFmt = '#,##0" Belly"';

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="wc-2026-portal-leaderboard-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
