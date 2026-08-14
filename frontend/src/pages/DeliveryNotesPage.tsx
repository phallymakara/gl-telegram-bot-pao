import React, { useState } from "react";
import {
  Truck,
  Plus,
  Search,
  Package,
  CheckCircle2,
  Clock,
  Trash2,
  MapPin,
  FileCheck
} from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

interface DeliveryNoteItem {
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

interface DeliveryNotesPageProps {
  notify: (msg: string) => void;
}

const INITIAL_DELIVERIES: DeliveryNoteItem[] = [
  {
    id: 1,
    delivery_no: "DN-2025-001",
    order_no: "ORD-9901",
    recipient_name: "Precious Metals Trader Co.",
    address: "Building 4, Preah Monivong Blvd, Phnom Penh",
    gold_qty_kg: 1.0,
    dispatch_date: "2025-08-11",
    courier_status: "Delivered",
    driver_contact: "+855 12 345 678"
  },
  {
    id: 2,
    delivery_no: "DN-2025-002",
    order_no: "ORD-9904",
    recipient_name: "Golden Lion Exchange",
    address: "Vattanac Capital Tower, Level 12, Phnom Penh",
    gold_qty_kg: 3.0,
    dispatch_date: "2025-08-13",
    courier_status: "In Transit",
    driver_contact: "+855 98 765 432"
  },
  {
    id: 3,
    delivery_no: "DN-2025-003",
    order_no: "ORD-9907",
    recipient_name: "Angkor Bullion & Vault",
    address: "Sivutha Blvd, Siem Reap",
    gold_qty_kg: 2.5,
    dispatch_date: "2025-08-13",
    courier_status: "Dispatched",
    driver_contact: "+855 77 112 233"
  }
];

export default function DeliveryNotesPage({ notify }: DeliveryNotesPageProps) {
  const [deliveries, setDeliveries] = useState<DeliveryNoteItem[]>(INITIAL_DELIVERIES);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    order_no: "",
    recipient_name: "",
    address: "",
    gold_qty_kg: "",
    driver_contact: ""
  });

  const filtered = deliveries.filter(
    (d) =>
      d.delivery_no.toLowerCase().includes(search.toLowerCase()) ||
      d.order_no.toLowerCase().includes(search.toLowerCase()) ||
      d.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      d.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalKgDelivered = deliveries.reduce((sum, d) => sum + d.gold_qty_kg, 0);
  const activeShipments = deliveries.filter((d) => d.courier_status !== "Delivered").length;
  const completedShipments = deliveries.filter((d) => d.courier_status === "Delivered").length;

  function createDeliveryNote() {
    if (!form.recipient_name || !form.address || !form.gold_qty_kg) {
      notify("Please fill in Recipient, Address, and Gold Quantity");
      return;
    }
    const newDelivery: DeliveryNoteItem = {
      id: Date.now(),
      delivery_no: `DN-${new Date().getFullYear()}-${String(deliveries.length + 1).padStart(3, "0")}`,
      order_no: form.order_no || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      recipient_name: form.recipient_name,
      address: form.address,
      gold_qty_kg: parseFloat(form.gold_qty_kg) || 0,
      dispatch_date: new Date().toISOString().split("T")[0],
      courier_status: "Dispatched",
      driver_contact: form.driver_contact
    };
    setDeliveries([newDelivery, ...deliveries]);
    setIsOpen(false);
    setForm({
      order_no: "",
      recipient_name: "",
      address: "",
      gold_qty_kg: "",
      driver_contact: ""
    });
    notify(`Delivery Note ${newDelivery.delivery_no} created successfully!`);
  }

  function deleteDelivery(id: number) {
    setDeliveries(deliveries.filter((d) => d.id !== id));
    notify("Delivery note removed");
  }

  return (
    <div className="flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto w-full flex flex-col space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Truck}
          label="Total Gold Dispatched"
          value={
            <>
              {totalKgDelivered.toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Dispatched stock"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Clock}
          label="Active Shipments"
          value={activeShipments}
          sub="In transit / dispatched"
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Delivered"
          value={completedShipments}
          sub="Completed deliveries"
          tint="bg-emerald-50 text-emerald-600"
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
              placeholder="Search by Delivery No, Order No, Recipient or Address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} /> New Delivery Note
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                <th className="pb-3 pt-2 px-3 font-medium">Delivery Note</th>
                <th className="pb-3 pt-2 px-3 font-medium">Order Ref</th>
                <th className="pb-3 pt-2 px-3 font-medium">Recipient</th>
                <th className="pb-3 pt-2 px-3 font-medium">Address</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Gold Qty</th>
                <th className="pb-3 pt-2 px-3 font-medium">Dispatch Date</th>
                <th className="pb-3 pt-2 px-3 font-medium">Status</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-sm">
                    No delivery notes found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-semibold text-indigo-600">{d.delivery_no}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{d.order_no}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{d.recipient_name}</td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{d.address}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {d.gold_qty_kg.toFixed(2)} KG
                    </td>
                    <td className="py-3 px-3 text-slate-500">{d.dispatch_date}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={d.courier_status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => deleteDelivery(d.id)}
                        className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                        title="Delete delivery note"
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
                <Truck size={18} className="text-indigo-600" /> Create Delivery Note
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
                  Recipient Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Golden Lion Exchange"
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Order Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. ORD-9908"
                  value={form.order_no}
                  onChange={(e) => setForm({ ...form, order_no: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Delivery Address *
                </label>
                <input
                  type="text"
                  placeholder="Destination address or vault location"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                    Driver / Contact
                  </label>
                  <input
                    type="text"
                    placeholder="+855 12 000 111"
                    value={form.driver_contact}
                    onChange={(e) => setForm({ ...form, driver_contact: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
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
                onClick={createDeliveryNote}
                className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Issue Delivery Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
