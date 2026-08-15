import { NextResponse } from "next/server";

// Liveness probe for the deploy workflow's health check. Deliberately does not
// touch the backend API — it answers "is this Next server up?", not "is the
// whole stack healthy?", so a backend outage can't roll back a good deploy.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", uptime: process.uptime() });
}
