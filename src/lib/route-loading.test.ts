import { describe, expect, it } from "vitest";
import {
  getRouteLoadingPhase,
  ROUTE_LOADING_REVEAL_MS,
  shouldRevealRouteLoading,
} from "./route-loading";

describe("protected route loading timeline", () => {
  it("chỉ hiện minh họa sau khoảng chờ ngắn", () => {
    expect(shouldRevealRouteLoading(ROUTE_LOADING_REVEAL_MS - 1)).toBe(false);
    expect(shouldRevealRouteLoading(ROUTE_LOADING_REVEAL_MS)).toBe(true);
  });

  it.each([
    { elapsedMs: 0, title: "Đang chuẩn bị sân...", checkpoints: 1, position: "20%" },
    {
      elapsedMs: 3_999,
      title: "Đang chuẩn bị sân...",
      checkpoints: 1,
      position: "20%",
    },
    {
      elapsedMs: 4_000,
      title: "Đang xếp dữ liệu vào đúng chỗ...",
      checkpoints: 2,
      position: "43%",
    },
    {
      elapsedMs: 9_000,
      title: "Sắp xong rồi...",
      checkpoints: 3,
      position: "68%",
    },
    {
      elapsedMs: 15_000,
      title: "Dữ liệu đang về hơi chậm...",
      checkpoints: 3,
      position: "82%",
    },
  ])(
    "chọn đúng trạng thái tại $elapsedMs ms",
    ({ elapsedMs, title, checkpoints, position }) => {
      const phase = getRouteLoadingPhase(elapsedMs);

      expect(phase.title).toBe(title);
      expect(phase.activeCheckpoints).toBe(checkpoints);
      expect(phase.ballPosition).toBe(position);
    },
  );
});
