import { NextResponse } from "next/server";
import { getAllAccessibleAccounts } from "@/lib/meta-api";

export async function GET() {
  try {
    const accounts = await getAllAccessibleAccounts();
    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
