import React, { useState } from "react";
import {
  FileCheck,
  Plus,
  Search,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil
} from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import IconBtn from "../components/IconBtn";

interface GoodsReceiptItem {
  id: number;
  receipt_no: string;
  po_no: string;
  supplier: string;
  quantity_kg: number;
  received_date: string;
  status: "Verified" | "Pending" | "Completed";
  notes?: string;
}

interface GoodsReceiptPageProps {
  notify: (msg: string) => void;
}

const INITIAL_RECEIPTS: GoodsReceiptItem[] = [
  {
    id: 1,
    receipt_no: "GR-2025-001",
    po_no: "PO-LOCAL-101",
    supplier: "Phnom Penh Precious Metals",
    quantity_kg: 25.0,
    received_date: "2025-08-12",
    status: "Completed",
    notes: "Vault delivery verified & sealed"
  },
  {
    id: 2,
    receipt_no: "GR-2025-002",
    po_no: "PO-OVERSEA-089",
    supplier: "Singapore Bullion Vault",
    quantity_kg: 50.0,
    received_date: "2025-08-13",
    status: "Verified",
    notes: "Air freight cargo cleared"
  },
  {
    id: 3,
    receipt_no: "GR-2025-003",
    po_no: "PO-LOCAL-104",
    supplier: "Royal Gold Refinery",
    quantity_kg: 15.5,
    received_date: "2025-08-13",
    status: "Pending",
    notes: "Awaiting purity assay check"
  }
];

export default function GoodsReceiptPage({ notify }: GoodsReceiptPageProps) {
  const [receipts, setReceipts] = useState<GoodsReceiptItem[]>(INITIAL_RECEIPTS);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    po_no: "",
    supplier: "",
    quantity_kg: "",
    received_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const filtered = receipts.filter(
    (r) =>
      r.receipt_no.toLowerCase().includes(search.toLowerCase()) ||
      r.po_no.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier.toLowerCase().includes(search.toLowerCase())
  );

  const totalKg = receipts.reduce((sum, r) => sum + r.quantity_kg, 0);
  const pendingCount = receipts.filter((r) => r.status === "Pending").length;

  function createReceipt() {
    if (!form.po_no || !form.supplier || !form.quantity_kg) {
      notify("Please fill in PO No, Supplier, and Quantity");
      return;
    }
    const newReceipt: GoodsReceiptItem = {
      id: Date.now(),
      receipt_no: `GR-${new Date().getFullYear()}-${String(receipts.length + 1).padStart(3, "0")}`,
      po_no: form.po_no,
      supplier: form.supplier,
      quantity_kg: parseFloat(form.quantity_kg) || 0,
      received_date: form.received_date || new Date().toISOString().split("T")[0],
      status: "Verified",
      notes: form.notes
    };
    setReceipts([newReceipt, ...receipts]);
    setIsOpen(false);
    setForm({
      po_no: "",
      supplier: "",
      quantity_kg: "",
      received_date: new Date().toISOString().split("T")[0],
      notes: ""
    });
    notify(`Goods Receipt ${newReceipt.receipt_no} created successfully!`);
  }

  function deleteReceipt(id: number) {
    setReceipts(receipts.filter((r) => r.id !== id));
    notify("Receipt removed");
  }

  return (
    <div className="flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto w-full flex flex-col space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={PackageCheck}
          label="Total Gold Received"
          value={
            <>
              {totalKg.toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="All logged receipts"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Truck}
          label="Goods Receipts Count"
          value={receipts.length}
          sub="Total shipments received"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Clock}
          label="Pending Inspections"
          value={pendingCount}
          sub="Awaiting verification"
          tint="bg-amber-50 text-amber-600"
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 w-full sm:w-auto max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by Receipt No, PO No, or Supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} /> New Goods Receipt
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                <th className="pb-3 pt-2 px-3 font-medium">Receipt No</th>
                <th className="pb-3 pt-2 px-3 font-medium">PO Reference</th>
                <th className="pb-3 pt-2 px-3 font-medium">Supplier</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Quantity (KG)</th>
                <th className="pb-3 pt-2 px-3 font-medium">Received Date</th>
                <th className="pb-3 pt-2 px-3 font-medium">Status</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                    No goods receipts found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-semibold text-indigo-600">{r.receipt_no}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{r.po_no}</td>
                    <td className="py-3 px-3 text-slate-600">{r.supplier}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {r.quantity_kg.toFixed(2)} KG
                    </td>
                    <td className="py-3 px-3 text-slate-500">{r.received_date}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => deleteReceipt(r.id)}
                        className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                        title="Delete receipt"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                <FileCheck size={18} className="text-indigo-600" /> Create Goods Receipt
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  PO Reference No *
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-LOCAL-105"
                  value={form.po_no}
                  onChange={(e) => setForm({ ...form, po_no: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  placeholder="Supplier or Refinery Name"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Quantity (KG) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={form.quantity_kg}
                    onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Received Date
                  </label>
                  <input
                    type="date"
                    value={form.received_date}
                    onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Inspection / Delivery Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional delivery details..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createReceipt}
                className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Save Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
