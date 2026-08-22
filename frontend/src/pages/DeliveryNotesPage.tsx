/**
 * @file DeliveryNotesPage.tsx
 * @description Delivery Notes and Payment Collections page component.
 * Manages dispatch notes, payment collection tracking, outstanding balances, and receipt logs.
 */

import { useState, useEffect } from "react";
import DeliveryTable from "./deliveryNotes/DeliveryTable";
import DeliveryModal from "./deliveryNotes/DeliveryModal";
import PaymentModal from "./deliveryNotes/PaymentModal";
import DeliveryDetailModal from "./deliveryNotes/DeliveryDetailModal";
import { deliveryNotesApi, DeliveryNoteItem, DeliveryNoteDetailItem } from "../api";

interface DeliveryNotesPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

export default function DeliveryNotesPage({ notify }: DeliveryNotesPageProps) {
  const [deliveries, setDeliveries] = useState<DeliveryNoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activePaymentNote, setActivePaymentNote] = useState<DeliveryNoteItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeDetailId, setActiveDetailId] = useState<number | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function fetchDeliveries() {
    setLoading(true);
    try {
      const res = await deliveryNotesApi.getDeliveryNotes();
      setDeliveries(res || []);
    } catch (err: any) {
      notify("Failed to fetch delivery notes from server");
    } finally {
      setLoading(false);
    }
  }

  const filtered = deliveries.filter((d) => {
    const matchesSearch =
      d.delivery_no.toLowerCase().includes(search.toLowerCase()) ||
      d.order_no.toLowerCase().includes(search.toLowerCase()) ||
      (d.recipient_name && d.recipient_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.customer_name && d.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.delivery_address && d.delivery_address.toLowerCase().includes(search.toLowerCase()));

    const matchesPayment = paymentFilter ? d.payment_status === paymentFilter : true;
    return matchesSearch && matchesPayment;
  });

  // Calculate summary metrics
  const totalKgDelivered = deliveries.reduce((sum, d) => sum + (Number(d.gold_quantity) || 0), 0);
  const totalOwed = deliveries.reduce((sum, d) => sum + (Number(d.amount_owed) || 0), 0);
  const totalPaid = deliveries.reduce((sum, d) => sum + (Number(d.amount_paid) || 0), 0);
  const totalOutstanding = deliveries.reduce((sum, d) => sum + (Number(d.outstanding_balance) || 0), 0);
  const fullyPaidCount = deliveries.filter((d) => d.payment_status === "PAID").length;
  const pendingPaymentCount = deliveries.filter((d) => d.payment_status !== "PAID").length;

  async function handleDeleteDelivery(id: number) {
    if (!window.confirm("Are you sure you want to delete this delivery note? This will also remove its payment history.")) {
      return;
    }
    try {
      await deliveryNotesApi.deleteDeliveryNote(id);
      setDeliveries((prev) => prev.filter((d) => d.id !== id));
      notify("Delivery note removed successfully");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Failed to delete delivery note";
      notify(detail);
    }
  }

  function handleOpenPaymentModal(item: DeliveryNoteItem | DeliveryNoteDetailItem) {
    setActivePaymentNote(item);
    setIsPaymentOpen(true);
  }

  function handleOpenDetailModal(id: number) {
    setActiveDetailId(id);
    setIsDetailOpen(true);
  }

  return (
    <div className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col min-h-0 h-full">
      {/* Delivery Notes Table */}
      <DeliveryTable
        deliveries={filtered}
        search={search}
        setSearch={setSearch}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        openCreateModal={() => setIsCreateOpen(true)}
        openDetailModal={handleOpenDetailModal}
        openPaymentModal={handleOpenPaymentModal}
        deleteDelivery={handleDeleteDelivery}
        notify={notify}
      />

      {/* New Delivery Note Modal */}
      <DeliveryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchDeliveries}
        notify={notify}
      />

      {/* Record Payment Collection Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setActivePaymentNote(null);
        }}
        deliveryNote={activePaymentNote}
        onSuccess={() => {
          fetchDeliveries();
          if (isDetailOpen && activeDetailId) {
            // refresh active detail modal if open
            setActiveDetailId(activeDetailId);
          }
        }}
        notify={notify}
      />

      {/* Delivery Note Details & Complete Payment History Modal */}
      <DeliveryDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setActiveDetailId(null);
        }}
        deliveryNoteId={activeDetailId}
        onOpenPaymentModal={(detailItem) => {
          handleOpenPaymentModal(detailItem);
        }}
        notify={notify}
      />
    </div>
  );
}
