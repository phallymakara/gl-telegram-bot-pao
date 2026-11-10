import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import DraggableModalBox from "./DraggableModalBox";
import {
  customersApi,
  CustomerData,
  ordersApi,
  productsApi,
  ProductData,
  purchaseOrdersApi,
  salesPersonsApi,
  SalesPersonData,
  StockMatrixColumnData,
  vendorsApi,
  VendorData,
} from "../api";
import { ToastType } from "./Toast";

export type ClickableMatrixRowKey =
  | "import"
  | "physical_sell"
  | "bot_sell"
  | "physical_buy"
  | "bot_buy";

export const CLICKABLE_MATRIX_ROW_KEYS: readonly ClickableMatrixRowKey[] = [
  "import",
  "physical_sell",
  "bot_sell",
  "physical_buy",
  "bot_buy",
];

export interface MatrixCellTarget {
  rowKey: ClickableMatrixRowKey;
  rowTitle: string;
  col: StockMatrixColumnData;
}

interface MatrixCellEntryModalProps {
  target: MatrixCellTarget | null;
  onClose: () => void;
  onSuccess: () => void;
  notify?: (msg: string, type?: ToastType) => void;
}

interface SelectOption {
  label: string;
  meta?: string;
}

function SearchableComboInput({
  value,
  onChange,
  options,
  placeholder,
  emptyText,
  hasError,
}: {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder: string;
  emptyText: string;
  hasError?: boolean;
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
        opt.label.toLowerCase().includes(q) ||
        (opt.meta && opt.meta.toLowerCase().includes(q))
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
          placeholder={placeholder}
          className={`w-full text-xs border rounded-md pl-2.5 pr-8 py-2 bg-white text-slate-800 focus:outline-none ${
            hasError
              ? "border-red-500 focus:border-red-500"
              : "border-slate-300 focus:border-slate-500"
          }`}
        />
        <Search
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white rounded-md border border-slate-200 py-1 z-50">
          {filtered.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-slate-400">{emptyText}</div>
          ) : (
            filtered.map((opt, idx) => (
              <button
                key={`${opt.label}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(opt.label);
                  setQuery(opt.label);
                  setOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-none hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="font-medium text-slate-800">{opt.label}</span>
                {opt.meta && (
                  <span className="font-mono text-[11px] text-slate-400 ml-2">
                    {opt.meta}
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

function getRowMetadata(rowKey: ClickableMatrixRowKey) {
  switch (rowKey) {
    case "import":
      return {
        isImport: true,
        transactionType: "PO" as const,
        channel: "PO" as const,
        channelLabel: "Purchase Order",
      };
    case "physical_sell":
      return {
        isImport: false,
        transactionType: "SELL" as const,
        channel: "WALK_IN" as const,
        channelLabel: "Physical (In-store Sell)",
      };
    case "bot_sell":
      return {
        isImport: false,
        transactionType: "SELL" as const,
        channel: "PLATFORM" as const,
        channelLabel: "Bot / Online Sell",
      };
    case "physical_buy":
      return {
        isImport: false,
        transactionType: "BUY" as const,
        channel: "WALK_IN" as const,
        channelLabel: "Physical (In-store Buy)",
      };
    case "bot_buy":
      return {
        isImport: false,
        transactionType: "BUY" as const,
        channel: "PLATFORM" as const,
        channelLabel: "Bot / Online Buy",
      };
  }
}

function isDbOrSwissProduct(productName?: string): boolean {
  const clean = (productName || "").trim().toLowerCase();
  return clean.includes("db") || clean.includes("swiss");
}

function sanitizePositiveDecimal(raw: string): string {
  return raw.replace(/[^0-9.]/g, "");
}

function sanitizeSignedDecimal(raw: string): string {
  return raw.replace(/[^0-9.-]/g, "");
}

function getFriendlySubmitError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Failed to save entry";
  if (/insufficient stock/i.test(message)) {
    const match = message.match(/available\s+([\d.]+)kg.*requested\s+([\d.]+)kg/i);
    if (match) {
      const [, available, requested] = match;
      return `Not enough gold in stock: ${Number(available).toLocaleString()}kg available, requested ${Number(requested).toLocaleString()}kg.`;
    }
    return "Not enough gold in stock to complete this sell order.";
  }
  return message || "Failed to save entry";
}

export default function MatrixCellEntryModal({
  target,
  onClose,
  onSuccess,
  notify,
}: MatrixCellEntryModalProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [salesPersons, setSalesPersons] = useState<SalesPersonData[]>([]);

  const [dateValue, setDateValue] = useState("");
  const [poType, setPoType] = useState<"OVERSEA" | "LOCAL">("OVERSEA");
  const [partyName, setPartyName] = useState("");
  const [productType, setProductType] = useState("");
  const [unitType, setUnitType] = useState("Kg");
  const [salesPerson, setSalesPerson] = useState("");
  const [spotPrice, setSpotPrice] = useState("");
  const [premium, setPremium] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load master data once when modal is mounted and open
  useEffect(() => {
    if (!target) return;

    let cancelled = false;
    customersApi
      .getCustomers()
      .then((res) => {
        if (!cancelled) setCustomers(res.filter((c) => c.is_active !== false));
      })
      .catch(() => {});

    vendorsApi
      .getVendors()
      .then((res) => {
        if (!cancelled) setVendors(res.filter((v) => v.is_active !== false));
      })
      .catch(() => {});

    productsApi
      .getProducts()
      .then((res) => {
        if (!cancelled) setProducts(res.filter((p) => p.is_active !== false));
      })
      .catch(() => {});

    salesPersonsApi
      .getSalesPersons()
      .then((res) => {
        if (!cancelled) setSalesPersons(res.filter((sp) => sp.is_active !== false));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [Boolean(target)]);

  // Override cell defaults cleanly every time a new cell is selected
  useEffect(() => {
    if (!target) return;

    const colBrand = (target.col.brand || "").trim();
    const matchedBrandProduct = products.find(
      (p) => p.name.trim().toLowerCase() === colBrand.toLowerCase()
    );

    setDateValue(target.col.target_date || "");
    setPoType(colBrand.toLowerCase().includes("swiss") ? "OVERSEA" : "LOCAL");
    setPartyName("");
    setProductType(matchedBrandProduct ? matchedBrandProduct.name : colBrand);
    setUnitType("Kg");
    setSalesPerson("");
    setSpotPrice("");
    setPremium("");
    setQuantity("");
    setTotalAmount("");
    setNotes("");
    setFieldErrors({});
    setSubmitError(null);
    setIsSaving(false);
  }, [target]);

  // Align product name casing with master catalog once products finish loading
  useEffect(() => {
    if (!target || products.length === 0) return;
    const colBrand = (target.col.brand || "").trim().toLowerCase();
    const matched = products.find((p) => p.name.trim().toLowerCase() === colBrand);
    if (matched) {
      setProductType((prev) =>
        prev.trim().toLowerCase() === colBrand ? matched.name : prev
      );
    }
  }, [products, target]);

  const matchedProduct = useMemo(() => {
    const clean = productType.trim().toLowerCase();
    if (!clean) return undefined;
    return products.find((p) => p.name.trim().toLowerCase() === clean);
  }, [products, productType]);

  const conversionFactorDisplay = useMemo(() => {
    if (!matchedProduct) return "None";
    return matchedProduct.conversion_factor != null
      ? String(matchedProduct.conversion_factor)
      : "None";
  }, [matchedProduct]);

  const partyOptions = useMemo<SelectOption[]>(() => {
    if (!target) return [];
    if (target.rowKey === "import") {
      const seen = new Set<string>();
      const combined: SelectOption[] = [];
      for (const v of vendors) {
        if (!v.name || seen.has(v.name.toLowerCase())) continue;
        seen.add(v.name.toLowerCase());
        combined.push({
          label: v.name,
          meta: v.vendor_code || v.supplier_type || undefined,
        });
      }
      for (const c of customers) {
        const label = c.name || c.display_name || "";
        if (!label || seen.has(label.toLowerCase())) continue;
        seen.add(label.toLowerCase());
        combined.push({ label, meta: c.customer_code || undefined });
      }
      return combined;
    }

    return customers
      .map((c) => ({
        label: c.name || c.display_name || c.username || "",
        meta: c.customer_code || undefined,
      }))
      .filter((opt) => Boolean(opt.label));
  }, [target, customers, vendors]);

  const productOptions = useMemo<SelectOption[]>(
    () =>
      products.map((p) => ({
        label: p.name,
        meta:
          p.conversion_factor != null ? `x${p.conversion_factor}` : undefined,
      })),
    [products]
  );

  const salesPersonOptions = useMemo<SelectOption[]>(
    () =>
      salesPersons.map((sp) => ({
        label: sp.name,
        meta: sp.code || undefined,
      })),
    [salesPersons]
  );

  if (!target) return null;

  const meta = getRowMetadata(target.rowKey);

  function recalculatePricing(
    nextFields: {
      productType?: string;
      unitType?: string;
      spotPrice?: string;
      premium?: string;
      quantity?: string;
      totalAmount?: string;
    },
    editedField: "product_type" | "unit_type" | "spot_price" | "premium" | "quantity" | "total_cost"
  ) {
    const pType = nextFields.productType ?? productType;
    const uType = nextFields.unitType ?? unitType;
    const sp = nextFields.spotPrice ?? spotPrice;
    const prem = nextFields.premium ?? premium;
    const qty = nextFields.quantity ?? quantity;
    const tot = nextFields.totalAmount ?? totalAmount;

    purchaseOrdersApi
      .calculatePricing({
        product_type: pType || null,
        unit_type: uType || "Kg",
        spot_price: sp !== "" && !isNaN(Number(sp)) ? Number(sp) : null,
        premium: prem !== "" && !isNaN(Number(prem)) ? Number(prem) : null,
        quantity: qty !== "" && !isNaN(Number(qty)) ? Number(qty) : null,
        total_cost: tot !== "" && !isNaN(Number(tot)) ? Number(tot) : null,
        last_edited_field: editedField,
      })
      .then((res) => {
        if (!res.solved_field) return;
        if (res.solved_field === "total_cost" && res.total_cost != null && editedField !== "total_cost") {
          setTotalAmount(String(res.total_cost));
        } else if (res.solved_field === "quantity" && res.quantity != null && editedField !== "quantity") {
          setQuantity(String(res.quantity));
        } else if (res.solved_field === "premium" && res.premium != null && editedField !== "premium") {
          setPremium(String(res.premium));
        } else if (res.solved_field === "spot_price" && res.spot_price != null && editedField !== "spot_price") {
          setSpotPrice(String(res.spot_price));
        }
      })
      .catch(() => {});
  }

  function handleProductChange(val: string) {
    setProductType(val);
    let nextUnit = unitType;
    if (!isDbOrSwissProduct(val) && unitType === "TL") {
      nextUnit = "Kg";
      setUnitType("Kg");
    }
    if (fieldErrors.productType) {
      setFieldErrors((prev) => ({ ...prev, productType: "" }));
    }
    recalculatePricing({ productType: val, unitType: nextUnit }, "product_type");
  }

  function handleUnitChange(val: string) {
    setUnitType(val);
    recalculatePricing({ unitType: val }, "unit_type");
  }

  function handleSpotChange(raw: string) {
    const val = sanitizePositiveDecimal(raw);
    setSpotPrice(val);
    recalculatePricing({ spotPrice: val }, "spot_price");
  }

  function handlePremiumChange(raw: string) {
    const val = sanitizeSignedDecimal(raw);
    setPremium(val);
    recalculatePricing({ premium: val }, "premium");
  }

  function handleQtyChange(raw: string) {
    const val = sanitizePositiveDecimal(raw);
    setQuantity(val);
    if (fieldErrors.quantity) {
      setFieldErrors((prev) => ({ ...prev, quantity: "" }));
    }
    recalculatePricing({ quantity: val }, "quantity");
  }

  function handleTotalChange(raw: string) {
    const val = sanitizePositiveDecimal(raw);
    setTotalAmount(val);
    recalculatePricing({ totalAmount: val }, "total_cost");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;

    const errors: Record<string, string> = {};
    if (!partyName.trim()) {
      errors.partyName = meta.isImport
        ? "Please select or enter a vendor name"
        : "Please select or enter a customer name";
    }
    if (!productType.trim()) {
      errors.productType = "Please select a product type";
    }
    if (!dateValue.trim()) {
      errors.dateValue = "Please select a date";
    }

    const qtyNum = Number(quantity) || 0;
    const totalNum = Number(totalAmount) || 0;
    if (qtyNum <= 0) {
      errors.quantity = "Quantity must be greater than 0";
    }

    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setIsSaving(true);

    const spotNum = spotPrice !== "" && !isNaN(Number(spotPrice)) ? Number(spotPrice) : undefined;
    const premNum = premium !== "" && !isNaN(Number(premium)) ? Number(premium) : 0;
    const factor =
      matchedProduct && matchedProduct.conversion_factor != null
        ? matchedProduct.conversion_factor
        : 32.148;

    try {
      if (meta.isImport) {
        const unitCost =
          spotNum !== undefined && spotNum > 0 ? spotNum * factor + premNum : undefined;
        await purchaseOrdersApi.createPurchaseOrder({
          po_type: poType,
          supplier_name: partyName.trim(),
          product_type: productType.trim(),
          unit_type: unitType || "Kg",
          quantity: qtyNum,
          spot_price: spotNum,
          premium: premNum,
          unit_cost: unitCost,
          currency: "USD",
          order_date: dateValue.trim(),
          expected_date: dateValue.trim(),
          notes: notes.trim() || null,
        } as any);
        notify?.(`${target.rowTitle} purchase order created`, "success");
      } else {
        const computedTotal =
          totalNum > 0
            ? totalNum
            : spotNum !== undefined && spotNum > 0
            ? qtyNum * (spotNum * factor + premNum)
            : undefined;

        await ordersApi.createOrder({
          transaction_type: meta.transactionType,
          customer_name: partyName.trim(),
          sales_person: salesPerson.trim() || undefined,
          channel: meta.channel,
          region: "LOCAL",
          slot_date_str: dateValue.trim(),
          product_type: productType.trim(),
          unit_type: unitType || "Kg",
          quantity: qtyNum,
          spot_price: spotNum,
          premium: premNum,
          total_amount: computedTotal,
          status: "CONFIRMED",
        });
        notify?.(`${target.rowTitle} order created`, "success");
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg = getFriendlySubmitError(err);
      setSubmitError(msg);
      notify?.(msg, "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <DraggableModalBox
        resetKey={`${target.rowKey}_${target.col.id}`}
        className="bg-white rounded-3xl border border-slate-300 shadow-none w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <h3 className="font-semibold text-slate-800 text-base">
            {target.rowTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[70vh]">

          {meta.isImport && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purchase Source *
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["OVERSEA", "LOCAL"] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setPoType(src)}
                    className={`py-1.5 text-xs font-semibold rounded-md border transition cursor-pointer ${
                      poType === src
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {src === "OVERSEA" ? "Oversea" : "Local"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => {
                  setDateValue(e.target.value);
                  if (fieldErrors.dateValue) {
                    setFieldErrors((prev) => ({ ...prev, dateValue: "" }));
                  }
                }}
                className={`w-full px-2.5 py-2 text-xs border rounded-md bg-white text-slate-800 focus:outline-none ${
                  fieldErrors.dateValue
                    ? "border-red-500 focus:border-red-500"
                    : "border-slate-300 focus:border-slate-500"
                }`}
              />
              {fieldErrors.dateValue && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.dateValue}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {meta.isImport ? "Vendor / Supplier *" : "Customer *"}
              </label>
              <SearchableComboInput
                value={partyName}
                onChange={(val) => {
                  setPartyName(val);
                  if (fieldErrors.partyName) {
                    setFieldErrors((prev) => ({ ...prev, partyName: "" }));
                  }
                }}
                options={partyOptions}
                placeholder={
                  meta.isImport
                    ? "Search or enter vendor..."
                    : "Search or enter customer..."
                }
                emptyText={
                  meta.isImport
                    ? "No matching vendor — typed name will be used"
                    : "No matching customer — typed name will be used"
                }
                hasError={Boolean(fieldErrors.partyName)}
              />
              {fieldErrors.partyName && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.partyName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Product Type *
              </label>
              <SearchableComboInput
                value={productType}
                onChange={handleProductChange}
                options={productOptions}
                placeholder="Select or enter product type..."
                emptyText="No matching product found"
                hasError={Boolean(fieldErrors.productType)}
              />
              {fieldErrors.productType && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.productType}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Unit *
              </label>
              <select
                value={isDbOrSwissProduct(productType) ? unitType : "Kg"}
                onChange={(e) => handleUnitChange(e.target.value)}
                disabled={!isDbOrSwissProduct(productType)}
                className={`w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-slate-500 ${
                  !isDbOrSwissProduct(productType)
                    ? "bg-slate-50 text-slate-500 cursor-not-allowed"
                    : "bg-white text-slate-800 cursor-pointer"
                }`}
              >
                <option value="Kg">Kg</option>
                {isDbOrSwissProduct(productType) && <option value="TL">TL</option>}
              </select>
            </div>
          </div>

          {!meta.isImport && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sales Person
              </label>
              <SearchableComboInput
                value={salesPerson}
                onChange={setSalesPerson}
                options={salesPersonOptions}
                placeholder="Select sales person..."
                emptyText="No matching sales person found"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Spot Price (oz)
              </label>
              <input
                type="text"
                value={spotPrice}
                onChange={(e) => handleSpotChange(e.target.value)}
                placeholder="Enter spot price"
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:border-slate-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Conversion factor:{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {conversionFactorDisplay}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Premium ({unitType || "Kg"}/USD)
              </label>
              <input
                type="text"
                value={premium}
                onChange={(e) => handlePremiumChange(e.target.value)}
                placeholder="Enter premium"
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantity ({unitType || "Kg"}) *
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => handleQtyChange(e.target.value)}
                placeholder="Enter quantity"
                className={`w-full px-2.5 py-2 text-xs border rounded-md bg-white text-slate-800 focus:outline-none ${
                  fieldErrors.quantity
                    ? "border-red-500 focus:border-red-500"
                    : "border-slate-300 focus:border-slate-500"
                }`}
              />
              {fieldErrors.quantity && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Total Amount (USD)
              </label>
              <input
                type="text"
                value={totalAmount}
                onChange={(e) => handleTotalChange(e.target.value)}
                placeholder="Auto-calculated or enter total"
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {meta.isImport && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:border-slate-500"
              />
            </div>
          )}

          {submitError && (
            <p className="text-xs text-red-600 font-medium pt-1">{submitError}</p>
          )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs px-3.5 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition-colors focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {isSaving
                ? "Saving..."
                : meta.isImport
                ? "Create Purchase Order"
                : meta.transactionType === "SELL"
                ? "Create Sell Order"
                : "Create Buy Order"}
            </button>
          </div>
        </form>
      </DraggableModalBox>
    </div>
  );
}

