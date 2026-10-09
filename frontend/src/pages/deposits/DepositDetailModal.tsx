/**
 * @file DepositDetailModal.tsx
 * @description Modal dialog for inspecting customer deposits, previewing payment slip receipts,
 * and performing administrative verification actions (Approve / Reject).
 */

import React, { useState } from "react";
import { X, ExternalLink, Copy, Check } from "lucide-react";
import { getFriendlyErrorMessage } from "../../utils/errorMessage";
import { DepositItem, depositsApi } from "../../api";
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
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  React.useEffect(() => {
    if (deposit) {
      setCurrentDeposit(deposit);
      setNotes(deposit.notes || "");
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
        notes.trim() || undefined,
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
        className="bg-white rounded-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
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
            {/* Left: Receipt Slip Viewer (5 cols) */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Payment Slip Attachment
                </span>
                {currentDeposit.receipt_url && (
                  <a
                    href={currentDeposit.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-normal text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Open Original <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {currentDeposit.receipt_url ? (
                <div className="flex items-center justify-center min-h-[260px] max-h-[440px] overflow-hidden">
                  <img
                    src={currentDeposit.receipt_url}
                    alt="Deposit Slip"
                    className="max-h-[420px] w-auto object-contain rounded-lg border border-slate-200"
                  />
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-400">
                  No slip attached
                </div>
              )}
            </div>

            {/* Right: Transaction Details & Review Form (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-400">Total Deposit Amount</span>
                  <div className="text-xl font-medium text-slate-900 mt-0.5">
                    ${currentDeposit.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">USD</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Payment Method</span>
                  <span className="text-sm font-medium text-slate-700 mt-0.5 block">
                    {currentDeposit.payment_method === "BANK" ? "Bank Transfer / Cheque" : currentDeposit.payment_method}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Transaction Metadata
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Transaction Reference</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-slate-700">{currentDeposit.deposit_no}</span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Copy Reference"
                      >
                        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Transaction Timestamp</span>
                    <span className="text-slate-600 mt-0.5 block">
                      {new Date(currentDeposit.transaction_date).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Customer Account Name</span>
                    <span className="font-medium text-slate-700 mt-0.5 block">
                      {currentDeposit.account_name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Telegram Metadata</span>
                    <span className="text-slate-600 font-mono mt-0.5 block">
                      {currentDeposit.username ? `@${currentDeposit.username}` : "—"} {currentDeposit.telegram_user_id && `(ID: ${currentDeposit.telegram_user_id})`}
                    </span>
                  </div>
                </div>

                {currentDeposit.reviewed_by && (
                  <p className="text-xs text-slate-400 pt-1">
                    Reviewed by {currentDeposit.reviewed_by} on {currentDeposit.reviewed_at ? new Date(currentDeposit.reviewed_at).toLocaleString() : "—"}
                  </p>
                )}
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  Verification Notes / Bank Reference
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (actionError) setActionError("");
                  }}
                  placeholder="Enter verification notes or bank reference..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 resize-none"
                />
                {actionError && (
                  <p className="text-xs text-rose-600 mt-1">{actionError}</p>
                )}
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
