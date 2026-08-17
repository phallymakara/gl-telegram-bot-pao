import { Eye, FileText, MoreHorizontal, Package, Pencil, PhoneCall, Plus, Printer, RotateCcw, Send, ShoppingCart, Store, Trash2, Truck, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import { api, OrderData, DashboardStatsData, toNumber } from "../data/api";

interface PlatformOrdersPageProps {
  notify: (msg: string) => void;
}

export default function PlatformOrdersPage({
  notify,
}: PlatformOrdersPageProps) {
  const [rows, setRows] = useState<OrderData[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Order status");
  const [returnTarget, setReturnTarget] = useState<OrderData | null>(null);
  const [returnForm, setReturnForm] = useState({ quantity: "", reason: "" });
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<OrderData | null>(null);
  const [incomingDate, setIncomingDate] = useState(new Date().toISOString().split("T")[0]);
  const [newOrderForm, setNewOrderForm] = useState({
    customer_name: "",
    channel: "Walk-in",
    spot_price: "",
    quantity: "",
    premium: "",
    notes: "",
  });

  const [stats, setStats] = useState<DashboardStatsData | null>(null);

  const load = () => {
    api
      .get<OrderData[]>("/api/orders/?order_type=SELL")
      .then(setRows)
      .catch(() => notify("Failed to load orders"));
    api
      .get<DashboardStatsData>(`/api/dashboard/stats?target_date=${incomingDate}`)
      .then(setStats)
      .catch(() => { });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [incomingDate]);

  function cancelOrder(o: OrderData) {
    api
      .post<OrderData>(`/api/orders/${o.id}/cancel`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${o.order_no} cancelled`);
        load();
      })
      .catch((e: Error) => notify(e.message || "Failed to cancel order"));
  }

  function submitReturn() {
    if (!returnTarget || !returnForm.quantity) {
      notify("Enter a return quantity");
      return;
    }
    api
      .post(`/api/orders/${returnTarget.id}/return`, {
        quantity: returnForm.quantity,
        reason: returnForm.reason || null,
      })
      .then(() => {
        notify(`${returnTarget.order_no} returned — stock updated`);
        setReturnTarget(null);
        setReturnForm({ quantity: "", reason: "" });
        load();
      })
      .catch((e: Error) => notify(e.message || "Failed to return order"));
  }

  function printPlatformInvoiceDirectly(order: any) {
    const orderDate = order.order_date ? order.order_date.replace(/-/g, " . ") : "15 . 08 . 2026";
    const refNo = "B " + (order.order_no ? order.order_no.replace("SO-2026-", "0088") : "0088");
    const spotPrice = (order.spot_price || 4376.50).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const premiumVal = order.premium !== undefined && order.premium !== null ? `${order.premium > 0 ? "+" : ""}${order.premium}` : "+200";
    const qtyVal = order.quantity || 1.00;
    const totalCost = (order.total_amount || 140986.00).toLocaleString(undefined, { minimumFractionDigits: 2 });

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
        <title>Print Sales Slip - ${order.order_no}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A5; margin: 0; }
          body { background: white; padding: 0; margin: 0; }
          .invoice-card { width: 148mm; min-height: 210mm; p: 20px; box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div class="invoice-card bg-white border border-indigo-600 text-slate-900 font-sans space-y-4 p-5">
          <div class="flex flex-row items-start justify-between border-b-2 border-indigo-600 pb-3">
            <div class="flex items-start gap-2.5">
              <div class="w-11 h-11 rounded-full border-2 border-indigo-600 flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold shrink-0">
                <div class="w-8 h-8 border-2 border-indigo-600 rounded-full flex items-center justify-center">
                  <div class="w-4 h-4 border border-indigo-600 rotate-45"></div>
                </div>
              </div>
              <div>
                <h2 class="font-black text-base text-indigo-700 tracking-tight leading-tight">CHHAY VANN CO.,LTD</h2>
                <p class="text-[10px] text-indigo-800 font-bold">Physical Gold Trading</p>
                <div class="text-[9px] text-slate-500 leading-snug mt-0.5 space-y-0.5">
                  <p>Add: #31, St. 286, S/K. Olympic, Phnom Penh, Cambodia.</p>
                  <p>H/P: +855 78 688 831 / 12 505 031 &nbsp;|&nbsp; Fax: +855 23 218 831</p>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="inline-block text-[10px] font-bold text-indigo-800 border-b border-indigo-800 pb-0.5 mb-1">Physical</div>
              <div class="text-[11px] text-slate-700 font-medium space-y-0.5">
                <p>Re. No.: <span class="font-mono font-bold text-indigo-700 text-xs">${refNo}</span></p>
                <p>Date: <span class="font-semibold text-slate-900 text-xs">${order.order_date || new Date().toISOString().split("T")[0]}</span></p>
              </div>
            </div>
          </div>

          <div class="text-center py-0.5">
            <h1 class="text-base font-black text-indigo-700 tracking-wider uppercase">SALES INVOICE</h1>
            <p class="text-[10px] font-bold text-indigo-600 tracking-widest">买单</p>
          </div>

          <div class="border border-indigo-200 rounded-none p-2.5 bg-indigo-50/20 space-y-1.5 text-xs text-slate-800">
            <div class="flex items-center justify-between border-b border-indigo-100 pb-1">
              <span class="font-semibold text-slate-500">Customer Name:</span>
              <span class="font-bold text-slate-900 text-xs">${order.customer_name || "Client"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-500">Channel / Platform:</span>
              <span class="font-semibold text-indigo-700 text-xs">${order.order_source || "Telegram"}</span>
            </div>
          </div>

          <div class="border border-slate-200 rounded-none overflow-hidden">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-indigo-50 border-b border-slate-200 text-indigo-900 font-bold text-center">
                  <th class="p-1.5 border-r border-slate-200">Date</th>
                  <th class="p-1.5 border-r border-slate-200">London Spot</th>
                  <th class="p-1.5 border-r border-slate-200">Premium</th>
                  <th class="p-1.5 border-r border-slate-200">Quantity</th>
                  <th class="p-1.5">Total Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 text-slate-900 text-center font-medium">
                <tr class="bg-white">
                  <td class="p-2 border-r border-slate-200 font-semibold">${orderDate}</td>
                  <td class="p-2 border-r border-slate-200"><span class="font-bold text-xs">${spotPrice}</span></td>
                  <td class="p-2 border-r border-slate-200 font-semibold text-emerald-700">${premiumVal}</td>
                  <td class="p-2 border-r border-slate-200 font-bold">${qtyVal} <span class="text-[10px] font-normal text-slate-500">Kg</span></td>
                  <td class="p-2 font-black text-xs text-indigo-700">${totalCost} <span class="text-[10px] font-normal text-slate-600">USD</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid grid-cols-3 gap-3 pt-4 text-center text-xs text-slate-700 font-medium">
            <div><p class="font-bold">Sales Agent:</p><div class="mt-6 border-b border-slate-300 w-3/4 mx-auto"></div></div>
            <div><p class="font-bold">Authorized By:</p><div class="mt-6 border-b border-slate-300 w-3/4 mx-auto"></div></div>
            <div><p class="font-bold">Received By:</p><div class="mt-6 border-b border-slate-300 w-3/4 mx-auto"></div></div>
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

  function openPlatformInvoiceInNewTab(order: any) {
    const orderDate = order.order_date ? order.order_date.replace(/-/g, " . ") : "15 . 08 . 2026";
    const refNo = "B " + (order.order_no ? order.order_no.replace("SO-2026-", "0088") : "0088");
    const spotPrice = (order.spot_price || 4376.50).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const premiumVal = order.premium !== undefined && order.premium !== null ? `${order.premium > 0 ? "+" : ""}${order.premium}` : "+200";
    const qtyVal = order.quantity || 1.00;
    const totalCost = (order.total_amount || 140986.00).toLocaleString(undefined, { minimumFractionDigits: 2 });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sales Slip - ${order.order_no}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A5; margin: 0; }
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; padding: 0 !important; }
            .invoice-card { shadow: none !important; border: 1px solid #4338ca !important; box-shadow: none !important; }
          }
        </style>
      </head>
      <body class="bg-slate-200 min-h-screen p-4 md:p-6 flex flex-col items-center justify-start text-slate-800">
        
        <!-- Top Action Bar -->
        <div class="no-print w-full max-w-[148mm] flex items-center justify-between bg-white p-3 rounded-none border border-slate-300 mb-4">
          <span class="text-xs font-bold text-slate-700">A5 Sales Invoice — ${order.order_no}</span>
          <div class="flex items-center gap-2">
            <button onclick="window.print()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1">
              <span>🖨️</span> Print A5
            </button>
            <button onclick="window.close()" class="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-none text-xs font-bold transition-colors cursor-pointer">
              ✕ Close
            </button>
          </div>
        </div>

        <!-- A5 Sheet Container (148mm x 210mm) -->
        <div class="invoice-card bg-white border border-indigo-600 rounded-none w-[148mm] min-h-[210mm] p-5 space-y-4 text-slate-900 box-border">
          <!-- Slip Header -->
          <div class="flex flex-row items-start justify-between border-b-2 border-indigo-600 pb-3">
            <div class="flex items-start gap-2.5">
              <div class="w-11 h-11 rounded-full border-2 border-indigo-600 flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold shrink-0">
                <div class="w-8 h-8 border-2 border-indigo-600 rounded-full flex items-center justify-center">
                  <div class="w-4 h-4 border border-indigo-600 rotate-45"></div>
                </div>
              </div>
              <div>
                <h2 class="font-black text-base text-indigo-700 tracking-tight leading-tight">
                  CHHAY VANN CO.,LTD
                </h2>
                <p class="text-[10px] text-indigo-800 font-bold">Physical Gold Trading</p>
                <div class="text-[9px] text-slate-500 leading-snug mt-0.5 space-y-0.5">
                  <p>Add: #31, St. 286, S/K. Olympic, Phnom Penh, Cambodia.</p>
                  <p>H/P: +855 78 688 831 / 12 505 031 &nbsp;|&nbsp; Fax: +855 23 218 831</p>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="inline-block text-[10px] font-bold text-indigo-800 border-b border-indigo-800 pb-0.5 mb-1">
                Physical
              </div>
              <div class="text-[11px] text-slate-700 font-medium space-y-0.5">
                <p>Re. No.: <span class="font-mono font-bold text-indigo-700 text-xs">${refNo}</span></p>
                <p>Date: <span class="font-semibold text-slate-900 text-xs">${order.order_date || new Date().toISOString().split("T")[0]}</span></p>
              </div>
            </div>
          </div>

          <!-- Title -->
          <div class="text-center py-0.5">
            <h1 class="text-base font-black text-indigo-700 tracking-wider uppercase">SALES INVOICE</h1>
            <p class="text-[10px] font-bold text-indigo-600 tracking-widest">买单</p>
          </div>

          <!-- Customer Box -->
          <div class="border border-indigo-200 rounded-none p-2.5 bg-indigo-50/20 space-y-1.5 text-xs text-slate-800">
            <div class="flex items-center justify-between border-b border-indigo-100 pb-1">
              <span class="font-semibold text-slate-500">Customer Name:</span>
              <span class="font-bold text-slate-900 text-xs">${order.customer_name || "Client"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-500">Channel / Platform:</span>
              <span class="font-semibold text-indigo-700 text-xs">${order.order_source || "Telegram"}</span>
            </div>
          </div>

          <!-- Items Table -->
          <div class="border border-slate-200 rounded-none overflow-hidden">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-indigo-50 border-b border-slate-200 text-indigo-900 font-bold text-center">
                  <th class="p-1.5 border-r border-slate-200">Date</th>
                  <th class="p-1.5 border-r border-slate-200">London Spot</th>
                  <th class="p-1.5 border-r border-slate-200">Premium</th>
                  <th class="p-1.5 border-r border-slate-200">Quantity</th>
                  <th class="p-1.5">Total Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 text-slate-900 text-center font-medium">
                <tr class="bg-white">
                  <td class="p-2 border-r border-slate-200 font-semibold">${orderDate}</td>
                  <td class="p-2 border-r border-slate-200"><span class="font-bold text-xs">${spotPrice}</span></td>
                  <td class="p-2 border-r border-slate-200 font-semibold text-emerald-700">${premiumVal}</td>
                  <td class="p-2 border-r border-slate-200 font-bold">${qtyVal} <span class="text-[10px] font-normal text-slate-500">Kg</span></td>
                  <td class="p-2 font-black text-xs text-indigo-700">${totalCost} <span class="text-[10px] font-normal text-slate-600">USD</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Signatures -->
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

  function submitNewSellOrder() {
    if (!newOrderForm.customer_name.trim()) {
      notify("Please enter Customer Name");
      return;
    }
    if (!newOrderForm.quantity || Number(newOrderForm.quantity) <= 0) {
      notify("Please enter a valid Quantity");
      return;
    }

    const qty = Number(newOrderForm.quantity);
    const prem = Number(newOrderForm.premium) || 0;
    const spotPrice = Number(newOrderForm.spot_price) || 4376.50;
    const unitPrice = (spotPrice * 32.148) + prem;
    const totalAmount = qty * unitPrice;

    if (editingOrder !== null) {
      api
        .put<OrderData>(`/api/orders/${editingOrder.id}`, {
          customer_name: newOrderForm.customer_name,
          channel: newOrderForm.channel.toUpperCase().replace("-", "_"),
          spot_price: spotPrice,
          quantity: qty,
          premium: prem,
          total_amount: totalAmount,
          transaction_type: "SELL",
        })
        .then((updated) => {
          setRows((rs) => rs.map((row) => (row.id === editingOrder.id ? updated : row)));
          notify("Order updated successfully!");
          setEditingOrder(null);
          load();
        })
        .catch((e: Error) => notify(e.message || "Failed to update order"));
    } else {
      api
        .post<OrderData>("/api/orders/", {
          transaction_type: "SELL",
          customer_name: newOrderForm.customer_name,
          channel: newOrderForm.channel.toUpperCase().replace("-", "_"),
          spot_price: spotPrice,
          quantity: qty,
          premium: prem,
          total_amount: totalAmount,
        })
        .then((created) => {
          setRows((rs) => [created, ...rs]);
          notify("New sell order created!");
          load();
        })
        .catch((e: Error) => notify(e.message || "Failed to create order"));
    }

    setNewOrderForm({
      customer_name: "",
      channel: "Walk-in",
      spot_price: "",
      quantity: "",
      premium: "",
      notes: "",
    });
    setIsNewOrderModalOpen(false);
  }

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const mq =
        !q ||
        r.order_no.toLowerCase().includes(q.toLowerCase()) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q.toLowerCase()));
      const ms = status === "Order status" || r.status === status;
      return mq && ms;
    });
  }, [rows, q, status]);

  return (
    <div
      className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0 h-full"
      onClick={() => setActiveMenuId(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-shrink-0">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Package size={16} className="text-slate-500 shrink-0" />
            <span>Current Physical Stock</span>
          </div>
          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl font-bold text-slate-800">{toNumber(stats?.physical_stock ?? 0).toFixed(1)}</span>
            <span className="ml-1.5 text-sm font-semibold text-slate-400">KG</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2.5">
            <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
              <Truck size={16} className="text-slate-500 shrink-0" />
              <span>Incoming Gold</span>
            </div>
            <input
              type="date"
              aria-label="Incoming date filter"
              value={incomingDate}
              onChange={(e) => setIncomingDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-200 items-center">
            {/* Left Side: Incoming */}
            <div className="pr-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Incoming
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-slate-800">{toNumber(stats?.incoming_po ?? 0).toFixed(1)}</span>
                <span className="ml-1.5 text-sm font-semibold text-slate-400">KG</span>
              </div>
            </div>

            {/* Right Side: Remaining */}
            <div className="pl-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Remaining
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-slate-800">
                  {toNumber(stats?.remaining_incoming ?? 0).toFixed(1)}
                </span>
                <span className="ml-1.5 text-sm font-semibold text-slate-400">KG</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden h-full">
        <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-full sm:w-64 max-w-xs shrink-0">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search order no, customer..."
            />
          </div>
          <select
            aria-label="Order status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-600 focus:outline-none"
          >
            {[
              "Order status",
              "COMPLETED",
              "PENDING",
              "CONFIRMED",
              "CANCELLED",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-sm transition-colors focus:outline-none sm:ml-auto cursor-pointer"
          >
            <Plus size={16} /> New Sell Orders
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {[
                  "Order No",
                  "Customer",
                  "Channel",
                  "Qty",
                  "Premium",
                  "Total",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3 font-medium bg-slate-50 whitespace-nowrap ${h === "Actions" ? "text-center" : ""
                      }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r: OrderData, idx: number) => {
                const quantity = toNumber(r.quantity);
                const premium = toNumber(r.premium);
                const premiumAmount = toNumber(r.premium_amount);
                const rawChannel = (r.channel || "").toUpperCase();
                let displayChannel = "WALK_IN";
                if (rawChannel === "TELEGRAM" || Boolean(r.telegram_user_id)) {
                  displayChannel = "TELEGRAM";
                } else if (rawChannel === "PHONE") {
                  displayChannel = "PHONE";
                } else if (rawChannel === "WALK_IN" || rawChannel === "WALKIN" || rawChannel === "WALK-IN") {
                  displayChannel = "WALK_IN";
                }

                return (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {r.order_no}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      {r.customer_name || "—"}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {displayChannel === "TELEGRAM" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                          <Send size={12} className="shrink-0 text-sky-600" /> Telegram Bot
                        </span>
                      ) : displayChannel === "PHONE" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                          <PhoneCall size={12} className="shrink-0 text-purple-600" /> Phone
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          <Store size={12} className="shrink-0 text-amber-600" /> Walk-in
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      {quantity.toFixed(2)} KG
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      ${premium.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                      ${(premiumAmount || (quantity * (2700 + premium))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={
                          r.status.charAt(0) + r.status.slice(1).toLowerCase()
                        }
                      />
                    </td>
                    <td className="px-5 py-3.5 text-center relative">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === r.id ? null : r.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                          title="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {activeMenuId === r.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-30 text-xs text-left divide-y divide-slate-100">
                            <div className="py-0.5 space-y-0.5">
                              {/* 1. View Invoice */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  openPlatformInvoiceInNewTab(r);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors cursor-pointer"
                              >
                                <FileText size={14} /> View Invoice
                              </button>

                              {/* 2. Print / Export PDF */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  printPlatformInvoiceDirectly(r);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-100/70 font-medium transition-colors cursor-pointer"
                              >
                                <Printer size={14} /> Print / Export PDF
                              </button>

                              {/* 3. Edit Order */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  setEditingOrder(r);
                                  setNewOrderForm({
                                    customer_name: r.customer_name || "",
                                    channel: r.channel || "Walk-in",
                                    spot_price: String(r.spot_price || "4376.50"),
                                    quantity: String(r.quantity),
                                    premium: String(r.premium),
                                    notes: "",
                                  });
                                  setIsNewOrderModalOpen(true);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-100/70 font-medium transition-colors cursor-pointer"
                              >
                                <Pencil size={14} /> Edit Order
                              </button>
                            </div>

                            {/* 4. Cancel Order (Disabled if COMPLETED) */}
                            <div className="pt-1">
                              <button
                                type="button"
                                disabled={r.status === "COMPLETED"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (r.status === "COMPLETED") return;
                                  setActiveMenuId(null);
                                  cancelOrder(r);
                                }}
                                className={`w-full flex items-center gap-2 px-3.5 py-2 font-medium transition-colors ${r.status === "COMPLETED"
                                    ? "text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-60"
                                    : "text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  }`}
                              >
                                <XCircle size={14} /> Cancel Order
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {returnTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">Return {returnTarget.order_no}</h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setReturnTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <X size={18} />
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

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingOrder !== null ? `Edit Order (${editingOrder.order_no})` : "Create New Sell Order"}
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setIsNewOrderModalOpen(false);
                  setEditingOrder(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Customer Name *</label>
                <input
                  type="text"
                  value={newOrderForm.customer_name}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_name: e.target.value })}
                  placeholder="fill customer name"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Channel</label>
                <select
                  value={newOrderForm.channel}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, channel: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Walk-in">Walk-in</option>
                  <option value="Phone">Phone</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Spot Price *</label>
                  <input
                    type="text"
                    value={newOrderForm.spot_price}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, spot_price: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="input spot price"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Conversion factor: 32.148</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium *</label>
                  <input
                    type="text"
                    value={newOrderForm.premium}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, premium: e.target.value.replace(/[^0-9.-]/g, "") })}
                    placeholder="input premium"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Amount (KG) *</label>
                <input
                  type="text"
                  value={newOrderForm.quantity}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="1.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Order Notes</label>
                <textarea
                  rows={2}
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  placeholder="Optional delivery or customer notes..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNewSellOrder}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                <Plus size={16} /> Create Sell Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-INVOICE / SALE SLIP MODAL (BLUE THEME) */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-none border border-indigo-600 shadow-none w-[148mm] max-w-[148mm] overflow-hidden transform scale-100 transition-transform my-6 text-blue-950 font-sans">

            {/* Modal Header Bar */}
            <div className="p-2.5 bg-indigo-900 text-white flex items-center justify-between border-b border-indigo-800">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                <FileText size={16} /> A5 SALE SLIP #{invoiceModalOrder.order_no}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 rounded-none text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  Print A5
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceModalOrder(null)}
                  className="p-1 rounded-none text-indigo-200 hover:text-white hover:bg-indigo-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Slip Paper Container */}
            <div className="p-6 md:p-8 space-y-5 bg-[#f4f7fc]">

              {/* Slip Top Header */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b-2 border-blue-800/40 pb-4">
                {/* Logo & Company Info */}
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full border-2 border-blue-700 flex items-center justify-center bg-blue-50 text-blue-700 font-bold shrink-0 shadow-xs">
                    <div className="w-10 h-10 border-2 border-blue-700 rounded-full flex items-center justify-center relative">
                      <div className="w-5 h-5 border border-blue-700 rotate-45"></div>
                    </div>
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-blue-700 tracking-tight leading-tight">
                      CHHAY VANN CO.,LTD
                    </h2>
                    <p className="text-[11px] text-blue-800 font-medium">Physical Gold Trading</p>
                    <div className="text-[10px] text-blue-900/80 leading-snug mt-1 space-y-0.5">
                      <p>Add: #31, St. 286, S/K. Olympic, Khan Chamkarmon, Phnom Penh, Cambodia.</p>
                      <p>H/P: +855 78 688 831 / 12 505 031 &nbsp;|&nbsp; Fax: +855 23 218 831</p>
                      <p>Email: Chhayvann.co.ltd@gmail.com</p>
                    </div>
                  </div>
                </div>

                {/* Right Meta Info */}
                <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-blue-200 pt-2 sm:pt-0">
                  <div className="inline-block text-xs font-bold text-blue-800 border-b-2 border-blue-800 pb-0.5 mb-2">
                    Physical
                  </div>
                  <div className="text-xs text-blue-900 font-medium space-y-1">
                    <p>Re No.: <span className="font-mono font-bold text-blue-700 text-sm">A {invoiceModalOrder.order_no.replace("SO-2026-", "0311")}</span></p>
                    <p>Date: <span className="font-semibold text-slate-900">{invoiceModalOrder.order_date || new Date().toISOString().split("T")[0]}</span></p>
                  </div>
                </div>
              </div>

              {/* Slip Center Title */}
              <div className="text-center py-1">
                <h1 className="text-xl font-black text-blue-700 tracking-wider uppercase">SALE SLIP</h1>
                <p className="text-xs font-bold text-blue-800 tracking-widest">买单</p>
              </div>

              {/* Customer / Party Info Box */}
              <div className="border border-blue-700 rounded-lg p-3 bg-blue-50/40 space-y-2 text-xs text-blue-900">
                <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
                  <span className="font-semibold">Customer Name / 客户名:</span>
                  <span className="font-bold text-slate-900 text-sm">{invoiceModalOrder.customer_name || "ABC"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Phone Number / 电话号码:</span>
                  <span className="font-mono text-slate-800">+855 12 345 678</span>
                </div>
              </div>

              {/* Sale Slip Details Table */}
              <div className="border border-blue-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-100/70 border-b border-blue-700 text-blue-900 font-bold text-center">
                      <th className="p-2 border-r border-blue-700">
                        <div>Collected Date</div>
                        <div className="text-[10px] font-normal text-blue-800">取货日期</div>
                      </th>
                      <th className="p-2 border-r border-blue-700">
                        <div>London Time</div>
                        <div className="text-[10px] font-normal text-blue-800">伦敦价格</div>
                      </th>
                      <th className="p-2 border-r border-blue-700">
                        <div>Premium</div>
                        <div className="text-[10px] font-normal text-blue-800">加价</div>
                      </th>
                      <th className="p-2 border-r border-blue-700">
                        <div>Amount</div>
                        <div className="text-[10px] font-normal text-blue-800">数量</div>
                      </th>
                      <th className="p-2">
                        <div>Price</div>
                        <div className="text-[10px] font-normal text-blue-800">价格</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-200 text-slate-900 text-center font-medium">
                    <tr className="bg-white">
                      <td className="p-2.5 border-r border-blue-200 font-semibold">
                        {invoiceModalOrder.order_date ? invoiceModalOrder.order_date.replace(/-/g, " . ") : "15 . 08 . 2026"}
                      </td>
                      <td className="p-2.5 border-r border-blue-200">
                        <div><span className="font-bold text-sm">4,376.50</span></div>
                        <div className="text-[10px] text-slate-500 italic">(Spot Price)</div>
                      </td>
                      <td className="p-2.5 border-r border-blue-200 font-semibold text-blue-700">
                        +{invoiceModalOrder.premium || 200}
                      </td>
                      <td className="p-2.5 border-r border-blue-200 font-bold">
                        {invoiceModalOrder.quantity || 1.00} <span className="text-xs font-normal text-slate-600">(CDB) Kg</span>
                      </td>
                      <td className="p-2.5 font-black text-sm text-blue-700">
                        {(invoiceModalOrder.total_amount || 130000).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-700">USD</span>
                      </td>
                    </tr>
                    <tr className="bg-blue-50/10 h-7 text-slate-400">
                      <td className="border-r border-blue-200">.</td>
                      <td className="border-r border-blue-200"></td>
                      <td className="border-r border-blue-200"></td>
                      <td className="border-r border-blue-200 text-xs">Kg</td>
                      <td className="text-xs">USD</td>
                    </tr>
                  </tbody>
                </table>

                {/* Notes section */}
                <div className="p-2.5 border-t border-blue-700 bg-blue-50/30 text-xs text-blue-900">
                  <span className="font-semibold">Other / 其它:</span> &nbsp;
                  <span className="text-slate-800 italic">Physical gold sale order completed.</span>
                </div>
              </div>

              {/* Signatures Row */}
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs text-blue-900 font-medium">
                <div>
                  <p className="font-bold">Sale by:</p>
                  <p className="text-[10px] text-blue-800">销售者</p>
                  <div className="mt-8 border-b border-blue-700/60 w-3/4 mx-auto"></div>
                </div>
                <div>
                  <p className="font-bold">Recorded by:</p>
                  <p className="text-[10px] text-blue-800">记录者</p>
                  <div className="mt-8 border-b border-blue-700/60 w-3/4 mx-auto"></div>
                </div>
                <div>
                  <p className="font-bold">Checked by:</p>
                  <p className="text-[10px] text-blue-800">检查者</p>
                  <div className="mt-8 border-b border-blue-700/60 w-3/4 mx-auto"></div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-blue-50 border-t border-blue-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setInvoiceModalOrder(null)}
                className="px-4 py-2 rounded-lg border border-blue-300 text-blue-800 hover:bg-blue-100 font-semibold text-xs transition-colors cursor-pointer"
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
