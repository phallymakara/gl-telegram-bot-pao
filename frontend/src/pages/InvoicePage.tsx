import React, { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  Printer,
  Trash2,
  Download
} from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

interface InvoiceItem {
  id: number;
  invoice_no: string;
  order_no: string;
  customer: string;
  amount_usd: number;
  gold_qty_kg: number;
  invoice_date: string;
  due_date: string;
  status: "Paid" | "Pending" | "Overdue";
}

interface InvoicePageProps {
  notify: (msg: string) => void;
}

const INITIAL_INVOICES: InvoiceItem[] = [
  {
    id: 1,
    invoice_no: "INV-2025-001",
    order_no: "ORD-9901",
    customer: "Precious Metals Trader Co.",
    amount_usd: 87500.0,
    gold_qty_kg: 1.0,
    invoice_date: "2025-08-10",
    due_date: "2025-08-17",
    status: "Paid"
  },
  {
    id: 2,
    invoice_no: "INV-2025-002",
    order_no: "ORD-9904",
    customer: "Golden Lion Exchange",
    amount_usd: 262500.0,
    gold_qty_kg: 3.0,
    invoice_date: "2025-08-12",
    due_date: "2025-08-19",
    status: "Pending"
  },
  {
    id: 3,
    invoice_no: "INV-2025-003",
    order_no: "ORD-9889",
    customer: "Khmer Jewelers Association",
    amount_usd: 175000.0,
    gold_qty_kg: 2.0,
    invoice_date: "2025-08-05",
    due_date: "2025-08-12",
    status: "Overdue"
  }
];

export default function InvoicePage({ notify }: InvoicePageProps) {
  const [invoices, setInvoices] = useState<InvoiceItem[]>(INITIAL_INVOICES);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    order_no: "",
    customer: "",
    amount_usd: "",
    gold_qty_kg: "",
    due_date: ""
  });

  const filtered = invoices.filter(
    (inv) =>
      inv.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      inv.order_no.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount_usd, 0);
  const paidRevenue = invoices
    .filter((i) => i.status === "Paid")
    .reduce((sum, inv) => sum + inv.amount_usd, 0);
  const pendingRevenue = invoices
    .filter((i) => i.status !== "Paid")
    .reduce((sum, inv) => sum + inv.amount_usd, 0);

  function createInvoice() {
    if (!form.customer || !form.amount_usd || !form.gold_qty_kg) {
      notify("Please fill in Customer, Amount, and Gold Quantity");
      return;
    }
    const newInvoice: InvoiceItem = {
      id: Date.now(),
      invoice_no: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
      order_no: form.order_no || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: form.customer,
      amount_usd: parseFloat(form.amount_usd) || 0,
      gold_qty_kg: parseFloat(form.gold_qty_kg) || 0,
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: form.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      status: "Pending"
    };
    setInvoices([newInvoice, ...invoices]);
    setIsOpen(false);
    setForm({
      order_no: "",
      customer: "",
      amount_usd: "",
      gold_qty_kg: "",
      due_date: ""
    });
    notify(`Invoice ${newInvoice.invoice_no} issued successfully!`);
  }

  function deleteInvoice(id: number) {
    setInvoices(invoices.filter((i) => i.id !== id));
    notify("Invoice deleted");
  }

  return (
    <div className="flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto w-full flex flex-col space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Invoiced"
          value={`$${totalRevenue.toLocaleString()}`}
          sub="All issued sales invoices"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Paid Total"
          value={`$${paidRevenue.toLocaleString()}`}
          sub="Settled payments"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="Pending / Unpaid"
          value={`$${pendingRevenue.toLocaleString()}`}
          sub="Awaiting settlement"
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
              placeholder="Search by Invoice No, Order No, or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} /> Issue Invoice
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                <th className="pb-3 pt-2 px-3 font-medium">Invoice No</th>
                <th className="pb-3 pt-2 px-3 font-medium">Order Ref</th>
                <th className="pb-3 pt-2 px-3 font-medium">Customer</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Gold Qty</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Total Amount ($)</th>
                <th className="pb-3 pt-2 px-3 font-medium">Due Date</th>
                <th className="pb-3 pt-2 px-3 font-medium">Status</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-sm">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-semibold text-indigo-600">{inv.invoice_no}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{inv.order_no}</td>
                    <td className="py-3 px-3 text-slate-600">{inv.customer}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800">
                      {inv.gold_qty_kg.toFixed(2)} KG
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ${inv.amount_usd.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{inv.due_date}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => notify(`Downloading ${inv.invoice_no}...`)}
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => deleteInvoice(inv.id)}
                        className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                        title="Delete invoice"
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
                <FileText size={18} className="text-indigo-600" /> Create Sales Invoice
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
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Phnom Penh Gold Exchange"
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Order Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. ORD-9905 (Optional)"
                  value={form.order_no}
                  onChange={(e) => setForm({ ...form, order_no: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Gold Quantity (KG) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={form.gold_qty_kg}
                    onChange={(e) => setForm({ ...form, gold_qty_kg: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Total Amount ($) *
                  </label>
                  <input
                    type="number"
                    placeholder="87500"
                    value={form.amount_usd}
                    onChange={(e) => setForm({ ...form, amount_usd: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
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
                onClick={createInvoice}
                className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
