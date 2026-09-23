/**
 * @file DepositsPage.tsx
 * @description Customer Deposits & Withdrawals Management page component.
 * Allows administrators to monitor customer money deposits and cash withdrawals,
 * inspect uploaded payment slips or payout bank details, and approve or reject transactions.
 */

import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { getFriendlyErrorMessage } from "../utils/errorMessage";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import SearchInput from "../components/SearchInput";
import DepositDetailModal from "./deposits/DepositDetailModal";
import WithdrawalDetailModal from "./deposits/WithdrawalDetailModal";
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

export default function DepositsPage({ notify }: DepositsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("deposits");

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

  const loadData = async () => {
    setLoading(true);
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
      notify(
        activeTab === "deposits"
          ? "Failed to load customer deposits"
          : "Failed to load customer withdrawals",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Preload both stats on initial mount so badge counts are available
  useEffect(() => {
    depositsApi.getStats().then(setDepositStats).catch(() => {});
    withdrawalsApi.getStats().then(setWithdrawalStats).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, methodFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
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
    setDeposits((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    depositsApi.getStats().then(setDepositStats).catch(() => {});
  };

  const handleQuickApproveDeposit = async (e: React.MouseEvent, d: DepositItem) => {
    e.stopPropagation();
    try {
      const updated = await depositsApi.reviewDeposit(d.id, "APPROVED", undefined, "Admin");
      notify(`Deposit ${d.deposit_no} approved`);
      handleDepositStatusUpdated(updated);
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err, "Failed to approve deposit"), "error");
    }
  };

  // Withdrawals handlers
  const handleOpenWithdrawalDetail = (w: WithdrawalItem) => {
    setSelectedWithdrawal(w);
    setIsWithdrawalModalOpen(true);
  };

  const handleWithdrawalStatusUpdated = (updated: WithdrawalItem) => {
    setWithdrawals((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    withdrawalsApi.getStats().then(setWithdrawalStats).catch(() => {});
  };

  const handleQuickApproveWithdrawal = async (e: React.MouseEvent, w: WithdrawalItem) => {
    e.stopPropagation();
    try {
      const updated = await withdrawalsApi.reviewWithdrawal(
        w.id,
        "APPROVED",
        undefined,
        undefined,
        "Admin"
      );
      notify(`Withdrawal ${w.withdraw_no} marked as approved / paid`);
      handleWithdrawalStatusUpdated(updated);
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err, "Failed to approve withdrawal"), "error");
    }
  };

  const formatCurrency = (val: number) =>
    `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statusTint: Record<string, string> = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3.5 min-h-0">
      {/* Tab Switcher */}
      <div className="flex items-center gap-8 border-b border-slate-200 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab("deposits");
            handleResetFilters();
          }}
          className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            activeTab === "deposits"
              ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px"
              : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
          }`}
        >
          <span>Customer Deposits</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("withdrawals");
            handleResetFilters();
          }}
          className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            activeTab === "withdrawals"
              ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px"
              : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
          }`}
        >
          <span>Customer Withdrawals</span>
        </button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        {activeTab === "deposits" ? (
          <>
            <StatCard
              label="Total Deposits"
              value={depositStats ? depositStats.total_count : "—"}
              sub={depositStats ? `${formatCurrency(depositStats.total_amount)} USD Total` : "Volume"}
              tint="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              label="Pending Review"
              value={depositStats ? depositStats.pending_count : "—"}
              sub={
                depositStats ? `${formatCurrency(depositStats.pending_amount)} USD Pending` : "Needs Action"
              }
              tint="bg-amber-50 text-amber-600"
            />
            <StatCard
              label="Approved Deposits"
              value={depositStats ? depositStats.approved_count : "—"}
              sub={
                depositStats ? `${formatCurrency(depositStats.approved_amount)} USD Cleared` : "Approved"
              }
              tint="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Rejected Deposits"
              value={depositStats ? depositStats.rejected_count : "—"}
              sub={
                depositStats ? `${formatCurrency(depositStats.rejected_amount)} USD Declined` : "Declined"
              }
              tint="bg-rose-50 text-rose-600"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Total Withdrawals"
              value={withdrawalStats ? withdrawalStats.total_count : "—"}
              sub={
                withdrawalStats ? `${formatCurrency(withdrawalStats.total_amount)} USD Total` : "Volume"
              }
              tint="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              label="Pending Payout"
              value={withdrawalStats ? withdrawalStats.pending_count : "—"}
              sub={
                withdrawalStats
                  ? `${formatCurrency(withdrawalStats.pending_amount)} USD Pending`
                  : "Needs Payout"
              }
              tint="bg-amber-50 text-amber-600"
            />
            <StatCard
              label="Approved & Paid"
              value={withdrawalStats ? withdrawalStats.approved_count : "—"}
              sub={
                withdrawalStats
                  ? `${formatCurrency(withdrawalStats.approved_amount)} USD Paid`
                  : "Completed"
              }
              tint="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Rejected Requests"
              value={withdrawalStats ? withdrawalStats.rejected_count : "—"}
              sub={
                withdrawalStats
                  ? `${formatCurrency(withdrawalStats.rejected_amount)} USD Cancelled`
                  : "Declined"
              }
              tint="bg-rose-50 text-rose-600"
            />
          </>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Filters and Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 flex-shrink-0 items-stretch sm:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px]">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={
                activeTab === "deposits"
                  ? "Search by Transaction ID (e.g. DEP-), customer name or username…"
                  : "Search by Withdrawal ID (e.g. WTH-), customer name or notes…"
              }
            />
          </form>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh records"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          {activeTab === "deposits" ? (
            /* Deposits Table */
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
                    <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && deposits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                      Loading customer deposits...
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                      No customer deposit transactions found.
                    </td>
                  </tr>
                ) : (
                  deposits.map((d, i) => (
                    <tr
                      key={d.id}
                      onClick={() => handleOpenDepositDetail(d)}
                      className="border-b border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100/80 px-2 py-1 rounded">
                          {d.deposit_no}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {d.account_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="leading-tight">
                            <span className="font-semibold text-slate-800 block">
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
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(d.amount)}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">USD</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-700 font-medium">
                        {d.payment_method === "BANK" ? "Bank Transfer" : d.payment_method}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {d.receipt_url ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={d.receipt_url}
                              alt="Slip thumbnail"
                              className="h-9 w-9 rounded-lg object-cover border border-slate-200 shadow-2xs hover:scale-110 transition-transform"
                            />
                            <span className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-0.5">
                              Slip Attached
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                            <ImageIcon size={12} /> No Slip
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        {new Date(d.transaction_date).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            statusTint[d.status] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {d.status === "PENDING" && <Clock size={11} />}
                          {d.status === "APPROVED" && <CheckCircle2 size={11} />}
                          {d.status === "REJECTED" && <XCircle size={11} />}
                          {d.status}
                        </span>
                      </td>
                      <td
                        className="px-5 py-3.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDepositDetail(d)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 transition-colors flex items-center gap-1"
                          >
                            <Eye size={13} /> Review
                          </button>
                          {d.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickApproveDeposit(e, d)}
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                              title="Quick Approve Deposit"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* Withdrawals Table */
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
                    <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                      Loading customer withdrawals...
                    </td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                      No customer withdrawal requests found.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w, i) => (
                    <tr
                      key={w.id}
                      onClick={() => handleOpenWithdrawalDetail(w)}
                      className="border-b border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100/80 px-2 py-1 rounded">
                          {w.withdraw_no}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {w.account_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="leading-tight">
                            <span className="font-semibold text-slate-800 block">
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
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-rose-600 text-sm">
                          -{formatCurrency(w.amount)}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">USD</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-700 font-medium">
                        {w.payment_method === "BANK" ? "Bank Transfer" : w.payment_method}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {w.receipt_url ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={w.receipt_url}
                              alt="Payout slip thumbnail"
                              className="h-9 w-9 rounded-lg object-cover border border-slate-200 shadow-2xs hover:scale-110 transition-transform"
                            />
                            <span className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-0.5">
                              Proof Attached
                            </span>
                          </div>
                        ) : w.notes ? (
                          <span
                            className="text-xs text-slate-600 max-w-[180px] truncate block"
                            title={w.notes}
                          >
                            {w.notes}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Standard Payout
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        {new Date(w.transaction_date).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            statusTint[w.status] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {w.status === "PENDING" && <Clock size={11} />}
                          {w.status === "APPROVED" && <CheckCircle2 size={11} />}
                          {w.status === "REJECTED" && <XCircle size={11} />}
                          {w.status}
                        </span>
                      </td>
                      <td
                        className="px-5 py-3.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenWithdrawalDetail(w)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 transition-colors flex items-center gap-1"
                          >
                            <Eye size={13} /> Review
                          </button>
                          {w.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickApproveWithdrawal(e, w)}
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                              title="Quick Approve / Paid"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
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
