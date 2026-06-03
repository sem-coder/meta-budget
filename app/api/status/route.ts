import { NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/meta-api";

export async function GET() {
  const status = await validateAccessToken();
  return NextResponse.json({
    valid: status.valid,
    name: status.name ?? null,
    userId: status.userId ?? null,
    checkedAt: new Date().toISOString(),
  });
}
