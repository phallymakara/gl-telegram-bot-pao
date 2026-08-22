/**
 * @file deliveryInvoice.ts
 * @description Generates and prints professional A5 printable Delivery Note & Invoice documents,
 * highlighting full/partial delivery quantities and payment settlement statuses.
 */

import { DeliveryNoteDetailItem, DeliveryNoteItem } from "../api";

export function openDeliveryInvoiceInNewTab(delivery: DeliveryNoteDetailItem | DeliveryNoteItem) {
  const dispatchDate = delivery.dispatch_date
    ? delivery.dispatch_date.replace(/-/g, " . ")
    : new Date().toISOString().split("T")[0].replace(/-/g, " . ");

  const deliveredQty = Number(delivery.gold_quantity) || 0;
  const orderQty = Number(delivery.order_quantity) || deliveredQty;
  const remainQty = Math.max(0, orderQty - deliveredQty);
  const isFullyDelivered = remainQty <= 0.0001;

  const amountOwed = Number(delivery.amount_owed) || 0;
  const amountPaid = Number(delivery.amount_paid) || 0;
  const outstanding = Number(delivery.outstanding_balance) || 0;
  const isFullyPaid = outstanding <= 0.01;

  const payments = (delivery as DeliveryNoteDetailItem).payments || [];

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Note & Invoice - ${delivery.delivery_no}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page { size: A5; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .invoice-card { box-shadow: none !important; border: 1px solid #4338ca !important; }
        }
      </style>
    </head>
    <body class="bg-slate-200 min-h-screen p-4 md:p-6 flex flex-col items-center justify-start text-slate-800 font-sans">
      
      <!-- Top Action Bar -->
      <div class="no-print w-full max-w-[148mm] flex items-center justify-between bg-white p-3 border border-slate-300 mb-4 shadow-sm">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-800">Delivery Note Invoice — ${delivery.delivery_no}</span>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.print()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 rounded-sm">
            <span>🖨️</span> Print A5
          </button>
          <button onclick="window.close()" class="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer rounded-sm">
            ✕ Close
          </button>
        </div>
      </div>

      <!-- A5 Sheet Container (148mm x 210mm) -->
      <div class="invoice-card bg-white border-2 border-indigo-700 w-[148mm] min-h-[210mm] p-5 space-y-3.5 text-slate-900 box-border shadow-lg">
        <!-- Slip Header -->
        <div class="flex flex-row items-start justify-between border-b-2 border-indigo-700 pb-2.5">
          <div class="flex items-start gap-2.5">
            <div class="w-10 h-10 rounded-full border-2 border-indigo-700 flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold shrink-0">
              <div class="w-7 h-7 border border-indigo-700 rounded-full flex items-center justify-center">
                <div class="w-3.5 h-3.5 border border-indigo-700 rotate-45"></div>
              </div>
            </div>
            <div>
              <h2 class="font-black text-sm text-indigo-800 tracking-tight leading-tight">
                CHHAY VANN CO.,LTD
              </h2>
              <p class="text-[9px] text-indigo-900 font-bold">Physical Gold Trading & Dispatch</p>
              <div class="text-[8.5px] text-slate-500 leading-snug mt-0.5 space-y-0.2">
                <p>Add: #31, St. 286, S/K. Olympic, Phnom Penh, Cambodia.</p>
                <p>H/P: +855 78 688 831 / 12 505 031 &nbsp;|&nbsp; Fax: +855 23 218 831</p>
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="inline-block text-[9px] font-bold text-indigo-800 border-b border-indigo-800 pb-0.5 mb-1">
              Physical Dispatch
            </div>
            <div class="text-[10px] text-slate-700 font-medium space-y-0.5">
              <p>DO No.: <span class="font-mono font-bold text-indigo-800 text-xs">${delivery.delivery_no}</span></p>
              <p>Order Ref: <span class="font-mono font-bold text-slate-900">${delivery.order_no}</span></p>
              <p>Date: <span class="font-semibold text-slate-900">${dispatchDate}</span></p>
            </div>
          </div>
        </div>

        <!-- Title -->
        <div class="text-center py-0.5">
          <h1 class="text-sm font-black text-indigo-800 tracking-wider uppercase">DELIVERY NOTE & SALES INVOICE</h1>
          <p class="text-[9px] font-bold text-indigo-600 tracking-widest">交货单 / 收款发票</p>
        </div>

        <!-- Recipient Details Box -->
        <div class="border border-indigo-200 p-2 bg-indigo-50/20 space-y-1 text-[11px] text-slate-800">
          <div class="flex items-center justify-between border-b border-indigo-100 pb-1">
            <span class="font-semibold text-slate-500">Recipient Name:</span>
            <span class="font-bold text-slate-900 text-xs">${delivery.recipient_name || "Client"}</span>
          </div>
          ${
            delivery.customer_name && delivery.customer_name !== delivery.recipient_name
              ? `<div class="flex items-center justify-between border-b border-indigo-100 pb-1">
                  <span class="font-semibold text-slate-500">Customer Account:</span>
                  <span class="font-medium text-slate-800">${delivery.customer_name}</span>
                </div>`
              : ""
          }
          <div class="flex items-center justify-between border-b border-indigo-100 pb-1">
            <span class="font-semibold text-slate-500">Contact Number:</span>
            <span class="font-semibold text-indigo-700">${delivery.driver_contact || "—"}</span>
          </div>
          <div class="flex items-start justify-between pt-0.5">
            <span class="font-semibold text-slate-500 shrink-0 mr-2">Delivery Address:</span>
            <span class="font-medium text-slate-800 text-right text-[10.5px]">${delivery.delivery_address || "—"}</span>
          </div>
        </div>

        <!-- Gold Delivery Breakdown Table -->
        <div class="border border-slate-300 overflow-hidden">
          <div class="bg-indigo-100/70 px-2 py-1 border-b border-slate-300 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-900">Gold Quantity Breakdown (KG)</span>
            <span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
              isFullyDelivered ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }">
              ${isFullyDelivered ? "✓ Fully Delivered" : `⏳ Partial Delivery (${deliveredQty.toFixed(3)} / ${orderQty.toFixed(3)} KG)`}
            </span>
          </div>
          <table class="w-full text-[11px] text-center border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th class="p-1.5 border-r border-slate-200">Total Ordered</th>
                <th class="p-1.5 border-r border-slate-200">Dispatched in this DO</th>
                <th class="p-1.5">Remaining Gold</th>
              </tr>
            </thead>
            <tbody class="font-medium text-slate-900">
              <tr class="bg-white">
                <td class="p-1.5 border-r border-slate-200 font-semibold">${orderQty.toFixed(3)} KG</td>
                <td class="p-1.5 border-r border-slate-200 font-bold text-indigo-700 text-xs">${deliveredQty.toFixed(3)} KG</td>
                <td class="p-1.5 font-bold ${remainQty > 0 ? "text-amber-700" : "text-emerald-700"}">${remainQty.toFixed(3)} KG</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Financial & Payment Status Table -->
        <div class="border border-slate-300 overflow-hidden">
          <div class="bg-indigo-100/70 px-2 py-1 border-b border-slate-300 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-900">Financials & Payment Status (USD)</span>
            <span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
              isFullyPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }">
              ${isFullyPaid ? "✓ Fully Paid ($0.00 Outstanding)" : `⏳ Unpaid: $${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </span>
          </div>
          <table class="w-full text-[11px] text-center border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th class="p-1.5 border-r border-slate-200">Amount Owed</th>
                <th class="p-1.5 border-r border-slate-200">Collected Amount</th>
                <th class="p-1.5">Remaining Balance</th>
              </tr>
            </thead>
            <tbody class="font-medium text-slate-900">
              <tr class="bg-white">
                <td class="p-1.5 border-r border-slate-200 font-bold text-xs">$${amountOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td class="p-1.5 border-r border-slate-200 font-bold text-emerald-600 text-xs">$${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td class="p-1.5 font-black text-xs ${outstanding > 0 ? "text-rose-700" : "text-slate-500"}">$${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Payment History Log (if any) -->
        ${
          payments.length > 0
            ? `
            <div class="border border-slate-300 overflow-hidden">
              <div class="bg-slate-100 px-2 py-0.5 border-b border-slate-200 text-[9.5px] font-bold uppercase text-slate-700">
                Payment Collection History (${payments.length} log${payments.length > 1 ? "s" : ""})
              </div>
              <table class="w-full text-[9.5px] text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th class="p-1 border-r border-slate-200">Date</th>
                    <th class="p-1 border-r border-slate-200">Method</th>
                    <th class="p-1 border-r border-slate-200">Collected By</th>
                    <th class="p-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${payments
                    .map(
                      (p) => `
                    <tr>
                      <td class="p-1 border-r border-slate-200">${p.payment_date || "—"}</td>
                      <td class="p-1 border-r border-slate-200">${p.payment_method || "CASH"}</td>
                      <td class="p-1 border-r border-slate-200 font-medium">${p.collected_by || "Staff"}</td>
                      <td class="p-1 text-right font-bold text-emerald-700">$${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
            : ""
        }

        <!-- Signatures & Acceptance -->
        <div class="grid grid-cols-2 gap-4 pt-3 mt-auto">
          <div class="border-t border-slate-400 text-center pt-1 space-y-0.5">
            <p class="text-[10px] font-bold text-slate-800">Authorized Signature & Stamp</p>
            <p class="text-[8.5px] text-slate-400">CHHAY VANN CO.,LTD</p>
          </div>
          <div class="border-t border-slate-400 text-center pt-1 space-y-0.5">
            <p class="text-[10px] font-bold text-slate-800">Customer / Recipient Signature</p>
            <p class="text-[8.5px] text-slate-400">Received full and accurate delivery</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const newWindow = window.open("", "_blank");
  if (newWindow) {
    newWindow.document.open();
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  }
}

export function printDeliveryInvoiceDirectly(delivery: DeliveryNoteDetailItem | DeliveryNoteItem) {
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

  const dispatchDate = delivery.dispatch_date
    ? delivery.dispatch_date.replace(/-/g, " . ")
    : new Date().toISOString().split("T")[0].replace(/-/g, " . ");

  const deliveredQty = Number(delivery.gold_quantity) || 0;
  const orderQty = Number(delivery.order_quantity) || deliveredQty;
  const remainQty = Math.max(0, orderQty - deliveredQty);
  const isFullyDelivered = remainQty <= 0.0001;

  const amountOwed = Number(delivery.amount_owed) || 0;
  const amountPaid = Number(delivery.amount_paid) || 0;
  const outstanding = Number(delivery.outstanding_balance) || 0;
  const isFullyPaid = outstanding <= 0.01;

  const payments = (delivery as DeliveryNoteDetailItem).payments || [];

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Delivery Note - ${delivery.delivery_no}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page { size: A5; margin: 0; }
        body { padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; }
      </style>
    </head>
    <body>
      <div style="border: 2px solid #4338ca; padding: 16px; min-height: 195mm; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #4338ca; padding-bottom: 10px; margin-bottom: 12px;">
            <div>
              <h2 style="font-size: 15px; font-weight: 900; color: #3730a3; margin: 0;">CHHAY VANN CO.,LTD</h2>
              <p style="font-size: 9px; font-weight: 700; color: #312e81; margin: 2px 0 0 0;">Physical Gold Trading & Dispatch</p>
              <p style="font-size: 8px; color: #64748b; margin: 2px 0 0 0;">#31, St. 286, S/K. Olympic, Phnom Penh • +855 78 688 831</p>
            </div>
            <div style="text-align: right; font-size: 10px;">
              <p style="margin: 0;">DO No.: <b style="color: #3730a3;">${delivery.delivery_no}</b></p>
              <p style="margin: 2px 0 0 0;">Order Ref: <b>${delivery.order_no}</b></p>
              <p style="margin: 2px 0 0 0;">Date: <b>${dispatchDate}</b></p>
            </div>
          </div>

          <!-- Title -->
          <div style="text-align: center; margin-bottom: 12px;">
            <h1 style="font-size: 13px; font-weight: 900; color: #3730a3; letter-spacing: 1px; margin: 0;">DELIVERY NOTE & SALES INVOICE</h1>
            <p style="font-size: 8px; font-weight: 700; color: #4f46e5; margin: 2px 0 0 0;">交货单 / 收款发票</p>
          </div>

          <!-- Recipient Details -->
          <div style="border: 1px solid #c7d2fe; background: #eef2ff20; padding: 8px; margin-bottom: 12px; font-size: 10px;">
            <p style="margin: 0 0 4px 0;">Recipient: <b>${delivery.recipient_name || "Client"}</b> ${delivery.driver_contact ? `(${delivery.driver_contact})` : ""}</p>
            <p style="margin: 0; color: #334155;">Address: ${delivery.delivery_address || "—"}</p>
          </div>

          <!-- Gold Table -->
          <div style="border: 1px solid #cbd5e1; margin-bottom: 12px;">
            <div style="background: #e0e7ff; padding: 4px 8px; font-size: 9px; font-weight: bold; color: #312e81; display: flex; justify-content: space-between;">
              <span>GOLD QUANTITY (KG)</span>
              <span>${isFullyDelivered ? "✓ FULLY DELIVERED" : `⏳ PARTIAL (${deliveredQty.toFixed(3)} / ${orderQty.toFixed(3)} KG)`}</span>
            </div>
            <table style="width: 100%; font-size: 10px; text-align: center; border-collapse: collapse;">
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold;">
                <td style="padding: 4px; border-right: 1px solid #e2e8f0;">Total Ordered</td>
                <td style="padding: 4px; border-right: 1px solid #e2e8f0;">Dispatched Now</td>
                <td style="padding: 4px;">Remaining Gold</td>
              </tr>
              <tr>
                <td style="padding: 6px; border-right: 1px solid #e2e8f0;">${orderQty.toFixed(3)} KG</td>
                <td style="padding: 6px; border-right: 1px solid #e2e8f0; font-weight: bold; color: #4338ca;">${deliveredQty.toFixed(3)} KG</td>
                <td style="padding: 6px; font-weight: bold; color: ${remainQty > 0 ? "#b45309" : "#059669"};">${remainQty.toFixed(3)} KG</td>
              </tr>
            </table>
          </div>

          <!-- Financial Table -->
          <div style="border: 1px solid #cbd5e1; margin-bottom: 12px;">
            <div style="background: #e0e7ff; padding: 4px 8px; font-size: 9px; font-weight: bold; color: #312e81; display: flex; justify-content: space-between;">
              <span>PAYMENT FINANCIALS (USD)</span>
              <span>${isFullyPaid ? "✓ FULLY PAID" : `⏳ UNPAID: $${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</span>
            </div>
            <table style="width: 100%; font-size: 10px; text-align: center; border-collapse: collapse;">
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold;">
                <td style="padding: 4px; border-right: 1px solid #e2e8f0;">Amount Owed</td>
                <td style="padding: 4px; border-right: 1px solid #e2e8f0;">Collected Amount</td>
                <td style="padding: 4px;">Remaining Balance</td>
              </tr>
              <tr>
                <td style="padding: 6px; border-right: 1px solid #e2e8f0; font-weight: bold;">$${amountOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td style="padding: 6px; border-right: 1px solid #e2e8f0; font-weight: bold; color: #059669;">$${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td style="padding: 6px; font-weight: bold; color: ${outstanding > 0 ? "#b91c1c" : "#64748b"};">$${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Signatures -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center; font-size: 9px;">
          <div style="border-top: 1px solid #94a3b8; padding-top: 4px;">
            <b>Authorized Signature</b>
            <p style="margin: 2px 0 0 0; color: #64748b;">CHHAY VANN CO.,LTD</p>
          </div>
          <div style="border-top: 1px solid #94a3b8; padding-top: 4px;">
            <b>Customer / Recipient</b>
            <p style="margin: 2px 0 0 0; color: #64748b;">Delivery Received</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 250);
}
