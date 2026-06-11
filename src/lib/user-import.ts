export type ImportedUser = {
  username: string;
  name: string;
  department: string;
};

export type UserImportResult = {
  rows: ImportedUser[];
  errors: string[];
};

const usernamePattern = /^[a-zA-Z0-9._]+$/;

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return normalize(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[\s-]+/g, "_");
}

function parseLine(line: string) {
  const separator = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  return line
    .split(separator)
    .map((value) => value.trim().replace(/^"|"$/g, ""));
}

function isHeader(columns: string[]) {
  const keys = columns.map(normalizeKey);
  const first = keys[0] ?? "";
  const second = keys[1] ?? "";

  return (
    first === "username" ||
    first === "ten_dang_nhap" ||
    first === "tai_khoan_dang_nhap" ||
    (first === "user" && second === "ho_ten")
  );
}

export function parseUserImport(input: string): UserImportResult {
  const rows: ImportedUser[] = [];
  const errors: string[] = [];

  input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line || line.startsWith("#")) return;
      const lineNumber = index + 1;
      const columns = parseLine(line);
      if (isHeader(columns)) return;

      try {
        if (columns.length < 2 || columns.length > 3) {
          throw new Error("cần 2-3 cột: tài khoản đăng nhập, nickname hiển thị, đơn vị");
        }

        const username = columns[0].trim();
        const name = columns[1].trim();
        const department = (columns[2] ?? "").trim();

        if (username.length < 3 || username.length > 30 || !usernamePattern.test(username)) {
          throw new Error("tài khoản đăng nhập cần 3-30 ký tự, chỉ gồm chữ, số, dấu chấm hoặc gạch dưới");
        }
        if (name.length < 2 || name.length > 100) {
          throw new Error("nickname hiển thị cần 2-100 ký tự");
        }
        if (department.length > 100) {
          throw new Error("đơn vị tối đa 100 ký tự");
        }

        rows.push({ username, name, department });
      } catch (error) {
        errors.push(`Dòng ${lineNumber}: ${(error as Error).message}`);
      }
    });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("Không có dòng tài khoản hợp lệ để tạo.");
  }

  return { rows, errors };
}
