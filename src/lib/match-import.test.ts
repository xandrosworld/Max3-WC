import { MatchStatus, RoundType, TeamSide } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { parseMatchImport } from "./match-import";

describe("match bulk import", () => {
  it("parses CSV lines as Vietnam time and derives contribution", () => {
    const result = parseMatchImport(`
Đội A,Đội B,Giờ Việt Nam,Vòng,Chấp,Đội bị chấp,Trạng thái
Mexico,South Africa,2026-06-12 02:00,GROUP,0,,DRAFT
Brazil,Serbia,15/06/2026 02:00,Vòng bảng,0.5,TEAM_A,OPEN
`);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      teamA: "Mexico",
      teamB: "South Africa",
      round: RoundType.GROUP,
      contributionAmount: 20_000,
      handicap: 0,
      handicappedTeam: null,
      status: MatchStatus.DRAFT,
    });
    expect(result.rows[0].kickoffAt.toISOString()).toBe("2026-06-11T19:00:00.000Z");
    expect(result.rows[1]).toMatchObject({
      handicap: 0.5,
      handicappedTeam: TeamSide.TEAM_A,
      status: MatchStatus.OPEN,
    });
  });

  it("returns line errors instead of partial import", () => {
    const result = parseMatchImport("Brazil,Serbia,2026-06-15 02:00,GROUP,2,,DRAFT");

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain("Dòng 1");
    expect(result.errors[0]).toContain("mức chấp dương");
  });
});
