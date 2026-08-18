/**
 * @file GoodsReceiptPage.tsx
 * @description Goods Receipt page component managing supplier delivery vouchers and vault purity verification.
 */

import { useState } from "react";
import { CheckCircle2, Clock, PackageCheck } from "lucide-react";
import StatCard from "../components/StatCard";
import ReceiptTable, { GoodsReceiptItem } from "./goodsReceipt/ReceiptTable";
import ReceiptModal from "./goodsReceipt/ReceiptModal";

interface GoodsReceiptPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

const INITIAL_RECEIPTS: GoodsReceiptItem[] = [];

/**
 * Goods receipt management page component.
 */
export default function GoodsReceiptPage({ notify }: GoodsReceiptPageProps) {
  const [receipts, setReceipts] = useState<GoodsReceiptItem[]>(INITIAL_RECEIPTS);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    po_no: "",
    supplier: "",
    quantity_kg: "",
    received_date: new Date().toISOString().split("T")[0],
    notes: "",
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
      notes: form.notes,
    };
    setReceipts([newReceipt, ...receipts]);
    setIsOpen(false);
    setForm({
      po_no: "",
      supplier: "",
      quantity_kg: "",
      received_date: new Date().toISOString().split("T")[0],
      notes: "",
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
          sub="Received gold cargo"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Clock}
          label="Pending Assay Verification"
          value={pendingCount}
          sub="Awaiting vault inspection"
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Verified Receipts"
          value={receipts.length - pendingCount}
          sub="Purity assay confirmed"
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>

      <ReceiptTable
        receipts={filtered}
        search={search}
        setSearch={setSearch}
        openModal={() => setIsOpen(true)}
        deleteReceipt={deleteReceipt}
      />

      <ReceiptModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        form={form}
        setForm={setForm}
        onSave={createReceipt}
      />
    </div>
  );
}
