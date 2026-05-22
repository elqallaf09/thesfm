import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/health/database",
    status: "working",
    timestamp: new Date().toISOString()
  });
}
