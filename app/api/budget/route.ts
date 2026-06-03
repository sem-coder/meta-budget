import { NextResponse } from "next/server";
import { getMCCSummary } from "@/lib/meta-api";

export async function GET() {
  try {
    const summary = await getMCCSummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
