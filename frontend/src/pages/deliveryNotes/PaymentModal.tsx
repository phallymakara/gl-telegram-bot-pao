/**
 * @file PaymentModal.tsx
 * @description Modal dialog for recording individual payment collections against a Delivery Note.
 */

import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, User, CreditCard, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { deliveryNotesApi, DeliveryNoteItem } from "../../api";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryNote: DeliveryNoteItem | null;
  onSuccess: () => void;
  notify: (msg: string) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  deliveryNote,
  onSuccess,
  notify,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [collectedBy, setCollectedBy] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNote, setReferenceNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen && deliveryNote) {
      setAmount(deliveryNote.outstanding_balance > 0 ? String(deliveryNote.outstanding_balance) : "");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setCollectedBy("");
      setPaymentMethod("CASH");
      setReferenceNote("");
      setErrorMsg("");
    }
  }, [isOpen, deliveryNote]);

  if (!isOpen || !deliveryNote) return null;

  const outstanding = Number(deliveryNote.outstanding_balance) || 0;
  const numAmount = parseFloat(amount) || 0;
  const isOverpaying = numAmount > outstanding;
  const remainingAfterThis = Math.max(0, outstanding - numAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deliveryNote) return;

    if (!amount || numAmount <= 0) {
      setErrorMsg("Please enter a valid payment amount greater than zero.");
      return;
    }

    if (numAmount > outstanding) {
      setErrorMsg(`Payment amount ($${numAmount.toFixed(2)}) cannot exceed outstanding balance ($${outstanding.toFixed(2)}).`);
      return;
    }

    if (!collectedBy.trim()) {
      setErrorMsg("Please specify who collected the payment (Staff Name).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await deliveryNotesApi.recordPayment(deliveryNote.id, {
        amount: numAmount,
        payment_date: paymentDate,
        collected_by: collectedBy.trim(),
        payment_method: paymentMethod,
        reference_note: referenceNote.trim() || undefined,
      });

      notify(`Payment of $${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} recorded successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to record payment";
      setErrorMsg(detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-600" />
              Record Payment Collection
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {deliveryNote.delivery_no} • Ref: {deliveryNote.order_no} • {deliveryNote.customer_name || deliveryNote.recipient_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Financial Summary Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Owed</span>
                <span className="text-sm font-bold text-slate-800">
                  ${Number(deliveryNote.amount_owed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Already Paid</span>
                <span className="text-sm font-bold text-emerald-600">
                  ${Number(deliveryNote.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-indigo-50/60 -my-2 -mx-1 py-2 px-1 rounded-lg border border-indigo-100/80">
                <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">Outstanding</span>
                <span className="text-sm font-black text-indigo-700">
                  ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Payment Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-slate-500" /> Payment Amount (USD) *
                </label>
                {outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(outstanding))}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                  >
                    Pay Full (${outstanding.toFixed(2)})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={outstanding}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className={`w-full pl-8 pr-4 py-2.5 text-base font-bold rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                    isOverpaying
                      ? "border-rose-400 focus:ring-rose-200 text-rose-700 bg-rose-50/30"
                      : "border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                  }`}
                  required
                />
              </div>
              {isOverpaying && (
                <p className="text-[11px] text-rose-600 font-medium">
                  Warning: Cannot collect more than the outstanding balance of ${outstanding.toFixed(2)}.
                </p>
              )}
              {numAmount > 0 && !isOverpaying && (
                <p className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
                  <span>Balance after payment:</span>
                  <span className="font-semibold text-slate-700">${remainingAfterThis.toFixed(2)}</span>
                </p>
              )}
            </div>

            {/* Date & Method Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-500" /> Collection Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-slate-500" /> Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  required
                >
                  <option value="CASH">Cash (USD)</option>
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                  <option value="TELEGRAM">Telegram Pay / Bot</option>
                  <option value="CHECK">Check</option>
                  <option value="OTHER">Other / Counter</option>
                </select>
              </div>
            </div>

            {/* Collector Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User size={14} className="text-slate-500" /> Collected By (Staff Name) *
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe / Cashier"
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            {/* Reference Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-500" /> Transaction Ref / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Optional bank ref no, receipt serial, or remarks..."
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverpaying || numAmount <= 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {isSubmitting ? "Recording..." : "Confirm Payment Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
