import { NextResponse } from "next/server";
import { checkSelectedAccounts } from "@/lib/meta-api";

// Vercel Cron: elke dag om 09:00 NL-tijd (07:00 UTC)
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Geselecteerde accounts staan in env (komma-gescheiden), of alle accounts als leeg
  const selectedIds = process.env.CRON_ACCOUNT_IDS
    ? process.env.CRON_ACCOUNT_IDS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  try {
    const result = await checkSelectedAccounts(selectedIds);

    console.log(`🕘 Budget check 09:00 — ${result.totalAccounts} accounts`);
    console.log(`✅ Actief: ${result.activeAccounts} | 💤 Geen uitgaven: ${result.totalAccounts - result.activeAccounts}`);
    console.log(`💰 Totaal vandaag: €${result.totalTodaySpend.toFixed(2)}`);
    for (const a of result.accounts) {
      const status = a.error ? `❌ FOUT: ${a.error}` : a.hasActiveSpend ? `✅ €${a.todaySpend.toFixed(2)}` : `💤 €0`;
      console.log(`  ${a.accountName}: ${status}`);
    }

    return NextResponse.json({
      success: true,
      message: `${result.activeAccounts}/${result.totalAccounts} accounts actief — €${result.totalTodaySpend.toFixed(2)} vandaag`,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    console.error("❌ Cron mislukt:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
