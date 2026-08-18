/**
 * @file ReceiptTable.tsx
 * @description Sub-component rendering the goods receipt table list.
 */

import { FileCheck, Plus, Search, Trash2 } from "lucide-react";
import Card from "../../components/Card";
import IconBtn from "../../components/IconBtn";
import StatusBadge from "../../components/StatusBadge";

export interface GoodsReceiptItem {
  id: number;
  receipt_no: string;
  po_no: string;
  supplier: string;
  quantity_kg: number;
  received_date: string;
  status: "Verified" | "Pending" | "Completed";
  notes?: string;
}

interface ReceiptTableProps {
  receipts: GoodsReceiptItem[];
  search: string;
  setSearch: (val: string) => void;
  openModal: () => void;
  deleteReceipt: (id: number) => void;
}

/**
 * Goods receipt table view component.
 */
export default function ReceiptTable({
  receipts,
  search,
  setSearch,
  openModal,
  deleteReceipt,
}: ReceiptTableProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 w-full sm:w-auto max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Receipt No, PO No, or Supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <button
          onClick={openModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={16} /> New Goods Receipt
        </button>
      </div>

      <div className="overflow-x-auto">
        {receipts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileCheck size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">No goods receipts recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">Create a new receipt when gold cargo arrives.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                <th className="pb-3 pt-2 px-3 font-medium">Receipt No</th>
                <th className="pb-3 pt-2 px-3 font-medium">PO Ref</th>
                <th className="pb-3 pt-2 px-3 font-medium">Supplier</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Quantity</th>
                <th className="pb-3 pt-2 px-3 font-medium">Received Date</th>
                <th className="pb-3 pt-2 px-3 font-medium">Status</th>
                <th className="pb-3 pt-2 px-3 font-medium">Notes</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">{item.receipt_no}</td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-xs">{item.po_no}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{item.supplier}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800">
                    {item.quantity_kg.toFixed(1)} KG
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-xs">{item.received_date}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-xs max-w-xs truncate">
                    {item.notes || "—"}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <IconBtn title="Delete" tone="danger" onClick={() => deleteReceipt(item.id)}>
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
