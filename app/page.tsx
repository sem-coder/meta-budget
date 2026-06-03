"use client";

import { useEffect, useState, useCallback } from "react";
import type { AccountSpendSummary } from "@/lib/meta-api";

interface ApiResponse {
  success: boolean;
  data?: AccountSpendSummary;
  error?: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date(iso));
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      isActive
        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
        : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
      {isActive ? "ACTIEF" : "GEPAUZEERD"}
    </span>
  );
}

export default function Home() {
  const [data, setData] = useState<AccountSpendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    // Auto-refresh elke 5 minuten
    const interval = setInterval(() => fetchBudget(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBudget]);

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#13131f]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold">
              M
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Meta Budget Monitor</h1>
              <p className="text-xs text-white/40">Dagelijkse budgetcheck om 09:00</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-white/30">
                Bijgewerkt: {formatDateTime(lastRefresh.toISOString())}
              </span>
            )}
            <button
              onClick={() => fetchBudget(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Vernieuwen
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Budget data ophalen van Meta...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 max-w-xl mx-auto mt-12 text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="font-semibold text-red-300 mb-2">Verbinding mislukt</h2>
            <p className="text-sm text-red-400/80 mb-4">{error}</p>
            <p className="text-xs text-white/30">
              Controleer of <code className="bg-white/10 px-1 rounded">META_ACCESS_TOKEN</code> en{" "}
              <code className="bg-white/10 px-1 rounded">META_AD_ACCOUNT_ID</code> correct zijn ingesteld in{" "}
              <code className="bg-white/10 px-1 rounded">.env.local</code>
            </p>
          </div>
        )}

        {/* Data */}
        {!loading && data && (
          <div className="space-y-6">
            {/* Spend status banner */}
            <div className={`rounded-xl p-5 border flex items-center gap-4 ${
              data.hasActiveSpend
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}>
              <div className="text-3xl">{data.hasActiveSpend ? "✅" : "⚠️"}</div>
              <div>
                <p className={`font-semibold text-lg ${data.hasActiveSpend ? "text-emerald-300" : "text-amber-300"}`}>
                  {data.hasActiveSpend
                    ? "Budget is actief — er wordt uitgegeven"
                    : "Geen uitgaven gedetecteerd vandaag"}
                </p>
                <p className="text-sm text-white/50 mt-0.5">
                  Check uitgevoerd: {formatDateTime(data.checkedAt)}
                </p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Account</p>
                <p className="font-semibold text-lg truncate">{data.accountName}</p>
                <p className="text-xs text-white/30 mt-1">{data.accountId}</p>
              </div>
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Vandaag uitgegeven</p>
                <p className="font-bold text-2xl text-blue-400">
                  {formatCurrency(data.todaySpend, data.currency)}
                </p>
                <p className="text-xs text-white/30 mt-1">{data.currency}</p>
              </div>
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Actieve campagnes</p>
                <p className="font-bold text-2xl text-purple-400">
                  {data.campaigns.filter((c) => c.isActive).length}
                </p>
                <p className="text-xs text-white/30 mt-1">van {data.campaigns.length} totaal</p>
              </div>
            </div>

            {/* Campaigns table */}
            <div className="rounded-xl bg-[#1a1a2e] border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h2 className="font-semibold">Campagnes</h2>
                <p className="text-xs text-white/40 mt-0.5">Overzicht van alle actieve en gepauzeerde campagnes</p>
              </div>
              {data.campaigns.length === 0 ? (
                <div className="px-5 py-12 text-center text-white/30 text-sm">
                  Geen campagnes gevonden
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Campagne</th>
                        <th className="text-left px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Status</th>
                        <th className="text-right px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Dagbudget</th>
                        <th className="text-right px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Vandaag uitgegeven</th>
                        <th className="text-right px-5 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">% benut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.campaigns.map((campaign) => {
                        const budgetUsedPct =
                          campaign.dailyBudget && campaign.dailyBudget > 0
                            ? Math.min((campaign.todaySpend / campaign.dailyBudget) * 100, 100)
                            : null;

                        return (
                          <tr key={campaign.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-medium text-white/90">{campaign.name}</p>
                                <p className="text-xs text-white/30 mt-0.5">{campaign.id}</p>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge isActive={campaign.isActive} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              {campaign.dailyBudget != null
                                ? <span className="text-white/70">{formatCurrency(campaign.dailyBudget, data.currency)}</span>
                                : <span className="text-white/30">—</span>}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className={campaign.todaySpend > 0 ? "text-blue-400 font-medium" : "text-white/30"}>
                                {formatCurrency(campaign.todaySpend, data.currency)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {budgetUsedPct != null ? (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        budgetUsedPct > 90 ? "bg-red-500" :
                                        budgetUsedPct > 70 ? "bg-amber-500" : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${budgetUsedPct}%` }}
                                    />
                                  </div>
                                  <span className="text-white/60 text-xs w-10 text-right">
                                    {budgetUsedPct.toFixed(0)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-white/30">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Cron info */}
            <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-5">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>🕘</span> Automatische dagelijkse check
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Tijdstip</p>
                  <p className="text-white/80">Elke dag om <span className="font-semibold text-blue-400">09:00 (UTC+2)</span></p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Endpoint</p>
                  <code className="text-xs bg-white/10 px-2 py-1 rounded text-white/60">/api/cron</code>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Cron schema (UTC)</p>
                  <code className="text-xs bg-white/10 px-2 py-1 rounded text-white/60">0 7 * * *</code>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Platform</p>
                  <p className="text-white/80">Vercel Cron Jobs</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
