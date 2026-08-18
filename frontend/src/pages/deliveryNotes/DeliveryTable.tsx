/**
 * @file DeliveryTable.tsx
 * @description Sub-component rendering the delivery notes table view.
 */

import { FileCheck, MapPin, Package, Plus, Search, Trash2 } from "lucide-react";
import Card from "../../components/Card";
import IconBtn from "../../components/IconBtn";
import StatusBadge from "../../components/StatusBadge";

export interface DeliveryNoteItem {
  id: number;
  delivery_no: string;
  order_no: string;
  recipient_name: string;
  address: string;
  gold_qty_kg: number;
  dispatch_date: string;
  courier_status: "Delivered" | "In Transit" | "Dispatched";
  driver_contact?: string;
}

interface DeliveryTableProps {
  deliveries: DeliveryNoteItem[];
  search: string;
  setSearch: (val: string) => void;
  openModal: () => void;
  deleteDelivery: (id: number) => void;
}

/**
 * Delivery notes listing table component.
 */
export default function DeliveryTable({
  deliveries,
  search,
  setSearch,
  openModal,
  deleteDelivery,
}: DeliveryTableProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 w-full sm:w-auto max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Delivery No, Order No, Recipient or Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <button
          onClick={openModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={16} /> New Delivery Note
        </button>
      </div>

      <div className="overflow-x-auto">
        {deliveries.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileCheck size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">No delivery notes recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">Create a new delivery note to track dispatched gold orders.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                <th className="pb-3 pt-2 px-3 font-medium">Delivery Note</th>
                <th className="pb-3 pt-2 px-3 font-medium">Order Ref</th>
                <th className="pb-3 pt-2 px-3 font-medium">Recipient</th>
                <th className="pb-3 pt-2 px-3 font-medium">Address</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Quantity</th>
                <th className="pb-3 pt-2 px-3 font-medium">Dispatch Date</th>
                <th className="pb-3 pt-2 px-3 font-medium">Status</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">{item.delivery_no}</td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-xs">{item.order_no}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{item.recipient_name}</td>
                  <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                    <div className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{item.address}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800">
                    {item.gold_qty_kg.toFixed(1)} KG
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-xs">{item.dispatch_date}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.courier_status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <IconBtn title="Delete" tone="danger" onClick={() => deleteDelivery(item.id)}>
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
