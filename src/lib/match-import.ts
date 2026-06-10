import { MatchStatus, RoundType, TeamSide } from "@prisma/client";
import { getContributionAmount } from "./domain";

export type ImportedMatch = {
  teamA: string;
  teamB: string;
  kickoffAt: Date;
  round: RoundType;
  contributionAmount: number;
  handicap: number;
  handicappedTeam: TeamSide | null;
  status: MatchStatus;
};

export type MatchImportResult = {
  rows: ImportedMatch[];
  errors: string[];
};

const roundAliases: Record<string, RoundType> = {
  group: RoundType.GROUP,
  "vong bang": RoundType.GROUP,
  "vòng bảng": RoundType.GROUP,
  round_of_32: RoundType.ROUND_OF_32,
  r32: RoundType.ROUND_OF_32,
  "vong 32": RoundType.ROUND_OF_32,
  "vòng 32": RoundType.ROUND_OF_32,
  round_of_16: RoundType.ROUND_OF_16,
  r16: RoundType.ROUND_OF_16,
  "vong 16": RoundType.ROUND_OF_16,
  "vòng 16": RoundType.ROUND_OF_16,
  quarter_final: RoundType.QUARTER_FINAL,
  quarter: RoundType.QUARTER_FINAL,
  qf: RoundType.QUARTER_FINAL,
  "tu ket": RoundType.QUARTER_FINAL,
  "tứ kết": RoundType.QUARTER_FINAL,
  semi_final: RoundType.SEMI_FINAL,
  semi: RoundType.SEMI_FINAL,
  sf: RoundType.SEMI_FINAL,
  "ban ket": RoundType.SEMI_FINAL,
  "bán kết": RoundType.SEMI_FINAL,
  third_place: RoundType.THIRD_PLACE,
  "tranh hang ba": RoundType.THIRD_PLACE,
  "tranh hạng ba": RoundType.THIRD_PLACE,
  final: RoundType.FINAL,
  "chung ket": RoundType.FINAL,
  "chung kết": RoundType.FINAL,
};

const statusAliases: Record<string, MatchStatus> = {
  draft: MatchStatus.DRAFT,
  nhap: MatchStatus.DRAFT,
  "nháp": MatchStatus.DRAFT,
  open: MatchStatus.OPEN,
  mo: MatchStatus.OPEN,
  "mở": MatchStatus.OPEN,
  closed: MatchStatus.CLOSED,
  dong: MatchStatus.CLOSED,
  "đóng": MatchStatus.CLOSED,
};

const sideAliases: Record<string, TeamSide | null> = {
  "": null,
  none: null,
  null: null,
  "0": null,
  a: TeamSide.TEAM_A,
  team_a: TeamSide.TEAM_A,
  teama: TeamSide.TEAM_A,
  "doi a": TeamSide.TEAM_A,
  "đội a": TeamSide.TEAM_A,
  b: TeamSide.TEAM_B,
  team_b: TeamSide.TEAM_B,
  teamb: TeamSide.TEAM_B,
  "doi b": TeamSide.TEAM_B,
  "đội b": TeamSide.TEAM_B,
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return normalize(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\s-]+/g, "_");
}

function parseLine(line: string) {
  const separator = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  return line
    .split(separator)
    .map((value) => value.trim().replace(/^"|"$/g, ""));
}

function isHeader(columns: string[]) {
  const joined = normalizeKey(columns.join(" "));
  return (
    joined.includes("teama") ||
    joined.includes("doi_a") ||
    joined.includes("kickoff") ||
    joined.includes("gio_viet")
  );
}

function parseRound(value: string) {
  const direct = RoundType[value as keyof typeof RoundType];
  if (direct) return direct;
  const round = roundAliases[normalizeKey(value)] ?? roundAliases[normalize(value)];
  if (!round) throw new Error(`vòng không hợp lệ: ${value}`);
  return round;
}

function parseStatus(value: string) {
  if (!value.trim()) return MatchStatus.DRAFT;
  if (value === MatchStatus.SETTLED || value === MatchStatus.CANCELLED) {
    throw new Error("không thêm trực tiếp trận đã xong hoặc đã hủy");
  }
  const direct = MatchStatus[value as keyof typeof MatchStatus];
  const status = direct ?? statusAliases[normalizeKey(value)] ?? statusAliases[normalize(value)];
  if (!status) throw new Error(`trạng thái không hợp lệ: ${value}`);
  return status;
}

function parseSide(value: string) {
  const direct = TeamSide[value as keyof typeof TeamSide];
  if (direct) return direct;
  const side = sideAliases[normalizeKey(value)] ?? sideAliases[normalize(value)];
  if (side === undefined) throw new Error(`đội bị chấp không hợp lệ: ${value}`);
  return side;
}

function parseKickoffLocal(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/,
  );
  const slash = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/,
  );

  const normalized = iso
    ? `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4].padStart(2, "0")}:${iso[5]}:00`
    : slash
      ? `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}T${slash[4].padStart(2, "0")}:${slash[5]}:00`
      : null;
  if (!normalized) throw new Error(`giờ đá không hợp lệ: ${value}`);

  const date = new Date(`${normalized}+07:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`giờ đá không hợp lệ: ${value}`);
  return date;
}

export function parseMatchImport(input: string): MatchImportResult {
  const rows: ImportedMatch[] = [];
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
        if (columns.length < 4 || columns.length > 7) {
          throw new Error("cần 4-7 cột: đội A, đội B, giờ VN, vòng, chấp, đội bị chấp, trạng thái");
        }

        const [teamAInput, teamBInput, kickoffInput, roundInput] = columns;
        const teamA = teamAInput.trim();
        const teamB = teamBInput.trim();
        if (teamA.length < 2 || teamB.length < 2) throw new Error("tên đội phải có ít nhất 2 ký tự");
        if (teamA.localeCompare(teamB, "vi", { sensitivity: "base" }) === 0) {
          throw new Error("đội A và đội B phải khác nhau");
        }

        const round = parseRound(roundInput);
        const handicap = Number(columns[4] || 0);
        if (!Number.isInteger(handicap) || handicap < 0 || handicap > 20) {
          throw new Error("mức chấp phải là số nguyên từ 0 đến 20");
        }
        const handicappedTeam = handicap === 0 ? null : parseSide(columns[5] ?? "");
        if (handicap > 0 && !handicappedTeam) throw new Error("kèo chấp dương cần đội bị chấp");

        rows.push({
          teamA,
          teamB,
          kickoffAt: parseKickoffLocal(kickoffInput),
          round,
          contributionAmount: getContributionAmount(round),
          handicap,
          handicappedTeam,
          status: parseStatus(columns[6] ?? ""),
        });
      } catch (error) {
        errors.push(`Dòng ${lineNumber}: ${(error as Error).message}`);
      }
    });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("Không có dòng trận hợp lệ để import.");
  }

  return { rows, errors };
}
