const META_API_BASE = "https://graph.facebook.com/v20.0";

// Genereer een app access token voor server-side verificatie: app_id|app_secret
function getAppAccessToken(): string {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("META_APP_ID of META_APP_SECRET is niet ingesteld");
  return `${appId}|${appSecret}`;
}

// Valideer of het user access token nog geldig is
export async function validateAccessToken(): Promise<{ valid: boolean; expires?: number; scopes?: string[] }> {
  const userToken = process.env.META_ACCESS_TOKEN;
  if (!userToken) return { valid: false };

  try {
    const appToken = getAppAccessToken();
    const url = new URL(`${META_API_BASE}/debug_token`);
    url.searchParams.set("input_token", userToken);
    url.searchParams.set("access_token", appToken);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json() as { data?: { is_valid: boolean; expires_at?: number; scopes?: string[] } };

    if (data.data?.is_valid) {
      return {
        valid: true,
        expires: data.data.expires_at,
        scopes: data.data.scopes,
      };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  account_status: number;
}

export interface Insight {
  campaign_id?: string;
  spend: string;
  impressions: string;
  clicks: string;
  date_start: string;
  date_stop: string;
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

export interface AccountSummary {
  accountId: string;
  accountName: string;
  currency: string;
  accountStatus: number;
  todaySpend: number;
  campaigns: CampaignBudgetInfo[];
  hasActiveSpend: boolean;
  error?: string;
}

export interface MCCSummary {
  businessId: string;
  businessName: string;
  totalAccounts: number;
  activeAccounts: number;
  totalTodaySpend: number;
  accounts: AccountSummary[];
  checkedAt: string;
}

// Account status codes van Meta
export const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: "ACTIEF",
  2: "UITGESCHAKELD",
  3: "VERWIJDERD",
  7: "GEPAUZEERD",
  8: "GESLOTEN",
  9: "IN REVIEW",
  100: "OPEN",
  101: "GESLOTEN",
  201: "IN AFWACHTING",
  202: "GEWEIGERD",
};

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

// Haal alle advertentieaccounts op onder een Business Manager (MCC)
export async function getAllAdAccounts(businessId: string): Promise<AdAccount[]> {
  const data = await fetchMeta(`${businessId}/owned_ad_accounts`, {
    fields: "id,name,currency,account_status",
    limit: "200",
  }) as { data: AdAccount[] };
  return data.data ?? [];
}

// Haal de naam van het Business Manager account op
export async function getBusinessInfo(businessId: string): Promise<{ name: string }> {
  const data = await fetchMeta(businessId, {
    fields: "name",
  }) as { name: string };
  return { name: data.name };
}

async function getActiveCampaigns(adAccountId: string): Promise<Campaign[]> {
  const data = await fetchMeta(`${adAccountId}/campaigns`, {
    fields: "id,name,status,daily_budget,lifetime_budget",
    filtering: JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE", "PAUSED"] }]),
    limit: "100",
  }) as { data: Campaign[] };
  return data.data ?? [];
}

async function getTodayInsights(adAccountId: string): Promise<Insight[]> {
  const today = new Date().toISOString().split("T")[0];
  const data = await fetchMeta(`${adAccountId}/insights`, {
    fields: "campaign_id,spend,impressions,clicks,date_start,date_stop",
    time_range: JSON.stringify({ since: today, until: today }),
    level: "campaign",
    limit: "100",
  }) as { data: Insight[] };
  return data.data ?? [];
}

async function getAccountSummary(account: AdAccount): Promise<AccountSummary> {
  try {
    const [campaigns, insights] = await Promise.all([
      getActiveCampaigns(account.id),
      getTodayInsights(account.id),
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

    const campaignInfos: CampaignBudgetInfo[] = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      dailyBudget: c.daily_budget ? parseInt(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : null,
      todaySpend: spendByCampaign.get(c.id) ?? 0,
      isActive: c.status === "ACTIVE",
    }));

    return {
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      accountStatus: account.account_status,
      todaySpend: totalSpend,
      campaigns: campaignInfos,
      hasActiveSpend: totalSpend > 0,
    };
  } catch (err) {
    return {
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      accountStatus: account.account_status,
      todaySpend: 0,
      campaigns: [],
      hasActiveSpend: false,
      error: err instanceof Error ? err.message : "Onbekende fout",
    };
  }
}

export async function getMCCSummary(): Promise<MCCSummary> {
  const businessId = process.env.META_BUSINESS_ID;
  if (!businessId) throw new Error("META_BUSINESS_ID is niet ingesteld in .env.local");

  const [businessInfo, adAccounts] = await Promise.all([
    getBusinessInfo(businessId),
    getAllAdAccounts(businessId),
  ]);

  // Haal data op voor alle accounts tegelijk (parallel)
  const accountSummaries = await Promise.all(
    adAccounts.map((account) => getAccountSummary(account))
  );

  const totalSpend = accountSummaries.reduce((sum, a) => sum + a.todaySpend, 0);
  const activeAccounts = accountSummaries.filter((a) => a.hasActiveSpend).length;

  return {
    businessId,
    businessName: businessInfo.name,
    totalAccounts: adAccounts.length,
    activeAccounts,
    totalTodaySpend: totalSpend,
    accounts: accountSummaries,
    checkedAt: new Date().toISOString(),
  };
}
