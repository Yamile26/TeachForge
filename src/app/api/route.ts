import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "TeachForge",
    routes: [
      "/api/health",
      "/api/cases",
      "/api/extract",
      "/api/simulate",
      "/api/evaluate",
      "/api/aprende",
      "/api/transcribe",
      "/api/presence-feedback",
      "/api/auth/register",
    ],
  });
}
