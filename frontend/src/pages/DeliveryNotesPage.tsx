/**
 * @file DeliveryNotesPage.tsx
 * @description Delivery Notes page component managing dispatched gold orders, driver contacts, and courier status views.
 */

import { useState } from "react";
import { CheckCircle2, Clock, Truck } from "lucide-react";
import StatCard from "../components/StatCard";
import DeliveryTable, { DeliveryNoteItem } from "./deliveryNotes/DeliveryTable";
import DeliveryModal from "./deliveryNotes/DeliveryModal";

interface DeliveryNotesPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

const INITIAL_DELIVERIES: DeliveryNoteItem[] = [];

/**
 * Delivery notes management page component.
 */
export default function DeliveryNotesPage({ notify }: DeliveryNotesPageProps) {
  const [deliveries, setDeliveries] = useState<DeliveryNoteItem[]>(INITIAL_DELIVERIES);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    order_no: "",
    recipient_name: "",
    address: "",
    gold_qty_kg: "",
    driver_contact: "",
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
      driver_contact: form.driver_contact,
    };
    setDeliveries([newDelivery, ...deliveries]);
    setIsOpen(false);
    setForm({
      order_no: "",
      recipient_name: "",
      address: "",
      gold_qty_kg: "",
      driver_contact: "",
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

      <DeliveryTable
        deliveries={filtered}
        search={search}
        setSearch={setSearch}
        openModal={() => setIsOpen(true)}
        deleteDelivery={deleteDelivery}
        notify={notify}
      />

      <DeliveryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        form={form}
        setForm={setForm}
        onSave={createDeliveryNote}
      />
    </div>
  );
}
