"use client";

import { useEffect, useState, useCallback } from "react";
import type { AdAccount, BudgetCheckResult, AccountSummary, CampaignBudgetInfo } from "@/lib/meta-api";

const STORAGE_KEY = "meta_selected_accounts";

interface TokenStatus {
  valid: boolean;
  expires: string | null;
  scopes: string[];
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

// ── Account Selector ─────────────────────────────────────────────────────────

function AccountSelector({
  allAccounts,
  selected,
  onChange,
}: {
  allAccounts: AdAccount[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = allAccounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.includes(search)
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(allAccounts.map((a) => a.id)));
  const clearAll = () => onChange(new Set());

  const activeCount = allAccounts.filter((a) => a.account_status === 1).length;

  return (
    <div className="rounded-xl bg-[#1a1a2e] border border-white/10 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">Accounts selecteren</p>
            <p className="text-xs text-white/40 mt-0.5">
              {selected.size === 0
                ? "Alle accounts geselecteerd"
                : `${selected.size} van ${allAccounts.length} geselecteerd`}
              {" · "}{activeCount} actief in Meta
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/10">
          {/* Zoek + bulk acties */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Zoek account..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-colors whitespace-nowrap">Alles</button>
            <button onClick={clearAll} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-colors whitespace-nowrap">Wis</button>
          </div>

          {/* Account lijst */}
          <div className="max-h-72 overflow-y-auto px-2 pb-2">
            {filtered.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">Geen accounts gevonden</p>
            ) : (
              filtered.map((account) => {
                const isChecked = selected.has(account.id);
                const isActive = account.account_status === 1;
                return (
                  <label
                    key={account.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(account.id)}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/80 truncate">{account.name}</span>
                        {isActive && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                            actief
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-white/30">{account.id}</span>
                        {account.business?.name && (
                          <span className="text-xs text-white/20">· {account.business.name}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-white/30 shrink-0">{account.currency}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign Row ──────────────────────────────────────────────────────────────

function CampaignRow({ c, currency }: { c: CampaignBudgetInfo; currency: string }) {
  const pct = c.dailyBudget && c.dailyBudget > 0
    ? Math.min((c.todaySpend / c.dailyBudget) * 100, 100)
    : null;

  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02] transition-colors text-sm">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
          <span className="text-white/80 truncate max-w-xs">{c.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-white/40 text-xs">
        {c.dailyBudget != null ? fmt(c.dailyBudget, currency) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={c.todaySpend > 0 ? "text-blue-400 font-medium" : "text-white/20"}>
          {fmt(c.todaySpend, currency)}
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
        ) : <span className="text-white/20 text-xs">—</span>}
      </td>
    </tr>
  );
}

// ── Account Card ──────────────────────────────────────────────────────────────

function AccountCard({ account }: { account: AccountSummary }) {
  const [expanded, setExpanded] = useState(false);
  const activeCampaigns = account.campaigns.filter((c) => c.isActive).length;

  return (
    <div className={`rounded-xl border transition-colors ${
      account.error ? "border-red-500/30 bg-red-500/5" :
      account.hasActiveSpend ? "border-emerald-500/20 bg-[#1a1a2e]" :
      "border-white/8 bg-[#1a1a2e]"
    }`}>
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${account.hasActiveSpend ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
          <div className="min-w-0">
            <p className="font-medium text-white/90 truncate">{account.accountName}</p>
            <p className="text-xs text-white/30 mt-0.5">
              {account.accountId}
              {account.businessName && <span className="text-white/20"> · {account.businessName}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/30 mb-0.5">Campagnes</p>
            <p className="text-sm text-white/60">
              <span className="font-medium text-white/80">{activeCampaigns}</span>
              <span className="text-white/30"> / {account.campaigns.length}</span>
            </p>
          </div>
          <div className="text-right min-w-[80px]">
            <p className="text-xs text-white/30 mb-0.5">Vandaag</p>
            <p className={`text-sm font-semibold ${account.hasActiveSpend ? "text-blue-400" : "text-white/25"}`}>
              {account.error ? "fout" : fmt(account.todaySpend, account.currency)}
            </p>
          </div>
          <svg className={`w-4 h-4 text-white/25 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {account.error && (
        <div className="px-5 pb-4">
          <p className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-3 py-2">{account.error}</p>
        </div>
      )}

      {expanded && !account.error && (
        <div className="border-t border-white/5">
          {account.campaigns.length === 0 ? (
            <p className="px-5 py-6 text-sm text-white/25 text-center">Geen campagnes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-white/25 uppercase tracking-wider">
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [allAccounts, setAllAccounts] = useState<AdAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BudgetCheckResult | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [accountSearch, setAccountSearch] = useState("");

  // Laad alle beschikbare accounts eenmalig
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d: { success: boolean; accounts?: AdAccount[]; error?: string }) => {
        if (d.success && d.accounts) {
          setAllAccounts(d.accounts);
          // Herstel selectie uit localStorage
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              const ids = JSON.parse(saved) as string[];
              setSelectedIds(new Set(ids));
            } catch { /* ignore */ }
          }
        } else {
          setError(d.error ?? "Kon accounts niet ophalen");
        }
      })
      .catch(() => setError("Verbindingsfout"))
      .finally(() => setLoadingAccounts(false));

    fetch("/api/status")
      .then((r) => r.json())
      .then((d: TokenStatus) => setTokenStatus(d));
  }, []);

  const fetchBudget = useCallback(async () => {
    setLoadingBudget(true);
    setError(null);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds: [...selectedIds] }),
      });
      const json = await res.json() as { success: boolean; data?: BudgetCheckResult; error?: string };
      if (json.success && json.data) {
        setResult(json.data);
        setLastRefresh(new Date());
      } else {
        setError(json.error ?? "Onbekende fout");
      }
    } catch {
      setError("Verbindingsfout");
    } finally {
      setLoadingBudget(false);
    }
  }, [selectedIds]);

  // Herlaad budget als selectie verandert
  useEffect(() => {
    if (!loadingAccounts && allAccounts.length > 0) {
      fetchBudget();
    }
  }, [selectedIds, loadingAccounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectionChange = (next: Set<string>) => {
    setSelectedIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  };

  const filteredResults = result?.accounts.filter((a) =>
    a.accountName.toLowerCase().includes(accountSearch.toLowerCase()) ||
    a.accountId.includes(accountSearch)
  ) ?? [];

  const isLoading = loadingAccounts || loadingBudget;

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#13131f]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-base">M</div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Meta Budget Monitor</h1>
              <p className="text-xs text-white/35">Dagelijkse check · 09:00</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-white/25 hidden md:block">{fmtDate(lastRefresh.toISOString())}</span>
            )}
            <button
              onClick={fetchBudget}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${loadingBudget ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Vernieuwen
            </button>
          </div>
        </div>
      </div>

      {/* Token status */}
      {tokenStatus && (
        <div className={`border-b px-6 py-1.5 text-xs flex items-center gap-2 ${
          tokenStatus.valid ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-400" : "border-red-500/15 bg-red-500/5 text-red-400"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tokenStatus.valid ? "bg-emerald-400" : "bg-red-400"}`} />
          {tokenStatus.valid
            ? `Token actief${tokenStatus.expires ? ` · verloopt ${new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(tokenStatus.expires))}` : ""}`
            : "Token ongeldig — controleer META_ACCESS_TOKEN in .env.local"}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Foutmelding */}
        {error && !loadingAccounts && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center">
            <p className="text-red-300 font-medium mb-1">Verbinding mislukt</p>
            <p className="text-sm text-red-400/70">{error}</p>
          </div>
        )}

        {/* Skeleton loading */}
        {loadingAccounts && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/30 text-sm">Accounts ophalen via Meta API...</p>
          </div>
        )}

        {!loadingAccounts && allAccounts.length > 0 && (
          <>
            {/* Account selector */}
            <AccountSelector
              allAccounts={allAccounts}
              selected={selectedIds}
              onChange={handleSelectionChange}
            />

            {/* KPI's */}
            {result && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-4">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Accounts</p>
                  <p className="text-2xl font-bold">{result.totalAccounts}</p>
                </div>
                <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-4">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Actief vandaag</p>
                  <p className="text-2xl font-bold text-emerald-400">{result.activeAccounts}</p>
                </div>
                <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-4">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Geen uitgaven</p>
                  <p className="text-2xl font-bold text-amber-400">{result.totalAccounts - result.activeAccounts}</p>
                </div>
                <div className="rounded-xl bg-[#1a1a2e] border border-white/10 p-4">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Totaal vandaag</p>
                  <p className="text-2xl font-bold text-blue-400">€{result.totalTodaySpend.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Budget resultaten */}
            {loadingBudget && (
              <div className="flex items-center justify-center gap-3 py-12">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-white/30 text-sm">Budgetten ophalen...</p>
              </div>
            )}

            {!loadingBudget && result && (
              <div className="space-y-3">
                {/* Zoekbalk resultaten */}
                {result.accounts.length > 4 && (
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Filter resultaten..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#1a1a2e] border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                )}

                {filteredResults.length === 0 ? (
                  <p className="text-center text-white/25 py-10 text-sm">Geen resultaten</p>
                ) : (
                  filteredResults.map((account) => (
                    <AccountCard key={account.accountId} account={account} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
