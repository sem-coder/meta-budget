import { NextResponse } from "next/server";
import { checkSelectedAccounts } from "@/lib/meta-api";

// Body: { accountIds: string[] } — lege array = alle accounts
export async function POST(request: Request) {
  try {
    const body = await request.json() as { accountIds?: string[] };
    const accountIds = body.accountIds ?? [];
    const result = await checkSelectedAccounts(accountIds);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
