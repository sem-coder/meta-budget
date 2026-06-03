const META_API_BASE = "https://graph.facebook.com/v20.0";

export interface Campaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  spend_cap?: string;
}

export interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface Insight {
  campaign_id?: string;
  adset_id?: string;
  spend: string;
  impressions: string;
  clicks: string;
  date_start: string;
  date_stop: string;
}

export interface AccountSpendSummary {
  accountId: string;
  accountName: string;
  currency: string;
  todaySpend: number;
  campaigns: CampaignBudgetInfo[];
  checkedAt: string;
  hasActiveSpend: boolean;
}

export interface CampaignBudgetInfo {
  id: string;
  name: string;
  status: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  todaySpend: number;
  isActive: boolean;
}

async function fetchMeta(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) throw new Error("META_ACCESS_TOKEN is niet ingesteld in .env.local");

  const url = new URL(`${META_API_BASE}/${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json() as { error?: { message: string; type: string }; [key: string]: unknown };

  if (data.error) {
    throw new Error(`Meta API fout: ${data.error.message} (${data.error.type})`);
  }
  return data;
}

export async function getAccountInfo(adAccountId: string): Promise<{ name: string; currency: string }> {
  const data = await fetchMeta(adAccountId, {
    fields: "name,currency",
  }) as { name: string; currency: string };
  return { name: data.name, currency: data.currency };
}

export async function getActiveCampaigns(adAccountId: string): Promise<Campaign[]> {
  const data = await fetchMeta(`${adAccountId}/campaigns`, {
    fields: "id,name,status,daily_budget,lifetime_budget,spend_cap",
    filtering: JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE", "PAUSED"] }]),
    limit: "100",
  }) as { data: Campaign[] };
  return data.data ?? [];
}

export async function getTodayInsights(adAccountId: string): Promise<Insight[]> {
  const today = new Date().toISOString().split("T")[0];
  const data = await fetchMeta(`${adAccountId}/insights`, {
    fields: "campaign_id,spend,impressions,clicks,date_start,date_stop",
    time_range: JSON.stringify({ since: today, until: today }),
    level: "campaign",
    limit: "100",
  }) as { data: Insight[] };
  return data.data ?? [];
}

export async function getAccountSpendSummary(): Promise<AccountSpendSummary> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!adAccountId) throw new Error("META_AD_ACCOUNT_ID is niet ingesteld in .env.local");

  const [accountInfo, campaigns, insights] = await Promise.all([
    getAccountInfo(adAccountId),
    getActiveCampaigns(adAccountId),
    getTodayInsights(adAccountId),
  ]);

  const spendByCampaign = new Map<string, number>();
  let totalSpend = 0;

  for (const insight of insights) {
    const spend = parseFloat(insight.spend ?? "0");
    if (insight.campaign_id) {
      spendByCampaign.set(insight.campaign_id, (spendByCampaign.get(insight.campaign_id) ?? 0) + spend);
    }
    totalSpend += spend;
  }

  const campaignInfos: CampaignBudgetInfo[] = campaigns.map((c) => {
    const todaySpend = spendByCampaign.get(c.id) ?? 0;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      dailyBudget: c.daily_budget ? parseInt(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : null,
      todaySpend,
      isActive: c.status === "ACTIVE",
    };
  });

  return {
    accountId: adAccountId,
    accountName: accountInfo.name,
    currency: accountInfo.currency,
    todaySpend: totalSpend,
    campaigns: campaignInfos,
    checkedAt: new Date().toISOString(),
    hasActiveSpend: totalSpend > 0,
  };
}
