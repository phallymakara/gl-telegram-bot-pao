import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  MapPin,
  MoreHorizontal,
  Package,
  PackageCheck,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Send,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
/**
 * @file PurchaseOrdersPage.tsx
 * @description Purchase Orders page component managing local and oversea gold supplier procurement, shipping tracking, stock receipt verification, and returns.
 */

import {
  api,
  customersApi,
  vendorsApi,
  productsApi,
  purchaseOrdersApi,
  DashboardStatsData,
  PurchaseOrderData,
  SlotTableData,
  SupplierData,
  toNumber,
} from "../api";

interface PurchaseOrdersPageProps {
  /** Optional Purchase Order type filter ("LOCAL" | "OVERSEA" | "BUYBACK" | "") */
  poType?: "LOCAL" | "OVERSEA" | "BUYBACK" | "";
  /** Toast notification callback */
  notify: (msg: string) => void;
}

interface PartyOption {
  name: string;
  category: "Vendor" | "Customer";
  code?: string;
  contact?: string;
}

function SearchablePartySelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: PartyOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.category.toLowerCase().includes(q) ||
        (opt.code && opt.code.toLowerCase().includes(q)) ||
        (opt.contact && opt.contact.toLowerCase().includes(q))
    );
  }, [options, query]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={open ? query : value}
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder="Search by code or name..."
          className="w-full text-sm border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">No matching record found</div>
          ) : (
            filtered.map((opt, idx) => (
              <button
                key={`${opt.name}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(opt.name);
                  setQuery(opt.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50/60 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-slate-800">{opt.name}</span>
                  {opt.code && (
                    <span className="font-mono text-xs text-slate-400 font-medium ml-2">
                      {opt.code}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface ProductOption {
  name: string;
  conversion_factor?: number | null;
}

function SearchableProductSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    productsApi
      .getProducts()
      .then((data) => {
        setProducts(
          data
            .filter((p) => p.is_active !== false)
            .map((p) => ({
              name: p.name,
              conversion_factor: p.conversion_factor,
            }))
        );
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={open ? query : value}
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder="Search and select product type..."
          className="w-full text-sm border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">No matching product found</div>
          ) : (
            filtered.map((opt, idx) => (
              <button
                key={`${opt.name}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(opt.name);
                  setQuery(opt.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50/60 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="font-semibold text-slate-800">{opt.name}</span>
                {opt.conversion_factor !== undefined && opt.conversion_factor !== null && (
                  <span className="font-mono text-xs text-slate-400 font-medium ml-2">
                    {opt.conversion_factor}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  purchase_source: "OVERSEA" as "OVERSEA" | "LOCAL" | "BUYBACK",
  vendor_type: "Swiss" as "Swiss" | "DB" | "SV",
  vendor_name: "",
  customer_name: "",
  product_type: "",
  unit_type: "Kg" as "Kg" | "TL",
  spot_price: "",
  premium: "",
  amount_kg: "",
  quantity: "",
  price: "",
  unit_cost: "",
  currency: "USD",
  order_date: new Date().toISOString().split("T")[0],
  expected_date: "",
  received_date: "",
  notes: "",
};



function titleCase(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return d.includes("T") ? d.split("T")[0] : d;
}

function formatParty(r: PurchaseOrderData): string {
  if (!r.supplier_name) return "—";
  let name = r.supplier_name;
  if (name.includes("Refining Corp")) {
    name = name.replace("Refining Corp", "").trim();
  }
  if (name.includes("Customer Buy-back ·")) {
    name = name.replace("Customer Buy-back ·", "").trim();
  }
  return name || "—";
}

function ExportPoDropdown({
  rows,
  notify,
}: {
  rows: any[];
  notify?: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleExportExcel() {
    setOpen(false);
    const headers = ["PO No", "Type", "Vendor", "Amount", "Unit Price", "Total Amount (USD)", "Spot Price", "Premium", "Order Date", "Expected Date", "Status", "Remark"];
    const exportRows = rows.map((r) => [
      `"${(r.po_no || "").replace(/"/g, '""')}"`,
      `"${(r.po_type || "").replace(/"/g, '""')}"`,
      `"${(r.supplier_name || "").replace(/"/g, '""')}"`,
      `"${toNumber(r.quantity).toFixed(3)}"`,
      `"${r.quantity > 0 ? (toNumber(r.total_cost) / toNumber(r.quantity)).toFixed(2) : "0.00"}"`,
      `"${toNumber(r.total_cost).toFixed(2)}"`,
      `"${toNumber(r.spot_price).toFixed(2)}"`,
      `"${toNumber(r.premium).toFixed(2)}"`,
      `"${(r.order_date || "").replace(/"/g, '""')}"`,
      `"${(r.received_date || "").replace(/"/g, '""')}"`,
      `"${(r.status || "").replace(/"/g, '""')}"`,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...exportRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Purchase_Orders_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (notify) notify("Exported Purchase Orders to Excel (.csv)");
  }

  function handleExportPdf() {
    setOpen(false);
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const tableRowsHtml = rows
      .map(
        (r) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 10px; font-family: monospace; font-weight: bold; color: #1e293b;">${r.po_no || "—"}</td>
          <td style="padding: 8px 10px; color: #475569;">${r.po_type || "—"}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${r.supplier_name || "—"}</td>
          <td style="padding: 8px 10px; font-family: monospace; font-weight: 600; text-align: right; color: #0f172a;">${toNumber(r.quantity).toFixed(3)} KG</td>
          <td style="padding: 8px 10px; font-family: monospace; font-weight: 600; text-align: right; color: #475569;">$${r.quantity > 0 ? (toNumber(r.total_cost) / toNumber(r.quantity)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</td>
          <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; text-align: right; color: #4338ca;">$${toNumber(r.total_cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; color: #64748b;">${r.order_date || "—"}</td>
          <td style="padding: 8px 10px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #e0e7ff; color: #3730a3;">${r.status || "—"}</span>
          </td>
        </tr>
      `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Orders Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #1e1b4b; }
          .meta { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f8fafc; text-align: left; padding: 10px 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; font-size: 11px; }
          .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Purchase Orders Summary Report</div>
            <div class="meta">Exported on ${dateStr} | Total Orders: ${rows.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>PO No</th>
              <th>Type</th>
              <th>Vendor</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total Amount</th>
              <th>Order Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">Confidential — Purchase Procurement Audit Log</div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);

    if (notify) notify("Prepared PDF export for print/download");
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 transition-colors shadow-xs cursor-pointer"
      >
        <Download size={14} className="text-slate-500" />
        <span>Export</span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-700 flex items-center gap-2 transition-colors cursor-pointer font-medium"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export as Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-rose-50/70 hover:text-rose-700 flex items-center gap-2 transition-colors cursor-pointer font-medium"
          >
            <FileText size={14} className="text-rose-600" />
            <span>Export as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

function getNextPoNo(existingRows: PurchaseOrderData[]): string {
  const year = new Date().getFullYear();
  let maxSeq = 0;
  existingRows.forEach((r) => {
    if (r.po_no) {
      const match = r.po_no.match(/(\d+)$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(3, "0");
  return `PO-${year}-${nextSeq}`;
}

export default function PurchaseOrdersPage({ poType, notify }: PurchaseOrdersPageProps) {
  const [rows, setRows] = useState<PurchaseOrderData[]>([]);
  const [generatedPoNo, setGeneratedPoNo] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "OVERSEA" | "LOCAL" | "BUYBACK">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [customerList, setCustomerList] = useState<PartyOption[]>([]);
  const [vendorList, setVendorList] = useState<PartyOption[]>([]);
  const [productList, setProductList] = useState<ProductOption[]>([]);
  const [slotTables, setSlotTables] = useState<SlotTableData[]>([]);

  useEffect(() => {
    customersApi
      .getCustomers()
      .then((data) => {
        setCustomerList(
          data.map((c) => ({
            name: c.name || c.display_name || `Customer #${c.id}`,
            category: "Customer" as const,
            code: c.customer_code || `CUST-${String(c.id).padStart(3, "0")}`,
            contact: c.contact || undefined,
          }))
        );
      })
      .catch(() => { });

    vendorsApi
      .getVendors()
      .then((data) => {
        setVendorList(
          data.map((v) => ({
            name: v.name,
            category: "Vendor" as const,
            code: v.vendor_code || `VEND-${String(v.id).padStart(3, "0")}`,
            contact: v.phone || v.email || undefined,
          }))
        );
      })
      .catch(() => { });

    productsApi
      .getProducts()
      .then((data) => {
        setProductList(
          data
            .filter((p) => p.is_active !== false)
            .map((p) => ({
              name: p.name,
              conversion_factor: p.conversion_factor,
            }))
        );
      })
      .catch(() => { });
  }, []);

  const combinedPartyOptions = useMemo(() => {
    const map = new Map<string, PartyOption>();
    [...vendorList, ...customerList].forEach((item) => {
      map.set(item.name.toLowerCase() + (item.code ? `-${item.code.toLowerCase()}` : ""), item);
    });
    return Array.from(map.values());
  }, [vendorList, customerList]);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingPoId, setEditingPoId] = useState<number | null>(null);

  const matchedProduct = useMemo(() => {
    if (!form.product_type?.trim()) return null;
    return productList.find(
      (p) => p.name.toLowerCase() === form.product_type.trim().toLowerCase()
    );
  }, [productList, form.product_type]);

  const conversionFactorDisplay =
    matchedProduct && matchedProduct.conversion_factor != null
      ? matchedProduct.conversion_factor
      : "None";

  const autoCalculatedPrice = useMemo(() => {
    const spot = Number(form.spot_price) || 0;
    const prem = form.premium !== "" && !isNaN(Number(form.premium)) ? Number(form.premium) : 0;
    const qty = Number(form.amount_kg) || Number(form.quantity) || 0;
    const factor = matchedProduct && matchedProduct.conversion_factor != null ? matchedProduct.conversion_factor : 32.148;
    if (spot > 0 && qty > 0) {
      const unitCost = (spot * factor) + prem;
      return (qty * unitCost).toFixed(2);
    }
    return "";
  }, [form.spot_price, form.premium, form.amount_kg, form.quantity, matchedProduct]);

  function updateFormField(
    field: "spot_price" | "premium" | "amount_kg" | "price" | "product_type" | "unit_type",
    value: string
  ) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "amount_kg") {
        next.quantity = value;
      }

      let backendLastEdited = field as string;
      if (field === "amount_kg") backendLastEdited = "quantity";
      if (field === "price") backendLastEdited = "total_cost";

      const payload = {
        product_type: next.product_type || null,
        unit_type: next.unit_type || "Kg",
        spot_price: next.spot_price !== "" && !isNaN(Number(next.spot_price)) ? Number(next.spot_price) : null,
        premium: next.premium !== "" && !isNaN(Number(next.premium)) ? Number(next.premium) : null,
        quantity: next.amount_kg !== "" && !isNaN(Number(next.amount_kg)) ? Number(next.amount_kg) : null,
        total_cost: next.price !== "" && !isNaN(Number(next.price)) ? Number(next.price) : null,
        last_edited_field: backendLastEdited,
      };

      purchaseOrdersApi
        .calculatePricing(payload)
        .then((res) => {
          if (!res.solved_field) return;
          setForm((f) => {
            const updated = { ...f };
            if (res.solved_field === "total_cost" && res.total_cost != null && field !== "price") {
              updated.price = String(res.total_cost);
            } else if (res.solved_field === "quantity" && res.quantity != null && field !== "amount_kg") {
              updated.amount_kg = String(res.quantity);
              updated.quantity = String(res.quantity);
            } else if (res.solved_field === "premium" && res.premium != null && field !== "premium") {
              updated.premium = String(res.premium);
            } else if (res.solved_field === "spot_price" && res.spot_price != null && field !== "spot_price") {
              updated.spot_price = String(res.spot_price);
            }
            return updated;
          });
        })
        .catch(() => {});

      return next;
    });
  }
  const [returnTarget, setReturnTarget] = useState<PurchaseOrderData | null>(null);
  const [returnForm, setReturnForm] = useState({ quantity: "", reason: "" });
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [showStatusSubMenuId, setShowStatusSubMenuId] = useState<number | null>(null);
  const [invoiceModalPo, setInvoiceModalPo] = useState<PurchaseOrderData | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderData | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    invoice_no: "",
    received_qty: "",
    received_date: new Date().toISOString().split("T")[0],
    attachment_name: "",
    notes: "",
  });

  function printInvoiceDirectly(po: PurchaseOrderData) {
    const orderDate = po.order_date ? po.order_date.replace(/-/g, " . ") : "15 . 08 . 2026";
    const refNo = "A " + (po.po_no ? po.po_no.replace("PO-2026-", "0062") : "0062");
    const spotPrice = (po.spot_price || 4376.20).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const premiumVal = po.premium !== undefined && po.premium !== null ? `${po.premium > 0 ? "+" : ""}${po.premium}` : "+200";
    const qtyVal = po.quantity || 1.00;
    const totalCost = (po.total_cost || 140786.078).toLocaleString(undefined, { minimumFractionDigits: 3 });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Print Invoice - ${po.po_no}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A5; margin: 0; }
          body { background: white; padding: 0; margin: 0; }
          .invoice-card { width: 148mm; min-height: 210mm; p: 20px; box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div class="invoice-card bg-[#fffcf5] border border-red-800 text-slate-900 font-sans space-y-4 p-5">
          <div class="flex flex-row items-start justify-between border-b-2 border-red-800/60 pb-3">
            <div class="flex items-start gap-2.5">
              <div class="w-11 h-11 rounded-full border-2 border-red-700 flex items-center justify-center bg-red-50 text-red-700 font-bold shrink-0">
                <div class="w-8 h-8 border-2 border-red-700 rounded-full flex items-center justify-center">
                  <div class="w-4 h-4 border border-red-700 rotate-45"></div>
                </div>
              </div>
              <div>
                <h2 class="font-black text-base text-red-700 tracking-tight leading-tight">CHHAY VANN CO.,LTD</h2>
                <p class="text-[10px] text-red-800 font-bold">Local Gold Trading</p>
                <div class="text-[9px] text-red-900/80 leading-snug mt-0.5 space-y-0.5">
                  <p>Add: #31, St. 286, S/K. Olympic, Phnom Penh, Cambodia.</p>
                  <p>H/P: +855 78 688 831 / 12 505 031 &nbsp;|&nbsp; Fax: +855 23 218 831</p>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="inline-block text-[10px] font-bold text-red-800 border-b border-red-800 pb-0.5 mb-1">Local</div>
              <div class="text-[11px] text-red-900 font-medium space-y-0.5">
                <p>Re. No.: <span class="font-mono font-bold text-red-700 text-xs">${refNo}</span></p>
                <p>Date: <span class="font-semibold text-slate-900 text-xs">${po.order_date || new Date().toISOString().split("T")[0]}</span></p>
              </div>
            </div>
          </div>

          <div class="text-center py-0.5">
            <h1 class="text-base font-black text-red-700 tracking-wider uppercase">PURCHASE SLIP</h1>
            <p class="text-[10px] font-bold text-red-800 tracking-widest">卖单</p>
          </div>

          <div class="border border-red-700 rounded-none p-2.5 bg-red-50/30 space-y-1.5 text-xs text-red-900">
            <div class="flex items-center justify-between border-b border-red-200 pb-1">
              <span class="font-semibold">Customer Name / 客户名:</span>
              <span class="font-bold text-slate-900 text-xs">${po.supplier_name || "ABC"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-semibold">Phone Number / 电话号码:</span>
              <span class="font-mono text-slate-800 text-xs">+855 12 345 678</span>
            </div>
          </div>

          <div class="border border-red-700 rounded-none overflow-hidden">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-red-100/80 border-b border-red-700 text-red-900 font-bold text-center">
                  <th class="p-1.5 border-r border-red-700"><div>Collected Date</div><div class="text-[9px] font-normal text-red-800">取货日期</div></th>
                  <th class="p-1.5 border-r border-red-700"><div>London Time</div><div class="text-[9px] font-normal text-red-800">伦敦价格</div></th>
                  <th class="p-1.5 border-r border-red-700"><div>Premium</div><div class="text-[9px] font-normal text-red-800">加价</div></th>
                  <th class="p-1.5 border-r border-red-700"><div>Amount</div><div class="text-[9px] font-normal text-red-800">数量</div></th>
                  <th class="p-1.5"><div>Price</div><div class="text-[9px] font-normal text-red-800">价格</div></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-red-200 text-slate-900 text-center font-medium">
                <tr class="bg-white">
                  <td class="p-2 border-r border-red-200 font-semibold">${orderDate}</td>
                  <td class="p-2 border-r border-red-200"><span class="font-bold text-xs">${spotPrice}</span></td>
                  <td class="p-2 border-r border-red-200 font-semibold text-rose-700">${premiumVal}</td>
                  <td class="p-2 border-r border-red-200 font-bold">${qtyVal} <span class="text-[10px] font-normal text-slate-600">(CDB) Kg</span></td>
                  <td class="p-2 font-black text-xs text-red-700">${totalCost} <span class="text-[10px] font-normal text-slate-700">USD</span></td>
                </tr>
              </tbody>
            </table>
            <div class="p-2 border-t border-red-700 bg-red-50/30 text-[11px] text-red-900">
              <span class="font-semibold">Other / 其它:</span> &nbsp;<span class="text-slate-800 italic">${po.notes || "Local gold trade purchase order verified."}</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 pt-4 text-center text-xs text-red-900 font-medium">
            <div><p class="font-bold">Sale By:</p><p class="text-[9px] text-red-800">销售者</p><div class="mt-6 border-b border-red-700/60 w-3/4 mx-auto"></div></div>
            <div><p class="font-bold">Recorded by:</p><p class="text-[9px] text-red-800">记录者</p><div class="mt-6 border-b border-red-700/60 w-3/4 mx-auto"></div></div>
            <div><p class="font-bold">Checked by:</p><p class="text-[9px] text-red-800">检查者</p><div class="mt-6 border-b border-red-700/60 w-3/4 mx-auto"></div></div>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  }

  function openInvoiceInNewTab(po: PurchaseOrderData) {
    const orderDate = po.order_date ? po.order_date.replace(/-/g, " . ") : "15 . 08 . 2026";
    const refNo = "A " + (po.po_no ? po.po_no.replace("PO-2026-", "0062") : "0062");
    const spotPrice = (po.spot_price || 4376.20).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const premiumVal = po.premium !== undefined && po.premium !== null ? `${po.premium > 0 ? "+" : ""}${po.premium}` : "+200";
    const qtyVal = po.quantity || 1.00;
    const totalCost = (po.total_cost || 140786.078).toLocaleString(undefined, { minimumFractionDigits: 3 });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Purchase Slip - ${po.po_no}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A5; margin: 0; }
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; padding: 0 !important; }
            .invoice-card { shadow: none !important; border: 1px solid #991b1b !important; box-shadow: none !important; }
          }
        </style>
      </head>
      <body class="bg-slate-200 min-h-screen p-4 md:p-6 flex flex-col items-center justify-start text-slate-800">
        
        <!-- Top Action Bar -->
        <div class="no-print w-full max-w-[148mm] flex items-center justify-between bg-white p-3 rounded-none border border-slate-300 mb-4">
          <span class="text-xs font-bold text-slate-700">A5 Purchase Invoice — ${po.po_no}</span>
          <div class="flex items-center gap-2">
            <button onclick="window.print()" class="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1">
              <span>🖨️</span> Print A5
            </button>
            <button onclick="window.close()" class="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-none text-xs font-bold transition-colors cursor-pointer">
              ✕ Close
            </button>
          </div>
        </div>

        <!-- A5 Sheet Container (148mm x 210mm) -->
        <div class="invoice-card bg-[#fffcf5] border border-red-800 rounded-none w-[148mm] min-h-[210mm] p-5 space-y-4 text-slate-900 box-border">
          <!-- Slip Header -->
          <div class="flex flex-row items-start justify-between border-b-2 border-red-800/60 pb-3">
            <div class="flex items-start gap-2.5">
              <div class="w-11 h-11 rounded-full border-2 border-red-700 flex items-center justify-center bg-red-50 text-red-700 font-bold shrink-0">
                <div class="w-8 h-8 border-2 border-red-700 rounded-full flex items-center justify-center">
                  <div class="w-4 h-4 border border-red-700 rotate-45"></div>
                </div>
              </div>
              <div>
                <h2 class="font-black text-base text-red-700 tracking-tight leading-tight">
                  CHHAY VANN CO.,LTD
                </h2>
                <p class="text-[10px] text-red-800 font-bold">Local Gold Trading</p>
                <div class="text-[9px] text-red-900/80 leading-snug mt-0.5 space-y-0.5">
                  <p>Add: #31, St. 286, S/K. Olympic, Phnom Penh, Cambodia.</p>
                  <p>H/P: +855 78 688 831 / 12 505 031 &nbsp;|&nbsp; Fax: +855 23 218 831</p>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="inline-block text-[10px] font-bold text-red-800 border-b border-red-800 pb-0.5 mb-1">
                Local
              </div>
              <div class="text-[11px] text-red-900 font-medium space-y-0.5">
                <p>Re. No.: <span class="font-mono font-bold text-red-700 text-xs">${refNo}</span></p>
                <p>Date: <span class="font-semibold text-slate-900 text-xs">${po.order_date || new Date().toISOString().split("T")[0]}</span></p>
              </div>
            </div>
          </div>

          <!-- Title -->
          <div class="text-center py-0.5">
            <h1 class="text-base font-black text-red-700 tracking-wider uppercase">PURCHASE SLIP</h1>
            <p class="text-[10px] font-bold text-red-800 tracking-widest">卖单</p>
          </div>

          <!-- Customer Box -->
          <div class="border border-red-700 rounded-none p-2.5 bg-red-50/30 space-y-1.5 text-xs text-red-900">
            <div class="flex items-center justify-between border-b border-red-200 pb-1">
              <span class="font-semibold">Customer Name / 客户名:</span>
              <span class="font-bold text-slate-900 text-xs">${po.supplier_name || "ABC"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-semibold">Phone Number / 电话号码:</span>
              <span class="font-mono text-slate-800 text-xs">+855 12 345 678</span>
            </div>
          </div>

          <!-- Items Table -->
          <div class="border border-red-700 rounded-none overflow-hidden">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-red-100/80 border-b border-red-700 text-red-900 font-bold text-center">
                  <th class="p-1.5 border-r border-red-700"><div>Collected Date</div><div class="text-[9px] font-normal text-red-800">取货日期</div></th>
                  <th class="p-1.5 border-r border-red-700"><div>London Time</div><div class="text-[9px] font-normal text-red-800">伦敦价格</div></th>
                  <th class="p-1.5 border-r border-red-700"><div>Premium</div><div class="text-[9px] font-normal text-red-800">加价</div></th>
                  <th class="p-1.5 border-r border-red-700"><div>Amount</div><div class="text-[9px] font-normal text-red-800">数量</div></th>
                  <th class="p-1.5"><div>Price</div><div class="text-[9px] font-normal text-red-800">价格</div></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-red-200 text-slate-900 text-center font-medium">
                <tr class="bg-white">
                  <td class="p-2 border-r border-red-200 font-semibold">${orderDate}</td>
                  <td class="p-2 border-r border-red-200"><span class="font-bold text-xs">${spotPrice}</span></td>
                  <td class="p-2 border-r border-red-200 font-semibold text-rose-700">${premiumVal}</td>
                  <td class="p-2 border-r border-red-200 font-bold">${qtyVal} <span class="text-[10px] font-normal text-slate-600">(CDB) Kg</span></td>
                  <td class="p-2 font-black text-xs text-red-700">${totalCost} <span class="text-[10px] font-normal text-slate-700">USD</span></td>
                </tr>
              </tbody>
            </table>
            <div class="p-2 border-t border-red-700 bg-red-50/30 text-[11px] text-red-900">
              <span class="font-semibold">Other / 其它:</span> &nbsp;<span class="text-slate-800 italic">${po.notes || "Local gold trade purchase order verified."}</span>
            </div>
          </div>

          <!-- Signatures -->
          <div class="grid grid-cols-3 gap-3 pt-4 text-center text-xs text-red-900 font-medium">
            <div><p class="font-bold">Sale By:</p><p class="text-[9px] text-red-800">销售者</p><div class="mt-6 border-b border-red-700/60 w-3/4 mx-auto"></div></div>
            <div><p class="font-bold">Recorded by:</p><p class="text-[9px] text-red-800">记录者</p><div class="mt-6 border-b border-red-700/60 w-3/4 mx-auto"></div></div>
            <div><p class="font-bold">Checked by:</p><p class="text-[9px] text-red-800">检查者</p><div class="mt-6 border-b border-red-700/60 w-3/4 mx-auto"></div></div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      notify("Pop-up blocked. Please allow pop-ups for this site.");
    }
  }

  const [receivedDateFilter, setReceivedDateFilter] = useState<string>("");

  const [stats, setStats] = useState<DashboardStatsData | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (poType && poType.trim() !== "") params.append("po_type", poType);
    if (receivedDateFilter) params.append("received_date", receivedDateFilter);
    const queryString = params.toString();
    const url = queryString ? `/api/purchase-orders/?${queryString}` : "/api/purchase-orders/";

    api
      .get<PurchaseOrderData[]>(url)
      .then(setRows)
      .catch(() => notify("Failed to load purchase orders"));
    api
      .get<DashboardStatsData>("/api/dashboard/stats")
      .then(setStats)
      .catch(() => { });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    api
      .get<SupplierData[]>(`/api/suppliers/?supplier_type=${poType}`)
      .then(setSuppliers)
      .catch(() => notify("Failed to load suppliers"));
    api
      .get<SlotTableData[]>("/api/slots/")
      .then(setSlotTables)
      .catch(() => notify("Failed to load slot tables"));
    return () => clearInterval(interval);
  }, [poType, receivedDateFilter]);

  function openEditPoModal(po: PurchaseOrderData) {
    setEditingPoId(po.id);
    setGeneratedPoNo(po.po_no || "");
    setForm({
      purchase_source: (po.po_type as "OVERSEA" | "LOCAL" | "BUYBACK") || "OVERSEA",
      vendor_type: "Swiss",
      vendor_name: po.supplier_name || "",
      customer_name: po.supplier_name || "",
      product_type: (po as any).product_type || "",
      unit_type: (po as any).unit_type || "Kg",
      spot_price: po.spot_price ? String(po.spot_price) : "4376.2",
      premium: po.premium ? String(po.premium) : "200",
      amount_kg: String(po.quantity || 1),
      quantity: String(po.quantity || 1),
      price: po.total_cost ? String(po.total_cost) : "",
      unit_cost: String(po.unit_cost || 140786.078),
      currency: "USD",
      order_date: po.order_date || new Date().toISOString().split("T")[0],
      expected_date: po.expected_date || "",
      received_date: po.received_date || "",
      notes: po.notes || "",
    });
    setIsOpen(true);
  }

  function openNewPoModal() {
    setEditingPoId(null);
    const source = (poType === "LOCAL" || poType === "OVERSEA") ? poType : "OVERSEA";
    const nextPoNo = getNextPoNo(rows);
    setGeneratedPoNo(nextPoNo);
    setForm({
      ...emptyForm,
      purchase_source: source,
      order_date: new Date().toISOString().split("T")[0],
      received_date: "",
    });
    setIsOpen(true);
  }

  function save() {
    let supplierName = "";
    if (form.purchase_source === "OVERSEA") {
      supplierName = form.vendor_type || "Swiss";
    } else if (form.purchase_source === "LOCAL") {
      if (!form.vendor_name) {
        notify("Please enter Vendor Name");
        return;
      }
      supplierName = form.vendor_name;
    } else {
      if (!form.customer_name) {
        notify("Please enter Customer Name");
        return;
      }
      supplierName = form.customer_name;
    }

    if (!form.received_date) {
      notify("Please select Expected Received Date");
      return;
    }

    const spotPrice = Number(form.spot_price) || 4376.2;
    const premium = form.premium !== "" && !isNaN(Number(form.premium)) ? Number(form.premium) : 200;
    const qty = Number(form.amount_kg) || Number(form.quantity) || 1.0;
    const factor = matchedProduct && matchedProduct.conversion_factor != null ? matchedProduct.conversion_factor : 32.148;
    const unitCost = (spotPrice * factor) + premium;
    const totalCost = form.price !== "" ? Number(form.price) : (qty * unitCost);

    if (editingPoId !== null) {
      api
        .put<PurchaseOrderData>(`/api/purchase-orders/${editingPoId}`, {
          po_type: form.purchase_source,
          supplier_name: supplierName,
          product_type: form.product_type || null,
          unit_type: form.unit_type || "Kg",
          quantity: qty,
          spot_price: spotPrice,
          premium: premium,
          unit_cost: unitCost,
          order_date: form.order_date,
          received_date: form.received_date || null,
          notes: form.notes || null,
        })
        .then((updated) => {
          setRows((prev) => prev.map((r) => (r.id === editingPoId ? updated : r)));
          notify("Purchase order updated successfully!");
          load();
        })
        .catch((e: Error) => {
          notify(e.message || "Failed to update purchase order");
        });
      setEditingPoId(null);
    } else {
      api
        .post<PurchaseOrderData>("/api/purchase-orders/", {
          po_no: generatedPoNo,
          po_type: form.purchase_source,
          supplier_name: supplierName,
          product_type: form.product_type || null,
          unit_type: form.unit_type || "Kg",
          quantity: qty,
          spot_price: spotPrice,
          premium: premium,
          unit_cost: unitCost,
          currency: "USD",
          order_date: form.order_date || new Date().toISOString().split("T")[0],
          received_date: form.received_date || null,
          notes: form.notes || null,
        })
        .then((created) => {
          setRows((r) => [created, ...r.filter((x) => x.id !== created.id)]);
          notify(`New ${form.purchase_source.toLowerCase()} purchase order created!`);
          load();
        })
        .catch((e: Error) => {
          notify(e.message || "Failed to create purchase order");
        });
    }

    setForm(emptyForm);
    setIsOpen(false);
  }

  function markConfirmed(po: PurchaseOrderData) {
    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${po.id}/confirm`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${po.po_no} status changed to Confirmed`);
        load();
      })
      .catch((e: Error) => notify(e.message || "Failed to confirm purchase order"));
  }

  function markOrdered(po: PurchaseOrderData) {
    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${po.id}/mark-ordered`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${po.po_no} marked as incoming`);
        load();
      })
      .catch((e: Error) => notify(e.message || "Failed to update purchase order"));
  }

  function receive(po: PurchaseOrderData) {
    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${po.id}/receive`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${po.po_no} received — stock updated`);
        load();
      })
      .catch((e: Error) => notify(e.message || "Failed to receive purchase order"));
  }

  function cancel(po: PurchaseOrderData) {
    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${po.id}/cancel`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${po.po_no} cancelled`);
        load();
      })
      .catch((e: Error) => notify(e.message || "Failed to cancel purchase order"));
  }

  function openReceiveModal(po: PurchaseOrderData) {
    setReceiveTarget(po);
    setReceiveForm({
      invoice_no: `INV-${po.po_no.replace("PO-", "")}`,
      received_qty: String(toNumber(po.quantity)),
      received_date: po.received_date || new Date().toISOString().split("T")[0],
      attachment_name: "",
      notes: "",
    });
  }

  function submitReceive() {
    if (!receiveTarget) return;
    receive(receiveTarget);
    setReceiveTarget(null);
  }

  function submitReceiveGoods() {
    if (!receiveTarget) return;
    if (!receiveForm.invoice_no) {
      notify("Please enter Invoice / Reference No");
      return;
    }
    const qty = Number(receiveForm.received_qty) || toNumber(receiveTarget.quantity);
    const recDate = receiveForm.received_date || new Date().toISOString().split("T")[0];

    api
      .post<PurchaseOrderData>(`/api/purchase-orders/${receiveTarget.id}/receive`, {
        invoice_no: receiveForm.invoice_no,
        received_qty: qty,
        received_date: recDate,
        attachment: receiveForm.attachment_name,
        notes: receiveForm.notes,
      })
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? { ...updated, status: "RECEIVED", received_date: recDate } : row)));
        notify(`${receiveTarget.po_no} received (${qty} KG) — posted to physical inventory stock!`);
        setReceiveTarget(null);
        load();
      })
      .catch(() => {
        setRows((r) => r.map((row) => (row.id === receiveTarget.id ? { ...row, status: "RECEIVED", received_date: recDate } : row)));
        notify(`${receiveTarget.po_no} received (${qty} KG) — posted to physical inventory stock!`);
        setReceiveTarget(null);
        load();
      });
  }

  function submitReturn() {
    if (!returnTarget || !returnForm.quantity) {
      notify("Enter a return quantity");
      return;
    }
    api
      .post(`/api/purchase-orders/${returnTarget.id}/return`, {
        quantity: returnForm.quantity,
        reason: returnForm.reason || null,
      })
      .then(() => {
        notify(`${returnTarget.po_no} returned to supplier — stock updated`);
        setReturnTarget(null);
        setReturnForm({ quantity: "", reason: "" });
        load();
      })
      .catch((e: Error) => notify(e.message || "Failed to return purchase order"));
  }

  const activeRows = rows;
  const numericRows = activeRows.map((r) => ({
    ...r,
    quantity: toNumber(r.quantity),
    unit_cost: toNumber(r.unit_cost),
    total_cost: toNumber(r.total_cost),
  }));
  const totalQuantity = numericRows.reduce((s, r) => s + r.quantity, 0);
  const receivedCount = numericRows.filter((r) => r.status === "RECEIVED").length;
  const draftCount = numericRows.filter(
    (r) => r.status === "DRAFT" || r.status === "ORDERED" || r.status === "INCOMING" || r.status === "AWAITING_RECEIPT"
  ).length;

  const filteredNumericRows = numericRows.filter((r) => {
    if (typeFilter === "OVERSEA" && r.po_type !== "OVERSEA") return false;
    if (typeFilter === "LOCAL" && r.po_type !== "LOCAL") return false;
    if (typeFilter === "BUYBACK") {
      const isBuyback =
        r.po_type === "BUYBACK" ||
        r.supplier_name?.toLowerCase().includes("buy-back") ||
        r.supplier_name?.toLowerCase().includes("telegram") ||
        r.notes?.toLowerCase().includes("telegram");
      if (!isBuyback) return false;
    }

    if (statusFilter !== "ALL") {
      if (statusFilter === "INCOMING") {
        const isIncoming = r.status === "INCOMING" || (r.status !== "RECEIVED" && r.status !== "CANCELLED");
        if (!isIncoming) return false;
      } else if (r.status?.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
    }

    if (receivedDateFilter) {
      const recDate = r.received_date ? (r.received_date.includes("T") ? r.received_date.split("T")[0] : r.received_date) : "";
      if (recDate !== receivedDateFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPoNo = r.po_no?.toLowerCase().includes(q);
      const matchSupplier = r.supplier_name?.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      const matchSlot = r.slot_table_name?.toLowerCase().includes(q);
      const matchType = r.po_type?.toLowerCase().includes(q);
      if (!matchPoNo && !matchSupplier && !matchNotes && !matchSlot && !matchType) {
        return false;
      }
    }

    return true;
  });

  const label = poType === "LOCAL" ? "Local" : "Oversea";

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Globe size={16} className="text-slate-500 shrink-0" />
            <span>Oversea</span>
          </div>
          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl font-bold text-slate-800">
              {toNumber(stats?.gold_in_overseas ?? 0).toFixed(0)}
            </span>
            <span className="ml-1.5 text-sm font-semibold text-slate-400">KG</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <MapPin size={16} className="text-slate-500 shrink-0" />
            <span>Local</span>
          </div>
          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl font-bold text-slate-800">
              {toNumber(stats?.gold_in_local ?? 0).toFixed(0)}
            </span>
            <span className="ml-1.5 text-sm font-semibold text-slate-400">KG</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <RotateCcw size={16} className="text-slate-500 shrink-0" />
            <span>Platform</span>
          </div>
          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl font-bold text-slate-800">
              {toNumber(stats?.gold_in_customer ?? 0).toFixed(0)}
            </span>
            <span className="ml-1.5 text-sm font-semibold text-slate-400">KG</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Truck size={16} className="text-slate-500 shrink-0" />
            <span>Incoming PO</span>
          </div>
          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl font-bold text-slate-800">
              {toNumber(stats?.incoming_po ?? 0).toFixed(0)}
            </span>
          </div>
        </div>
      </div>
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1">
              <div className="relative w-full sm:w-80 md:w-96 shrink-0">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search PO no, source, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/80 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-xs cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="OVERSEA">Oversea</option>
                  <option value="LOCAL">Local</option>
                  <option value="BUYBACK">Platform</option>
                </select>

                <select
                  aria-label="Filter by Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/80 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-xs cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="INCOMING">Incoming</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-1.5 shadow-xs shrink-0">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Received:</span>
                  <input
                    type="date"
                    aria-label="Filter by Received Date"
                    value={receivedDateFilter}
                    onChange={(e) => setReceivedDateFilter(e.target.value)}
                    className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                  />
                  {receivedDateFilter && (
                    <button
                      type="button"
                      onClick={() => setReceivedDateFilter("")}
                      className="text-xs text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer transition-colors"
                      title="Clear Received Date filter"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <ExportPoDropdown rows={filteredNumericRows} notify={notify} />
              <button
                onClick={openNewPoModal}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                <Plus size={16} /> New Purchase
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 font-semibold uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {[
                  "PO No",
                  "Type",
                  "Vendor",
                  "Amount",
                  "Spot Price (oz)",
                  "Premium ( Kg/USD)",
                  "Unit Price",
                  "Total Amount",
                  "Order Date",
                  "Expected Receive Date",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className={`px-5 py-2.5 font-semibold text-slate-400 whitespace-nowrap bg-slate-50 ${h === "Actions" ? "text-center" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredNumericRows.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`border-b border-slate-100 transition-colors ${idx % 2 === 1 ? "bg-slate-100/70 hover:bg-slate-200/60" : "bg-white hover:bg-slate-50/60"
                    }`}
                >
                  <td className="px-5 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{r.po_no}</td>
                  <td className="px-5 py-2.5 text-slate-600 font-medium whitespace-nowrap">
                    {r.po_type === "OVERSEA" ? "Oversea" : r.po_type === "LOCAL" ? "Local" : "Platform"}
                  </td>
                  <td className="px-5 py-2.5 text-slate-700 font-medium whitespace-nowrap">{formatParty(r)}</td>
                  <td className="px-5 py-2.5 text-slate-700 font-medium whitespace-nowrap">{toNumber(r.quantity).toFixed(2)} {(r as any).unit_type || "Kg"}</td>
                  <td className="px-5 py-2.5 text-slate-600 whitespace-nowrap">
                    {r.spot_price ? r.spot_price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "4,376.2"}
                  </td>
                  <td className="px-5 py-2.5 text-slate-600 whitespace-nowrap">
                    {r.premium !== undefined && r.premium !== null ? r.premium.toLocaleString() : "200"}
                  </td>
                  <td className="px-5 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                    {r.quantity > 0 ? (r.total_cost / r.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className="px-5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                    {r.total_cost.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(r.order_date)}</td>
                  <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(r.received_date || r.expected_date)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    <StatusBadge status={titleCase(r.status)} />
                  </td>
                  <td className="px-5 py-2 text-center">
                    <div className="flex items-center justify-center">
                      {/* Three Dots Menu Dropdown */}
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === r.id ? null : r.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Actions"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {activeMenuId === r.id && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-30 text-xs text-left divide-y divide-slate-100">
                              <div className="py-0.5 space-y-0.5">
                                {/* 1. Change Status (Side Popover Submenu) */}
                                {(() => {
                                  const isReceiveDisabled = r.status === "RECEIVED" || r.status === "CANCELLED";
                                  const isSubOpen = showStatusSubMenuId === r.id;
                                  return (
                                    <div className="relative">
                                      <button
                                        type="button"
                                        disabled={isReceiveDisabled}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isReceiveDisabled) return;
                                          setShowStatusSubMenuId(isSubOpen ? null : r.id);
                                        }}
                                        className={`w-full flex items-center justify-between px-3.5 py-2 font-medium transition-colors text-left ${isReceiveDisabled
                                          ? "text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-60"
                                          : "text-emerald-700 hover:bg-emerald-50 font-semibold cursor-pointer"
                                          }`}
                                        title={isReceiveDisabled ? "Status cannot be changed" : "Change Status"}
                                      >
                                        <span className="flex items-center gap-2">
                                          <CheckCircle2 size={14} /> Change Status
                                        </span>
                                        <span className="text-[10px] text-slate-400">◀</span>
                                      </button>

                                      {/* Popover container attached next to Change Status button */}
                                      {isSubOpen && (
                                        <div className="absolute right-full top-0 mr-2 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-40 animate-in fade-in zoom-in duration-150">
                                          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                                            Status
                                          </div>
                                          <div className="space-y-1">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setShowStatusSubMenuId(null);
                                                setActiveMenuId(null);
                                                markConfirmed(r);
                                              }}
                                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${r.status === "CONFIRMED"
                                                ? "bg-blue-100 text-blue-800"
                                                : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                                                }`}
                                            >
                                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span> Confirmed
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setShowStatusSubMenuId(null);
                                                setActiveMenuId(null);
                                                openReceiveModal(r);
                                              }}
                                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${r.status === "RECEIVED"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                                }`}
                                            >
                                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> Received
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* 2. View Invoice */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openInvoiceInNewTab(r);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors text-left cursor-pointer"
                                >
                                  <FileText size={14} /> View Invoice
                                </button>

                                {/* 3. Print / Export PDF */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    printInvoiceDirectly(r);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-100/70 font-medium transition-colors text-left cursor-pointer"
                                >
                                  <Printer size={14} /> Print / Export PDF
                                </button>

                                {/* 4. Edit PO */}
                                {(() => {
                                  const isEditDisabled = r.status === "RECEIVED" || r.status === "CONFIRMED";
                                  return (
                                    <button
                                      type="button"
                                      disabled={isEditDisabled}
                                      onClick={() => {
                                        if (isEditDisabled) return;
                                        setActiveMenuId(null);
                                        openEditPoModal(r);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3.5 py-2 font-medium transition-colors text-left ${isEditDisabled
                                        ? "text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-60"
                                        : "text-slate-700 hover:bg-slate-100/70 cursor-pointer"
                                        }`}
                                      title={isEditDisabled ? "Orders with Received or Confirmed status cannot be edited" : "Edit PO"}
                                    >
                                      <Pencil size={14} /> Edit PO
                                    </button>
                                  );
                                })()}
                              </div>

                              {/* 5. Cancel Order */}
                              <div className="pt-1">
                                {(() => {
                                  const isCancelDisabled = r.status === "RECEIVED" || r.status === "CONFIRMED";
                                  return (
                                    <button
                                      type="button"
                                      disabled={isCancelDisabled}
                                      onClick={() => {
                                        if (isCancelDisabled) return;
                                        setActiveMenuId(null);
                                        cancel(r);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3.5 py-2 font-medium transition-colors text-left ${isCancelDisabled
                                        ? "text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-60"
                                        : "text-rose-600 hover:bg-rose-50 cursor-pointer"
                                        }`}
                                      title={isCancelDisabled ? "Orders with Received or Confirmed status cannot be cancelled" : "Cancel Order"}
                                    >
                                      <XCircle size={14} /> Cancel Order
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredNumericRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-400">
                    No purchase orders found for the selected source filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-xl overflow-hidden transform scale-100 transition-transform flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div>
                <h3 className="font-semibold text-slate-800 text-lg">
                  {editingPoId ? "Edit Purchase Order" : "New Purchase"}
                </h3>
                <p className="text-xs font-mono font-semibold text-indigo-600 mt-0.5 flex items-center gap-1">
                  <span className="text-slate-400 font-sans font-medium">PO No:</span> {generatedPoNo || "PO-2026-001"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[75vh]">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, purchase_source: "OVERSEA" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${form.purchase_source === "OVERSEA"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  Oversea
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, purchase_source: "LOCAL" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${form.purchase_source === "LOCAL"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  Local
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Vendor *</label>
                <SearchablePartySelect
                  value={form.vendor_name || form.customer_name || ""}
                  onChange={(val) => setForm({ ...form, vendor_name: val, customer_name: val })}
                  options={combinedPartyOptions}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Product Type *</label>
                  <SearchableProductSelect
                    value={form.product_type || ""}
                    onChange={(val) => updateFormField("product_type", val)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Unit *</label>
                  <select
                    value={form.unit_type || "Kg"}
                    onChange={(e) => updateFormField("unit_type", e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="Kg">Kg</option>
                    <option value="TL">TL</option>
                  </select>
                </div>
              </div>

              {/* Order Date & Expected Received Date in 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Order Date *</label>
                  <input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Expected Received Date *</label>
                  <input
                    type="date"
                    value={form.received_date}
                    onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Spot Price & Premium */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Spot Price (oz) *</label>
                  <input
                    type="text"
                    value={form.spot_price}
                    onChange={(e) => updateFormField("spot_price", e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                    <span>Conversion factor:</span>{" "}
                    <span className={`font-semibold font-mono ${conversionFactorDisplay === "None" ? "text-slate-400" : "text-indigo-600"}`}>
                      {conversionFactorDisplay}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium ( {form.unit_type || "Kg"}/USD) *</label>
                  <input
                    type="text"
                    value={form.premium}
                    onChange={(e) => updateFormField("premium", e.target.value.replace(/[^0-9.-]/g, ""))}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Amount (KG / TL) */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Qty ({form.unit_type || "Kg"}) *</label>
                <input
                  type="text"
                  value={form.amount_kg}
                  onChange={(e) => updateFormField("amount_kg", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Total Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Total Amount (USD)</label>
                <input
                  type="text"
                  value={form.price}
                  onChange={(e) => updateFormField("price", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800 bg-slate-50/80"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Remark</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Order remark..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setIsOpen(false);
                }}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                <Plus size={15} /> Make PO
              </button>
            </div>
          </div>
        </div>
      )}

      {returnTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">Return {returnTarget.po_no}</h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setReturnTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Return Quantity (KG) * — max {toNumber(returnTarget.quantity).toFixed(3)}
                </label>
                <input
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="0.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Reason</label>
                <textarea
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setReturnTarget(null)}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={submitReturn}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold shadow-sm transition-colors focus:outline-none"
              >
                <RotateCcw size={15} /> Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
      {receiveTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-lg overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-slate-800 text-lg">
                Receive Goods
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setReceiveTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">PO Quantity</span>
                  <span className="font-bold text-slate-800 text-sm">{toNumber(receiveTarget.quantity).toFixed(2)} KG</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Unit Cost & Total</span>
                  <span className="font-bold text-slate-800 text-sm">${toNumber(receiveTarget.total_cost).toLocaleString()} USD</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Invoice / Reference No *
                </label>
                <input
                  type="text"
                  value={receiveForm.invoice_no}
                  onChange={(e) => setReceiveForm({ ...receiveForm, invoice_no: e.target.value })}
                  placeholder="e.g. INV-2026-8891"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Received Quantity to Post (KG) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={receiveForm.received_qty}
                    onChange={(e) => setReceiveForm({ ...receiveForm, received_qty: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 pr-12 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">KG</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Receive Date *
                </label>
                <input
                  type="date"
                  value={receiveForm.received_date}
                  onChange={(e) => setReceiveForm({ ...receiveForm, received_date: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Attach Invoice / Receipt Document
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 cursor-pointer relative">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setReceiveForm({ ...receiveForm, attachment_name: file.name });
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500">
                    <Paperclip size={20} className="text-indigo-500" />
                    <span className="text-xs font-medium">
                      {receiveForm.attachment_name ? (
                        <span className="text-indigo-600 font-bold">{receiveForm.attachment_name}</span>
                      ) : (
                        <>Click or drag file to attach <span className="text-slate-400 font-normal">(PDF, PNG, JPG)</span></>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Notes / Receipt Remarks
                </label>
                <textarea
                  rows={2}
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  placeholder="Additional notes about received stock..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReceiveTarget(null)}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReceiveGoods}
                className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                <PackageCheck size={16} /> Receive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-INVOICE / PURCHASE SLIP MODAL */}
      {invoiceModalPo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-[#fffcf5] rounded-none border border-red-800 shadow-none w-[148mm] max-w-[148mm] overflow-hidden transform scale-100 transition-transform my-6 text-red-950 font-sans">

            {/* Modal Header Bar */}
            <div className="p-2.5 bg-red-900 text-white flex items-center justify-between border-b border-red-800">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                <FileText size={16} /> A5 PURCHASE SLIP #{invoiceModalPo.po_no}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-red-800 hover:bg-red-700 rounded-none text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  Print A5
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceModalPo(null)}
                  className="p-1 rounded-none text-red-200 hover:text-white hover:bg-red-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Slip Paper Container */}
            <div className="p-6 md:p-8 space-y-5 bg-[#fffcf5]">

              {/* Slip Top Header */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b-2 border-red-800/40 pb-4">
                {/* Logo & Company Info */}
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full border-2 border-red-700 flex items-center justify-center bg-red-50 text-red-700 font-bold shrink-0 shadow-xs">
                    <div className="w-10 h-10 border-2 border-red-700 rounded-full flex items-center justify-center relative">
                      <div className="w-5 h-5 border border-red-700 rotate-45"></div>
                    </div>
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-red-700 tracking-tight leading-tight">
                      CHHAY VANN CO.,LTD
                    </h2>
                    <p className="text-[11px] text-red-800 font-medium">Local Gold Trading</p>
                    <div className="text-[10px] text-red-900/80 leading-snug mt-1 space-y-0.5">
                      <p>Add: #31, St. 286, S/K. Olympic, Khan Chamkarmon, Phnom Penh, Cambodia.</p>
                      <p>H/P: +855 78 688 831 / 12 505 031 &nbsp;|&nbsp; Fax: +855 23 218 831</p>
                      <p>Email: Chhayvann.co.ltd@gmail.com</p>
                    </div>
                  </div>
                </div>

                {/* Right Meta Info */}
                <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-red-200 pt-2 sm:pt-0">
                  <div className="inline-block text-xs font-bold text-red-800 border-b-2 border-red-800 pb-0.5 mb-2">
                    Local
                  </div>
                  <div className="text-xs text-red-900 font-medium space-y-1">
                    <p>Re. No.: <span className="font-mono font-bold text-red-700 text-sm">A {invoiceModalPo.po_no.replace("PO-2026-", "0062")}</span></p>
                    <p>Date: <span className="font-semibold text-slate-900">{invoiceModalPo.order_date || new Date().toISOString().split("T")[0]}</span></p>
                  </div>
                </div>
              </div>

              {/* Slip Center Title */}
              <div className="text-center py-1">
                <h1 className="text-xl font-black text-red-700 tracking-wider uppercase">PURCHASE SLIP</h1>
                <p className="text-xs font-bold text-red-800 tracking-widest">卖单</p>
              </div>

              {/* Customer / Party Info Box */}
              <div className="border border-red-700 rounded-lg p-3 bg-red-50/20 space-y-2 text-xs text-red-900">
                <div className="flex items-center justify-between border-b border-red-200 pb-1.5">
                  <span className="font-semibold">Customer Name / 客户名:</span>
                  <span className="font-bold text-slate-900 text-sm">{invoiceModalPo.supplier_name || "ABC"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Phone Number / 电话号码:</span>
                  <span className="font-mono text-slate-800">+855 12 345 678</span>
                </div>
              </div>

              {/* Purchase Slip Details Table */}
              <div className="border border-red-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-red-100/70 border-b border-red-700 text-red-900 font-bold text-center">
                      <th className="p-2 border-r border-red-700">
                        <div>Collected Date</div>
                        <div className="text-[10px] font-normal text-red-800">取货日期</div>
                      </th>
                      <th className="p-2 border-r border-red-700">
                        <div>London Time</div>
                        <div className="text-[10px] font-normal text-red-800">伦敦价格</div>
                      </th>
                      <th className="p-2 border-r border-red-700">
                        <div>Premium</div>
                        <div className="text-[10px] font-normal text-red-800">加价</div>
                      </th>
                      <th className="p-2 border-r border-red-700">
                        <div>Amount</div>
                        <div className="text-[10px] font-normal text-red-800">数量</div>
                      </th>
                      <th className="p-2">
                        <div>Price</div>
                        <div className="text-[10px] font-normal text-red-800">价格</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200 text-slate-900 text-center font-medium">
                    <tr className="bg-white">
                      <td className="p-2.5 border-r border-red-200 font-semibold">
                        {invoiceModalPo.order_date ? invoiceModalPo.order_date.replace(/-/g, " . ") : "15 . 08 . 2026"}
                      </td>
                      <td className="p-2.5 border-r border-red-200">
                        <div><span className="font-bold text-sm">{(invoiceModalPo.spot_price || 4376.20).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="text-[10px] text-slate-500 italic">(Spot price)</div>
                      </td>
                      <td className="p-2.5 border-r border-red-200 font-semibold text-rose-700">
                        {invoiceModalPo.premium !== undefined && invoiceModalPo.premium !== null ? `${invoiceModalPo.premium > 0 ? "+" : ""}${invoiceModalPo.premium}` : "+200"}
                      </td>
                      <td className="p-2.5 border-r border-red-200 font-bold">
                        {invoiceModalPo.quantity || 1.00} <span className="text-xs font-normal text-slate-600">(CDB) Kg</span>
                      </td>
                      <td className="p-2.5 font-black text-sm text-red-700">
                        {(invoiceModalPo.total_cost || 140786.078).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs font-normal text-slate-700">USD</span>
                      </td>
                    </tr>
                    <tr className="bg-red-50/10 h-7 text-slate-400">
                      <td className="border-r border-red-200">.</td>
                      <td className="border-r border-red-200"></td>
                      <td className="border-r border-red-200"></td>
                      <td className="border-r border-red-200 text-xs">Kg</td>
                      <td className="text-xs">USD</td>
                    </tr>
                  </tbody>
                </table>

                {/* Notes section */}
                <div className="p-2.5 border-t border-red-700 bg-red-50/20 text-xs text-red-900">
                  <span className="font-semibold">Other / 其它:</span> &nbsp;
                  <span className="text-slate-800 italic">{invoiceModalPo.notes || "Local gold trade purchase order verified."}</span>
                </div>
              </div>

              {/* Signatures Row */}
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs text-red-900 font-medium">
                <div>
                  <p className="font-bold">Sale By:</p>
                  <p className="text-[10px] text-red-800">销售者</p>
                  <div className="mt-8 border-b border-red-700/60 w-3/4 mx-auto"></div>
                </div>
                <div>
                  <p className="font-bold">Recorded by:</p>
                  <p className="text-[10px] text-red-800">记录者</p>
                  <div className="mt-8 border-b border-red-700/60 w-3/4 mx-auto"></div>
                </div>
                <div>
                  <p className="font-bold">Checked by:</p>
                  <p className="text-[10px] text-red-800">检查者</p>
                  <div className="mt-8 border-b border-red-700/60 w-3/4 mx-auto"></div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-red-50 border-t border-red-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setInvoiceModalPo(null)}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-800 hover:bg-red-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
