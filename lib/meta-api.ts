const META_API_BASE = "https://graph.facebook.com/v20.0";

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  account_status: number;
  business?: { id: string; name: string };
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
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
  businessName?: string;
  todaySpend: number;
  campaigns: CampaignBudgetInfo[];
  hasActiveSpend: boolean;
  error?: string;
}

export interface BudgetCheckResult {
  totalAccounts: number;
  activeAccounts: number;
  totalTodaySpend: number;
  accounts: AccountSummary[];
  checkedAt: string;
}

export const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: "Actief",
  2: "Uitgeschakeld",
  3: "Verwijderd",
  7: "Gepauzeerd",
  8: "Gesloten",
  9: "In review",
};

async function fetchMeta(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) throw new Error("META_ACCESS_TOKEN is niet ingesteld");

  const url = new URL(`${META_API_BASE}/${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json() as { error?: { message: string; type: string }; [key: string]: unknown };
  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return data;
}

// Haal alle ad accounts op die toegankelijk zijn via de app token
export async function getAllAccessibleAccounts(): Promise<AdAccount[]> {
  const accounts: AdAccount[] = [];
  let url: string | null = `me/adaccounts`;
  const params = {
    fields: "id,name,currency,account_status,business",
    limit: "200",
  };

  // Pagination: haal alle pagina's op
  while (url) {
    const data = await fetchMeta(url, url === `me/adaccounts` ? params : {}) as {
      data: AdAccount[];
      paging?: { next?: string };
    };
    accounts.push(...(data.data ?? []));
    const next = data.paging?.next;
    if (next) {
      // Gebruik de volledige next URL direct
      const nextUrl = new URL(next);
      url = nextUrl.pathname.replace("/v20.0/", "") + nextUrl.search;
    } else {
      url = null;
    }
  }

  return accounts;
}

async function getCampaigns(adAccountId: string): Promise<Campaign[]> {
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
    fields: "campaign_id,spend,impressions,clicks",
    time_range: JSON.stringify({ since: today, until: today }),
    level: "campaign",
    limit: "100",
  }) as { data: Insight[] };
  return data.data ?? [];
}

export async function getAccountSummary(account: AdAccount): Promise<AccountSummary> {
  try {
    const [campaigns, insights] = await Promise.all([
      getCampaigns(account.id),
      getTodayInsights(account.id),
    ]);

    const spendMap = new Map<string, number>();
    let totalSpend = 0;
    for (const i of insights) {
      const spend = parseFloat(i.spend ?? "0");
      if (i.campaign_id) spendMap.set(i.campaign_id, (spendMap.get(i.campaign_id) ?? 0) + spend);
      totalSpend += spend;
    }

    return {
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      accountStatus: account.account_status,
      businessName: account.business?.name,
      todaySpend: totalSpend,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        dailyBudget: c.daily_budget ? parseInt(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : null,
        todaySpend: spendMap.get(c.id) ?? 0,
        isActive: c.status === "ACTIVE",
      })),
      hasActiveSpend: totalSpend > 0,
    };
  } catch (err) {
    return {
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      accountStatus: account.account_status,
      businessName: account.business?.name,
      todaySpend: 0,
      campaigns: [],
      hasActiveSpend: false,
      error: err instanceof Error ? err.message : "Onbekende fout",
    };
  }
}

export async function checkSelectedAccounts(accountIds: string[]): Promise<BudgetCheckResult> {
  const allAccounts = await getAllAccessibleAccounts();
  const selected = allAccounts.filter((a) =>
    accountIds.length === 0 ? true : accountIds.includes(a.id)
  );

  const summaries = await Promise.all(selected.map(getAccountSummary));
  const totalSpend = summaries.reduce((s, a) => s + a.todaySpend, 0);

  return {
    totalAccounts: summaries.length,
    activeAccounts: summaries.filter((a) => a.hasActiveSpend).length,
    totalTodaySpend: totalSpend,
    accounts: summaries,
    checkedAt: new Date().toISOString(),
  };
}

// Token validatie
export async function validateAccessToken(): Promise<{ valid: boolean; expires?: number; scopes?: string[] }> {
  const userToken = process.env.META_ACCESS_TOKEN;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!userToken || !appId || !appSecret) return { valid: false };

  try {
    const appToken = `${appId}|${appSecret}`;
    const url = new URL(`${META_API_BASE}/debug_token`);
    url.searchParams.set("input_token", userToken);
    url.searchParams.set("access_token", appToken);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json() as { data?: { is_valid: boolean; expires_at?: number; scopes?: string[] } };
    if (data.data?.is_valid) {
      return { valid: true, expires: data.data.expires_at, scopes: data.data.scopes };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}
