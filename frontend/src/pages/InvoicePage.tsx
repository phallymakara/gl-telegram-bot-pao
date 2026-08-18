/**
 * @file InvoicePage.tsx
 * @description Customer Invoices page component managing sales billing, payment due tracking, and invoice records.
 */

import { useState } from "react";
import { CheckCircle2, Clock, DollarSign } from "lucide-react";
import StatCard from "../components/StatCard";
import InvoiceTable, { InvoiceItem } from "./invoices/InvoiceTable";
import InvoiceModal from "./invoices/InvoiceModal";

interface InvoicePageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

const INITIAL_INVOICES: InvoiceItem[] = [];

/**
 * Invoices management page component.
 */
export default function InvoicePage({ notify }: InvoicePageProps) {
  const [invoices, setInvoices] = useState<InvoiceItem[]>(INITIAL_INVOICES);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    order_no: "",
    customer: "",
    amount_usd: "",
    gold_qty_kg: "",
    due_date: "",
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
      status: "Pending",
    };
    setInvoices([newInvoice, ...invoices]);
    setIsOpen(false);
    setForm({
      order_no: "",
      customer: "",
      amount_usd: "",
      gold_qty_kg: "",
      due_date: "",
    });
    notify(`Invoice ${newInvoice.invoice_no} created successfully!`);
  }

  function deleteInvoice(id: number) {
    setInvoices(invoices.filter((inv) => inv.id !== id));
    notify("Invoice removed");
  }

  return (
    <div className="flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto w-full flex flex-col space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Invoiced Amount"
          value={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          sub="Total billing value"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Paid Invoices"
          value={`$${paidRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          sub="Settled payments"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="Pending Payments"
          value={`$${pendingRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          sub="Awaiting collection"
          tint="bg-amber-50 text-amber-600"
        />
      </div>

      <InvoiceTable
        invoices={filtered}
        search={search}
        setSearch={setSearch}
        openModal={() => setIsOpen(true)}
        deleteInvoice={deleteInvoice}
      />

      <InvoiceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        form={form}
        setForm={setForm}
        onSave={createInvoice}
      />
    </div>
  );
}
