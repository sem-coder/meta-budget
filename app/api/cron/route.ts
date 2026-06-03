import { NextResponse } from "next/server";
import { getAccountSpendSummary } from "@/lib/meta-api";

// Vercel Cron: elke dag om 09:00 (UTC+2 = 07:00 UTC)
// Zie vercel.json voor de cron config
export async function GET(request: Request) {
  // Beveilig het cron endpoint zodat alleen Vercel het kan aanroepen
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getAccountSpendSummary();

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "morning_check",
      summary,
    };

    console.log("🕘 Ochtend budget check (09:00):", JSON.stringify(logEntry, null, 2));

    const statusMessage = summary.hasActiveSpend
      ? `✅ Account is ACTIEF — €${summary.todaySpend.toFixed(2)} uitgegeven vandaag`
      : `⚠️ Geen uitgaven vandaag gedetecteerd voor account ${summary.accountName}`;

    console.log(statusMessage);

    return NextResponse.json({
      success: true,
      message: statusMessage,
      data: summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    console.error("❌ Budget check mislukt:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
