/**
 * @file WithdrawalDetailModal.tsx
 * @description Modal dialog for inspecting customer withdrawal requests, previewing attachment/receipt files,
 * entering payout confirmation notes, and performing administrative verification actions (Approve Payout / Reject).
 */

import React, { useState } from "react";
import { X, ExternalLink, Copy, Check } from "lucide-react";
import { getFriendlyErrorMessage } from "../../utils/errorMessage";
import { WithdrawalItem, withdrawalsApi, toMediaUrl } from "../../api";
import { useAuth } from "../../context/AuthContext";

interface WithdrawalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawal: WithdrawalItem | null;
  onStatusUpdated: (updated: WithdrawalItem) => void;
  notify: (msg: string, type?: "success" | "error") => void;
}

export default function WithdrawalDetailModal({
  isOpen,
  onClose,
  withdrawal,
  onStatusUpdated,
  notify,
}: WithdrawalDetailModalProps) {
  const { currentUser } = useAuth();
  const [currentWithdrawal, setCurrentWithdrawal] = useState<WithdrawalItem | null>(withdrawal);
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  React.useEffect(() => {
    if (withdrawal) {
      setCurrentWithdrawal(withdrawal);
      setNotes(withdrawal.notes || "");
      setReceiptUrl(withdrawal.receipt_url || "");
      setActionError("");
    }
  }, [withdrawal]);

  if (!isOpen || !currentWithdrawal) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentWithdrawal.withdraw_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    if (currentWithdrawal.status === "APPROVED") {
      notify("Approved withdrawal cannot be rejected or modified", "error");
      return;
    }
    setSubmitting(true);
    setActionError("");
    try {
      const updated = await withdrawalsApi.reviewWithdrawal(
        currentWithdrawal.id,
        status,
        notes.trim() || undefined,
        currentUser?.name || "Admin",
        receiptUrl.trim() || undefined
      );
      notify(
        status === "APPROVED"
          ? `Withdrawal ${currentWithdrawal.withdraw_no} approved & payout confirmed`
          : `Withdrawal ${currentWithdrawal.withdraw_no} rejected`
      );
      setCurrentWithdrawal(updated);
      onStatusUpdated(updated);
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err, "Failed to update withdrawal status");
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

  const activeAttachment = receiptUrl.trim() || currentWithdrawal.receipt_url;

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
              Withdrawal: {currentWithdrawal.withdraw_no}
            </h2>
            <span className={`text-xs ${statusTone[currentWithdrawal.status] || "text-slate-600"}`}>
              {currentWithdrawal.status}
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
            {/* Left: Transaction Details & Review Form (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {/* Section Header: Transaction Metadata */}
                <div className="px-4 py-2.5 bg-slate-50/70">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Transaction Metadata
                  </span>
                </div>

                {/* Total Withdrawal Amount Row */}
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Total Withdrawal Amount</span>
                  <span className="text-base font-semibold text-slate-900 text-right">
                    ${currentWithdrawal.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">USD</span>
                  </span>
                </div>

                {/* Payment Method Row */}
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Payment Method</span>
                  <span className="text-xs font-semibold text-slate-800 text-right">
                    {currentWithdrawal.payment_method === "BANK" ? "Bank Transfer / Cheque" : currentWithdrawal.payment_method}
                  </span>
                </div>

                {/* Metadata Rows */}
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Transaction Reference</span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <span>{currentWithdrawal.withdraw_no}</span>
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
                    {new Date(currentWithdrawal.transaction_date).toLocaleString()}
                  </span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Customer Account Name</span>
                  <span className="text-xs font-semibold text-slate-800 text-right">
                    {currentWithdrawal.account_name}
                  </span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Telegram Metadata</span>
                  <span className="text-xs font-semibold text-slate-800 text-right">
                    {currentWithdrawal.username ? `@${currentWithdrawal.username}` : "—"} {currentWithdrawal.telegram_user_id ? `(ID: ${currentWithdrawal.telegram_user_id})` : ""}
                  </span>
                </div>

                {currentWithdrawal.reviewed_by && (
                  <div className="px-4 py-3 flex items-center justify-between gap-4 bg-slate-50/40">
                    <span className="text-xs font-medium text-slate-500 shrink-0">Reviewed By</span>
                    <span className="text-xs font-medium text-slate-600 text-right">
                      {currentWithdrawal.reviewed_by} on {currentWithdrawal.reviewed_at ? new Date(currentWithdrawal.reviewed_at).toLocaleString() : "—"}
                    </span>
                  </div>
                )}
              </div>

              {/* Payout Slip URL (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  Payout Slip / Attachment URL
                </label>
                <input
                  type="text"
                  value={receiptUrl}
                  onChange={(e) => {
                    setReceiptUrl(e.target.value);
                    if (actionError) setActionError("");
                  }}
                  placeholder="Paste receipt or payment slip URL"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Admin Payout Remarks */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  Payout Verification Notes / Bank Transfer Reference
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (actionError) setActionError("");
                  }}
                  placeholder="Enter bank transfer reference or payout remarks..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 resize-none"
                />
                {actionError && (
                  <p className="text-xs text-rose-600 mt-1">{actionError}</p>
                )}
              </div>
            </div>

            {/* Right: Attachment / Payout Slip Viewer (5 cols) */}
            <div className="lg:col-span-5">
              <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white flex flex-col h-full min-h-[360px]">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Attachment File
                  </span>
                  {activeAttachment && (
                    <a
                      href={toMediaUrl(activeAttachment)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-normal text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Open Original <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center p-3 bg-slate-50/30 overflow-hidden">
                  {activeAttachment ? (
                    <img
                      src={toMediaUrl(activeAttachment)}
                      alt="Withdrawal Attachment"
                      className="max-h-[500px] w-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="py-24 text-center text-xs text-slate-400">
                      No attachment uploaded
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

          {currentWithdrawal.status !== "REJECTED" && (
            <button
              type="button"
              disabled={submitting || currentWithdrawal.status === "APPROVED"}
              onClick={() => handleAction("REJECTED")}
              className="px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={
                currentWithdrawal.status === "APPROVED"
                  ? "Approved withdrawal cannot be rejected"
                  : "Reject Withdrawal"
              }
            >
              Reject
            </button>
          )}

          {currentWithdrawal.status !== "APPROVED" && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction("APPROVED")}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              Approve Payout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
