/**
 * @file SlotsPage.tsx
 * @description Slot Pricing Tables page component for configuring premium rates by slot date for buyback and sell modes.
 */

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, MoreHorizontal, X, Save, Check } from "lucide-react";
import Card from "../components/Card";
import { api, SlotTableData } from "../api";

interface SlotsPageProps {
  /** Mode ("buyback" for buyback slots, "sell" for sell premium slots) */
  mode?: "buyback" | "sell";
  /** Toast notification callback */
  notify: (msg: string, type?: "success" | "error") => void;
}

/**
 * Slot Tables management page component.
 */

interface SlotRowItem {
  id: number;
  start_date: string;
  end_date: string;
  premium: string | number;
  qty?: string | number;
}

interface BuyTableItem {
  id: number;
  title: string;
  rows: SlotRowItem[];
}

interface SellTableItem {
  id: number;
  title: string;
  tableStock: string;
  newRowDate: string;
  rows: SlotRowItem[];
}

const INITIAL_BUY_TABLES: BuyTableItem[] = [];
const INITIAL_SELL_TABLES: SellTableItem[] = [];

export default function SlotsPage({ mode = "buyback", notify }: SlotsPageProps) {
  const [selectedSlotType, setSelectedSlotType] = useState<"BUY" | "SELL">(
    mode === "sell" ? "SELL" : "BUY"
  );

  const [buyTables, setBuyTables] = useState<BuyTableItem[]>(INITIAL_BUY_TABLES);
  const [sellTables, setSellTables] = useState<SellTableItem[]>(INITIAL_SELL_TABLES);

  // Buy Slot Modal & Title State
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [targetBuyTableId, setTargetBuyTableId] = useState<number | null>(null);
  const [editingBuyRowId, setEditingBuyRowId] = useState<number | null>(null);
  const [editingBuyTitleTableId, setEditingBuyTitleTableId] = useState<number | null>(null);
  const [tempBuyTitleValue, setTempBuyTitleValue] = useState<string>("");

  const [buyRowForm, setBuyRowForm] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    premium: "300.00",
  });

  // Sell Slot Row Modal & Title State
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [targetSellTableId, setTargetSellTableId] = useState<number | null>(null);
  const [editingSellRowId, setEditingSellRowId] = useState<number | null>(null);
  const [editingTitleTableId, setEditingTitleTableId] = useState<number | null>(null);
  const [tempTitleValue, setTempTitleValue] = useState<string>("");

  const [sellRowForm, setSellRowForm] = useState({
    start_date: new Date().toISOString().split("T")[0],
    premium: "300.00",
  });

  const [buyDateError, setBuyDateError] = useState("");
  const [sellDateError, setSellDateError] = useState("");

  function getLocalDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const todayStr = getLocalDateString();

  /**
   * Sorts slot rows chronologically from now (today) to upcoming dates next.
   * Dates >= today appear first in ascending order (today, tomorrow, next week...).
   * Historical/past dates (< today) are placed at the end.
   */
  function sortSlotRows<T extends { start_date: string }>(rows: T[]): T[] {
    const today = getLocalDateString();
    return rows.slice().sort((a, b) => {
      const isPastA = a.start_date < today;
      const isPastB = b.start_date < today;

      // Both are today or upcoming: sort ascending (from now on to upcoming next)
      if (!isPastA && !isPastB) {
        return a.start_date.localeCompare(b.start_date);
      }
      // Now/upcoming comes before past
      if (!isPastA && isPastB) return -1;
      if (isPastA && !isPastB) return 1;

      // Both are past: sort ascending
      return a.start_date.localeCompare(b.start_date);
    });
  }

  function loadSlots() {
    api
      .get<SlotTableData[]>("/api/slots/")
      .then((tables) => {
        if (tables) {
          const buyList: BuyTableItem[] = tables
            .filter((t) => t.table_name.toUpperCase().includes("BUY") || !t.table_name.toUpperCase().includes("SELL"))
            .map((t) => {
              const rows: SlotRowItem[] = (t.rows || []).map((r) => ({
                id: r.id,
                start_date: r.slot_date,
                end_date: r.slot_date,
                premium: r.premium,
              }));
              return {
                id: t.id,
                title: t.table_name,
                rows: sortSlotRows(rows),
              };
            });
          const sellList: SellTableItem[] = tables
            .filter((t) => t.table_name.toUpperCase().includes("SELL"))
            .map((t) => {
              const rows: SlotRowItem[] = (t.rows || []).map((r) => ({
                id: r.id,
                start_date: r.slot_date,
                end_date: r.slot_date,
                premium: r.premium,
                qty: r.qty !== undefined && r.qty !== null ? String(r.qty) : "10.00",
              }));
              return {
                id: t.id,
                title: t.table_name,
                tableStock: String(t.stock),
                newRowDate: new Date().toISOString().split("T")[0],
                rows: sortSlotRows(rows),
              };
            });
          setBuyTables(buyList);
          setSellTables(sellList);
        }
      })
      .catch(() => { });
  }

  useEffect(() => {
    loadSlots();
    const interval = setInterval(() => {
      loadSlots();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Buy Table Handlers
  function addBuyTable() {
    api
      .post<SlotTableData>("/api/slots/", {
        table_name: `Buy Slot Table ${buyTables.length + 1}`,
        stock: 100,
      })
      .then(() => {
        notify("New Buy Slot table added!");
        loadSlots();
      })
      .catch((e: Error) => notify(e.message || "Failed to add table"));
  }

  function deleteBuyTable(tableId: number) {
    api
      .delete(`/api/slots/${tableId}`)
      .then(() => {
        notify("Buy table deleted");
        loadSlots();
      })
      .catch((e: Error) => notify(e.message || "Failed to delete table"));
  }

  function openAddBuyRowModal(tableId: number) {
    setTargetBuyTableId(tableId);
    setEditingBuyRowId(null);
    setBuyDateError("");
    setBuyRowForm({
      start_date: todayStr,
      end_date: todayStr,
      premium: "300.00",
    });
    setIsBuyModalOpen(true);
  }

  function openEditBuyRowModal(tableId: number, row: SlotRowItem) {
    setTargetBuyTableId(tableId);
    setEditingBuyRowId(row.id);
    setBuyDateError("");
    setBuyRowForm({
      start_date: row.start_date,
      end_date: row.end_date || row.start_date,
      premium: String(row.premium),
    });
    setIsBuyModalOpen(true);
  }

  function submitBuyRowModal() {
    if (targetBuyTableId === null) return;
    if (!buyRowForm.start_date || !buyRowForm.premium) {
      setBuyDateError("Please fill in required fields");
      return;
    }

    if (buyRowForm.start_date < todayStr) {
      setBuyDateError("Slot date cannot be in the past");
      return;
    }

    const targetTable = buyTables.find((t) => t.id === targetBuyTableId);
    if (targetTable?.rows.some((r) => r.id !== editingBuyRowId && r.start_date === buyRowForm.start_date)) {
      setBuyDateError("A slot for this date already exists in this table");
      return;
    }

    const startDate = buyRowForm.start_date;
    const prem = Number(buyRowForm.premium) || 300;

    if (editingBuyRowId !== null) {
      api
        .put(`/api/slots/${targetBuyTableId}/rows/${editingBuyRowId}`, {
          slot_date: startDate,
          premium: prem,
        })
        .then(() => {
          notify("Buy slot row updated successfully!");
          loadSlots();
        })
        .catch((e: Error) => notify(e.message || "Failed to update row"));
    } else {
      api
        .post(`/api/slots/${targetBuyTableId}/rows`, {
          slot_date: startDate,
          premium: prem,
        })
        .then(() => {
          notify("New row added to Buy table!");
          loadSlots();
        })
        .catch((e: Error) => notify(e.message || "Failed to add row"));
    }

    setIsBuyModalOpen(false);
    setTargetBuyTableId(null);
    setEditingBuyRowId(null);
  }

  function deleteRowInBuyTable(tableId: number, rowId: number) {
    api
      .delete(`/api/slots/${tableId}/rows/${rowId}`)
      .then(() => {
        notify("Row deleted");
        loadSlots();
      })
      .catch((e: Error) => notify(e.message || "Failed to delete row"));
  }

  // Sell Table Handlers
  function addSellTable() {
    api
      .post<SlotTableData>("/api/slots/", {
        table_name: `Sell Slot Table ${sellTables.length + 1}`,
        stock: 100,
      })
      .then(() => {
        notify("New Sell Slot table added!");
        loadSlots();
      })
      .catch((e: Error) => notify(e.message || "Failed to add table"));
  }

  function deleteSellTable(tableId: number) {
    api
      .delete(`/api/slots/${tableId}`)
      .then(() => {
        notify("Table deleted");
        loadSlots();
      })
      .catch((e: Error) => notify(e.message || "Failed to delete table"));
  }

  function openAddSellRowModal(tableId: number) {
    setTargetSellTableId(tableId);
    setEditingSellRowId(null);
    setSellDateError("");
    setSellRowForm({
      start_date: todayStr,
      premium: "300.00",
    });
    setIsSellModalOpen(true);
  }

  function openEditSellRowModal(tableId: number, row: SlotRowItem) {
    setTargetSellTableId(tableId);
    setEditingSellRowId(row.id);
    setSellDateError("");
    setSellRowForm({
      start_date: row.start_date,
      premium: String(row.premium),
    });
    setIsSellModalOpen(true);
  }

  function submitSellRowModal() {
    if (targetSellTableId === null) return;
    if (!sellRowForm.start_date || !sellRowForm.premium) {
      setSellDateError("Please fill in required fields");
      return;
    }

    if (sellRowForm.start_date < todayStr) {
      setSellDateError("Slot date cannot be in the past");
      return;
    }

    const targetTable = sellTables.find((t) => t.id === targetSellTableId);
    if (targetTable?.rows.some((r) => r.id !== editingSellRowId && r.start_date === sellRowForm.start_date)) {
      setSellDateError("A slot for this date already exists in this table");
      return;
    }

    const startDate = sellRowForm.start_date;
    const prem = Number(sellRowForm.premium) || 300;

    if (editingSellRowId !== null) {
      api
        .put(`/api/slots/${targetSellTableId}/rows/${editingSellRowId}`, {
          slot_date: startDate,
          premium: prem,
        })
        .then(() => {
          notify("Row updated successfully!");
          loadSlots();
        })
        .catch((e: Error) => notify(e.message || "Failed to update row"));
    } else {
      api
        .post(`/api/slots/${targetSellTableId}/rows`, {
          slot_date: startDate,
          premium: prem,
        })
        .then(() => {
          notify("New row added to table!");
          loadSlots();
        })
        .catch((e: Error) => notify(e.message || "Failed to add row"));
    }

    setIsSellModalOpen(false);
    setTargetSellTableId(null);
    setEditingSellRowId(null);
  }

  function updateRowInSellTable(tableId: number, rowId: number, patch: Partial<SlotRowItem>) {
    if (patch.start_date) {
      if (patch.start_date < todayStr) {
        notify("Slot date cannot be in the past", "error");
        return;
      }
      const targetTable = sellTables.find((t) => t.id === tableId);
      if (targetTable?.rows.some((r) => r.id !== rowId && r.start_date === patch.start_date)) {
        notify("A slot for this date already exists in this table", "error");
        return;
      }
    }

    setSellTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
            ...t,
            rows: sortSlotRows(t.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r))),
          }
          : t
      )
    );

    if (patch.start_date || patch.premium !== undefined) {
      api
        .put(`/api/slots/${tableId}/rows/${rowId}`, {
          slot_date: patch.start_date || todayStr,
          premium: patch.premium !== undefined && patch.premium !== "" ? Number(patch.premium) : 300,
        })
        .then(() => { })
        .catch(() => { });
    }
  }

  function updateTableStock(tableId: number, stockVal: string) {
    const tbl = sellTables.find((t) => t.id === tableId);
    if (!tbl) return;
    const previousStock = tbl.tableStock;

    setSellTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, tableStock: stockVal } : t))
    );
    api
      .put(`/api/slots/${tableId}`, {
        table_name: tbl.title,
        stock: Number(stockVal) || 0,
      })
      .then(() => { })
      .catch((e: Error) => {
        // Roll the displayed number back -- the edit was rejected, so it was never actually saved.
        setSellTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, tableStock: previousStock } : t))
        );
        notify(e.message || "Failed to update stock", "error");
      });
  }

  function deleteRowInSellTable(tableId: number, rowId: number) {
    api
      .delete(`/api/slots/${tableId}/rows/${rowId}`)
      .then(() => {
        notify("Row deleted");
        loadSlots();
      })
      .catch((e: Error) => notify(e.message || "Failed to delete row"));
  }



  return (
    <div className="flex-1 px-3.5 sm:px-5 py-3 min-w-0 overflow-hidden w-full flex flex-col space-y-4 min-h-0 h-full">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        {/* Tab Bar Selection for Buy Slot / Sell Slot */}
        <div className="flex items-center gap-6" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={selectedSlotType === "BUY"}
            onClick={() => setSelectedSlotType("BUY")}
            className={`rounded-none bg-transparent border-0 py-1 text-sm sm:text-base font-bold transition-colors cursor-pointer outline-none focus:outline-none ${
              selectedSlotType === "BUY"
                ? "text-indigo-600"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Buy Slot
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedSlotType === "SELL"}
            onClick={() => setSelectedSlotType("SELL")}
            className={`rounded-none bg-transparent border-0 py-1 text-sm sm:text-base font-bold transition-colors cursor-pointer outline-none focus:outline-none ${
              selectedSlotType === "SELL"
                ? "text-emerald-600"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Sell Slot
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (selectedSlotType === "SELL") {
              addSellTable();
            } else {
              addBuyTable();
            }
          }}
          className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg text-white font-medium shadow-sm transition-colors cursor-pointer ${selectedSlotType === "SELL"
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          <Plus size={14} /> Add Table
        </button>
      </div>



      {/* Main Content View */}
      {selectedSlotType === "SELL" ? (
        /* SELL SLOT TABLES */
        <div className="space-y-6 overflow-y-auto flex-1 min-h-0 pr-1">
          {sellTables.map((tbl) => (
            <Card key={tbl.id} className="flex flex-col min-h-0 overflow-hidden">
              {/* Table Title Header */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editingTitleTableId === tbl.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tempTitleValue}
                        onChange={(e) => setTempTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (tempTitleValue.trim()) {
                              api
                                .put(`/api/slots/${tbl.id}`, {
                                  table_name: tempTitleValue.trim(),
                                  stock: Number(tbl.tableStock) || 0,
                                })
                                .then(() => {
                                  notify("Table name updated!");
                                  loadSlots();
                                });
                            }
                            setEditingTitleTableId(null);
                          }
                        }}
                        autoFocus
                        className="font-bold text-slate-800 text-sm bg-white border border-indigo-300 rounded-md px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempTitleValue.trim()) {
                            api
                              .put(`/api/slots/${tbl.id}`, {
                                table_name: tempTitleValue.trim(),
                                stock: Number(tbl.tableStock) || 0,
                              })
                              .then(() => {
                                notify("Table name updated!");
                                loadSlots();
                              });
                          }
                          setEditingTitleTableId(null);
                        }}
                        className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Save title"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm">{tbl.title}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTitleTableId(tbl.id);
                          setTempTitleValue(tbl.title);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        title="Edit table name"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => deleteSellTable(tbl.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium cursor-pointer"
                  title="Delete table"
                >
                  <Trash2 size={14} /> Delete Table
                </button>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap w-12 text-slate-400">#</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-slate-400">SLOT DATE</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">PREMIUM (USD)</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">STOCK</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbl.rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 hover:bg-slate-100 transition-colors"
                      >
                        <td className="px-4 py-2 text-slate-400 font-medium text-left w-12 text-xs">{idx + 1}</td>
                        <td className="px-5 py-3 text-slate-700 font-medium text-xs whitespace-nowrap">
                          <input
                            type="date"
                            min={todayStr}
                            value={r.start_date}
                            onChange={(e) => updateRowInSellTable(tbl.id, r.id, { start_date: e.target.value, premium: r.premium })}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3 text-center text-xs font-semibold text-slate-800 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-slate-400 font-normal">$</span>
                            <input
                              type="text"
                              value={r.premium}
                              onChange={(e) => updateRowInSellTable(tbl.id, r.id, { start_date: r.start_date, premium: e.target.value })}
                              placeholder="300.00"
                              className="w-20 text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-900 font-semibold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                            />
                          </div>
                        </td>
                        {/* Merged STOCK column spanning all table rows */}
                        {idx === 0 && (
                          <td
                            rowSpan={tbl.rows.length > 0 ? tbl.rows.length : 1}
                            className="px-4 py-2 text-center align-middle bg-slate-50/40 border-x border-slate-200/60"
                          >
                            <div className="flex flex-col items-center justify-center py-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                STOCK (KG)
                              </span>
                              <input
                                type="text"
                                value={tbl.tableStock}
                                onChange={(e) => updateTableStock(tbl.id, e.target.value)}
                                placeholder="100.000"
                                className="w-24 text-xs border border-slate-200 rounded-md px-2.5 py-1 bg-white text-slate-900 font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                              />
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditSellRowModal(tbl.id, r)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Edit in popup modal"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRowInSellTable(tbl.id, r.id)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tbl.rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                          No rows in this table. Click "+ Add Row" below to add a row.
                        </td>
                      </tr>
                    )}
                    {/* Table Footer with Add Row and Save side by side */}
                    <tr className="border-t border-slate-200 bg-slate-50/30">
                      <td colSpan={5} className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openAddSellRowModal(tbl.id)}
                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-sm cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-1.5 rounded-lg border border-indigo-100"
                          >
                            <Plus size={16} /> Add Row
                          </button>
                          <button
                            type="button"
                            onClick={() => notify(`Data saved for ${tbl.title}!`)}
                            className="inline-flex items-center gap-1.5 text-white bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-xs"
                          >
                            <Save size={15} /> Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* BUY SLOT TABLES */
        <div className="space-y-6 overflow-y-auto flex-1 min-h-0 pr-1">
          {buyTables.map((tbl) => (
            <Card key={tbl.id} className="flex flex-col min-h-0 overflow-hidden">
              {/* Table Title Header */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editingBuyTitleTableId === tbl.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tempBuyTitleValue}
                        onChange={(e) => setTempBuyTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (tempBuyTitleValue.trim()) {
                              api
                                .put(`/api/slots/${tbl.id}`, {
                                  table_name: tempBuyTitleValue.trim(),
                                })
                                .then(() => {
                                  notify("Table name updated!");
                                  loadSlots();
                                });
                            }
                            setEditingBuyTitleTableId(null);
                          }
                        }}
                        autoFocus
                        className="font-bold text-slate-800 text-sm bg-white border border-indigo-300 rounded-md px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempBuyTitleValue.trim()) {
                            api
                              .put(`/api/slots/${tbl.id}`, {
                                table_name: tempBuyTitleValue.trim(),
                              })
                              .then(() => {
                                notify("Table name updated!");
                                loadSlots();
                              });
                          }
                          setEditingBuyTitleTableId(null);
                        }}
                        className="p-1.5 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Save title"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm">{tbl.title}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBuyTitleTableId(tbl.id);
                          setTempBuyTitleValue(tbl.title);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        title="Edit table name"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => deleteBuyTable(tbl.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium cursor-pointer"
                  title="Delete table"
                >
                  <Trash2 size={14} /> Delete Table
                </button>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap w-12 text-slate-400">#</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-slate-400">SLOT DATE</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">PREMIUM (USD)</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbl.rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 hover:bg-slate-100 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-400 font-medium text-left w-12 text-xs">{idx + 1}</td>
                        <td className="px-5 py-3 text-slate-700 font-medium text-xs whitespace-nowrap">
                          <span>{r.start_date}</span>
                        </td>
                        <td className="px-5 py-3 text-center text-xs font-semibold text-slate-800 whitespace-nowrap">
                          ${typeof r.premium === "number" ? r.premium.toLocaleString() : r.premium}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditBuyRowModal(tbl.id, r)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Edit in popup modal"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRowInBuyTable(tbl.id, r.id)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tbl.rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                          No rows in this table. Click "+ Add Row" below to add a row.
                        </td>
                      </tr>
                    )}
                    {/* Table Footer with Add Row and Save side by side */}
                    <tr className="border-t border-slate-200 bg-slate-50/30">
                      <td colSpan={4} className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openAddBuyRowModal(tbl.id)}
                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-sm cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-1.5 rounded-lg border border-indigo-100"
                          >
                            <Plus size={16} /> Add Row
                          </button>
                          <button
                            type="button"
                            onClick={() => notify(`Data saved for ${tbl.title}!`)}
                            className="inline-flex items-center gap-1.5 text-white bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-xs"
                          >
                            <Save size={15} /> Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Buy Slot Row Modal */}
      {isBuyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingBuyRowId !== null ? "Edit" : "Add"} Buy Slot Row
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setIsBuyModalOpen(false);
                  setEditingBuyRowId(null);
                  setTargetBuyTableId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Slot Date *</label>
                <input
                  type="date"
                  min={todayStr}
                  value={buyRowForm.start_date}
                  onChange={(e) => {
                    setBuyRowForm({ ...buyRowForm, start_date: e.target.value, end_date: e.target.value });
                    if (buyDateError) setBuyDateError("");
                  }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                {buyDateError && (
                  <p className="text-xs text-rose-600 mt-1">{buyDateError}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium (USD) *</label>
                <input
                  type="text"
                  value={buyRowForm.premium}
                  onChange={(e) => setBuyRowForm({ ...buyRowForm, premium: e.target.value.replace(/[^0-9.-]/g, "") })}
                  placeholder="300.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsBuyModalOpen(false);
                  setEditingBuyRowId(null);
                  setTargetBuyTableId(null);
                }}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBuyRowModal}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                {editingBuyRowId !== null ? <Pencil size={15} /> : <Plus size={15} />}
                {editingBuyRowId !== null ? "Save Changes" : "Add Row"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Slot Row Modal */}
      {isSellModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingSellRowId !== null ? "Edit" : "Add"} Sell Slot Row
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setIsSellModalOpen(false);
                  setEditingSellRowId(null);
                  setTargetSellTableId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Slot Date *</label>
                <input
                  type="date"
                  min={todayStr}
                  value={sellRowForm.start_date}
                  onChange={(e) => {
                    setSellRowForm({ ...sellRowForm, start_date: e.target.value });
                    if (sellDateError) setSellDateError("");
                  }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {sellDateError && (
                  <p className="text-xs text-rose-600 mt-1">{sellDateError}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium (USD) *</label>
                <input
                  type="text"
                  value={sellRowForm.premium}
                  onChange={(e) => setSellRowForm({ ...sellRowForm, premium: e.target.value.replace(/[^0-9.-]/g, "") })}
                  placeholder="300.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsSellModalOpen(false);
                  setEditingSellRowId(null);
                  setTargetSellTableId(null);
                }}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSellRowModal}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg text-white font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                {editingSellRowId !== null ? <Pencil size={15} /> : <Plus size={15} />}
                {editingSellRowId !== null ? "Save Changes" : "Add Row"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
