import { NextResponse } from "next/server";
import { getAccountSpendSummary } from "@/lib/meta-api";

// Endpoint voor het dashboard: haalt live budget data op
export async function GET() {
  try {
    const summary = await getAccountSpendSummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
