/**
 * @file PoFormModal.tsx
 * @description Modal form component for creating Purchase Orders with database vendor/customer and product type search comboboxes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { CustomerData, customersApi, productsApi, purchaseOrdersApi, SupplierData, VendorData, vendorsApi } from "../../api";

interface PartyOption {
  name: string;
  category: "Vendor" | "Customer";
  code?: string;
}

interface ProductOption {
  name: string;
  conversion_factor?: number | null;
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
        (opt.code && opt.code.toLowerCase().includes(q))
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
          className="w-full text-sm border border-slate-200 rounded-lg pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
      .catch(() => {});
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
          className="w-full text-sm border border-slate-200 rounded-lg pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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

interface PoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  poNo?: string;
  form: {
    purchase_source: "OVERSEA" | "LOCAL" | "BUYBACK";
    vendor_type: "Swiss" | "DB" | "SV";
    vendor_name: string;
    customer_name: string;
    product_type?: string;
    unit_type?: "Kg" | "TL";
    trade_date: string;
    expected_delivery: string;
    trade_type: "BUY" | "SELL";
    qty_kg: string;
    spot_price: string;
    premium: string;
    price?: string;
    currency: "USD" | "KHR";
    note: string;
    shipping_method?: string;
    tracking_no?: string;
    customs_fee?: string;
    port_of_origin?: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  suppliers: SupplierData[];
  onSave: () => void;
}

/**
 * Purchase Order creation form modal component.
 */
