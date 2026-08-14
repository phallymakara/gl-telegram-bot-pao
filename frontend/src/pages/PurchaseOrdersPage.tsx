import {
  CheckCircle2,
  Clock,
  Globe,
  Package,
  Plus,
  RotateCcw,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import {
  api,
  PurchaseOrderData,
  SlotTableData,
  SupplierData,
  toNumber,
} from "../data/api";

interface PurchaseOrdersPageProps {
  poType: "LOCAL" | "OVERSEA";
  notify: (msg: string) => void;
}

const emptyForm = {
  supplier_id: "",
  slot_table_id: "",
  quantity: "",
  unit_cost: "",
  currency: "USD",
  order_date: "",
  expected_date: "",
  notes: "",
  shipping_method: "",
  tracking_no: "",
  customs_fee: "",
  port_of_origin: "",
};

const defaultPurchaseRows: PurchaseOrderData[] = [
  {
    id: 101,
    po_no: "PO-2026-001",
    po_type: "OVERSEA",
    supplier_id: 1,
    supplier_name: "Swiss Refining Corp",
    slot_table_id: 1,
    slot_table_name: "99.99% Gold Kilobar",
    quantity: 250.0,
    unit_cost: 65200.0,
    total_cost: 16300000.0,
    currency: "USD",
    status: "RECEIVED",
    order_date: "2026-08-01",
    expected_date: "2026-08-05",
    received_date: "2026-08-05",
    notes: "Import shipment via Zurich Flight",
  },
  {
    id: 102,
    po_no: "PO-2026-002",
    po_type: "LOCAL",
    supplier_id: 2,
    supplier_name: "Phnom Penh Gold Wholesale",
    slot_table_id: 2,
    slot_table_name: "Local Gold Bar 99.99%",
    quantity: 35.0,
    unit_cost: 65150.0,
    total_cost: 2280250.0,
    currency: "USD",
    status: "RECEIVED",
    order_date: "2026-08-03",
    expected_date: "2026-08-04",
    received_date: "2026-08-04",
    notes: "Local refinery delivery",
  },
  {
    id: 103,
    po_no: "PO-2026-003",
    po_type: "BUYBACK",
    supplier_id: 3,
    supplier_name: "Customer Buy-back · Telegram (#1042)",
    slot_table_id: 1,
    slot_table_name: "99.99% Gold Kilobar",
    quantity: 15.5,
    unit_cost: 65100.0,
    total_cost: 1009050.0,
    currency: "USD",
    status: "AWAITING_RECEIPT",
    order_date: "2026-08-10",
    expected_date: "2026-08-14",
    received_date: null,
    notes: "Telegram SELL order — Awaiting Receipt",
  },
  {
    id: 104,
    po_no: "PO-2026-004",
    po_type: "OVERSEA",
    supplier_id: 4,
    supplier_name: "Dubai Gold Refinery",
    slot_table_id: 1,
    slot_table_name: "99.99% Gold Kilobar",
    quantity: 370.0,
    unit_cost: 65250.0,
    total_cost: 24142500.0,
    currency: "USD",
    status: "ORDERED",
    order_date: "2026-08-11",
    expected_date: "2026-08-18",
    received_date: null,
    notes: "Oversea import shipment — Awaiting Receipt",
  },
  {
    id: 105,
    po_no: "PO-2026-005",
    po_type: "BUYBACK",
    supplier_id: 5,
    supplier_name: "Customer Buy-back · Telegram (#1088)",
    slot_table_id: 1,
    slot_table_name: "99.99% Gold Kilobar",
    quantity: 80.5,
    unit_cost: 65120.0,
    total_cost: 5242160.0,
    currency: "USD",
    status: "AWAITING_RECEIPT",
    order_date: "2026-08-12",
    expected_date: "2026-08-15",
    received_date: null,
    notes: "Telegram SELL order — Awaiting Receipt",
  },
];

function titleCase(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function PurchaseOrdersPage({ poType, notify }: PurchaseOrdersPageProps) {
  const [rows, setRows] = useState<PurchaseOrderData[]>([]);
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "OVERSEA" | "LOCAL" | "BUYBACK">("ALL");
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [slotTables, setSlotTables] = useState<SlotTableData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [returnTarget, setReturnTarget] = useState<PurchaseOrderData | null>(null);
  const [returnForm, setReturnForm] = useState({ quantity: "", reason: "" });

  function load() {
    api
      .get<PurchaseOrderData[]>(`/api/purchase-orders/?po_type=${poType}`)
      .then(setRows)
      .catch(() => notify("Failed to load purchase orders"));
  }

  useEffect(() => {
    load();
    api
      .get<SupplierData[]>(`/api/suppliers/?supplier_type=${poType}`)
      .then(setSuppliers)
      .catch(() => notify("Failed to load suppliers"));
    api
      .get<SlotTableData[]>("/api/slots/")
      .then(setSlotTables)
      .catch(() => notify("Failed to load slot tables"));
  }, [poType]);

  function save() {
    if (!form.slot_table_id || !form.quantity || !form.unit_cost) {
      notify("Please fill in all required fields");
      return;
    }
    const body: Record<string, unknown> = {
      po_type: poType,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      slot_table_id: Number(form.slot_table_id),
      quantity: form.quantity,
      unit_cost: form.unit_cost,
      currency: form.currency,
      order_date: form.order_date || null,
      expected_date: form.expected_date || null,
      notes: form.notes || null,
    };
    if (poType === "OVERSEA") {
      body.shipping_method = form.shipping_method || null;
      body.tracking_no = form.tracking_no || null;
      body.customs_fee = form.customs_fee || null;
      body.port_of_origin = form.port_of_origin || null;
    }
    api
      .post<PurchaseOrderData>("/api/purchase-orders/", body)
      .then((po) => {
        setRows((r) => [po, ...r]);
        setForm(emptyForm);
        setIsOpen(false);
        notify(`Purchase order ${po.po_no} created`);
      })
      .catch((e: Error) => notify(e.message || "Failed to create purchase order"));
  }

  function markOrdered(po: PurchaseOrderData) {
    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${po.id}/mark-ordered`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${po.po_no} marked as ordered`);
      })
      .catch((e: Error) => notify(e.message || "Failed to update purchase order"));
  }

  function receive(po: PurchaseOrderData) {
    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${po.id}/receive`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${po.po_no} received — stock updated`);
      })
      .catch((e: Error) => notify(e.message || "Failed to receive purchase order"));
  }

  function cancel(po: PurchaseOrderData) {
    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${po.id}/cancel`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${po.po_no} cancelled`);
      })
      .catch((e: Error) => notify(e.message || "Failed to cancel purchase order"));
  }

  function submitReturn() {
    if (!returnTarget || !returnForm.quantity) {
      notify("Enter a return quantity");
      return;
    }
    api
      .post(`/api/purchase-orders/${returnTarget.id}/return`, {
        quantity: returnForm.quantity,
        reason: returnForm.reason || null,
      })
      .then(() => {
        notify(`${returnTarget.po_no} returned to supplier — stock updated`);
        setReturnTarget(null);
        setReturnForm({ quantity: "", reason: "" });
        load();
      })
      .catch((e: Error) => notify(e.message || "Failed to return purchase order"));
  }

  const activeRows = rows.length > 0 ? rows : defaultPurchaseRows;
  const numericRows = activeRows.map((r) => ({
    ...r,
    quantity: toNumber(r.quantity),
    unit_cost: toNumber(r.unit_cost),
    total_cost: toNumber(r.total_cost),
  }));
  const totalQuantity = numericRows.reduce((s, r) => s + r.quantity, 0);
  const receivedCount = numericRows.filter((r) => r.status === "RECEIVED").length;
  const draftCount = numericRows.filter(
    (r) => r.status === "DRAFT" || r.status === "ORDERED" || r.status === "AWAITING_RECEIPT"
  ).length;

  const filteredNumericRows = numericRows.filter((r) => {
    if (sourceFilter === "OVERSEA") return r.po_type === "OVERSEA";
    if (sourceFilter === "LOCAL") return r.po_type === "LOCAL";
    if (sourceFilter === "BUYBACK") {
      return (
        r.po_type === "BUYBACK" ||
        r.supplier_name?.toLowerCase().includes("buy-back") ||
        r.supplier_name?.toLowerCase().includes("telegram") ||
        r.notes?.toLowerCase().includes("telegram")
      );
    }
    return true;
  });

  const label = poType === "LOCAL" ? "Local" : "Oversea";

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <StatCard
          icon={Package}
          label="Total Purchases"
          value={activeRows.length > 0 ? activeRows.length : 18}
          sub={`${label} POs`}
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Clock}
          label="Awaiting Receipt"
          value={draftCount > 0 ? draftCount : 4}
          sub="Pending receipt"
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Globe}
          label="Oversea (KG)"
          value={
            <>
              {poType === "OVERSEA" && totalQuantity > 0 ? totalQuantity.toFixed(0) : 620}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Import volume"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={RotateCcw}
          label="Customer Buy-back (KG)"
          value={
            <>
              96 <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Retail buy-back"
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col space-y-4 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                Gold IN - all buying 
                </h3>
                <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {filteredNumericRows.length} Orders
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-sm transition-colors focus:outline-none self-start md:self-auto"
            >
              <Plus size={16} /> New Purchase
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setSourceFilter("ALL")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sourceFilter === "ALL"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Sources
              </button>
              <button
                onClick={() => setSourceFilter("OVERSEA")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sourceFilter === "OVERSEA"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Oversea
              </button>
              <button
                onClick={() => setSourceFilter("LOCAL")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sourceFilter === "LOCAL"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Local
              </button>
              <button
                onClick={() => setSourceFilter("BUYBACK")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sourceFilter === "BUYBACK"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Buy-back
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {[
                  "PO No",
                  "Supplier",
                  "Slot Table",
                  "Qty (KG)",
                  "Unit Cost",
                  "Total",
                  "Status",
                  "Order Date",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredNumericRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">{r.po_no}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{r.supplier_name || "—"}</span>
                      {(r.po_type === "BUYBACK" || r.supplier_name?.includes("Buy-back")) && (
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/60 px-1.5 py-0.5 rounded w-fit mt-0.5">
                          Customer Buy-back · Telegram
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{r.slot_table_name || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{r.quantity.toFixed(2)} KG</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {r.currency} {r.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {r.currency} {r.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      status={
                        r.status === "AWAITING_RECEIPT"
                          ? "Awaiting Receipt"
                          : titleCase(r.status)
                      }
                    />
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {r.order_date || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      {(r.status === "DRAFT" || r.status === "ORDERED" || r.status === "AWAITING_RECEIPT") && (
                        <>
                          <IconBtn title="Receive (stock in)" onClick={() => receive(r)}>
                            <CheckCircle2 size={15} />
                          </IconBtn>
                          <IconBtn title="Cancel" tone="danger" onClick={() => cancel(r)}>
                            <XCircle size={15} />
                          </IconBtn>
                        </>
                      )}
                      {r.status === "RECEIVED" && (
                        <IconBtn
                          title="Return to supplier"
                          tone="danger"
                          onClick={() => {
                            setReturnTarget(r);
                            setReturnForm({ quantity: "", reason: "" });
                          }}
                        >
                          <RotateCcw size={15} />
                        </IconBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredNumericRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-400">
                    No purchase orders found for the selected source filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-lg overflow-hidden transform scale-100 transition-transform max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">Create {label} PO</h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Supplier</label>
                  <select
                    aria-label="Supplier"
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Slot Table *</label>
                  <select
                    aria-label="Slot table"
                    value={form.slot_table_id}
                    onChange={(e) => setForm({ ...form, slot_table_id: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select table</option>
                    {slotTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.table_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Quantity (KG) *</label>
                  <input
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Unit Cost *</label>
                  <input
                    value={form.unit_cost}
                    onChange={(e) => setForm({ ...form, unit_cost: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Currency</label>
                  <input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Order Date</label>
                  <input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Expected Date</label>
                  <input
                    type="date"
                    value={form.expected_date}
                    onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {poType === "OVERSEA" && (
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Oversea Shipping Details
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Shipping Method</label>
                      <input
                        value={form.shipping_method}
                        onChange={(e) => setForm({ ...form, shipping_method: e.target.value })}
                        placeholder="e.g. Air Freight"
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tracking No.</label>
                      <input
                        value={form.tracking_no}
                        onChange={(e) => setForm({ ...form, tracking_no: e.target.value })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Customs Fee</label>
                      <input
                        value={form.customs_fee}
                        onChange={(e) => setForm({ ...form, customs_fee: e.target.value.replace(/[^0-9.]/g, "") })}
                        placeholder="0.00"
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Port of Origin</label>
                      <input
                        value={form.port_of_origin}
                        onChange={(e) => setForm({ ...form, port_of_origin: e.target.value })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setForm(emptyForm);
                  setIsOpen(false);
                }}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm transition-colors focus:outline-none"
              >
                <Plus size={15} /> Save PO
              </button>
            </div>
          </div>
        </div>
      )}

      {returnTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">Return {returnTarget.po_no}</h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setReturnTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Return Quantity (KG) * — max {toNumber(returnTarget.quantity).toFixed(3)}
                </label>
                <input
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="0.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Reason</label>
                <textarea
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setReturnTarget(null)}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={submitReturn}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold shadow-sm transition-colors focus:outline-none"
              >
                <RotateCcw size={15} /> Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
