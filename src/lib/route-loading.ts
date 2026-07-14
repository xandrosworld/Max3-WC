export const ROUTE_LOADING_REVEAL_MS = 450;

export type RouteLoadingPhase = {
  title: string;
  detail: string;
  activeCheckpoints: number;
  ballPosition: string;
};

const ROUTE_LOADING_PHASES: Array<RouteLoadingPhase & { startsAt: number }> = [
  {
    startsAt: 0,
    title: "Đang chuẩn bị sân...",
    detail: "Sắp xong rồi, chờ mình một chút nhé.",
    activeCheckpoints: 1,
    ballPosition: "20%",
  },
  {
    startsAt: 4_000,
    title: "Đang xếp dữ liệu vào đúng chỗ...",
    detail: "Các bảng và lựa chọn đang được chuẩn bị.",
    activeCheckpoints: 2,
    ballPosition: "43%",
  },
  {
    startsAt: 9_000,
    title: "Sắp xong rồi...",
    detail: "Chỉ còn một chút nữa thôi nhé.",
    activeCheckpoints: 3,
    ballPosition: "68%",
  },
  {
    startsAt: 15_000,
    title: "Dữ liệu đang về hơi chậm...",
    detail: "Mình vẫn đang xử lý, bạn cứ chờ ở đây nhé.",
    activeCheckpoints: 3,
    ballPosition: "82%",
  },
];

export const ROUTE_LOADING_PHASE_TIMES = ROUTE_LOADING_PHASES.slice(1).map(
  (phase) => phase.startsAt,
);

export function shouldRevealRouteLoading(elapsedMs: number) {
  return elapsedMs >= ROUTE_LOADING_REVEAL_MS;
}

export function getRouteLoadingPhase(elapsedMs: number): RouteLoadingPhase {
  const phase = ROUTE_LOADING_PHASES.findLast(
    (candidate) => elapsedMs >= candidate.startsAt,
  );

  return phase ?? ROUTE_LOADING_PHASES[0];
}