export default function PoFormModal({
  isOpen,
  onClose,
  poNo,
  form,
  setForm,
  suppliers,
  onSave,
}: PoFormModalProps) {
  const [customerOptions, setCustomerOptions] = useState<PartyOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<PartyOption[]>([]);
  const [productList, setProductList] = useState<ProductOption[]>([]);

  useEffect(() => {
    customersApi
      .getCustomers()
      .then((data) => {
        setCustomerOptions(
          data.map((c) => ({
            name: c.name || c.display_name || `Customer #${c.id}`,
            category: "Customer" as const,
            code: c.customer_code || `CUST-${String(c.id).padStart(3, "0")}`,
          }))
        );
      })
      .catch(() => {});

    vendorsApi
      .getVendors()
      .then((data) => {
        setVendorOptions(
          data.map((v) => ({
            name: v.name,
            category: "Vendor" as const,
            code: v.vendor_code || `VEND-${String(v.id).padStart(3, "0")}`,
          }))
        );
      })
      .catch(() => {});

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
      .catch(() => {});
  }, []);

  const combinedPartyOptions = useMemo(() => {
    const map = new Map<string, PartyOption>();
    [...vendorOptions, ...customerOptions].forEach((item) => {
      map.set(item.name.toLowerCase() + (item.code ? `-${item.code.toLowerCase()}` : ""), item);
    });
    return Array.from(map.values());
  }, [vendorOptions, customerOptions]);

  const matchedProduct = useMemo(() => {
    if (!form.product_type?.trim()) return null;
    return productList.find(
      (p) => p.name.toLowerCase() === form.product_type?.trim().toLowerCase()
    );
  }, [productList, form.product_type]);

  const conversionFactorDisplay =
    matchedProduct && matchedProduct.conversion_factor != null
      ? matchedProduct.conversion_factor
      : "None";

  const autoCalculatedPrice = useMemo(() => {
    const spot = Number(form.spot_price) || 0;
    const prem = form.premium !== "" && !isNaN(Number(form.premium)) ? Number(form.premium) : 0;
    const qty = Number(form.qty_kg) || 0;
    const factor = matchedProduct && matchedProduct.conversion_factor != null ? matchedProduct.conversion_factor : 32.148;
    if (spot > 0 && qty > 0) {
      const unitCost = (spot * factor) + prem;
      return (qty * unitCost).toFixed(2);
    }
    return "";
  }, [form.spot_price, form.premium, form.qty_kg, matchedProduct]);

  function updateFormField(
    field: "spot_price" | "premium" | "qty_kg" | "price" | "product_type" | "unit_type",
    value: string
  ) {
    setForm((prev: any) => {
      const next = { ...prev, [field]: value };

      let backendLastEdited = field as string;
      if (field === "qty_kg") backendLastEdited = "quantity";
      if (field === "price") backendLastEdited = "total_cost";

      const payload = {
        product_type: next.product_type || null,
        unit_type: next.unit_type || "Kg",
        spot_price: next.spot_price !== "" && next.spot_price !== undefined && !isNaN(Number(next.spot_price)) ? Number(next.spot_price) : null,
        premium: next.premium !== "" && next.premium !== undefined && !isNaN(Number(next.premium)) ? Number(next.premium) : null,
        quantity: next.qty_kg !== "" && next.qty_kg !== undefined && !isNaN(Number(next.qty_kg)) ? Number(next.qty_kg) : null,
        total_cost: next.price !== "" && next.price !== undefined && !isNaN(Number(next.price)) ? Number(next.price) : null,
        last_edited_field: backendLastEdited,
      };

      purchaseOrdersApi
        .calculatePricing(payload)
        .then((res) => {
          if (!res.solved_field) return;
          setForm((f: any) => {
            const updated = { ...f };
            if (res.solved_field === "total_cost" && res.total_cost != null && field !== "price") {
              updated.price = String(res.total_cost);
            } else if (res.solved_field === "quantity" && res.quantity != null && field !== "qty_kg") {
              updated.qty_kg = String(res.quantity);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">
              New Purchase
            </h3>
            {poNo && (
              <p className="text-xs font-mono font-semibold text-indigo-600 mt-0.5 flex items-center gap-1">
                <span className="text-slate-400 font-sans font-medium">PO No:</span> {poNo}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">PO Category</label>
              <select
                value={form.purchase_source}
                onChange={(e) => setForm((f: any) => ({ ...f, purchase_source: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="OVERSEA">Oversea Purchase Order</option>
                <option value="LOCAL">Local Purchase Order</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Vendor *</label>
              <SearchablePartySelect
                value={form.vendor_name || form.customer_name || ""}
                onChange={(val) =>
                  setForm((f: any) => ({ ...f, vendor_name: val, customer_name: val }))
                }
                options={combinedPartyOptions}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Product Type *</label>
              <SearchableProductSelect
                value={form.product_type || ""}
                onChange={(val) => updateFormField("product_type", val)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Unit *</label>
              <select
                value={form.unit_type || "Kg"}
                onChange={(e) => updateFormField("unit_type", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              >
                <option value="Kg">Kg</option>
                <option value="TL">TL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Quantity ({form.unit_type || "Kg"}) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="10.00"
                value={form.qty_kg}
                onChange={(e) => updateFormField("qty_kg", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Total Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.price ?? ""}
                onChange={(e) => updateFormField("price", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800 bg-slate-50/80"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Spot Price (oz) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="2750.00"
                value={form.spot_price}
                onChange={(e) => updateFormField("spot_price", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                <span>Conversion factor:</span>{" "}
                <span className={`font-semibold font-mono ${conversionFactorDisplay === "None" ? "text-slate-400" : "text-indigo-600"}`}>
                  {conversionFactorDisplay}
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Premium ( {form.unit_type || "Kg"}/USD) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="300.00"
                value={form.premium}
                onChange={(e) => updateFormField("premium", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Order Date</label>
              <input
                type="date"
                value={form.trade_date}
                onChange={(e) => setForm((f: any) => ({ ...f, trade_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Expected Delivery *</label>
              <input
                type="date"
                value={form.expected_delivery}
                onChange={(e) => setForm((f: any) => ({ ...f, expected_delivery: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Remark</label>
            <textarea
              rows={2}
              placeholder="Enter purchase order remark..."
              value={form.note}
              onChange={(e) => setForm((f: any) => ({ ...f, note: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
}
