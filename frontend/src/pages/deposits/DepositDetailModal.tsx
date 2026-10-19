/**
 * @file DepositDetailModal.tsx
 * @description Modal dialog for inspecting customer deposits, previewing payment slip receipts,
 * and performing administrative verification actions (Approve / Reject).
 */

import React, { useState } from "react";
import { X, ExternalLink, Copy, Check } from "lucide-react";
import { getFriendlyErrorMessage } from "../../utils/errorMessage";
import { DepositItem, depositsApi, toMediaUrl } from "../../api";
import { useAuth } from "../../context/AuthContext";

interface DepositDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposit: DepositItem | null;
  onStatusUpdated: (updated: DepositItem) => void;
  notify: (msg: string, type?: "success" | "error") => void;
}

export default function DepositDetailModal({
  isOpen,
  onClose,
  deposit,
  onStatusUpdated,
  notify,
}: DepositDetailModalProps) {
  const { currentUser } = useAuth();
  const [currentDeposit, setCurrentDeposit] = useState<DepositItem | null>(deposit);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  React.useEffect(() => {
    if (deposit) {
      setCurrentDeposit(deposit);
      setActionError("");
    }
  }, [deposit]);

  if (!isOpen || !currentDeposit) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentDeposit.deposit_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    if (currentDeposit.status === "APPROVED") {
      notify("Approved deposit cannot be rejected or modified", "error");
      return;
    }
    setSubmitting(true);
    setActionError("");
    try {
      const updated = await depositsApi.reviewDeposit(
        currentDeposit.id,
        status,
        undefined,
        currentUser?.name || "Admin"
      );
      notify(
        status === "APPROVED"
          ? `Deposit ${currentDeposit.deposit_no} approved successfully`
          : `Deposit ${currentDeposit.deposit_no} marked as rejected`
      );
      setCurrentDeposit(updated);
      onStatusUpdated(updated);
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err, "Failed to update deposit status");
      setActionError(friendlyMsg);
      notify(friendlyMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const statusTone: Record<string, string> = {
    APPROVED: "text-emerald-600 font-medium",
    PENDING: "text-amber-600 font-medium",
    REJECTED: "text-rose-600 font-medium",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 w-full max-w-4xl h-[85vh] min-h-[580px] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base sm:text-lg font-medium text-slate-800 truncate">
              Deposit: {currentDeposit.deposit_no}
            </h2>
            <span className={`text-xs ${statusTone[currentDeposit.status] || "text-slate-600"}`}>
              {currentDeposit.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Transaction Details (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {/* Section Header: Transaction Metadata */}
                <div className="px-4 py-2.5 bg-slate-50/70">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Transaction Metadata
                  </span>
                </div>

                {/* Total Deposit Amount Row */}
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Total Deposit Amount</span>
                  <span className="text-base font-semibold text-slate-900 text-right">
                    ${currentDeposit.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">USD</span>
                  </span>
                </div>

                {/* Payment Method Row */}
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Payment Method</span>
                  <span className="text-xs font-semibold text-slate-800 text-right">
                    {currentDeposit.payment_method === "BANK" ? "Bank Transfer / Cheque" : currentDeposit.payment_method}
                  </span>
                </div>

                {/* Metadata Rows */}
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Transaction Reference</span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <span>{currentDeposit.deposit_no}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                      title="Copy Reference"
                    >
                      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Transaction Timestamp</span>
                  <span className="text-xs font-semibold text-slate-800 text-right">
                    {new Date(currentDeposit.transaction_date).toLocaleString()}
                  </span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Customer Account Name</span>
                  <span className="text-xs font-semibold text-slate-800 text-right">
                    {currentDeposit.account_name}
                  </span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Telegram Metadata</span>
                  <span className="text-xs font-semibold text-slate-800 text-right">
                    {currentDeposit.username ? `@${currentDeposit.username}` : "—"} {currentDeposit.telegram_user_id ? `(ID: ${currentDeposit.telegram_user_id})` : ""}
                  </span>
                </div>

                {currentDeposit.reviewed_by && (
                  <div className="px-4 py-3 flex items-center justify-between gap-4 bg-slate-50/40">
                    <span className="text-xs font-medium text-slate-500 shrink-0">Reviewed By</span>
                    <span className="text-xs font-medium text-slate-600 text-right">
                      {currentDeposit.reviewed_by} on {currentDeposit.reviewed_at ? new Date(currentDeposit.reviewed_at).toLocaleString() : "—"}
                    </span>
                  </div>
                )}
              </div>

              {actionError && (
                <p className="text-xs text-rose-600 mt-2">{actionError}</p>
              )}
            </div>

            {/* Right: Payment Slip Attachment (5 cols) */}
            <div className="lg:col-span-5">
              <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white flex flex-col h-full min-h-[360px]">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Payment Slip Attachment
                  </span>
                  {currentDeposit.receipt_url && (
                    <a
                      href={toMediaUrl(currentDeposit.receipt_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-normal text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Open Original <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center p-3 bg-slate-50/30 overflow-hidden">
                  {currentDeposit.receipt_url ? (
                    <img
                      src={toMediaUrl(currentDeposit.receipt_url)}
                      alt="Deposit Slip"
                      className="max-h-[460px] w-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="py-20 text-center text-xs text-slate-400">
                      No slip attached
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          {currentDeposit.status !== "REJECTED" && (
            <button
              type="button"
              disabled={submitting || currentDeposit.status === "APPROVED"}
              onClick={() => handleAction("REJECTED")}
              className="px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={
                currentDeposit.status === "APPROVED"
                  ? "Approved deposit cannot be rejected"
                  : "Reject Deposit"
              }
            >
              Reject
            </button>
          )}

          {currentDeposit.status !== "APPROVED" && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction("APPROVED")}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              Approve Deposit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
