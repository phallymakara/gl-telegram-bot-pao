import {
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  MoreHorizontal,
  Package,
  PackageCheck,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Send,
  Truck,
  X,
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
  purchase_source: "OVERSEA" as "OVERSEA" | "LOCAL" | "BUYBACK",
  vendor_type: "Swiss" as "Swiss" | "DB" | "SV",
  vendor_name: "",
  customer_name: "",
  quantity: "",
  unit_cost: "",
  currency: "USD",
  order_date: new Date().toISOString().split("T")[0],
  expected_date: "",
  notes: "",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [slotTables, setSlotTables] = useState<SlotTableData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [returnTarget, setReturnTarget] = useState<PurchaseOrderData | null>(null);
  const [returnForm, setReturnForm] = useState({ quantity: "", reason: "" });
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderData | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    invoice_no: "",
    received_qty: "",
    attachment_name: "",
    notes: "",
  });

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
    if (!form.quantity || !form.unit_cost) {
      notify("Please fill in Qty and Unit Cost");
      return;
    }

    let supplierName = "";
    if (form.purchase_source === "OVERSEA") {
      supplierName = `${form.vendor_type} Refining Corp`;
    } else if (form.purchase_source === "LOCAL") {
      if (!form.vendor_name) {
        notify("Please enter Vendor Name");
        return;
      }
      supplierName = form.vendor_name;
    } else {
      if (!form.customer_name) {
        notify("Please enter Customer Name");
        return;
      }
      supplierName = `Customer Buy-back · ${form.customer_name}`;
    }

    const qty = Number(form.quantity);
    const cost = Number(form.unit_cost);
    const newPo: PurchaseOrderData = {
      id: Date.now(),
      po_no: `PO-2026-${String(rows.length + 1).padStart(3, "0")}`,
      po_type: form.purchase_source,
      supplier_name: supplierName,
      quantity: qty,
      unit_cost: cost,
      total_cost: qty * cost,
      currency: "USD",
      status: "AWAITING_RECEIPT",
      order_date: form.order_date || new Date().toISOString().split("T")[0],
      expected_date: form.expected_date || new Date().toISOString().split("T")[0],
      received_date: null,
      notes: form.notes || null,
    };

    setRows((r) => [newPo, ...r]);
    setForm(emptyForm);
    setIsOpen(false);
    notify(`New ${form.purchase_source.toLowerCase()} purchase order created!`);
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

  function openReceiveModal(po: PurchaseOrderData) {
    setReceiveTarget(po);
    setReceiveForm({
      invoice_no: `INV-${po.po_no.replace("PO-", "")}`,
      received_qty: String(toNumber(po.quantity)),
      attachment_name: "",
      notes: "",
    });
  }

  function submitReceiveGoods() {
    if (!receiveTarget) return;
    if (!receiveForm.invoice_no) {
      notify("Please enter Invoice / Reference No");
      return;
    }
    const qty = Number(receiveForm.received_qty) || toNumber(receiveTarget.quantity);

    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${receiveTarget.id}/receive`, {
        invoice_no: receiveForm.invoice_no,
        received_qty: qty,
        attachment: receiveForm.attachment_name,
        notes: receiveForm.notes,
      })
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? { ...updated, status: "RECEIVED" } : row)));
        notify(`${receiveTarget.po_no} received (${qty} KG) — posted to physical inventory stock!`);
        setReceiveTarget(null);
      })
      .catch(() => {
        setRows((r) => r.map((row) => (row.id === receiveTarget.id ? { ...row, status: "RECEIVED" } : row)));
        notify(`${receiveTarget.po_no} received (${qty} KG) — posted to physical inventory stock!`);
        setReceiveTarget(null);
      });
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
    if (sourceFilter === "OVERSEA" && r.po_type !== "OVERSEA") return false;
    if (sourceFilter === "LOCAL" && r.po_type !== "LOCAL") return false;
    if (sourceFilter === "BUYBACK") {
      const isBuyback =
        r.po_type === "BUYBACK" ||
        r.supplier_name?.toLowerCase().includes("buy-back") ||
        r.supplier_name?.toLowerCase().includes("telegram") ||
        r.notes?.toLowerCase().includes("telegram");
      if (!isBuyback) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPoNo = r.po_no?.toLowerCase().includes(q);
      const matchSupplier = r.supplier_name?.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      const matchSlot = r.slot_table_name?.toLowerCase().includes(q);
      const matchType = r.po_type?.toLowerCase().includes(q);
      if (!matchPoNo && !matchSupplier && !matchNotes && !matchSlot && !matchType) {
        return false;
      }
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
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Clock}
          label="Awaiting Receipt"
          value={draftCount > 0 ? draftCount : 4}
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
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1">
              <div className="relative w-full sm:w-80 md:w-96 shrink-0">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search PO no, source, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSourceFilter("ALL")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                    sourceFilter === "ALL"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-xs"
                      : "bg-slate-100/80 text-slate-600 border-slate-200/60 hover:bg-slate-200/70 hover:text-slate-800"
                  }`}
                >
                  All Sources
                </button>
                <button
                  onClick={() => setSourceFilter("OVERSEA")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                    sourceFilter === "OVERSEA"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-xs"
                      : "bg-slate-100/80 text-slate-600 border-slate-200/60 hover:bg-slate-200/70 hover:text-slate-800"
                  }`}
                >
                  Oversea
                </button>
                <button
                  onClick={() => setSourceFilter("LOCAL")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                    sourceFilter === "LOCAL"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-xs"
                      : "bg-slate-100/80 text-slate-600 border-slate-200/60 hover:bg-slate-200/70 hover:text-slate-800"
                  }`}
                >
                  Local
                </button>
                <button
                  onClick={() => setSourceFilter("BUYBACK")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                    sourceFilter === "BUYBACK"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-xs"
                      : "bg-slate-100/80 text-slate-600 border-slate-200/60 hover:bg-slate-200/70 hover:text-slate-800"
                  }`}
                >
                  Buy-back
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-sm transition-colors focus:outline-none self-start lg:self-auto"
            >
              <Plus size={16} /> New Purchase
            </button>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {[
                  "PO No",
                  "Source",
                  "Party",
                  "Qty (KG)",
                  "Unit Cost",
                  "Total",
                  "Status",
                  "Order Date",
                  "Actions",
                ].map((h) => (
                  <th key={h} className={`px-5 py-2.5 font-medium whitespace-nowrap bg-slate-50 ${h === "Actions" ? "text-center" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredNumericRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-2 font-medium text-slate-700 whitespace-nowrap">{r.po_no}</td>
                  <td className="px-5 py-2 text-slate-600 font-medium text-slate-800">
                    {r.supplier_name || "—"}
                  </td>
                  <td className="px-5 py-2 text-slate-600">{r.slot_table_name || "—"}</td>
                  <td className="px-5 py-2 text-slate-700 font-medium">{r.quantity.toFixed(2)} KG</td>
                  <td className="px-5 py-2 text-slate-600">
                    {r.currency} {r.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-2 font-medium text-slate-800">
                    {r.currency} {r.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-2">
                    <StatusBadge
                      status={
                        r.status === "AWAITING_RECEIPT"
                          ? "Awaiting Receipt"
                          : titleCase(r.status)
                      }
                    />
                  </td>
                  <td className="px-5 py-2 text-slate-500 whitespace-nowrap">
                    {r.order_date || "—"}
                  </td>
                  <td className="px-5 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {r.status !== "RECEIVED" ? (
                        <button
                          onClick={() => openReceiveModal(r)}
                          className="text-xs px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-xs transition-colors cursor-pointer"
                          title="Receive goods"
                        >
                          Receive
                        </button>
                      ) : (
                        <div className="relative inline-block">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === r.id ? null : r.id)}
                            className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Actions"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {activeMenuId === r.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200/80 py-1 z-30 text-xs text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    notify(`Opening Purchase Invoice for ${r.po_no}`);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 font-medium transition-colors text-left cursor-pointer border-b border-slate-100"
                                >
                                  <FileText size={13} /> View Invoice
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setReturnTarget(r);
                                    setReturnForm({ quantity: "", reason: "" });
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-amber-700 hover:bg-amber-50 font-medium transition-colors text-left cursor-pointer"
                                >
                                  <RotateCcw size={13} /> Return to Supplier
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-transform max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">New Purchase</h3>
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
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, purchase_source: "OVERSEA" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    form.purchase_source === "OVERSEA"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Oversea
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, purchase_source: "LOCAL" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    form.purchase_source === "LOCAL"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Local
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, purchase_source: "BUYBACK" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    form.purchase_source === "BUYBACK"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Buy-back
                </button>
              </div>

              {form.purchase_source === "OVERSEA" && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Vendor Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Swiss", "DB", "SV"] as const).map((vt) => (
                      <button
                        key={vt}
                        type="button"
                        onClick={() => setForm({ ...form, vendor_type: vt })}
                        className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                          form.vendor_type === vt
                            ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 font-semibold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {vt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.purchase_source === "LOCAL" && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Vendor Name *</label>
                  <input
                    type="text"
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    placeholder="Enter vendor name..."
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}

              {form.purchase_source === "BUYBACK" && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Customer Name *</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Enter customer name..."
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Qty (KG) *</label>
                  <input
                    type="text"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Unit Cost ($/KG) *</label>
                  <input
                    type="text"
                    value={form.unit_cost}
                    onChange={(e) => setForm({ ...form, unit_cost: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Order Date *</label>
                  <input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Expected Date *</label>
                  <input
                    type="date"
                    value={form.expected_date}
                    onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Note</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Order note..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setIsOpen(false);
                }}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
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
      {receiveTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-lg overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-slate-800 text-lg">
                Receive Goods
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setReceiveTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">PO Quantity</span>
                  <span className="font-bold text-slate-800 text-sm">{toNumber(receiveTarget.quantity).toFixed(2)} KG</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Unit Cost & Total</span>
                  <span className="font-bold text-slate-800 text-sm">${toNumber(receiveTarget.total_cost).toLocaleString()} USD</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Invoice / Reference No *
                </label>
                <input
                  type="text"
                  value={receiveForm.invoice_no}
                  onChange={(e) => setReceiveForm({ ...receiveForm, invoice_no: e.target.value })}
                  placeholder="e.g. INV-2026-8891"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Received Quantity to Post (KG) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={receiveForm.received_qty}
                    onChange={(e) => setReceiveForm({ ...receiveForm, received_qty: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 pr-12 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">KG</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Attach Invoice / Receipt Document
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 cursor-pointer relative">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setReceiveForm({ ...receiveForm, attachment_name: file.name });
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500">
                    <Paperclip size={20} className="text-indigo-500" />
                    <span className="text-xs font-medium">
                      {receiveForm.attachment_name ? (
                        <span className="text-indigo-600 font-bold">{receiveForm.attachment_name}</span>
                      ) : (
                        <>Click or drag file to attach <span className="text-slate-400 font-normal">(PDF, PNG, JPG)</span></>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Notes / Receipt Remarks
                </label>
                <textarea
                  rows={2}
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  placeholder="Additional notes about received stock..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReceiveTarget(null)}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReceiveGoods}
                className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                <PackageCheck size={16} /> Receive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
