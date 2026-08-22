/**
 * @file DeliveryDetailModal.tsx
 * @description Sleek, high-end ERP modal displaying Delivery Note details, delivery quantity breakdowns,
 * real-time payment settlement progress, and full audit logs.
 */

import { useState, useEffect } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  DollarSign,
  Package,
  MapPin,
  Phone,
  Calendar,
  User,
  Plus,
  FileCheck,
  Printer,
  FileText,
  Building2,
  Truck,
  Receipt,
} from "lucide-react";
import { deliveryNotesApi, DeliveryNoteDetailItem } from "../../api";
import StatusBadge from "../../components/StatusBadge";
import { openDeliveryInvoiceInNewTab, printDeliveryInvoiceDirectly } from "../../utils/deliveryInvoice";

interface DeliveryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryNoteId: number | null;
  onOpenPaymentModal: (item: DeliveryNoteDetailItem) => void;
  notify: (msg: string) => void;
}

export default function DeliveryDetailModal({
  isOpen,
  onClose,
  deliveryNoteId,
  onOpenPaymentModal,
  notify,
}: DeliveryDetailModalProps) {
  const [detail, setDetail] = useState<DeliveryNoteDetailItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && deliveryNoteId) {
      fetchDetail();
    } else {
      setDetail(null);
    }
  }, [isOpen, deliveryNoteId]);

  async function fetchDetail() {
    if (!deliveryNoteId) return;
    setLoading(true);
    try {
      const res = await deliveryNotesApi.getDeliveryNote(deliveryNoteId);
      setDetail(res);
    } catch (err: any) {
      notify("Failed to load delivery note details");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const totalOwed = detail ? Number(detail.amount_owed) || 0 : 0;
  const totalPaid = detail ? Number(detail.amount_paid) || 0 : 0;
  const outstanding = detail ? Number(detail.outstanding_balance) || 0 : 0;
  const percentPaid = totalOwed > 0 ? Math.min(100, (totalPaid / totalOwed) * 100) : 0;

  const deliveredGold = detail ? Number(detail.gold_quantity) || 0 : 0;
  const orderTotalGold = detail ? Number(detail.order_quantity) || deliveredGold : 0;
  const remainingGold = Math.max(0, orderTotalGold - deliveredGold);
  const isOrderFullyDelivered = remainingGold <= 0.0001;

  function renderPaymentBadge(status: string) {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} /> Fully Paid
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={13} /> Partially Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} /> Waiting for Payment
          </span>
        );
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-bold text-slate-800 text-lg">
                {detail?.delivery_no || "Delivery Note"}
              </h3>
              {detail && renderPaymentBadge(detail.payment_status)}
              {detail && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isOrderFullyDelivered
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {isOrderFullyDelivered
                    ? "✓ Fully Delivered"
                    : `⏳ Partial DO (${deliveredGold.toFixed(3)} / ${orderTotalGold.toFixed(3)} KG)`}
                </span>
              )}
            </div>
            {detail && (
              <p className="text-xs text-slate-500 mt-1">
                Sales Order Ref:{" "}
                <span className="font-mono font-bold text-slate-700 bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px]">
                  {detail.order_no}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {detail && (
              <>
                <button
                  type="button"
                  onClick={() => openDeliveryInvoiceInNewTab(detail)}
                  title="View A5 Invoice in New Tab"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                >
                  <FileText size={14} /> View Invoice
                </button>
                <button
                  type="button"
                  onClick={() => printDeliveryInvoiceDirectly(detail)}
                  title="Print A5 Delivery Invoice"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                >
                  <Printer size={14} /> Print A5
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors ml-1 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading delivery record details...
          </div>
        ) : !detail ? (
          <div className="p-16 text-center text-slate-400 text-sm">No record found.</div>
        ) : (
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Delivery & Recipient Info Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Recipient & Destination */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <Building2 size={15} className="text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Recipient & Customer
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500 font-medium">Recipient:</span>
                    <span className="font-bold text-slate-900 text-sm">{detail.recipient_name}</span>
                  </div>
                  {detail.customer_name && detail.customer_name !== detail.recipient_name && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-slate-500 font-medium">Customer Account:</span>
                      <span className="font-semibold text-slate-700">{detail.customer_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Contact:</span>
                    <span className="font-semibold text-indigo-700 flex items-center gap-1">
                      <Phone size={12} className="text-indigo-500" />
                      {detail.driver_contact || "—"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between pt-1 border-t border-slate-200/40">
                    <span className="text-slate-500 font-medium shrink-0 mr-2 flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400" /> Address:
                    </span>
                    <span className="text-slate-700 text-right font-medium">{detail.delivery_address}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Goods & Delivery Breakdown */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <Package size={15} className="text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Gold Delivery Breakdown
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500 font-medium">Dispatched in this DO:</span>
                    <span className="font-extrabold text-indigo-700 text-base">
                      {deliveredGold.toFixed(3)} KG
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Order Total: <b>{orderTotalGold.toFixed(3)} KG</b></span>
                    <span>Remaining: <b className={remainingGold > 0 ? "text-amber-700" : "text-emerald-700"}>{remainingGold.toFixed(3)} KG</b></span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/40">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Truck size={12} className="text-slate-400" /> Courier:
                    </span>
                    <StatusBadge status={detail.courier_status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" /> Dispatch Date:
                    </span>
                    <span className="font-semibold text-slate-700">{detail.dispatch_date || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Progress Banner */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={14} className="text-indigo-600" />
                  Payment Collection Status
                </span>
                <span className="text-xs font-bold text-slate-700">{percentPaid.toFixed(0)}% Collected</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    percentPaid >= 100 ? "bg-emerald-500" : percentPaid > 0 ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                  style={{ width: `${percentPaid}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Owed</span>
                  <span className="text-sm font-bold text-slate-800">
                    ${totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">Total Collected</span>
                  <span className="text-sm font-bold text-emerald-700">
                    ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-lg border ${
                    outstanding > 0 ? "bg-amber-50/70 border-amber-200" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold block mb-0.5 ${
                      outstanding > 0 ? "text-amber-700" : "text-slate-400"
                    }`}
                  >
                    Outstanding
                  </span>
                  <span
                    className={`text-sm font-black ${
                      outstanding > 0 ? "text-amber-800" : "text-slate-700"
                    }`}
                  >
                    ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History Log */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={15} className="text-slate-500" />
                  Payment Collection History ({detail.payments?.length || 0})
                </h4>
                {outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPaymentModal(detail);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus size={14} /> Record Payment
                  </button>
                )}
              </div>

              {!detail.payments || detail.payments.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                  <FileCheck size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No payments recorded yet</p>
                  <p className="text-[11px] text-slate-400">
                    Use the "Record Payment" button to log customer payment collections.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Collected By</th>
                        <th className="py-2.5 px-3">Reference / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {p.payment_date}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600 whitespace-nowrap">
                            +${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              {p.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{p.collected_by}</td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{p.reference_note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            {detail?.created_at && `Issued on ${new Date(detail.created_at).toLocaleDateString()}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
