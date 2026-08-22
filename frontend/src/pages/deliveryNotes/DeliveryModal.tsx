/**
 * @file DeliveryModal.tsx
 * @description Modal form component for generating Delivery Notes from customer sales orders.
 * Fetches server-calculated formula data for Total Gold Ordered, Delivered So Far, Remaining Qty,
 * and dynamically switches labels and inputs between Outstanding Balance and Outstanding Amount modes.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { X, Search, ChevronDown, Check, AlertCircle } from "lucide-react";
import { deliveryNotesApi, EligibleOrder, PartialDeliveryCalculationResponse } from "../../api";
import { openDeliveryInvoiceInNewTab } from "../../utils/deliveryInvoice";

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notify: (msg: string) => void;
}

export type DoTrackingType = "BALANCE_GOLD" | "AMOUNT_USD";

export default function DeliveryModal({
  isOpen,
  onClose,
  onSuccess,
  notify,
}: DeliveryModalProps) {
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | "">("");
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Search state for Sale Order dropdown
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const orderDropdownRef = useRef<HTMLDivElement>(null);

  // Form states
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [doType, setDoType] = useState<DoTrackingType>("BALANCE_GOLD");

  const [goldQuantity, setGoldQuantity] = useState("");
  const [amountOwed, setAmountOwed] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [courierStatus, setCourierStatus] = useState("Dispatched");
  const [notes, setNotes] = useState("");

  // Server-calculated formula result
  const [calcData, setCalcData] = useState<PartialDeliveryCalculationResponse | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchEligibleOrders();
      resetForm();
    }
  }, [isOpen]);

  // Click outside listener for order search dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(e.target as Node)) {
        setIsOrderDropdownOpen(false);
      }
    }
    if (isOrderDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOrderDropdownOpen]);

  async function fetchEligibleOrders() {
    setLoadingOrders(true);
    try {
      const res = await deliveryNotesApi.getEligibleOrders();
      setEligibleOrders(res || []);
    } catch (err: any) {
      notify("Failed to load eligible sales orders");
    } finally {
      setLoadingOrders(false);
    }
  }

  function resetForm() {
    setSelectedOrderId("");
    setOrderSearchQuery("");
    setIsOrderDropdownOpen(false);
    setRecipientName("");
    setRecipientContact("");
    setDoType("BALANCE_GOLD");
    setGoldQuantity("");
    setAmountOwed("");
    setDeliveryAddress("");
    setDispatchDate(new Date().toISOString().split("T")[0]);
    setCourierStatus("Dispatched");
    setNotes("");
    setCalcData(null);
    setErrorMsg("");
  }

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return eligibleOrders.find((o) => o.id === selectedOrderId) || null;
  }, [selectedOrderId, eligibleOrders]);

  const maxRemainingKg = selectedOrder ? Number(selectedOrder.remaining_quantity ?? selectedOrder.quantity) || 0 : 0;
  const orderTotalKg = calcData ? Number(calcData.total_ordered_quantity) : selectedOrder ? Number(selectedOrder.quantity) || 0 : 0;
  const alreadyDispatchedKg = calcData ? Number(calcData.delivered_so_far_quantity) : selectedOrder ? Number(selectedOrder.dispatched_quantity || 0) : 0;
  const remainingQtyCalculated = calcData
    ? Number(calcData.remaining_quantity_after_dispatch)
    : Math.max(0, maxRemainingKg - (parseFloat(goldQuantity) || 0));

  // Financial calculations
  const unitPrice = selectedOrder && Number(selectedOrder.quantity) > 0
    ? (Number(selectedOrder.total_amount) || 0) / Number(selectedOrder.quantity)
    : 0;
  const orderTotalAmount = selectedOrder ? Number(selectedOrder.total_amount) || 0 : 0;
  const alreadyCollectedAmount = alreadyDispatchedKg * unitPrice;
  const maxRemainingAmount = Math.max(0, orderTotalAmount - alreadyCollectedAmount);
  const remainingAmountCalculated = Math.max(
    0,
    maxRemainingAmount - (parseFloat(amountOwed) || 0)
  );

  // Filter eligible orders by customer name or sale order ID
  const filteredOrders = useMemo(() => {
    const q = orderSearchQuery.toLowerCase().trim();
    if (!q) return eligibleOrders;
    return eligibleOrders.filter((ord) => {
      const matchOrderNo = ord.order_no.toLowerCase().includes(q);
      const matchCustomer = Boolean(ord.customer_name && ord.customer_name.toLowerCase().includes(q));
      return matchOrderNo || matchCustomer;
    });
  }, [eligibleOrders, orderSearchQuery]);

  async function calculateWithBackend(orderId: number, qty: number) {
    try {
      const res = await deliveryNotesApi.calculatePartialDelivery(orderId, qty);
      setCalcData(res);
      if (res.proportional_amount_owed !== undefined) {
        setAmountOwed(String(res.proportional_amount_owed));
      }
      if (!res.is_valid && res.message) {
        setErrorMsg(res.message);
      } else {
        setErrorMsg("");
      }
    } catch (err: any) {
      // Fallback
    }
  }

  function handleSelectOrder(ord: EligibleOrder) {
    setSelectedOrderId(ord.id);
    setOrderSearchQuery(`${ord.order_no} — ${ord.customer_name || "Guest"}`);
    setIsOrderDropdownOpen(false);

    const remainingKg = Number(ord.remaining_quantity ?? ord.quantity) || 0;
    setRecipientName(ord.customer_name || "");
    setGoldQuantity(String(remainingKg));

    // Request backend formula calculation
    calculateWithBackend(ord.id, remainingKg);
    if (errorMsg) setErrorMsg("");
  }

  function handleTypeChange(newType: DoTrackingType) {
    setDoType(newType);
    if (newType === "AMOUNT_USD") {
      setGoldQuantity(String(maxRemainingKg));
      setAmountOwed("");
    } else {
      setAmountOwed("");
      calculateWithBackend(Number(selectedOrderId), parseFloat(goldQuantity) || maxRemainingKg);
    }
  }

  function handleGoldQuantityChange(val: string) {
    setGoldQuantity(val);
    if (!selectedOrderId) return;

    const numQty = parseFloat(val) || 0;
    calculateWithBackend(Number(selectedOrderId), numQty);
  }

  function handleAmountOwedChange(val: string) {
    setAmountOwed(val);
    // In Outstanding Amount mode, do not shrink gold quantity.
    // Gold delivery delivers the full remaining gold, while tracking the customer payment collection.
  }

  function handleClearSelectedOrder() {
    setSelectedOrderId("");
    setOrderSearchQuery("");
    setRecipientName("");
    setRecipientContact("");
    setGoldQuantity("");
    setAmountOwed("");
    setCalcData(null);
    setIsOrderDropdownOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrderId) {
      setErrorMsg("Please select a sales order.");
      return;
    }

    const isAmountMode = doType === "AMOUNT_USD";
    const numQty = parseFloat(goldQuantity) || 0;

    if (!isAmountMode && numQty <= 0) {
      setErrorMsg("Please enter a valid quantity to deliver greater than zero.");
      return;
    }

    if (!isAmountMode && selectedOrder && numQty > maxRemainingKg + 0.0001) {
      setErrorMsg(`Cannot dispatch ${numQty.toFixed(3)} KG. Only ${maxRemainingKg.toFixed(3)} KG remaining to deliver on order ${selectedOrder.order_no}.`);
      return;
    }

    const collectionAmount = isAmountMode && amountOwed ? parseFloat(amountOwed) : undefined;
    if (isAmountMode && (collectionAmount === undefined || collectionAmount <= 0)) {
      setErrorMsg("Please enter a valid collection amount greater than zero.");
      return;
    }

    if (!recipientName.trim()) {
      setErrorMsg("Please provide a Recipient Name.");
      return;
    }

    if (!recipientContact.trim()) {
      setErrorMsg("Please provide Recipient Contact (Phone or Email).");
      return;
    }

    if (!deliveryAddress.trim()) {
      setErrorMsg("Please enter the Delivery Address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const deliveredGoldQty = isAmountMode ? maxRemainingKg : numQty;
    const orderPortionOwed = isAmountMode ? maxRemainingAmount : (calcData?.proportional_amount_owed ?? undefined);

    try {
      const res = await deliveryNotesApi.createDeliveryNote({
        order_id: Number(selectedOrderId),
        recipient_name: recipientName.trim(),
        delivery_address: deliveryAddress.trim(),
        gold_quantity: deliveredGoldQty,
        amount_owed: orderPortionOwed,
        collected_amount: collectionAmount,
        driver_contact: recipientContact.trim() || undefined,
        dispatch_date: dispatchDate || undefined,
        courier_status: courierStatus,
        notes: notes.trim() || undefined,
      });

      notify(`Delivery Note ${res.delivery_no} generated successfully!`);
      openDeliveryInvoiceInNewTab(res);
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to create delivery note";
      setErrorMsg(detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Delivery Note
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Searchable Sales Order Picker */}
            <div className="space-y-1.5" ref={orderDropdownRef}>
              <label className="text-xs font-semibold text-slate-700 block">
                Select Sale Order *
              </label>

              {loadingOrders ? (
                <div className="py-2 px-3 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
                  Loading sales orders...
                </div>
              ) : eligibleOrders.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No unassigned completed sales orders available for dispatch.
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by customer name or sale ID"
                      value={orderSearchQuery}
                      onFocus={() => setIsOrderDropdownOpen(true)}
                      onChange={(e) => {
                        setOrderSearchQuery(e.target.value);
                        setIsOrderDropdownOpen(true);
                      }}
                      className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-800"
                    />
                    {selectedOrderId ? (
                      <button
                        type="button"
                        onClick={handleClearSelectedOrder}
                        className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                        title="Clear selection"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                    )}
                  </div>

                  {/* Dropdown Options List */}
                  {isOrderDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100">
                      {filteredOrders.length === 0 ? (
                        <div className="p-3.5 text-center text-xs text-slate-400 italic">
                          No matching sale orders found
                        </div>
                      ) : (
                        filteredOrders.map((ord) => {
                          const isSelected = ord.id === selectedOrderId;
                          const remKg = Number(ord.remaining_quantity ?? ord.quantity) || 0;
                          const totalKg = Number(ord.quantity) || 0;
                          const isPartial = remKg < totalKg;

                          return (
                            <button
                              key={ord.id}
                              type="button"
                              onClick={() => handleSelectOrder(ord)}
                              className={`w-full p-2.5 text-left hover:bg-indigo-50/70 transition-colors flex items-center justify-between group cursor-pointer ${
                                isSelected ? "bg-indigo-50/90" : ""
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-slate-800 group-hover:text-indigo-700">
                                    {ord.order_no}
                                  </span>
                                  {isPartial ? (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                      Partially Delivered
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {ord.status}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 font-medium truncate mt-0.5">
                                  Customer: {ord.customer_name || "Guest"}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-bold text-xs text-slate-800 block">
                                  {remKg.toFixed(3)} KG <span className="text-[10px] font-normal text-slate-400">left</span>
                                </span>
                                {ord.total_amount && (
                                  <span className="text-[11px] font-semibold text-emerald-600 block">
                                    ${Number(ord.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>

                              {isSelected && (
                                <Check size={15} className="text-indigo-600 ml-2 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recipient Name & Recipient Contact Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  placeholder="input Recipient Name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Recipient Contact *
                </label>
                <input
                  type="text"
                  placeholder="Phone or Email"
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Partial Type Dropdown Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Partial Type *
              </label>
              <select
                value={doType}
                onChange={(e) => handleTypeChange(e.target.value as DoTrackingType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-800"
                required
              >
                <option value="BALANCE_GOLD">Outstanding Balance</option>
                <option value="AMOUNT_USD">Outstanding Amount</option>
              </select>
            </div>

            {/* Dynamic Breakdown Row: Changes labels based on Partial Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 block">
                  {doType === "BALANCE_GOLD" ? "Total Gold Ordered (qty)" : "Total Amount"}
                </span>
                <div className="text-sm font-bold text-slate-800 py-1.5">
                  {doType === "BALANCE_GOLD"
                    ? selectedOrder ? `${orderTotalKg.toFixed(3)} KG` : "0.000 KG"
                    : `$${orderTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 block">
                  {doType === "BALANCE_GOLD" ? "Delivered So Far (qty)" : "Collected Amount"}
                </span>
                <div className="text-sm font-bold text-indigo-700 py-1.5">
                  {doType === "BALANCE_GOLD"
                    ? selectedOrder ? `${alreadyDispatchedKg.toFixed(3)} KG` : "0.000 KG"
                    : `$${alreadyCollectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                </div>
              </div>
            </div>

            {/* Dynamic Quantity to Deliver / Collection Amount & Remaining Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  {doType === "BALANCE_GOLD" ? "Quantity to Deliver (KG) *" : "Collection Amount *"}
                </label>
                {doType === "BALANCE_GOLD" ? (
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={maxRemainingKg > 0 ? maxRemainingKg : undefined}
                    placeholder="1.000"
                    value={goldQuantity}
                    onChange={(e) => handleGoldQuantityChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-800"
                    required
                  />
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxRemainingAmount > 0 ? maxRemainingAmount : undefined}
                    placeholder="0.00"
                    value={amountOwed}
                    onChange={(e) => handleAmountOwedChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-800"
                    required
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  {doType === "BALANCE_GOLD" ? "Remaining Qty (Calculated)" : "Total Remaining Amount"}
                </label>
                <div className="text-sm font-bold text-indigo-900 py-2">
                  {doType === "BALANCE_GOLD"
                    ? `${remainingQtyCalculated.toFixed(3)} KG`
                    : `$${remainingAmountCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Delivery Address *
              </label>
              <textarea
                rows={2}
                placeholder="Full street address, district, city..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                required
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Optional"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              disabled={isSubmitting || !selectedOrderId}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              {isSubmitting ? "Generating..." : "Generate Delivery Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
