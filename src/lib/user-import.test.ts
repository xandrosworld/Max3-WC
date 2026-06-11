import { describe, expect, it } from "vitest";
import { parseUserImport } from "./user-import";

describe("user bulk import", () => {
  it("parses CSV, TSV, and headers for internal users", () => {
    const result = parseUserImport(`
username,Họ tên,Đơn vị
an.nguyen,An Nguyễn,Sales
binh.tran\tBình Trần\tMarketing
`);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { username: "an.nguyen", name: "An Nguyễn", department: "Sales" },
      { username: "binh.tran", name: "Bình Trần", department: "Marketing" },
    ]);
  });

  it("reports line errors without hiding valid rows", () => {
    const result = parseUserImport(`
ok.user,Người Hợp lệ,Ops
bad user,Sai Username,Ops
`);

    expect(result.rows).toEqual([
      { username: "ok.user", name: "Người Hợp lệ", department: "Ops" },
    ]);
    expect(result.errors[0]).toContain("Dòng 3");
    expect(result.errors[0]).toContain("tài khoản đăng nhập");
  });

  it("accepts the user-facing Vietnamese header", () => {
    const result = parseUserImport(`
Tài khoản đăng nhập,Nickname hiển thị,Đơn vị
admin.demo,Admin Demo,Ban tổ chức
`);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        username: "admin.demo",
        name: "Admin Demo",
        department: "Ban tổ chức",
      },
    ]);
  });
});
