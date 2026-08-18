/**
 * @file InvoiceTable.tsx
 * @description Sub-component rendering the customer invoices list table view.
 */

import { FileText, Plus, Search, Trash2 } from "lucide-react";
import Card from "../../components/Card";
import IconBtn from "../../components/IconBtn";
import StatusBadge from "../../components/StatusBadge";

export interface InvoiceItem {
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

interface InvoiceTableProps {
  invoices: InvoiceItem[];
  search: string;
  setSearch: (val: string) => void;
  openModal: () => void;
  deleteInvoice: (id: number) => void;
}

/**
 * Customer invoices table component.
 */
export default function InvoiceTable({
  invoices,
  search,
  setSearch,
  openModal,
  deleteInvoice,
}: InvoiceTableProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 w-full sm:w-auto max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice No, Order No, or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <button
          onClick={openModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div className="overflow-x-auto">
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">No invoices generated yet</p>
            <p className="text-xs text-slate-400 mt-1">Create a new invoice to record billing for gold sales.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                <th className="pb-3 pt-2 px-3 font-medium">Invoice No</th>
                <th className="pb-3 pt-2 px-3 font-medium">Order Ref</th>
                <th className="pb-3 pt-2 px-3 font-medium">Customer</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Gold Weight</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Total Amount</th>
                <th className="pb-3 pt-2 px-3 font-medium">Issue Date</th>
                <th className="pb-3 pt-2 px-3 font-medium">Due Date</th>
                <th className="pb-3 pt-2 px-3 font-medium">Status</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">{item.invoice_no}</td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-xs">{item.order_no}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{item.customer}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700">
                    {item.gold_qty_kg.toFixed(1)} KG
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800">
                    ${item.amount_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-xs">{item.invoice_date}</td>
                  <td className="py-3 px-3 text-slate-500 text-xs">{item.due_date}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <IconBtn title="Delete" tone="danger" onClick={() => deleteInvoice(item.id)}>
                      <Trash2 size={15} />
                    </IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
