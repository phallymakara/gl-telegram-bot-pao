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
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  React.useEffect(() => {
    if (deposit) {
      setNotes(deposit.notes || "");
      setActionError("");
    }
  }, [deposit]);

  if (!isOpen || !deposit) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(deposit.deposit_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (status: "APPROVED" | "REJECTED" | "PENDING") => {
    setSubmitting(true);
    setActionError("");
    try {
      const updated = await depositsApi.reviewDeposit(
        deposit.id,
        status,
        notes.trim() || undefined,
        currentUser?.name || "Admin"
      );
      notify(
        status === "APPROVED"
          ? `Deposit ${deposit.deposit_no} approved successfully`
          : status === "REJECTED"
          ? `Deposit ${deposit.deposit_no} marked as rejected`
          : `Deposit ${deposit.deposit_no} reset to pending`
      );
      onStatusUpdated(updated);
      onClose();
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err, "Failed to update deposit status");
      setActionError(friendlyMsg);
      notify(friendlyMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const statusTone: Record<string, string> = {
    APPROVED: "text-emerald-700 font-semibold",
    PENDING: "text-amber-700 font-semibold",
    REJECTED: "text-rose-700 font-semibold",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
              Deposit: {deposit.deposit_no}
            </h2>
            <span className={`text-xs font-semibold ${statusTone[deposit.status] || "text-slate-600"}`}>
              {deposit.status}
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
                <span className="text-xs font-semibold text-slate-700">
                  Payment Slip Attachment
                </span>
                {deposit.receipt_url && (
                  <a
                    href={deposit.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Open Original <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden flex items-center justify-center min-h-[300px] max-h-[440px] p-2">
                {deposit.receipt_url ? (
                  <img
                    src={deposit.receipt_url}
                    alt="Deposit Slip"
                    className="max-h-[420px] w-auto object-contain rounded"
                  />
                ) : (
                  <div className="p-6 text-center space-y-1">
                    <p className="text-sm font-medium text-slate-700">No Slip Uploaded</p>
                    <p className="text-xs text-slate-400 max-w-[200px]">
                      Customer skipped document attachment during the Telegram bot interaction.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Transaction Details & Review Form (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-baseline justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Total Deposit Amount</span>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    ${deposit.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">USD</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium block">Payment Method</span>
                  <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                    {deposit.payment_method === "BANK" ? "Bank Transfer / Cheque" : deposit.payment_method}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Transaction Metadata
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Transaction Reference</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-semibold text-slate-800">{deposit.deposit_no}</span>
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
                    <span className="font-medium text-slate-700 mt-0.5 block">
                      {new Date(deposit.transaction_date).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Customer Account Name</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {deposit.account_name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Telegram Metadata</span>
                    <span className="text-slate-600 font-mono mt-0.5 block">
                      {deposit.username ? `@${deposit.username}` : "—"} {deposit.telegram_user_id && `(ID: ${deposit.telegram_user_id})`}
                    </span>
                  </div>
                </div>

                {deposit.reviewed_by && (
                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Reviewed by {deposit.reviewed_by} on {deposit.reviewed_at ? new Date(deposit.reviewed_at).toLocaleString() : "—"}
                  </p>
                )}
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
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
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 resize-none"
                />
                {actionError && (
                  <p className="text-xs text-rose-600 mt-1">{actionError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-medium">
            {deposit.status === "PENDING" ? (
              <span className="text-amber-600">
                Awaiting administrator verification
              </span>
            ) : deposit.status === "APPROVED" ? (
              <span className="text-emerald-600">
                Deposit transaction verified & approved
              </span>
            ) : (
              <span className="text-rose-600">
                Deposit rejected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>

            {deposit.status !== "REJECTED" && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("REJECTED")}
                className="px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Reject
              </button>
            )}

            {deposit.status !== "APPROVED" && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("APPROVED")}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                Approve Deposit
              </button>
            )}

            {deposit.status !== "PENDING" && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("PENDING")}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Reset to Pending
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
