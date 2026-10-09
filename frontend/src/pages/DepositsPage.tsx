/**
 * @file DepositsPage.tsx
 * @description Customer Deposits & Withdrawals Management page component.
 * Allows administrators to monitor customer money deposits and cash withdrawals,
 * inspect uploaded payment slips or payout bank details, and approve or reject transactions.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Eye,
} from "lucide-react";
import { getFriendlyErrorMessage } from "../utils/errorMessage";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import SearchInput from "../components/SearchInput";
import DepositDetailModal from "./deposits/DepositDetailModal";
import WithdrawalDetailModal from "./deposits/WithdrawalDetailModal";
import Loader, { TableLoader } from "../components/Loader";
import LazyTableFooter from "../components/LazyTableFooter";
import useLazyRecords from "../hooks/useLazyRecords";
import {
  DepositItem,
  DepositStats,
  depositsApi,
  WithdrawalItem,
  WithdrawalStats,
  withdrawalsApi,
} from "../api";

interface DepositsPageProps {
  notify: (msg: string, type?: "success" | "error") => void;
}

type TabType = "deposits" | "withdrawals";

function getShortProofLabel(notes?: string | null): string {
  if (!notes) return "No Slip";
  const lower = notes.toLowerCase();
  if (lower.includes("cash")) return "Cash";
  if (lower.includes("qr")) return "Bank QR";
  if (lower.includes("slip") || lower.includes("receipt")) return "Slip";
  if (lower.includes("bank")) return "Bank";
  if (notes.length <= 15) return notes;
  return notes
    .replace(/requested via telegram bot/gi, "")
    .replace(/submitted via telegram bot/gi, "")
    .replace(/via telegram bot/gi, "")
    .trim() || "No Slip";
}

export default function DepositsPage({ notify }: DepositsPageProps) {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam === "withdrawals" ? "withdrawals" : "deposits"
  );

  useEffect(() => {
    if (tabParam === "withdrawals") {
      setActiveTab("withdrawals");
    } else if (tabParam === "deposits") {
      setActiveTab("deposits");
    }
  }, [tabParam]);

  // Deposits State
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [depositStats, setDepositStats] = useState<DepositStats | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositItem | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Withdrawals State
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalStats | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalItem | null>(null);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  // Common Table Controls
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [methodFilter, setMethodFilter] = useState("All Methods");
  const isFirstLoad = useRef(true);

  // Lazy records progressive loader (15 records per load)
  const {
    visibleRecords: visibleDeposits,
    displayCount: depositCount,
    isLoadingMore: isDepositsLoadingMore,
    sentinelRef: depositSentinelRef,
    handleScroll: handleDepositScroll,
  } = useLazyRecords(deposits, { initialCount: 15, batchSize: 15 });

  const {
    visibleRecords: visibleWithdrawals,
    displayCount: withdrawalCount,
    isLoadingMore: isWithdrawalsLoadingMore,
    sentinelRef: withdrawalSentinelRef,
    handleScroll: handleWithdrawalScroll,
  } = useLazyRecords(withdrawals, { initialCount: 15, batchSize: 15 });

  // Live realtime data fetcher
  const loadData = useCallback(
    async (silent = false) => {
      if (!silent && isFirstLoad.current) {
        setLoading(true);
      }
      try {
        if (activeTab === "deposits") {
          const [depList, dStats] = await Promise.all([
            depositsApi.getDeposits({
              status: statusFilter,
              payment_method: methodFilter,
              search: q || undefined,
            }),
            depositsApi.getStats(),
          ]);
          setDeposits(depList);
          setDepositStats(dStats);
        } else {
          const [wthList, wStats] = await Promise.all([
            withdrawalsApi.getWithdrawals({
              status: statusFilter,
              payment_method: methodFilter,
              search: q || undefined,
            }),
            withdrawalsApi.getStats(),
          ]);
          setWithdrawals(wthList);
          setWithdrawalStats(wStats);
        }
      } catch {
        if (!silent) {
          notify(
            activeTab === "deposits"
              ? "Failed to load customer deposits"
              : "Failed to load customer withdrawals",
            "error"
          );
        }
      } finally {
        setLoading(false);
        isFirstLoad.current = false;
      }
    },
    [activeTab, statusFilter, methodFilter, q, notify]
  );

  // Preload both stats on initial mount so badge counts are available
  useEffect(() => {
    depositsApi.getStats().then(setDepositStats).catch(() => {});
    withdrawalsApi.getStats().then(setWithdrawalStats).catch(() => {});
  }, []);

  // Realtime polling (every 2s + window focus)
  useEffect(() => {
    isFirstLoad.current = true;
    loadData(false);
    const interval = setInterval(() => {
      loadData(true);
    }, 2000);
    const handleFocus = () => loadData(true);
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(false);
  };

  const handleResetFilters = () => {
    setQ("");
    setStatusFilter("All Statuses");
    setMethodFilter("All Methods");
  };

  // Deposits handlers
  const handleOpenDepositDetail = (d: DepositItem) => {
    setSelectedDeposit(d);
    setIsDepositModalOpen(true);
  };

  const handleDepositStatusUpdated = (updated: DepositItem) => {
    setSelectedDeposit(updated);
    setDeposits((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    depositsApi.getStats().then(setDepositStats).catch(() => {});
  };

  // Withdrawals handlers
  const handleOpenWithdrawalDetail = (w: WithdrawalItem) => {
    setSelectedWithdrawal(w);
    setIsWithdrawalModalOpen(true);
  };

  const handleWithdrawalStatusUpdated = (updated: WithdrawalItem) => {
    setSelectedWithdrawal(updated);
    setWithdrawals((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    withdrawalsApi.getStats().then(setWithdrawalStats).catch(() => {});
  };

  const formatCurrency = (val: number) =>
    `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statusColor: Record<string, string> = {
    APPROVED: "text-emerald-600 font-medium",
    PENDING: "text-amber-600 font-medium",
    REJECTED: "text-rose-600 font-medium",
  };

  return (
    <div className="flex-1 pt-2 px-3.5 pb-2 sm:pt-2 sm:px-5 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-2 min-h-0">
      {/* Tab Switcher */}
      <div className="flex items-center gap-6 flex-shrink-0" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "deposits"}
          onClick={() => {
            setActiveTab("deposits");
            handleResetFilters();
          }}
          className={`rounded-none bg-transparent border-0 pb-1 text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none ${
            activeTab === "deposits"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Customer Deposits</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "withdrawals"}
          onClick={() => {
            setActiveTab("withdrawals");
            handleResetFilters();
          }}
          className={`rounded-none bg-transparent border-0 pb-1 text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none ${
            activeTab === "withdrawals"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Customer Withdrawals</span>
        </button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-shrink-0">
        {activeTab === "deposits" ? (
          <>
            <StatCard
              compact
              label="Total Deposits"
              value={depositStats ? depositStats.total_count : "—"}
              tint="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              compact
              label="Pending Review"
              value={depositStats ? depositStats.pending_count : "—"}
              tint="bg-amber-50 text-amber-600"
            />
            <StatCard
              compact
              label="Approved Deposits"
              value={depositStats ? depositStats.approved_count : "—"}
              tint="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              compact
              label="Rejected Deposits"
              value={depositStats ? depositStats.rejected_count : "—"}
              tint="bg-rose-50 text-rose-600"
            />
          </>
        ) : (
          <>
            <StatCard
              compact
              label="Total Withdrawals"
              value={withdrawalStats ? withdrawalStats.total_count : "—"}
              tint="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              compact
              label="Pending Payout"
              value={withdrawalStats ? withdrawalStats.pending_count : "—"}
              tint="bg-amber-50 text-amber-600"
            />
            <StatCard
              compact
              label="Approved & Paid"
              value={withdrawalStats ? withdrawalStats.approved_count : "—"}
              tint="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              compact
              label="Rejected Requests"
              value={withdrawalStats ? withdrawalStats.rejected_count : "—"}
              tint="bg-rose-50 text-rose-600"
            />
          </>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Filters and Search Toolbar */}
        <div className="px-3 py-2 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5 flex-shrink-0 items-stretch sm:items-center">
          <form onSubmit={handleSearchSubmit} className="w-full sm:w-80 shrink-0">
            <SearchInput
              size="sm"
              value={q}
              onChange={setQ}
              className="w-full"
              placeholder={
                activeTab === "deposits"
                  ? "Search by transaction ID, customer name or username…"
                  : "Search by withdrawal ID, customer name or notes…"
              }
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {["All Statuses", "PENDING", "APPROVED", "REJECTED"].map((s) => (
                <option key={s} value={s}>
                  {s === "All Statuses" ? s : s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {["All Methods", "BANK", "CASH"].map((m) => (
                <option key={m} value={m}>
                  {m === "All Methods" ? m : m === "BANK" ? "Bank Transfer" : "Cash"}
                </option>
              ))}
            </select>

            {(q || statusFilter !== "All Statuses" || methodFilter !== "All Methods") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
            )}

          </div>
        </div>

        {/* Data Table */}
        <div
          onScroll={activeTab === "deposits" ? handleDepositScroll : handleWithdrawalScroll}
          className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full flex flex-col"
        >
          {loading && (activeTab === "deposits" ? deposits.length === 0 : withdrawals.length === 0) ? (
            <div className="flex-1 w-full min-h-[360px] flex flex-col items-center justify-center p-8">
              <Loader
                size="md"
                text={
                  activeTab === "deposits"
                    ? "Loading customer deposits..."
                    : "Loading customer withdrawals..."
                }
              />
            </div>
          ) : activeTab === "deposits" ? (
            /* Deposits Table */
            <>
              <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                  {[
                    "#",
                    "Transaction ID",
                    "Customer",
                    "Deposit Amount",
                    "Payment Method",
                    "Payment Slip",
                    "Date & Time",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium whitespace-nowrap bg-slate-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      No customer deposit transactions found.
                    </td>
                  </tr>
                ) : (
                  visibleDeposits.map((d, i) => (
                    <tr
                      key={d.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-2 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-slate-500 text-xs">
                          {d.deposit_no}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="leading-tight">
                          <span className="font-medium text-slate-800 text-xs block">
                            {d.account_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {d.username
                              ? `@${d.username}`
                              : d.telegram_user_id
                              ? `ID: ${d.telegram_user_id}`
                              : "Telegram Customer"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-slate-900 text-xs font-medium">
                          {formatCurrency(d.amount)}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">USD</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-700">
                        {d.payment_method === "BANK" ? "Bank Transfer" : d.payment_method}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {d.receipt_url ? (
                          <img
                            src={d.receipt_url}
                            alt="Slip thumbnail"
                            className="h-6 w-6 rounded object-cover border border-slate-200 hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            No Slip
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="leading-tight">
                          <span className="text-slate-700 text-xs font-medium block">
                            {new Date(d.transaction_date).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(d.transaction_date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`text-xs ${
                            statusColor[d.status] || "text-slate-600 font-medium"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDepositDetail(d)}
                            className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors flex items-center justify-center"
                            title="Review Deposit"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {isDepositsLoadingMore && (
                  <TableLoader colSpan={9} text="Loading more customer deposits..." position="bottom" size="sm" />
                )}
              </tbody>
            </table>
            <div ref={depositSentinelRef} className="h-2 w-full" />
          </>
        ) : (
          /* Withdrawals Table */
          <>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                  {[
                    "#",
                    "Transaction ID",
                    "Customer",
                    "Withdraw Amount",
                    "Payout Method",
                    "Proof / Transfer Ref",
                    "Date & Time",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-2 font-medium whitespace-nowrap bg-slate-50 ${
                        h === "Withdraw Amount" ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      No customer withdrawal requests found.
                    </td>
                  </tr>
                ) : (
                  visibleWithdrawals.map((w, i) => (
                    <tr
                      key={w.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-2 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-slate-500 text-xs">
                          {w.withdraw_no}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="leading-tight">
                          <span className="font-medium text-slate-800 text-xs block">
                            {w.account_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {w.username
                              ? `@${w.username}`
                              : w.telegram_user_id
                              ? `ID: ${w.telegram_user_id}`
                              : "Telegram Customer"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <span className="text-rose-600 text-xs font-medium">
                          -{formatCurrency(w.amount)}
                        </span>
                        <span className="text-[11px] text-rose-500 ml-1">USD</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-700">
                        {w.payment_method === "BANK" ? "Bank Transfer" : w.payment_method}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {w.receipt_url ? (
                          <img
                            src={w.receipt_url}
                            alt="Payout slip thumbnail"
                            className="h-6 w-6 rounded object-cover border border-slate-200 hover:opacity-90 transition-opacity"
                          />
                        ) : w.notes ? (
                          <span
                            className="text-xs text-slate-600 block"
                            title={w.notes}
                          >
                            {getShortProofLabel(w.notes)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No Slip
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="leading-tight">
                          <span className="text-slate-700 text-xs font-medium block">
                            {new Date(w.transaction_date).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(w.transaction_date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`text-xs ${
                            statusColor[w.status] || "text-slate-600 font-medium"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenWithdrawalDetail(w)}
                            className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors flex items-center justify-center"
                            title="Review Withdrawal"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {isWithdrawalsLoadingMore && (
                  <TableLoader colSpan={9} text="Loading more customer withdrawals..." position="bottom" size="sm" />
                )}
              </tbody>
            </table>
            <div ref={withdrawalSentinelRef} className="h-2 w-full" />
          </>
        )}
      </div>

        {/* Progressive Lazy Records Footer */}
        {activeTab === "deposits" ? (
          <LazyTableFooter
            currentShown={depositCount}
            totalRecords={deposits.length}
          />
        ) : (
          <LazyTableFooter
            currentShown={withdrawalCount}
            totalRecords={withdrawals.length}
          />
        )}
      </Card>

      {/* Deposit Detail & Verification Modal */}
      <DepositDetailModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        deposit={selectedDeposit}
        onStatusUpdated={handleDepositStatusUpdated}
        notify={notify}
      />

      {/* Withdrawal Detail & Verification Modal */}
      <WithdrawalDetailModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        withdrawal={selectedWithdrawal}
        onStatusUpdated={handleWithdrawalStatusUpdated}
        notify={notify}
      />
    </div>
  );
}
