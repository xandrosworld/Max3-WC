import { NextResponse } from "next/server";
import { runAutoFootballDataSync } from "@/lib/auto-football-data-sync";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const expected =
    process.env.FOOTBALL_DATA_CRON_SECRET ?? process.env.CRON_SECRET ?? "";

  if (!expected.trim()) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader === `Bearer ${expected}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === expected;
}

async function handleCron(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED_CRON_SYNC" },
      { status: 401 },
    );
  }

  const summary = await runAutoFootballDataSync();
  return NextResponse.json({ ok: true, summary });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
