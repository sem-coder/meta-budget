"use client";

import { useEffect, useState, useCallback } from "react";
import type { MCCSummary, AccountSummary, CampaignBudgetInfo } from "@/lib/meta-api";

interface ApiResponse {
  success: boolean;
  data?: MCCSummary;
  error?: string;
}

interface TokenStatus {
  valid: boolean;
  expires: string | null;
  scopes: string[];
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
  );
}

function CampaignRow({ c, currency }: { c: CampaignBudgetInfo; currency: string }) {
  const pct = c.dailyBudget && c.dailyBudget > 0
    ? Math.min((c.todaySpend / c.dailyBudget) * 100, 100)
    : null;

  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02] transition-colors text-sm">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusDot active={c.isActive} />
          <span className="text-white/80">{c.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-white/50">
        {c.dailyBudget != null ? formatCurrency(c.dailyBudget, currency) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={c.todaySpend > 0 ? "text-blue-400 font-medium" : "text-white/30"}>
          {formatCurrency(c.todaySpend, currency)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {pct != null ? (
          <div className="flex items-center justify-end gap-2">
            <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-white/40 text-xs w-9 text-right">{pct.toFixed(0)}%</span>
          </div>
        ) : <span className="text-white/20">—</span>}
      </td>
    </tr>
  );
}

function AccountCard({ account }: { account: AccountSummary }) {
  const [expanded, setExpanded] = useState(false);
  const activeCampaigns = account.campaigns.filter((c) => c.isActive).length;

  return (
    <div className={`rounded-xl border transition-colors ${
      account.error
        ? "border-red-500/30 bg-red-500/5"
        : account.hasActiveSpend
        ? "border-emerald-500/20 bg-[#1a1a2e]"
        : "border-white/10 bg-[#1a1a2e]"
    }`}>
      {/* Account header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot active={account.hasActiveSpend} />
          <div className="min-w-0">
            <p className="font-medium text-white/90 truncate">{account.accountName}</p>
            <p className="text-xs text-white/30 mt-0.5">{account.accountId}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/30 mb-0.5">Campagnes</p>
            <p className="text-sm font-medium text-white/70">
              {activeCampaigns} actief
              <span className="text-white/30"> / {account.campaigns.length}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/30 mb-0.5">Vandaag</p>
            <p className={`text-sm font-semibold ${account.hasActiveSpend ? "text-blue-400" : "text-white/30"}`}>
              {account.error ? "—" : formatCurrency(account.todaySpend, account.currency)}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Error state */}
      {account.error && (
        <div className="px-5 pb-4">
          <p className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-3 py-2">{account.error}</p>
        </div>
      )}

      {/* Expanded campagnes */}
      {expanded && !account.error && (
        <div className="border-t border-white/5">
          {account.campaigns.length === 0 ? (
            <p className="px-5 py-6 text-sm text-white/30 text-center">Geen campagnes gevonden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-white/30 uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-medium">Campagne</th>
                    <th className="text-right px-4 py-2 font-medium">Dagbudget</th>
                    <th className="text-right px-4 py-2 font-medium">Uitgegeven</th>
                    <th className="text-right px-4 py-2 font-medium">% benut</th>
                  </tr>
                </thead>
                <tbody>
                  {account.campaigns.map((c) => (
                    <CampaignRow key={c.id} c={c} currency={account.currency} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<MCCSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);

  const fetchBudget = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/budget");
      const json: ApiResponse = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastRefresh(new Date());
      } else {
        setError(json.error ?? "Onbekende fout");
      }
    } catch {
      setError("Kon geen verbinding maken met de server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBudget();
    fetch("/api/status").then((r) => r.json()).then((d: TokenStatus) => setTokenStatus(d));
    const interval = setInterval(() => fetchBudget(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBudget]);

  const filteredAccounts = data?.accounts.filter((a) =>
    a.accountName.toLowerCase().includes(search.toLowerCase()) ||
    a.accountId.includes(search)
  ) ?? [];

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#13131f]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg">M</div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Meta MCC Budget Monitor</h1>
              <p className="text-xs text-white/40">
                {data ? data.businessName : "Alle advertentieaccounts"} · check elke dag 09:00
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-white/30 hidden md:block">
                {formatDateTime(lastRefresh.toISOString())}
              </span>
            )}
            <button
              onClick={() => fetchBudget(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Vernieuwen
            </button>
          </div>
        </div>
      </div>

      {/* Token status balk */}
      {tokenStatus && (
        <div className={`border-b px-6 py-2 text-xs flex items-center gap-2 ${
          tokenStatus.valid
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            : "border-red-500/20 bg-red-500/5 text-red-400"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tokenStatus.valid ? "bg-emerald-400" : "bg-red-400"}`} />
          <span>
            {tokenStatus.valid
              ? `Token geldig${tokenStatus.expires ? ` · verloopt ${new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(tokenStatus.expires))}` : ""}`
              : "Token ongeldig of verlopen — controleer META_ACCESS_TOKEN"}
          </span>
          {tokenStatus.valid && tokenStatus.scopes.length > 0 && (
            <span className="text-white/20 ml-2">scopes: {tokenStatus.scopes.join(", ")}</span>
          )}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Alle accounts ophalen van Meta MCC...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 max-w-xl mx-auto text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="font-semibold text-red-300 mb-2">Verbinding mislukt</h2>
            <p className="text-sm text-red-400/80 mb-4">{error}</p>
            <p className="text-xs text-white/30">
              Controleer <code className="bg-white/10 px-1 rounded">META_ACCESS_TOKEN</code> en{" "}
              <code className="bg-white/10 px-1 rounded">META_BUSINESS_ID</code> in{" "}
              <code className="bg-white/10 px-1 rounded">.env.local</code>
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* KPI balk */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Accounts</p>
                <p className="text-2xl font-bold">{data.totalAccounts}</p>
              </div>
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Actief vandaag</p>
                <p className="text-2xl font-bold text-emerald-400">{data.activeAccounts}</p>
              </div>
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Geen uitgaven</p>
                <p className="text-2xl font-bold text-amber-400">{data.totalAccounts - data.activeAccounts}</p>
              </div>
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Totaal vandaag</p>
                <p className="text-2xl font-bold text-blue-400">€{data.totalTodaySpend.toFixed(2)}</p>
              </div>
            </div>

            {/* Zoekbalk */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Zoek op accountnaam of ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#1a1a2e] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            {/* Account lijst */}
            <div className="space-y-3">
              {filteredAccounts.length === 0 ? (
                <p className="text-center text-white/30 py-12 text-sm">Geen accounts gevonden</p>
              ) : (
                filteredAccounts.map((account) => (
                  <AccountCard key={account.accountId} account={account} />
                ))
              )}
            </div>

            {/* Footer info */}
            <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-5 text-sm">
              <div className="flex items-center gap-2 mb-3">
                <span>🕘</span>
                <span className="font-medium">Automatische dagelijkse check</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-white/30 mb-1">Tijdstip</p>
                  <p className="text-blue-400 font-medium">09:00 NL-tijd</p>
                </div>
                <div>
                  <p className="text-white/30 mb-1">Cron (UTC)</p>
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-white/60">0 7 * * *</code>
                </div>
                <div>
                  <p className="text-white/30 mb-1">Laatste check</p>
                  <p className="text-white/60">{formatDateTime(data.checkedAt)}</p>
                </div>
                <div>
                  <p className="text-white/30 mb-1">Business ID</p>
                  <p className="text-white/60 truncate">{data.businessId}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
