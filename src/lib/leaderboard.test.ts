import { describe, expect, it } from "vitest";
import { calculateAccuracy } from "./domain";

describe("leaderboard accuracy", () => {
  it("uses all voted matches as denominator per URD V6", () => {
    expect(calculateAccuracy(2, 4)).toBe(50);
  });

  it("returns 0 when a user has not voted", () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });
});
