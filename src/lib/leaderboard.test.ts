import { describe, expect, it } from "vitest";
import { calculateAccuracy } from "./domain";

describe("leaderboard accuracy", () => {
  it("uses decided matches as denominator", () => {
    expect(calculateAccuracy(2, 4)).toBe(50);
  });

  it("returns 0 when a user has not voted", () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });
});
