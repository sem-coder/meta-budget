import { NextResponse } from "next/server";
import { getMCCSummary } from "@/lib/meta-api";

// Vercel Cron: elke dag om 09:00 NL-tijd (07:00 UTC)
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getMCCSummary();

    console.log(`🕘 MCC budget check (09:00) — ${summary.businessName}`);
    console.log(`📊 ${summary.totalAccounts} accounts gecontroleerd`);
    console.log(`💰 Totaal vandaag uitgegeven: ${summary.totalTodaySpend.toFixed(2)}`);
    console.log(`✅ Actieve accounts: ${summary.activeAccounts}/${summary.totalAccounts}`);

    for (const account of summary.accounts) {
      if (account.error) {
        console.warn(`⚠️ [${account.accountName}] Fout: ${account.error}`);
      } else if (account.hasActiveSpend) {
        console.log(`  ✅ ${account.accountName}: ${account.currency} ${account.todaySpend.toFixed(2)} uitgegeven`);
      } else {
        console.log(`  💤 ${account.accountName}: geen uitgaven vandaag`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${summary.activeAccounts} van ${summary.totalAccounts} accounts actief — totaal €${summary.totalTodaySpend.toFixed(2)} vandaag`,
      data: summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    console.error("❌ MCC budget check mislukt:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
