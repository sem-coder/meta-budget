import { NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/meta-api";

// Controleer of de Meta API token nog geldig is
export async function GET() {
  const tokenStatus = await validateAccessToken();

  const expiresDate = tokenStatus.expires
    ? new Date(tokenStatus.expires * 1000).toISOString()
    : null;

  return NextResponse.json({
    valid: tokenStatus.valid,
    expires: expiresDate,
    scopes: tokenStatus.scopes ?? [],
    checkedAt: new Date().toISOString(),
  });
}
